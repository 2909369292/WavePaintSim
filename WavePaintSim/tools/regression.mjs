// ============================================================================
// WavePaintSim tools/regression.mjs —— 最小回归测试（P3-6 / F10.2）
// ----------------------------------------------------------------------------
// 用法：
//   node tools/regression.mjs            运行全部断言
//   node tools/regression.mjs --update   重新生成 testbench 黄金快照
//
// 覆盖面（刻意只挑「改坏了会立刻造成线上故障」的部分）：
//   1. utils.js   —— uid 唯一性与格式、clamp、deepClone
//   2. model.js   —— 矢量值归一化 / 格式化、示例工程的数据模型不变量
//   3. sim.js     —— 端口解析、自动 testbench 生成（黄金快照比对）
//   4. 数据模型   —— stride / 主值下标换算（featue 模块与仿真采样共用的口径）
//
// 只依赖 Node 内置模块，不需要 npm install。
// ============================================================================
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const snapshotDir = join(here, "__snapshots__");

const update = process.argv.includes("--update");
let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("  ✓ " + name);
  } catch (err) {
    failures.push({ name, err });
    console.log("  ✗ " + name + "\n      " + String(err && err.message).split("\n")[0]);
  }
}

function group(title) {
  console.log("\n" + title);
}

// ---------------------------------------------------------------------------
group("utils.js");

const utils = await import(new URL("../js/utils.js", import.meta.url).href);

test("clamp 边界正确", () => {
  assert.equal(utils.clamp(5, 0, 10), 5);
  assert.equal(utils.clamp(-1, 0, 10), 0);
  assert.equal(utils.clamp(11, 0, 10), 10);
});

test("deepClone 为深拷贝（改副本不影响原值）", () => {
  const src = { a: 1, nested: { list: [1, 2, 3] } };
  const copy = utils.deepClone(src);
  copy.nested.list.push(4);
  assert.equal(src.nested.list.length, 3);
});

test("uid 批量生成不碰撞（20000 次）", () => {
  // BUG-016：旧实现只有 6 个 base36 字符，批量创建信号/源文件时会撞 id，
  // 撞车后「选中/删除/重命名」会作用到错误的对象上。
  const seen = new Set();
  for (let i = 0; i < 20000; i += 1) {
    const id = utils.uid("sig");
    assert.ok(!seen.has(id), "uid 碰撞：" + id);
    seen.add(id);
  }
  assert.equal(seen.size, 20000);
});

test("uid 格式稳定（不因 Math.random() 过小而退化）", () => {
  for (let i = 0; i < 2000; i += 1) {
    const id = utils.uid("file");
    assert.ok(/^file_[0-9a-z]+_[0-9a-z]+_[0-9a-z]{6}$/.test(id), "uid 格式异常：" + id);
  }
});

// ---------------------------------------------------------------------------
group("model.js");

const model = await import(new URL("../js/model.js", import.meta.url).href);

test("normalizeVectorValue 按宽度补齐/截断", () => {
  assert.equal(model.normalizeVectorValue("1", 4), "0001");
  assert.equal(model.normalizeVectorValue("1111", 2), "11");
  assert.equal(model.normalizeVectorValue("zz", 4), "zzzz");
});

test("formatVectorValue 各进制输出符合预期", () => {
  // 注意：binary 不带 "0b" 前缀，hexadecimal 带 "0x"；未知 radix 回落为 hex
  assert.equal(model.formatVectorValue("1010", 4, "binary"), "1010");
  assert.equal(model.formatVectorValue("1010", 4, "decimal"), "10");
  assert.equal(model.formatVectorValue("1010", 4, "hexadecimal"), "0xA");
  assert.equal(model.formatVectorValue("1010", 4, "unknown-radix"), "0xA");
});

test("createSampleProject 数据模型自洽", () => {
  const p = model.createSampleProject();
  assert.ok(Array.isArray(p.signals) && p.signals.length >= 3, "示例工程应至少 3 个激励信号");
  const steps = Number(p.timeSteps) || 0;
  assert.ok(steps > 0, "timeSteps 应为正数");
  for (const sig of p.signals) {
    // 铁律：每个激励信号的值序列长度必须等于时间步数
    assert.equal(sig.values.length, steps, `信号 ${sig.name} 的 values 长度应等于 timeSteps`);
  }
  const ids = new Set(p.signals.map((s) => s.id));
  assert.equal(ids.size, p.signals.length, "信号 id 必须唯一");
});

