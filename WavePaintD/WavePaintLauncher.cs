using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using Microsoft.Win32;

namespace WavePaint
{
    static class Launcher
    {
        const int ProcessTimeoutMs = 30000;
        static string root;
        static string ivlRoot;
        static HttpListener server;
        static volatile int lastActivity;
        static bool everSeen;
        static string portFile = Path.Combine(Path.GetTempPath(), "WavePaint_port_" + Process.GetCurrentProcess().Id + ".txt");
        static string logFile = Path.Combine(Path.GetTempPath(), "WavePaint_sim.log");

        static string FindEdge()
        {
            string[] candidates = {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
            };
            foreach (var path in candidates) if (File.Exists(path)) return path;
            try { using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe")) if (key != null) { var value = key.GetValue(null) as string; if (File.Exists(value)) return value; } } catch { }
            try { using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe")) if (key != null) { var value = key.GetValue(null) as string; if (File.Exists(value)) return value; } } catch { }
            return null;
        }

        static void ExtractResources(Assembly asm)
        {
            root = Path.Combine(Path.GetTempPath(), "WavePaint_" + Environment.UserName);
            if (Directory.Exists(root)) try { Directory.Delete(root, true); } catch { }
            Directory.CreateDirectory(root);
            foreach (var dir in new[] { "js", "css", "img", "lib" }) Directory.CreateDirectory(Path.Combine(root, dir));
            foreach (var resource in asm.GetManifestResourceNames())
            {
                if (resource == "ivl.zip") continue;
                string relative = resource;
                string subdir = "";
                if (resource.StartsWith("root_")) relative = resource.Substring(5);
                else if (resource.StartsWith("js_")) { subdir = "js"; relative = resource.Substring(3); }
                else if (resource.StartsWith("css_")) { subdir = "css"; relative = resource.Substring(4); }
                else if (resource.StartsWith("img_")) { subdir = "img"; relative = resource.Substring(4); }
                else if (resource.StartsWith("lib_")) { subdir = "lib"; relative = resource.Substring(4); }
                string destination = subdir.Length == 0 ? Path.Combine(root, relative) : Path.Combine(root, subdir, relative);
                using (var input = asm.GetManifestResourceStream(resource))
                using (var output = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    if (input != null) input.CopyTo(output);
                }
            }

            ivlRoot = Path.Combine(root, "ivl");
            Directory.CreateDirectory(ivlRoot);
            using (var zip = asm.GetManifestResourceStream("ivl.zip"))
            {
                if (zip == null) throw new InvalidOperationException("Missing ivl.zip resource.");
                var zipPath = Path.Combine(root, "ivl.zip");
                using (var output = new FileStream(zipPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    zip.CopyTo(output);
                }
                ZipFile.ExtractToDirectory(zipPath, ivlRoot);
            }
        }

        static int FreePort()
        {
            var listener = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
        }

        static void StartServer(int port)
        {
            server = new HttpListener();
            server.Prefixes.Add("http://127.0.0.1:" + port + "/");
            server.Start();
            try { File.WriteAllText(portFile, port.ToString()); } catch { }
            var thread = new Thread(() =>
            {
                while (true)
                {
                    HttpListenerContext context;
                    try { context = server.GetContext(); }
                    catch { return; }
                    ThreadPool.QueueUserWorkItem(_ => Handle(context));
                }
            });
            thread.IsBackground = true;
            thread.Start();
        }

        static void Handle(HttpListenerContext context)
        {
            try
            {
                context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                context.Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                context.Response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
                if (context.Request.HttpMethod == "OPTIONS") { context.Response.StatusCode = 200; context.Response.Close(); return; }

                string path = context.Request.Url.AbsolutePath.TrimStart('/');
                if (path == "api/sim")
                {
                    string body = new StreamReader(context.Request.InputStream, Encoding.UTF8).ReadToEnd();
                    string result;
                    try { result = RunSimulation(body); }
                    catch (Exception ex) { result = "SIM-ERROR:\n" + ex; }
                    byte[] data = Encoding.UTF8.GetBytes(result);
                    context.Response.ContentType = "text/plain; charset=utf-8";
                    context.Response.ContentLength64 = data.Length;
                    context.Response.OutputStream.Write(data, 0, data.Length);
                    context.Response.Close();
                    return;
                }

                if (path == "api/ping")
                {
                    byte[] data = Encoding.UTF8.GetBytes("OK");
                    context.Response.ContentType = "text/plain; charset=utf-8";
                    context.Response.ContentLength64 = data.Length;
                    context.Response.OutputStream.Write(data, 0, data.Length);
                    context.Response.Close();
                    return;
                }

                if (string.IsNullOrEmpty(path)) path = "index.html";
                path = path.Replace('/', Path.DirectorySeparatorChar);
                string file = Path.Combine(root, path);
                if (!File.Exists(file))
                {
                    context.Response.StatusCode = 404;
                    context.Response.Close();
                    return;
                }

                lastActivity = Environment.TickCount;
                context.Response.ContentType = MimeFor(Path.GetExtension(file));
                byte[] fileData = File.ReadAllBytes(file);
                context.Response.OutputStream.Write(fileData, 0, fileData.Length);
                context.Response.Close();
            }
            catch
            {
                try { context.Response.StatusCode = 500; context.Response.Close(); } catch { }
            }
        }

        static string RunSimulation(string body)
        {
            lastActivity = Environment.TickCount;
            string work = Path.Combine(Path.GetTempPath(), "ivl_work_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(work);
            var names = new List<string>();
            string current = null;
            var buffer = new StringBuilder();

            foreach (var line in body.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
            {
                if (line.StartsWith("@@FILE:"))
                {
                    if (current != null) WriteOne(work, names, current, buffer.ToString());
                    current = line.Substring(7).Trim();
                    buffer.Length = 0;
                }
                else if (line == "@@END")
                {
                    if (current != null)
                    {
                        WriteOne(work, names, current, buffer.ToString());
                        current = null;
                        buffer.Length = 0;
                    }
                }
                else
                {
                    buffer.AppendLine(line);
                }
            }
            if (current != null) WriteOne(work, names, current, buffer.ToString());
            WriteFallbackAliases(work, names);

            var batches = BuildCompileBatches(names);
            string compileError = null;
            bool compiled = false;
            foreach (var batch in batches)
            {
                string err1;
                int e1 = Run(Path.Combine(ivlRoot, "bin", "iverilog.exe"), work, batch.Item2, ProcessTimeoutMs, out err1);
                if (e1 == 0)
                {
                    compiled = true;
                    break;
                }
                compileError = string.IsNullOrWhiteSpace(err1) ? "iverilog failed." : err1;
            }
            if (!compiled)
            {
                try { Directory.Delete(work, true); } catch { }
                return "IVERILOG-ERROR:\n" + compileError;
            }

            string err2;
            int e2 = Run(Path.Combine(ivlRoot, "bin", "vvp.exe"), work, new List<string> { "sim.vvp" }, ProcessTimeoutMs, out err2);
            if (e2 != 0)
            {
                try { Directory.Delete(work, true); } catch { }
                return "VVP-ERROR:\n" + err2;
            }
            string vcdPath = Path.Combine(work, "wave_out.vcd");
            if (!File.Exists(vcdPath))
            {
                try { Directory.Delete(work, true); } catch { }
                return "SIM-ERROR:\nVCD file not generated.";
            }
            string vcd = File.ReadAllText(vcdPath);
            try { Directory.Delete(work, true); } catch { }
            return vcd;
        }

        static List<Tuple<string, List<string>>> BuildCompileBatches(List<string> names)
        {
            var batches = new List<Tuple<string, List<string>>>();
            var primary = new List<string> { "-g2012", "-s", "tb", "-o", "sim.vvp" };
            primary.AddRange(names);
            batches.Add(Tuple.Create("primary", primary));

            bool hasSystemVerilogName = false;
            var fallbackNames = new List<string>();
            foreach (var name in names)
            {
                string fallback = name;
                if (name.EndsWith(".sv", StringComparison.OrdinalIgnoreCase))
                {
                    fallback = Path.ChangeExtension(name, ".v");
                    hasSystemVerilogName = true;
                }
                else if (name.EndsWith(".svh", StringComparison.OrdinalIgnoreCase))
                {
                    fallback = Path.ChangeExtension(name, ".vh");
                    hasSystemVerilogName = true;
                }
                fallbackNames.Add(fallback);
            }

            if (hasSystemVerilogName)
            {
                var fallback = new List<string> { "-g2012", "-s", "tb", "-o", "sim.vvp" };
                fallback.AddRange(fallbackNames);
                batches.Add(Tuple.Create("fallback_v", fallback));
            }

            return batches;
        }

        static void WriteOne(string work, List<string> names, string name, string content)
        {
            string safe = Path.GetFileName(name);
            File.WriteAllText(Path.Combine(work, safe), content, new UTF8Encoding(false));
            names.Add(safe);
        }

        static void WriteFallbackAliases(string work, List<string> names)
        {
            foreach (var name in new List<string>(names))
            {
                if (name.EndsWith(".sv", StringComparison.OrdinalIgnoreCase))
                {
                    string alias = Path.ChangeExtension(name, ".v");
                    string source = Path.Combine(work, name);
                    string target = Path.Combine(work, alias);
                    if (!File.Exists(source) || File.Exists(target)) continue;
                    File.Copy(source, target, true);
                }
                else if (name.EndsWith(".svh", StringComparison.OrdinalIgnoreCase))
                {
                    string alias = Path.ChangeExtension(name, ".vh");
                    string source = Path.Combine(work, name);
                    string target = Path.Combine(work, alias);
                    if (!File.Exists(source) || File.Exists(target)) continue;
                    File.Copy(source, target, true);
                }
            }
        }

        static int Run(string exe, string workDir, List<string> args, int timeoutMs, out string stderr)
        {
            var psi = new ProcessStartInfo();
            psi.FileName = exe;
            psi.WorkingDirectory = workDir;
            psi.Arguments = string.Join(" ", args);
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardError = true;
            psi.RedirectStandardOutput = true;
            psi.Environment["IVERILOG_ROOT"] = ivlRoot;
            psi.Environment["PATH"] = Path.Combine(ivlRoot, "bin") + ";" + Environment.GetEnvironmentVariable("PATH");
            var process = Process.Start(psi);
            var stderrBuilder = new StringBuilder();
            process.ErrorDataReceived += (_, eventArgs) => { if (eventArgs.Data != null) stderrBuilder.AppendLine(eventArgs.Data); };
            process.OutputDataReceived += (_, eventArgs) => { if (eventArgs.Data != null) stderrBuilder.AppendLine(eventArgs.Data); };
            process.BeginErrorReadLine();
            process.BeginOutputReadLine();
            if (!process.WaitForExit(timeoutMs))
            {
                try { process.Kill(); } catch { }
                stderr = "Process timed out after " + timeoutMs + " ms.";
                return -1;
            }
            process.WaitForExit();
            stderr = stderrBuilder.ToString();
            return process.ExitCode;
        }

        static string MimeFor(string ext)
        {
            switch ((ext ?? "").ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".js": return "text/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".webp": return "image/webp";
                case ".json": return "application/json; charset=utf-8";
                default: return "application/octet-stream";
            }
        }

        [STAThread]
        static int Main()
        {
            try { ExtractResources(Assembly.GetExecutingAssembly()); }
            catch (Exception ex) { System.Windows.Forms.MessageBox.Show("Extract failed: " + ex.Message, "WavePaint"); return 1; }
            lastActivity = Environment.TickCount;
            int port = FreePort();
            StartServer(port);
            string edge = FindEdge();
            if (edge == null)
            {
                try { server.Stop(); } catch { }
                System.Windows.Forms.MessageBox.Show("Microsoft Edge not found.", "WavePaint");
                return 1;
            }
            string url = "http://127.0.0.1:" + port + "/index.html";
            var psi = new ProcessStartInfo();
            psi.FileName = edge;
            psi.Arguments = "--app=\"" + url + "\" --no-first-run --no-default-browser-check";
            psi.UseShellExecute = false;
            try { Process.Start(psi); }
            catch (Exception ex)
            {
                try { server.Stop(); } catch { }
                System.Windows.Forms.MessageBox.Show("Failed to launch Edge: " + ex.Message, "WavePaint");
                return 1;
            }

            int gone = 0;
            int noWindowTicks = 0;
            for (;;)
            {
                bool has = false;
                try
                {
                    foreach (var process in Process.GetProcessesByName("msedge"))
                    {
                        try
                        {
                            if (!string.IsNullOrEmpty(process.MainWindowTitle) && process.MainWindowTitle.IndexOf("WavePaint", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                has = true;
                                break;
                            }
                        }
                        catch { }
                    }
                }
                catch { }

                everSeen = everSeen || has;
                if (has) gone = 0;
                else if (everSeen) gone++;
                else noWindowTicks++;
                int idle = Environment.TickCount - lastActivity;
                if (gone > 6 && idle > 5000) break;
                if (!everSeen && noWindowTicks > 80) break;
                if (!everSeen && idle > 30000) break;
                Thread.Sleep(500);
            }

            try { server.Stop(); } catch { }
            return 0;
        }
    }
}
