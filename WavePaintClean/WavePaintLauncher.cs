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

namespace WaveWorkbench
{
    static class Launcher
    {
        const int ProcessTimeoutMs = 30000;
        static string root;
        static string ivlRoot;
        static HttpListener server;
        static Mutex singleInstanceMutex;
        static volatile int lastActivity;
        static volatile bool simBusy;
        static bool everSeen;
        static string portFile = Path.Combine(Path.GetTempPath(), "WavePaintClean_port_" + Process.GetCurrentProcess().Id + ".txt");
        static string logFile = Path.Combine(Path.GetTempPath(), "WavePaintClean_sim.log");
        static string snapshotRoot = Path.Combine(Path.GetTempPath(), "WavePaintClean_snapshots");
        static int listenPort;                       // 本实例监听端口（CORS 白名单用）
        static readonly object logLock = new object();   // 日志写入串行化（多线程请求）

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
            root = Path.Combine(Path.GetTempPath(), "WavePaintClean_" + Environment.UserName);
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
                // 资源名可能带子路径（如 js_core/__core.js → js/core/__core.js），确保目录存在
                string destDir = Path.GetDirectoryName(destination);
                if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);
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
            listenPort = port;
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
                // P3-2：原来固定回 Access-Control-Allow-Origin:* ，意味着用户本机/内网里
                // 任意网页都能读取本服务吐出的本地文件、甚至驱动 iverilog 仿真。
                // 页面本身就由本服务同源提供，不需要 CORS；这里只对同源回显 Origin。
                string origin = context.Request.Headers["Origin"];
                if (!string.IsNullOrEmpty(origin) && IsSameOrigin(origin))
                {
                    context.Response.AddHeader("Access-Control-Allow-Origin", origin);
                    context.Response.AddHeader("Vary", "Origin");
                }
                context.Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                context.Response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
                if (context.Request.HttpMethod == "OPTIONS") { context.Response.StatusCode = 200; context.Response.Close(); return; }

                string path = context.Request.Url.AbsolutePath.TrimStart('/');
                if (path == "api/sim")
                {
                    simBusy = true;
                    try
                    {
                        Log(DateTime.Now.ToString("u") + " ENTER api/sim\n");
                        string body = new StreamReader(context.Request.InputStream, Encoding.UTF8).ReadToEnd();
                        Log("BODY " + body.Length + "\n");
                        string result;
                        try { result = RunSimulation(body); }
                        catch (Exception ex) { result = "SIM-ERROR:\n" + ex; }
                        Log("RESULT " + result.Length + "\n");
                        byte[] data = Encoding.UTF8.GetBytes(result);
                        context.Response.ContentType = "text/plain; charset=utf-8";
                        context.Response.ContentLength64 = data.Length;
                        context.Response.OutputStream.Write(data, 0, data.Length);
                        context.Response.Close();
                    }
                    finally
                    {
                        simBusy = false;
                    }
                    return;
                }

                if (path == "api/snapshot")
                {
                    string body = new StreamReader(context.Request.InputStream, Encoding.UTF8).ReadToEnd();
                    string result;
                    try { result = SaveSnapshot(body); }
                    catch (Exception ex) { result = "SNAPSHOT-ERROR:\n" + ex; }
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
                // P3-2：路径穿越防护。URL 里的 ../ 或 %2e%2e%2f 经 Path.Combine 后
                // 可能跳出解压根目录读到任意本地文件。这里把结果规范化后强制校验前缀。
                string file = Path.GetFullPath(Path.Combine(root, path));
                if (!IsUnderRoot(file)) { context.Response.StatusCode = 404; context.Response.Close(); return; }
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
            catch (Exception ex)
            {
                Log(DateTime.Now.ToString("u") + Environment.NewLine + ex + Environment.NewLine + Environment.NewLine);
                try { context.Response.StatusCode = 500; context.Response.Close(); } catch { }
            }
        }

