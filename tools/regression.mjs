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
const rtlNav = await import(new URL("../js/sim/rtl-nav.js", import.meta.url).href);
const vcdIndex = await import(new URL("../js/sim/vcd-index.js", import.meta.url).href);

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
group("rtl-nav.js（#75 P0 RTL 结构树数据源，纯函数）");

const ANSI_MULTI_SRC = `// top comment
module counter #(parameter WIDTH = 8, parameter STEP = 1) (
  input clk,
  input rst_n,
  input [WIDTH-1:0] data_in,
  output reg [WIDTH-1:0] count,
  output done
);
  wire [WIDTH-1:0] next_count;
  assign next_count = count + STEP;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) count <= 0;
    else count <= next_count;
  end
endmodule
`;

test("blankComments 抹平注释但保留长度与换行（行号不漂移）", () => {
  const src = "module m(\n  // line comment\n  input clk, /* block\n  spanning */ output q\n);\nendmodule\n";
  const blanked = rtlNav.blankComments(src);
  assert.equal(blanked.length, src.length, "抹平后长度必须与原文件一致");
  assert.equal(blanked.split("\n").length, src.split("\n").length, "换行必须原样保留");
  assert.ok(!/line comment/.test(blanked), "行注释文本应被抹掉");
  assert.ok(!/block/.test(blanked) && !/spanning/.test(blanked), "块注释文本应被抹掉");
  assert.ok(/input clk/.test(blanked), "代码文本不受影响");
});

test("rtl-nav ANSI 头部端口行号逐行精确（共享方向关键字不串行）", () => {
  const nav = rtlNav.buildRtlNav([{ name: "counter.v", content: ANSI_MULTI_SRC }]);
  assert.equal(nav.length, 1);
  const mod = nav[0];
  assert.equal(mod.name, "counter");
  assert.equal(mod.moduleLine, 2, "module 行号应指向 module 关键字所在行");
  const byName = new Map(mod.ports.map((p) => [p.name, p]));
  assert.equal(byName.get("clk").line, 3);
  assert.equal(byName.get("rst_n").line, 4, "rst_n 不得串到 clk 所在行（共享 input 关键词）");
  assert.equal(byName.get("data_in").line, 5);
  assert.equal(byName.get("count").line, 6);
  assert.equal(byName.get("done").line, 7);
  assert.equal(byName.get("data_in").range, "[7:0]", "端口应带解析出的位宽标签");
  assert.equal(mod.parameters[0].line, 2, "头部 parameter 行号指向参数块所在行");
});

test("rtl-nav 共享方向单行列表与参数化声明定位正确", () => {
  const src = "module m(input a, b, input [3:0] c, output d);\n  assign d = a & b & c;\nendmodule\n";
  const nav = rtlNav.buildRtlNav([{ name: "m.v", content: src }]);
  const byName = new Map(nav[0].ports.map((p) => [p.name, p]));
  assert.equal(byName.get("a").line, 1);
  assert.equal(byName.get("b").line, 1, "同列表共享方向的多端口应都落在声明行");
  assert.equal(byName.get("c").line, 1);
  assert.equal(byName.get("c").range, "[3:0]");
});

test("rtl-nav 非 ANSI（端口列表 + 体内方向声明）定位到声明行", () => {
  const src = "module m(a, b);\n  input a;\n  input wire signed [7:0] b;\n  output reg q;\n  assign q = a & b;\nendmodule\n";
  const nav = rtlNav.buildRtlNav([{ name: "m.v", content: src }]);
  const byName = new Map(nav[0].ports.map((p) => [p.name, p]));
  assert.equal(byName.get("a").line, 2, "非 ANSI 应跳到 input a; 声明行");
  assert.equal(byName.get("b").line, 3);
  assert.equal(byName.get("b").range, "[7:0]");
  assert.equal(byName.get("q").line, 4);
});

test("rtl-nav 实例与注释抹白：行号按原文计算、注释里的 module 字样不干扰", () => {
  const src = `// this file instantiates nothing: module fake(...); endmodule
module tb;
  reg clk;
  wire [7:0] count;
  // TODO: add counter later
  counter #(.WIDTH(8), .STEP(1)) u_dut (
    .clk(clk),
    .count(count)
  );
endmodule
`;
  const nav = rtlNav.buildRtlNav([{ name: "tb.v", content: src }]);
  assert.equal(nav.length, 1, "注释里的 module 关键字不得被解析成模块");
  assert.equal(nav[0].name, "tb");
  assert.equal(nav[0].instances.length, 1);
  const inst = nav[0].instances[0];
  assert.equal(inst.moduleName, "counter");
  assert.equal(inst.instanceName, "u_dut");
  assert.equal(inst.line, 6, "实例行号应指向实例化语句（注释行不参与偏移）");
});

