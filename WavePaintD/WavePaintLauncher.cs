using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

namespace WavePaint
{
    static class App
    {
        static string FindEdge()
        {
            string[] c = {
                "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft\\Edge\\Application\\msedge.exe")
            };
            foreach (var p in c) if (File.Exists(p)) return p;
            try { using (var k = Registry.LocalMachine.OpenSubKey("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe")) if (k != null) { var v = k.GetValue(null) as string; if (File.Exists(v)) return v; } } catch { }
            try { using (var k = Registry.LocalMachine.OpenSubKey("SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe")) if (k != null) { var v = k.GetValue(null) as string; if (File.Exists(v)) return v; } } catch { }
            return null;
        }
        [STAThread]
        static int Main()
        {
            var asm = Assembly.GetExecutingAssembly();
            string root = Path.Combine(Path.GetTempPath(), "WavePaintDraw_" + Environment.UserName);
            try { if (Directory.Exists(root)) Directory.Delete(root, true); } catch { }
            Directory.CreateDirectory(root);
            foreach (var d in new[] { "css", "js", "img", "lib" }) Directory.CreateDirectory(Path.Combine(root, d));
            foreach (var n in asm.GetManifestResourceNames())
            {
                string rel = n, dir = "";
                if (n.StartsWith("root_")) rel = n.Substring(5);
                else if (n.StartsWith("css_")) { dir = "css"; rel = n.Substring(4); }
                else if (n.StartsWith("js_")) { dir = "js"; rel = n.Substring(3); }
                else if (n.StartsWith("img_")) { dir = "img"; rel = n.Substring(4); }
                else if (n.StartsWith("lib_")) { dir = "lib"; rel = n.Substring(4); }
                string dest = dir.Length == 0 ? Path.Combine(root, rel) : Path.Combine(root, dir, rel);
                try { using (var s = asm.GetManifestResourceStream(n)) using (var fs = new FileStream(dest, FileMode.Create)) if (s != null) s.CopyTo(fs); } catch { }
            }
            string idx = Path.Combine(root, "index.html");
            string edge = FindEdge();
            if (edge == null) { MessageBox.Show("Microsoft Edge not found.", "WavePaint"); return 1; }
            var psi = new ProcessStartInfo();
            psi.FileName = edge;
            psi.Arguments = "--app=\"" + new Uri(idx).AbsoluteUri + "\" --no-first-run --no-default-browser-check";
            psi.UseShellExecute = false;
            Process.Start(psi);
            return 0;
        }
    }
}