        static string RunSimulation(string body)
        {
            lastActivity = Environment.TickCount;
            string work = Path.Combine(Path.GetTempPath(), "ivl_work_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(work);
            Log("RUN start " + work + Environment.NewLine);
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
            Log("RUN files " + names.Count + Environment.NewLine);
            WriteFallbackAliases(work, names);

            var compileBatches = BuildCompileBatches(names);
            string compileError = null;
            bool compiled = false;
            foreach (var batch in compileBatches)
            {
                string compileTag = batch.Item1;
                var compileArgs = batch.Item2;
                Log("RUN args " + compileTag + " " + string.Join(" ", compileArgs) + Environment.NewLine);
                string err1;
                int e1 = Run(Path.Combine(ivlRoot, "bin", "iverilog.exe"), work, compileArgs, ProcessTimeoutMs, out err1);
                Log("RUN compile " + compileTag + " " + e1 + Environment.NewLine + err1 + Environment.NewLine);
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
            Log("RUN vvp " + e2 + Environment.NewLine + err2 + Environment.NewLine);
            if (e2 != 0)
            {
                try { Directory.Delete(work, true); } catch { }
                return "VVP-ERROR:\n" + err2;
            }
            string vcdPath = Path.Combine(work, "wave_out.vcd");
            if (!File.Exists(vcdPath))
            {
                Log("RUN no_vcd" + Environment.NewLine);
                try { Directory.Delete(work, true); } catch { }
                return "SIM-ERROR:\nVCD file not generated.";
            }
            string vcd = File.ReadAllText(vcdPath);
            Log("RUN vcd " + vcd.Length + Environment.NewLine);
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

        static string SaveSnapshot(string body)
        {
            Directory.CreateDirectory(snapshotRoot);
            string stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss_fff");
            string snapshotPath = Path.Combine(snapshotRoot, "wave_" + stamp + "_" + Guid.NewGuid().ToString("N") + ".json");
            string latestPath = Path.Combine(snapshotRoot, "latest.json");
            File.WriteAllText(snapshotPath, body, new UTF8Encoding(false));
            File.WriteAllText(latestPath, body, new UTF8Encoding(false));
            Log(DateTime.Now.ToString("u") + " SNAPSHOT " + snapshotPath + Environment.NewLine);
            return "SNAPSHOT-OK:\n" + snapshotPath + "\n" + latestPath;
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
            psi.Arguments = string.Join(" ", args.ConvertAll(QuoteArg));
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardError = true;
            psi.RedirectStandardOutput = true;
            psi.Environment["IVERILOG_ROOT"] = ivlRoot;
            psi.Environment["PATH"] = Path.Combine(ivlRoot, "bin") + ";" + (Environment.GetEnvironmentVariable("PATH") ?? "");
            var process = Process.Start(psi);
            var stderrBuilder = new StringBuilder();
            process.ErrorDataReceived += (_, eventArgs) => { if (eventArgs.Data != null) stderrBuilder.AppendLine(eventArgs.Data); };
            process.OutputDataReceived += (_, eventArgs) => { if (eventArgs.Data != null) stderrBuilder.AppendLine(eventArgs.Data); };
            process.BeginErrorReadLine();
            process.BeginOutputReadLine();
            if (!process.WaitForExit(timeoutMs))
            {
                // P3-2：iverilog/vvp 会派生子进程（ivlpp 等），只 Kill 主进程会留下孤儿。
                KillTree(process);
                stderr = "Process timed out after " + timeoutMs + " ms.";
                return -1;
            }
            process.WaitForExit();
            stderr = stderrBuilder.ToString();
            return process.ExitCode;
        }

        // P3-2：日志统一收口。原来 12 处 try/AppendAllText/catch 复制粘贴，
        // 既没有加锁（ThreadPool 并发写会抛 IOException 被静默吞掉），
        // 也没有大小上限（WavePaintClean_sim.log 会无限增长）。
        static void Log(string text)
        {
            try
            {
                lock (logLock)
                {
                    try
                    {
                        var info = new FileInfo(logFile);
                        if (info.Exists && info.Length > 2L * 1024 * 1024)
                            File.WriteAllText(logFile, DateTime.Now.ToString("u") + " LOG rotated" + Environment.NewLine);
                    }
                    catch { }
                    File.AppendAllText(logFile, text);
                }
            }
            catch { }
        }

        // 命令行参数加引号：文件名来自仿真面板，可能含空格（如 "my design.v"），
        // 原来直接 string.Join(" ") 拼会把它拆成两个参数。
        static string QuoteArg(string arg)
        {
            if (string.IsNullOrEmpty(arg)) return "\"\"";
            if (arg.IndexOf(' ') < 0 && arg.IndexOf('\t') < 0 && arg.IndexOf('"') < 0) return arg;
            return "\"" + arg.Replace("\"", "\\\"") + "\"";
        }

        // 超时后连同子进程一起收掉（taskkill /T 杀进程树，失败再退化为 Kill 单进程）
        static void KillTree(Process process)
        {
            try
            {
                var killer = new ProcessStartInfo();
                killer.FileName = "taskkill.exe";
                killer.Arguments = "/PID " + process.Id + " /T /F";
                killer.UseShellExecute = false;
                killer.CreateNoWindow = true;
                var k = Process.Start(killer);
                if (k != null) k.WaitForExit(5000);
                return;
            }
            catch { }
            try { process.Kill(); } catch { }
            try { process.WaitForExit(2000); } catch { }
        }

        // 只认本实例自己服务的两个同源地址
        static bool IsSameOrigin(string origin)
        {
            return string.Equals(origin, "http://127.0.0.1:" + listenPort, StringComparison.OrdinalIgnoreCase)
                || string.Equals(origin, "http://localhost:" + listenPort, StringComparison.OrdinalIgnoreCase);
        }

        // 规范化后的绝对路径必须仍在解压根目录内
        static bool IsUnderRoot(string full)
        {
            try
            {
                string rootFull = Path.GetFullPath(root);
                if (!rootFull.EndsWith(Path.DirectorySeparatorChar.ToString())) rootFull += Path.DirectorySeparatorChar;
                return full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase);
            }
            catch { return false; }
        }

        // P3-2：进程退出时删掉自己的端口文件。原来从不清理，%TEMP% 里会越堆越多
        // WavePaintClean_port_<PID>.txt，OpenExistingInstance 每次都要逐个试连。
        static void DeletePortFile()
        {
            try { if (File.Exists(portFile)) File.Delete(portFile); } catch { }
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

        static bool HasWindow()
        {
            try
            {
                foreach (var process in Process.GetProcessesByName("msedge"))
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(process.MainWindowTitle) && (process.MainWindowTitle.IndexOf("WavePaint", StringComparison.OrdinalIgnoreCase) >= 0 || process.MainWindowTitle.IndexOf("WaveWorkbench", StringComparison.OrdinalIgnoreCase) >= 0))
                            return true;
                    }
                    catch { }
                }
            }
            catch { }
            return false;
        }

