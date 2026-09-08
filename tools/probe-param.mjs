// 临时探针：参数化设计端到端（真 iverilog 编译 + 运行），用后即删
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
import { parseVerilogDesign, buildAutoTestbench } from "../js/sim/engine.js";

// 解压/缓存 iverilog（同 e2e-sim 机制）
const cache = join(tmpdir(), "wavepaint-ivl-cache");
const exe = join(cache, "bin", "iverilog.exe");
if (!existsSync(exe)) {
  execFileSync("powershell.exe", ["-NoProfile", "-Command",
    `Expand-Archive -Path '${join(root, "ivl.zip")}' -DestinationPath '${cache}' -Force`], { stdio: "ignore" });
}
if (!existsSync(exe)) throw new Error("ivl 解压失败");

const CASES = {
  "嵌套参数": {
    dut: "module m #(parameter DW = 8, parameter AW = DW + 2)(input clk, input [DW-1:0] din, input [AW-1:0] addr, output [AW-1:0] dout);\n  assign dout = addr + din[0];\nendmodule",
    signals: { din: "01010101", addr: "00000000" },
    expect: /dout/
  },
  "$clog2": {
    dut: "module m #(parameter DEPTH = 16)(input clk, input [$clog2(DEPTH)-1:0] sel, output [7:0] q);\n  reg [7:0] q;\n  always @(posedge clk) q <= {q[6:0], sel};\nendmodule",
    signals: { sel: "00110011" },
    expect: /q/
  },
  "sized字面量参数": {
    dut: "module m #(parameter W = 8'd12)(input clk, input [W-1:0] din, output reg [3:0] o);\n  always @(posedge clk) o <= din[3:0];\nendmodule",
    signals: { din: "11001100" },
    expect: /o/
  }
};

const ivlRoot = cache;
let fail = 0;
for (const [name, c] of Object.entries(CASES)) {
  const design = parseVerilogDesign(c.dut);
  const signals = Object.entries(c.signals).map(([n, v]) => ({
    name: n, kind: n === "clk" ? "clock" : "logic", width: 1,
    values: v.split(""), clockCells: v.split("")
  }));
  // clk 单独给时钟
  signals.unshift({ name: "clk", kind: "clock", width: 1, values: "01010101".split(""), clockCells: "01010101".split("") });
  const project = { timeSteps: 8, subSteps: 0, signals, outputs: [] };
  const tb = buildAutoTestbench(design, project);
  if (!tb.ok) { console.log(`✗ ${name}: TB 生成失败 ${tb.error}`); fail++; continue; }
  const work = mkdtempSync(join(tmpdir(), "param-probe-"));
  writeFileSync(join(work, "dut.sv"), c.dut);
  writeFileSync(join(work, "tb.v"), tb.source);
  try {
    execFileSync(join(ivlRoot, "bin", "iverilog.exe"), ["-g2012", "-s", "tb", "-o", "sim.vvp", "tb.v", "dut.sv"], { cwd: work, stdio: "pipe" });
    execFileSync(join(ivlRoot, "bin", "vvp.exe"), ["sim.vvp"], { cwd: work, stdio: "pipe" });
    const vcdOk = existsSync(join(work, "wave_out.vcd"));
    console.log(`${vcdOk ? "✓" : "✗"} ${name}: iverilog 编译+运行成功，VCD ${vcdOk ? "已生成" : "缺失"}`);
    if (!vcdOk) fail++;
  } catch (e) {
    console.log(`✗ ${name}: iverilog 失败\n${String(e.stderr || e.message).slice(0, 300)}`);
    fail++;
  } finally {
    try { rmSync(work, { recursive: true, force: true }); } catch {}
  }
}
console.log(fail ? `失败 ${fail} 项` : "全部通过");
process.exit(fail ? 1 : 0);