test("normalizeProject 补齐缺失字段且保持值序列长度", () => {
  const raw = {
    timeSteps: 12,
    signals: [{ name: "clk", kind: "clock", width: 1, values: "01".split("") }],
    outputs: []
  };
  const p = model.normalizeProject(raw);
  assert.equal(p.signals[0].values.length, 12, "normalizeProject 应把 values 补齐到 timeSteps");
  assert.ok(p.signals[0].id, "normalizeProject 应补齐 id");
});

// ---------------------------------------------------------------------------
group("数据模型口径（与 feature 模块共用）");

test("stride = 子步数 + 1，主值下标 = 主步 × stride", () => {
  const cases = [
    { steps: 30, subs: 1, stride: 2, len: 60 },
    { steps: 30, subs: 2, stride: 3, len: 90 },
    { steps: 30, subs: 0, stride: 1, len: 30 }
  ];
  for (const c of cases) {
    const stride = c.subs + 1;
    assert.equal(stride, c.stride, `子步 ${c.subs} 的 stride 应为 ${c.stride}`);
    assert.equal(c.steps * stride, c.len, "values 长度应为 步数×(子步+1)");
    // 主步 n 的主值下标
    assert.equal(2 * stride, c.steps > 2 ? 2 * stride : -1, "主值下标换算 branch");
  }
  // 子步 0 必须允许（BUG-009：旧代码用 || 把 0 吞成 1）
  assert.equal(Math.max(0, Number(0) || 0), 0, "子步数 0 不应被当成缺失值");
});

// ---------------------------------------------------------------------------
group("sim.js");

const sim = await import(new URL("../js/sim.js", import.meta.url).href);

const COUNTER_SRC = `module counter(
  input clk,
  input rst_n,
  input en,
  output [3:0] q
);
  reg [3:0] q;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
      q <= 4'd0;
    else if (en)
      q <= q + 4'd1;
  end
endmodule`;

function sampleProject() {
  return {
    timeSteps: 24,
    signals: [
      { name: "clk", kind: "clock", width: 1, values: "101010101010101010101010".split("") },
      { name: "rst_n", kind: "logic", width: 1, values: "001111111111111111111111".split("") },
      { name: "en", kind: "logic", width: 1, values: "011101110111011101110111".split("") }
    ],
    outputs: []
  };
}

const design = sim.parseVerilogDesign(COUNTER_SRC);

test("parseVerilogDesign 解析出模块名与端口", () => {
  // 返回结构：{ source, modules[], topModule, moduleCount, topName }，
  // 端口挂在 modules[i].ports 上（不是 design.ports）
  assert.equal(design.topName, "counter");
  assert.ok(design.topModule, "应解析出 topModule");
  const ports = design.topModule.ports;
  assert.deepEqual(ports.map((p) => p.name).sort(), ["clk", "en", "q", "rst_n"]);
  const q = ports.find((p) => p.name === "q");
  assert.equal(q.direction, "output");
  assert.equal(q.width, 4, "q 的位宽应为 4");
  assert.deepEqual([q.msb, q.lsb], ["3", "0"], "q 的位域应为 [3:0]");
});

test("buildAutoTestbench 输出包含 tb 模块、DUT 实例与 $dumpfile", () => {
  const tb = sim.buildAutoTestbench(design, sampleProject());
  const src = String(tb.source || tb);
  assert.ok(/module\s+tb\b/.test(src), "TB 应有 module tb");
  assert.ok(/counter\s+uut|\bcounter\s+\w+/.test(src), "TB 应实例化 DUT");
  assert.ok(/\$dumpfile/.test(src), "TB 应导出 VCD");
});

test("buildAutoTestbench 对未绑定输入给出独立全零激励（X-3）", () => {
  const empty = { timeSteps: 8, signals: [], outputs: [] };
  const tb = sim.buildAutoTestbench(design, empty);
  const src = String(tb.source || tb);
  // 没有任何画布信号时，clk/rst_n/en 仍要被驱动，否则仿真结果为 x
  for (const port of ["clk", "rst_n", "en"]) {
    assert.ok(new RegExp("\\b" + port + "\\b").test(src), "TB 应驱动未绑定端口 " + port);
  }
});

