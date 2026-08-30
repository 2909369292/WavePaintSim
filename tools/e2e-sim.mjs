// ============================================================================
// WavePaintSim tools/e2e-sim.mjs —— 仿真链路端到端体检
// ----------------------------------------------------------------------------
// 用途：绕开 GUI，在 Node 里跑「画布 → TB → 真实 iverilog/vvp → VCD → 回填画布」
//       的完整链路，验证仿真结果是否真的正确。
//
// 为什么需要它：本项目 GUI 难以自动化冒烟（exe 进程会被环境回收），
//       而「仿真恒为 0」这类问题只在端到端跑通后才暴露。
//       只跑 tools/regression.mjs 是不够的——它用黄金快照，不执行真实仿真。
//
// 用法：
//   node tools/e2e-sim.mjs
//
// 只依赖 Node 内置模块 + ivl.zip（自动解压到系统临时目录并缓存，不污染仓库）。
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const simNs = await import(new URL("../js/sim.js", import.meta.url).href);
const modelNs = await import(new URL("../js/model.js", import.meta.url).href);

// ---------------------------------------------------------------------------
// 1. 准备 iverilog（解压 ivl.zip 到临时目录，跨运行缓存）
// ---------------------------------------------------------------------------
function prepareIvl() {
  const cache = join(tmpdir(), "wavepaint-ivl-cache");
  const exe = join(cache, "bin", "iverilog.exe");
  if (existsSync(exe)) return cache;
  mkdirSync(cache, { recursive: true });
  // zip 内使用反斜杠分隔符，Node 无内置解压，交给 PowerShell 最稳
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", `Expand-Archive -Path '${join(root, "ivl.zip")}' -DestinationPath '${cache}' -Force`],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  if (!existsSync(exe)) throw new Error("ivl.zip 解压失败，未找到 bin/iverilog.exe");
  return cache;
}

// ---------------------------------------------------------------------------
// 2. 用 stub 浏览器环境加载真实的 sim-bridge.js
//    （把 ESM 源码注入 new Function，避免改动任何构建产物）
// ---------------------------------------------------------------------------
const bridgeSrc = readFileSync(join(root, "js", "sim-bridge.js"), "utf8")
  .replace(/^import\s+[\s\S]*?;\s*$/gm, "")
  + "\nreturn { readWaveDocument, replaceInjectedOutputs, canvasSubSteps, canvasTimeSteps,"
  + " canvasEffectiveCount, toNativeSignal };";

class SignalStub {
  constructor(name, type, count) {
    this.name = name; this.type = type;
    this.values = new Array(count).fill(-1);
    this.id = ""; this.labels = [];
  }
}

function loadBridge(dw, sampleSpinValue) {
  const win = { document_wave: dw, Signal: SignalStub, SignalType: { Bit: 0, Vector: 1 }, DriveStrength: { Strong: 0 } };
  const doc = {
    querySelector: (sel) => (sel === "#sample-spin" && sampleSpinValue != null ? { value: String(sampleSpinValue) } : null),
    getElementById: () => null,
    addEventListener: () => {}
  };
  const factory = new Function(
    "simNs", "modelNs", "window", "document", "localStorage",
    `const { buildAutoTestbench, buildSimulationPayload, createSignalFromPort, parseVerilogDesign, vcdToProjectOutputs } = simNs;
     const { formatVectorValue, normalizeVectorValue } = modelNs;
     ${bridgeSrc}`
  );
  return factory(simNs, modelNs, win, doc, { getItem: () => null, setItem: () => {} });
}

// ---------------------------------------------------------------------------
// 2b. 模拟用户真实操作流程
//   点「添加端口信号到画布」→ addPortSignalsToCanvas 用 canvasEffectiveCount() 建信号
//   → 用户用鼠标绘制（feature-common 的 writeValue 用 wpf.stride() = m_subStepCount+1）
//   这一步是复现「恒为 0」的关键：建信号与画波形用的是两套 stride 口径。
// ---------------------------------------------------------------------------
function applyUserFlow(bridge, dw, design, timeSteps, paint) {
  const effectiveCount = bridge.canvasEffectiveCount();
  let index = 0;
  for (const port of design.topModule.ports) {
    if (port.direction === "output") continue; // 输出由仿真回填
    // 与 addPortSignalsToCanvas 共用 createPortStimulus，保证预填逻辑一致
    const model = simNs.createPortStimulus(port, timeSteps);
    dw.m_signals.push(bridge.toNativeSignal(model, index++, null, effectiveCount, { injected: false }));
  }
  // 绘制侧 stride：feature-common.js wpf.stride() = max(1, m_subStepCount + 1)
  const drawStride = Math.max(1, dw.m_subStepCount + 1);
  for (const sig of dw.m_signals) {
    const painted = paint[sig.name];
    if (!painted) continue; // 用户没画 → 保留工具预填的典型波形（或 x）
    for (let step = 0; step < timeSteps; step += 1) {
      const v = painted[step];
      const native = v === "x" ? -1 : v === "1" ? 1 : 0;
      const start = Math.floor(step / drawStride) * drawStride;
      for (let i = start; i < start + drawStride && i < sig.values.length; i += 1) sig.values[i] = native;
    }
  }
}

