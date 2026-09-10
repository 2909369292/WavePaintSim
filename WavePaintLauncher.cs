using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32;

namespace WaveWorkbench
{
    static class Launcher
    {
        const int ProcessTimeoutMs = 30000;
        const int MaxBodyBytes = 8 * 1024 * 1024;   // /api/sim、/api/snapshot 请求体上限
        const int MaxSnapshots = 20;                // 快照目录保留上限（超出删最旧）
        // 首选固定端口（2026-09-10 根治「点仿真请求无响应」）：
        //   旧实现每次启动都 FreePort() 取随机端口 —— exe 一旦退出/被重启，端口就变；
        //   已经打开的旧页面仍指向「上一个端口」，之后每一次 /api/sim 都是
        //   ERR_CONNECTION_REFUSED（用户看到的就是「点仿真没反应/请求无响应」），
        //   而且刷新页面也救不回来（刷新请求本身就打在死端口上）。
        //   改成固定首选端口后，页面 origin 跨会话稳定：exe 重启后旧页面「刷新 / 自动
        //   重连 / 由本页重新拉起服务」都能重新连上同一个 origin。端口若被别的程序
        //   占用才回退到随机端口（并写入发现文件，前端可跨端口自愈）。
        const int PreferredPort = 17817;
        // 服务身份标识：页面探活时用它区分「本应用的仿真服务」与「别人占用了同一端口
        // 的其它本地 HTTP 服务」——否则会对着别家的服务发 /api/sim 而拿到 404。
        const string PingTag = "WAVEPAINT-SERVICE";
        static string root;
        static string ivlRoot;
        static HttpListener server;
        static Mutex singleInstanceMutex;
        static volatile int lastActivity;
        static int simActive;                       // 进行中的 /api/sim 数（Interlocked 计数；
                                                    // 旧的单 bool 在两个并发请求时会被先完成者
                                                    // 清零 → 监控循环恢复退出检测 → 杀掉进行中的仿真）
        static volatile bool shuttingDown;
        static bool everSeen;
        static bool windowProbeOk;                  // 顶层窗口枚举是否真的执行成功（false ⇒ 绝不按「没窗口」退出）
        static string portFile = Path.Combine(Path.GetTempPath(), "WavePaintClean_port_" + Process.GetCurrentProcess().Id + ".txt");
        static string serviceFile = Path.Combine(Path.GetTempPath(), "WavePaintClean_service.txt");
        static string logFile = Path.Combine(Path.GetTempPath(), "WavePaintClean_sim.log");
        static string snapshotRoot = Path.Combine(Path.GetTempPath(), "WavePaintClean_snapshots");
        static int listenPort;                       // 本实例监听端口（CORS 白名单用）
        static string buildStamp = "unknown";        // 资源整包指纹（= version.txt 内容）
        static string exitReason = "unknown";        // 退出原因（写日志，供事后定位）
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

        // 资源解压（2026-09-10 根治改造）：
        //   旧实现每次启动都 `Directory.Delete(root,true)` 后整包重解（含 ~20MB 的
        //   ivl.zip），存在三类会直接表现为「双击 exe 没反应 / 点仿真请求无响应」的故障：
        //     ① 上一次实例的 exe 尚未完全退出（或文件被杀软/索引器占用）→ Delete 或
        //        解压抛异常 → MainCore 弹一个 MessageBox 后 return 1，服务从未起来；
        //     ② 解压到一半被打断（用户又点了一次、系统睡眠）→ ivl\bin\iverilog.exe 缺失，
        //        第一次点「运行仿真」必然失败；
        //     ③ 每次启动都重解 20MB，启动慢，扩大了 ①② 的窗口。
        //   新实现：按 stamp（version.txt 内容 = 版本+构建时间+git 哈希）判定缓存，命中且
        //   ivl 完整就直接复用（秒起）；需要重建时若原目录删不掉，就退到唯一目录
        //   （绝不与旧实例抢同一份文件）；stamp 最后写，保证「没有 stamp ⇒ 资源不完整」。
        static string EnsureResources(Assembly asm)
        {
            buildStamp = ReadVersionText(asm);
            string baseRoot = Path.Combine(Path.GetTempPath(), "WavePaintClean_" + Environment.UserName);
            if (IsResourceRootUsable(baseRoot, buildStamp))
            {
                root = baseRoot;
                ivlRoot = Path.Combine(root, "ivl");
                return "cache";
            }
            string mode;
            try
            {
                if (Directory.Exists(baseRoot)) Directory.Delete(baseRoot, true);
                ExtractInto(asm, baseRoot, buildStamp);
                root = baseRoot;
                mode = "extract";
            }
            catch (Exception ex)
            {
                Log(DateTime.Now.ToString("u") + " EXTRACT base-root failed (" + ex.Message + ") → unique dir" + Environment.NewLine);
                string unique = Path.Combine(Path.GetTempPath(), "WavePaintClean_" + Environment.UserName + "_" + Process.GetCurrentProcess().Id);
                try { if (Directory.Exists(unique)) Directory.Delete(unique, true); } catch { }
                ExtractInto(asm, unique, buildStamp);
                root = unique;
                mode = "extract-unique";
            }
            // ⚠ 必须与 cache 分支一样刷新 ivlRoot。历史缺陷：只有 cache 分支赋值，
            // 于是「换版本后第一次启动」（走 extract 分支）ivlRoot 仍为 null，
            // 用户第一次点「运行仿真」必崩在 Path.Combine(null, "bin", ...) →
            // 表现为「本地仿真失败 / 请求无响应」。同时 root 变了也必须重算。
            ivlRoot = Path.Combine(root, "ivl");
            return mode;
        }