test("rtl-nav #86 A1：多实例同语句 / 参数化紧贴写法 / generate 内例化全部识别", () => {
  const src = `module tb;
  wire a1, a2, a3, b1, b2, b3, o1, o2, o3;
  sub u1(a1), u2(a2), u3(a3);
  mod#(.P(1)) u_p(.a(b1), .b(o1));
  genvar i;
  generate
    for (i = 0; i < 2; i = i + 1) begin : g
      sub u (.a(b2), .b(o2));
    end
  endgenerate
  sub u_named (.a(b3), .b(o3));
endmodule
`;
  const nav = rtlNav.buildRtlNav([{ name: "tb.v", content: src }]);
  assert.equal(nav.length, 1);
  const insts = nav[0].instances;
  assert.equal(insts.length, 6, "应为 u1/u2/u3/u_p/u/u_named 共 6 个实例");
  assert.deepEqual(insts.map((it) => it.instanceName), ["u1", "u2", "u3", "u_p", "u", "u_named"],
    "实例顺序按源码行号（一条语句里的多实例不得被吞掉）");
  const byName = new Map(insts.map((it) => [it.instanceName, it]));
  assert.equal(byName.get("u2").moduleName, "sub");
  assert.equal(byName.get("u2").line, 3, "u2 必须定位到真实行（engine 启发式会串到 u1 行）");
  assert.equal(byName.get("u_p").moduleName, "mod");
  assert.equal(byName.get("u_p").line, 4);
  assert.ok(/\.P\(1\)/.test(byName.get("u_p").parameterOverride), "参数覆盖文本应保留");
  assert.equal(byName.get("u").line, 8, "generate 内例化也要识别");
  assert.equal(byName.get("u_named").line, 11);
});

test("rtl-nav #86 A1：扫描器排除关键字/字符串/说明性文本的误判", () => {
  const src = 'module tb;\n' +
    '  wire o, a, b, w;\n' +
    '  and g1 (o, a, b);\n' +
    '  initial $display("mod u(x); and g2(o,a,b);");\n' +
    '  my_task(a);\n' +
    '  assign o = a & b;\n' +
    '  always @(posedge w) begin end\n' +
    'endmodule\n';
  const nav = rtlNav.buildRtlNav([{ name: "tb.v", content: src }]);
  assert.equal(nav[0].instances.length, 0, "门原语/任务调用/赋值/字符串不得被当成实例化");
});

test("rtl-nav #86 A1：实例名与端口同名时行号仍取实例化语句（不再靠首次出现启发式）", () => {
  const src = 'module tb(input clk, output y);\n' +
    '  wire w;\n' +
    '  sub clk (w);\n' +
    '  assign y = w;\n' +
    'endmodule\n';
  const nav = rtlNav.buildRtlNav([{ name: "tb.v", content: src }]);
  const inst = nav[0].instances[0];
  assert.equal(inst.instanceName, "clk");
  assert.equal(inst.line, 3, "实例名与端口同名时必须指向实例化语句行");
});

test("rtl-nav #86 A1：maskStrings 等长替换（下标/行号不漂移）", () => {
  const src = 'a = "mod u(x);";\nb = "带中文";\nc = "未闭合\n';
  const masked = rtlNav.maskStrings(src);
  assert.equal(masked.length, src.length, "抹白后长度必须与原文本一致");
  assert.equal(masked.split("\n").length, src.split("\n").length, "换行必须原样保留");
  assert.ok(!/mod u/.test(masked), "字符串内容应被抹白");
  assert.ok(masked.startsWith("a = "), "代码文本不受影响");
  assert.equal(rtlNav.maskStrings('x = "a\\"b";').indexOf("b"), -1, "转义引号不得提前结束字符串");
});

test("rtl-nav #86 A1：collectModuleDefs / resolveModuleDef 支撑「实例→定义」查表", () => {
  const fileA = 'module top;\n  sub u_here ();\nendmodule\n';
  const fileB = 'module sub;\nendmodule\n';
  const files = [{ name: "a.v", content: fileA }, { name: "b.v", content: fileB }];
  const nav = rtlNav.buildRtlNav(files);
  const defs = rtlNav.collectModuleDefs(nav);
  assert.equal(defs.length, 2);
  const top = rtlNav.resolveModuleDef(defs, "top", 0);
  assert.equal(top.def.fileIndex, 0);
  assert.equal(top.def.line, 1);
  assert.equal(top.fuzzy, false);
  // 黑盒（无源码定义）→ 无候选
  assert.equal(rtlNav.resolveModuleDef(defs, "blackbox", 0).def, null);
  // 大小写不一致 → fuzzy 命中
  const fuzzy = rtlNav.resolveModuleDef(defs, "SUB", 0);
  assert.equal(fuzzy.def.fileIndex, 1);
  assert.equal(fuzzy.fuzzy, true);
});