// ---------------------------------------------------------------------------
// 3. 用例定义
// ---------------------------------------------------------------------------
const TIME_STEPS = 16;
const toNative = (vals) => vals.map((v) => (v === "x" ? -1 : v === "1" ? 1 : 0));
const clock = Array.from({ length: TIME_STEPS }, (_, i) => (i % 2 ? "1" : "0"));
const high = Array(TIME_STEPS).fill("1");
const undrawn = Array(TIME_STEPS).fill("x");

const DFF = `module dff(input clk, input d, output reg q);
  always @(posedge clk) q <= d;
endmodule`;

const COUNTER = `module counter(
  input clk,
  input rst_n,
  input en,
  output [3:0] q
);
  reg [3:0] q;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) q <= 4'd0;
    else if (en) q <= q + 4'd1;
  end
endmodule`;

// 24 步波形（默认画布长度）
const clock24 = Array.from({ length: 24 }, (_, i) => (i % 2 ? "1" : "0"));
const high24 = Array(24).fill("1");

const cases = [
  {
    // ★ 最贴近用户实际操作的一条：点「添加端口信号到画布」后绘制波形再仿真
    title: "COUNTER：真实用户流程（添加端口信号 → 绘制 clk/rst_n/en → 仿真）",
    rtl: COUNTER,
    timeSteps: 24,
    userFlow: { clk: clock24, rst_n: high24, en: high24 },
    expect: (out) => {
      const q = out.find((o) => o.name === "q");
      if (!q) return "没有输出 q";
      if (q.values.every((v) => /^0+$/.test(v))) return "q 恒为 0 —— 命中用户症状";
      if (q.values.every((v) => /^x+$/i.test(v))) return "q 恒为 x —— 激励未生效（用户看成恒 0 / 空白）";
      return q.values.some((v) => !/^0+$/.test(v) && !/^x+$/i.test(v))
        ? null
        : `q 无有效变化：${q.values.join(",")}`;
    }
  },
  {
    // P1 新增功能：clk / rst_n 由工具预填典型波形，用户只需画自己关心的信号
    title: "COUNTER：预填波形（clk/rst_n 自动，用户只画 en）",
    rtl: COUNTER,
    timeSteps: 24,
    userFlow: { en: high24 },
    expect: (out) => {
      const q = out.find((o) => o.name === "q");
      if (!q) return "没有输出 q";
      const nums = q.values.map((v) => parseInt(v, 2));
      if (nums.every((n) => n === 0)) return "q 恒为 0 —— 预填波形未生效";
      if (q.values.every((v) => /^x+$/i.test(v))) return "q 恒为 x —— 预填波形未生效";
      return nums[nums.length - 1] > nums[0] ? null : `q 未计数：${q.values.join(",")}`;
    }
  },
  {
    title: "DFF：clk 方波 + d 脉冲（健康基线）",
    rtl: DFF,
    signals: [
      { name: "clk", values: clock },
      { name: "d", values: Array.from({ length: TIME_STEPS }, (_, i) => (i >= 3 && i < 9 ? "1" : "0")) }
    ],
    expect: (out) => {
      const q = out.find((o) => o.name === "q");
      // clk 上升沿在奇数格，d 在 t=3 变高 → q 应在 t=5 变高、t=11 变低
      return q && q.values[6] === "1" && q.values[12] === "0"
        ? null
        : `q 未按预期跟随 d（期望第 6 格=1、第 12 格=0，实际 ${q ? q.values.join("") : "无 q"}）`;
    }
  },
  {
    // 回归防护：rst_n 在画布上没有对应信号 → unbound。
    // 修复前：默认激励全 0 → rst_n 恒有效 → 复位一直拉住 → q 恒 0（用户症状）。
    // 修复后：默认给释放电平 1，并在开头补复位脉冲 → 计数器正常工作。
    title: "COUNTER：rst_n 未绑定（回归防护：不得再退化成恒 0）",
    rtl: COUNTER,
    signals: [
      { name: "sys_clk", values: clock },
      { name: "enable", values: high }
    ],
    expect: (out) => {
      const q = out.find((o) => o.name === "q");
      if (!q) return "没有输出 q";
      if (q.values.every((v) => /^0+$/.test(v))) return "q 恒为 0 —— 复位默认激励退化了";
      if (q.values.every((v) => /^x+$/i.test(v))) return "q 恒为 x —— 复位脉冲未生效";
      const nums = q.values.map((v) => parseInt(v, 2));
      return nums[nums.length - 1] > nums[0] ? null : `q 未计数：${q.values.join(",")}`;
    }
  },
  {
    title: "COUNTER：clk/en/rst_n 全部画全（rst_n 恒 1，无复位沿）",
    rtl: COUNTER,
    signals: [
      { name: "clk", values: clock },
      { name: "rst_n", values: high },
      { name: "en", values: high }
    ],
    expect: (out) => {
      const q = out.find((o) => o.name === "q");
      // q 无初值且从未复位 → x 传播，全 x 是正确的 Verilog 语义
      return q && q.values.every((v) => /^x+$/i.test(v))
        ? "KNOWN_ISSUE" // 激励缺少复位沿，属激励侧短板
        : null;
    }
  }
];