        static bool IsResourceRootUsable(string dir, string stamp)
        {
            try
            {
                if (!File.Exists(Path.Combine(dir, "index.html"))) return false;
                string marker = Path.Combine(dir, ".wpb-stamp");
                if (!File.Exists(marker)) return false;
                if (File.ReadAllText(marker).Trim() != stamp) return false;
                return File.Exists(Path.Combine(dir, "ivl", "bin", "iverilog.exe"));
            }
            catch { return false; }
        }

        static string ReadVersionText(Assembly asm)
        {
            try
            {
                using (var stream = asm.GetManifestResourceStream("root_version.txt"))
                {
                    if (stream != null)
                    {
                        using (var reader = new StreamReader(stream, Encoding.UTF8)) return reader.ReadToEnd().Trim();
                    }
                }
            }
            catch { }
            try { return "build-" + File.GetLastWriteTimeUtc(asm.Location).Ticks.ToString(); } catch { }
            return "build-unknown";
        }

        static void ExtractInto(Assembly asm, string target, string stamp)
        {
            Directory.CreateDirectory(target);
            foreach (var dir in new[] { "js", "css", "img", "lib" }) Directory.CreateDirectory(Path.Combine(target, dir));
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
                string destination = subdir.Length == 0 ? Path.Combine(target, relative) : Path.Combine(target, subdir, relative);
                // 资源名可能带子路径（如 js_core/__core.js → js/core/__core.js），确保目录存在
                string destDir = Path.GetDirectoryName(destination);
                if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);
                using (var input = asm.GetManifestResourceStream(resource))
                using (var output = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    if (input != null) input.CopyTo(output);
                }
            }

            string ivlDir = Path.Combine(target, "ivl");
            Directory.CreateDirectory(ivlDir);
            string zipPath = Path.Combine(target, "ivl.zip");
            using (var zip = asm.GetManifestResourceStream("ivl.zip"))
            {
                if (zip == null) throw new InvalidOperationException("Missing ivl.zip resource.");
                using (var output = new FileStream(zipPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    zip.CopyTo(output);
                }
            }
            ZipFile.ExtractToDirectory(zipPath, ivlDir);
            if (!File.Exists(Path.Combine(ivlDir, "bin", "iverilog.exe")))
                throw new InvalidOperationException("ivl.zip 解压后缺少 bin\\iverilog.exe。");
            // stamp 最后写：解压中途被打断 ⇒ 没有 stamp ⇒ 下次启动自动重来
            File.WriteAllText(Path.Combine(target, ".wpb-stamp"), stamp);
        }