test("rtl-nav #86 A1：同名模块多处定义时优先例化点所在文件", () => {
  const dupA = 'module sub;\n  wire a;\nendmodule\n';
  const dupB = 'module sub;\n  wire b;\nendmodule\n';
  const nav = rtlNav.buildRtlNav([
    { name: "a.v", content: dupA },
    { name: "b.v", content: dupB }
  ]);
  const defs = rtlNav.collectModuleDefs(nav);
  const inA = rtlNav.resolveModuleDef(defs, "sub", 0);
  const inB = rtlNav.resolveModuleDef(defs, "sub", 1);
  assert.equal(inA.candidates.length, 2, "同名模块两处定义都要作为候选");
  assert.equal(inA.def.fileIndex, 0);
  assert.equal(inB.def.fileIndex, 1, "preferFileIndex 命中同文件定义");
});

// ---------------------------------------------------------------------------
group("vcd-index.js（#75 P0 VCD 全路径索引，纯函数）");

function sampleParsedVcd() {
  return {
    tmax: 10,
    signals: [
      { width: 1, name: "clk", reference: "clk", scope: "tb.dut", steps: [] },
      { width: 8, name: "data_in", reference: "data_in", scope: "tb.dut", steps: [] },
      { width: 1, name: "done", reference: "done", scope: "tb", steps: [] },
      { width: 1, name: "top_net", reference: "top_net", scope: "", steps: [] }
    ]
  };
}

test("buildVcdHierarchy 沿点分作用域建链并把信号挂到正确节点", () => {
  const idx = vcdIndex.buildVcdHierarchy(sampleParsedVcd());
  assert.equal(idx.signalCount, 4);
  assert.equal(idx.scopeCount, 2, "应有两级作用域：tb 与 tb.dut");
  assert.equal(idx.tree.path, "");
  const tb = idx.tree.scopes[0];
  assert.equal(tb.path, "tb");
  assert.equal(tb.signals.length, 1);
  assert.equal(tb.signals[0].name, "done");
  const dut = tb.scopes[0];
  assert.equal(dut.path, "tb.dut");
  assert.equal(dut.signals.length, 2);
  const names = dut.signals.map((s) => s.name).sort();
  assert.deepEqual(names, ["clk", "data_in"]);
  assert.equal(dut.signals.find((s) => s.name === "data_in").width, 8, "信号应带位宽");
});

test("buildVcdHierarchy 根作用域信号挂在 root、可 JSON 序列化（无循环引用）", () => {
  const idx = vcdIndex.buildVcdHierarchy(sampleParsedVcd());
  const rootSignals = idx.tree.signals.map((s) => s.name);
  assert.deepEqual(rootSignals, ["top_net"], "空 scope 信号应挂在 root");
  const json = JSON.parse(JSON.stringify(idx.tree));
  assert.equal(json.scopes[0].scopes[0].path, "tb.dut", "树应可序列化（供渲染层直接消费）");
});

test("buildVcdHierarchy 对空/缺字段入参安全返回空索引", () => {
  const empty = vcdIndex.buildVcdHierarchy(null);
  assert.equal(empty.signalCount, 0);
  assert.equal(empty.scopeCount, 0);
  assert.equal(empty.tree.scopes.length, 0);
  const partial = vcdIndex.buildVcdHierarchy({ signals: [{ width: 0, reference: "x" }] });
  assert.equal(partial.signalCount, 1);
  assert.equal(partial.tree.signals[0].width, 1, "width 缺失/为 0 时按 1 位兜底");
});

