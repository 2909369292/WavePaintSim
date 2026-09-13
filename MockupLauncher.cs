// WavePaintMockup.exe —— UI 原型（prototype/ui-mockup.html）的独立打包启动器
//
// 为什么要这个 exe：
//   第二十四/二十五轮的 UI 原型只能靠 `node tools/dev-server.mjs 8951` + 手输
//   http://127.0.0.1:8951/prototype/ui-mockup.html 评审 —— 用户机上「打不开链接」
//   （没起服务 / 端口被占 / 忘了命令）。本启动器把原型做成双击即用的 exe。
//
// 与真机（WavePaintClean.exe / WavePaintLauncher.cs）的关系：
//   · 完全独立：本文件不引用、不改动真机启动器，原型资源也不进真机的 resources.txt，
//     因此构建本 exe **不触发 C1**（C1 只管 js/ index.html css/ img/ lib/
//     WavePaintLauncher.cs build.ps1）。
//   · 只复用真机验证过的三条机制：内嵌资源 + 本地 HttpListener（http 而非 file://，
//     相对路径 ../img/* 与 localStorage 行为才与评审结论一致）+ Edge --app 窗口。
//   · 内嵌资源是**构建时快照**：exe 里的原型不会随源码变化，改原型必须重新构建。
//
// 行为：
//   ① 单实例：已有实例在服务（/api/ping 返回 WAVEPAINT-MOCKUP）→ 只把它的窗口
//      打开/唤到前台，本进程立即退出；否则本进程起服务。
//   ② 端口：优先 17820（原型专用，避开真机 17817），被占则换随机空闲端口。
//   ③ 打开 http://127.0.0.1:<port>/prototype/ui-mockup.html（Edge --app 无地址栏窗口；
//      没有 Edge 则退回系统默认浏览器）。
//   ④ 退出：桌面上的原型窗口消失 12 秒后自动停服务退出（窗口探测失败时保守不退出），
//      最长存活 12 小时兜底。
//
// 手动验证（无需浏览器）：
//   WavePaintMockup.exe /nolaunch           仅起服务并打印端口，不开窗口
//   curl http://127.0.0.1:<port>/api/ping   应返回 WAVEPAINT-MOCKUP <build stamp>
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Runtime.InteropServices;

static class MockupLauncher
{
    const int PreferredPort = 17820;                 // 真机固定 17817；原型独立端口，互不干扰
    const string PingTag = "WAVEPAINT-MOCKUP";
    const string HomePath = "prototype/ui-mockup.html";
    const string VersionResource = "mockup-version.txt";
    const int NoWindowExitSeconds = 12;              // 窗口消失后多久退出
    const int MaxLifetimeHours = 12;                 // 兜底最长存活

    static readonly string portFile = Path.Combine(Path.GetTempPath(),
        "WavePaintMockup_port_" + Process.GetCurrentProcess().Id + ".txt");
    static readonly string serviceFile = Path.Combine(Path.GetTempPath(), "WavePaintMockup_service.txt");
    static readonly string logFile = Path.Combine(Path.GetTempPath(), "WavePaintMockup.log");

    static Assembly asm;
    static Dictionary<string, string> resIndex;      // 逻辑名(小写) -> 真实资源名
    static string buildStamp = "unknown";
    static HttpListener server;
    static Mutex singleInstanceMutex;
    static int listenPort;
    static volatile int lastActivity;
    static volatile bool shuttingDown;
    static bool windowProbeOk;
    static readonly object logLock = new object();

    [STAThread]
    static int Main(string[] args)
    {
        try { return MainCore(args); }
        catch (Exception ex)
        {
            Log(DateTime.Now.ToString("u") + " FATAL " + ex + Environment.NewLine);
            try { MessageBox.Show("原型启动失败：" + ex.Message, "WavePaint UI 原型"); } catch { }
            return 1;
        }
    }