        static bool IsAlive(Process process)
        {
            try { return process != null && !process.HasExited; }
            catch { return false; }
        }

        // 单实例保护：避免多个 WavePaint 进程同时运行、共享 %TEMP% 资源目录互相覆盖，
        // 以及多个 Edge 窗口残留旧版本 JS 导致用户看到过期的行为。
        static bool TryAcquireSingleInstance()
        {
            bool createdNew;
            try { singleInstanceMutex = new Mutex(false, "Local\\WavePaintClean_SingleInstance", out createdNew); }
            catch { return true; } // 无法创建互斥体（环境受限），放行
            try
            {
                if (!singleInstanceMutex.WaitOne(0)) return false; // 已有实例持有
                return true;
            }
            catch (AbandonedMutexException)
            {
                return true; // 旧实例崩溃残留，接管
            }
        }

        // 已有实例在运行：定位其端口并打开对应窗口（确保用户看到最新版本），然后本实例退出。
        static void OpenExistingInstance()
        {
            try
            {
                string edge = FindEdge();
                if (edge == null) return;
                var files = Directory.GetFiles(Path.GetTempPath(), "WavePaintClean_port_*.txt");
                foreach (var file in files)
                {
                    try
                    {
                        string portText = File.ReadAllText(file).Trim();
                        int port;
                        if (!int.TryParse(portText, out port)) { TryDeleteStalePortFile(file); continue; }
                        using (var tcp = new System.Net.Sockets.TcpClient())
                        {
                            var connect = tcp.BeginConnect("127.0.0.1", port, null, null);
                            if (!connect.AsyncWaitHandle.WaitOne(500)) { TryDeleteStalePortFile(file); continue; }
                            try { tcp.EndConnect(connect); } catch { TryDeleteStalePortFile(file); continue; }
                        }
                        var psi = new ProcessStartInfo();
                        psi.FileName = edge;
                        psi.Arguments = "--app=\"http://127.0.0.1:" + port + "/index.html\" --no-first-run --no-default-browser-check";
                        psi.UseShellExecute = false;
                        Process.Start(psi);
                        return;
                    }
                    catch { }
                }
            }
            catch { }
        }

        static void TryDeleteStalePortFile(string file)
        {
            try { File.Delete(file); } catch { }
        }

        [STAThread]
        static int Main()
        {
            // 兜底：即使 Main 里提前 return 或进程被强制结束，也尽量清掉端口文件
            AppDomain.CurrentDomain.ProcessExit += delegate { DeletePortFile(); };
            try { return MainCore(); }
            finally { DeletePortFile(); }
        }

        static int MainCore()
        {
            if (!TryAcquireSingleInstance())
            {
                OpenExistingInstance();
                return 0;
            }
            try { ExtractResources(Assembly.GetExecutingAssembly()); }
            catch (Exception ex) { System.Windows.Forms.MessageBox.Show("Extract failed: " + ex.Message, "WavePaintClean"); return 1; }
            lastActivity = Environment.TickCount;
            int port = FreePort();
            StartServer(port);
            string edge = FindEdge();
            if (edge == null)
            {
                try { server.Stop(); } catch { }
                System.Windows.Forms.MessageBox.Show("Microsoft Edge not found.", "WavePaintClean");
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
                System.Windows.Forms.MessageBox.Show("Failed to launch Edge: " + ex.Message, "WavePaintClean");
                return 1;
            }

            int gone = 0;
            int noWindowTicks = 0;
            for (;;)
            {
                // 仿真处理期间（iverilog/vvp 可能运行数秒到数十秒）不执行窗口/空闲退出检测，
                // 避免 Edge 窗口标题短暂获取不到或仿真耗时较长时误杀进程导致前端 Failed to fetch
                if (simBusy) { Thread.Sleep(500); continue; }
                bool has = HasWindow();
                everSeen = everSeen || has;
                if (has) gone = 0;
                else if (everSeen) gone++;
                else noWindowTicks++;
                int idle = Environment.TickCount - lastActivity;
                // 窗口消失 >12s 且空闲 >15s 才退出（原 3.5s/5s 过严，系统繁忙时窗口标题可能短暂获取不到）
                if (gone > 24 && idle > 15000) break;
                if (!everSeen && noWindowTicks > 240) break;
                if (!everSeen && idle > 60000) break;
                Thread.Sleep(500);
            }

            try { server.Stop(); } catch { }
            return 0;
        }
    }
}