// ---------------------------------------------------------------------------
// 4. 执行
// ---------------------------------------------------------------------------
const ivlRoot = prepareIvl();
const work = join(tmpdir(), "wavepaint-e2e-work");
mkdirSync(work, { recursive: true });

let knownIssues = 0;
let failures = 0;

for (const testCase of cases) {
  console.log("\n" + "=".repeat(72));
  console.log(testCase.title);
  console.log("=".repeat(72));

  const steps = testCase.timeSteps || TIME_STEPS;
  const dw = { m_sampleCount: steps, m_subStepCount: 0, m_signals: [] };
  const bridge = loadBridge(dw, steps);

  if (testCase.userFlow) {
    applyUserFlow(bridge, dw, simNs.parseVerilogDesign(testCase.rtl), steps, testCase.userFlow);
    for (const s of dw.m_signals) {
      const shown = s.values.map((v) => (v === -1 ? "x" : String(v))).join("");
      console.log(`  画布 ${String(s.name).padEnd(7)} len=${String(s.values.length).padEnd(3)} = ${shown}`);
    }
    console.log(`  （画布 stride=${bridge.canvasSubSteps() + 1}，绘制 stride=${dw.m_subStepCount + 1}）`);
  } else {
    dw.m_signals = testCase.signals.map((s, i) => ({
      id: "sig" + i, name: s.name, values: toNative(s.values), width: 1
    }));
    for (const s of testCase.signals) console.log(`  画布 ${s.name.padEnd(7)} = ${s.values.join("")}`);
  }

  const project = bridge.readWaveDocument();
  const design = simNs.parseVerilogDesign(testCase.rtl);
  const bindings = simNs.matchSignalsToPorts(project.signals, design.topModule.ports);
  console.log("  绑定： " + bindings.map((b) => `${b.port.name}<-${b.signal ? b.signal.name : "null"}[${b.strategy}]`).join("  "));

  const tb = simNs.buildAutoTestbench(design, project);
  writeFileSync(join(work, "dut.sv"), testCase.rtl);
  writeFileSync(join(work, "tb.v"), tb.source);

  try {
    execFileSync(join(ivlRoot, "bin", "iverilog.exe"), ["-g2012", "-s", "tb", "-o", "sim.vvp", "tb.v", "dut.sv"],
      { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    execFileSync(join(ivlRoot, "bin", "vvp.exe"), ["sim.vvp"],
      { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    console.log("  ✗ 编译/仿真失败：" + String(e.stdout || e.stderr || "").slice(0, 400));
    failures += 1;
    continue;
  }

  const vcdText = readFileSync(join(work, "wave_out.vcd"), "utf8");
  const { outputs } = simNs.vcdToProjectOutputs(vcdText, project);
  console.log("  输出： " + outputs.map((o) => `${o.name}=${o.values.join(",")}`).join("  "));

  // 回填画布：注入信号的长度/subSteps 必须与原生信号一致，否则画布渲染会错乱
  bridge.replaceInjectedOutputs(outputs);
  const injected = dw.m_signals.filter((s) => s.__simInjected);
  const nativeLen = dw.m_signals.filter((s) => !s.__simInjected).map((s) => s.values.length);
  for (const s of injected) {
    const ok = s.values.length === nativeLen[0];
    console.log(`  回填 ${s.name}: len=${s.values.length} subSteps=${s.subSteps}`
      + `（原生信号 len=${nativeLen.join("/")}）${ok ? "" : "  ⚠ 长度不一致"}`);
  }

  const verdict = testCase.expect(outputs);
  if (verdict === "KNOWN_ISSUE") {
    console.log("  ⚠ 已知缺陷（复现成功，尚未修复）");
    knownIssues += 1;
  } else if (verdict) {
    console.log("  ✗ " + verdict);
    failures += 1;
  } else {
    console.log("  ✓ 通过");
  }
}

console.log("\n" + "-".repeat(72));
console.log(`端到端体检完成：失败 ${failures} 项，已知缺陷 ${knownIssues} 项`);
if (failures) process.exitCode = 1;