        // 按需补齐 ivl（仿真链路自救）：exe 进程活着但 ivl 目录被清理/解压不完整时，
        // 旧实现会一路走到 iverilog.exe 不存在，用户看到的是「仿真失败」而不知为什么。
        // 这里在每次仿真前兜一次，能修就修，修不了就返回可读的中文错误（而不是静默/崩溃）。
        static bool EnsureIvlReady(out string error)
        {
            error = null;
            try
            {
                // 防御：ivlRoot 未初始化时从 root 兜底推导（历史空引用崩溃的二次保险）。
                // 连 root 都没有才报可读中文错误，绝不让 Path.Combine 抛出难懂的英文异常。
                if (string.IsNullOrEmpty(ivlRoot))
                {
                    if (string.IsNullOrEmpty(root)) { error = "本地资源目录尚未就绪，请重启应用后重试。"; return false; }
                    ivlRoot = Path.Combine(root, "ivl");
                }
                string exePath = Path.Combine(ivlRoot, "bin", "iverilog.exe");
                if (File.Exists(exePath)) return true;
                Directory.CreateDirectory(ivlRoot);
                string zipPath = Path.Combine(root, "ivl.zip");
                if (!File.Exists(zipPath))
                {
                    using (var zip = Assembly.GetExecutingAssembly().GetManifestResourceStream("ivl.zip"))
                    {
                        if (zip == null) { error = "安装包内缺少 ivl.zip 资源，无法运行 iverilog。"; return false; }
                        using (var output = new FileStream(zipPath, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            zip.CopyTo(output);
                        }
                    }
                }
                ZipFile.ExtractToDirectory(zipPath, ivlRoot);
                if (!File.Exists(exePath)) { error = "仿真工具解压不完整（缺少 ivl\\bin\\iverilog.exe）。"; return false; }
                Log(DateTime.Now.ToString("u") + " IVL repaired at " + ivlRoot + Environment.NewLine);
                return true;
            }
            catch (Exception ex)
            {
                error = "仿真工具（iverilog）不可用：" + ex.Message;
                Log(DateTime.Now.ToString("u") + " IVL repair failed: " + ex + Environment.NewLine);
                return false;
            }
        }

        static int FreePort()
        {
            var listener = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
            try
            {
                listener.Start();
                return ((IPEndPoint)listener.LocalEndpoint).Port;
            }
            finally
            {
                try { listener.Stop(); } catch { }
            }
        }

        static bool StartServer(int port)
        {
            // 初始启动：端口可能被抢（竞态/别的程序占用首选固定端口），失败换端口重试。
            // 首选端口固定 ⇒ 页面 origin 跨会话稳定（详见 PreferredPort 注释）。
            for (int attempt = 0; attempt < 10; attempt++)
            {
                try
                {
                    server = new HttpListener();
                    server.Prefixes.Add("http://127.0.0.1:" + port + "/");
                    server.Start();
                    listenPort = port;
                    try { File.WriteAllText(portFile, port.ToString()); } catch { }
                    PublishDiscovery();
                    Log(DateTime.Now.ToString("u") + " SERVER start pid=" + Process.GetCurrentProcess().Id
                        + " port=" + port + " root=" + root + " stamp=" + buildStamp
                        + (port == PreferredPort ? "" : " (fallback-port)")
                        + Environment.NewLine);
                    var thread = new Thread(AcceptLoop);
                    thread.IsBackground = true;
                    thread.Start();
                    return true;
                }
                catch
                {
                    try { if (server != null) server.Close(); } catch { }
                    port = FreePort(); // 端口被抢 → 换一个再试
                }
            }
            return false;
        }

        // 服务自愈重启（必须复用同一端口）：Edge 页面已按当前端口加载，换端口等于
        // 对页面失联。GetContext 抛异常/监听被回收时循环重试同端口，直到成功。
        static bool RestartServer()
        {
            int port = listenPort;
            for (int attempt = 0; attempt < 60; attempt++)
            {
                if (shuttingDown) return false;
                try
                {
                    server = new HttpListener();
                    server.Prefixes.Add("http://127.0.0.1:" + port + "/");
                    server.Start();
                    listenPort = port;
                    try { File.WriteAllText(portFile, port.ToString()); } catch { }
                    PublishDiscovery();
                    Log(DateTime.Now.ToString("u") + " SERVER self-healed on port " + port + Environment.NewLine);
                    var thread = new Thread(AcceptLoop);
                    thread.IsBackground = true;
                    thread.Start();
                    return true;
                }
                catch
                {
                    try { if (server != null) server.Close(); } catch { }
                    Thread.Sleep(500);
                }
            }
            return false;
        }

        // 接受循环：异常绝不终结服务 —— 只要进程不死，服务必须一直在线
        // （历史实现 catch { return; } 让监听线程静默死亡 → 进程活着但服务不在线）。
        static void AcceptLoop()
        {
            while (!shuttingDown)
            {
                HttpListenerContext context;
                try { context = server.GetContext(); }
                catch (Exception)
                {
                    if (shuttingDown) return;
                    if (!RestartServer()) Thread.Sleep(1000);
                    continue;
                }
                ThreadPool.QueueUserWorkItem(_ => Handle(context));
            }
        }

        // 读取请求体（带上限，防止异常超大请求拖垮内存）
        static string ReadBody(HttpListenerRequest request)
        {
            using (var reader = new StreamReader(request.InputStream, Encoding.UTF8))
            {
                char[] chunk = new char[64 * 1024];
                var buffer = new StringBuilder();
                int read;
                while ((read = reader.Read(chunk, 0, chunk.Length)) > 0)
                {
                    buffer.Append(chunk, 0, read);
                    if (buffer.Length > MaxBodyBytes) throw new InvalidOperationException("Request body too large.");
                }
                return buffer.ToString();
            }
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
                    Interlocked.Increment(ref simActive);
                    try
                    {
                        Log(DateTime.Now.ToString("u") + " ENTER api/sim\n");
                        string body = ReadBody(context.Request);
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
                        Interlocked.Decrement(ref simActive);
                    }
                    return;
                }

                if (path == "api/snapshot")
                {
                    lastActivity = Environment.TickCount;
                    string body = ReadBody(context.Request);
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
                    // 页面心跳（js/core/heartbeat.js 每 2s 一次）：纯画布编辑不产生请求，
                    // 没有心跳的话 lastActivity 会过期 → 静置一段时间后被下面的空闲退出逻辑
                    // 误杀服务（前端再点仿真就 Failed to fetch「服务不在线」）。
                    // 应答带身份标识（PingTag）+ 端口 + 版本戳：前端据此区分「本应用的
                    // 仿真服务」与「别的程序占了同一端口」，也让用户/日志能定位版本。
                    lastActivity = Environment.TickCount;
                    byte[] data = Encoding.UTF8.GetBytes(PingTag + "\n" + listenPort + "\n" + buildStamp + "\n");
                    context.Response.ContentType = "text/plain; charset=utf-8";
                    context.Response.AddHeader("Cache-Control", "no-store");
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
                // 静态资源一律 no-cache：解压目录每次启动重建但 URL 不变，Edge 磁盘缓存
                // 可能把旧版 JS/CSS 跨会话供出来（用户「改了没生效」的历史困惑源之一）
                context.Response.AddHeader("Cache-Control", "no-cache");
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
            // 异常路径也必须清理 work 目录（旧实现正常/编译失败路径清理，异常路径泄漏）
            try { return RunSimulationCore(work, body); }
            catch
            {
                try { Directory.Delete(work, true); } catch { }
                throw;
            }
        }

        static string RunSimulationCore(string work, string body)
        {
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

            // 按需补齐 iverilog（自救）：临时目录被清理/上次解压不完整时，这里修好再跑，
            // 修不了就返回可读错误（而不是让用户看到一句莫名的「仿真失败」）。
            string ivlError;
            if (!EnsureIvlReady(out ivlError))
            {
                try { Directory.Delete(work, true); } catch { }
                Log("RUN ivl-not-ready " + ivlError + Environment.NewLine);
                return "IVERILOG-ERROR:\n" + ivlError;
            }

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
            // 快照目录有上限：只保留最新 MaxSnapshots 份（旧实现只增不减，%TEMP% 膨胀）
            try
            {
                var files = new DirectoryInfo(snapshotRoot).GetFiles("wave_*.json");
                if (files.Length > MaxSnapshots)
                {
                    Array.Sort(files, (a, b) => a.CreationTimeUtc.CompareTo(b.CreationTimeUtc));
                    for (int i = 0; i < files.Length - MaxSnapshots; i++) files[i].Delete();
                }
            }
            catch { }
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

        // 命令行参数加引号：文件名来自仿真面板，可能含空格（如 "my design.v"）。
        // 按 Windows 规则处理反斜杠与引号：紧邻引号前的连续反斜杠要翻倍再补一个，
        // 结尾反斜杠（紧邻收尾引号）要翻倍 —— 旧实现的简单 Replace 在
        // `路径以 \ 结尾` 或 `含 \"` 时会产生歧义参数。
        static string QuoteArg(string arg)
        {
            if (string.IsNullOrEmpty(arg)) return "\"\"";
            if (arg.IndexOf(' ') < 0 && arg.IndexOf('\t') < 0 && arg.IndexOf('"') < 0 && arg.IndexOf('\\') < 0) return arg;
            var sb = new StringBuilder();
            sb.Append('"');
            int backslashes = 0;
            foreach (char c in arg)
            {
                if (c == '\\') { backslashes++; continue; }
                if (c == '"')
                {
                    sb.Append('\\', backslashes * 2 + 1);
                    backslashes = 0;
                    sb.Append('"');
                    continue;
                }
                sb.Append('\\', backslashes);
                backslashes = 0;
                sb.Append(c);
            }
            sb.Append('\\', backslashes * 2); // 收尾引号前的反斜杠翻倍
            sb.Append('"');
            return sb.ToString();
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

        // 同源白名单：本实例端口，外加本机回环上的任意端口。
        // 放开「回环任意端口」是前端自愈所必需：exe 回退到非首选端口、或旧页面 origin
        // 的端口与服务端口不一致时，页面必须还能 GET api/ping 探活、才能自动重连。
        // 仍然只认回环（127.0.0.1/localhost/::1），外部主机/网页拿不到数据。
        static bool IsSameOrigin(string origin)
        {
            if (string.IsNullOrEmpty(origin)) return false;
            if (string.Equals(origin, "http://127.0.0.1:" + listenPort, StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(origin, "http://localhost:" + listenPort, StringComparison.OrdinalIgnoreCase)) return true;
            try
            {
                var uri = new Uri(origin);
                if (uri.Scheme != "http") return false;
                string host = uri.Host;
                return host == "127.0.0.1" || host == "localhost" || host == "::1" || host == "[::1]";
            }
            catch { return false; }
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
            DeleteDiscovery();
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

        // 应用窗口判定（2026-09-10 重写）：旧实现遍历 msedge 进程读 Process.MainWindowTitle。
        // 一个 msedge 进程可以有多个顶层窗口，MainWindowTitle 只报它认定的「主窗口」——
        // 用户一旦另开普通 Edge 窗口、窗口被 Chromium 重组、或应用窗口不是该进程的主窗口，
        // 标题就取不到 → HasWindow() 误判「窗口没了」→ 监控循环判定「用户已关页面」→
        // 停服务并退出 → 桌面上窗口还在，用户再点「运行仿真」= 请求无响应。
        // 改为枚举全部可见顶层窗口（与 CloseLegacyWindows 同源，真值来源唯一）。
        static List<IntPtr> FindWaveWindowHandles()
        {
            var targets = new List<IntPtr>();
            bool ok = false;
            try
            {
                EnumWindows(delegate(IntPtr hWnd, IntPtr lParam)
                {
                    try
                    {
                        if (!IsWindowVisible(hWnd)) return true;
                        var sb = new StringBuilder(512);
                        if (GetWindowText(hWnd, sb, sb.Capacity) > 0)
                        {
                            string title = sb.ToString();
                            if (title.IndexOf("WavePaint", StringComparison.OrdinalIgnoreCase) >= 0
                                || title.IndexOf("WaveWorkbench", StringComparison.OrdinalIgnoreCase) >= 0)
                                targets.Add(hWnd);
                        }
                    }
                    catch { }
                    return true;
                }, IntPtr.Zero);
                ok = true;
            }
            catch { }
            windowProbeOk = ok;   // 探测失败时调用方必须保守处理（绝不按「无窗口」退出）
            return targets;
        }

        static bool HasWindow()
        {
            var handles = FindWaveWindowHandles();
            if (!windowProbeOk) return true;   // 探测机制本身失败 → 保守认为有窗口
            return handles.Count > 0;
        }

        static bool IsAlive(Process process)
        {
            try { return process != null && !process.HasExited; }
            catch { return false; }
        }

        // 收拢遗留窗口（2026-09-09 修复）：重建/重启 exe 时旧实例被杀，但其 Edge 窗口
        // 仍停在上一个随机端口 → 页面同源 /api/* 全部连接失败 → 用户看到“仿真直接
        // 无法运行”；而窗口本身不消失，还会让新实例的 HasWindow 误判“有窗口在服务”
        // 而永不空闲退出。因此本实例在（a）接管已有实例、（b）全新启动开窗前，
        // 先对所有标题含 WavePaint/WaveWorkbench 的顶层窗口发 WM_CLOSE，随后只开
        // 一个新窗口 —— 保证桌面上同一时刻只有一份指向最新实例的页面。
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
        [DllImport("user32.dll")]
        static extern bool IsWindowVisible(IntPtr hWnd);
        [DllImport("user32.dll")]
        static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
        const uint WM_CLOSE = 0x0010;

        static void CloseLegacyWindows()
        {
            var targets = FindWaveWindowHandles();
            if (targets.Count == 0) return;
            foreach (var hWnd in targets)
            {
                try { PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero); } catch { }
            }
            Log(DateTime.Now.ToString("u") + " CLOSE-LEGACY " + targets.Count + " window(s)" + Environment.NewLine);
            // 最多等 ~2.5s 让 Edge 收窗；等不到也不阻塞（新窗口随后打开即可）
            for (int i = 0; i < 5; i++)
            {
                if (FindWaveWindowHandles().Count == 0) break;
                Thread.Sleep(500);
            }
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

        // 已有实例在运行：定位「真正在服务」的端口，让用户看到窗口。
        // 2026-09-10 重写要点：
        //   ① 判活从「TCP 能连上」升级为「GET api/ping 且返回本应用标识」——
        //      旧实现只要某个端口能建立 TCP 就把窗口指向它：%TEMP% 里残留的旧端口文件
        //      若被别的程序占用，会打开一个指向陌生服务的窗口（页面 404/白屏），
        //      用户看到的就是「点仿真没反应」；而「进程活着但服务已死」的僵尸实例
        //      会让旧实现直接 return 0（什么都不开），用户双击 exe 毫无反应。
        //   ② 陈旧端口文件顺手清掉（内容不是数字 / 标识不匹配 / 连不上）。
        //   ③ 已经有应用窗口时不再新开一个，只把它唤到前台（避免窗口越点越多）。
        // 返回 true 表示「已接管并可以退出本进程」；false 表示需要本进程自己把服务起起来。
        static bool OpenExistingInstance()
        {
            int livePort = 0;
            DiscoveryScan(out livePort);
            if (livePort == 0) return false;
            Log(DateTime.Now.ToString("u") + " HANDOFF to existing instance on port " + livePort + Environment.NewLine);
            FocusWaveWindow();
            if (FindWaveWindowHandles().Count == 0)
            {
                string edge = FindEdge();
                if (edge == null) return true;
                var psi = new ProcessStartInfo();
                psi.FileName = edge;
                psi.Arguments = "--app=\"http://127.0.0.1:" + livePort + "/index.html\" --no-first-run --no-default-browser-check";
                psi.UseShellExecute = false;
                try { Process.Start(psi); } catch { }
            }
            return true;
        }

        // 扫描候选端口（发现文件 + 全部端口文件），返回第一个真正是本应用服务的端口。
        static void DiscoveryScan(out int livePort)
        {
            livePort = 0;
            var candidates = new List<int>();
            try
            {
                if (File.Exists(serviceFile))
                {
                    foreach (var line in File.ReadAllLines(serviceFile))
                    {
                        if (!line.StartsWith("port=", StringComparison.OrdinalIgnoreCase)) continue;
                        int p;
                        if (int.TryParse(line.Substring(5).Trim(), out p) && p > 0 && !candidates.Contains(p)) candidates.Add(p);
                    }
                }
            }
            catch { }
            try
            {
                foreach (var file in Directory.GetFiles(Path.GetTempPath(), "WavePaintClean_port_*.txt"))
                {
                    try
                    {
                        int p;
                        if (!int.TryParse(File.ReadAllText(file).Trim(), out p) || p <= 0)
                        {
                            TryDeleteStalePortFile(file);
                            continue;
                        }
                        string tag = HttpGetPing(p, 800);
                        if (tag == null || !tag.StartsWith(PingTag, StringComparison.Ordinal))
                        {
                            // 不是我们的服务（端口被别的程序占用/实例已退出）→ 陈旧文件，清掉
                            TryDeleteStalePortFile(file);
                            continue;
                        }
                        if (!candidates.Contains(p)) candidates.Insert(0, p);   // 实测存活的优先
                    }
                    catch { }
                }
            }
            catch { }
            foreach (var p in candidates)
            {
                string tag = HttpGetPing(p, 800);
                if (tag != null && tag.StartsWith(PingTag, StringComparison.Ordinal))
                {
                    livePort = p;
                    return;
                }
            }
        }

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr hWnd);
        const int SW_RESTORE = 9;

        // 把已有应用窗口唤到前台（用户重复双击 exe 时的期望行为），失败静默。
        static void FocusWaveWindow()
        {
            try
            {
                var handles = FindWaveWindowHandles();
                foreach (var hWnd in handles)
                {
                    try { ShowWindow(hWnd, SW_RESTORE); } catch { }
                    try { SetForegroundWindow(hWnd); } catch { }
                    return;
                }
            }
            catch { }
        }

        // 注册 wavepaint: URL 协议（HKCU，无需管理员）。用途：页面在「服务已不在线」
        // 时，用户可以点面板上的「启动本地仿真服务」，由浏览器直接拉起 exe（首次会弹一次
        // 「是否允许打开」确认框，勾选始终允许后即无感）—— 这是「每次点仿真都必须成功」
        // 的最后一道自愈：连服务进程都没了，页面也能把它拉回来。
        static void RegisterUrlProtocol()
        {
            try
            {
                string exe = Assembly.GetExecutingAssembly().Location;
                if (string.IsNullOrEmpty(exe) || !File.Exists(exe)) return;
                using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\wavepaint"))
                {
                    if (key == null) return;
                    key.SetValue(null, "URL:WavePaint Local Simulation Service");
                    key.SetValue("URL Protocol", "");
                    using (var command = key.CreateSubKey(@"shell\open\command"))
                    {
                        if (command != null) command.SetValue(null, "\"" + exe + "\" \"%1\"");
                    }
                }
            }
            catch { }
        }

        // 从协议 URI（wavepaint://start?port=49234）里取端口。手写解析，避免为一个
        // 小功能引入 System.Text.RegularExpressions。取不到 / 非法一律返回 0。
        static int ParsePortArg(string uri)
        {
            if (string.IsNullOrEmpty(uri)) return 0;
            int at = uri.IndexOf("port=", StringComparison.OrdinalIgnoreCase);
            if (at < 0) return 0;
            int start = at + 5;
            int end = start;
            while (end < uri.Length && uri[end] >= '0' && uri[end] <= '9') end++;
            if (end == start) return 0;
            int value;
            if (!int.TryParse(uri.Substring(start, end - start), out value)) return 0;
            return (value > 0 && value < 65536) ? value : 0;
        }

        static void TryDeleteStalePortFile(string file)
        {
            try { File.Delete(file); } catch { }
        }

        // 「当前实例」发现文件（固定路径）：单实例接管、以及前端跨端口自愈都靠它定位
        // 真正在服务的那个端口。写失败不影响服务本身（端口文件仍在）。
        static void PublishDiscovery()
        {
            try
            {
                File.WriteAllText(serviceFile,
                    "port=" + listenPort + Environment.NewLine
                    + "pid=" + Process.GetCurrentProcess().Id + Environment.NewLine
                    + "stamp=" + buildStamp + Environment.NewLine);
            }
            catch { }
        }

        static void DeleteDiscovery()
        {
            // 只删「自己写的」那条：接管场景下可能已有新实例改写了发现文件，别误删别人的。
            try
            {
                if (!File.Exists(serviceFile)) return;
                string text = File.ReadAllText(serviceFile);
                if (text.IndexOf("pid=" + Process.GetCurrentProcess().Id, StringComparison.Ordinal) >= 0) File.Delete(serviceFile);
            }
            catch { }
        }

        // 启动自检：服务真的能应答才开始服务页面（否则 Edge 会打开一个连不上服务的窗口，
        // 用户点仿真必然「无响应」——这正是历史故障的可见症状）。
        static bool SelfCheck()
        {
            for (int i = 0; i < 10; i++)
            {
                try
                {
                    string tag = HttpGetPing(listenPort, 1000);
                    if (tag != null && tag.StartsWith(PingTag, StringComparison.Ordinal)) return true;
                }
                catch { }
                Thread.Sleep(200);
            }
            return false;
        }

        // 读本机某端口的 api/ping 应答（用于启动自检与单实例接管校验）。
        // 返回 null 表示连不上 / 不是本应用的服务（标识不匹配）。
        static string HttpGetPing(int port, int timeoutMs)
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/ping");
                request.Method = "GET";
                request.Timeout = timeoutMs;
                request.ReadWriteTimeout = timeoutMs;
                request.Proxy = null;   // 绕过系统代理：回环地址走代理会直接失败
                using (var response = (HttpWebResponse)request.GetResponse())
                using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                {
                    return reader.ReadToEnd().Trim();
                }
            }
            catch { return null; }
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
            // 通过 wavepaint: 协议被页面拉起时（服务已死、页面点「启动本地仿真服务」）
            // 只把服务起起来，不新开窗口 —— 用户本来就在一个窗口里。
            bool protocolLaunch = false;
            int requestedPort = 0;
            try
            {
                foreach (var arg in Environment.GetCommandLineArgs())
                {
                    if (string.IsNullOrEmpty(arg) || !arg.StartsWith("wavepaint:", StringComparison.OrdinalIgnoreCase)) continue;
                    protocolLaunch = true;
                    // 页面会把自己当前 origin 的端口带上（wavepaint://start?port=49234）：
                    // 重拉后服务回到同一端口 ⇒ 页面 origin 不变 ⇒ 无需整页跳转
                    // （跳转会丢掉用户尚未保存的画布内容）。解析不到才退回固定首选端口。
                    requestedPort = ParsePortArg(arg);
                    break;
                }
            }
            catch { }

            if (!TryAcquireSingleInstance())
            {
                // 已有实例：先确认它「真的在服务」。僵尸实例（进程活着、服务已死，
                // 例如用户手滑杀掉了监听线程、或旧版本遗留）必须能接管，否则用户双击
                // exe 之后什么都没发生，桌面上的旧窗口点仿真永远「无响应」。
                if (OpenExistingInstance()) return 0;
                Log(DateTime.Now.ToString("u") + " TAKE-OVER: mutex held but no live service found" + Environment.NewLine);
            }
            try { Log(DateTime.Now.ToString("u") + " BOOT resources=" + EnsureResources(Assembly.GetExecutingAssembly()) + Environment.NewLine); }
            catch (Exception ex)
            {
                Log(DateTime.Now.ToString("u") + " EXTRACT-FAILED " + ex + Environment.NewLine);
                System.Windows.Forms.MessageBox.Show(
                    "WavePaint 资源解压失败：\n" + ex.Message
                    + "\n\n请关闭所有 WavePaint 窗口后重试；若仍失败请查看日志：\n" + logFile,
                    "WavePaintClean");
                return 1;
            }
            RegisterUrlProtocol();
            lastActivity = Environment.TickCount;
            // 端口优先级：页面指定的原端口（协议重拉，保证与页面同源）→ 固定首选端口
            bool started = StartServer(requestedPort > 0 ? requestedPort : PreferredPort);
            // 启动自检：服务必须真的应答才开始服务页面。失败则换端口再试一次
            //（避免「Edge 打开了窗口、服务其实没起来」这种点仿真必然无响应的局面）。
            if (!started || !SelfCheck())
            {
                Log(DateTime.Now.ToString("u") + " SELFCHECK failed on port " + listenPort + " → retry new port" + Environment.NewLine);
                try { if (server != null) server.Stop(); } catch { }
                int retryPort = FreePort();
                if (retryPort == PreferredPort) retryPort = FreePort();
                started = StartServer(retryPort) && SelfCheck();
            }
            if (!started)
            {
                System.Windows.Forms.MessageBox.Show(
                    "WavePaint 本地仿真服务启动失败（端口无法绑定或自检不通过）。\n请重试，或查看日志：" + logFile,
                    "WavePaintClean");
                return 1;
            }
            int port = listenPort;
            string edge = FindEdge();
            if (edge == null)
            {
                try { server.Stop(); } catch { }
                System.Windows.Forms.MessageBox.Show("Microsoft Edge not found.", "WavePaintClean");
                return 1;
            }
            bool hasWindow = FindWaveWindowHandles().Count > 0;
            if (!hasWindow || !protocolLaunch)
            {
                string url = "http://127.0.0.1:" + port + "/index.html";
                var psi = new ProcessStartInfo();
                psi.FileName = edge;
                psi.Arguments = "--app=\"" + url + "\" --no-first-run --no-default-browser-check";
                psi.UseShellExecute = false;
                CloseLegacyWindows();
                try { Process.Start(psi); }
                catch (Exception ex)
                {
                    Log(DateTime.Now.ToString("u") + " EDGE-LAUNCH-FAILED " + ex.Message + Environment.NewLine);
                    try { server.Stop(); } catch { }
                    System.Windows.Forms.MessageBox.Show("Failed to launch Edge: " + ex.Message, "WavePaintClean");
                    return 1;
                }
            }

            int bootTicks = Environment.TickCount;
            int gone = 0;
            int noWindowTicks = 0;
            bool lastSeen = hasWindow;
            for (;;)
            {
                // 仿真处理期间（iverilog/vvp 可能运行数秒到数十秒）不执行窗口/空闲退出检测，
                // 避免 Edge 窗口标题短暂获取不到或仿真耗时较长时误杀进程导致前端 Failed to fetch。
                // ⚠ 用 Interlocked 计数而非单 bool：两个并发 /api/sim 时，先完成者会把
                // 单 bool 清零 → 检测恢复 → 第二个还在跑的仿真连同进程被杀（2026-09-04 修）。
                if (Interlocked.CompareExchange(ref simActive, 0, 0) > 0) { Thread.Sleep(500); continue; }
                bool has = HasWindow();
                everSeen = everSeen || has;
                if (has != lastSeen)
                {
                    lastSeen = has;
                    Log(DateTime.Now.ToString("u") + " WINDOW visible=" + (has ? 1 : 0)
                        + " idle=" + (Environment.TickCount - lastActivity) + "ms" + Environment.NewLine);
                }
                if (has) gone = 0;
                else if (everSeen) gone++;
                else noWindowTicks++;
                int idle = Environment.TickCount - lastActivity;
                // 退出策略（2026-09-10 再收紧，根治「服务不在线」）：
                //   进程存活期间服务必须一直在线。两个条件同时成立才退出：
                //     ① 窗口枚举成功且确实看不到应用窗口（windowProbeOk）；
                //     ② 心跳也停了很久（>90s）—— 页面打开时 heartbeat.js 每 2s 打一次
                //        api/ping，idle 恒 < ~4s。
                //   为什么必须「窗口 + 心跳」双条件、且探测失败不退出：
                //     旧实现只等 12s/20s，遇到「Chromium 冻结后台渲染器导致心跳暂停」
                //     或「窗口标题取不到」就会误判用户已关页面 → 停服务退出，而窗口还在，
                //     用户回来点仿真 = 请求无响应。宁可多留一会儿进程，也绝不误杀服务。
                if (everSeen && windowProbeOk && gone > 24 && idle > 90000) { exitReason = "window-closed+idle" + idle; break; }
                // Edge 从未出现（启动失败/被拦截）：无页面可服务，超时退出防僵尸
                if (!everSeen && noWindowTicks > 240) { exitReason = "edge-never-shown"; break; }
                if (!everSeen && idle > 60000) { exitReason = "no-edge-no-heartbeat"; break; }
                Thread.Sleep(500);
            }

            Log(DateTime.Now.ToString("u") + " EXIT reason=" + exitReason
                + " uptime=" + (Environment.TickCount - bootTicks) / 1000 + "s" + Environment.NewLine);
            shuttingDown = true;
            try { server.Stop(); } catch { }
            return 0;
        }
    }
}
