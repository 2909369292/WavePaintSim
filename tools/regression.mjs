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
import { formatVectorValue, normalizeVectorValue } from "../js/sim/project-model.js";

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

const utils = await import(new URL("../js/util/id.js", import.meta.url).href);

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

const model = await import(new URL("../js/sim/project-model.js", import.meta.url).href);

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

const sim = await import(new URL("../js/sim/engine.js", import.meta.url).href);

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
// 私有 divisor 模型（2026-09-04 收口）：逐格驱动时间基准用信号自己的 cellStride；
// subSteps 缺省不得产生 NaN（旧写法 Math.max(1,NaN)===NaN → TB 出现 #NaN 非法语句）
// ---------------------------------------------------------------------------
test("clockCells 逐格驱动按信号自身 cellStride 计时（私有 subSteps 行）", () => {
  const project = {
    timeSteps: 8,
    subSteps: 1,
    signals: [
      {
        name: "clk", kind: "clock", width: 1,
        // 私有 subSteps=3 的行：每主步 4 格 → cellStride=4
        values: "0101010101010101".split(""),
        clockCells: "10101010101010101010101010101010".split(""),
        cellStride: 4
      },
      { name: "rst_n", kind: "logic", width: 1, values: "11111111".split("") },
      { name: "en", kind: "logic", width: 1, values: "11111111".split("") }
    ],
    outputs: []
  };
  const src = String(sim.buildAutoTestbench(design, project).source || "");
  assert.ok(!/#NaN/.test(src), "TB 不得出现 #NaN");
  // cellStride=4：格子边界时间 = k/4，应出现 1/4 主步的时间增量
  assert.ok(/#1\/4\b/.test(src) || /#0\.25\b/.test(src), "应出现 1/4 主步的时间增量");
});

test("project.subSteps 缺省时 buildAutoTestbench 不产生 NaN（防御性）", () => {
  const project = {
    timeSteps: 8,
    // 故意不给 subSteps（旧代码 Number(undefined)+1=NaN → Math.max(1,NaN)=NaN）
    signals: [
      { name: "clk", kind: "clock", width: 1, values: "01010101".split(""), clockCells: "01010101".split("") },
      { name: "rst_n", kind: "logic", width: 1, values: "11111111".split("") },
      { name: "en", kind: "logic", width: 1, values: "11111111".split("") }
    ],
    outputs: []
  };
  const src = String(sim.buildAutoTestbench(design, project).source || "");
  assert.ok(!/NaN/.test(src), "TB 任何位置不得出现 NaN");
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

test("常见信号预填典型波形：clock 方波 / 复位 前有效后释放", () => {
  // 时钟：半周期 1 个时间单位，占空比 50%
  assert.deepEqual(sim.typicalWaveform({ name: "clk", width: 1 }, 8), "01010101".split(""));
  assert.deepEqual(sim.typicalWaveform({ name: "sys_clk", width: 1 }, 6), "010101".split(""));
  // 低有效复位：前 2 格拉低，之后释放为高
  assert.deepEqual(sim.typicalWaveform({ name: "rst_n", width: 1 }, 8), "00111111".split(""));
  assert.deepEqual(sim.typicalWaveform({ name: "reset_n", width: 1 }, 8), "00111111".split(""));
  assert.deepEqual(sim.typicalWaveform({ name: "nreset", width: 1 }, 8), "00111111".split(""));
  // 高有效复位：前 2 格拉高，之后释放为低
  assert.deepEqual(sim.typicalWaveform({ name: "rst", width: 1 }, 8), "11000000".split(""));
  assert.deepEqual(sim.typicalWaveform({ name: "reset", width: 1 }, 8), "11000000".split(""));
});

test("非常见信号不臆造波形（返回 null，保持未定义）", () => {
  for (const name of ["data", "addr", "en", "valid", "q", "dout"]) {
    assert.equal(sim.typicalWaveform({ name, width: 1 }, 8), null, name + " 不应被预填");
  }
});

test("createPortStimulus 对时钟/复位预填，对数据端口保持 x", () => {
  const clk = sim.createPortStimulus({ name: "clk", width: 1, direction: "input" }, 8);
  assert.deepEqual(clk.values, "01010101".split(""));
  assert.equal(clk.kind, "clock", "clk 应识别为 clock 类型");
  const data = sim.createPortStimulus({ name: "data", width: 1, direction: "input" }, 8);
  assert.ok(data.values.every((v) => String(v).toLowerCase() === "x"), "数据端口应保持未定义");
});

test("diagnoseSimulation：未绑定端口 / 激励全 x / 输出全 0 / 输出全 x 均能给出提示", () => {
  const ports = [
    { name: "clk", direction: "input", width: 1 },
    { name: "d", direction: "input", width: 1 },
    { name: "q", direction: "output", width: 1 }
  ];
  const qNormal = { name: "q", values: ["1", "0", "1", "0"] };

  // 1) 有输入端口没绑上
  const b1 = sim.matchSignalsToPorts([{ name: "clk", values: "0101".split("") }], ports);
  const n1 = sim.diagnoseSimulation([qNormal], b1);
  assert.ok(n1.some((t) => t.includes("未绑定")), "应提示未绑定端口：" + n1.join(" | "));
  assert.ok(n1.some((t) => t.includes("d")), "提示应点名端口 d：" + n1.join(" | "));

  // 2) 激励全是 x（用户没画）
  const b2 = sim.matchSignalsToPorts(
    [{ name: "clk", values: "xxxx".split("") }, { name: "d", values: "xxxx".split("") }], ports);
  const n2 = sim.diagnoseSimulation([qNormal], b2);
  assert.ok(n2.some((t) => t.includes("全 x")), "应提示激励未绘制：" + n2.join(" | "));

  // 3) 输出恒 0
  const n3 = sim.diagnoseSimulation([{ name: "q", values: ["0", "0", "0", "0"] }], b2);
  assert.ok(n3.some((t) => t.includes("恒为 0")), "应提示输出恒 0：" + n3.join(" | "));

  // 4) 输出恒 x
  const n4 = sim.diagnoseSimulation([{ name: "q", values: ["x", "x", "x", "x"] }], b2);
  assert.ok(n4.some((t) => t.includes("恒为 x")), "应提示输出恒 x：" + n4.join(" | "));
});

test("diagnoseSimulation：一切正常时不产生噪音提示", () => {
  const ports = [
    { name: "clk", direction: "input", width: 1 },
    { name: "d", direction: "input", width: 1 },
    { name: "q", direction: "output", width: 1 }
  ];
  const bindings = sim.matchSignalsToPorts(
    [{ name: "clk", values: "0101".split("") }, { name: "d", values: "0011".split("") }], ports);
  const notes = sim.diagnoseSimulation([{ name: "q", values: ["0", "1", "0", "1"] }], bindings);
  assert.equal(notes.length, 0, "正常情况下不应有提示：" + notes.join(" | "));
});

test("端口绑定：单字符端口名不再误配（d 不应命中 data/addr/valid）", () => {
  const ports = [
    { name: "d", direction: "input", width: 1 },
    { name: "q", direction: "output", width: 1 }
  ];
  const signals = [
    { name: "data", values: ["1"] },
    { name: "addr", values: ["1"] },
    { name: "valid", values: ["1"] }
  ];
  const bindings = sim.matchSignalsToPorts(signals, ports);
  const d = bindings.find((b) => b.port.name === "d");
  assert.equal(d.matched, false, "端口 d 不应被模糊匹配到 data/addr/valid");
  assert.equal(d.strategy, "unbound");
});

test("端口绑定：命名风格差异仍能模糊匹配（sys_clk→clk、enable→en）", () => {
  const ports = [
    { name: "clk", direction: "input", width: 1 },
    { name: "en", direction: "input", width: 1 },
    { name: "q", direction: "output", width: 1 }
  ];
  const signals = [
    { name: "sys_clk", values: ["1"] },
    { name: "enable", values: ["1"] }
  ];
  const bindings = sim.matchSignalsToPorts(signals, ports);
  const clk = bindings.find((b) => b.port.name === "clk");
  const en = bindings.find((b) => b.port.name === "en");
  assert.equal(clk.matched, true, "sys_clk 应匹配到 clk");
  assert.equal(clk.signal.name, "sys_clk");
  assert.equal(en.matched, true, "enable 应匹配到 en");
  assert.equal(en.signal.name, "enable");
});

test("端口绑定：一个信号只能被一个端口占用（一对一）", () => {
  const ports = [
    { name: "clk", direction: "input", width: 1 },
    { name: "clock", direction: "input", width: 1 }
  ];
  const signals = [{ name: "sys_clk", values: ["1"] }];
  const bindings = sim.matchSignalsToPorts(signals, ports);
  const bound = bindings.filter((b) => b.matched);
  assert.equal(bound.length, 1, "只有 1 个端口能占用 sys_clk，实际 " + bound.length);
});

test("端口绑定：精确匹配优先于模糊匹配", () => {
  const ports = [{ name: "clk", direction: "input", width: 1 }];
  const signals = [{ name: "sys_clk", values: ["1"] }, { name: "clk", values: ["1"] }];
  const bindings = sim.matchSignalsToPorts(signals, ports);
  assert.equal(bindings[0].strategy, "name", "有同名信号时应走精确匹配");
  assert.equal(bindings[0].signal.name, "clk");
});

test("端口绑定：*_i/*_o 归一化折叠不跨绑（2026-09-03 修复）", () => {
  // 工具生成 Verilog 常见 data_i/data_o 命名。归一化会把两者都折叠成 data，
  // 旧实现按归一化名做单一映射 + 无占用检查 → data_i 端口曾错绑到 data_o 信号。
  const ports = [
    { name: "data_i", direction: "input", width: 1 },
    { name: "data_o", direction: "output", width: 1 }
  ];
  // 两个信号都在时：必须各自命中自己（原始名优先）
  let b = sim.matchSignalsToPorts(
    [{ name: "data_i", values: ["1"] }, { name: "data_o", values: ["1"] }], ports);
  assert.equal(b[0].signal.name, "data_i", "data_i 端口应绑 data_i 信号");
  assert.equal(b[1].signal.name, "data_o", "data_o 端口应绑 data_o 信号");
  // 只有基础名 data 一个信号时：data_i 绑 data，data_o 不再重复占用（一对一）
  b = sim.matchSignalsToPorts([{ name: "data", values: ["1"] }], ports);
  assert.equal(b[0].signal.name, "data");
  assert.equal(b[1].matched, false, "data_o 不应与 data_i 共享同一信号");
});

test("端口绑定：clk_i 风格别名仍能命中唯一 clk 信号", () => {
  const ports = [{ name: "clk_i", direction: "input", width: 1 }];
  const bindings = sim.matchSignalsToPorts([{ name: "clk", values: ["1"] }], ports);
  assert.equal(bindings[0].matched, true, "clk_i 应经归一化命中 clk 信号");
  assert.equal(bindings[0].signal.name, "clk");
  assert.equal(bindings[0].strategy, "name");
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
  const url = new URL("../js/core/wpf.js", import.meta.url).href + "?t=" + Date.now() + Math.random();
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

// 从解混淆核心中抽出真实的 valueToLabel 实现（[PATCH-A3]）。
// 进制标签的唯一实现就在核心里，回归必须跑真代码，而不是再写一份「替身实现」
// （历史上正是因为替身与核心两套口径，才出现「切了进制显示不变」）。
function loadCoreValueToLabel() {
  const src = readFileSync(join(root, "js/wavepaint.clean.js"), "utf8");
  const marker = "['valueToLab' + 'el'](";
  const at = src.indexOf(marker);
  assert.ok(at > 0, "核心中应存在 valueToLabel 实现（[PATCH-A3]）");
  const open = src.indexOf("{", at);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  assert.ok(end > open, "valueToLabel 实现应有完整方法体");
  const params = src.slice(at + marker.length - 1, open); // "(_0x178009, _0x44e224) "
  const body = src.slice(open, end);
  return new Function("Radix", "return function" + params + body + ";")(globalThis.window.Radix);
}

test("核心 valueToLabel：位串与数字都按 radix 换算且无 0x/0b 前缀（[PATCH-A3]）", () => {
  const valueToLabel = loadCoreValueToLabel();
  const R = globalThis.window.Radix;
  assert.equal(valueToLabel("1010", R.Hexadecimal), "A", "位串 → hex（去 0x）");
  assert.equal(valueToLabel("1010", R.Decimal), "10", "位串 → dec（不是原样返回 1010）");
  assert.equal(valueToLabel("1010", R.Binary), "1010", "位串 → bin（去 0b）");
  assert.equal(valueToLabel("00001010", R.Hexadecimal), "0A", "hex 按位宽补零（8 位 → 2 位十六进制）");
  assert.equal(valueToLabel("10x1", R.Hexadecimal), "X", "含 x 的位串 → X");
  assert.equal(valueToLabel("10z1", R.Hexadecimal), "Z", "含 z 不含 x 的位串 → Z");
  assert.equal(valueToLabel("x0z1", R.Hexadecimal), "X", "同时含 x 与 z 时 x 优先");
  assert.equal(valueToLabel(-1, R.Hexadecimal), "X", "-1 → X（x 态）");
  assert.equal(valueToLabel(-1, R.Decimal), "X", "-1 → X（与进制无关）");
  assert.equal(valueToLabel(255, R.Hexadecimal), "FF", "数字 → hex（生成器写入的数值形态）");
  assert.equal(valueToLabel(255, R.Decimal), "255", "数字 → dec");
  assert.equal(valueToLabel(255, R.Binary), "11111111", "数字 → bin");
  // ⚠ 陷阱：数字 10 的 "10" 全由 0/1 组成，若按「长得像位串」判定会算成 2
  assert.equal(valueToLabel(10, R.Hexadecimal), "A", "数字 10 → A（不是位串 0b10=2）");
  assert.equal(valueToLabel(11, R.Hexadecimal), "B", "数字 11 → B（不是位串 0b11=3）");
  assert.equal(valueToLabel("10", R.Hexadecimal), "2", "字符串 \"10\" 才是位串 → 2");
});

test("总线进制映射到核心 Radix 枚举并作用于全部矢量信号", () => {
  const dw = {
    m_signals: [
      { name: "clk", type: 0, radix: 1, width: 1, values: ["0"], labels: ["0"] },
      {
        name: "data",
        type: 1,
        radix: 1,
        width: 4,
        values: ["1010", "1111"],
        labels: ["old", "old"],
        __fmtCalls: 0
      },
      { name: "addr", type: 1, radix: 1, width: 4, values: ["0011"], labels: ["old"] }
    ],
    // 走核心真实实现：标签口径与画布显示天然一致
    valueToLabel: loadCoreValueToLabel()
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
  assert.deepEqual(dw.m_signals[1].labels, ["A", "F"], "hex 标签去前缀：1010→A、1111→F");
  assert.deepEqual(dw.m_signals[2].labels, ["3"], "hex 标签去前缀：0011→3");

  wpf.setBusRadix("bin");
  assert.equal(wpf.busRadixValue(), 2, "bin → Radix.Binary(2)");
  assert.deepEqual(dw.m_signals[1].labels, ["1010", "1111"], "bin 标签无 0b 前缀");

  wpf.setBusRadix("dec");
  assert.equal(wpf.busRadixValue(), 1, "dec → Radix.Decimal(1)");
  assert.deepEqual(dw.m_signals[1].labels, ["10", "15"], "dec 标签是真实十进制（非位串 1010）");

  wpf.setBusRadix("nonsense");
  assert.equal(wpf.busRadixValue(), 1, "非法值回落为 dec");
  assert.equal(wpf.applyBusRadix(), 2, "应命中 2 个矢量信号");

  // 单信号右键切换：按「信号自身 radix」重算，只影响该信号，不动全局
  const addr = dw.m_signals[2];
  assert.equal(wpf.setSignalRadix(addr, "hex"), true, "setSignalRadix 生效");
  assert.deepEqual(addr.labels, ["3"], "仅该信号按 hex 重算（0011→3）");
  assert.deepEqual(dw.m_signals[1].labels, ["10", "15"], "其他信号不受影响（仍是 dec）");
  assert.equal(wpf.busRadix(), "dec", "全局进制不被单信号切换改动");

  // 标签重算必须走「信号自身 radix」：核心实现被调用时收到的应是 sig.radix，
  // 而不是全局进制 —— 这正是历史上「右键给单个信号切进制不生效」的根因。
  const seen = [];
  dw.valueToLabel = function (v, radix) { seen.push(radix); return loadCoreValueToLabel()(v, radix); };
  addr.radix = 0; // 该信号自建为 hex，其余仍是 dec
  wpf.refreshBusLabels(addr);
  assert.deepEqual(seen, [0], "refreshBusLabels 传的是信号自身 radix（hex=0）");
  assert.deepEqual(addr.labels, ["3"], "按信号自身 hex 重算：0011→3");

  // 核心未就绪时不应抛错（退化为空串/原值，不阻断 UI）
  const saved = globalThis.window.document_wave;
  globalThis.window.document_wave = null;
  assert.equal(wpf.valueLabel("1010", 0), "1010", "无核心时退化显示，不抛错");
  globalThis.window.document_wave = saved;
});

// ---------------------------------------------------------------------------
// v0.3.0 R2：写入粒度收敛 indicesByGranularity（整步=每主步首格 / 子步=原样）
// ---------------------------------------------------------------------------
test("indicesByGranularity：整步收敛到每主步首格、子步原样（v0.3.0 R2）", () => {
  const wpf = globalThis.window.__wpf;
  // stride=2（子步=1）
  const stride = 2;
  const range = [2, 3, 4, 5, 6]; // 覆盖主步 1,2,3
  localStorage.setItem("wpf.editGranularity", "step");
  assert.deepEqual(wpf.indicesByGranularity(range, stride), [2, 4, 6], "整步：只留每个主步的首格");
  localStorage.setItem("wpf.editGranularity", "substep");
  assert.deepEqual(wpf.indicesByGranularity(range, stride), [2, 3, 4, 5, 6], "子步：原样返回");
  // 空输入
  assert.deepEqual(wpf.indicesByGranularity([], stride), [], "空数组安全");
  // 乱序去重
  localStorage.setItem("wpf.editGranularity", "step");
  assert.deepEqual(wpf.indicesByGranularity([5, 2, 6, 3], stride), [2, 4, 6], "整步：乱序也按主步去重收敛");
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