    static int MainCore(string[] args)
    {
        bool noLaunch = false;
        int forcedPort = 0;
        foreach (var a in args)
        {
            if (string.Equals(a, "/nolaunch", StringComparison.OrdinalIgnoreCase)) noLaunch = true;
            else if (a.StartsWith("/port=", StringComparison.OrdinalIgnoreCase))
            {
                int p;
                if (int.TryParse(a.Substring(6), out p) && p > 0 && p < 65536) forcedPort = p;
            }
        }

        asm = Assembly.GetExecutingAssembly();
        BuildResourceIndex();
        buildStamp = ReadResourceText(VersionResource);
        if (string.IsNullOrEmpty(buildStamp)) buildStamp = "unknown";

        // ① 已有实例在服务 → 打开它的窗口后退出（避免同机多份原型、端口漂移）
        if (TryFocusExistingInstance()) return 0;

        // 单实例互斥体：只防止「两个都还没起好服务」的竞态；拿不到也继续（可能是崩溃残留）
        try
        {
            bool createdNew;
            singleInstanceMutex = new Mutex(false, "Local\\WavePaintMockup_SingleInstance", out createdNew);
            try { if (!createdNew) singleInstanceMutex.WaitOne(0); }
            catch (AbandonedMutexException) { }
        }
        catch { }

        int port = forcedPort > 0 ? forcedPort : PreferredPort;
        if (!StartServer(port)) { MessageBox.Show("无法启动本地服务（端口被占用）。", "WavePaint UI 原型"); return 1; }
        Log(DateTime.Now.ToString("u") + " SERVER start pid=" + Process.GetCurrentProcess().Id
            + " port=" + listenPort + " stamp=" + buildStamp + Environment.NewLine);

        if (!noLaunch)
        {
            CloseLegacyWindows();
            if (!OpenWindow("http://127.0.0.1:" + listenPort + "/" + HomePath))
            {
                try { server.Stop(); } catch { }
                MessageBox.Show("未能打开浏览器窗口（未找到 Microsoft Edge，且默认浏览器启动也失败）。",
                    "WavePaint UI 原型");
                return 1;
            }
        }
        else
        {
            Log(DateTime.Now.ToString("u") + " NOLAUNCH port=" + listenPort + Environment.NewLine);
        }

        MonitorLoop();

        shuttingDown = true;
        try { server.Stop(); } catch { }
        try { if (File.Exists(portFile)) File.Delete(portFile); } catch { }
        Log(DateTime.Now.ToString("u") + " EXIT" + Environment.NewLine);
        return 0;
    }