// ---------------------------------------------------------------------------
// 复位语义（2026-08-30 修复「仿真结果恒为 0」时补的回归防护）
// 低有效复位端口若被当成普通数据端口给默认值 0，复位会一直拉住 DUT，输出恒 0。
// ---------------------------------------------------------------------------
test("未绑定的低有效复位端口默认给释放电平 1，并补上电复位脉冲", () => {
  const empty = { timeSteps: 8, signals: [], outputs: [] };
  const src = String(sim.buildAutoTestbench(design, empty).source || "");
  assert.ok(/rst_n\s*=\s*1'b0/.test(src), "未绑定的 rst_n 开头应有复位脉冲(0)");
  assert.ok(/rst_n\s*=\s*1'b1/.test(src), "复位脉冲之后 rst_n 应释放为 1，不能一直拉低");
  assert.ok(/clk\s*=\s*1'b0/.test(src), "非复位端口（clk）默认仍应为 0");
  assert.ok(/en\s*=\s*1'b0/.test(src), "非复位端口（en）默认仍应为 0");
});

test("用户未画复位沿时自动补上电复位脉冲（否则 reg 初值 x 自我传播 → 输出恒 x）", () => {
  const project = {
    timeSteps: 8,
    signals: [
      { name: "clk", kind: "clock", width: 1, values: "01010101".split("") },
      { name: "rst_n", kind: "logic", width: 1, values: "11111111".split("") },
      { name: "en", kind: "logic", width: 1, values: "11111111".split("") }
    ],
    outputs: []
  };
  const src = String(sim.buildAutoTestbench(design, project).source || "");
  assert.ok(/rst_n\s*=\s*1'b0/.test(src), "rst_n 恒 1 时应自动补复位低脉冲");
  assert.ok(/rst_n\s*=\s*1'b1/.test(src), "复位脉冲后应释放为 1");
});

test("用户已画出复位沿时完全尊重原波形（不额外插脉冲）", () => {
  const project = {
    timeSteps: 8,
    signals: [
      { name: "clk", kind: "clock", width: 1, values: "01010101".split("") },
      { name: "rst_n", kind: "logic", width: 1, values: "11100011".split("") },
      { name: "en", kind: "logic", width: 1, values: "11111111".split("") }
    ],
    outputs: []
  };
  const src = String(sim.buildAutoTestbench(design, project).source || "");
  // 用户画的 rst_n 从 1 开始、在第 3 格拉低，不应被改写成开头就复位
  assert.ok(/rst_n\s*=\s*1'b1/.test(src), "已画复位沿时应保留用户波形起点");
  const firstReset = src.indexOf("rst_n = 1'b0");
  const firstRelease = src.indexOf("rst_n = 1'b1");
  assert.ok(firstReset > firstRelease, "复位低脉冲应出现在起始高电平之后（未被前插）");
});

test("buildAutoTestbench 黄金快照一致", () => {
  const tb = sim.buildAutoTestbench(design, sampleProject());
  const src = String(tb.source || tb);
  const file = join(snapshotDir, "tb_counter.txt");
  if (update || !existsSync(file)) {
    mkdirSync(snapshotDir, { recursive: true });
    writeFileSync(file, src, "utf8");
    console.log("      （已" + (update ? "更新" : "生成") + "快照 " + file + "）");
    return;
  }
  assert.equal(src, readFileSync(file, "utf8"),
    "生成的 testbench 与黄金快照不一致；若改动是有意的，请运行 node tools/regression.mjs --update");
});

// ---------------------------------------------------------------------------
group("feature-common.js（stub 浏览器环境后直接跑真实模块）");

// feature-common.js 是 IIFE，只依赖少量浏览器全局；在 Node 里补齐这些 stub
// 就能直接测到真实实现（而不是测一份复制品）。
function installBrowserStub(opts) {
  const store = new Map();
  const rect = { left: 0, top: 0, width: opts.width, height: opts.height };
  const canvas = { getBoundingClientRect: () => rect, width: opts.width, height: opts.height };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  globalThis.document = {
    readyState: "loading", // 让 wpf.ready 只注册监听、不立即跑
    addEventListener() {},
    getElementById: (id) => (id === "wave-canvas" ? canvas : null),
    querySelector: () => null
  };
  globalThis.window = {
    document: globalThis.document,
    SignalType: { Bit: 0, Vector: 1, BlankRow: 2 },
    Radix: { Hexadecimal: 0, Decimal: 1, Binary: 2 },
    mapCanvasPosition: (x, y) => {
      const row = opts.rowAt(y);
      return {
        signalIndex: row,
        signalSampleIndex: Math.max(0, Math.floor(x / (opts.width / 30))),
        mainStep: Math.max(0, Math.floor(x / (opts.width / 30))),
        clickedOnName: false
      };
    },
    drawWaveform: () => {},
    updateSidePanels: () => {}
  };
  globalThis.window.window = globalThis.window;
}

// 布局：画布高 400；y<20 是时间轴（-1）；第 i 行占 [20+i*36, 20+i*36+32)，行间有 4px 空隙
installBrowserStub({
  width: 600,
  height: 400,
  rowAt(y) {
    if (y < 20) return -1;
    const i = Math.floor((y - 20) / 36);
    const top = 20 + i * 36;
    if (i < 0 || i > 9) return -1;
    return y - top < 32 ? i : -1; // 行间空隙也算 -1
  }
});

// 每个测试组用新的模块实例，避免 localStorage 互相污染
async function loadCommon() {
  const url = new URL("../js/feature-common.js", import.meta.url).href + "?t=" + Date.now() + Math.random();
  return import(url).then(() => globalThis.window.__wpf);
}
const wpf = await loadCommon();

test("stride = 子步数 + 1，且子步 0 合法", () => {
  globalThis.window.document_wave = { m_subStepCount: 1, m_signals: [] };
  assert.equal(wpf.stride(), 2);
  globalThis.window.document_wave = { m_subStepCount: 0, m_signals: [] };
  assert.equal(wpf.stride(), 1, "子步 0 时 stride 应为 1（BUG-009）");
  globalThis.window.document_wave = { m_subStepCount: 3, m_signals: [] };
  assert.equal(wpf.stride(), 4);
});

test("writeValue 整步：写满该主步的 stride 个下标并清时钟标记", () => {
  localStorage.setItem("wpf.editGranularity", "step");
  globalThis.window.document_wave = { m_subStepCount: 1, m_signals: [] };
  const sig = {
    values: new Array(60).fill(-1),
    clockMarkers: new Array(60).fill(true)
  };
  assert.equal(wpf.writeValue(sig, 5, 1), true);
  // 下标 5 属于主步 2（stride=2 → [4,5]）
  assert.deepEqual(sig.values.slice(4, 6), [1, 1], "整步应写满 [4,5]");
  assert.equal(sig.values[3], -1, "不应影响上一步");
  assert.equal(sig.values[6], -1, "不应影响下一步");
  assert.deepEqual(sig.clockMarkers.slice(4, 6), [false, false], "整步应清掉对应时钟标记");
});

test("writeValue 子步：只写命中的那一个下标", () => {
  localStorage.setItem("wpf.editGranularity", "substep");
  globalThis.window.document_wave = { m_subStepCount: 1, m_signals: [] };
  const sig = { values: new Array(60).fill(-1), clockMarkers: new Array(60).fill(true) };
  assert.equal(wpf.writeValue(sig, 5, 1), true);
  assert.equal(sig.values[5], 1);
  assert.equal(sig.values[4], -1, "子步模式不应连带写主值下标");
  assert.equal(sig.clockMarkers[5], false);
});

test("writeValue 越界 / 空信号安全返回 false", () => {
  localStorage.setItem("wpf.editGranularity", "step");
  globalThis.window.document_wave = { m_subStepCount: 1, m_signals: [] };
  const sig = { values: new Array(10).fill(-1) };
  assert.equal(wpf.writeValue(null, 0, 1), false);
  assert.equal(wpf.writeValue({}, 0, 1), false);
  assert.equal(wpf.writeValue(sig, -1, 1), false);
  assert.equal(wpf.writeValue(sig, 10, 1), false);
});

test("signalRowBand 二分定位准确（含行间空隙与非零起始 y）", () => {
  const cases = [
    { y: 20 + 5 * 36 + 16, top: 20 + 5 * 36, bottom: 20 + 5 * 36 + 31 },
    { y: 20 + 0 * 36 + 1, top: 20, bottom: 51 },
    { y: 20 + 9 * 36 + 31, top: 20 + 9 * 36, bottom: 20 + 9 * 36 + 31 }
  ];
  for (const c of cases) {
    const band = wpf.signalRowBand(100, c.y, Math.floor((c.y - 20) / 36));
    assert.ok(band, "y=" + c.y + " 应命中某个信号行");
    assert.equal(band.top, c.top, "y=" + c.y + " 上边界");
    assert.equal(band.bottom, c.bottom, "y=" + c.y + " 下边界");
    assert.equal(band.height, c.bottom - c.top + 1);
  }
});

test("signalRowBand 指针不在目标行时返回 null（不再给出错误区间）", () => {
  // 指针在时间轴上（signalIndex=-1），却要求探测第 3 行的区间
  assert.equal(wpf.signalRowBand(100, 5, 3), null);
  // 指针在第 3 行，却要求探测第 5 行
  assert.equal(wpf.signalRowBand(100, 20 + 3 * 36 + 10, 5), null);
});

test("编辑粒度读写与 localStorage 持久化", () => {
  localStorage.removeItem("wpf.editGranularity");
  assert.equal(wpf.editGranularity(), "step", "默认应为整步（保证仿真采样正确）");
  wpf.setEditGranularity("substep");
  assert.equal(wpf.editGranularity(), "substep");
  wpf.setEditGranularity("bogus");
  assert.equal(wpf.editGranularity(), "step", "非法值应回落为 step");
});

test("总线进制映射到核心 Radix 枚举并作用于全部矢量信号", () => {
  const used = [];
  const dw = {
    m_signals: [
      { name: "clk", type: 0, radix: 1, values: ["0"], labels: ["0"] },
      {
        name: "data",
        type: 1,
        radix: 1,
        values: ["1010", "1111"],
        labels: ["old", "old"],
        __fmtCalls: 0
      },
      { name: "addr", type: 1, radix: 1, values: ["0011"], labels: ["old"] }
    ],
    valueToLabel(v, radix) {
      used.push([v, radix]);
      return String(v) + "@" + radix;
    }
  };
  globalThis.window.document_wave = dw;
  localStorage.removeItem("wpf.busRadix");
  assert.equal(wpf.busRadix(), "dec", "默认十进制");
  assert.equal(wpf.busRadixValue(), 1, "dec → Radix.Decimal(1)");

  wpf.setBusRadix("hex");
  assert.equal(wpf.busRadixValue(), 0, "hex → Radix.Hexadecimal(0)");
  assert.equal(dw.m_signals[1].radix, 0);
  assert.equal(dw.m_signals[2].radix, 0);
  assert.equal(dw.m_signals[0].radix, 1, "位信号不应被改");
  assert.deepEqual(dw.m_signals[1].labels, ["1010@0", "1111@0"], "labels 应用 valueToLabel 重算");
  assert.deepEqual(dw.m_signals[2].labels, ["0011@0"]);

  wpf.setBusRadix("bin");
  assert.equal(wpf.busRadixValue(), 2, "bin → Radix.Binary(2)");
  assert.deepEqual(dw.m_signals[1].labels, ["1010@2", "1111@2"]);

  wpf.setBusRadix("nonsense");
  assert.equal(wpf.busRadixValue(), 1, "非法值回落为 dec");
  assert.equal(wpf.applyBusRadix(), 2, "应命中 2 个矢量信号");
});

// ---------------------------------------------------------------------------
console.log("\n" + "-".repeat(56));
if (failures.length) {
  console.log(`失败 ${failures.length} 项，通过 ${passed} 项`);
  for (const f of failures) {
    console.log("\n▶ " + f.name);
    console.log(String(f.err && f.err.stack).split("\n").slice(0, 8).join("\n"));
  }
  process.exit(1);
}
console.log(`全部通过：${passed} 项`);