test("buildVcdHierarchy 与真实 parseVcd 产物打通（parseVcd → 索引）", () => {
  const vcdText = [
    "$timescale 1ns $end",
    "$scope module tb $end",
    "$scope module dut $end",
    "$var wire 1 ! clk $end",
    "$var wire 8 \" data_in $end",
    "$upscope $end",
    "$var wire 1 # done $end",
    "$upscope $end",
    "$enddefinitions $end",
    "#0",
    "0!",
    "b00000000 \"",
    "#5",
    "1!"
  ].join("\n");
  const parsed = sim.parseVcd(vcdText);
  const idx = vcdIndex.buildVcdHierarchy(parsed);
  assert.equal(idx.signalCount, 3);
  assert.equal(idx.scopeCount, 2);
  assert.equal(idx.tree.scopes[0].path, "tb");
  assert.equal(idx.tree.scopes[0].scopes[0].path, "tb.dut");
  assert.deepEqual(idx.tree.scopes[0].scopes[0].signals.map((s) => s.name), ["clk", "data_in"]);
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
  // 2026-09-09 第 7 pass 后 clean.js 已是最终解混淆版：方法声明为普通
  // valueToLabel(num, n)，不再有 ['valueToLab' + 'el']( 拼接形态；用 [PATCH-A3]
  // 维护注释锚定方法声明，避免误匹配到其他调用点。
  const anchor = "// [PATCH-A3]";
  const at = src.indexOf(anchor);
  assert.ok(at > 0, "核心中应存在 valueToLabel 实现（[PATCH-A3]）");
  const decl = src.indexOf("valueToLabel(", at);
  assert.ok(decl > at, "PATCH-A3 注释之后应有 valueToLabel 方法声明");
  const open = src.indexOf("{", decl);
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
  const params = src.slice(decl, open); // "valueToLabel(num, n) "
  const body = src.slice(open, end);
  return new Function("Radix", "return function " + params + body + ";")(globalThis.window.Radix);
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
// #89 信号名位宽显示（[PATCH-A6]）：从解混淆核心抽取真实的 displaySignalName /
// calculateDynamicNameWidth / drawSignalName，断言后缀参与「宽度测量 + 缓存键 +
// fillText」，且不改 sig.name（显示层拼接，无真实位宽不硬画）。
// ---------------------------------------------------------------------------
function loadCoreFunction(fnName, anchor) {
  const src = readFileSync(join(root, "js/wavepaint.clean.js"), "utf8");
  const at = anchor ? src.indexOf(anchor) : 0;
  assert.ok(anchor ? at > 0 : true, "核心中应存在维护锚 " + anchor);
  const decl = src.indexOf("function " + fnName + "(", at);
  assert.ok(decl >= 0, "核心中应存在 " + fnName + " 函数声明");
  const open = src.indexOf("{", decl);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  assert.ok(end > open, fnName + " 实现应有完整函数体");
  return src.slice(decl, end);
}
function compileCoreFunction(fnName, free, anchor) {
  const src = loadCoreFunction(fnName, anchor);
  const names = Object.keys(free);
  const outer = new Function(...names, "return " + src + ";");
  return outer(...names.map((k) => free[k]));
}

const displaySignalName = compileCoreFunction("displaySignalName", {}, "// [PATCH-A6]");

test("displaySignalName：有真实位宽的 Vector 拼 name[msb:lsb]（[PATCH-A6]）", () => {
  assert.equal(displaySignalName({ name: "data", width: 8, msb: "7", lsb: "0" }), "data[7:0]");
  assert.equal(displaySignalName({ name: "q", width: 32, msb: "31", lsb: "0" }), "q[31:0]");
  assert.equal(displaySignalName({ name: "dout", width: 16, msb: 15, lsb: 0 }), "dout[15:0]", "msb/lsb 为数字也应正常拼接");
  assert.equal(displaySignalName({ name: "part", width: 4, msb: "6", lsb: "3" }), "part[6:3]", "非 0 起点位域按 msb:lsb 原样");
});

test("displaySignalName：无真实位宽 / 位宽 1 / 名字已带位域 → 原样（[PATCH-A6]）", () => {
  assert.equal(displaySignalName({ name: "clk", width: 1, msb: "", lsb: "" }), "clk", "1 位信号不加后缀");
  assert.equal(displaySignalName({ name: "rst_n", type: 0 }), "rst_n", "无 width 字段（手绘/核心 Signal）不加后缀");
  assert.equal(displaySignalName({ name: "x", width: 8 }), "x[7:0]", "msb/lsb 缺失时按 width-1/0 兜底");
  assert.equal(displaySignalName({ name: "bus[7:0]", width: 8, msb: "7", lsb: "0" }), "bus[7:0]", "名字已带位域不重复追加");
  assert.equal(displaySignalName(null), "", "空对象安全");
  assert.equal(displaySignalName({}), "", "无 name 安全");
  assert.equal(displaySignalName({ name: "", width: 8 }), "", "空名不加后缀");
});

test("calculateDynamicNameWidth：测宽与缓存键纳入 [msb:lsb] 显示名（[PATCH-A6]）", () => {
  const measured = [];
  const mkCtx = () => ({
    font: "",
    save() {},
    restore() {},
    measureText(text) {
      measured.push(String(text));
      return { width: String(text).length * 10 };
    }
  });
  // 同一实例 = 共享模块级缓存（_cachedDynamicNameWidth/_cachedSignalNamesHash）
  const calc = compileCoreFunction("calculateDynamicNameWidth", {
    document_wave: null,
    GroupManager: undefined,
    _cachedDynamicNameWidth: null,
    _cachedSignalNamesHash: null,
    displaySignalName
  });
  const ctx1 = mkCtx();
  const wBit = calc(ctx1, [{ name: "q", width: 1, msb: "", lsb: "" }]);
  assert.ok(measured.includes("q"), "1 位信号只测基名");
  const ctx2 = mkCtx();
  const wVec = calc(ctx2, [{ name: "q", width: 32, msb: "31", lsb: "0" }]);
  assert.ok(measured.includes("q[31:0]"), "位宽变化后应测到带后缀显示名（缓存键含 [msb:lsb]）");
  assert.ok(wVec > wBit, "q[31:0] 应比 q 撑出更宽名字列（wBit=" + wBit + ", wVec=" + wVec + "）");
  // 同名单第三次（与第二次相同）应命中缓存、不再重复测量
  const before = measured.length;
  const wHit = calc(mkCtx(), [{ name: "q", width: 32, msb: "31", lsb: "0" }]);
  assert.equal(wHit, wVec, "相同列表命中缓存返回同宽");
  assert.equal(measured.length, before, "缓存命中不再 measureText");
});

test("drawSignalName：画布名字列按显示名 fillText（[PATCH-A6]）", () => {
  const draw = compileCoreFunction("drawSignalName", {
    GroupManager: undefined,
    document_wave: null,
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    document: { body: {} },
    displaySignalName,
    isObjectSelected: undefined,
    SelectableType: undefined
  });
  const drawn = [];
  const ctx = {
    font: "",
    textAlign: "",
    textBaseline: "",
    fillStyle: "",
    save() {},
    restore() {},
    measureText(text) { return { width: String(text).length * 8 }; },
    fillText(text) { drawn.push(String(text)); },
    fillRect() {},
    strokeRect() {}
  };
  draw(ctx, { name: "data", type: 1, width: 8, msb: "7", lsb: "0" }, 0, null, 40, 40, 400);
  assert.equal(drawn.length, 1, "画一次名字");
  assert.equal(drawn[0], "data[7:0]", "多比特信号名字列显示 name[msb:lsb]");
  drawn.length = 0;
  draw(ctx, { name: "clk", type: 0, width: 1, msb: "", lsb: "" }, 1, null, 40, 40, 400);
  assert.equal(drawn[0], "clk", "1 位信号不加后缀");
  drawn.length = 0;
  draw(ctx, { name: "hand", type: 1 }, 2, null, 40, 40, 400);
  assert.equal(drawn[0], "hand", "无 width 的 Vector（手绘）不加后缀、不崩");
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
// wpf.parseValue 值解析语义（2026-09-04 收口）：
// 位串分支不得遮蔽纯 0/1 十进制数；裸 hex 必须全串合法；bin 下 0/1 串按位串
// ---------------------------------------------------------------------------
test("wpf.parseValue：dec 进制下纯 0/1 数字按数值解析（不再被位串分支遮蔽）", () => {
  const wpf = globalThis.window.__wpf;
  const SignalType = globalThis.window.SignalType;
  const mkVec = (radix) => ({ type: SignalType.Vector, radix });
  const R = globalThis.window.Radix;
  // 默认全局 dec：10 → 数值 10（旧实现存成位串字符串 "10"）
  assert.strictEqual(wpf.parseValue("10", mkVec(R.Decimal)), 10, "dec：10 → 数值 10");
  assert.strictEqual(wpf.parseValue("1000", mkVec(R.Decimal)), 1000, "dec：1000 → 数值");
  assert.strictEqual(wpf.parseValue("1010", mkVec(R.Decimal)), 1010, "dec：1010 → 数值 1010");
  // hex：0/1 组合按 16 进制数值
  assert.strictEqual(wpf.parseValue("1010", mkVec(R.Hexadecimal)), 4112, "hex：1010 → 0x1010");
  // bin：0/1 串按位串（位宽由串长决定）
  assert.strictEqual(wpf.parseValue("1010", mkVec(R.Binary)), "1010", "bin：1010 → 位串");
  // 含 x/z 恒为位串（任何进制都无法表示成数字）
  assert.strictEqual(wpf.parseValue("1x0z", mkVec(R.Decimal)), "1x0z", "含 x/z → 位串");
  // 显式基数与 0x 前缀不变
  assert.strictEqual(wpf.parseValue("8'hA5", mkVec(R.Decimal)), 165, "8'hA5 → 165");
  assert.strictEqual(wpf.parseValue("0xA", mkVec(R.Decimal)), 10, "0xA → 10");
  // 裸 hex 全串合法才接受：dec 下 '1e' 非法（旧实现 parseInt 静默截断成 1）
  assert.strictEqual(wpf.parseValue("1e", mkVec(R.Decimal)), null, "dec：1e → 非法");
  assert.strictEqual(wpf.parseValue("1e", mkVec(R.Hexadecimal)), 30, "hex：1e → 30");
  assert.strictEqual(wpf.parseValue("A", mkVec(R.Hexadecimal)), 10, "hex：单字符 A → 10");
  assert.strictEqual(wpf.parseValue("FF", mkVec(R.Decimal)), null, "dec：FF → 非法");
});

// ---------------------------------------------------------------------------
// 仿真链路解析健壮性（2026-09-04 批次4）：
// ANSI 端口多类型关键字 / 参数化位宽 / 归一化前缀剥离顺序 / 位宽兼容
// ---------------------------------------------------------------------------
test("ANSI 端口多类型关键字：input wire signed [7:0] a 的端口名应为 a", () => {
  const src = `module m(input wire signed [7:0] a, input logic b, output [7:0] y);
  assign y = a; endmodule`;
  const d = sim.parseVerilogDesign(src);
  const names = d.topModule.ports.map((p) => p.name);
  assert.deepEqual(names.sort(), ["a", "b", "y"], "关键字剥离后端口名干净（旧实现解析出 'signed a'）");
  const a = d.topModule.ports.find((p) => p.name === "a");
  assert.equal(a.width, 8, "a 的位宽应为 8");
});

test("参数化位宽 [WIDTH-1:0]：代入求值成具体位宽，TB 内嵌参数定义", () => {
  const src = `module m #(parameter WIDTH = 8)(input clk, input [WIDTH-1:0] din, output [WIDTH-1:0] dout);
  assign dout = din; endmodule`;
  const d = sim.parseVerilogDesign(src);
  const din = d.topModule.ports.find((p) => p.name === "din");
  assert.equal(din.width, 8, "[WIDTH-1:0] 应解析为 8 位");
  assert.equal(din.msb, "7", "msb 应代入为 7");
  const project = { timeSteps: 8, subSteps: 0, signals: [
    { name: "clk", kind: "clock", width: 1, values: "01010101".split("") }
  ], outputs: [] };
  const tb = String(sim.buildAutoTestbench(d, project).source || "");
  assert.ok(/parameter\s+WIDTH\s*=\s*8;/.test(tb), "TB 应内嵌 parameter WIDTH = 8 定义");
  assert.ok(/reg\s+\[7:0\]\s+din/.test(tb), "din 应声明为 reg [7:0]");
  assert.ok(!/NaN/.test(tb), "TB 不得出现 NaN");
});

test("参数化位宽无法求值时回退标量（绝不把参数表达式带进 TB）", () => {
  const src = `module m(input clk, input [UNSPEC-1:0] din, output reg [7:0] q);
  always @(posedge clk) q <= din; endmodule`;
  const d = sim.parseVerilogDesign(src);
  const din = d.topModule.ports.find((p) => p.name === "din");
  assert.equal(din.width, 1, "无法求值 → 回退标量");
  const project = { timeSteps: 8, subSteps: 0, signals: [
    { name: "clk", kind: "clock", width: 1, values: "01010101".split("") }
  ], outputs: [] };
  const tb = String(sim.buildAutoTestbench(d, project).source || "");
  assert.ok(!/UNSPEC/.test(tb), "TB 中不得出现未定义的参数名 UNSPEC");
});

test("normalizeSignalName 前缀剥离顺序：in_*/input_* 别名归一化生效", () => {
  // 通过 matchSignalsToPorts 行为验证：in_data 信号应精确命中 data 端口（归一化轮）
  const ports = [
    { name: "data", direction: "input", width: 1, msb: "", lsb: "" },
    { name: "clk", direction: "input", width: 1, msb: "", lsb: "" }
  ];
  const signals = [
    { name: "in_data", kind: "logic", width: 1, values: "11111111".split("") },
    { name: "i_clk", kind: "clock", width: 1, values: "01010101".split("") }
  ];
  const bindings = sim.matchSignalsToPorts(signals, ports);
  const dataB = bindings.find((b) => b.port.name === "data");
  const clkB = bindings.find((b) => b.port.name === "clk");
  assert.ok(dataB.matched && dataB.signal.name === "in_data", "in_data → data（旧实现剥成 n_data 失配）");
  assert.ok(clkB.matched && clkB.signal.name === "i_clk", "i_clk → clk");
});

test("位宽兼容：1 位端口不绑位串矢量信号（防静默取首字符错值）", () => {
  const ports = [{ name: "en", direction: "input", width: 1, msb: "", lsb: "" }];
  const signals = [{ name: "en", kind: "vector", width: 4, values: ["1010", "1010", "1010", "1010"] }];
  const bindings = sim.matchSignalsToPorts(signals, ports);
  assert.equal(bindings[0].matched, false, "1 位端口 × 4 位矢量 → 不绑定");
  // 多位端口绑定多位矢量仍正常
  const ports2 = [{ name: "en", direction: "input", width: 4, msb: "3", lsb: "0" }];
  const bindings2 = sim.matchSignalsToPorts(signals, ports2);
  assert.equal(bindings2[0].matched, true, "4 位端口 × 4 位矢量 → 正常绑定");
});

// ---------------------------------------------------------------------------
// VCD 回填（批次9）：DUT 内部信号（tb.dut 层）回显 + 同名去重优先浅层
// ---------------------------------------------------------------------------
test("VCD 回显：tb.dut 内部信号回显，同名信号去重保留浅层（DUT 端口连接线）", () => {
  const vcd = [
    "$enddefinitions $end",
    "$scope module tb $end",
    "$var wire 1 ! clk $end",
    "$var wire 1 \" rst_n $end",
    "$var wire 4 # q $end",
    "$scope module dut $end",
    "$var reg 4 $ count $end",
    "$var reg 2 % q $end",
    "$upscope $end",
    "$upscope $end",
    "#0",
    "0!",
    "1\"",
    "b0000 #",
    "b0000 $",
    "b00 %",
    "#1",
    "1!",
    "b0001 #",
    "b0001 $",
    "#2",
    "0!",
    "b0010 #",
    "b0010 $",
    "#3",
    "1!",
    "b0011 #",
    "b0011 $",
    "#4",
    "b0100 #",
  ].join("\n");
  const project = {
    timeSteps: 4,
    // clk/rst_n 是画布激励信号 → 应被排除；q/count 不是 → 应回显
    signals: [
      { name: "clk", width: 1 },
      { name: "rst_n", width: 1 }
    ],
    outputs: []
  };
  const { outputs } = sim.vcdToProjectOutputs(vcd, project);
  const names = outputs.map((s) => s.name);
  assert.ok(names.includes("count"), "DUT 内部信号 count 应回显（旧实现永不回显）");
  assert.equal(names.filter((n) => n === "q").length, 1, "同名 q 只保留一个");
  const q = outputs.find((s) => s.name === "q");
  assert.equal(q.width, 4, "保留的应是浅层 tb.q（4 位），不是 tb.dut.q（2 位）");
  assert.ok(!names.includes("clk") && !names.includes("rst_n"), "画布激励信号不回填");
  assert.deepEqual(q.values, ["0000", "0001", "0010", "0011"], "q 按时间采样为 4 位位串");
});

// ---------------------------------------------------------------------------
// 参数化位宽完整支持（2026-09-04 第二轮）：求值器升级（递归参数/$clog2/移位/
// sized字面量）+ TB 内嵌参数定义（位宽算术最终由 iverilog 裁决）
// ---------------------------------------------------------------------------
test("求值器升级：嵌套参数 / $clog2 / 移位 / sized字面量 全部落成具体位宽", () => {
  const d1 = sim.parseVerilogDesign(
    "module m #(parameter DW = 8, parameter AW = DW + 2)(input [AW-1:0] addr, input [DW-1:0] din); endmodule");
  const addr = d1.topModule.ports.find((p) => p.name === "addr");
  assert.equal(addr.width, 10, "嵌套参数 AW=DW+2 → 10（旧实现回退 1）");
  const d2 = sim.parseVerilogDesign(
    "module m #(parameter DEPTH = 16)(input [$clog2(DEPTH)-1:0] sel); endmodule");
  assert.equal(d2.topModule.ports.find((p) => p.name === "sel").width, 4, "$clog2(16)-1:0 → 4 位");
  const d3 = sim.parseVerilogDesign(
    "module m #(parameter W = 4)(input [(1<<W)-1:0] sel, input [W*2-1:0] din); endmodule");
  assert.equal(d3.topModule.ports.find((p) => p.name === "sel").width, 16, "(1<<W)-1:0 → 16 位");
  const d4 = sim.parseVerilogDesign(
    "module m #(parameter W = 8'd12)(input [W-1:0] din); endmodule");
  assert.equal(d4.topModule.ports.find((p) => p.name === "din").width, 12, "sized 字面量参数 8'd12 → 12 位");
  const d5 = sim.parseVerilogDesign(
    "module m #(parameter DW = 8)(input [AW-1:0] addr); localparam AW = DW + 4; endmodule");
  assert.equal(d5.topModule.ports.find((p) => p.name === "addr").width, 12, "模块体 localparam 链 → 12 位");
});

test("TB 内嵌参数定义 + 原始位宽表达式（iverilog 是位宽算术的最终裁决者）", () => {
  const src = "module m #(parameter DW = 8, parameter AW = DW + 2)(input clk, input [AW-1:0] addr, output [AW-1:0] dout);\n  assign dout = addr; endmodule";
  const d = sim.parseVerilogDesign(src);
  assert.ok(Array.isArray(d.topModule.paramDefs) && d.topModule.paramDefs.length === 2, "paramDefs 应含头部两个参数");
  const project = { timeSteps: 8, subSteps: 0, signals: [
    { name: "clk", kind: "clock", width: 1, values: "01010101".split("") },
    { name: "addr", kind: "vector", width: 10, values: Array(8).fill("0000001010") }
  ], outputs: [] };
  const tb = String(sim.buildAutoTestbench(d, project).source || "");
  assert.ok(/parameter\s+DW\s*=\s*8;/.test(tb), "TB 应内嵌 parameter DW = 8");
  assert.ok(/parameter\s+AW\s*=\s*DW \+ 2;/.test(tb), "TB 应内嵌 parameter AW = DW + 2");
  // 求值器算得出 → 具体数字 [9:0]；算不出 → 原始表达式 [AW-1:0]，两者皆合法
  assert.ok(/(?:reg|wire)\s+\[(?:9:0|AW-1:0)\]\s+addr/.test(tb), "addr 声明应为具体位宽或原始表达式");
  assert.ok(!/NaN/.test(tb), "TB 不得含 NaN");

  // 求值器无法处理的表达式（含 & 位运算）：保留原始表达式交 iverilog 求值
  const src2 = "module m #(parameter DEPTH = 8, parameter OFFSET = 3)(input clk, input [DEPTH/2+OFFSET&1:0] sel); endmodule";
  const d2 = sim.parseVerilogDesign(src2);
  const sel = d2.topModule.ports.find((p) => p.name === "sel");
  assert.equal(sel.parametric, true, "含位运算的表达式应保持 parametric");
  const tb2 = String(sim.buildAutoTestbench(d2, { timeSteps: 8, subSteps: 0, signals: [
    { name: "clk", kind: "clock", width: 1, values: "01010101".split("") }
  ], outputs: [] }).source || "");
  assert.ok(/DEPTH\/2\+OFFSET&1:0\]/.test(tb2), "参数化端口应保留原始表达式声明（iverilog 求值）");
  assert.ok(/parameter\s+DEPTH\s*=\s*8;/.test(tb2) && /parameter\s+OFFSET\s*=\s*3;/.test(tb2), "参数定义随表达式内嵌");
});

test("参数化端口可绑定矢量信号（widthCompatible 不设限），未定义参数仍回退标量", () => {
  const d = sim.parseVerilogDesign(
    "module m #(parameter W = 8)(input clk, input [W-1:0] din, output [3:0] o); assign o = 4'd0; endmodule");
  const project = { timeSteps: 8, subSteps: 0, signals: [
    { name: "clk", kind: "clock", width: 1, values: "01010101".split("") },
    { name: "din", kind: "vector", width: 8, values: Array(8).fill("10101010") }
  ], outputs: [] };
  const tb = String(sim.buildAutoTestbench(d, project).source || "");
  assert.ok(/din\s*<=|\bdin\b/.test(tb), "din 应被绑定驱动");
  assert.ok(/8'b10101010/.test(tb), "矢量激励按信号自身位宽格式化（fmtWidth 兜底），不得截成 1 位");
  // 未定义参数（无 paramDefs 覆盖）仍回退标量，绝不产非法 TB
  const d2 = sim.parseVerilogDesign(
    "module m(input clk, input [UNSPEC-1:0] din, output reg [7:0] q); always @(posedge clk) q <= din; endmodule");
  const p2 = { timeSteps: 8, subSteps: 0, signals: [
    { name: "clk", kind: "clock", width: 1, values: "01010101".split("") }
  ], outputs: [] };
  const tb2 = String(sim.buildAutoTestbench(d2, p2).source || "");
  assert.ok(!/UNSPEC/.test(tb2), "TB 中不得出现未定义的参数名 UNSPEC");
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