    // ---------------------------------------------------------------- 资源索引
    static void BuildResourceIndex()
    {
        resIndex = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var name in asm.GetManifestResourceNames())
        {
            if (!resIndex.ContainsKey(name)) resIndex.Add(name, name);
        }
    }

    static string ReadResourceText(string name)
    {
        try
        {
            using (var s = asm.GetManifestResourceStream(name))
            {
                if (s == null) return null;
                using (var r = new StreamReader(s, Encoding.UTF8)) return r.ReadToEnd().Trim();
            }
        }
        catch { return null; }
    }

    // URL 路径 → 内嵌资源名。原型目录整体内嵌，映射规则尽量宽松：
    //   / 或空 → 原型首页；ui-mockup.* / index.html → 原型首页或同目录文件；其余按原名。
    static string MapPathToResource(string path)
    {
        string p = (path ?? "").Trim();
        while (p.StartsWith("/", StringComparison.Ordinal)) p = p.Substring(1);
        if (p.Length == 0) return HomePath;
        if (p.IndexOf("..", StringComparison.Ordinal) >= 0) return null;   // 目录穿越直接拒绝
        if (string.Equals(p, "index.html", StringComparison.OrdinalIgnoreCase)) return HomePath;
        if (p.StartsWith("ui-mockup.", StringComparison.OrdinalIgnoreCase)) return "prototype/" + p;
        string hit;
        if (resIndex.TryGetValue(p, out hit)) return hit;
        return null;
    }

    static string ContentType(string resource)
    {
        string ext = Path.GetExtension(resource == null ? "" : resource).ToLowerInvariant();
        switch (ext)
        {
            case ".html": return "text/html; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".webp": return "image/webp";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".gif": return "image/gif";
            case ".ico": return "image/x-icon";
            case ".json": return "application/json; charset=utf-8";
            case ".txt": return "text/plain; charset=utf-8";
            default: return "application/octet-stream";
        }
    }

    // ---------------------------------------------------------------- HTTP 服务
    static bool StartServer(int port)
    {
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
                var t = new Thread(AcceptLoop);
                t.IsBackground = true;
                t.Start();
                return true;
            }
            catch
            {
                try { if (server != null) server.Close(); } catch { }
                port = FreePort();
            }
        }
        return false;
    }

    static int FreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        try { listener.Start(); return ((IPEndPoint)listener.LocalEndpoint).Port; }
        finally { try { listener.Stop(); } catch { } }
    }

    static void AcceptLoop()
    {
        while (!shuttingDown)
        {
            HttpListenerContext ctx = null;
            try { ctx = server.GetContext(); }
            catch
            {
                if (shuttingDown) return;
                // 监听被回收（杀软/系统策略）→ 同端口重启，避免页面失联
                if (!RestartServer()) return;
                continue;
            }
            try { HandleRequest(ctx); }
            catch (Exception ex)
            {
                Log(DateTime.Now.ToString("u") + " REQ-FAIL " + ex.Message + Environment.NewLine);
                try { ctx.Response.StatusCode = 500; ctx.Response.Close(); } catch { }
            }
        }
    }

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
                var t = new Thread(AcceptLoop);
                t.IsBackground = true;
                t.Start();
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

    static void HandleRequest(HttpListenerContext ctx)
    {
        var req = ctx.Request;
        var res = ctx.Response;
        lastActivity = Environment.TickCount;

        string path = req.Url.AbsolutePath;

        if (string.Equals(path, "/api/ping", StringComparison.OrdinalIgnoreCase))
        {
            WriteText(res, 200, "text/plain; charset=utf-8", PingTag + " " + buildStamp);
            return;
        }
        if (string.Equals(path, "/mockup-version.txt", StringComparison.OrdinalIgnoreCase))
        {
            WriteText(res, 200, "text/plain; charset=utf-8", buildStamp);
            return;
        }

        string resource = MapPathToResource(path);
        if (resource == null)
        {
            WriteText(res, 404, "text/plain; charset=utf-8",
                "404 " + path + "\n（原型 exe 只内嵌 prototype/ 与 img/）\n");
            return;
        }

        using (var input = asm.GetManifestResourceStream(resource))
        {
            if (input == null)
            {
                WriteText(res, 404, "text/plain; charset=utf-8", "404 resource missing: " + resource);
                return;
            }
            res.StatusCode = 200;
            res.ContentType = ContentType(resource);
            res.Headers["Cache-Control"] = "no-store";
            res.ContentLength64 = input.Length;
            if (!string.Equals(req.HttpMethod, "HEAD", StringComparison.OrdinalIgnoreCase))
            {
                input.CopyTo(res.OutputStream);
            }
            res.OutputStream.Close();
        }
    }

    static void WriteText(HttpListenerResponse res, int status, string type, string body)
    {
        var bytes = Encoding.UTF8.GetBytes(body ?? "");
        res.StatusCode = status;
        res.ContentType = type;
        res.Headers["Cache-Control"] = "no-store";
        res.ContentLength64 = bytes.Length;
        res.OutputStream.Write(bytes, 0, bytes.Length);
        res.OutputStream.Close();
    }

    // ---------------------------------------------------------------- 单实例发现
    static void PublishDiscovery()
    {
        try { File.WriteAllText(serviceFile, "tag=" + PingTag + Environment.NewLine + "port=" + listenPort + Environment.NewLine); }
        catch { }
    }

    static bool TryFocusExistingInstance()
    {
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
            foreach (var f in Directory.GetFiles(Path.GetTempPath(), "WavePaintMockup_port_*.txt"))
            {
                int p;
                if (int.TryParse(File.ReadAllText(f).Trim(), out p) && p > 0 && !candidates.Contains(p)) candidates.Add(p);
            }
        }
        catch { }

        foreach (var p in candidates)
        {
            if (!IsOurService(p)) continue;
            Log(DateTime.Now.ToString("u") + " HANDOFF to existing instance on port " + p + Environment.NewLine);
            CloseLegacyWindows();
            OpenWindow("http://127.0.0.1:" + p + "/" + HomePath);
            return true;
        }
        return false;
    }

    static bool IsOurService(int port)
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/ping");
            req.Timeout = 1200;
            req.Method = "GET";
            using (var resp = (HttpWebResponse)req.GetResponse())
            using (var sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
            {
                return sr.ReadToEnd().IndexOf(PingTag, StringComparison.Ordinal) >= 0;
            }
        }
        catch { return false; }
    }

    // ---------------------------------------------------------------- 浏览器窗口
    static string FindEdge()
    {
        string[] candidates = {
            @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                @"Microsoft\Edge\Application\msedge.exe")
        };
        foreach (var path in candidates) if (File.Exists(path)) return path;
        try
        {
            using (var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"))
                if (key != null) { var v = key.GetValue(null) as string; if (File.Exists(v)) return v; }
        }
        catch { }
        return null;
    }

    static bool OpenWindow(string url)
    {
        string edge = FindEdge();
        if (edge != null)
        {
            var psi = new ProcessStartInfo();
            psi.FileName = edge;
            psi.Arguments = "--app=\"" + url + "\" --no-first-run --no-default-browser-check";
            psi.UseShellExecute = false;
            try { Process.Start(psi); return true; } catch { }
        }
        try
        {
            var psi = new ProcessStartInfo(url);
            psi.UseShellExecute = true;     // 退回系统默认浏览器（普通标签页）
            Process.Start(psi);
            return true;
        }
        catch { return false; }
    }

    // 窗口判定与真机同源：枚举全部可见顶层窗口取标题（不用 Process.MainWindowTitle ——
    // 一个 msedge 进程可有多个顶层窗口，主窗口标题取不到会导致误判「窗口已关」）。
    // 原型窗口标题含「原型」；真机窗口标题含 WavePaint 但不含「原型」，互不误伤。
    static List<IntPtr> FindMockupWindowHandles()
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
                        if (sb.ToString().IndexOf("原型", StringComparison.OrdinalIgnoreCase) >= 0)
                            targets.Add(hWnd);
                    }
                }
                catch { }
                return true;
            }, IntPtr.Zero);
            ok = true;
        }
        catch { }
        windowProbeOk = ok;
        return targets;
    }

    static bool HasWindow()
    {
        var handles = FindMockupWindowHandles();
        if (!windowProbeOk) return true;    // 探测失败 → 保守认为有窗口，绝不误退出
        return handles.Count > 0;
    }

    static void CloseLegacyWindows()
    {
        var targets = FindMockupWindowHandles();
        if (targets.Count == 0) return;
        foreach (var hWnd in targets) { try { PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero); } catch { } }
        Log(DateTime.Now.ToString("u") + " CLOSE-LEGACY " + targets.Count + " window(s)" + Environment.NewLine);
        for (int i = 0; i < 5; i++)
        {
            if (FindMockupWindowHandles().Count == 0) break;
            Thread.Sleep(500);
        }
    }

    static void MonitorLoop()
    {
        int noWindow = 0;
        int boot = Environment.TickCount;
        while (!shuttingDown)
        {
            Thread.Sleep(1000);
            if (Environment.TickCount - boot > MaxLifetimeHours * 3600 * 1000) break;
            if (HasWindow()) noWindow = 0;
            else
            {
                noWindow++;
                if (noWindow >= NoWindowExitSeconds) break;
            }
        }
    }

    // ---------------------------------------------------------------- 日志
    static void Log(string text)
    {
        lock (logLock)
        {
            try { File.AppendAllText(logFile, text); } catch { }
        }
    }

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
}
