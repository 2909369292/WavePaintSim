// WavePaintClean —— 本项目唯一核心引擎（解混淆收尾完成 · 最终唯一维护版）
// 来源：2026-09-01/02 由混淆源 js/wavepaint.63e6dade.js 经 tools/deobfuscate.mjs
// 字符串还原（解码调用→字面量、hex→十进制、重格式化）生成；混淆源与一次性脚本
// 已随 2026-09-09 清理删除（git 历史可查）。
// 2026-09-09 解混淆收尾：前 6 pass 结构化清理剔除 obfuscator.io 顶层解码器别名 /
// rotate / 反调试闭包、字符串解码器 _0x55bf、stringArray 工厂 _0x3f97（含 base64
// 数组）与 1732 个别名声明、824 个数值映射对象等零调用死代码；第 7 pass 按
// ESLint-scope 绑定图将全部 _0x… 局部标识符重命名为可读名（19,132 处 / 4,291 变量，
// 绑定一致性验证通过）。33,110 → 13,115 行；正文 _0x 残留清零。改动属 C1/C17 范畴：
// 必须重建 exe 并同步记忆。
const SignalType = {
    Bit: 0,
    Vector: 1,
    BlankRow: 2
  };
const Radix = {
    Hexadecimal: 0,
    Decimal: 1,
    Binary: 2
  };
const DriveStrength = {
    Strong: 0,
    Weak: 1,
    WeakMarker: 2
  };
'undefined' != typeof window && (window.SignalType = SignalType, window.Radix = Radix, window.DriveStrength = DriveStrength);
class SegmentStyle {
  constructor(item = null, val = false, tmp = null) {
                this.color = item;
        this.hatched = val;
        this.fill = tmp;
  }
  isDefault() {
        return !this.color && !this.hatched && !this.fill;
  }
}
class Signal {
  constructor(item = '', val = SignalType.Bit, tmp = 0) {
        this.name = item;
    this.type = val;
    this.values = new Array(tmp)['fill'](-1);
    this.labels = new Array(tmp)['fill']('');
    this.segmentStyles = Array.from({ length: tmp }, () => new SegmentStyle());
    this.driveStrengths = new Array(tmp)['fill'](DriveStrength.Strong);
    this.clockMarkers = new Array(tmp)['fill'](false);
    this.showClockMarkers = false;
    this.waveDromColorCodes = new Array(tmp)['fill'](null);
    this.color = null;
    this.fill = null;
    this.riseTime = 0;
    this.fallTime = 0;
    this.edgeArrow = ('none');
    this.radix = Radix.Hexadecimal;
    this.uiRowHeightHint = 0;
    this.isClockPattern = false;
    this.clockHighSamples = 1;
    this.clockLowSamples = 1;
    this.groupName = null;
    this.groupColor = null;
    this.groupPath = null;
    this.waveDromChars = new Array(tmp)['fill'](null);
    this.waveDromPeriod = null;
    this.waveDromPhase = null;
    this.waveDromData = void (0);
    this.waveDromNode = null;
    this.waveDromWave = null;
    this.waveDromWaveLength = null;
    this.waveDromHadData = false;
    this.isNodeOnlyRow = false;
    this.subSteps = 0;
  }
}
class Marker {
  constructor(item, val, tmp = null) {
                this.id = item;
        this.position = val;
        this.color = tmp;
  }
}
class TimeJump {
  constructor(item, val, tmp = null) {
                this.id = item;
        this.position = val;
        this.color = tmp;
  }
}
class TimeSpanMarker {
  constructor(item, val, tmp, v0, v1, v2 = '-|', v3 = null) {
                this.id = item;
        this.startSignal = val;
        this.startPosition = tmp;
        this.endSignal = v0;
        this.endPosition = v1;
        this.style = v2;
        this.color = v3;
  }
}
class WaveDocument {
  constructor() {
                this.m_sampleCount = 30;
        this.m_subStepCount = 1;
        this.m_signals = [];
        this.m_vcdSignals = [];
        this.m_markers = [];
        this.m_timeJumps = [];
        this.m_timeSpanMarkers = [];
        this.m_arrows = [];
        this.m_textAnnotations = [];
        this.m_hasBlockClipboard = false;
        this.m_nextArrowId = 1;
        this.m_nextMarkerId = 1;
        this.m_nextTimeJumpId = 1;
        this.m_nextTimeSpanMarkerId = 1;
        this.m_nextTextAnnotationId = 1;
        this.m_arrowColor = null;
        this.m_undoStack = [];
        this.m_redoStack = [];
        this.m_modified = false;
  }
  maxSubSteps() {
        let num = this.m_subStepCount;
    for (const item of this.m_signals)
      item.subSteps && item.subSteps > num && (num = item.subSteps);
    return num;
  }
  effectiveSampleCount() {
    return (this.m_sampleCount * (this.m_subStepCount + 1));
  }
  getSignalEffectiveSampleCount(item) {
    const num = item && (item.subSteps > 0) ? item.subSteps : this.m_subStepCount;
    return (this.m_sampleCount * (num + 1));
  }
  sampleCount() {
        return this.m_sampleCount;
  }
  subStepCount() {
        return this.m_subStepCount;
  }
  signalList() {
        return this.m_signals;
  }
  setSampleCount(item) {
                this.pushUndoSnapshot();
        this.m_sampleCount = item;
    for (let val of this.m_signals) {
      const tmp = this.getSignalEffectiveSampleCount(val);
            val.values.length = tmp;
      val.labels.length = tmp;
      val.segmentStyles.length = tmp;
    }
  }
  setSubStepCount(num) {
    if ((num < 0) && (num = 0), num === this.m_subStepCount)
      return;
    this.pushUndoSnapshot();
        const n = (this.m_subStepCount + 1);
    const item = (num + 1);
    const val = this.m_sampleCount;
    const tmp = (val * item);
    for (let v1 of this.m_signals) {
      if (v1.subSteps && v1.subSteps > 0)
        continue;
            const v2 = v1.values || [];
      const v3 = v1.labels || [];
      const v4 = v1.segmentStyles || [];
      const v5 = new Array(tmp)['fill'](-1);
      const v6 = new Array(tmp)['fill']('');
      const v7 = Array.from({ length: tmp }, () => new SegmentStyle());
      for (let count = 0; (count < val); count++) {
        for (let v8 = 0; (v8 < n); v8++) {
          const v9 = count * n + v8;
          if (v9 >= v2.length)
            continue;
                    const v10 = Math.floor((v8 * item / n));
          const v11 = count * item + v10;
          (v11 >= tmp) || (-1 !== v5[v11]) && 0 !== v8 || (v5[v11] = v2[v9], (v9 < v3.length) && (v6[v11] = v3[v9]), v9 < v4.length && (v7[v11] = v4[v9]));
        }
        if ((v1.type === SignalType.Bit)) {
          const v8 = v5[(count * item)];
          if (-1 !== v8)
            for (let v9 = 0; v9 < item; v9++) {
              const v10 = (count * item) + v9;
              (-1 === v5[v10]) && (v5[v10] = v8);
            }
        } else {
          if ((v1.type === SignalType.Vector)) {
                        const v8 = (count * item);
            const v9 = v5[v8];
            const v10 = v6[v8];
            const v11 = v7[v8];
            if (-1 !== v9)
              for (let v12 = 0; (v12 < item); v12++) {
                const v13 = (count * item + v12);
                -1 === v5[v13] && (v5[v13] = v9, v6[v13] = v10, v7[v13] = v11);
              }
          }
        }
      }
            v1.values = v5;
      v1.labels = v6;
      v1.segmentStyles = v7;
    }
        const fn = v1 => {
                if (v1 < 0)
          return -1;
                const v2 = Math.floor((v1 / n));
        const v3 = v1 % n;
        if ((v2 < 0) || v2 >= val)
          return -1;
        const v4 = Math.floor(((v3 * item) / n));
        let v5 = (v2 * item) + v4;
        return (v5 < 0) ? -1 : ((v5 >= tmp) && (v5 = (tmp - 1)), v5);
      };
    const v0 = v1 => {
                if (null == v1 || v1 < 0)
          return -1;
        const v2 = Math.floor(v1);
        return v2 < 0 || v2 >= val || (v2 >= val) ? -1 : v1;
      };
        this.m_markers = this.m_markers.map(v1 => ({
      ...v1,
      position: v0(v1.position)
    })).filter(v1 => v1.position >= 0 && v1.position <= val);
    this.m_timeJumps = this.m_timeJumps.map(v1 => ({
      ...v1,
      position: v0(v1.position)
    })).filter(v1 => v1.position >= 0 && v1.position <= val);
    this.m_arrows = this.m_arrows.map(cur => ({
      ...cur,
      startPosition: v0(cur.startPosition),
      endPosition: v0(cur.endPosition)
    })).filter(cur => cur.startPosition >= 0 && cur.endPosition >= 0);
    this.m_timeSpanMarkers = this.m_timeSpanMarkers.map(cur => ({
      ...cur,
      startPosition: v0(cur.startPosition),
      endPosition: v0(cur.endPosition)
    })).filter(cur => cur.startPosition >= 0 && cur.endPosition >= 0);
    this.m_textAnnotations = this.m_textAnnotations.map(v1 => ({
      ...v1,
      sample: 'number' == typeof v1.sample ? fn(v1.sample) : v1.sample
    })).filter(v1 => null === v1.sample || void (0) === v1.sample || v1.sample >= 0);
    this.m_subStepCount = num;
    this.dataChanged();
  }
  setSignalSubSteps(num, n) {
    if ((num < 0) || (num >= this.m_signals.length))
      return;
    n = Math.max(0, Math.min(16, n));
        const item = this['m_signals'][num];
    const val = item.subSteps || 0;
    if ((n === val))
      return;
    this.pushUndoSnapshot();
        const tmp = this.m_subStepCount;
    const v0 = val > 0 ? val : tmp;
    const v1 = n > 0 ? n : tmp;
    if (v0 === v1)
      return item.subSteps = n, void this.dataChanged();
        const v2 = this.m_sampleCount;
    const v3 = v0 + (1);
    const v4 = v1 + (1);
    const v5 = v2 * v4;
    const v6 = item.values || [];
    const v7 = item.labels || [];
    const v8 = item.segmentStyles || [];
    const v9 = new Array(v5)['fill'](-1);
    const v10 = new Array(v5)['fill']('');
    const v11 = Array.from({ length: v5 }, () => new SegmentStyle());
    for (let count = 0; count < v2; count++) {
            const v12 = (count * v3);
      const v13 = count * v4;
      (v12 < v6.length) && (v9[v13] = v6[v12], v12 < v7.length && (v10[v13] = v7[v12]), v12 < v8.length && (v11[v13] = v8[v12]));
      for (let v14 = 1; v14 < v3; v14++) {
        const v15 = ((count * v3) + v14);
        if (v15 >= v6.length)
          continue;
                const v16 = (v14 / v3);
        const v17 = Math.floor((v16 * v4));
        if ((0 === v17))
          continue;
        const v18 = (count * v4 + v17);
        (v18 >= v5) || (-1 === v9[v18]) && (v9[v18] = v6[v15], v15 < v7.length && (v10[v18] = v7[v15]), (v15 < v8.length) && (v11[v18] = v8[v15]));
      }
      if ((item.type === SignalType.Bit)) {
        const v14 = v9[v13];
        if (-1 !== v14)
          for (let v15 = 1; (v15 < v4); v15++) {
            const v16 = (count * v4) + v15;
            (-1 === v9[v16]) && (v9[v16] = v14);
          }
      } else {
        if (item.type === SignalType.Vector) {
                    const v14 = v9[v13];
          const v15 = v10[v13];
          const v16 = v11[v13];
          if (-1 !== v14)
            for (let v17 = 1; (v17 < v4); v17++) {
              const v18 = (count * v4) + v17;
              -1 === v9[v18] && (v9[v18] = v14, v10[v18] = v15, v11[v18] = v16);
            }
        }
      }
    }
        item.values = v9;
    item.labels = v10;
    item.segmentStyles = v11;
    item.subSteps = n;
    this.dataChanged();
  }
  addBitSignal(item) {
    this.pushUndoSnapshot();
        const val = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Bit, val);
    return tmp.values.fill(0), this.m_signals.push(tmp), (this.m_signals.length - 1);
  }
  // [PATCH-A3] 值 → 波形上显示的总线标签（原实现假定 value 恒为数字，
  // 遇到矢量信号的位串存储形态（"0101"）会原样返回或带出 0x/0b 前缀，
  // 历史上只能靠外部原型补丁兜底。这里改成同时支持两种值形态：
  //   · 位串字符串（"0101"）：手绘 / 导入 / 值输入写入矢量值的形态
  //   · 数字（5、-1）      ：核心生成器（ramp / walking-one / gray…）写入的形态
  // ⚠ 判定必须看「值的类型」而不是「字符串长得像不像位串」：数字 10 的 "10" 完全由
  //   0/1 组成，按位串解读会算出 2（十六进制该是 A）。只有真正的字符串才走位串分支。
  // 两种形态都按 radix 正确换算，且一律不带 0x/0b 前缀（波形上只显示数值本身）。
  valueToLabel(num, n) {
    if (num === -1 || num === '-1')
      return 'X';
    const item = String(num ?? '').trim();
    if (typeof num === 'string' && /^[01xz]+$/i['test'](item) && item.length > 1) {
      const arr = item.toLowerCase();
      if (/[xz]/['test'](arr))
        return arr.includes('z') && !arr.includes('x') ? 'Z' : 'X';
      if (n === Radix.Binary)
        return arr;
      const tmp = BigInt('0b' + arr);
      if (n === Radix.Decimal)
        return tmp.toString(10);
      return tmp.toString(16).toUpperCase().padStart(Math.ceil(arr.length / 4), '0');
    }
    const val = Number(num);
    if (!Number.isFinite(val))
      return item;
    if (n === Radix.Binary)
      return val.toString(2);
    if (n === Radix.Decimal)
      return val.toString(10);
    return val.toString(16).toUpperCase();
  }
  addVectorSignal(item) {
        this.pushUndoSnapshot();
        const val = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Vector, val);
    tmp.values.fill(-1);
    for (let count = 0; count < tmp.values.length; count++)
      tmp['labels'][count] = this.valueToLabel(tmp['values'][count], tmp.radix);
    return this.m_signals.push(tmp), this.m_signals.length - (1);
  }
  insertBlankRow(item, val = 0) {
        this.pushUndoSnapshot();
        const tmp = this.effectiveSampleCount();
    const signal = new Signal('', SignalType.BlankRow, tmp);
    return signal.uiRowHeightHint = val, this.m_signals.splice(item, 0, signal), item;
  }
  addBlankRow(item = 0) {
        this.pushUndoSnapshot();
        const val = this.effectiveSampleCount();
    const tmp = new Signal('', SignalType.BlankRow, val);
    return tmp.uiRowHeightHint = item, this.m_signals.push(tmp), this.m_signals.length - (1);
  }
  addClockSignal(item, val, count, v0) {
    this.pushUndoSnapshot();
        const num = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Bit, num);
        tmp.isClockPattern = true;
    tmp.clockHighSamples = count;
    tmp.clockLowSamples = v0;
    let n = 1;
    for (let v1 = 0; (v1 < num); v1++)
      tmp['values'][v1] = n, (1 === n) ? --count <= 0 && (n = 0, count = tmp.clockHighSamples) : --v0 <= 0 && (n = 1, v0 = tmp.clockLowSamples);
    return this.m_signals.push(tmp), this.m_signals.length - (1);
  }
  addCounterSignal(item, num, n, val) {
    if (this.pushUndoSnapshot(), (num < 0))
      return -1;
    const tmp = Math.abs(n) + Math.abs(val) + num;
    tmp > this.m_sampleCount && this.setSampleCount(tmp);
        const v0 = this.effectiveSampleCount();
    const v1 = this.m_subStepCount + (1);
    const signal = new Signal(item, SignalType.Vector, v0);
        signal.values.fill(0);
    signal.labels.fill('');
    for (let count = 0; (count < v0); count++) {
      const v2 = Math.floor((count / v1));
      if ((v2 < num))
        signal['values'][count] = 0, signal['labels'][count] = '';
      else {
        let v3 = n + (v2 - num);
                (v3 > val) && (v3 = val);
        signal['values'][count] = v3;
        signal['labels'][count] = String(v3);
      }
    }
    return this.m_signals.push(signal), (this.m_signals.length - 1);
  }
  addResetSignal(item, num, val) {
    this.pushUndoSnapshot();
        const n = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Bit, n);
    const v0 = val ? 1 : 0;
    const v1 = val ? 0 : 1;
    for (let count = 0; count < n; count++)
      tmp['values'][count] = (count < num) ? v0 : v1;
    return this.m_signals.push(tmp), this.m_signals.length - (1);
  }
  addPulseSignal(item, num, n) {
    this.pushUndoSnapshot();
        const val = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Bit, val);
    for (let count = 0; count < val; count++)
      tmp['values'][count] = (count >= num) && (count < num + n) ? 1 : 0;
    return this.m_signals.push(tmp), (this.m_signals.length - 1);
  }
  addStrobeSignal(item, num, n) {
    this.pushUndoSnapshot();
        const val = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Bit, val);
    for (let count = 0; (count < val); count++)
      tmp['values'][count] = count % num < n ? 1 : 0;
    return this.m_signals.push(tmp), (this.m_signals.length - 1);
  }
  addRampSignal(item, val, num, tmp) {
    this.pushUndoSnapshot();
        const n = this.effectiveSampleCount();
    const signal = new Signal(item, SignalType.Vector, n);
    let v0 = val;
    for (let count = 0; count < n; count++)
      signal['values'][count] = v0, signal['labels'][count] = v0.toString(), v0 += tmp, (v0 > num) && (v0 = val);
    return this.m_signals.push(signal), (this.m_signals.length - 1);
  }
  addPWMSignal(item, num, n) {
    this.pushUndoSnapshot();
        const val = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Bit, val);
    const v0 = Math.floor(num * n / (100));
    for (let count = 0; count < val; count++)
      tmp['values'][count] = ((count % num) < v0) ? 1 : 0;
    return this.m_signals.push(tmp), (this.m_signals.length - 1);
  }
  addWalkingOneSignal(item, num) {
    this.pushUndoSnapshot();
        const n = this.effectiveSampleCount();
    const val = new Signal(item, SignalType.Vector, n);
    for (let count = 0; (count < n); count++) {
      const tmp = 1 << (count % num);
            val['values'][count] = tmp;
      val['labels'][count] = tmp.toString(2).padStart(num, '0');
    }
    return this.m_signals.push(val), this.m_signals.length - (1);
  }
  addWalkingZeroSignal(item, num) {
    this.pushUndoSnapshot();
        const n = this.effectiveSampleCount();
    const val = new Signal(item, SignalType.Vector, n);
    for (let count = 0; count < n; count++) {
      const tmp = (~(1 << (count % num)) & (1 << num) - 1);
            val['values'][count] = tmp;
      val['labels'][count] = tmp.toString(2).padStart(num, '0');
    }
    return this.m_signals.push(val), this.m_signals.length - (1);
  }
  addBusIdleSignal(item, val) {
        this.pushUndoSnapshot();
        const num = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Vector, num);
    for (let count = 0; count < num; count++)
      tmp['values'][count] = val, tmp['labels'][count] = this.valueToLabel(val, tmp.radix);
    return this.m_signals.push(tmp), this.m_signals.length - (1);
  }
  addAlternatingSignal(item, val, tmp, num) {
    this.pushUndoSnapshot();
        const n = this.effectiveSampleCount();
    const signal = new Signal(item, SignalType.Vector, n);
    for (let count = 0; (count < n); count++) {
      const v0 = (Math.floor(count / num) % 2) == 0 ? val : tmp;
            signal['values'][count] = v0;
      signal['labels'][count] = this.valueToLabel(v0, signal.radix);
    }
    return this.m_signals.push(signal), this.m_signals.length - (1);
  }
  addGrayCodeSignal(item, num, n) {
    if (this.pushUndoSnapshot(), (num < 0) || (n < 0))
      return -1;
        const val = this.effectiveSampleCount();
    const tmp = new Signal(item, SignalType.Vector, val);
    const v0 = (Math.abs(n - num) + 1);
    const v1 = n >= num ? 1 : -1;
    const v2 = this.m_subStepCount + (1);
    for (let count = 0; (count < val); count++) {
            const v3 = num + ((Math.floor(count / v2) % v0) * v1);
      const v4 = v3 ^ (v3 >> 1);
            tmp['values'][count] = v4;
      tmp['labels'][count] = 'G' + v4.toString(16).toUpperCase().padStart(2, '0');
    }
    return this.m_signals.push(tmp), this.m_signals.length - (1);
  }
  setSignalRadix(num, item) {
    if ((num < 0) || num >= this.m_signals.length)
      return;
    const val = this['m_signals'][num];
    if ((val.type === SignalType.Vector)) {
            this.pushUndoSnapshot();
      val.radix = item;
      for (let count = 0; count < val.values.length; count++)
        val['labels'][count] = this.valueToLabel(val['values'][count], val.radix);
      this.dataChanged();
    }
  }
  getGroupNames() {
        if ('undefined' != typeof GroupManager)
      return GroupManager.getGroupNames(this);
    const item = new Set();
    for (const val of this.m_signals)
      val.groupName && item.add(val.groupName);
    return Array.from(item);
  }
  pushUndoSnapshot() {
  }
  invalidateWaveDromPreservedData() {
                this.m_waveDromEdges = null;
        this.m_waveDromSignalStructure = null;
    for (const item of this.m_signals)
      item.waveDromNode = null, item.waveDromWave = null, item.waveDromChars = null;
  }
  dataChanged() {
        this.m_modified = true;
    'undefined' != typeof WaveDromIO && WaveDromIO.clearDocumentWaveDromPreserved && WaveDromIO.clearDocumentWaveDromPreserved(this);
    (('function') == typeof invalidateDynamicNameWidthCache) && (invalidateDynamicNameWidthCache());
    'function' == typeof drawWaveform && (drawWaveform());
  }
  updateTextAnnotationsAfterArrowRemove(num) {
        this.m_textAnnotations = this.m_textAnnotations.filter(item => !('Arrow' === item.anchorType && item.anchorId === num));
  }
}
'undefined' != typeof window && (window.Signal = Signal, window.SegmentStyle = SegmentStyle, window.WaveDocument = WaveDocument);
WaveDocument.prototype.addArrow = function (num, n, item, val, tmp = '~>') {
    const v0 = this.m_signals.length;
  const v1 = this.m_sampleCount;
  if (num < 0 || num >= v0)
    return -1;
  if ((item < 0) || (item >= v0))
    return -1;
  if (n < 0 || n > v1)
    return -1;
  if ((val < 0) || (val > v1))
    return -1;
  this.pushUndoSnapshot();
  const obj = {
    id: this.m_nextArrowId++,
    startSignal: num,
    startPosition: n,
    endSignal: item,
    endPosition: val,
    style: tmp,
    color: null
  };
  return this.m_arrows.push(obj), this.dataChanged(), obj.id;
};
WaveDocument.prototype.subArrowById = function (num) {
  const n = this.m_arrows.findIndex(item => item.id === num);
  if ((-1 !== n)) {
    if (this.pushUndoSnapshot(), this.m_arrows.splice(n, 1), this.updateTextAnnotationsAfterArrowRemove(num), 0 === this.m_arrows.length)
      this.m_nextArrowId = 1;
    else {
      let item = 0;
      for (const val of this.m_arrows)
        (val.id > item) && (item = val.id);
      this.m_nextArrowId = (item + 1);
    }
    this.dataChanged();
  }
};
WaveDocument.prototype.clearArrows = function () {
        this.pushUndoSnapshot();
    this.m_textAnnotations = this.m_textAnnotations.filter(item => item.anchorType !== TextAnchorType.Arrow);
    this.m_arrows = [];
    this.m_nextArrowId = 1;
    this.dataChanged();
};
WaveDocument.prototype.setArrowColor = function (item) {
    item && (this.pushUndoSnapshot(), this.m_arrowColor = item, this.dataChanged());
};
WaveDocument.prototype.setArrowColorById = function (num, item) {
    if (!item)
    return;
  const val = this.m_arrows.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.color = item, this.dataChanged());
};
WaveDocument.prototype.setArrowStyleById = function (num, item) {
    if (!item)
    return;
  const val = this.m_arrows.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.style = item, this.dataChanged());
};
WaveDocument.prototype.arrowList = function () {
    return this.m_arrows;
};
const TextAnchorType = {
  Arrow: 'Arrow',
  Signal: 'Signal',
  BlankRow: 'BlankRow',
  FreeForm: 'FreeForm'
};
WaveDocument.prototype.addMarker = function (num, item = null) {
  const n = this.m_sampleCount;
  if (num < 0 || (num > n))
    return -1;
  this.pushUndoSnapshot();
  const val = {
    id: this.m_nextMarkerId++,
    position: num,
    color: item
  };
  return this.m_markers.push(val), this.dataChanged(), val.id;
};
WaveDocument.prototype.subMarkerById = function (num) {
  const n = this.m_markers.findIndex(item => item.id === num);
  if (-1 !== n) {
        this.pushUndoSnapshot();
    this.m_markers.splice(n, 1);
    for (let count = 0; count < this.m_markers.length; count++)
      this['m_markers'][count].id = count + (1);
        this.m_nextMarkerId = this.m_markers.length + (1);
    this.dataChanged();
  }
};
WaveDocument.prototype.clearMarkers = function () {
        this.pushUndoSnapshot();
    this.m_markers = [];
    this.m_nextMarkerId = 1;
    this.dataChanged();
};
WaveDocument.prototype.markerList = function () {
    return this.m_markers;
};
WaveDocument.prototype.addTimeJump = function (num, item = null) {
  const n = this.m_sampleCount;
  if (num < 0 || (num > n))
    return -1;
  this.pushUndoSnapshot();
  const val = {
    id: this.m_nextTimeJumpId++,
    position: num,
    color: item
  };
  return this.m_timeJumps.push(val), this.dataChanged(), val.id;
};
WaveDocument.prototype.subTimeJumpById = function (num) {
  const n = this.m_timeJumps.findIndex(item => item.id === num);
  if (-1 !== n) {
    if (this.pushUndoSnapshot(), this.m_timeJumps.splice(n, 1), (0 === this.m_timeJumps.length))
      this.m_nextTimeJumpId = 1;
    else {
      let item = 0;
      for (const val of this.m_timeJumps)
        (val.id > item) && (item = val.id);
      this.m_nextTimeJumpId = (item + 1);
    }
    this.dataChanged();
  }
};
WaveDocument.prototype.clearTimeJumps = function () {
        this.pushUndoSnapshot();
    this.m_timeJumps = [];
    this.m_nextTimeJumpId = 1;
    this.dataChanged();
};
WaveDocument.prototype.timeJumpList = function () {
    return this.m_timeJumps;
};
WaveDocument.prototype.setMarkerColorById = function (num, item) {
    if (!item)
    return;
  const val = this.m_markers.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.color = item, this.dataChanged());
};
WaveDocument.prototype.setTimeJumpColorById = function (num, item) {
    if (!item)
    return;
  const val = this.m_timeJumps.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.color = item, this.dataChanged());
};
WaveDocument.prototype.setMarkerPosition = function (num, n, item = true) {
  const val = this.m_markers.find(v0 => v0.id === num);
  if (!val)
    return;
  const tmp = this.m_sampleCount;
  (n < 0) || n > tmp || (item && this.pushUndoSnapshot(), val.position = n, this.dataChanged());
};
WaveDocument.prototype.setTimeJumpPosition = function (num, n, item = true) {
  const val = this.m_timeJumps.find(v0 => v0.id === num);
  if (!val)
    return;
  const tmp = this.m_sampleCount;
  (n < 0) || (n > tmp) || (item && this.pushUndoSnapshot(), val.position = n, this.dataChanged());
};
WaveDocument.prototype.addTimeSpanMarker = function (num, n, item, val, tmp = '-|') {
    const v0 = this.m_signals.length;
  const v1 = this.m_sampleCount;
  if ((num < 0) || num >= v0)
    return -1;
  if (item < 0 || (item >= v0))
    return -1;
  if (n < 0 || (n > v1))
    return -1;
  if ((val < 0) || (val > v1))
    return -1;
  this.pushUndoSnapshot();
  const obj = {
    id: this.m_nextTimeSpanMarkerId++,
    startSignal: num,
    startPosition: n,
    endSignal: item,
    endPosition: val,
    style: tmp,
    color: null
  };
  return this.m_timeSpanMarkers.push(obj), this.dataChanged(), obj.id;
};
WaveDocument.prototype.subTimeSpanMarkerById = function (num) {
  const n = this.m_timeSpanMarkers.findIndex(item => item.id === num);
  if ((-1 !== n)) {
    if (this.pushUndoSnapshot(), this.m_timeSpanMarkers.splice(n, 1), (0 === this.m_timeSpanMarkers.length))
      this.m_nextTimeSpanMarkerId = 1;
    else {
      let item = 0;
      for (const val of this.m_timeSpanMarkers)
        (val.id > item) && (item = val.id);
      this.m_nextTimeSpanMarkerId = (item + 1);
    }
    this.dataChanged();
  }
};
WaveDocument.prototype.clearTimeSpanMarkers = function () {
        this.pushUndoSnapshot();
    this.m_timeSpanMarkers = [];
    this.m_nextTimeSpanMarkerId = 1;
    this.dataChanged();
};
WaveDocument.prototype.timeSpanMarkerList = function () {
    return this.m_timeSpanMarkers;
};
WaveDocument.prototype.setTimeSpanMarkerColor = function (num, item) {
    if (!item)
    return;
  const val = this.m_timeSpanMarkers.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.color = item, this.dataChanged());
};
WaveDocument.prototype.setTimeSpanMarkerStyle = function (num, item) {
    if (!item)
    return;
  const val = this.m_timeSpanMarkers.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.style = item, this.dataChanged());
};
WaveDocument.prototype.addTextAnnotation = function (item, val, tmp, v0 = 0, v1 = 'Above', v2 = 0) {
    this.pushUndoSnapshot();
  const obj = {
    id: this.m_nextTextAnnotationId++,
    anchorType: item,
    anchorId: val,
    text: tmp,
    position: v0,
    vPos: v1,
    yOffset: v2,
    color: null,
    backgroundColor: null,
    fontSize: 12,
    bold: false
  };
  return this.m_textAnnotations.push(obj), this.dataChanged(), obj.id;
};
WaveDocument.prototype.removeTextAnnotation = function (num) {
  const n = this.m_textAnnotations.findIndex(item => item.id === num);
  -1 !== n && (this.pushUndoSnapshot(), this.m_textAnnotations.splice(n, 1), this.dataChanged());
};
WaveDocument.prototype.setTextAnnotationText = function (num, item) {
  const val = this.m_textAnnotations.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.text = item, this.dataChanged());
};
WaveDocument.prototype.setTextAnnotationColor = function (num, item) {
  const val = this.m_textAnnotations.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.color = item, this.dataChanged());
};
WaveDocument.prototype.textAnnotationList = function () {
    return this.m_textAnnotations;
};
WaveDocument.prototype.setTextAnnotationPosition = function (num, n, item = null, val = true) {
  const tmp = this.m_textAnnotations.find(v0 => v0.id === num);
  if (tmp && !((n < 0) || (n > this.m_sampleCount))) {
    if (val && this.pushUndoSnapshot(), tmp.position = n, null !== item && ((('Signal') === tmp.anchorType) || ('BlankRow') === tmp.anchorType)) {
      const v0 = this.signalList();
      (item >= 0) && (item < v0.length) && (tmp.anchorId = item);
    }
    this.dataChanged();
  }
};
WaveDocument.prototype.setTextAnnotationFontSize = function (num, item) {
  const val = this.m_textAnnotations.find(v0 => v0.id === num);
  if (!val)
    return;
  const tmp = Math.max(8, Math.min(48, item));
    this.pushUndoSnapshot();
  val.fontSize = tmp;
  this.dataChanged();
};
WaveDocument.prototype.setTextAnnotationBold = function (num, item) {
  const val = this.m_textAnnotations.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.bold = !!item, this.dataChanged());
};
WaveDocument.prototype.setTextAnnotationBackgroundColor = function (num, item) {
  const val = this.m_textAnnotations.find(tmp => tmp.id === num);
  val && (this.pushUndoSnapshot(), val.backgroundColor = item, this.dataChanged());
};
WaveDocument.prototype.setTextAnnotationVPos = function (num, item) {
  const val = this.m_textAnnotations.find(tmp => tmp.id === num);
  val && [
    ('Above'),
    'Center',
    ('Below')
  ].includes(item) && (this.pushUndoSnapshot(), val.vPos = item, this.dataChanged());
};
WaveDocument.prototype.removeSignal = function (num) {
  if (!(num < 0 || (num >= this.m_signals.length))) {
        this.pushUndoSnapshot();
    this.m_signals.splice(num, 1);
    this.m_arrows = this.m_arrows.filter(item => item.startSignal !== num && item.endSignal !== num);
    for (const item of this.m_arrows)
      item.startSignal > num && item.startSignal--, (item.endSignal > num) && item.endSignal--;
    this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(item => item.startSignal !== num && item.endSignal !== num);
    for (const item of this.m_timeSpanMarkers)
      (item.startSignal > num) && item.startSignal--, (item.endSignal > num) && item.endSignal--;
        this.invalidateWaveDromPreservedData();
    this.dataChanged();
  }
};
WaveDocument.prototype.moveSignal = function (num, n) {
  if (num < 0 || num >= this.m_signals.length)
    return;
  if ((n < 0) || (n >= this.m_signals.length))
    return;
  if ((num === n))
    return;
  this.pushUndoSnapshot();
  const item = this['m_signals'][num];
    this.m_signals.splice(num, 1);
  this.m_signals.splice(n, 0, item);
  const val = tmp => num < n ? tmp === num ? n : tmp > num && tmp <= n ? tmp - (1) : tmp : tmp === num ? n : tmp >= n && tmp < num ? tmp + (1) : tmp;
  for (const tmp of this.m_arrows)
    tmp.startSignal, tmp.endSignal, tmp.startSignal = val(tmp.startSignal), tmp.endSignal = (val(tmp.endSignal));
  for (const tmp of this.m_timeSpanMarkers)
    tmp.startSignal = val(tmp.startSignal), tmp.endSignal = val(tmp.endSignal);
    this.invalidateWaveDromPreservedData();
  this.dataChanged();
};
WaveDocument.prototype.moveSignals = function (item, num) {
  if (!item || (0 === item.length))
    return [];
    const n = this.m_signals.length;
  const arr = [...item].sort((v4, v5) => v4 - v5);
  for (const v4 of arr)
    if ((v4 < 0) || v4 >= n)
      return [];
    num < 0 && (num = 0);
  (num > n - arr.length) && (num = n - arr.length);
  const val = arr[0];
  if (num === val)
    return [...arr];
  this.pushUndoSnapshot();
    const v0 = arr.map(v4 => this['m_signals'][v4]);
  const v1 = this.m_signals.filter((v4, v5) => !arr.includes(v5));
  const tmp = v4 => {
      const v5 = arr.indexOf(v4);
      if (-1 !== v5)
        return (num + v5);
      let count = 0;
      for (const v7 of arr)
        v7 < v4 && count++;
      let v6 = v4 - count;
      return v6 >= num && (v6 += v0.length), v6;
    };
  for (const v4 of this.m_arrows)
    v4.startSignal = (tmp(v4.startSignal)), v4.endSignal = tmp(v4.endSignal);
  for (const v4 of this.m_timeSpanMarkers)
    v4.startSignal = (tmp(v4.startSignal)), v4.endSignal = (tmp(v4.endSignal));
  const v2 = [
    ...v1.slice(0, num),
    ...v0,
    ...v1.slice(num)
  ];
  this.m_signals = v2;
  const v3 = v0.map((v4, v5) => num + v5);
  return this.invalidateWaveDromPreservedData(), this.dataChanged(), v3;
};
WaveDocument.prototype.removeSignals = function (item) {
  if (!item || (0 === item.length))
    return;
  const arr = [...item].sort((num, n) => n - num);
  if (arr.some(num => num >= 0 && num < this.m_signals.length)) {
    this.pushUndoSnapshot();
    for (const num of arr)
      if (!(num < 0 || num >= this.m_signals.length)) {
                this.m_signals.splice(num, 1);
        this.m_arrows = this.m_arrows.filter(val => val.startSignal !== num && val.endSignal !== num);
        for (const val of this.m_arrows)
          (val.startSignal > num) && val.startSignal--, val.endSignal > num && val.endSignal--;
        this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(val => val.startSignal !== num && val.endSignal !== num);
        for (const val of this.m_timeSpanMarkers)
          val.startSignal > num && val.startSignal--, (val.endSignal > num) && val.endSignal--;
      }
        this.invalidateWaveDromPreservedData();
    this.dataChanged();
  }
};
WaveDocument.prototype.setSignalsColor = function (arr, item) {
    if (arr && 0 !== arr.length && arr.some(num => num >= 0 && num < this.m_signals.length)) {
    this.pushUndoSnapshot();
    for (const num of arr)
      num >= 0 && num < this.m_signals.length && (this['m_signals'][num].color = item);
    this.dataChanged();
  }
};
WaveDocument.prototype.setSignalColor = function (num, n) {
    num < 0 || num >= this.m_signals.length || void (0) !== n && (this.pushUndoSnapshot(), this['m_signals'][num].color = n, this.dataChanged());
};
WaveDocument.prototype.setSignalName = function (num, n) {
  (num < 0) || num >= this.m_signals.length || void (0) !== n && (this.pushUndoSnapshot(), this['m_signals'][num].name = n, this.dataChanged());
};
WaveDocument.prototype.setSignalRiseFallTime = function (num, n, item) {
  num < 0 || num >= this.m_signals.length || (void 0 !== n) && void (0) !== item && (this.pushUndoSnapshot(), this['m_signals'][num].riseTime = n, this['m_signals'][num].fallTime = item, this.dataChanged());
};
WaveDocument.prototype.clearAllSignals = function () {
        this.pushUndoSnapshot();
    Array.isArray(this.m_textAnnotations) && (this.m_textAnnotations = this.m_textAnnotations.filter(item => item.anchorType !== TextAnchorType.Signal && item.anchorType !== TextAnchorType.BlankRow));
    this.m_signals = [];
    this.dataChanged();
};
WaveDocument.prototype.clearAllWaveView = function () {
        this.pushUndoSnapshot();
    this.m_textAnnotations = [];
    this.m_nextTextAnnotationId = 1;
    this.m_arrows = [];
    this.m_nextArrowId = 1;
    this.m_markers = [];
    this.m_nextMarkerId = 1;
    this.m_timeJumps = [];
    this.m_nextTimeJumpId = 1;
    this.m_timeSpanMarkers = [];
    this.m_nextTimeSpanMarkerId = 1;
    this.m_signals = [];
    this.dataChanged();
};
WaveDocument.prototype.setSegmentStyle = function (num, n, item = null, val = false) {
  if ((num < 0) || (num >= this.m_signals.length))
    return;
  const tmp = this['m_signals'][num];
  n < 0 || n >= tmp.values.length || (this.pushUndoSnapshot(), tmp['segmentStyles'][n] = new SegmentStyle(item, val), this.dataChanged());
};
WaveDocument.prototype.shiftSignalValues = function (num, n) {
  if (num < 0 || (num >= this.m_signals.length))
    return;
  const item = this['m_signals'][num];
  if (!item || item.type === SignalType.BlankRow)
    return;
  if (!item.values || 0 === item.values.length)
    return;
  this.pushUndoSnapshot();
  const val = (arr, tmp) => {
        if (arr && 0 !== arr.length) {
      if (n > 0) {
        const v0 = tmp ? tmp(arr[0]) : arr[0];
                arr.pop();
        arr.unshift(v0);
      } else {
        const v0 = tmp ? tmp(arr[(arr.length - 1)]) : arr[(arr.length - 1)];
                arr.shift();
        arr.push(v0);
      }
    }
  };
    (val(item.values));
  (val(item.labels));
  val(item.segmentStyles, tmp => tmp ? { ...tmp } : tmp);
  val(item.driveStrengths);
  val(item.clockMarkers);
  (val(item.waveDromColorCodes));
  this.dataChanged();
};
WaveDocument.prototype.clearSegmentStyle = function (num, n) {
  if (num < 0 || num >= this.m_signals.length)
    return;
  const item = this['m_signals'][num];
  (n < 0) || (n >= item.values.length) || (this.pushUndoSnapshot(), item['segmentStyles'][n] = new SegmentStyle(), this.dataChanged());
};
const Selection = {
  startSignal: -1,
  endSignal: -1,
  startSample: -1,
  endSample: -1,
  active: false
};
function isInSelection(num, n) {
  if (!Selection.active)
    return false;
    const item = Math.min(Selection.startSignal, Selection.endSignal);
  const val = Math.max(Selection.startSignal, Selection.endSignal);
  const tmp = Math.min(Selection.startSample, Selection.endSample);
  const v0 = Math.max(Selection.startSample, Selection.endSample);
  return (num >= item) && (num <= val) && (n >= tmp) && (n <= v0);
}
function clearSelection() {
        Selection.startSignal = -1;
    Selection.endSignal = -1;
    Selection.startSample = -1;
    Selection.endSample = -1;
    Selection.active = false;
}
WaveDocument.prototype.cutSelection = function () {
    return !!this.copySelection() && (this.deleteSelection(), true);
};
WaveDocument.prototype.copySelection = function () {
    return this.m_hasBlockClipboard = true, true;
};
WaveDocument.prototype.paste = function () {
    return !!this.m_hasBlockClipboard && (this.pushUndoSnapshot(), this.dataChanged(), true);
};
WaveDocument.prototype.deleteSelection = function () {
        this.pushUndoSnapshot();
    this.dataChanged();
};
WaveDocument.prototype.deleteRange = function (num, n) {
  const item = this.m_subStepCount + (1);
  const val = this.effectiveSampleCount();
  if (num < 0 && (num = 0), (n > val) && (n = val), (num >= n))
    return;
  this.pushUndoSnapshot();
    const tmp = (num / item);
  const v0 = n / item;
  const v1 = (v0 - tmp);
  const v2 = Math.max(1, Math.ceil((this.m_sampleCount - v1)));
  for (const v3 of this.m_signals) {
    if (v3.type === SignalType.BlankRow)
      continue;
        const v4 = (v3.subSteps && v3.subSteps > 0 ? v3.subSteps : this.m_subStepCount) + (1);
    const v5 = Math.round((tmp * v4));
    const v6 = Math.round(v0 * v4);
    const v7 = (v2 * v4);
    const v8 = (arr, v9) => {
                if (!arr)
          return arr;
        const v10 = arr.slice(0, v5).concat(arr.slice(v6));
        for (; (v10.length < v7);)
          v10.push((('function') == typeof v9) ? v9() : v9);
        return v10.slice(0, v7);
      };
        v3.values = v8(v3.values, -1);
    v3.labels = (v8(v3.labels, ''));
    v3.segmentStyles = (v8(v3.segmentStyles, () => new SegmentStyle()));
    v3.driveStrengths = v8(v3.driveStrengths, 0);
    v3.clockMarkers = v8(v3.clockMarkers, false);
    v3.waveDromColorCodes = v8(v3.waveDromColorCodes, null);
  }
    this.m_markers = this.m_markers.filter(v3 => !(v3.position >= tmp && v3.position < v0 || (v3.position >= v0 && (v3.position -= v1), 0)));
  this.m_timeJumps = this.m_timeJumps.filter(v3 => !(v3.position >= tmp && v3.position < v0 || (v3.position >= v0 && (v3.position -= v1), 0)));
  const fn = v3 => v3 >= v0 ? v3 - v1 : v3 > tmp ? tmp : v3;
    this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(cur => (cur.startPosition = fn(cur.startPosition), cur.endPosition = fn(cur.endPosition), cur.startPosition < cur.endPosition));
  this.m_arrows = this.m_arrows.filter(cur => {
        const v3 = cur.startPosition >= tmp && cur.startPosition < v0;
    const v4 = (cur.endPosition >= tmp) && (cur.endPosition < v0);
    return (v3 || v4) ? (this.updateTextAnnotationsAfterArrowRemove(cur.id), false) : (cur.startPosition >= v0 && (cur.startPosition -= v1), (cur.endPosition >= v0) && (cur.endPosition -= v1), true);
  });
  this.m_textAnnotations = this.m_textAnnotations.filter(cur => {
        if ((('Arrow') === cur.anchorType))
      return true;
        const v3 = (this['m_signals'][cur.anchorId]?.['subSteps'] || this.m_subStepCount) + (1);
    const v4 = Math.round((tmp * v3));
    const v5 = Math.round(v0 * v3);
    return !(cur.sample >= v4 && (cur.sample < v5) || ((cur.sample >= v5) && (cur.sample -= (v5 - v4)), 0));
  });
  this.m_sampleCount = v2;
  const el = document.getElementById(('sample-spin'));
    el && (el.value = this.m_sampleCount);
  this.dataChanged();
};
WaveDocument.prototype.cropToRange = function (num, n) {
    const item = this.m_subStepCount + (1);
  const val = this.effectiveSampleCount();
  if (num < 0 && (num = 0), (n > val) && (n = val), (num >= n))
    return;
  this.pushUndoSnapshot();
    const tmp = (n - num);
  const v0 = Math.ceil(tmp / item);
  for (const v5 of this.m_signals) {
    if ((v5.type === SignalType.BlankRow))
      continue;
        const arr = v5.values.slice(num, n);
    const v6 = v5.labels.slice(num, n);
    const v7 = v5.segmentStyles.slice(num, n);
    const v8 = (v0 * item);
    for (; (arr.length < v8);)
      arr.push(-1), v6.push(''), v7.push(new SegmentStyle());
        v5.values = arr;
    v5.labels = v6;
    v5.segmentStyles = v7;
  }
    const v1 = num / item;
  const v2 = (n / item);
  const v3 = v1;
    this.m_markers = this.m_markers.filter(v5 => !(v5.position < v1 || v5.position >= v2 || (v5.position -= v3, 0)));
  this.m_timeJumps = this.m_timeJumps.filter(v5 => !(v5.position < v1 || v5.position >= v2 || (v5.position -= v3, 0)));
  this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(cur => !(cur.endPosition <= v1 || cur.startPosition >= v2 || (cur.startPosition = Math.max(0, cur.startPosition - v3), cur.endPosition = Math.min(v0, cur.endPosition - v3), cur.startPosition >= cur.endPosition)));
  this.m_arrows = this.m_arrows.filter(cur => cur.startPosition < v1 || cur.startPosition >= v2 || cur.endPosition < v1 || cur.endPosition >= v2 ? (this.updateTextAnnotationsAfterArrowRemove(cur.id), false) : (cur.startPosition -= v3, cur.endPosition -= v3, true));
  const v4 = num;
    this.m_textAnnotations = this.m_textAnnotations.filter(cur => {
        if (('Arrow') === cur.anchorType)
      return true;
    this['m_signals'][cur.anchorId]?.['subSteps'] || this.m_subStepCount;
    const v5 = cur.sample;
    return !(v5 < num || v5 >= n || (cur.sample -= v4, 0));
  });
  this.m_sampleCount = v0;
  const el = document.getElementById(('sample-spin'));
    el && (el.value = this.m_sampleCount);
  this.dataChanged();
};
const GROUP_VISUAL = {
  bracketWidth: 10,
  bracketPadding: 32,
  curveRadius: 5,
  lineWidth: 2,
  signalIndent: 12,
  subgroupIndent: 24,
  defaultColor: '#6496C8',
  headerHeight: 24,
  headerPadding: 4,
  depthColors: [
    '#6496C8',
    '#96C864',
    '#C89664',
    '#9664C8',
    '#64C896'
  ]
};
function getGroupDepth(item) {
    return item ? (item.match(/\//g) || [])['length'] : 0;
}
function getParentGroupName(arr) {
    return arr && arr.includes('/') ? arr.substring(0, arr.lastIndexOf('/')) : null;
}
function getShortGroupName(arr) {
  if (!arr)
    return '';
  const num = arr.lastIndexOf('/');
  return num >= 0 ? arr.substring((num + 1)) : arr;
}
function getGroups(item) {
  const val = item.m_signals || [];
  const tmp = new Map();
  for (let count = 0; (count < val.length); count++) {
        const v0 = val[count];
    const v1 = v0.groupName || null;
    if (v1) {
      tmp.has(v1) ? tmp.get(v1).endIndex = count : tmp.set(v1, {
        name: v1,
        shortName: getShortGroupName(v1),
        color: v0.groupColor || GROUP_VISUAL.defaultColor,
        startIndex: count,
        endIndex: count,
        depth: (getGroupDepth(v1))
      });
      let v2 = getParentGroupName(v1);
      for (; v2;) {
        if (tmp.has(v2)) {
          const v3 = tmp.get(v2);
                    count < v3.startIndex && (v3.startIndex = count);
          (count > v3.endIndex) && (v3.endIndex = count);
        } else
          tmp.set(v2, {
            name: v2,
            shortName: getShortGroupName(v2),
            color: v0.groupColor || GROUP_VISUAL.defaultColor,
            startIndex: count,
            endIndex: count,
            depth: (getGroupDepth(v2))
          });
        v2 = (getParentGroupName(v2));
      }
    }
  }
  return Array.from(tmp.values()).sort((cur, data) => cur.depth !== data.depth ? cur.depth - data.depth : cur.startIndex - data.startIndex);
}
function getSignalGroupName(item, num) {
  const val = item.m_signals || [];
  return (num < 0) || num >= val.length ? null : val[num].groupName || null;
}
function isSignalInGroup(item, val) {
  return (null !== (getSignalGroupName(item, val)));
}
function getSignalsInGroup(item, num) {
    const val = item.m_signals || [];
  const arr = [];
  for (let count = 0; count < val.length; count++)
    val[count].groupName === num && arr.push(count);
  return arr;
}
function getSignalsInGroupRecursive(item, num) {
  const val = item.m_signals || [];
  const arr = [];
  const tmp = num + '/';
  for (let count = 0; (count < val.length); count++) {
    const n = val[count].groupName;
    n && ((n === num) || n.startsWith(tmp)) && arr.push(count);
  }
  return arr;
}
function getGroupContainingSignal(item, num) {
  const val = getGroups(item);
  for (const tmp of val)
    if (num >= tmp.startIndex && num <= tmp.endIndex)
      return tmp;
  return null;
}
function createGroup(item, val, tmp, v0 = null) {
    const v1 = item.m_signals || [];
  const v2 = v0 || GROUP_VISUAL.defaultColor;
  for (const num of tmp)
    num >= 0 && num < v1.length && (v1[num].groupName = val, v1[num].groupColor = v2);
}
function addSignalsToGroup(item, num, val) {
  const tmp = item.m_signals || [];
  let v0 = GROUP_VISUAL.defaultColor;
  for (const v1 of tmp)
    if (v1.groupName === num && v1.groupColor) {
      v0 = v1.groupColor;
      break;
    }
  for (const n of val)
    (n >= 0) && n < tmp.length && (tmp[n].groupName = num, tmp[n].groupColor = v0);
}
function removeSignalsFromGroup(item, val) {
  const tmp = item.m_signals || [];
  for (const num of val)
    (num >= 0) && (num < tmp.length) && (tmp[num].groupName = null, tmp[num].groupColor = null);
}
function renameGroup(item, num, val) {
  const tmp = item.m_signals || [];
  for (const v0 of tmp)
    (v0.groupName === num) && (v0.groupName = val);
}
function setGroupColor(item, num, val) {
  const tmp = item.m_signals || [];
  for (const v0 of tmp)
    (v0.groupName === num) && (v0.groupColor = val);
}
function deleteGroup(item, num) {
  const val = item.m_signals || [];
  for (const tmp of val)
    tmp.groupName === num && (tmp.groupName = null, tmp.groupColor = null);
}
function getGroupNames(item) {
    const val = item.m_signals || [];
  const tmp = new Set();
  for (const v0 of val)
    v0.groupName && tmp.add(v0.groupName);
  return Array.from(tmp);
}
function drawGroupBrackets(v0, item, val, num, n, tmp) {
  const v1 = getGroups(item);
  if (0 === v1.length)
    return;
  getComputedStyle(document.body).getPropertyValue('--canvas-text').trim();
  const v2 = [...v1].sort((v3, v4) => v3.depth - v4.depth);
  for (const v3 of v2) {
        const v4 = ((num + (v3.startIndex * n)) + 6);
    const v5 = (num + ((v3.endIndex + 1) * n)) - (6);
    const v6 = v5 - v4;
    if (v6 < 10)
      continue;
        const v7 = v3.depth * GROUP_VISUAL.subgroupIndent;
    const v8 = (GROUP_VISUAL.bracketPadding + v7);
    const v9 = 8;
    const v10 = v3.depth % GROUP_VISUAL.depthColors.length;
    const v11 = GROUP_VISUAL['depthColors'][v10];
    const v12 = v3.color || v11;
        v0.strokeStyle = v12;
    v0.fillStyle = v12;
    v0.lineWidth = GROUP_VISUAL.lineWidth;
    v0.lineCap = ('round');
    v0.lineJoin = ('round');
    v0.setLineDash([]);
    const v13 = Math.min(GROUP_VISUAL.curveRadius, (v6 / 4));
        v0.beginPath();
    v0.moveTo(v8 + v9, v4);
    v0.lineTo(v8 + v13, v4);
    v0.quadraticCurveTo(v8, v4, v8, v4 + v13);
    v0.lineTo(v8, (v5 - v13));
    v0.quadraticCurveTo(v8, v5, (v8 + v13), v5);
    v0.lineTo(v8 + v9, v5);
    v0.stroke();
    const v14 = v3.shortName || v3.name;
    if (v14 && v6 > 20) {
            v0.save();
      v0.font = ('bold 11px Arial, sans-serif');
      v0.fillStyle = v12;
            const v15 = v8 - (3);
      const v16 = v4 + v6 / (2);
            v0.translate(v15, v16);
      v0.rotate(-Math.PI / (2));
      v0.textAlign = ('center');
      v0.textBaseline = ('bottom');
      let arr = v14;
      const v17 = v6 - (8);
      let v18 = v0.measureText(arr).width;
      for (; v18 > v17 && arr.length > 1;)
        arr = arr.slice(0, -1), v18 = v0.measureText(arr + '\u2026').width;
            (arr !== v14) && arr.length > 0 && (arr += '\u2026');
      v0.fillText(arr, 0, 0);
      v0.restore();
    }
  }
}
function getSignalNameIndent(item, num) {
  const val = item.m_signals || [];
  if (num < 0 || num >= val.length)
    return 0;
  const tmp = val[num].groupName;
  if (!tmp)
    return 0;
  const n = getGroupDepth(tmp);
  return (GROUP_VISUAL.signalIndent + n * GROUP_VISUAL.subgroupIndent);
}
function hitTestGroupBracket(item, num, n, val, tmp, v0) {
  const arr = getGroups(item);
  if (0 === arr.length)
    return null;
  for (let count = arr.reduce((v1, v2) => Math.max(v1, v2.depth), 0); count >= 0; count--) {
    const v1 = arr.filter(v2 => v2.depth === count);
    for (const v2 of v1) {
            const v3 = ((GROUP_VISUAL.bracketPadding + (count * GROUP_VISUAL.subgroupIndent)) - 20);
      const v4 = (GROUP_VISUAL.bracketPadding + (count + 1) * GROUP_VISUAL.subgroupIndent - 5);
      const v5 = val + v2.startIndex * tmp;
      const v6 = val + (v2.endIndex + (1)) * tmp;
      if ((n >= v5) && n <= v6 && num >= v3 && (num < v4))
        return v2;
    }
  }
  return null;
}
function isDrawableSignalType(num) {
  return (num === SignalType.Bit) || (num === SignalType.Vector);
}
function getSignalTypeName(item) {
  switch (item) {
  case SignalType.Bit:
    return 'Bit';
  case SignalType.Vector:
    return ('Vector');
  case SignalType.BlankRow:
    return 'Blank Row';
  default:
    return ('Unknown');
  }
}
function getRadixName(item) {
  switch (item) {
  case Radix.Hexadecimal:
    return ('Hex');
  case Radix.Decimal:
    return 'Dec';
  case Radix.Binary:
    return ('Bin');
  default:
    return ('Unknown');
  }
}
'undefined' != typeof window && (window.GroupManager = {
  VISUAL: GROUP_VISUAL,
  getGroupDepth: getGroupDepth,
  getParentGroupName: getParentGroupName,
  getShortGroupName: getShortGroupName,
  getGroups: getGroups,
  getSignalGroupName: getSignalGroupName,
  isSignalInGroup: isSignalInGroup,
  getSignalsInGroup: getSignalsInGroup,
  getSignalsInGroupRecursive: getSignalsInGroupRecursive,
  getGroupContainingSignal: getGroupContainingSignal,
  getGroupNames: getGroupNames,
  createGroup: createGroup,
  addSignalsToGroup: addSignalsToGroup,
  removeSignalsFromGroup: removeSignalsFromGroup,
  renameGroup: renameGroup,
  setGroupColor: setGroupColor,
  deleteGroup: deleteGroup,
  drawGroupBrackets: drawGroupBrackets,
  getSignalNameIndent: getSignalNameIndent,
  hitTestGroupBracket: hitTestGroupBracket
});
const MAX_UNDO_STACK_SIZE = 100;
function buildDocumentJson(item) {
  const val = {};
    val.sampleCount = item.m_sampleCount;
  val.subStepCount = item.m_subStepCount;
  val.arrowColor = item.m_arrowColor || ('#ff0000');
  item.m_waveDromHead && (val.waveDromHead = item.m_waveDromHead);
  item.m_waveDromFoot && (val.waveDromFoot = item.m_waveDromFoot);
  item.m_waveDromConfig && (val.waveDromConfig = item.m_waveDromConfig);
  const arr = [];
  for (const tmp of item.m_signals) {
    const obj = {};
        obj.name = tmp.name;
    (tmp.type === SignalType.Bit) ? obj.type = 'bit' : tmp.type === SignalType.Vector ? obj.type = ('vector') : obj.type = 'blank';
    obj.color = tmp.color || '#000000';
    obj.riseTime = tmp.riseTime;
    obj.fallTime = tmp.fallTime;
    obj.edgeArrow = tmp.edgeArrow || ('none');
    tmp.fill && (obj.fill = tmp.fill);
    (0 !== tmp.uiRowHeightHint) && (obj.uiRowHeightHint = tmp.uiRowHeightHint);
    obj.values = [...tmp.values];
    obj.labels = [...tmp.labels];
    const v5 = [];
    let flag = false;
    for (const v6 of tmp.segmentStyles) {
      const v7 = {};
            v6 && v6.color && (v7.color = v6.color, flag = true);
      v6 && v6.hatched && (v7.hatched = true, flag = true);
      v6 && v6.fill && (v7.fill = v6.fill, flag = true);
      v5.push(v7);
    }
        flag && (obj.segmentStyles = v5);
    tmp.driveStrengths && tmp.driveStrengths.some(num => 0 !== num) && (obj.driveStrengths = [...tmp.driveStrengths]);
    tmp.clockMarkers && tmp.clockMarkers.some(num => true === num) && (obj.clockMarkers = [...tmp.clockMarkers]);
    (true === tmp.showClockMarkers) && (obj.showClockMarkers = true);
    tmp.waveDromColorCodes && tmp.waveDromColorCodes.some(num => null !== num) && (obj.waveDromColorCodes = [...tmp.waveDromColorCodes]);
    tmp.waveDromChars && tmp.waveDromChars.some(num => null !== num) && (obj.waveDromChars = [...tmp.waveDromChars]);
    tmp.waveDromHadData && (obj.waveDromHadData = true);
    tmp.waveDromData && (obj.waveDromData = tmp.waveDromData);
    tmp.waveDromWaveLength && (obj.waveDromWaveLength = tmp.waveDromWaveLength);
    null !== tmp.waveDromPeriod && void (0) !== tmp.waveDromPeriod && (obj.waveDromPeriod = tmp.waveDromPeriod);
    (null !== tmp.waveDromPhase) && void (0) !== tmp.waveDromPhase && (obj.waveDromPhase = tmp.waveDromPhase);
    tmp.isNodeOnlyRow && (obj.isNodeOnlyRow = true);
    tmp.subSteps && tmp.subSteps > 0 && (obj.subSteps = tmp.subSteps);
    tmp.groupName && (obj.groupName = tmp.groupName);
    tmp.groupColor && (obj.groupColor = tmp.groupColor);
    tmp.groupPath && tmp.groupPath.length > 0 && (obj.groupPath = tmp.groupPath);
    arr.push(obj);
  }
  val.signals = arr;
  const v0 = [];
  for (const tmp of item.m_markers) {
    const obj = {};
        obj.id = tmp.id;
    obj.position = tmp.position;
    tmp.color && (obj.color = tmp.color);
    v0.push(obj);
  }
  val.markers = v0;
  const v1 = [];
  for (const tmp of item.m_timeJumps) {
    const obj = {};
        obj.id = tmp.id;
    obj.position = tmp.position;
    tmp.color && (obj.color = tmp.color);
    v1.push(obj);
  }
  val.timeJumps = v1;
  const v2 = [];
  for (const tmp of item.m_timeSpanMarkers) {
    const obj = {};
        obj.id = tmp.id;
    obj.startSignal = tmp.startSignal;
    obj.startPosition = tmp.startPosition;
    obj.endSignal = tmp.endSignal;
    obj.endPosition = tmp.endPosition;
    obj.style = tmp.style || '-|';
    tmp.color && (obj.color = tmp.color);
    tmp.label && (obj.label = tmp.label);
    v2.push(obj);
  }
  val.timeSpanMarkers = v2;
  const v3 = [];
  for (const tmp of item.m_arrows) {
    const obj = {};
        obj.id = tmp.id;
    obj.startSignal = tmp.startSignal;
    obj.startPosition = tmp.startPosition;
    obj.endSignal = tmp.endSignal;
    obj.endPosition = tmp.endPosition;
    obj.style = tmp.style || '~>';
    obj.color = tmp.color || item.m_arrowColor || '#ff0000';
    v3.push(obj);
  }
  val.arrows = v3;
  const v4 = [];
  for (const tmp of item.m_textAnnotations) {
    const obj = {};
        obj.id = tmp.id;
    obj.anchorType = tmp.anchorType;
    obj.anchorId = tmp.anchorId;
    obj.position = tmp.position;
    obj.vPos = tmp.vPos;
    obj.text = tmp.text;
    tmp.color && (obj.color = tmp.color);
    tmp.backgroundColor && (obj.backgroundColor = tmp.backgroundColor);
    obj.fontSize = tmp.fontSize;
    obj.bold = tmp.bold;
    v4.push(obj);
  }
  return val.textAnnotations = v4, JSON.stringify(val, null, 2);
}
async function saveToFile(item, val = 'waveform.wp') {
  try {
    const tmp = (buildDocumentJson(item));
    if (window.showSaveFilePicker) {
            const v0 = await window.showSaveFilePicker({
          suggestedName: val || 'waveform.wp',
          types: [{
              description: 'WavePaint files',
              accept: {
                'application/json': [
                  '.wp',
                  ('.json')
                ]
              }
            }]
        });
      const v1 = await v0.createWritable();
            await v1.write(tmp);
      await v1.close();
      item._fileHandle = v0;
    } else {
            const blob = new Blob([tmp], { type: ('application/json') });
      const v0 = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
            anchor.href = v0;
      anchor.download = val;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(v0);
    }
    return item.m_modified = false, true;
  } catch (tmp) {
    return false;
  }
}
function loadFromFileContent(item, val) {
  try {
        const tmp = JSON.parse(val);
    const num = tmp.sampleCount || 0;
    if (num <= 0)
      return false;
    const n = tmp.subStepCount || 0;
        item.m_sampleCount = num;
    item.m_subStepCount = n < 0 ? 0 : n;
    item.m_signals = [];
    item.m_vcdSignals = [];
    item.m_markers = [];
    item.m_timeJumps = [];
    item.m_timeSpanMarkers = [];
    item.m_arrows = [];
    item.m_textAnnotations = [];
    item.m_nextMarkerId = 1;
    item.m_nextTimeJumpId = 1;
    item.m_nextTimeSpanMarkerId = 1;
    item.m_nextArrowId = 1;
    item.m_nextTextAnnotationId = 1;
    item.m_arrowColor = '#ff0000';
    tmp.arrowColor && (item.m_arrowColor = tmp.arrowColor);
    tmp.waveDromHead && (item.m_waveDromHead = tmp.waveDromHead);
    tmp.waveDromFoot && (item.m_waveDromFoot = tmp.waveDromFoot);
    tmp.waveDromConfig && (item.m_waveDromConfig = tmp.waveDromConfig);
    tmp.waveDromSignalStructure && (item.m_waveDromSignalStructure = tmp.waveDromSignalStructure);
    const v0 = tmp.signals || [];
    let v1 = item.m_subStepCount;
    for (const v10 of v0)
      v10.subSteps && (v10.subSteps > v1) && (v1 = v10.subSteps);
    const v2 = item.m_sampleCount * (v1 + 1);
    for (const v10 of v0) {
      const signal = new Signal('', SignalType.Bit, v2);
      signal.name = v10.name || '';
      const v11 = v10.type || 'bit';
            signal.type = ('vector' === v11) ? SignalType.Vector : ('blank' === v11) ? SignalType.BlankRow : SignalType.Bit;
      v10.color && (signal.color = v10.color);
      signal.riseTime = v10.riseTime || 0;
      signal.fallTime = v10.fallTime || 0;
      signal.edgeArrow = v10.edgeArrow || 'none';
      v10.isClockPattern && (signal.isClockPattern = true);
      v10.fill && (signal.fill = v10.fill);
      void (0) !== v10.uiRowHeightHint && (signal.uiRowHeightHint = v10.uiRowHeightHint);
      const v12 = v10.values || [];
      signal.values = new Array(v2)['fill'](-1);
      for (let count = 0; count < v12.length && count < v2; count++)
        signal['values'][count] = v12[count];
      const v13 = v10.labels || [];
      signal.labels = new Array(v2)['fill']('');
      for (let count = 0; count < v13.length && (count < v2); count++)
        signal['labels'][count] = v13[count];
      signal.segmentStyles = new Array(v2);
      for (let count = 0; count < v2; count++)
        signal['segmentStyles'][count] = new SegmentStyle();
      if (v10.segmentStyles) {
        const v14 = v10.segmentStyles;
        for (let count = 0; (count < v14.length) && (count < v2); count++) {
          const v15 = v14[count];
                    v15.color && (signal['segmentStyles'][count].color = v15.color);
          v15.hatched && (signal['segmentStyles'][count].hatched = v15.hatched);
          v15.fill && (signal['segmentStyles'][count].fill = v15.fill);
        }
      }
      if (signal.driveStrengths = new Array(v2)['fill'](0), v10.driveStrengths) {
        for (let count = 0; (count < v10.driveStrengths.length) && (count < v2); count++)
          signal['driveStrengths'][count] = v10['driveStrengths'][count];
      }
      if (signal.clockMarkers = new Array(v2)['fill'](false), v10.clockMarkers) {
        for (let count = 0; (count < v10.clockMarkers.length) && (count < v2); count++)
          signal['clockMarkers'][count] = v10['clockMarkers'][count];
      }
      if (signal.showClockMarkers = true === v10.showClockMarkers, signal.waveDromColorCodes = new Array(v2)['fill'](null), v10.waveDromColorCodes) {
        for (let count = 0; count < v10.waveDromColorCodes.length && (count < v2); count++)
          signal['waveDromColorCodes'][count] = v10['waveDromColorCodes'][count];
      }
      if (signal.waveDromChars = new Array(v2)['fill'](null), v10.waveDromChars) {
        for (let count = 0; (count < v10.waveDromChars.length) && (count < v2); count++)
          signal['waveDromChars'][count] = v10['waveDromChars'][count];
      }
            void (0) !== v10.waveDromPeriod && (signal.waveDromPeriod = v10.waveDromPeriod);
      void (0) !== v10.waveDromPhase && (signal.waveDromPhase = v10.waveDromPhase);
      void (0) !== v10.waveDromData && (signal.waveDromData = v10.waveDromData);
      (void 0 !== v10.waveDromNode) && (signal.waveDromNode = v10.waveDromNode);
      (void 0 !== v10.waveDromWave) && (signal.waveDromWave = v10.waveDromWave);
      v10.waveDromHadData && (signal.waveDromHadData = true);
      v10.waveDromWaveLength && (signal.waveDromWaveLength = v10.waveDromWaveLength);
      v10.isNodeOnlyRow && (signal.isNodeOnlyRow = true);
      v10.subSteps && v10.subSteps > 0 && (signal.subSteps = v10.subSteps);
      v10.groupName && (signal.groupName = v10.groupName);
      v10.groupColor && (signal.groupColor = v10.groupColor);
      v10.groupPath && Array.isArray(v10.groupPath) && (signal.groupPath = v10.groupPath);
      item.m_signals.push(signal);
    }
    tmp.waveDromEdges && (item.m_waveDromEdges = tmp.waveDromEdges);
    const v3 = tmp.markers || [];
    for (const v10 of v3) {
      const v11 = v10.id || 0;
      let v12;
      if ((void 0 !== v10.position))
        v12 = v10.position;
      else {
        if ((void 0 === v10.sample))
          continue;
        {
          const v13 = (item.m_subStepCount || 0) + (1);
          v12 = v10.sample / v13;
        }
      }
      if ((v11 <= 0))
        continue;
      if ((v12 < 0) || v12 > item.m_sampleCount)
        continue;
      const obj = new Marker(v11, v12);
            v10.color && (obj.color = v10.color);
      item.m_markers.push(obj);
      (v11 >= item.m_nextMarkerId) && (item.m_nextMarkerId = (v11 + 1));
    }
    const v4 = tmp.timeJumps || [];
    for (const v10 of v4) {
      const v11 = v10.id || 0;
      let v12;
      if ((void 0 !== v10.position))
        v12 = v10.position;
      else {
        if (void (0) === v10.sample)
          continue;
        {
          const v13 = ((item.m_subStepCount || 0) + 1);
          v12 = v10.sample / v13;
        }
      }
      if ((v11 <= 0))
        continue;
      if (v12 < 0 || (v12 > item.m_sampleCount))
        continue;
      const obj = new TimeJump(v11, v12);
            v10.color && (obj.color = v10.color);
      item.m_timeJumps.push(obj);
      (v11 >= item.m_nextTimeJumpId) && (item.m_nextTimeJumpId = v11 + (1));
    }
        const v5 = tmp.timeSpanMarkers || [];
    const v6 = item.m_signals.length;
    for (const v10 of v5) {
            const v11 = v10.id || 0;
      const v12 = (void 0 !== v10.startSignal) ? v10.startSignal : v10.anchorRow || 0;
      const v13 = void (0) !== v10.endSignal ? v10.endSignal : v10.endAnchorRow || v12;
      const v14 = v10.style || '-|';
            let v15;
      let v16;
      if (void (0) !== v10.startPosition)
        v15 = v10.startPosition, v16 = v10.endPosition;
      else {
        if (void (0) === v10.startSample)
          continue;
        {
          const v17 = (item.m_subStepCount || 0) + (1);
                    v15 = v10.startSample / v17;
          v16 = (v10.endSample / v17);
        }
      }
      if ((v11 <= 0))
        continue;
      if ((v12 < 0) || (v12 >= v6))
        continue;
      if ((v13 < 0) || v13 >= v6)
        continue;
      if ((v15 < 0) || (v15 > item.m_sampleCount))
        continue;
      if (v16 < 0 || (v16 > item.m_sampleCount))
        continue;
      const obj = {
        id: v11,
        startSignal: v12,
        startPosition: v15,
        endSignal: v13,
        endPosition: v16,
        style: v14,
        color: v10.color || null,
        label: v10.label || null
      };
            item.m_timeSpanMarkers.push(obj);
      (v11 >= item.m_nextTimeSpanMarkerId) && (item.m_nextTimeSpanMarkerId = (v11 + 1));
    }
    const v7 = tmp.arrows || [];
    for (const v10 of v7) {
            const v11 = v10.id || 0;
      const v12 = v10.startSignal;
      const v13 = v10.endSignal;
      const v14 = v10.style || '~>';
            let v15;
      let v16;
      if ((void 0 !== v10.startPosition))
        v15 = v10.startPosition, v16 = v10.endPosition;
      else {
        if (void (0) === v10.startSample)
          continue;
        {
          const v17 = ((item.m_subStepCount || 0) + 1);
                    v15 = v10.startSample / v17;
          v16 = v10.endSample / v17;
        }
      }
      if (v11 <= 0)
        continue;
      if (v12 < 0 || v12 >= v6)
        continue;
      if ((v13 < 0) || (v13 >= v6))
        continue;
      if (v15 < 0 || (v15 > item.m_sampleCount))
        continue;
      if ((v16 < 0) || v16 > item.m_sampleCount)
        continue;
      const obj = {
        id: v11,
        startSignal: v12,
        startPosition: v15,
        endSignal: v13,
        endPosition: v16,
        style: v14,
        color: v10.color || item.m_arrowColor
      };
            item.m_arrows.push(obj);
      (v11 >= item.m_nextArrowId) && (item.m_nextArrowId = v11 + (1));
    }
    const v8 = tmp.groups || [];
    if (v8.length > 0)
      for (const v10 of v8) {
                const v11 = v10.name || 'Group';
        const v12 = v10.color || ('#6496C8');
        const v13 = v10.signalIndices || [];
        for (const v14 of v13)
          v14 >= 0 && v14 < item.m_signals.length && (item['m_signals'][v14].groupName || (item['m_signals'][v14].groupName = v11, item['m_signals'][v14].groupColor = v12));
      }
    const v9 = tmp.textAnnotations || [];
    for (const v10 of v9) {
      let v11 = v10.anchorType;
      'number' == typeof v11 ? v11 = [
        'Arrow',
        ('Signal'),
        'BlankRow',
        'FreeForm'
      ][v11] || 'Signal' : v11 || (v11 = 'Signal');
            let v12;
      let v13 = v10.vPos;
      if (('number') == typeof v13 ? v13 = [
          'Above',
          ('Center'),
          'Below'
        ][v13] || 'Above' : v13 || (v13 = 'Above'), (void 0 !== v10.position))
        v12 = v10.position;
      else {
        if (void (0) !== v10.sample) {
          const v14 = ((item.maxSubSteps ? item.maxSubSteps() : item.m_subStepCount) + 1);
          v12 = v10.sample / v14;
        } else
          v12 = 0;
      }
      const obj = {
        id: v10.id || 1,
        anchorType: v11,
        anchorId: void (0) !== v10.anchorId ? v10.anchorId : -1,
        position: v12,
        vPos: v13,
        text: v10.text || '',
        fontSize: v10.fontSize || 12,
        bold: v10.bold || false,
        color: v10.color || null,
        backgroundColor: v10.backgroundColor || null
      };
            item.m_textAnnotations.push(obj);
      obj.id >= item.m_nextTextAnnotationId && (item.m_nextTextAnnotationId = (obj.id + 1));
    }
    return item.m_modified = false, true;
  } catch (tmp) {
    return false;
  }
}
async function openFile(item) {
  if (window.showOpenFilePicker)
    try {
      const [val] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
            description: ('WavePaint files'),
            accept: {
              'application/json': [
                ('.wp'),
                '.json'
              ]
            }
          }]
      });
      if (!val)
        return false;
            const tmp = await val.getFile();
      const v0 = await tmp.text();
      const v1 = (loadFromFileContent(item, v0));
      return v1 && (item._fileHandle = val), v1;
    } catch (val) {
      return false;
    }
  return new Promise(val => {
    const el = document.createElement(('input'));
        el.type = ('file');
    el.accept = '.wp,.json';
    el.style.display = ('none');
    document.body.appendChild(el);
    el.onchange = async ev => {
      const tmp = ev['target']['files'][0];
      if (!tmp)
        return document.body.removeChild(el), void val(false);
      try {
                const v0 = await tmp.text();
        const v1 = loadFromFileContent(item, v0);
                document.body.removeChild(el);
        (val(v1));
      } catch (v0) {
                document.body.removeChild(el);
        (val(false));
      }
    };
    el.oncancel = () => {
                        el.parentNode && document.body.removeChild(el);
            (val(false));
    };
    el.click();
  });
}
WaveDocument.prototype.pushUndoSnapshot = function () {
  const item = {
      signals: JSON.parse(JSON.stringify(this.m_signals)),
      markers: JSON.parse(JSON.stringify(this.m_markers)),
      timeJumps: JSON.parse(JSON.stringify(this.m_timeJumps)),
      timeSpanMarkers: JSON.parse(JSON.stringify(this.m_timeSpanMarkers)),
      arrows: JSON.parse(JSON.stringify(this.m_arrows)),
      textAnnotations: JSON.parse(JSON.stringify(this.m_textAnnotations)),
      sampleCount: this.m_sampleCount,
      subStepCount: this.m_subStepCount
    };
    this.m_undoStack.push(item);
  (this.m_undoStack.length > 100) && this.m_undoStack.shift();
  this.m_redoStack = [];
};
WaveDocument.prototype.undo = function () {
    if (0 === this.m_undoStack.length)
    return false;
  const item = {
    signals: JSON.parse(JSON.stringify(this.m_signals)),
    markers: JSON.parse(JSON.stringify(this.m_markers)),
    timeJumps: JSON.parse(JSON.stringify(this.m_timeJumps)),
    timeSpanMarkers: JSON.parse(JSON.stringify(this.m_timeSpanMarkers)),
    arrows: JSON.parse(JSON.stringify(this.m_arrows)),
    textAnnotations: JSON.parse(JSON.stringify(this.m_textAnnotations)),
    sampleCount: this.m_sampleCount,
    subStepCount: this.m_subStepCount
  };
  this.m_redoStack.push(item);
  const val = this.m_undoStack.pop();
  return this.m_signals = val.signals, this.m_markers = val.markers, this.m_timeJumps = val.timeJumps, this.m_timeSpanMarkers = val.timeSpanMarkers, this.m_arrows = val.arrows, this.m_textAnnotations = val.textAnnotations, this.m_sampleCount = val.sampleCount, this.m_subStepCount = val.subStepCount, this.dataChanged(), true;
};
WaveDocument.prototype.redo = function () {
    if (0 === this.m_redoStack.length)
    return false;
  const item = {
    signals: JSON.parse(JSON.stringify(this.m_signals)),
    markers: JSON.parse(JSON.stringify(this.m_markers)),
    timeJumps: JSON.parse(JSON.stringify(this.m_timeJumps)),
    timeSpanMarkers: JSON.parse(JSON.stringify(this.m_timeSpanMarkers)),
    arrows: JSON.parse(JSON.stringify(this.m_arrows)),
    textAnnotations: JSON.parse(JSON.stringify(this.m_textAnnotations)),
    sampleCount: this.m_sampleCount,
    subStepCount: this.m_subStepCount
  };
  this.m_undoStack.push(item);
  const val = this.m_redoStack.pop();
  return this.m_signals = val.signals, this.m_markers = val.markers, this.m_timeJumps = val.timeJumps, this.m_timeSpanMarkers = val.timeSpanMarkers, this.m_arrows = val.arrows, this.m_textAnnotations = val.textAnnotations, this.m_sampleCount = val.sampleCount, this.m_subStepCount = val.subStepCount, this.dataChanged(), true;
};
WaveDocument.prototype.clearUndoHistory = function () {
        this.m_undoStack = [];
    this.m_redoStack = [];
};
WaveDocument.prototype.canUndo = function () {
    return this.m_undoStack.length > 0;
};
WaveDocument.prototype.canRedo = function () {
  return (this.m_redoStack.length > 0);
};
const EXAMPLE_FILES = [
  {
    id: 'uart',
    name: 'UART',
    file: 'examples/uart.wp'
  },
  {
    id: 'spi',
    name: 'SPI',
    file: 'examples/spi.wp'
  },
  {
    id: 'i2c',
    name: 'I2C',
    file: 'examples/i2c.wp'
  },
  {
    id: 'axi',
    name: 'AXI',
    file: 'examples/axi.wp'
  },
  {
    id: 'amba_apb',
    name: 'AMBA APB',
    file: 'examples/amba_apb.wp'
  },
  {
    id: 'wishbone',
    name: 'Wishbone',
    file: 'examples/wishbone.wp'
  },
  {
    id: 'ddr_sdram',
    name: 'DDR SDRAM',
    file: 'examples/ddr_sdram.wp'
  },
  {
    id: 'pcie',
    name: 'PCIe',
    file: 'examples/pcie.wp'
  },
  {
    id: 'ethernet_mii',
    name: 'Ethernet MII',
    file: 'examples/ethernet_mii.wp'
  }
];
function getExampleList() {
  return EXAMPLE_FILES;
}
async function loadExample(item, num) {
  const val = EXAMPLE_FILES.find(tmp => tmp.id === num);
  if (!val)
    return false;
  try {
    let arr = window.location.origin + window.location.pathname;
    arr.endsWith('.html') || arr.endsWith(('.htm')) ? arr = arr.substring(0, arr.lastIndexOf('/') + (1)) : arr.endsWith('/') || (arr += '/');
        const tmp = (arr + val.file);
    const v0 = await fetch(tmp, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' }
      });
    if (!v0.ok)
      return false;
    return loadFromFileContent(item, await v0.text());
  } catch (tmp) {
    return false;
  }
}
!function (item) {
  'use strict';
  function val(v3) {
        for (v3 = v3.replace(/-/g, '+').replace(/_/g, '/'); (v3.length % 4);)
      v3 += '=';
        const v4 = atob(v3);
    const obj = new Uint8Array(v4.length);
    for (let count = 0; count < v4.length; count++)
      obj[count] = v4.charCodeAt(count);
    return obj;
  }
  async function tmp(v3, v4) {
        const v5 = buildDocumentJson(v3);
    const v6 = await async function (v7) {
        const v8 = new Blob([v7])['stream']().pipeThrough(new CompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(v8)['arrayBuffer']());
      }(new TextEncoder()['encode'](v5));
    return ((v4 || location.origin + location.pathname)['replace'](/[#?].*$/, '') + ('#d=') + function (v7) {
    let str = '';
    for (let num = 0; num < v7.length; num += 32768)
        str += String.fromCharCode.apply(null, v7.subarray(num, num + 32768));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}(v6));
  }
  async function v0() {
        const v3 = location.hash && location.hash.length > 1 ? location.hash.slice(1) : '';
    const v4 = location.search && (location.search.length > 1) ? location.search.slice(1) : '';
    const obj = new URLSearchParams(v3 || v4);
    if (obj.get('d')) {
      const v5 = await async function (v6) {
        const v7 = new Blob([v6])['stream']().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(v7)['arrayBuffer']());
      }((val(obj.get('d'))));
      return new TextDecoder()['decode'](v5);
    }
    return obj.get('j') ? new TextDecoder()['decode'](val(obj.get('j'))) : null;
  }
  async function v1(v3) {
    const v4 = await (v0());
    return !!v4 && (loadFromFileContent(v3, v4));
  }
  function v2() {
        return /[#?].*\b(d|j)=/['test'](location.href);
  }
    item.ShareLink = {
    createShareLink: tmp,
    readSharedJsonFromUrl: v0,
    loadDocFromLink: v1,
    hasSharePayload: v2
  };
  item.createShareLink = tmp;
  item.loadDocFromLink = v1;
  item.hasSharePayload = v2;
}('undefined' != typeof window ? window : this);
const WAVEDROM_COLORS = {
    2: '#ffffff',
    3: '#ffffb4',
    4: '#ffe0b9',
    5: '#b9e0ff',
    6: '#ccfdfe',
    7: '#cdfdc5',
    8: '#f0c1fb',
    9: '#f5c2c0',
    '=': '#ffffff'
  };
const WaveValue = {
    LOW: 0,
    HIGH: 1,
    UNDEFINED: -1,
    HIGHZ: 2,
    PULLUP: 3,
    PULLDOWN: 4,
    GAP: 5
  };
const VALID_WAVE_CHARS = {
    bit: [
      '0',
      '1',
      'x',
      'z',
      'u',
      'd',
      '.',
      '|'
    ],
    clock: [
      'p',
      'n',
      'P',
      'N',
      'h',
      'l',
      'H',
      'L',
      '.'
    ],
    vector: [
      '=',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'x',
      'z',
      '.',
      '|'
    ]
  };
const EDGE_STYLES = {
    SPLINE: '~>',
    STRAIGHT: '->',
    SHARP: '-|>',
    VERTICAL_FIRST: '|->',
    DOUBLE: '<->',
    LINE: '-',
    VERTICAL_LINE: '|'
  };
function getWaveDromColorPalette() {
    if ('function' == typeof getCurrentSkin) {
    const item = getCurrentSkin();
    if (item && item.wavedromColors)
      return item.wavedromColors;
  }
  return WAVEDROM_COLORS;
}
function getStandardWaveDromColors() {
  return WAVEDROM_COLORS;
}
function getWaveDromColorCode(item) {
  if (!item)
    return '=';
    const num = item.toLowerCase();
  const val = getWaveDromColorPalette();
  if (val['='] && (val['='].toLowerCase() === num))
    return '=';
  if (WAVEDROM_COLORS['='] && (WAVEDROM_COLORS['='].toLowerCase() === num))
    return '=';
  for (const [n, tmp] of Object.entries(val))
    if (('=' !== n) && tmp.toLowerCase() === num)
      return n;
  for (const [n, tmp] of Object.entries(WAVEDROM_COLORS))
    if ('=' !== n && (tmp.toLowerCase() === num))
      return n;
  return '=';
}
function getColorFromWaveDromCode(item) {
  const val = (getStandardWaveDromColors());
  return val[item] || val['='];
}
function clearSignalWaveDromPreserved(sig) {
    sig && (delete sig.waveDromWave, delete sig.waveDromData, delete sig.waveDromChars, delete sig.waveDromNode, delete sig.waveDromPeriod, delete sig.waveDromPhase, sig.isManuallyEdited = true, sig.isClockPattern = false);
}
function clearDocumentWaveDromPreserved(item) {
    item && (delete item.m_waveDromSignalStructure, delete item.m_waveDromEdges, delete item.m_waveDromConfig, item.m_signals && item.m_signals.forEach(val => clearSignalWaveDromPreserved(val)));
}
function flattenSignalGroups(arr) {
  const v0 = [];
  return arr.forEach(v1 => {
        if (Array.isArray(v1)) {
            const item = 'string' == typeof v1[0] ? 1 : 0;
      const val = v1.slice(item);
      v0.push(...(flattenSignalGroups(val)));
    } else
      ('object') == typeof v1 && null !== v1 && v0.push(v1);
  }), v0;
}
function extractTextFromJsonML(arr) {
  if (('string') == typeof arr)
    return arr;
  if (!Array.isArray(arr))
    return '';
  let item = '';
  return arr.forEach(val => {
        'string' == typeof val ? item += val : Array.isArray(val) && (item += (extractTextFromJsonML(val)));
  }), item;
}
function parseWaveDromCode(item) {
    try {
    return JSON.parse(item);
  } catch (val) {
    try {
      const tmp = item.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'/g, '"').replace(/,(\s*[}\]])/g, '$1').replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
      return JSON.parse(tmp);
    } catch (tmp) {
      return null;
    }
  }
}
function escapeHtml(item) {
  const el = document.createElement('div');
  return el.textContent = item, el.innerHTML;
}
function detectClockPattern(sig, num, n) {
  const item = window.SignalType || {
      Bit: 0,
      Vector: 1,
      BlankRow: 2
    };
  const val = window['WaveDromConstants']?.['WaveValue'] || {
      LOW: 0,
      HIGH: 1
    };
  if ((sig.type !== item.Bit))
    return null;
  if (sig.isManuallyEdited)
    return null;
  if (sig.isClockPattern) {
        const v2 = sig.edgeArrow && ('none') !== sig.edgeArrow;
    const v3 = sig['values'][0];
    return v2 ? 0 === v3 || v3 === val.LOW ? 'P' : 'N' : 0 === v3 || v3 === val.LOW ? 'p' : 'n';
  }
  if ((sig.riseTime > 0) || sig.fallTime > 0)
    return null;
  const tmp = (n + 1);
  if (n > 0) {
        let v2 = true;
    let v3 = null;
    for (let count = 0; count < num && v2; count++) {
      const v4 = (count * tmp);
      if ((v4 >= sig.values.length))
        break;
      const v5 = sig['values'][v4];
      let v6 = false;
      0 === count && (v3 = 0 === v5 || (v5 === val.LOW));
      for (let v7 = 1; v7 <= n && (v4 + v7) < sig.values.length; v7++) {
                const v8 = sig['values'][(v4 + v7)];
        const v9 = (0 === v5) || v5 === val.LOW;
        const v10 = 1 === v8 || v8 === val.HIGH;
        const v11 = 1 === v5 || v5 === val.HIGH;
        const v12 = 0 === v8 || v8 === val.LOW;
        if (v9 && v10 || (v11 && v12)) {
          v6 = true;
          break;
        }
      }
      v6 || (v2 = false);
    }
    if (v2 && (num >= 2) && null !== v3) {
      const v4 = sig.edgeArrow && ('none') !== sig.edgeArrow;
      return v3 ? v4 ? 'P' : 'p' : v4 ? 'N' : 'n';
    }
    return null;
  }
  const arr = [];
  for (let count = 0; (count < num); count++) {
    const v2 = (count * tmp);
    (v2 < sig.values.length) && arr.push(sig['values'][v2]);
  }
  if (arr.length < 2)
    return null;
    let flag = true;
  let v0 = (0 === arr[0]) || arr[0] === val.LOW;
  let v1 = 1 === arr[0] || (arr[0] === val.HIGH);
  if (!v0 && !v1)
    return null;
  for (let count = 1; (count < arr.length); count++) {
        const v2 = v0 ? count % (2) == 0 ? 0 : 1 : (count % 2 == 0) ? 1 : 0;
    const v3 = arr[count];
    if ((v3 !== v2) && v3 !== ((0 === v2) ? val.LOW : val.HIGH)) {
      flag = false;
      break;
    }
  }
  if (flag && (arr.length >= 4)) {
    const v2 = sig.edgeArrow && ('none') !== sig.edgeArrow;
    return v0 ? v2 ? 'P' : 'p' : v2 ? 'N' : 'n';
  }
  return null;
}
function buildNodeMapFromArrows(arr, v0 = [], num = 0) {
  const item = new Map();
  const v1 = [];
  let count = 97;
  const val = new Map();
  return v0 && v0.forEach(tmp => {
        (('Arrow' === tmp.anchorType) || (0 === tmp.anchorType)) && tmp.text && val.set(tmp.anchorId, tmp.text);
  }), arr.forEach(tmp => {
        const n = (num + 1);
    const v2 = Math.round((tmp.startPosition * n));
    const v3 = Math.round(tmp.endPosition * n);
    const v4 = tmp.startSignal + '_' + v2;
    const v5 = tmp.endSignal + '_' + v3;
        item.has(v4) || (item.set(v4, String.fromCharCode(count++)), count > 122 && (count = 65));
    item.has(v5) || (item.set(v5, String.fromCharCode(count++)), count > 90 && (count = 97));
        const v6 = item.get(v4);
    const v7 = item.get(v5);
    let v8 = tmp.style || '~>';
    [
      '~>',
      '->',
      '-|>',
      ('|->'),
      ('-|->'),
      '<~>',
      ('<->'),
      ('<-|>'),
      '<-|->',
      '~',
      '-',
      '-|',
      '|-',
      '-|-',
      '-~>',
      '~->',
      '-~',
      '~-'
    ].includes(v8) || (v8 = '~>');
    let v9 = '' + v6 + v8 + v7;
    const v10 = val.get(tmp.id);
        v10 && (v9 += ' ' + v10);
    v1.push(v9);
  }), {
    nodeMap: item,
    edges: v1,
    nodeCharCode: count
  };
}
function prescanForClocks(item) {
    for (const val of item)
    if (val.wave && /[pPnN]/['test'](val.wave))
      return 1;
  return 0;
}
function processSignalArray(item, arr, val, num = 0, v0 = []) {
  arr.forEach((v1, tmp) => {
        if (Array.isArray(v1)) {
            const v2 = (('string') == typeof v1[0]) ? v1[0] : '';
      const v3 = (('string') == typeof v1[0]) ? v1.slice(1) : v1;
      const v4 = v2 ? [
          ...v0,
          v2
        ] : v0;
      const n = item.m_signals.length;
      processSignalArray(item, v3, val, (num + 1), v4);
      const v5 = item.m_signals.length;
      if (v2 && v5 > n) {
        const v6 = v4.join('/');
        for (let count = n; count < v5; count++)
          item['m_signals'][count].groupName || (item['m_signals'][count].groupName = v6, item['m_signals'][count].groupColor = ('#6496C8')), item['m_signals'][count].groupPath && 0 !== item['m_signals'][count].groupPath.length || (item['m_signals'][count].groupPath = v4);
      }
    } else {
      if ((('object') == typeof v1)) {
        const v2 = item.m_signals.length;
        if (processWaveLane(item, v1, v2, val), v0.length > 0) {
          item['m_signals'][v2].groupPath = v0;
          const v3 = v0.join('/');
          item['m_signals'][v2].groupName || (item['m_signals'][v2].groupName = v3, item['m_signals'][v2].groupColor = ('#6496C8'));
        }
      }
    }
  });
}
function processWaveLane(item, val, tmp, v0) {
  const v1 = window.SignalType || {
      Bit: 0,
      Vector: 1,
      BlankRow: 2
    };
  const v2 = window.Signal;
  const v3 = (window.WaveDromConstants, window['WaveDromConstants']?.['getStandardWaveDromColors'] || (() => ({})));
  const num = item._maxSignalSubSteps || 0;
  const n = (num + 1);
  const v4 = item.m_sampleCount * n;
  const v5 = val.node || '';
  const v6 = !val.name && !val.wave && v5;
  if (!val.name && !val.wave && !v6) {
    const v25 = new v2('', v1.BlankRow, v4);
    return void item.m_signals.push(v25);
  }
  if (v6) {
    const v25 = val.period || 1;
    for (let v27 = 0; (v27 < v5.length); v27++) {
      const v28 = v5[v27];
      if (('.' !== v28)) {
        const v29 = (v27 * v25);
        v0.set(v28, {
          signalIndex: tmp,
          sample: v29,
          isNodeOnlyRow: true,
          nodeOnlyRowIndex: tmp,
          phase: val.phase || 0
        });
      }
    }
    const v26 = new v2('', v1.BlankRow, v4);
    return v26.waveDromNode = v5, v26.waveDromPhase = val.phase, v26.isNodeOnlyRow = true, void item.m_signals.push(v26);
  }
    const v7 = val.name || '';
  const v8 = val.wave || '';
  const v9 = val.period || 1;
  const v10 = val.phase || 0;
  let v11 = val.data || [];
  (('string') == typeof v11) && (v11 = v11.split(/\s+/).filter(v25 => v25.length > 0));
  let v12 = v1.Bit;
  /[=23456789]/['test'](v8) && (v12 = v1.Vector);
  const obj = new v2(v7, v12, v4);
    obj.values.fill(-1);
  obj.labels.fill('');
  num > 0 && (obj.subSteps = num);
  1 !== v9 && (obj.waveDromPeriod = v9);
  0 !== v10 && (obj.waveDromPhase = v10);
  v8 && (obj.waveDromWave = v8, obj.waveDromWaveLength = v8.length);
  void (0) !== val.data ? (obj.waveDromData = val.data, obj.waveDromHadData = true) : obj.waveDromHadData = false;
    let count = 0;
  let v13 = -1;
  let str = '';
  let v14 = null;
  let v15 = null;
  let v16 = 0;
  let flag = false;
  let v17 = false;
  let v18 = null;
  let v19 = false;
  let v20 = true;
  let v21 = null;
  let v22 = 0;
  for (let v25 = 0; (v25 < v8.length); v25++) {
        const v26 = v8[v25];
    const v27 = ('p' === v26) || ('P' === v26) || 'n' === v26 || ('N' === v26) || ('.' === v26) && v19 && (('p' === v21) || 'P' === v21 || ('n' === v21) || ('N' === v21));
    const v28 = ('.' === v26) ? v21 : v26;
    const v29 = !!v27 && (v22 % 2 == 0);
    const v30 = v9 * n;
    for (let v31 = 0; (v31 < v9); v31++) {
      const v32 = (v25 * v9 + v31);
      if ((v32 >= item.m_sampleCount))
        break;
      const v33 = v32 * n;
      if ((v33 >= v4))
        break;
            let v34 = -1;
      let v35 = '';
      let v36 = null;
      let v37 = null;
      let v38 = DriveStrength.Strong;
      let v39 = false;
      let v40 = false;
      let v41 = 0;
      let v42 = 1;
      switch (v26) {
      case 'p':
      case 'P':
        v19 = true, v40 = true, v20 = true, obj.isClockPattern = true, obj.subSteps = 1, v41 = v29 ? 0 : 1, v42 = v29 ? 1 : 0, ('P' === v26) && (obj.edgeArrow = 'positive', v39 = true);
        break;
      case 'n':
      case 'N':
        v19 = true, v40 = true, v20 = false, obj.isClockPattern = true, obj.subSteps = 1, v41 = v29 ? 0 : 1, v42 = v29 ? 1 : 0, 'N' === v26 && (obj.edgeArrow = ('negative'), v39 = true);
        break;
      case 'h':
        v12 === v1.Vector ? (v34 = 104, v35 = 'h') : (v34 = 1, v38 = DriveStrength.Weak), v21 = v26;
        break;
      case 'H':
        (v12 === v1.Vector) ? (v34 = 104, v35 = 'h') : (v34 = 1, v38 = DriveStrength.WeakMarker, (0 === v13) && (obj.edgeArrow = ('positive'))), v21 = v26;
        break;
      case 'l':
        (v12 === v1.Vector) ? (v34 = 108, v35 = 'l') : (v34 = 0, v38 = DriveStrength.Weak), v21 = v26;
        break;
      case 'L':
        v12 === v1.Vector ? (v34 = 108, v35 = 'l') : (v34 = 0, v38 = DriveStrength.WeakMarker, 1 === v13 && (obj.edgeArrow = 'negative')), v21 = v26;
        break;
      case '0':
        v12 === v1.Vector ? (v34 = 0, v35 = 'l') : v34 = 0;
        break;
      case '1':
        (v12 === v1.Vector) ? (v34 = 1, v35 = 'h') : v34 = 1;
        break;
      case 'x':
        (v12 === v1.Vector) ? (v34 = -1, v35 = '') : v34 = -1;
        break;
      case 'z':
        v34 = 2, v12 === v1.Vector && (v35 = 'Z');
        break;
      case 'u':
        (v12 === v1.Vector) ? (v34 = count, v35 = 'u', count++) : v34 = 3;
        break;
      case 'd':
        (v12 === v1.Vector) ? (v34 = count, v35 = 'd', count++) : v34 = 4;
        break;
      case '|':
        v34 = v13, v35 = (str || ''), v36 = v14, item._pendingTimeJumpPositions && item._pendingTimeJumpPositions.add(v33);
        break;
      case '=':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        v34 = count, v35 = (void 0 !== v11[count]) ? (String(v11[count])) : (String(count)), v36 = (v3())[v26] || null, v37 = v26, count++;
        break;
      case '.':
        !v19 || ('p' !== v21) && ('P' !== v21) && ('n' !== v21) && 'N' !== v21 ? (v34 = v13, v35 = str, v36 = v14, v38 = v16) : (v40 = true, ('p' === v21) || 'P' === v21 ? (v41 = v29 ? 0 : 1, v42 = v29 ? 1 : 0) : (v41 = v29 ? 1 : 0, v42 = v29 ? 0 : 1), v39 = flag);
        break;
      default:
        v34 = -1;
      }
      for (let v43 = 0; v43 < n; v43++) {
        const v44 = v33 + v43;
        if ((v44 >= v4))
          break;
                let v45 = v34;
        let v46 = v35;
        if (v40) {
          const v47 = (v31 * n) + v43 < v30 / (2);
          ('p' === v28) || ('P' === v28) ? v45 = v47 ? 1 : 0 : ('n' !== v28) && 'N' !== v28 || (v45 = v47 ? 0 : 1);
        }
                obj['values'][v44] = v45;
        obj['labels'][v44] = v46;
        obj.driveStrengths && (obj.type === v1.Bit) && (0 === v43) && (obj['driveStrengths'][v44] = v38);
        obj.clockMarkers && v40 && 0 === v43 && 0 === v31 && (obj['clockMarkers'][v44] = v39);
        obj.waveDromColorCodes && v37 && (0 === v43) && (obj['waveDromColorCodes'][v44] = v37);
        obj.segmentStyles && obj['segmentStyles'][v44] && ('x' === v26 ? obj['segmentStyles'][v44].hatched = true : 'z' === v26 ? (obj['segmentStyles'][v44].fill = ('#ffffff'), obj['segmentStyles'][v44].hatched = true) : '.' === v26 || '|' === v26 ? (obj['segmentStyles'][v44].hatched = v17, obj['segmentStyles'][v44].fill = v18) : v36 && (obj['segmentStyles'][v44].fill = v36));
        obj.waveDromChars && (0 === v43) && (obj['waveDromChars'][v44] = 0 === v31 ? v26 : '.');
      }
            v13 = v40 ? v20 ? v42 : v41 : v34;
      str = v35;
      v14 = v36;
      v15 = v37;
      v16 = v38;
      flag = v39;
      ('.' !== v26) && '|' !== v26 && (v17 = 'x' === v26 || ('z' === v26), v18 = 'z' === v26 ? ('#ffffff') : (v36 || null));
    }
    v27 && (v21 = v28, v22++);
  }
    const v23 = /[01hlHL]/['test'](v8);
  const v24 = /[pnPN]/['test'](v8);
  if ((v23 && !v24) ? (obj.riseTime = 0.2, obj.fallTime = 0.2) : v24 && (obj.riseTime = 0, obj.fallTime = 0), v5) {
    obj.waveDromNode = v5;
    for (let v25 = 0; v25 < v5.length; v25++) {
      const v26 = v5[v25];
      if ('.' !== v26) {
        const v27 = (v25 * (v9 || 1));
        v0.set(v26, {
          signalIndex: tmp,
          sample: v27
        });
      }
    }
  }
  item.m_signals.push(obj);
}
function isSharpEdgeStyle(arr) {
  return !arr.includes('~');
}
function processEdges(item, arr, val) {
    item.m_nextTextAnnotationId = item.m_nextTextAnnotationId || 1;
  item.m_nextTimeSpanMarkerId = item.m_nextTimeSpanMarkerId || 1;
  arr.forEach(tmp => {
    const v0 = tmp.match(/^(\w)([-~|<>/]+)(\w)(?:\s+(.*))?$/);
    if (!v0) {
      const v7 = tmp.match(/^(\w)\s*(\w)(?:\s+(.*))?$/);
      if (v7) {
                const v8 = v7[1];
        const v9 = v7[2];
        const v10 = v7[3] ? v7[3].trim() : null;
        const v11 = val.get(v8);
        const v12 = val.get(v9);
        if (v11 && v12) {
          const v13 = item.m_nextArrowId++;
                    item.m_arrows.push({
            id: v13,
            startSignal: v11.signalIndex,
            startPosition: v11.sample,
            endSignal: v12.signalIndex,
            endPosition: v12.sample,
            style: '~>',
            color: null
          });
          v10 && item.m_textAnnotations.push({
            id: item.m_nextTextAnnotationId++,
            anchorType: ('Arrow'),
            anchorId: v13,
            text: v10,
            sample: 0,
            vPos: ('Center'),
            yOffset: 0,
            color: null,
            backgroundColor: null,
            fontSize: 11,
            bold: false
          });
        }
      }
      return;
    }
        const v1 = v0[1];
    const v2 = v0[2];
    const v3 = v0[3];
    const v4 = v0[4] ? v0[4].trim() : null;
    const v5 = val.get(v1);
    const v6 = val.get(v3);
    if ((v5 && v6)) {
      if ((isSharpEdgeStyle(v2))) {
        const v7 = item.m_nextTimeSpanMarkerId++;
        item.m_timeSpanMarkers.push({
          id: v7,
          startSignal: v5.signalIndex,
          startPosition: v5.sample,
          endSignal: v6.signalIndex,
          endPosition: v6.sample,
          style: v2,
          color: null,
          label: v4
        });
      } else {
        const v7 = item.m_nextArrowId++;
                item.m_arrows.push({
          id: v7,
          startSignal: v5.signalIndex,
          startPosition: v5.sample,
          endSignal: v6.signalIndex,
          endPosition: v6.sample,
          style: v2,
          color: null
        });
        v4 && item.m_textAnnotations.push({
          id: item.m_nextTextAnnotationId++,
          anchorType: 'Arrow',
          anchorId: v7,
          text: v4,
          sample: 0,
          vPos: ('Center'),
          yOffset: 0,
          color: null,
          backgroundColor: null,
          fontSize: 11,
          bold: false
        });
      }
    }
  });
}
function importFromWaveDrom(item, val) {
  try {
    const tmp = 'string' == typeof val ? JSON.parse(val) : val;
    if (!tmp.signal || !Array.isArray(tmp.signal))
      return false;
        const v0 = window['WaveDromUtils']?.['flattenSignalGroups'] || (v9 => v9.filter(v10 => 'object' == typeof v10 && !Array.isArray(v10)));
    const v1 = window['WaveDromUtils']?.['extractTextFromJsonML'] || (v9 => 'string' == typeof v9 ? v9 : '');
    let num = 1;
    const arr = (v0(tmp.signal));
        arr.forEach(cur => {
            if (cur.wave) {
        const n = cur.period || 1;
        num = Math.max(num, cur.wave.length * n);
      }
    });
    item.m_sampleCount = num;
    item.m_subStepCount = 0;
    item.m_signals = [];
    item.m_arrows = [];
    item.m_markers = [];
    item.m_timeJumps = [];
    item.m_timeSpanMarkers = [];
    item.m_textAnnotations = [];
    item.m_nextArrowId = 1;
    item.m_nextMarkerId = 1;
    item.m_nextTimeSpanMarkerId = 1;
    item.m_nextTimeJumpId = 1;
    item.m_nextTextAnnotationId = 1;
    item._pendingTimeJumpPositions = new Set();
    const v2 = prescanForClocks(arr);
    item._maxSignalSubSteps = v2;
    const map = new Map();
        (processSignalArray(item, tmp.signal, map, 0));
    tmp.edge && Array.isArray(tmp.edge) && (item.m_waveDromEdges = tmp.edge, processEdges(item, tmp.edge, map));
    tmp.head && tmp.head.text && (item.m_title = (('string') == typeof tmp.head.text) ? tmp.head.text : (v1(tmp.head.text)));
    tmp.foot && tmp.foot.text && (item.m_footer = ('string') == typeof tmp.foot.text ? tmp.foot.text : v1(tmp.foot.text));
    tmp.head && (item.m_waveDromHead = tmp.head);
    tmp.foot && (item.m_waveDromFoot = tmp.foot);
    tmp.config && (item.m_waveDromConfig = tmp.config);
    item.m_waveDromSignalStructure = tmp.signal;
        const v3 = tmp['config']?.['wavepaint'] || {};
    const v4 = tmp['config']?.['_wavepaint_annotations'];
    const v5 = tmp['config']?.['_wavepaint_timeSpans'];
    const v6 = v3.annotations || v4;
    v6 && Array.isArray(v6) && (item.m_nextTextAnnotationId = item.m_nextTextAnnotationId || 1, v6.forEach(cur => {
            (('Signal') === cur.type) && cur.signalIndex >= 0 && (cur.signalIndex < item.m_signals.length) && item.m_textAnnotations.push({
        id: item.m_nextTextAnnotationId++,
        anchorType: 'Signal',
        anchorId: cur.signalIndex,
        text: cur.text,
        sample: cur.sample || 0,
        vPos: cur.vPos || 'Above',
        yOffset: 0,
        color: null,
        backgroundColor: null,
        fontSize: 12,
        bold: false
      });
    }));
    const v7 = v3.signalStyles;
    v7 && Array.isArray(v7) && v7.forEach((sig, n) => {
            sig && n < item.m_signals.length && (('number') == typeof sig.riseTime && (item['m_signals'][n].riseTime = sig.riseTime), (('number') == typeof sig.fallTime) && (item['m_signals'][n].fallTime = sig.fallTime));
    });
    const v8 = v3.timeSpans || v5;
    if (v8 && Array.isArray(v8) && (item.m_nextTimeSpanMarkerId = item.m_nextTimeSpanMarkerId || 1, v8.forEach(cur => {
                const v9 = void (0) !== cur.startSignal ? cur.startSignal : cur.anchorRow || 0;
        const v10 = (void 0 !== cur.endSignal) ? cur.endSignal : cur.endAnchorRow || v9;
        const v11 = cur.style || '-|';
        const obj = {
            id: item.m_nextTimeSpanMarkerId++,
            startSignal: v9,
            startSample: cur.startSample,
            endSignal: v10,
            endSample: cur.endSample,
            style: v11,
            color: cur.color || null
          };
        item.m_timeSpanMarkers.push(obj);
      })), item._pendingTimeJumpPositions && item._pendingTimeJumpPositions.size > 0) {
            const v9 = Array.from(item._pendingTimeJumpPositions).sort((v10, v11) => v10 - v11);
      const n = (v2 || 0) + (1);
      for (const v10 of v9) {
        const v11 = (v10 / n);
        item.m_timeJumps.push({
          id: item.m_nextTimeJumpId++,
          position: v11,
          color: null
        });
      }
      delete item._pendingTimeJumpPositions;
    }
    return item.m_modified = true, true;
  } catch (tmp) {
    return false;
  }
}
function buildNodeMapFromArrowsLocal(arr, v0 = [], v1 = [], num = 0) {
  const item = new Map();
  const v2 = [];
  let count = 97;
    const n = num + (1);
  const val = new Map();
  v1 && v1.forEach(cur => {
        ((('Arrow') === cur.anchorType) || (0 === cur.anchorType)) && cur.text && val.set(cur.anchorId, cur.text);
  });
  const tmp = () => {
    const v3 = String.fromCharCode(count++);
    return count > 122 ? count = 65 : (count > 90) && (count < 97) && (count = 97), v3;
  };
  return arr && arr.length > 0 && arr.forEach((cur, v3) => {
        const v4 = Math.round(cur.startPosition * n);
    const v5 = Math.round(cur.endPosition * n);
    const v6 = cur.startSignal + '_' + v4;
    const v7 = cur.endSignal + '_' + v5;
    const v8 = item.has(v6);
    const v9 = item.has(v7);
        v8 || item.set(v6, (tmp()));
    v9 || item.set(v7, (tmp()));
        const v10 = item.get(v6);
    const v11 = item.get(v7);
    let v12 = cur.style || '~>';
    [
      '~>',
      '->',
      '-|>',
      '|->',
      ('-|->'),
      ('<~>'),
      '<->',
      ('<-|>'),
      ('<-|->'),
      '~',
      '-',
      '-|',
      '|-',
      ('-|-'),
      '-~>',
      '~->',
      '-~',
      '~-'
    ].includes(v12) || (v12 = '~>');
    let v13 = '' + v10 + v12 + v11;
    const v14 = val.get(cur.id);
        v14 && (v13 += ' ' + v14);
    v2.push(v13);
  }), v0 && v0.length > 0 && v0.forEach(cur => {
        const v3 = Math.round((cur.startPosition * n));
    const v4 = Math.round((cur.endPosition * n));
    const v5 = cur.startSignal + '_' + v3;
    const v6 = cur.endSignal + '_' + v4;
        item.has(v5) || item.set(v5, tmp());
    item.has(v6) || item.set(v6, (tmp()));
        const v7 = item.get(v5);
    const v8 = item.get(v6);
    let v9 = cur.style || '-|';
    v9.includes('>') || v9.includes('<') || (v9 += '>');
    let v10 = '' + v7 + v9 + v8;
        cur.label && (v10 += ' ' + cur.label);
    v2.push(v10);
  }), {
    nodeMap: item,
    edges: v2,
    nodeCharCode: count
  };
}
function exportSignalToWaveDrom(sig, num, n, item, val, tmp, v0 = false, v1 = null) {
  const v2 = window.SignalType || {
      Bit: 0,
      Vector: 1,
      BlankRow: 2
    };
  const v3 = window['WaveDromConstants']?.['WaveValue'] || {
      LOW: 0,
      HIGH: 1,
      UNDEFINED: -1,
      HIGHZ: 2,
      PULLUP: 3,
      PULLDOWN: 4,
      GAP: 5
    };
  const v4 = window['WaveDromConstants']?.['getWaveDromColorCode'] || (() => '=');
  const v5 = (window.WaveDromUtils, sig.subSteps && (sig.subSteps > 0) ? sig.subSteps : 0);
  const v6 = (null !== v1) ? v1 : Math.max(item, v5);
  const v7 = (v5 > 0);
  if (sig.type === v2.BlankRow) {
    if (sig.isNodeOnlyRow && sig.waveDromNode) {
      const v19 = {};
      return v19.node = sig.waveDromNode, sig.waveDromPhase && (v19.phase = sig.waveDromPhase), v19;
    }
    return {};
  }
  const obj = { name: sig.name };
    let str = '';
  let arr = [];
  let v8 = '';
  let v9 = null;
  let v10 = null;
  let v11 = null;
  let v12 = 0;
    const v13 = sig.waveDromChars && sig.waveDromChars.some(v19 => null !== v19);
  const v14 = sig.waveDromPeriod || 1;
  let v15 = Math.ceil(n / v14);
  sig.waveDromWaveLength ? v15 = Math.min(v15, sig.waveDromWaveLength) : sig.waveDromWave && (v15 = Math.min(v15, sig.waveDromWave.length));
    const v16 = (sig.riseTime > 0) || (sig.fallTime > 0);
  const v17 = v6 + (1);
  const fn = v19 => {
            if ((sig.type !== v2.Bit))
        return null;
      if (v16)
        return null;
      if (!v7)
        return null;
            const v20 = (v19 * v14 * v17);
      const v21 = v14 * v17;
      const v22 = Math.floor(v21 / (2));
      if ((v22 < 1) || v20 + v22 >= sig.values.length)
        return null;
            const v23 = sig['values'][v20];
      const v24 = sig['values'][v20 + v22];
      const v25 = (1 === v23);
      const v26 = 0 === v23;
      const v27 = 1 === v24;
      const v28 = (0 === v24);
      const v29 = !!sig.clockMarkers && sig['clockMarkers'][v20];
      return v25 && v28 ? v29 ? 'P' : 'p' : (v26 && v27) ? v29 ? 'N' : 'n' : null;
    };
  for (let count = 0; count < v15; count++) {
        const v19 = (count * v14) * v17;
    const v20 = sig['values'][v19];
    const v21 = sig['labels'][v19] || '';
    const v22 = sig.segmentStyles ? sig['segmentStyles'][v19] : null;
    const v23 = sig.waveDromChars ? sig['waveDromChars'][v19] : null;
    const v24 = num + '_' + v19;
    if (val && val.has(v24) ? v8 += val.get(v24) : v8 += '.', !v13 && tmp && tmp.has(v19))
      str += '|';
    else {
      if (sig.type === v2.Bit) {
        const v25 = DriveStrength;
        if (v13 && null !== v23) {
                    str += v23;
          v11 = ('.' === v23) ? v11 : v23;
          v9 = v20;
          ('h' === v23) || ('l' === v23) ? v12 = v25.Weak : 'H' === v23 || 'L' === v23 ? v12 = v25.WeakMarker : ('0' !== v23) && '1' !== v23 || (v12 = v25.Strong);
          continue;
        }
        const v26 = (fn(count));
        if (v26) {
                    (v11 === v26) ? str += '.' : (str += v26, v11 = v26);
          v9 = v20;
          continue;
        }
        let v27;
                const v28 = sig.driveStrengths ? sig['driveStrengths'][v19] : 0;
        const v29 = '0' === v11 || 'l' === v11 || 'L' === v11;
        const v30 = ('1' === v11) || ('h' === v11) || ('H' === v11);
                v27 = 0 === v20 || (v20 === v3.LOW) ? (count > 0) && v29 && (0 === v9) && v12 === v28 ? '.' : v28 === v25.Weak ? 'l' : (v28 === v25.WeakMarker) ? 'L' : '0' : (1 === v20) || v20 === v3.HIGH ? (count > 0) && v30 && 1 === v9 && (v12 === v28) ? '.' : v28 === v25.Weak ? 'h' : (v28 === v25.WeakMarker) ? 'H' : '1' : (2 === v20) || v20 === v3.HIGHZ ? count > 0 && (v9 === v20) && ('z' === v11) ? '.' : 'z' : (3 === v20) || v20 === v3.PULLUP ? (count > 0) && v9 === v20 && 'u' === v11 ? '.' : 'u' : 4 === v20 || v20 === v3.PULLDOWN ? (count > 0) && v9 === v20 && 'd' === v11 ? '.' : 'd' : (count > 0) && v9 === v20 && ('x' === v11) ? '.' : 'x';
        str += v27;
        v11 = '.' === v27 ? v11 : v27;
        v9 = v20;
        v12 = v28;
      } else {
        if ((sig.type === v2.Vector)) {
          if (v13 && null !== v23) {
                        str += v23;
            /[=23456789]/['test'](v23) && arr.push(v21 || ((v20 >= 0) ? String(v20) : ''));
            v11 = ('.' === v23) ? v11 : v23;
            v9 = v20;
            v10 = v21;
            continue;
          }
          const v25 = v21.toLowerCase().trim();
          if ('l' !== v25 && ('low') !== v25 || sig.waveDromColorCodes && sig['waveDromColorCodes'][v19]) {
            if (('h' !== v25) && ('high' !== v25) || sig.waveDromColorCodes && sig['waveDromColorCodes'][v19]) {
              if (('z' !== v25) && ('hi-z') !== v25 && ('hiz' !== v25) || sig.waveDromColorCodes && sig['waveDromColorCodes'][v19]) {
                if ('u' !== v25 || sig.waveDromHadData) {
                  if (('d' !== v25) || sig.waveDromHadData) {
                    if (('x' !== v25) && 'undefined' !== v25 || sig.waveDromColorCodes && sig['waveDromColorCodes'][v19]) {
                      if (v22 && v22.hatched)
                        count > 0 && ('x' === v11) ? str += '.' : (str += 'x', v11 = 'x'), v10 = v21, v9 = v20;
                      else {
                        if (-1 === v20)
                          count > 0 && -1 === v9 ? str += '.' : (str += 'x', v11 = 'x'), v10 = '', v9 = v20;
                        else {
                          if (('' !== v21) || (0 !== v20) && (1 !== v20)) {
                            if (count > 0 && ((v21 === v10) && ('' !== v21) || ('' === v21) && '' === v10 && v20 === v9) && v9 === v20)
                              str += '.';
                            else {
                              let v26 = '=';
                                                            sig.waveDromColorCodes && sig['waveDromColorCodes'][v19] ? v26 = sig['waveDromColorCodes'][v19] : v22 && v22.fill && (v26 = v4(v22.fill));
                              str += v26;
                              arr.push(v21 || (v20 >= 0 ? String(v20) : ''));
                              v11 = v26;
                            }
                                                        v10 = v21;
                            v9 = v20;
                          } else {
                            const v26 = 0 === v20 ? '0' : '1';
                                                        (count > 0) && (v9 === v20) && '' === v10 ? str += '.' : (str += v26, v11 = v26);
                            v10 = '';
                            v9 = v20;
                          }
                        }
                      }
                    } else
                      (count > 0) && 'x' === v11 ? str += '.' : (str += 'x', v11 = 'x'), v10 = v25, v9 = v20;
                  } else
                    str += count > 0 && (v9 === v20) && (v10 === v25) ? '.' : 'd', v10 = v25, v9 = v20, v11 = 'd';
                } else
                  str += (count > 0) && v9 === v20 && v10 === v25 ? '.' : 'u', v10 = v25, v9 = v20, v11 = 'u';
              } else
                str += count > 0 && (v10 === v25) ? '.' : 'z', v10 = v25, v9 = v20;
            } else
              str += count > 0 && v10 === v25 ? '.' : '1', v10 = v25, v9 = v20;
          } else
            str += (count > 0) && v10 === v25 ? '.' : '0', v10 = v25, v9 = v20;
        }
      }
    }
  }
  let flag = false;
  if (sig.waveDromWave && sig.type === v2.Vector)
    for (let count = 0; (count < n); count++) {
            const v19 = (count * v17);
      const v20 = sig.segmentStyles ? sig['segmentStyles'][v19] : null;
      const v21 = sig['waveDromWave'][count] || '';
      if (v20 && v20.hatched && 'x' !== v21 && '.' !== v21) {
        flag = true;
        break;
      }
      if (!(('x' !== v21) || v20 && v20.hatched)) {
        flag = true;
        break;
      }
    }
    obj.wave = str;
  arr.length > 0 && (obj.data = arr);
  null !== sig.waveDromPeriod && void (0) !== sig.waveDromPeriod && (obj.period = sig.waveDromPeriod);
  (null !== sig.waveDromPhase) && void (0) !== sig.waveDromPhase && (obj.phase = sig.waveDromPhase);
  const v18 = v8.replace(/\.+$/, '');
  return v18.replace(/\./g, '').length > 0 && (obj.node = v18), obj;
}
function buildNestedGroupStructure(item, val, tmp, v0, v1, v2, v3) {
  const arr = [];
  let count = 0;
  for (; (count < item.length);) {
        const v4 = item[count];
    const v5 = v4.groupPath;
    if (v5 && v5.length > 0) {
            const num = v5[0];
      const v6 = [];
      let v7 = count;
      for (; v7 < item.length && item[v7].groupPath && item[v7].groupPath.length > 0 && item[v7]['groupPath'][0] === num;)
        v6.push({
          signal: item[v7],
          index: v7
        }), v7++;
      const v8 = buildGroupArray(num, v6, 0, val, tmp, v0, v1, v2, v3);
            arr.push(v8);
      count = v7;
    } else
      arr.push((exportSignalToWaveDrom(v4, count, val, tmp, v0, v1, v2, v3))), count++;
  }
  return arr;
}
function buildGroupArray(item, val, num, tmp, v0, v1, v2, v3, v4) {
  const arr = [item];
  let count = 0;
  for (; (count < val.length);) {
        const {
        signal: v5,
        index: v6
      } = val[count];
    const v7 = v5.groupPath || [];
    if ((v7.length > (num + 1))) {
            const n = v7[(num + 1)];
      const v8 = [];
      let v9 = count;
      for (; v9 < val.length;) {
                const {signal: v11} = val[v9];
        const v12 = v11.groupPath || [];
        if (!((v12.length > num + 1) && (v12[num + 1] === n)))
          break;
                v8.push(val[v9]);
        v9++;
      }
      const v10 = (buildGroupArray(n, v8, (num + 1), tmp, v0, v1, v2, v3, v4));
            arr.push(v10);
      count = v9;
    } else
      arr.push((exportSignalToWaveDrom(v5, v6, tmp, v0, v1, v2, v3, v4))), count++;
  }
  return arr;
}
function hasNestedGroups(arr) {
    return arr.some(sig => sig.groupPath && sig.groupPath.length > 0);
}
function reconstructSignalStructure(item, val, tmp, v0, v1, v2, v3 = false, v4 = null) {
  let count = 0;
  return function v5(arr) {
    return arr.map(v6 => {
            if (Array.isArray(v6))
        return ('string' == typeof v6[0]) ? [
          v6[0],
          ...v5(v6.slice(1))
        ] : v5(v6);
      if ((('object') != typeof v6) || (null === v6) || (void 0 === v6.name) && (void 0 === v6.wave)) {
        if ((('object') == typeof v6) && null !== v6 && 0 === Object.keys(v6).length) {
          const v7 = val[count++];
          return v7 && v7.isNodeOnlyRow && v7.waveDromNode ? exportSignalToWaveDrom(v7, count - (1), tmp, v0, v1, v2, v3, v4) : {};
        }
        if (('object') == typeof v6 && (null !== v6) && (void 0 !== v6.node)) {
          const v7 = val[count++];
          return v7 && v7.waveDromNode ? exportSignalToWaveDrom(v7, count - (1), tmp, v0, v1, v2, v3, v4) : v6;
        }
        return v6;
      }
      {
        const v7 = val[count++];
        return v7 ? (exportSignalToWaveDrom(v7, (count - 1), tmp, v0, v1, v2, v3, v4)) : v6;
      }
    });
  }(item);
}
function isSharpEdgeStyle(arr) {
    return !arr.includes('~');
}
function shouldUsePreservedEdges(item) {
  if (!item.m_waveDromEdges || (0 === item.m_waveDromEdges.length))
    return false;
    const num = (item.m_arrows || [])['length'];
  const n = (item.m_timeSpanMarkers || [])['length'];
  if ((0 === num) && (0 === n))
    return true;
    let count = 0;
  let v0 = 0;
  if (item.m_waveDromEdges.forEach(v3 => {
      const v4 = v3.match(/^(\w)([-~|<>/]+)(\w)(?:\s+(.*))?$/);
      if (v4) {
        const v5 = v4[2];
        (isSharpEdgeStyle(v5)) ? v0++ : count++;
      } else
        count++;
    }), num !== count || n !== v0)
    return false;
  const val = window.SignalType || {
    Bit: 0,
    Vector: 1,
    BlankRow: 2
  };
  if (!item.m_signals.every(cur => cur.type === val.BlankRow && !cur.isNodeOnlyRow || !cur.isNodeOnlyRow || null !== cur.waveDromNode && void (0) !== cur.waveDromNode))
    return false;
  const tmp = new Map();
  item.m_signals.forEach((sig, v3) => {
    const v4 = sig.waveDromNode;
    if (v4) {
      const v5 = sig.waveDromPeriod || 1;
      for (let v6 = 0; v6 < v4.length; v6++) {
        const v7 = v4[v6];
        if (('.' !== v7)) {
          const v8 = v6 * v5;
          tmp.set(v7, {
            signalIndex: v3,
            sample: v8
          });
        }
      }
    }
  });
    let v1 = 0;
  let v2 = 0;
  for (const v3 of item.m_waveDromEdges) {
    const v4 = v3.match(/^(\w)([-~|<>/]+)(\w)(?:\s+(.*))?$/);
    if (!v4)
      continue;
        const v5 = v4[1];
    const v6 = v4[2];
    const v7 = v4[3];
    const v8 = tmp.get(v5);
    const v9 = tmp.get(v7);
    if ((!v8 || !v9))
      return false;
    if ((isSharpEdgeStyle(v6))) {
      if (v2 >= (item.m_timeSpanMarkers || [])['length'])
        return false;
            const v10 = item['m_timeSpanMarkers'][v2++];
      const v11 = (item.m_subStepCount || 0) + (1);
      const v12 = Math.round((v10.startPosition * v11));
      const v13 = Math.round((v10.endPosition * v11));
      if (v8.signalIndex !== v10.startSignal || (v8.sample !== v12))
        return false;
      if (v9.signalIndex !== v10.endSignal || v9.sample !== v13)
        return false;
    } else {
      if (v1 >= (item.m_arrows || [])['length'])
        return false;
            const v10 = item['m_arrows'][v1++];
      const v11 = (item.m_subStepCount || 0) + (1);
      const v12 = Math.round(v10.startPosition * v11);
      const v13 = Math.round(v10.endPosition * v11);
      if ((v8.signalIndex !== v10.startSignal) || v8.sample !== v12)
        return false;
      if ((v9.signalIndex !== v10.endSignal) || v9.sample !== v13)
        return false;
    }
  }
  return true;
}
function exportToWaveDrom(item) {
  const val = {
      signal: [],
      config: {}
    };
  const arr = item.m_signals;
  const tmp = item.m_sampleCount;
  const v0 = item.m_subStepCount || 0;
  const v1 = item.maxSubSteps ? item.maxSubSteps() : v0;
  const set = new Set();
  item.m_timeJumps && item.m_timeJumps.forEach(v7 => {
        set.add(v7.sample);
  });
  const v2 = (shouldUsePreservedEdges(item));
    let v3;
  let v4;
  let v5;
  if (v2)
    v3 = new Map(), v4 = item.m_waveDromEdges, v5 = 97;
  else {
    const v7 = buildNodeMapFromArrowsLocal(item.m_arrows || [], item.m_timeSpanMarkers || [], item.m_textAnnotations || [], item.m_subStepCount || 0);
        v3 = v7.nodeMap;
    v4 = v7.edges;
    v5 = v7.nodeCharCode;
  }
  const v6 = ('undefined') != typeof GroupManager ? GroupManager.getGroups(item) : [];
  if (item.m_waveDromSignalStructure)
    val.signal = reconstructSignalStructure(item.m_waveDromSignalStructure, arr, tmp, v0, v3, set, v2, v1);
  else {
    if ((hasNestedGroups(arr)))
      val.signal = (buildNestedGroupStructure(arr, tmp, v0, v3, set, v2, v1));
    else {
      if (v6 && v6.length > 0) {
        const v7 = new Set();
        let count = 0;
        for (; (count < arr.length);) {
                    const v8 = arr[count];
          const v9 = v6.find(cur => count >= cur.startIndex && count <= cur.endIndex);
          if (v9 && !v7.has(v9.name)) {
            const v10 = [v9.name];
            for (let v11 = v9.startIndex; v11 <= v9.endIndex; v11++)
              v10.push((exportSignalToWaveDrom(arr[v11], v11, tmp, v0, v3, set, v2, v1))), v7.add(v11);
                        val.signal.push(v10);
            v7.add(v9.name);
            count = (v9.endIndex + 1);
          } else
            v7.has(count) || (val.signal.push((exportSignalToWaveDrom(v8, count, tmp, v0, v3, set, v2, v1))), v7.add(count)), count++;
        }
      } else
        arr.forEach((v7, v8) => {
                    val.signal.push((exportSignalToWaveDrom(v7, v8, tmp, v0, v3, set, v2, v1)));
        });
    }
  }
    (v4.length > 0) && (val.edge = v4);
  item.m_markers && (item.m_markers.length > 0) && (val.head = val.head || {}, val.head.tick = 0);
  const obj = {};
  if (!v2) {
    const v7 = (item.m_textAnnotations || [])['filter'](cur => 'Signal' === cur.anchorType && cur.text);
    (v7.length > 0) && (obj.annotations = v7.map(cur => ({
      type: cur.anchorType,
      signalIndex: cur.anchorId,
      sample: cur.sample,
      text: cur.text,
      vPos: cur.vPos
    })));
  }
  if (!v2 && item.m_timeSpanMarkers && item.m_timeSpanMarkers.length > 0) {
    const num = (item.m_subStepCount || 0) + (1);
    obj.timeSpans = item.m_timeSpanMarkers.map(cur => ({
      startSignal: cur.startSignal,
      startSample: Math.round(cur.startPosition * num),
      endSignal: cur.endSignal,
      endSample: Math.round(cur.endPosition * num),
      style: cur.style || '-|',
      color: cur.color
    }));
  }
  if (!v2 && item.m_signals && item.m_signals.length > 0) {
    const v7 = item.m_signals.map(sig => ({
      riseTime: sig.riseTime || 0,
      fallTime: sig.fallTime || 0
    }));
    obj.signalStyles = v7;
  }
  if (!v2 && (('function') == typeof getCurrentSkin)) {
    const v7 = getCurrentSkin();
    v7 && v7.id && (obj.skin = v7.id);
  }
  if ((Object.keys(obj).length > 0) && (val.config = val.config || {}, val.config.wavepaint = obj), item.m_waveDromHead ? val.head = item.m_waveDromHead : item.m_title && (val.head = val.head || {}, val.head.text = item.m_title), item.m_waveDromFoot ? val.foot = item.m_waveDromFoot : item.m_footer && (val.foot = { text: item.m_footer }), item.m_waveDromConfig) {
    const v7 = val['config']?.['wavepaint'];
        val.config = { ...item.m_waveDromConfig };
    v7 && (val.config.wavepaint = v7);
  }
  return val.config && (Object.keys(val.config).forEach(v7 => {
        v7.startsWith(('_wavepaint_')) && delete val['config'][v7];
  }), 0 === Object.keys(val.config).length && delete val.config), val;
}
function exportToWaveDromString(item, val = true) {
  const tmp = (exportToWaveDrom(item));
  return val ? JSON.stringify(tmp, null, 2) : JSON.stringify(tmp);
}
function generateWaveDromPreview(item) {
  const val = (exportToWaveDrom(item));
  return '<!DOCTYPE html>\n<html>\n<head>\n    <title>WaveDrom Preview</title>\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.1.0/skins/default.js"></script>\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.1.0/wavedrom.min.js"></script>\n</head>\n<body onload="WaveDrom.ProcessAll()">\n    <script type="WaveDrom">\n' + JSON.stringify(val, null, 2) + ('\n    </script>\n</body>\n</html>');
}
'undefined' != typeof window && (window.WaveDromConstants = {
  WAVEDROM_COLORS: WAVEDROM_COLORS,
  WaveValue: WaveValue,
  VALID_WAVE_CHARS: VALID_WAVE_CHARS,
  EDGE_STYLES: EDGE_STYLES,
  getWaveDromColorPalette: getWaveDromColorPalette,
  getStandardWaveDromColors: getStandardWaveDromColors,
  getWaveDromColorCode: getWaveDromColorCode,
  getColorFromWaveDromCode: getColorFromWaveDromCode
});
'undefined' != typeof window && (window.WaveDromUtils = {
  clearSignalWaveDromPreserved: clearSignalWaveDromPreserved,
  clearDocumentWaveDromPreserved: clearDocumentWaveDromPreserved,
  flattenSignalGroups: flattenSignalGroups,
  extractTextFromJsonML: extractTextFromJsonML,
  parseWaveDromCode: parseWaveDromCode,
  escapeHtml: escapeHtml,
  detectClockPattern: detectClockPattern,
  buildNodeMapFromArrows: buildNodeMapFromArrows
});
'undefined' != typeof window && (window.WaveDromImport = {
  processSignalArray: processSignalArray,
  processWaveLane: processWaveLane,
  processEdges: processEdges,
  importFromWaveDrom: importFromWaveDrom
});
'undefined' != typeof window && (window.WaveDromExport = {
  exportSignalToWaveDrom: exportSignalToWaveDrom,
  reconstructSignalStructure: reconstructSignalStructure,
  exportToWaveDrom: exportToWaveDrom,
  exportToWaveDromString: exportToWaveDromString,
  generateWaveDromPreview: generateWaveDromPreview
});
const WAVEDROM_WARNING_DISMISSED_KEY = 'wavepaint_wavedrom_warning_dismissed';
async function showWaveDromCompatibilityWarning(num = 'import') {
  return 'true' === localStorage.getItem(WAVEDROM_WARNING_DISMISSED_KEY) || new Promise(item => {
    const el = document.createElement(('div'));
    el.className = ('wp-wavedrom-warning-overlay');
    const val = document.createElement(('div'));
    val.className = 'wp-wavedrom-warning-modal';
    let n = ('work with');
        ('import' === num) ? n = 'import' : (('export') === num) ? n = 'export' : (('open') === num) && (n = ('open'));
    val.innerHTML = '\n            <div class="wp-wavedrom-warning-header">\n                <span class="wp-wavedrom-warning-icon">\u26A0️</span>\n                <h3 class="wp-wavedrom-warning-title">WaveDrom Compatibility</h3>\n                <button class="wp-wavedrom-warning-close" aria-label="Close">\xD7</button>\n            </div>\n            <div class="wp-wavedrom-warning-body">\n                <p class="wp-wavedrom-warning-intro">\n                    You are about to <strong>' + n + ('</strong> a file in WaveDrom format.\n                </p>\n                <div class="wp-wavedrom-warning-notice">\n                    <p><strong>WavePaint offers more features than WaveDrom.</strong></p>\n                    <p>Not all WavePaint features are supported in WaveDrom format:</p>\n                    <ul class="wp-wavedrom-warning-list">\n                        <li>\uD83C\uDFA8 Advanced custom colors</li>\n                        <li>\uD83D\uDCDD Free text annotations</li>\n                        <li>\u2194️ Custom arrows and connectors</li>\n                        <li>\uD83D\uDCD0 Advanced time markers</li>\n                        <li>\uD83D\uDD27 Some signal properties</li>\n                    </ul>\n                </div>\n                <p class="wp-wavedrom-warning-advice">\n                    \uD83D\uDCA1 <strong>Tip:</strong> If you need WaveDrom compatibility, keep its limitations \n                    in mind when designing your diagram.\n                </p>\n            </div>\n            <div class="wp-wavedrom-warning-footer">\n                <label class="wp-wavedrom-warning-checkbox">\n                    <input type="checkbox" id="wavedrom-warning-remember">\n                    <span>Don\'t show again</span>\n                </label>\n                <div class="wp-wavedrom-warning-buttons">\n                    <button class="wp-modal-btn wp-wavedrom-warning-cancel">Cancel</button>\n                    <button class="wp-modal-btn primary wp-wavedrom-warning-continue">Continue</button>\n                </div>\n            </div>\n        ');
    el.appendChild(val);
    document.body.appendChild(el);
    (requestAnimationFrame(() => {
    el.classList.add(('visible'));
}));
    const tmp = v0 => {
                        val.querySelector('#wavedrom-warning-remember').checked && v0 && localStorage.setItem(WAVEDROM_WARNING_DISMISSED_KEY, 'true');
            el.classList.remove(('visible'));
            (setTimeout(() => {
        el.parentNode && document.body.removeChild(el);
    (item(v0));
}, 200));
    };
        val.querySelector('.wp-wavedrom-warning-close').onclick = () => tmp(false);
    val.querySelector(('.wp-wavedrom-warning-cancel')).onclick = () => tmp(false);
    val.querySelector(('.wp-wavedrom-warning-continue')).onclick = () => tmp(true);
    el.onclick = ev => {
            ev.target === el && (tmp(false));
    };
    const fn = v0 => {
            ('Escape' === v0.key) ? (tmp(false), document.removeEventListener(('keydown'), fn)) : 'Enter' === v0.key && ((tmp(true)), document.removeEventListener(('keydown'), fn));
    };
    document.addEventListener('keydown', fn);
  });
}
function resetWaveDromWarning() {
    localStorage.removeItem(WAVEDROM_WARNING_DISMISSED_KEY);
}
async function openWaveDromFile(item) {
  if (!await showWaveDromCompatibilityWarning('open'))
    return false;
    const val = window['WaveDromImport']?.['importFromWaveDrom'] || window.importFromWaveDrom;
  const tmp = window['WaveDromUtils']?.['parseWaveDromCode'] || window.parseWaveDromCode;
  try {
    if (window.showOpenFilePicker) {
            const [v0] = await window.showOpenFilePicker({
          types: [{
              description: 'WaveDrom files',
              accept: {
                'application/json': [
                  '.json',
                  ('.json5'),
                  ('.wavedrom')
                ]
              }
            }]
        });
      const v1 = await v0.getFile();
      const v2 = await v1.text();
      const v3 = (tmp(v2));
      if (!v3)
        throw new Error(('Failed to parse WaveDrom file'));
      return val(item, v3);
    }
    return new Promise(v0 => {
      const el = document.createElement('input');
            el.type = 'file';
      el.accept = '.json,.json5,.wavedrom';
      el.onchange = async ev => {
        const v1 = ev['target']['files'][0];
        if (!v1)
          return void v0(false);
                const v2 = await v1.text();
        const v3 = tmp(v2);
        (v0(!!v3 && val(item, v3)));
      };
      el.click();
    });
  } catch (v0) {
    return false;
  }
}
async function saveAsWaveDrom(item, val = 'waveform.json') {
  if (!await (showWaveDromCompatibilityWarning(('export'))))
    return false;
  const tmp = window['WaveDromExport']?.['exportToWaveDromString'] || window.exportToWaveDromString;
  try {
    const v0 = tmp(item, true);
    if (window.showSaveFilePicker) {
            const v1 = await window.showSaveFilePicker({
          suggestedName: val,
          types: [{
              description: 'WaveDrom JSON',
              accept: { 'application/json': ['.json'] }
            }]
        });
      const v2 = await v1.createWritable();
            await v2.write(v0);
      await v2.close();
    } else {
            const blob = new Blob([v0], { type: ('application/json') });
      const v1 = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
            anchor.href = v1;
      anchor.download = val;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(v1);
    }
    return true;
  } catch (v0) {
    return false;
  }
}
async function showWaveDromCode(item) {
  if (!await showWaveDromCompatibilityWarning(('export')))
    return;
    const val = window['WaveDromExport']?.['exportToWaveDromString'] || window.exportToWaveDromString;
  const tmp = window['WaveDromExport']?.['exportToWaveDrom'] || window.exportToWaveDrom;
  const v0 = window['WaveDromUtils']?.['escapeHtml'] || (v3 => v3.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const v1 = val(item, true);
  const el = document.createElement('div');
    el.className = ('wp-modal-overlay');
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  const v2 = document.createElement(('div'));
    v2.className = 'wp-modal';
  v2.style.cssText = 'background:var(--bg-color,#fff);border-radius:8px;max-width:800px;width:90%;max-height:80vh;display:flex;flex-direction:column;';
  v2.innerHTML = '\n        <div class="wp-modal-header" style="padding:15px 20px;border-bottom:1px solid var(--border-color,#ccc);display:flex;justify-content:space-between;align-items:center;">\n            <h3 style="margin:0;color:var(--text-color,#000);">WaveDrom Code</h3>\n            <button class="close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-color,#000);">\xD7</button>\n        </div>\n        <div class="wp-modal-body" style="padding:20px;flex:1;overflow:auto;">\n            <textarea id="wavedrom-code" readonly style="width:100%;height:400px;font-family:monospace;font-size:13px;padding:10px;border:1px solid var(--border-color,#ccc);border-radius:4px;resize:vertical;background:var(--input-bg,#f5f5f5);color:var(--text-color,#000);">' + (v0(v1)) + ('</textarea>\n        </div>\n        <div class="wp-modal-footer" style="padding:15px 20px;border-top:1px solid var(--border-color,#ccc);display:flex;justify-content:flex-end;gap:10px;">\n            <button id="copy-btn" class="wp-modal-btn" style="padding:8px 16px;cursor:pointer;">Copy to Clipboard</button>\n            <button id="preview-btn" class="wp-modal-btn" style="padding:8px 16px;cursor:pointer;">Open in WaveDrom Editor</button>\n            <button id="close-modal-btn" class="wp-modal-btn primary" style="padding:8px 16px;cursor:pointer;background:var(--accent,#4a90d9);color:#fff;border:none;border-radius:4px;">Close</button>\n        </div>\n    ');
  el.appendChild(v2);
  document.body.appendChild(el);
  const fn = () => {
        document.body.removeChild(el);
  };
    v2.querySelector(('.close-btn')).onclick = fn;
  v2.querySelector('#close-modal-btn').onclick = fn;
  el.onclick = ev => {
        (ev.target === el) && (fn());
  };
  v2.querySelector(('#copy-btn')).onclick = async () => {
                v2.querySelector('#wavedrom-code').select();
        await navigator.clipboard.writeText(v1);
        v2.querySelector(('#copy-btn')).textContent = 'Copied!';
        (setTimeout(() => {
    v2.querySelector(('#copy-btn')).textContent = ('Copy to Clipboard');
}, 2000));
  };
  v2.querySelector('#preview-btn').onclick = () => {
        const v3 = (tmp(item));
    const num = (encodeURIComponent(JSON.stringify(v3)));
    window.open('https://wavedrom.com/editor.html?' + num, ('_blank'));
  };
}
async function showWaveDromImportDialog(item, val) {
  if (!await (showWaveDromCompatibilityWarning(('import'))))
    return;
    const tmp = window['WaveDromImport']?.['importFromWaveDrom'] || window.importFromWaveDrom;
  const v0 = window['WaveDromUtils']?.['parseWaveDromCode'] || window.parseWaveDromCode;
  const el = document.createElement(('div'));
    el.className = ('wp-modal-overlay');
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  const v1 = document.createElement(('div'));
    v1.className = 'wp-modal';
  v1.style.cssText = ('background:var(--bg-color,#fff);border-radius:8px;max-width:800px;width:90%;max-height:80vh;display:flex;flex-direction:column;');
  v1.innerHTML = '\n        <div class="wp-modal-header" style="padding:15px 20px;border-bottom:1px solid var(--border-color,#ccc);display:flex;justify-content:space-between;align-items:center;">\n            <h3 style="margin:0;color:var(--text-color,#000);">Import WaveDrom Code</h3>\n            <button class="close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-color,#000);">\xD7</button>\n        </div>\n        <div class="wp-modal-body" style="padding:20px;flex:1;overflow:auto;">\n            <p style="margin-top:0;color:var(--text-color,#666);">Paste WaveDrom JSON code below:</p>\n            <textarea id="wavedrom-input" style="width:100%;height:300px;font-family:monospace;font-size:13px;padding:10px;border:1px solid var(--border-color,#ccc);border-radius:4px;resize:vertical;background:var(--input-bg,#fff);color:var(--text-color,#000);" placeholder=\'{ "signal": [ { "name": "clk", "wave": "p......" } ] }\'></textarea>\n            <div id="import-error" style="color:#f44336;margin-top:10px;display:none;"></div>\n        </div>\n        <div class="wp-modal-footer" style="padding:15px 20px;border-top:1px solid var(--border-color,#ccc);display:flex;justify-content:flex-end;gap:10px;">\n            <button id="cancel-btn" class="wp-modal-btn" style="padding:8px 16px;cursor:pointer;">Cancel</button>\n            <button id="import-btn" class="wp-modal-btn primary" style="padding:8px 16px;cursor:pointer;background:var(--accent,#4a90d9);color:#fff;border:none;border-radius:4px;">Import</button>\n        </div>\n    ';
  el.appendChild(v1);
  document.body.appendChild(el);
  const fn = () => {
        document.body.removeChild(el);
  };
    v1.querySelector(('.close-btn')).onclick = fn;
  v1.querySelector('#cancel-btn').onclick = fn;
  el.onclick = ev => {
        ev.target === el && fn();
  };
  v1.querySelector(('#import-btn')).onclick = () => {
        const v2 = v1.querySelector('#wavedrom-input');
    const v3 = v1.querySelector('#import-error');
    const v4 = v2.value.trim();
    if (!v4)
      return v3.textContent = ('Please enter WaveDrom code'), void (v3.style.display = 'block');
    const v5 = (v0(v4));
    if (!v5)
      return v3.textContent = ('Invalid JSON format. Please check your code.'), void (v3.style.display = 'block');
    (tmp(item, v5)) ? (fn(), val && val()) : (v3.textContent = 'Failed to import WaveDrom. Check the signal format.', v3.style.display = ('block'));
  };
  (setTimeout(() => {
    v1.querySelector('#wavedrom-input').focus();
}, 100));
}
'undefined' != typeof window && (window.WaveDromUI = {
  openWaveDromFile: openWaveDromFile,
  saveAsWaveDrom: saveAsWaveDrom,
  showWaveDromCode: showWaveDromCode,
  showWaveDromImportDialog: showWaveDromImportDialog,
  showWaveDromCompatibilityWarning: showWaveDromCompatibilityWarning,
  resetWaveDromWarning: resetWaveDromWarning
});
(function () {
  'use strict';
        window.WaveDromIO = {
    get WAVEDROM_COLORS() {
            return window['WaveDromConstants']?.['WAVEDROM_COLORS'] || {};
    },
    get WaveValue() {
            return window['WaveDromConstants']?.['WaveValue'] || {};
    },
    getWaveDromColorPalette: function () {
            return window.WaveDromConstants.getWaveDromColorPalette?.() || {};
    },
    getStandardWaveDromColors: function () {
            return window.WaveDromConstants.getStandardWaveDromColors?.() || {};
    },
    getWaveDromColorCode: function (item) {
            return window.WaveDromConstants.getWaveDromColorCode?.(item) || '=';
    },
    clearSignalWaveDromPreserved: function (item) {
            window['WaveDromUtils']?.['clearSignalWaveDromPreserved'] && window.WaveDromUtils.clearSignalWaveDromPreserved(item);
    },
    clearDocumentWaveDromPreserved: function (item) {
            window['WaveDromUtils']?.['clearDocumentWaveDromPreserved'] && window.WaveDromUtils.clearDocumentWaveDromPreserved(item);
    },
    parseWaveDromCode: function (item) {
            if (window['WaveDromUtils']?.['parseWaveDromCode'])
        return window.WaveDromUtils.parseWaveDromCode(item);
      try {
        return JSON.parse(item);
      } catch (val) {
        return null;
      }
    },
    importFromWaveDrom: function (item, val) {
            return !!window['WaveDromImport']?.['importFromWaveDrom'] && window.WaveDromImport.importFromWaveDrom(item, val);
    },
    exportToWaveDrom: function (item) {
            return window['WaveDromExport']?.['exportToWaveDrom'] ? window.WaveDromExport.exportToWaveDrom(item) : { signal: [] };
    },
    exportToWaveDromString: function (item, val) {
            return window['WaveDromExport']?.['exportToWaveDromString'] ? window.WaveDromExport.exportToWaveDromString(item, val) : JSON.stringify(this.exportToWaveDrom(item), null, val ? 2 : 0);
    },
    generateWaveDromPreview: function (item) {
            return window['WaveDromExport']?.['generateWaveDromPreview'] ? window.WaveDromExport.generateWaveDromPreview(item) : '';
    },
    openWaveDromFile: function (item) {
            return window['WaveDromUI']?.['openWaveDromFile'] ? window.WaveDromUI.openWaveDromFile(item) : Promise.resolve(false);
    },
    saveAsWaveDrom: function (item, val) {
            return window['WaveDromUI']?.['saveAsWaveDrom'] ? window.WaveDromUI.saveAsWaveDrom(item, val) : Promise.resolve(false);
    },
    showWaveDromCode: function (item) {
            if (window['WaveDromUI']?.['showWaveDromCode'])
        return window.WaveDromUI.showWaveDromCode(item);
    },
    showWaveDromImportDialog: function (item, val) {
            if (window['WaveDromUI']?.['showWaveDromImportDialog'])
        return window.WaveDromUI.showWaveDromImportDialog(item, val);
    }
  };
    window.importFromWaveDrom = window.WaveDromIO.importFromWaveDrom;
    window.exportToWaveDrom = window.WaveDromIO.exportToWaveDrom;
    window.exportToWaveDromString = window.WaveDromIO.exportToWaveDromString;
    window.openWaveDromFile = window.WaveDromIO.openWaveDromFile;
    window.saveAsWaveDrom = window.WaveDromIO.saveAsWaveDrom;
    window.showWaveDromCode = window.WaveDromIO.showWaveDromCode;
    window.parseWaveDromCode = window.WaveDromIO.parseWaveDromCode;
    window.generateWaveDromPreview = window.WaveDromIO.generateWaveDromPreview;
    window.clearSignalWaveDromPreserved = window.WaveDromIO.clearSignalWaveDromPreserved;
    window.clearDocumentWaveDromPreserved = window.WaveDromIO.clearDocumentWaveDromPreserved;
}());
const VcdIO = function () {
  'use strict';
    const num = -1;
  const item = {
      maxFileSizeMB: 10,
      maxSamples: 100000,
      maxSignals: 500,
      progressUpdateInterval: 50
    };
  let val = '';
  function tmp(arr, n) {
        if (arr.includes('x') || arr.includes('X') || arr.includes('z') || arr.includes('Z'))
      return {
        value: num,
        label: 'X'
      };
    if ((arr.length > 32))
      try {
        return {
          value: 0,
          label: '0x' + BigInt('0b' + arr).toString(16).toUpperCase()
        };
      } catch {
        return {
          value: 0,
          label: '[' + n + 'b]'
        };
      }
    const v1 = (parseInt(arr, 2));
    if (isNaN(v1))
      return {
        value: num,
        label: 'X'
      };
    const v2 = (n > 1) ? ('0x' + v1.toString(16).toUpperCase()) : '';
    return {
      value: v1,
      label: v2
    };
  }
  class v0 {
    constructor() {
                        this.name = '';
            this.id = '';
            this.width = 1;
            this.type = SignalType.Bit;
            this.changes = [];
            this.lastValue = num;
    }
  }
  return {
    loadFromVcd: async function (v1, v2) {
      val = '';
      try {
                let v3;
        let v4;
        if (window.showOpenFilePicker)
          try {
            const [v7] = await window.showOpenFilePicker({
              multiple: false,
              types: [{
                  description: 'VCD files',
                  accept: { 'text/vcd': [('.vcd')] }
                }]
            });
            if (!v7)
              return false;
            const v8 = await v7.getFile();
            v4 = v8.name;
            const n = (v8.size / 1048576);
            if (n > item.maxFileSizeMB)
              return val = 'File too large: ' + n.toFixed(1) + 'MB (max: ' + item.maxFileSizeMB + 'MB)', false;
            v3 = await v8.text();
          } catch (v7) {
            if ((('AbortError') === v7.name))
              return false;
            throw v7;
          }
        else {
          const v7 = await new Promise(v8 => {
            const el = document.createElement(('input'));
                        el.type = 'file';
            el.accept = '.vcd';
            el.style.display = ('none');
            document.body.appendChild(el);
            el.onchange = async ev => {
              const v9 = ev['target']['files'][0];
              if (!v9)
                return document.body.removeChild(el), void (v8(null));
              const n = (v9.size / 1048576);
              if (n > item.maxFileSizeMB)
                return val = 'File too large: ' + n.toFixed(1) + 'MB (max: ' + item.maxFileSizeMB + 'MB)', document.body.removeChild(el), void v8(null);
              try {
                const v10 = await v9.text();
                                document.body.removeChild(el);
                (v8({
    content: v10,
    name: v9.name
}));
              } catch (v10) {
                                document.body.removeChild(el);
                v8(null);
              }
            };
            el.oncancel = () => {
                                                        el.parentNode && document.body.removeChild(el);
                            (v8(null));
            };
            el.click();
          });
          if (!v7)
            return false;
                    v3 = v7.content;
          v4 = v7.name;
        }
        const v5 = function (v7, v8) {
                    const v9 = v7.split('\n');
          const n = v9.length;
          const arr = [];
          const map = new Map();
          const v10 = [];
                    let flag = true;
          let count = -1;
          let v11 = -1;
          let v12 = Date.now();
          for (let v13 = 0; (v13 < n); v13++) {
            if (v8 && (Date.now() - v12) > item.progressUpdateInterval && (v12 = Date.now(), !(v8(Math.floor((v13 / n * 100))))))
              return val = 'Import cancelled by user', null;
            let v14 = v9[v13].trim();
            if (!v14)
              continue;
            if (flag) {
              if (v14.startsWith('$scope')) {
                const v16 = v14.split(/\s+/);
                v16.length >= 3 && ('$end' !== v16[2]) && v10.push(v16[2]);
              } else {
                if (v14.startsWith(('$upscope')))
                  v10.length > 0 && v10.pop();
                else {
                  if (v14.startsWith('$var')) {
                    const v16 = v14.split(/\s+/);
                    if (v16.length >= 5) {
                      if (arr.length >= item.maxSignals) {
                        val = 'Reached maximum signal limit (' + item.maxSignals + ')';
                        break;
                      }
                                            const v17 = (parseInt(v16[2], 10)) || 1;
                      const v18 = v16[3];
                      let str = '';
                      for (let v20 = 4; v20 < v16.length && (('$end') !== v16[v20]); v20++)
                        str && (str += ' '), str += v16[v20];
                      str || (str = v18);
                                            const v19 = v10.length > 0 ? v10.join('.') + '.' + str : str;
                      const obj = new v0();
                                            obj.name = v19;
                      obj.id = v18;
                      obj.width = v17;
                      obj.type = 1 === v17 ? SignalType.Bit : SignalType.Vector;
                      arr.push(obj);
                      map.set(v18, (arr.length - 1));
                    }
                  } else
                    v14.startsWith(('$enddefinitions')) && (flag = false);
                }
              }
              continue;
            }
            const v15 = v14[0];
            if ('#' !== v15) {
              if (('$' !== v15)) {
                if ((count < 0) && (count = 0, v11 = Math.max(v11, count)), 'b' === v15 || ('B' === v15)) {
                  const v16 = v14.indexOf(' ');
                  if (v16 < 2)
                    continue;
                                    const v17 = v14.substring(1, v16);
                  const v18 = v14.substring((v16 + 1)).trim();
                  const v19 = map.get(v18);
                  if (void (0) === v19)
                    continue;
                                    const v20 = arr[v19];
                  const {
                      value: v21,
                      label: v22
                    } = tmp(v17, v20.width);
                                    0 !== v20.changes.length && (v20['changes'][v20.changes.length - 1].value === v21) || v20.changes.push({
                    sampleIdx: count,
                    value: v21,
                    label: v22
                  });
                  v20.lastValue = v21;
                } else {
                  if ('01xXzZ'.includes(v15)) {
                                        const v16 = v14.substring(1).trim();
                    const v17 = map.get(v16);
                    if ((void 0 === v17))
                      continue;
                    const v18 = arr[v17];
                    let v19;
                                        v19 = 'xXzZ'.includes(v15) ? num : '1' === v15 ? 1 : 0;
                    (0 !== v18.changes.length) && v18['changes'][(v18.changes.length - 1)].value === v19 || v18.changes.push({
                      sampleIdx: count,
                      value: v19,
                      label: ''
                    });
                    v18.lastValue = v19;
                  }
                }
              }
            } else {
              if (count++, (count > v11) && (v11 = count), (count >= item.maxSamples)) {
                val = 'Reached maximum sample limit (' + item.maxSamples + ')';
                break;
              }
            }
          }
          return v11 < 0 ? (val = 'No valid timestamps found in VCD file', null) : {
            tmpSignals: arr,
            sampleCount: v11 + (1)
          };
        }(v3, v2);
        if (!v5)
          return false;
        const v6 = function (v7, n) {
          const arr = [];
          for (const v8 of v7) {
                        const v9 = v8.name.split('.');
            const v10 = v9[v9.length - (1)] || v8.name;
            const signal = new Signal(v10, v8.type, n);
            signal.fullName = v8.name;
                        let v11 = num;
            let str = '';
            let count = 0;
            for (let v12 = 0; (v12 < n); v12++) {
              for (; count < v8.changes.length && (v8['changes'][count].sampleIdx === v12);)
                v11 = v8['changes'][count].value, str = v8['changes'][count].label, count++;
                            signal['values'][v12] = v11;
              signal.type === SignalType.Vector && (signal['labels'][v12] = str || (v11 !== num ? ('0x' + v11.toString(16).toUpperCase()) : 'X'));
            }
            arr.push(signal);
          }
          return arr;
        }(v5.tmpSignals, v5.sampleCount);
        return v1.m_vcdSignals = v6, v1.m_sampleCount = v5.sampleCount, ('function' == typeof v1.dataChanged) && v1.dataChanged(), true;
      } catch (v3) {
        return val = v3.message || ('Unknown error'), false;
      }
    },
    saveAsVcd: async function (v1, v2 = 'waveform.vcd') {
      val = '';
      try {
        if (!v1)
          return val = 'No document provided', false;
        let arr = v1.m_signals && v1.m_signals.length > 0 ? v1.m_signals : v1.m_vcdSignals || [];
        if (arr = arr.filter(sig => sig && sig.type !== SignalType.BlankRow && sig.values && sig.values.length > 0), 0 === arr.length)
          return val = 'No signals to export', false;
        const n = v1.effectiveSampleCount ? v1.effectiveSampleCount() : (v1.m_sampleCount * (v1.m_subStepCount + 1));
        if (n <= 0)
          return val = ('Invalid sample count'), false;
        let str = '';
                str += '$date ' + new Date()['toISOString']() + ' $end\n';
        str += '$version WavePaint Web VCD Generator $end\n';
        str += '$timescale 1ns $end\n';
        str += '\n';
        str += ('$scope module wavepaint $end\n');
                const fn = v4 => {
            const v5 = ('!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~');
            return (v4 < 94) ? v5[v4] : (v5[(Math.floor(v4 / 94) % 94)] + v5[(v4 % 94)]);
          };
        const map = new Map();
        let count = 0;
        for (let v4 = 0; (v4 < arr.length); v4++) {
                    const v5 = arr[v4];
          const v6 = (fn(count));
                    map.set(v4, v6);
          count++;
          let v7 = 1;
          if (v5.type === SignalType.Vector) {
            let v10 = 0;
            for (const v11 of v5.values)
              v11 !== num && (v11 > v10) && (v10 = v11);
            v7 = v10 > 0 ? Math.min(32, Math.max(1, Math.ceil(Math.log2(v10 + (1))))) : 8;
          }
          const v8 = (v5.type === SignalType.Vector) ? ('reg') : ('wire');
          let v9 = (v5.name || 'signal_' + v4)['replace'](/[^a-zA-Z0-9_\[\]:]/g, '_').replace(/^[0-9]/, '_$&');
                    v9 || (v9 = 'sig_' + v4);
          str += '$var ' + v8 + ' ' + v7 + ' ' + v6 + ' ' + v9 + ' $end\n';
        }
                str += '$upscope $end\n';
        str += '$enddefinitions $end\n';
        str += '\n';
        const v3 = (v4, v5, v6) => {
          const v7 = map.get(v6);
          if (!v7)
            return '';
          if (v4.type === SignalType.Vector) {
            if (v5 === num || null == v5)
              return 'bx ' + v7 + '\n';
            const v8 = ('number' == typeof v5) ? v5 : parseInt(v5, 10);
            return (isNaN(v8)) ? 'bx ' + v7 + '\n' : 'b' + (v8 >>> 0).toString(2) + ' ' + v7 + '\n';
          }
          return v5 === num || null == v5 ? 'x' + v7 + '\n' : '' + (v5 ? '1' : '0') + v7 + '\n';
        };
                str += '#0\n';
        str += '$dumpvars\n';
        for (let v4 = 0; (v4 < arr.length); v4++) {
          const v5 = arr[v4];
          str += (v3(v5, v5['values'][0], v4));
        }
        str += ('$end\n');
        for (let v4 = 1; (v4 < n); v4++) {
          let v5 = '';
          for (let v6 = 0; (v6 < arr.length); v6++) {
            const v7 = arr[v6];
            if ((v4 >= v7.values.length))
              continue;
            const v8 = v7['values'][v4];
            (v8 !== v7['values'][v4 - 1]) && (v5 += (v3(v7, v8, v6)));
          }
          v5 && (str += '#' + v4 + '\n', str += v5);
        }
        if (str += '#' + n + '\n', window.showSaveFilePicker) {
                    const v4 = await window.showSaveFilePicker({
              suggestedName: v2,
              types: [{
                  description: ('VCD files'),
                  accept: { 'text/vcd': [('.vcd')] }
                }]
            });
          const v5 = await v4.createWritable();
                    await v5.write(str);
          await v5.close();
        } else {
                    const blob = new Blob([str], { type: ('text/vcd') });
          const v4 = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
                    anchor.href = v4;
          anchor.download = v2;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(v4);
        }
        return true;
      } catch (v3) {
        return ('AbortError') === v3.name || (val = v3.message || 'Unknown error'), false;
      }
    },
    getLastError: function () {
      return val;
    },
    transferVcdSignalsToMain: function (v1, v2) {
            if (v2 && 0 !== v2.length && v1 && v1.m_vcdSignals) {
        v1.pushUndoSnapshot();
        for (const n of v2) {
          if (n < 0 || (n >= v1.m_vcdSignals.length))
            continue;
                    const v3 = v1['m_vcdSignals'][n];
          const signal = new Signal(v3.name, v3.type, v1.effectiveSampleCount());
          v3.fullName && (signal.fullName = v3.fullName);
          const v4 = Math.min(v3.values.length, signal.values.length);
          for (let count = 0; (count < v4); count++)
            signal['values'][count] = v3['values'][count], signal['labels'][count] = v3['labels'][count];
          v1.m_signals.push(signal);
        }
        ('function') == typeof v1.dataChanged && v1.dataChanged();
      }
    },
    buildHierarchy: function (v1) {
      const obj = {
          name: '',
          children: new Map(),
          signals: []
        };
      for (let count = 0; count < v1.length; count++) {
                const v2 = v1[count];
        const v3 = v2.fullName || v2.name;
        const v4 = v3.split('.');
        if (v4.length <= 1)
          obj.signals.push({
            index: count,
            name: v2.name,
            fullName: v3
          });
        else {
          let v5 = obj;
          for (let v6 = 0; v6 < (v4.length - 1); v6++) {
            const v7 = v4[v6];
                        v5.children.has(v7) || v5.children.set(v7, {
              name: v7,
              children: new Map(),
              signals: []
            });
            v5 = v5.children.get(v7);
          }
          v5.signals.push({
            index: count,
            name: v2.name,
            fullName: v3
          });
        }
      }
      return obj;
    },
    getConfig: function () {
      return { ...item };
    }
  };
}();
function getSignalDisplayValue(sig, item) {
  const num = sig['values'][item];
  if ((sig.type === SignalType.Bit))
    return (0 === num) ? '0' : 1 === num ? '1' : 'X';
  if ((sig.type === SignalType.Vector)) {
    if (sig.labels && sig['labels'][item]) {
      const val = sig['labels'][item];
      return ('z' === val.toLowerCase()) || 'x' === val.toLowerCase() ? val.toUpperCase() : val;
    }
    return -1 === num ? 'X' : ('0x' + num.toString(16).toUpperCase().padStart(2, '0'));
  }
  return '';
}
async function saveAsTxt() {
  if (!document_wave)
    return void await (wpAlert('No document to export.', 'Export Error'));
  const arr = document_wave.signalList();
  if (!arr || (0 === arr.length))
    return void await (wpAlert('No signals to export.', ('Export Error')));
    const num = document_wave.sampleCount();
  const v0 = arr.filter(tmp => tmp.type !== SignalType.BlankRow);
  if (0 === v0.length)
    return void await wpAlert(('No signals to export (only blank rows).'), 'Export Error');
    const v1 = [];
  const v2 = [
      'Time',
      ...v0.map(tmp => tmp.name || 'unnamed')
    ];
  v1.push(v2.join('\t'));
  for (let count = 0; (count < num); count++) {
    const v3 = [count.toString()];
    for (const tmp of v0)
      v3.push((getSignalDisplayValue(tmp, count)));
    v1.push(v3.join('\t'));
  }
    const item = v1.join('\n');
  const val = ('undefined' != typeof currentFileName) && currentFileName ? currentFileName : ('waveform');
  try {
    if (window.showSaveFilePicker) {
            const tmp = await window.showSaveFilePicker({
          suggestedName: val.replace(/\.[^.]+$/, '') + '.txt',
          types: [{
              description: 'Text Files',
              accept: { 'text/plain': ['.txt'] }
            }]
        });
      const v3 = await tmp.createWritable();
            await v3.write(item);
      await v3.close();
    } else {
            const tmp = new Blob([item], { type: ('text/plain') });
      const v3 = URL.createObjectURL(tmp);
      const anchor = document.createElement('a');
            anchor.href = v3;
      anchor.download = (val.replace(/\.[^.]+$/, '') + ('.txt'));
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(v3);
    }
  } catch (tmp) {
    (('AbortError') !== tmp.name) && await wpAlert((('Failed to save TXT file: ') + tmp.message), 'Export Error');
  }
}
async function saveAsCsv() {
  if (!document_wave)
    return void await (wpAlert(('No document to export.'), ('Export Error')));
  const arr = document_wave.signalList();
  if (!arr || (0 === arr.length))
    return void await (wpAlert('No signals to export.', ('Export Error')));
    const num = document_wave.sampleCount();
  const v0 = arr.filter(tmp => tmp.type !== SignalType.BlankRow);
  if (0 === v0.length)
    return void await (wpAlert(('No signals to export (only blank rows).'), 'Export Error'));
    const v1 = [];
  const v2 = [
      ('Time'),
      ...v0.map(tmp => escapeCSV(tmp.name || 'unnamed'))
    ];
  v1.push(v2.join(','));
  for (let count = 0; (count < num); count++) {
    const v3 = [count.toString()];
    for (const tmp of v0) {
      const v4 = (getSignalDisplayValue(tmp, count));
      v3.push(escapeCSV(v4));
    }
    v1.push(v3.join(','));
  }
    const item = v1.join('\n');
  const val = (('undefined') != typeof currentFileName) && currentFileName ? currentFileName : ('waveform');
  try {
    if (window.showSaveFilePicker) {
            const tmp = await window.showSaveFilePicker({
          suggestedName: (val.replace(/\.[^.]+$/, '') + '.csv'),
          types: [{
              description: ('CSV Files'),
              accept: { 'text/csv': ['.csv'] }
            }]
        });
      const v3 = await tmp.createWritable();
            await v3.write(item);
      await v3.close();
    } else {
            const tmp = new Blob([item], { type: 'text/csv' });
      const v3 = URL.createObjectURL(tmp);
      const anchor = document.createElement('a');
            anchor.href = v3;
      anchor.download = val.replace(/\.[^.]+$/, '') + '.csv';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(v3);
    }
  } catch (tmp) {
    'AbortError' !== tmp.name && await (wpAlert('Failed to save CSV file: ' + tmp.message, ('Export Error')));
  }
}
function escapeCSV(item) {
  if (!item)
    return '';
  const arr = (String(item));
  return arr.includes(',') || arr.includes('"') || arr.includes('\n') || arr.includes('\r') ? (('"' + arr.replace(/"/g, '""')) + '"') : arr;
}
const WavePaintSkins = {
  black: {
    id: 'black',
    name: 'Black',
    description: 'Pure black - 100% negro',
    signalColor: '#000000',
    signalColorBit: '#000000',
    vectorColors: [
      '#000000',
      '#000000',
      '#000000',
      '#000000',
      '#000000',
      '#000000',
      '#000000',
      '#000000'
    ],
    vectorOutlineColor: '#000000',
    arrowColor: '#000000',
    markerColor: '#000000',
    timeJumpColor: '#000000',
    timeSpanColor: '#000000',
    wavedromSkin: 'dark',
    wavedromColors: {
      '=': '#000000',
      2: '#000000',
      3: '#000000',
      4: '#000000',
      5: '#000000',
      6: '#000000',
      7: '#000000',
      8: '#000000',
      9: '#000000'
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue and teal palette - calm, professional',
    signalColor: '#3d5a80',
    signalColorBit: '#98c1d9',
    vectorColors: [
      '#1b4965',
      '#3d5a80',
      '#5fa8d3',
      '#62b6cb',
      '#89c2d9',
      '#a9d6e5',
      '#cae9f5',
      '#bee9e8'
    ],
    vectorOutlineColor: '#98c1d9',
    arrowColor: '#ff6b35',
    markerColor: '#ee6c4d',
    timeJumpColor: '#ee6c4d',
    timeSpanColor: '#5fa8d3',
    wavedromSkin: 'default',
    wavedromColors: {
      '=': '#3d5a80',
      2: '#5fa8d3',
      3: '#62b6cb',
      4: '#89c2d9',
      5: '#a9d6e5',
      6: '#cae9f5',
      7: '#bee9e8',
      8: '#1b4965',
      9: '#98c1d9'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and pink tones - vibrant, energetic',
    signalColor: '#ff6f61',
    signalColorBit: '#ff9a8b',
    vectorColors: [
      '#ff6b6b',
      '#f8a978',
      '#ffc078',
      '#ffdf91',
      '#f9cb40',
      '#ff8c94',
      '#ffaaa5',
      '#ffd3b6'
    ],
    vectorOutlineColor: '#ff9a8b',
    arrowColor: '#00d9ff',
    markerColor: '#a855f7',
    timeJumpColor: '#c084fc',
    timeSpanColor: '#fbbf24',
    wavedromSkin: 'default',
    wavedromColors: {
      '=': '#ff6b6b',
      2: '#f8a978',
      3: '#ffc078',
      4: '#ffdf91',
      5: '#f9cb40',
      6: '#ff8c94',
      7: '#ffaaa5',
      8: '#ffd3b6',
      9: '#ff9a8b'
    }
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green and earth tones - organic, balanced',
    signalColor: '#2d6a4f',
    signalColorBit: '#40916c',
    vectorColors: [
      '#1b4332',
      '#2d6a4f',
      '#40916c',
      '#52b788',
      '#74c69d',
      '#95d5b2',
      '#b7e4c7',
      '#d8f3dc'
    ],
    vectorOutlineColor: '#95d5b2',
    arrowColor: '#f4a261',
    markerColor: '#e76f51',
    timeJumpColor: '#e9c46a',
    timeSpanColor: '#74c69d',
    wavedromSkin: 'default',
    wavedromColors: {
      '=': '#2d6a4f',
      2: '#40916c',
      3: '#52b788',
      4: '#74c69d',
      5: '#95d5b2',
      6: '#b7e4c7',
      7: '#d8f3dc',
      8: '#1b4332',
      9: '#a7c957'
    }
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk neon colors - high contrast, futuristic',
    signalColor: '#00ff88',
    signalColorBit: '#00ff88',
    vectorColors: [
      '#ff00ff',
      '#00ffff',
      '#ff0080',
      '#80ff00',
      '#ff8000',
      '#0080ff',
      '#ff0040',
      '#40ff00'
    ],
    vectorOutlineColor: '#00ff88',
    arrowColor: '#ff00ff',
    markerColor: '#00ffff',
    timeJumpColor: '#ff0080',
    timeSpanColor: '#00ffff',
    wavedromSkin: 'dark',
    wavedromColors: {
      '=': '#00ff88',
      2: '#ff00ff',
      3: '#00ffff',
      4: '#ff0080',
      5: '#80ff00',
      6: '#ff8000',
      7: '#0080ff',
      8: '#ff0040',
      9: '#40ff00'
    }
  }
};
let currentSkin = 'black';
function getCurrentSkin() {
    return WavePaintSkins[currentSkin] || WavePaintSkins.black;
}
function getSkin(item) {
    return WavePaintSkins[item] || WavePaintSkins.black;
}
function getAllSkins() {
  return WavePaintSkins;
}
function setCurrentSkin(item) {
    WavePaintSkins[item] || (item = 'black');
  currentSkin = item;
  localStorage.setItem(('wavepaintSkin'), item);
  (applySkinToDocument());
  (('function') == typeof updatePaintColorBox) && (updatePaintColorBox());
  'function' == typeof drawWaveform && (drawWaveform());
}
function applySkinToDocument() {
  const item = getCurrentSkin();
  const val = document.documentElement;
    val.style.setProperty('--skin-signal-color', item.signalColor);
  val.style.setProperty(('--skin-signal-color-bit'), item.signalColorBit);
  val.style.setProperty(('--skin-vector-outline'), item.vectorOutlineColor);
  val.style.setProperty('--skin-arrow-color', item.arrowColor);
  val.style.setProperty(('--skin-marker-color'), item.markerColor);
  val.style.setProperty('--skin-timejump-color', item.timeJumpColor);
  val.style.setProperty('--skin-timespan-color', item.timeSpanColor);
  item.vectorColors.forEach((tmp, num) => {
        val.style.setProperty('--skin-vector-color-' + num, tmp);
  });
  document.body.classList.remove(...Object.keys(WavePaintSkins).map(num => 'skin-' + num));
  document.body.classList.add('skin-' + item.id);
}
function getSkinSignalColor(item = null) {
    return item || getCurrentSkin().signalColor;
}
function getSkinArrowColor(item = null) {
    return item || getCurrentSkin().arrowColor;
}
function getSkinMarkerColor(item = null) {
  return item || (getCurrentSkin()).markerColor;
}
function getSkinTimeJumpColor(item = null) {
  return item || (getCurrentSkin()).timeJumpColor;
}
function getSkinVectorColor(item, val = null) {
  if (val)
    return val;
    const tmp = (getCurrentSkin());
  const v0 = (Math.abs(item) % tmp.vectorColors.length);
  return tmp['vectorColors'][v0];
}
function getWaveDromSkinConfig() {
  const item = (getCurrentSkin());
  return {
    skin: item.wavedromSkin,
    head: { tick: 0 },
    _wavepaint: {
      skin: item.id,
      colors: item.wavedromColors
    }
  };
}
function getWaveDromColorCodeFromSkin(item) {
    if (!item)
    return '=';
    const val = getCurrentSkin();
  const num = item.toLowerCase();
  for (const [tmp, v0] of Object.entries(val.wavedromColors))
    if (v0.toLowerCase() === num)
      return tmp;
  const n = val.vectorColors.findIndex(tmp => tmp.toLowerCase() === num);
  if (n >= 0) {
    const tmp = [
      '=',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9'
    ];
    return tmp[n % tmp.length];
  }
  return '=';
}
function initSkins() {
  const item = localStorage.getItem('wavepaintSkin');
    item && WavePaintSkins[item] && (currentSkin = item);
  applySkinToDocument();
}
async function openThemeDialog() {
  return new Promise(item => {
    const el = document.createElement(('div'));
    el.className = 'theme-dialog-overlay';
    const val = document.createElement('div');
    val.className = 'theme-dialog';
    const tmp = document.createElement('div');
    tmp.className = ('theme-dialog-header');
    const v0 = document.createElement('span');
        v0.className = 'theme-dialog-title';
    v0.textContent = 'Appearance';
    const v1 = document.createElement(('button'));
        v1.className = ('theme-dialog-close');
    v1.innerHTML = '\u2715';
    v1.setAttribute(('aria-label'), 'Close');
    tmp.appendChild(v0);
    tmp.appendChild(v1);
    const v2 = document.createElement(('div'));
    v2.className = ('theme-dialog-body');
    const v3 = document.createElement('div');
    v3.className = ('theme-dialog-section');
    const v4 = document.createElement('div');
        v4.className = 'theme-dialog-section-label';
    v4.textContent = ('Interface Theme');
    const v5 = document.createElement(('div'));
    v5.className = 'theme-dialog-options';
    const v6 = document.createElement(('div'));
        v6.className = ('theme-option');
    v6.dataset.theme = ('light');
    const v7 = document.createElement(('div'));
    v7.className = 'theme-preview theme-preview-light';
    const v8 = document.createElement('div');
    v8.className = ('theme-preview-header');
    const v9 = document.createElement('div');
    v9.className = 'theme-preview-content';
    for (let count = 0; (count < 3); count++) {
      const v47 = document.createElement('div');
            v47.className = ('theme-preview-signal');
      v9.appendChild(v47);
    }
        v7.appendChild(v8);
    v7.appendChild(v9);
    const v10 = document.createElement(('span'));
        v10.className = ('theme-option-label');
    v10.textContent = 'Light';
    const v11 = document.createElement('div');
        v11.className = ('theme-option-check');
    v11.innerHTML = '\u2713';
    v6.appendChild(v7);
    v6.appendChild(v10);
    v6.appendChild(v11);
    const v12 = document.createElement(('div'));
        v12.className = ('theme-option');
    v12.dataset.theme = 'dark';
    const v13 = document.createElement('div');
    v13.className = ('theme-preview theme-preview-dark');
    const v14 = document.createElement('div');
    v14.className = 'theme-preview-header';
    const v15 = document.createElement(('div'));
    v15.className = 'theme-preview-content';
    for (let count = 0; count < 3; count++) {
      const v47 = document.createElement(('div'));
            v47.className = 'theme-preview-signal';
      v15.appendChild(v47);
    }
        v13.appendChild(v14);
    v13.appendChild(v15);
    const v16 = document.createElement('span');
        v16.className = 'theme-option-label';
    v16.textContent = ('Dark');
    const v17 = document.createElement('div');
        v17.className = 'theme-option-check';
    v17.innerHTML = '\u2713';
    v12.appendChild(v13);
    v12.appendChild(v16);
    v12.appendChild(v17);
    v5.appendChild(v6);
    v5.appendChild(v12);
    v3.appendChild(v4);
    v3.appendChild(v5);
    const v18 = document.createElement(('div'));
    v18.className = ('theme-dialog-section');
    const v19 = document.createElement(('div'));
        v19.className = ('theme-dialog-section-label');
    v19.textContent = 'Canvas Background';
    const v20 = document.createElement(('div'));
    v20.className = ('theme-dialog-options canvas-options');
    const v21 = document.createElement('div');
        v21.className = ('theme-option canvas-option');
    v21.dataset.canvas = ('light');
    const v22 = document.createElement(('div'));
    v22.className = 'canvas-preview canvas-preview-light';
    const v23 = document.createElement(('span'));
        v23.className = ('theme-option-label');
    v23.textContent = ('White');
    const v24 = document.createElement('div');
        v24.className = ('theme-option-check');
    v24.innerHTML = '\u2713';
    v21.appendChild(v22);
    v21.appendChild(v23);
    v21.appendChild(v24);
    const v25 = document.createElement(('div'));
        v25.className = ('theme-option canvas-option');
    v25.dataset.canvas = ('dark');
    const v26 = document.createElement('div');
    v26.className = 'canvas-preview canvas-preview-dark';
    const v27 = document.createElement(('span'));
        v27.className = 'theme-option-label';
    v27.textContent = 'Black';
    const v28 = document.createElement('div');
        v28.className = 'theme-option-check';
    v28.innerHTML = '\u2713';
    v25.appendChild(v26);
    v25.appendChild(v27);
    v25.appendChild(v28);
    v20.appendChild(v21);
    v20.appendChild(v25);
    v18.appendChild(v19);
    v18.appendChild(v20);
    v2.appendChild(v3);
    v2.appendChild(v18);
    const v29 = document.createElement('div');
    v29.className = 'theme-dialog-section';
    const v30 = document.createElement(('div'));
        v30.className = 'theme-dialog-section-label';
    v30.textContent = ('Skins');
    const v31 = document.createElement('div');
        v31.className = 'theme-dialog-section-description';
    v31.textContent = ('Color palette for signals, vectors, arrows, markers and WaveDrom export');
    const v32 = document.createElement('div');
    v32.className = ('skins-container');
        const v33 = (('function') == typeof getAllSkins) ? (getAllSkins()) : {};
    const num = ('function' == typeof getCurrentSkin) ? (getCurrentSkin()).id : ('black');
    let v34 = num;
        Object.values(v33).forEach(cur => {
      const v47 = document.createElement('div');
            v47.className = 'skin-option';
      v47.dataset.skin = cur.id;
      (cur.id === num) && v47.classList.add(('selected'));
      const v48 = document.createElement(('div'));
            v48.className = 'skin-preview';
      v48.style.backgroundColor = ('var(--section-bg)');
      const v49 = document.createElement('div');
      v49.className = 'skin-swatches';
      const v50 = document.createElement(('div'));
            v50.className = 'skin-swatch';
      v50.style.backgroundColor = cur.signalColor;
      v50.title = ('Signal');
      v49.appendChild(v50);
      const v51 = document.createElement(('div'));
            v51.className = 'skin-swatch';
      v51.style.backgroundColor = cur.arrowColor;
      v51.title = 'Arrow';
      v49.appendChild(v51);
      cur.vectorColors.slice(0, 4).forEach((v54, n) => {
        const v55 = document.createElement('div');
                v55.className = ('skin-swatch skin-swatch-small');
        v55.style.backgroundColor = v54;
        v55.title = 'Vector ' + (n + (1));
        v49.appendChild(v55);
      });
      v48.appendChild(v49);
      const v52 = document.createElement('div');
            v52.className = ('skin-name');
      v52.textContent = cur.name;
      const v53 = document.createElement(('div'));
            v53.className = ('skin-check');
      v53.innerHTML = '\u2713';
      v47.appendChild(v48);
      v47.appendChild(v52);
      v47.appendChild(v53);
      v32.appendChild(v47);
      v47.addEventListener('click', () => {
                v34 = cur.id;
        v32.querySelectorAll('.skin-option').forEach(v54 => {
                    v54.classList.toggle('selected', (v54.dataset.skin === cur.id));
        });
      });
    });
    v29.appendChild(v30);
    v29.appendChild(v31);
    v29.appendChild(v32);
    v2.appendChild(v29);
    const v35 = document.createElement('div');
    v35.className = ('theme-dialog-footer');
    const v36 = document.createElement('button');
        v36.className = 'wp-modal-btn';
    v36.textContent = ('Cancel');
    const v37 = document.createElement(('button'));
        v37.className = 'wp-modal-btn primary';
    v37.textContent = 'Apply';
    v35.appendChild(v36);
    v35.appendChild(v37);
    val.appendChild(tmp);
    val.appendChild(v2);
    val.appendChild(v35);
    el.appendChild(val);
    document.body.appendChild(el);
        const v38 = document.body.classList.contains('dark') ? 'dark' : 'light';
    const v39 = document.body.classList.contains(('canvas-dark')) ? ('dark') : 'light';
        let v40 = v38;
    let v41 = v39;
        const fn = n => {
                                v40 = n;
                v6.classList.toggle(('selected'), ('light') === n);
                v12.classList.toggle('selected', (('dark') === n));
      };
    const v42 = n => {
                                v41 = n;
                v21.classList.toggle('selected', ('light' === n));
                v25.classList.toggle('selected', 'dark' === n);
      };
        (fn(v38));
    (v42(v39));
    const v43 = v47 => {
                        el.remove();
            (item(v47));
    };
        v6.addEventListener(('click'), () => fn('light'));
    v12.addEventListener('click', () => fn('dark'));
    v21.addEventListener(('click'), () => v42('light'));
    v25.addEventListener('click', () => v42('dark'));
    v1.addEventListener(('click'), () => v43(null));
    v36.addEventListener(('click'), () => v43(null));
    v37.addEventListener(('click'), () => v43({
      theme: v40,
      canvasTheme: v41,
      skin: v34
    }));
    el.addEventListener('click', ev => {
            ev.target === el && (v43(null));
    });
    const v44 = v47 => {
            'Escape' === v47.key ? (v43(null)) : ('Enter') === v47.key && v43({
        theme: v40,
        canvasTheme: v41,
        skin: v34
      });
    };
    document.addEventListener('keydown', v44);
        const v45 = v43;
    const v46 = v47 => {
                                document.removeEventListener('keydown', v44);
                (v45(v47));
      };
        v1.onclick = () => v46(null);
    v36.onclick = () => v46(null);
    v37.onclick = () => v46({
      theme: v40,
      canvasTheme: v41,
      skin: v34
    });
    el.onclick = ev => {
            ev.target === el && (v46(null));
    };
  });
}
function applySkin(item) {
  'function' == typeof setCurrentSkin && (setCurrentSkin(item));
}
function applyTheme(num) {
    ('dark') === num ? document.body.classList.add('dark') : document.body.classList.remove(('dark'));
  localStorage.setItem('theme', num);
  ('function') == typeof updatePaintColorBox && updatePaintColorBox();
  (('function') == typeof drawWaveform) && (drawWaveform());
}
function applyCanvasTheme(num) {
    (('dark') === num) ? document.body.classList.add(('canvas-dark')) : document.body.classList.remove('canvas-dark');
  localStorage.setItem(('canvasTheme'), num);
  ('function') == typeof drawWaveform && (drawWaveform());
}
function getCurrentCanvasTheme() {
  return document.body.classList.contains(('canvas-dark')) ? 'dark' : ('light');
}
function getCurrentTheme() {
  return document.body.classList.contains('dark') ? ('dark') : ('light');
}
function getDefaultSignalColor() {
  return getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
}
function getDefaultVectorColor() {
  return getComputedStyle(document.body).getPropertyValue(('--signal-color')).trim() || '#000000';
}
'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', initSkins) : initSkins();
const VcdHierarchyPanel = function () {
  'use strict';
    let item = false;
  let val = '';
  let tmp = new Set();
  function v0() {
    !function () {
      if (document.getElementById('vcd-hierarchy-panel'))
        return;
      const v6 = document.createElement(('div'));
            v6.id = ('vcd-hierarchy-panel');
      v6.className = 'vcd-hierarchy-panel hidden';
      v6.innerHTML = ('\n            <div class="vcd-panel-header">\n                <span class="vcd-panel-title">VCD Signals</span>\n                <div class="vcd-panel-actions">\n                    <button id="vcd-transfer-btn" class="vcd-panel-btn" title="Transfer selected signals to waveform">\n                        \u2795 Add to Waveform\n                    </button>\n                    <button id="vcd-transfer-all-btn" class="vcd-panel-btn" title="Transfer all signals from current module">\n                        \u2795 Add All\n                    </button>\n                    <button id="vcd-close-btn" class="vcd-panel-btn close" title="Close VCD panel">\u2715</button>\n                </div>\n            </div>\n            <div class="vcd-panel-search">\n                <input type="text" id="vcd-search-input" placeholder="Search signals..." />\n            </div>\n            <div class="vcd-panel-content">\n                <div class="vcd-panel-splitter">\n                    <div class="vcd-hierarchy-tree" id="vcd-hierarchy-tree">\n                        <div class="vcd-tree-empty">No VCD file loaded</div>\n                    </div>\n                    <div class="vcd-splitter-handle" id="vcd-splitter-handle"></div>\n                    <div class="vcd-signal-list" id="vcd-signal-list">\n                        <div class="vcd-list-empty">Select a module</div>\n                    </div>\n                </div>\n            </div>\n            <div class="vcd-panel-footer">\n                <span id="vcd-status">Ready</span>\n                <span id="vcd-signal-count"></span>\n            </div>\n        ');
      const v7 = document.getElementById('main-area');
            v7 && v7.parentNode ? v7.parentNode.insertBefore(v6, v7.nextSibling) : document.body.appendChild(v6);
      (function () {
        const v8 = document.getElementById('vcd-close-btn');
        v8 && v8.addEventListener(('click'), () => v1());
        const v9 = document.getElementById('vcd-transfer-btn');
        v9 && v9.addEventListener(('click'), () => v4());
        const v10 = document.getElementById('vcd-transfer-all-btn');
        v10 && v10.addEventListener('click', () => function () {
          const v13 = document.getElementById('vcd-signal-list');
          if (!v13)
            return;
          const arr = v13.querySelectorAll('.vcd-signal-item');
          (0 !== arr.length) ? (tmp.clear(), arr.forEach(v14 => {
                        (('none') !== v14.style.display) && tmp.add(parseInt(v14.dataset.index));
          }), v4()) : ('function' == typeof wpAlert) && wpAlert(('No signals in current module'), ('VCD Import'));
        }());
        const v11 = document.getElementById('vcd-search-input');
        v11 && v11.addEventListener(('input'), ev => function (v13) {
          const v14 = document.getElementById(('vcd-signal-list'));
          if (!v14)
            return;
                    const arr = v14.querySelectorAll('.vcd-signal-item');
          const v15 = v13.toLowerCase();
          arr.forEach(v16 => {
            const v17 = v16.querySelector('.vcd-signal-name');
            if (v17) {
              const v18 = v17.textContent.toLowerCase().includes(v15);
              v16.style.display = (v18 || !v13) ? '' : ('none');
            }
          });
        }(ev.target.value));
        const v12 = document.getElementById('vcd-splitter-handle');
        if (v12) {
                    let flag = false;
          let num = 0;
          let n = 0;
                    v12.addEventListener(('mousedown'), ev => {
                                                flag = true;
                        num = ev.clientX;
            const v13 = document.getElementById('vcd-hierarchy-tree');
                        n = v13.offsetWidth;
            document.body.style.cursor = 'col-resize';
            ev.preventDefault();
          });
          document.addEventListener(('mousemove'), ev => {
                        if (!flag)
              return;
                        const v13 = document.getElementById('vcd-hierarchy-tree');
            const v14 = (ev.clientX - num);
            const v15 = Math.max(100, Math.min(400, n + v14));
            v13.style.width = v15 + 'px';
          });
          document.addEventListener('mouseup', () => {
                        flag && (flag = false, document.body.style.cursor = '');
          });
        }
      }());
    }();
    const el = document.getElementById('vcd-hierarchy-panel');
    if (el) {
            el.classList.remove('hidden');
      item = true;
      const v6 = document.getElementById(('main-area'));
      v6 && v6.classList.add(('with-vcd-panel'));
    }
  }
  function v1() {
    const el = document.getElementById('vcd-hierarchy-panel');
    if (el) {
            el.classList.add(('hidden'));
      item = false;
      const v6 = document.getElementById('main-area');
      v6 && v6.classList.remove(('with-vcd-panel'));
    }
  }
  function v2(cur) {
        let v6 = cur.signals.length;
    for (const v7 of cur.children.values())
      v6 += (v2(v7));
    return v6;
  }
  function v3(num, v6) {
                val = num;
        tmp.clear();
    const el = document.getElementById('vcd-hierarchy-tree');
    el && el.querySelectorAll(('.vcd-tree-module')).forEach(v9 => {
            v9.classList.toggle('selected', v9.dataset.path === num);
    });
        const arr = [];
    const v7 = (num + '.');
    for (let count = 0; (count < v6.m_vcdSignals.length); count++) {
            const v9 = v6['m_vcdSignals'][count];
      const v10 = v9.fullName || v9.name;
      v10.startsWith(v7) ? v10.substring(v7.length).includes('.') || arr.push({
        index: count,
        name: v9.name,
        fullName: v10
      }) : v10.includes('.') || ('' !== num) || arr.push({
        index: count,
        name: v9.name,
        fullName: v10
      });
    }
    !function (v9, v10) {
      const v11 = document.getElementById('vcd-signal-list');
      if (v11) {
        if (v11.innerHTML = '', (0 !== v9.length))
          for (const v12 of v9) {
            const v13 = document.createElement('div');
                        v13.className = ('vcd-signal-item');
            v13.dataset.index = v12.index;
                        const v14 = v10['m_vcdSignals'][v12.index];
            const n = (v14.type === SignalType.Vector) ? '\uD83D\uDCCA' : '\uD83D\uDCC8';
            const v15 = (v14.type === SignalType.Vector) ? ('[n:0]') : '';
                        v13.title = v12.fullName || v12.name;
            v13.innerHTML = '\n                <span class="vcd-signal-icon">' + n + ('</span>\n                <span class="vcd-signal-name">') + v12.name + ('</span>\n                <span class="vcd-signal-width">') + v15 + ('</span>\n            ');
            v13.addEventListener('click', ev => {
              if (ev.ctrlKey || ev.metaKey)
                tmp.has(v12.index) ? (tmp['delete'](v12.index), v13.classList.remove(('selected'))) : (tmp.add(v12.index), v13.classList.add(('selected')));
              else {
                if (ev.shiftKey && (tmp.size > 0)) {
                                    const v16 = Array.from(tmp).pop();
                  const v17 = v11.querySelectorAll(('.vcd-signal-item'));
                  let flag = false;
                                    v17.forEach(v18 => {
                    const v19 = parseInt(v18.dataset.index);
                    v19 === v16 || (v19 === v12.index) ? (flag = !flag, tmp.add(v19), v18.classList.add(('selected'))) : flag && (tmp.add(v19), v18.classList.add('selected'));
                  });
                  tmp.add(v12.index);
                  v13.classList.add('selected');
                } else
                  v11.querySelectorAll('.vcd-signal-item').forEach(v16 => {
                                        v16.classList.remove(('selected'));
                  }), tmp.clear(), tmp.add(v12.index), v13.classList.add(('selected'));
              }
            });
            v13.addEventListener('dblclick', () => {
                                                        tmp.clear();
                            tmp.add(v12.index);
                            v4();
            });
            v11.appendChild(v13);
          }
        else
          v11.innerHTML = ('<div class="vcd-list-empty">No signals in this module</div>');
      }
    }(arr, v6);
    const v8 = document.getElementById('vcd-status');
    v8 && (v8.textContent = 'Module: ' + (num || ('(root)')));
  }
  function v4() {
        (0 !== tmp.size) ? void (0) !== document_wave && void (0) !== VcdIO && (VcdIO.transferVcdSignalsToMain(document_wave, Array.from(tmp)), ('function' == typeof drawWaveform) && drawWaveform(), ('function') == typeof updateSidePanels && updateSidePanels(), ('function') == typeof wpAlert && (wpAlert('Transferred ' + tmp.size + ' signal(s) to waveform', ('VCD Import')))) : ('function' == typeof wpAlert) && wpAlert('Please select signals to transfer', ('VCD Import'));
  }
  function v5() {
        const el = document.getElementById('vcd-hierarchy-tree');
    const v6 = document.getElementById('vcd-signal-list');
    const v7 = document.getElementById('vcd-status');
    const v8 = document.getElementById(('vcd-signal-count'));
        el && (el.innerHTML = '<div class="vcd-tree-empty">No VCD file loaded</div>');
    v6 && (v6.innerHTML = ('<div class="vcd-list-empty">Select a module</div>'));
    v7 && (v7.textContent = 'Ready');
    v8 && (v8.textContent = '');
    val = '';
    tmp.clear();
  }
  return {
    show: v0,
    hide: v1,
    toggle: function () {
            item ? (v1()) : v0();
    },
    isOpen: function () {
      return item;
    },
    rebuildHierarchy: function (v6) {
      if (!v6 || !v6.m_vcdSignals || 0 === v6.m_vcdSignals.length)
        return void v5();
      (v0());
            const el = document.getElementById(('vcd-hierarchy-tree'));
      const v7 = document.getElementById(('vcd-signal-count'));
      if (!el)
        return;
      const v8 = VcdIO.buildHierarchy(v6.m_vcdSignals);
      if (v7 && (v7.textContent = v6.m_vcdSignals.length + ' signals'), el.innerHTML = '', 0 === v8.children.size && 0 === v8.signals.length)
        return void (el.innerHTML = ('<div class="vcd-tree-empty">No signals found</div>'));
      const fn = (v10, num = '') => {
        const v11 = document.createElement('div');
        v11.className = 'vcd-tree-node';
        for (const [n, v12] of v10.children) {
                    const v13 = num ? num + '.' + n : n;
          const v14 = document.createElement('div');
          v14.className = ('vcd-tree-module');
                    const v15 = v12.children.size > 0;
          const v16 = (v2(v12));
          if (v14.innerHTML = '\n                    <span class="vcd-tree-toggle">' + (v15 ? '\u25B6' : '\u2022') + ('</span>\n                    <span class="vcd-tree-icon">\uD83D\uDCC1</span>\n                    <span class="vcd-tree-name">') + n + ('</span>\n                    <span class="vcd-tree-count">(') + v16 + (')</span>\n                '), v14.dataset.path = v13, v14.addEventListener(('click'), ev => {
                                                        ev.stopPropagation();
                            (v3(v13, v6));
                            const v17 = v14.querySelector('.vcd-tree-toggle');
              const v18 = v14.nextElementSibling;
              if (v18 && v18.classList.contains(('vcd-tree-children'))) {
                const v19 = !v18.classList.contains(('hidden'));
                                v18.classList.toggle('hidden');
                v17 && (v17.textContent = v19 ? '\u25B6' : '\u25BC');
              }
            }), v11.appendChild(v14), v15) {
            const v17 = document.createElement(('div'));
                        v17.className = 'vcd-tree-children';
            v17.appendChild((fn(v12, v13)));
            v11.appendChild(v17);
          }
        }
        return v11;
      };
            el.appendChild(fn(v8));
      el.querySelectorAll(('.vcd-tree-toggle')).forEach(v10 => {
                if ('\u25B6' === v10.textContent) {
          const v11 = v10.parentElement.nextElementSibling;
          v11 && v11.classList.contains('vcd-tree-children') && (v11.classList.remove(('hidden')), v10.textContent = '\u25BC');
        }
      });
      const v9 = el.querySelector(('.vcd-tree-module'));
      v9 && v3(v9.dataset.path, v6);
    },
    clearPanel: v5
  };
}();
async function toggleTheme() {
  const item = await (openThemeDialog());
  item && ((applyTheme(item.theme)), (applyCanvasTheme(item.canvasTheme)), item.skin && 'function' == typeof setCurrentSkin && (setCurrentSkin(item.skin)));
}
function updateSidePanels() {
}
function selectSignal(item) {
    selectedSignalIndex = item;
  (updateSidePanels());
  (updateColorPicker());
}
async function renameSignal(item) {
  const val = document_wave.signalList()[item];
  const tmp = await (wpPrompt('Enter new name:', val.name, ('Rename Signal')));
  tmp && tmp.trim() && (document_wave.setSignalName(item, tmp.trim()), (updateSidePanels()), drawWaveform());
}
function updateColorPicker() {
  if (!document_wave)
    return;
  const item = document.getElementById(('signal-color'));
  if (selectedSignalIndex >= 0) {
    const val = document_wave.signalList()[selectedSignalIndex];
        item.value = val.color || '#000000';
    item.style.display = ('inline');
  } else
    item.style.display = 'none';
}
async function addClockSignalDialog() {
  const item = await (wpPrompt(('Clock name:'), 'clk', 'Add Clock Signal'));
  if (!item)
    return;
  const num = await (wpPrompt('High time (samples):', '1', 'Add Clock Signal'));
  if (null === num)
    return;
  const n = (parseInt(num, 10));
  if ((isNaN(n)) || n < 1)
    return;
  const val = await wpPrompt('Low time (samples):', '1', 'Add Clock Signal');
  if ((null === val))
    return;
  const tmp = (parseInt(val, 10));
  if (isNaN(tmp) || (tmp < 1))
    return;
    const v0 = (n + tmp);
  const v1 = document_wave.m_sampleCount;
  const v2 = Math.ceil(v1 / v0);
  const v3 = document_wave.addClockSignal(item, v2, n, tmp);
    ('function' == typeof getSelectedPaintColor) && getSelectedPaintColor() && v3 >= 0 && document_wave.setSignalColor(v3, getSelectedPaintColor());
  (drawWaveform());
  updateSidePanels();
}
async function addCounterSignalDialog() {
  const item = await (wpPrompt('Counter name:', 'cnt', ('Add Counter Signal')));
  if (!item)
    return;
  const num = await (wpPrompt(('Time Step:'), '1', 'Add Counter Signal'));
  if (null === num)
    return;
  const n = (parseInt(num, 10));
  if (isNaN(n) || (n < 0))
    return;
  const val = await wpPrompt(('From value:'), '0', ('Add Counter Signal'));
  if (null === val)
    return;
  const tmp = (parseInt(val, 10));
  if (isNaN(tmp) || (tmp < 0))
    return;
  const v0 = await wpPrompt(('To value:'), '15', ('Add Counter Signal'));
  if ((null === v0))
    return;
  const v1 = parseInt(v0, 10);
  if (isNaN(v1) || (v1 < 0))
    return;
  const v2 = document_wave.addCounterSignal(item, n, tmp, v1);
    'function' == typeof getSelectedPaintColor && (getSelectedPaintColor()) && (v2 >= 0) && document_wave.setSignalColor(v2, getSelectedPaintColor());
  (drawWaveform());
  (updateSidePanels());
}
async function addResetSignalDialog() {
  const item = await (wpPrompt(('Signal name:'), 'rst_n', 'Add Reset Signal'));
  if (!item)
    return;
  const num = await wpPrompt('Active cycles:', '5', ('Add Reset Signal'));
  if (null === num)
    return;
  const n = parseInt(num, 10);
  if ((isNaN(n)) || (n < 1))
    return;
    const val = await wpConfirm('Active High? (OK = Active High, Cancel = Active Low)', ('Add Reset Signal'));
  const tmp = document_wave.addResetSignal(item, n, val);
    ('function' == typeof getSelectedPaintColor) && (getSelectedPaintColor()) && tmp >= 0 && document_wave.setSignalColor(tmp, getSelectedPaintColor());
  (drawWaveform());
  updateSidePanels();
}
async function addPulseSignalDialog() {
  const item = await (wpPrompt(('Signal name:'), 'pulse', 'Add Pulse Signal'));
  if (!item)
    return;
  const num = await (wpPrompt('Pulse start sample:', '2', ('Add Pulse Signal')));
  if (null === num)
    return;
  const n = parseInt(num, 10);
  if ((isNaN(n)) || (n < 0))
    return;
  const val = await (wpPrompt('Pulse width (samples):', '3', ('Add Pulse Signal')));
  if (null === val)
    return;
  const tmp = (parseInt(val, 10));
  if ((isNaN(tmp)) || (tmp < 1))
    return;
  const v0 = document_wave.addPulseSignal(item, n, tmp);
    'function' == typeof getSelectedPaintColor && (getSelectedPaintColor()) && v0 >= 0 && document_wave.setSignalColor(v0, (getSelectedPaintColor()));
  (drawWaveform());
  (updateSidePanels());
}
async function addStrobeSignalDialog() {
  const item = await (wpPrompt('Signal name:', ('strobe'), 'Add Strobe Signal'));
  if (!item)
    return;
  const num = await (wpPrompt('Period (samples):', '5', ('Add Strobe Signal')));
  if ((null === num))
    return;
  const n = (parseInt(num, 10));
  if ((isNaN(n)) || n < 2)
    return;
  const val = await (wpPrompt('Pulse width (samples):', '1', 'Add Strobe Signal'));
  if ((null === val))
    return;
  const tmp = parseInt(val, 10);
  if ((isNaN(tmp)) || tmp < 1 || (tmp >= n))
    return;
  const v0 = document_wave.addStrobeSignal(item, n, tmp);
    (('function') == typeof getSelectedPaintColor) && (getSelectedPaintColor()) && (v0 >= 0) && document_wave.setSignalColor(v0, (getSelectedPaintColor()));
  drawWaveform();
  updateSidePanels();
}
async function addPWMSignalDialog() {
  const item = await (wpPrompt(('Signal name:'), 'pwm', ('Add PWM Signal')));
  if (!item)
    return;
  const num = await (wpPrompt(('Period (samples):'), '10', ('Add PWM Signal')));
  if (null === num)
    return;
  const n = (parseInt(num, 10));
  if ((isNaN(n)) || (n < 2))
    return;
  const val = await (wpPrompt(('Duty cycle %:'), '50', 'Add PWM Signal'));
  if ((null === val))
    return;
  const tmp = parseInt(val, 10);
  if ((isNaN(tmp)) || (tmp < 0) || (tmp > 100))
    return;
  const v0 = document_wave.addPWMSignal(item, n, tmp);
    ('function' == typeof getSelectedPaintColor) && (getSelectedPaintColor()) && v0 >= 0 && document_wave.setSignalColor(v0, (getSelectedPaintColor()));
  drawWaveform();
  updateSidePanels();
}
async function addRampSignalDialog() {
  const item = await (wpPrompt('Signal name:', ('ramp'), 'Add Ramp Signal'));
  if (!item)
    return;
  const num = await wpPrompt('Start value:', '0', 'Add Ramp Signal');
  if ((null === num))
    return;
  const val = (parseInt(num, 10));
  if (isNaN(val))
    return;
  const n = await (wpPrompt(('End value:'), '10', ('Add Ramp Signal')));
  if ((null === n))
    return;
  const tmp = parseInt(n, 10);
  if (isNaN(tmp))
    return;
  const v0 = await (wpPrompt('Step size:', '1', 'Add Ramp Signal'));
  if (null === v0)
    return;
  const v1 = parseInt(v0, 10);
  if ((isNaN(v1)) || 0 === v1)
    return;
  const v2 = document_wave.addRampSignal(item, val, tmp, v1);
    'function' == typeof getSelectedPaintColor && getSelectedPaintColor() && (v2 >= 0) && document_wave.setSignalColor(v2, (getSelectedPaintColor()));
  drawWaveform();
  (updateSidePanels());
}
async function addWalkingOneSignalDialog() {
  const item = await (wpPrompt('Signal name:', ('walking_one'), 'Add Walking One'));
  if (!item)
    return;
  const num = await (wpPrompt('Bit width:', '4', ('Add Walking One')));
  if ((null === num))
    return;
  const n = parseInt(num, 10);
  if ((isNaN(n)) || n < 1 || n > 32)
    return;
  const val = document_wave.addWalkingOneSignal(item, n);
    ('function') == typeof getSelectedPaintColor && getSelectedPaintColor() && val >= 0 && document_wave.setSignalColor(val, (getSelectedPaintColor()));
  drawWaveform();
  (updateSidePanels());
}
async function addWalkingZeroSignalDialog() {
  const item = await (wpPrompt('Signal name:', ('walking_zero'), ('Add Walking Zero')));
  if (!item)
    return;
  const num = await wpPrompt('Bit width:', '4', 'Add Walking Zero');
  if (null === num)
    return;
  const n = parseInt(num, 10);
  if (isNaN(n) || (n < 1) || (n > 32))
    return;
  const val = document_wave.addWalkingZeroSignal(item, n);
    ('function' == typeof getSelectedPaintColor) && getSelectedPaintColor() && (val >= 0) && document_wave.setSignalColor(val, getSelectedPaintColor());
  (drawWaveform());
  updateSidePanels();
}
async function addBusIdleSignalDialog() {
  const item = await (wpPrompt(('Signal name:'), ('bus_idle'), ('Add Bus Idle')));
  if (!item)
    return;
  const num = await (wpPrompt('Idle value:', '0', ('Add Bus Idle')));
  if (null === num)
    return;
  const val = (parseInt(num, 10));
  if (isNaN(val))
    return;
  const n = document_wave.addBusIdleSignal(item, val);
    (('function') == typeof getSelectedPaintColor) && (getSelectedPaintColor()) && (n >= 0) && document_wave.setSignalColor(n, (getSelectedPaintColor()));
  (drawWaveform());
  updateSidePanels();
}
async function addAlternatingSignalDialog() {
  const item = await (wpPrompt('Signal name:', ('alternating'), ('Add Alternating')));
  if (!item)
    return;
  const num = await (wpPrompt('First value:', '0', 'Add Alternating'));
  if ((null === num))
    return;
  const val = parseInt(num, 10);
  if (isNaN(val))
    return;
  const n = await wpPrompt(('Second value:'), '255', 'Add Alternating');
  if (null === n)
    return;
  const tmp = parseInt(n, 10);
  if (isNaN(tmp))
    return;
  const v0 = await (wpPrompt('Samples per value:', '2', ('Add Alternating')));
  if ((null === v0))
    return;
  const v1 = parseInt(v0, 10);
  if (isNaN(v1) || (v1 < 1))
    return;
  const v2 = document_wave.addAlternatingSignal(item, val, tmp, v1);
    (('function') == typeof getSelectedPaintColor) && (getSelectedPaintColor()) && v2 >= 0 && document_wave.setSignalColor(v2, (getSelectedPaintColor()));
  drawWaveform();
  (updateSidePanels());
}
async function addGrayCodeSignalDialog() {
  const item = await (wpPrompt('Signal name:', ('gray_code'), 'Add Gray Code'));
  if (!item)
    return;
  const num = await wpPrompt('Start value:', '0', ('Add Gray Code'));
  if (null === num)
    return;
  const n = (parseInt(num, 10));
  if (isNaN(n) || n < 0)
    return;
  const val = await wpPrompt('End value:', '7', ('Add Gray Code'));
  if ((null === val))
    return;
  const tmp = (parseInt(val, 10));
  if (isNaN(tmp) || (tmp < 0))
    return;
  const v0 = document_wave.addGrayCodeSignal(item, n, tmp);
    ('function') == typeof getSelectedPaintColor && (getSelectedPaintColor()) && v0 >= 0 && document_wave.setSignalColor(v0, getSelectedPaintColor());
  (drawWaveform());
  (updateSidePanels());
}
async function exportTxtAction() {
  try {
    'function' == typeof saveAsTxt ? await (saveAsTxt()) : await wpAlert(('TXT export not available. TxtCsvIO.js may not be loaded.'), 'Error');
  } catch (item) {
    await (wpAlert((('Failed to export TXT: ') + item.message), 'Export Error'));
  }
}
async function exportCsvAction() {
  try {
    ('function' == typeof saveAsCsv) ? await (saveAsCsv()) : await (wpAlert(('CSV export not available. TxtCsvIO.js may not be loaded.'), 'Error'));
  } catch (item) {
    await wpAlert(('Failed to export CSV: ') + item.message, 'Export Error');
  }
}
async function importVcdAction() {
  try {
    if (void (0) === VcdIO)
      return void await wpAlert(('VCD import not available'), 'Error');
    const item = VcdIO.getConfig();
    if (!await wpConfirm('VCD Import limits for web:\n\u2022 Max file size: ' + item.maxFileSizeMB + ('MB\n\u2022 Max samples: ') + item.maxSamples.toLocaleString() + ('\n\u2022 Max signals: ') + item.maxSignals + ('\n\nContinue?'), ('Import VCD File')))
      return;
    if (await VcdIO.loadFromVcd(document_wave, val => true)) {
      const val = document.getElementById(('sample-spin'));
            val && (val.value = document_wave.m_sampleCount);
      void (0) !== VcdHierarchyPanel && VcdHierarchyPanel.rebuildHierarchy(document_wave);
      drawWaveform();
      updateSidePanels();
      await wpAlert('VCD file imported successfully!\n' + document_wave.m_vcdSignals.length + (' signals loaded.\n\nUse the VCD Signals panel to add signals to the waveform.'), 'Import VCD');
    } else {
      const val = VcdIO.getLastError();
      await (wpAlert('Failed to import VCD file: ' + (val || ('Unknown error')), ('Error')));
    }
  } catch (item) {
    await wpAlert('Failed to import VCD file: ' + item.message, ('Error'));
  }
}
async function exportVcdAction() {
  try {
    if ((void 0 === VcdIO))
      return void await wpAlert(('VCD export not available'), 'Error');
        const item = document_wave.m_signals ? document_wave.m_signals.filter(v2 => v2 && v2.type !== SignalType.BlankRow) : [];
    const val = document_wave.m_vcdSignals ? document_wave.m_vcdSignals.filter(v2 => v2 && v2.type !== SignalType.BlankRow) : [];
    const tmp = item.length > 0;
    const v0 = val.length > 0;
    if ((!tmp && !v0))
      return void await wpAlert('No signals to export.\n\nAdd signals to the waveform first, or import a VCD file.', ('Export VCD'));
    let num = '';
    tmp ? num = 'Will export ' + item.length + (' signal(s) from the waveform.') : v0 && (num = 'Will export ' + val.length + (' VCD signal(s).\n\nNote: Transfer VCD signals to waveform for editing before export.'));
    const v1 = await wpPrompt(num + ('\n\nEnter file name:'), 'waveform.vcd', ('Export VCD'));
    if (v1) {
      if (await VcdIO.saveAsVcd(document_wave, v1)) {
        const n = tmp ? item.length : val.length;
        await (wpAlert('VCD file exported successfully!\n\n' + n + ' signal(s) exported.', 'Export VCD'));
      } else {
        const n = VcdIO.getLastError();
        n && await wpAlert(('Failed to export VCD file: ' + n), ('Error'));
      }
    }
  } catch (item) {
    await (wpAlert(('Failed to export VCD file: ' + item.message), ('Error')));
  }
}
function toggleVcdPanel() {
  (void 0 !== VcdHierarchyPanel) && (VcdHierarchyPanel.isOpen() ? VcdHierarchyPanel.hide() : (VcdHierarchyPanel.show(), document_wave.m_vcdSignals && (document_wave.m_vcdSignals.length > 0) && VcdHierarchyPanel.rebuildHierarchy(document_wave)));
}
async function importWaveDromAction() {
  try {
    ('undefined' != typeof WaveDromIO) && WaveDromIO.openWaveDromFile ? await WaveDromIO.openWaveDromFile(document_wave) && (document.getElementById(('sample-spin')).value = document_wave.m_sampleCount, document.getElementById('substep-spin').value = document_wave.m_subStepCount, requestAnimationFrame(() => {
                        drawWaveform();
            updateSidePanels();
            (requestAnimationFrame(() => {
    (openWaveDromDebugPanel());
}));
    }), await wpAlert('WaveDrom file imported successfully!', ('Import WaveDrom'))) : await (wpAlert(('WaveDrom import not available'), 'Error'));
  } catch (item) {
    await wpAlert(('Failed to import WaveDrom file: ') + item.message, ('Error'));
  }
}
async function exportWaveDromAction() {
  try {
    if (('undefined' != typeof WaveDromIO) && WaveDromIO.saveAsWaveDrom) {
      const item = await wpPrompt('Enter file name:', ('waveform.json'), 'Export WaveDrom');
      item && await WaveDromIO.saveAsWaveDrom(document_wave, item) && await wpAlert('WaveDrom file exported successfully!', ('Export WaveDrom'));
    } else
      await wpAlert(('WaveDrom export not available'), 'Error');
  } catch (item) {
    await (wpAlert(('Failed to export WaveDrom file: ') + item.message, ('Error')));
  }
}
async function showWaveDromCodeAction() {
  try {
    ('undefined') != typeof WaveDromIO && WaveDromIO.showWaveDromCode ? await WaveDromIO.showWaveDromCode(document_wave) : await (wpAlert(('WaveDrom code viewer not available'), ('Error')));
  } catch (item) {
    await (wpAlert((('Failed to show WaveDrom code: ') + item.message), 'Error'));
  }
}
!function () {
  'use strict';
  function item() {
    const el = document.getElementById('sponsors-panel');
    if (!el)
      return;
        (val(el, false, true));
    el.offsetHeight;
    document.body.classList.add('sponsors-ready');
    const v0 = document.getElementById(('sponsors-panel-toggle'));
    v0 && v0.addEventListener('click', function (ev) {
            ev.stopPropagation();
      const v1 = el.classList.contains('collapsed');
            val(el, !v1);
      tmp(!v1);
    });
  }
  function val(v0, v1, v2) {
                v1 ? (v0.classList.add(('collapsed')), document.body.classList.add('sponsors-collapsed')) : (v0.classList.remove('collapsed'), document.body.classList.remove(('sponsors-collapsed')));
        window.dispatchEvent(new CustomEvent(('sponsors-panel-toggle'), { detail: { collapsed: v1 } }));
        v2 || (setTimeout(() => {
    window.dispatchEvent(new Event(('resize')));
}, 350));
  }
  function tmp(v0) {
        try {
      localStorage.setItem(('wavepaint_sponsors_collapsed'), String(v0));
    } catch (v1) {
    }
  }
    window.SponsorsPanel = {
    init: item,
    toggle: function () {
      const el = document.getElementById('sponsors-panel');
      if (el) {
        const v0 = el.classList.contains('collapsed');
                val(el, !v0);
        (tmp(!v0));
      }
    },
    expand: function () {
      const el = document.getElementById(('sponsors-panel'));
      el && (val(el, false), (tmp(false)));
    },
    collapse: function () {
      const el = document.getElementById(('sponsors-panel'));
      el && (val(el, true), tmp(true));
    },
    isCollapsed: function () {
      const el = document.getElementById(('sponsors-panel'));
      return !el || el.classList.contains('collapsed');
    }
  };
  document.addEventListener('DOMContentLoaded', item);
}();
'undefined' != typeof module && module.exports && (module.exports = {
  toggleTheme: toggleTheme,
  updateSidePanels: updateSidePanels,
  selectSignal: selectSignal,
  renameSignal: renameSignal,
  updateColorPicker: updateColorPicker
});
'undefined' != typeof module && module.exports && (module.exports = {
  addClockSignalDialog: addClockSignalDialog,
  addCounterSignalDialog: addCounterSignalDialog,
  addResetSignalDialog: addResetSignalDialog,
  addPulseSignalDialog: addPulseSignalDialog,
  addStrobeSignalDialog: addStrobeSignalDialog,
  addPWMSignalDialog: addPWMSignalDialog,
  addRampSignalDialog: addRampSignalDialog,
  addWalkingOneSignalDialog: addWalkingOneSignalDialog,
  addWalkingZeroSignalDialog: addWalkingZeroSignalDialog,
  addBusIdleSignalDialog: addBusIdleSignalDialog,
  addAlternatingSignalDialog: addAlternatingSignalDialog,
  addGrayCodeSignalDialog: addGrayCodeSignalDialog
});
'undefined' != typeof module && module.exports && (module.exports = {
  exportTxtAction: exportTxtAction,
  exportCsvAction: exportCsvAction
});
'undefined' != typeof module && module.exports && (module.exports = {
  importVcdAction: importVcdAction,
  exportVcdAction: exportVcdAction,
  toggleVcdPanel: toggleVcdPanel
});
let waveDromDebugPanelOpen = false;
function toggleWaveDromDebugPanel() {
  const item = document.getElementById(('wavedrom-debug-panel'));
  item && (waveDromDebugPanelOpen = !waveDromDebugPanelOpen, waveDromDebugPanelOpen ? (item.classList.remove('hidden'), document.body.classList.add(('wavedrom-debug-open')), initWaveDromDebugHandlers(), waveDromCodeUserEditing = false, (updateWaveDromDebugCode()), updateSyntaxHighlighting(), (updateLineNumbers())) : (item.classList.add('hidden'), document.body.classList.remove(('wavedrom-debug-open')), waveDromCodeUserEditing = false));
}
function openWaveDromDebugPanel() {
  if (waveDromDebugPanelOpen)
    return void (updateWaveDromDebugCode());
  const item = document.getElementById('wavedrom-debug-panel');
  item && (waveDromDebugPanelOpen = true, waveDromCodeUserEditing = false, item.classList.remove(('hidden')), document.body.classList.add('wavedrom-debug-open'), requestAnimationFrame(() => {
                initWaveDromDebugHandlers();
        (updateWaveDromDebugCode());
        requestAnimationFrame(() => {
            updateSyntaxHighlighting();
      updateLineNumbers();
    });
  }));
}
let waveDromDebugHandlersInitialized = false;
let waveDromCodeUserEditing = false;
let waveDromCodeUpdateDebounceTimer = null;
function initWaveDromDebugHandlers() {
  if (waveDromDebugHandlersInitialized)
    return;
  waveDromDebugHandlersInitialized = true;
    const item = document.getElementById('wavedrom-debug-close');
  const el = document.getElementById(('wavedrom-debug-copy'));
  const val = document.getElementById('wavedrom-debug-open');
  const tmp = document.getElementById(('wavedrom-preview-refresh'));
  const v0 = document.getElementById('wavedrom-debug-code');
    item && item.addEventListener('click', () => {
    toggleWaveDromDebugPanel();
  });
  el && el.addEventListener('click', async () => {
    const v1 = document.getElementById('wavedrom-debug-code');
    v1 && (await navigator.clipboard.writeText(v1.value), el.textContent = ('\u2713 Copied!'), setTimeout(() => {
            el.textContent = '\uD83D\uDCCB Copy';
    }, 2000));
  });
  val && val.addEventListener('click', () => {
        if ('undefined' != typeof WaveDromIO && WaveDromIO.exportToWaveDrom) {
            const v1 = WaveDromIO.exportToWaveDrom(document_wave);
      const num = encodeURIComponent(JSON.stringify(v1));
      window.open('https://wavedrom.com/editor.html?' + num, ('_blank'));
    }
  });
  tmp && tmp.addEventListener(('click'), () => {
    renderWaveDromPreview();
  });
  v0 && (v0.addEventListener('input', () => {
                waveDromCodeUserEditing = true;
        (updateSyntaxHighlighting());
        (updateLineNumbers());
        (clearTimeout(waveDromCodeUpdateDebounceTimer));
        waveDromCodeUpdateDebounceTimer = setTimeout(() => {
      applyWaveDromCodeToWaveform();
    }, 300);
        (debouncedRenderWaveDromPreview());
  }), v0.addEventListener(('scroll'), () => {
        const v1 = document.getElementById('wavedrom-highlight');
    const v2 = document.getElementById('wavedrom-line-numbers');
        v1 && (v1.scrollTop = v0.scrollTop, v1.scrollLeft = v0.scrollLeft);
    v2 && (v2.scrollTop = v0.scrollTop);
  }), v0.addEventListener(('keydown'), ev => {
        if ('Tab' === ev.key) {
      ev.preventDefault();
            const num = v0.selectionStart;
      const v1 = v0.selectionEnd;
      const v2 = v0.value;
            v0.value = (v2.substring(0, num) + '  ') + v2.substring(v1);
      v0.selectionStart = v0.selectionEnd = (num + 2);
      updateSyntaxHighlighting();
    }
  }), v0.addEventListener(('blur'), () => {
    waveDromCodeUserEditing = false;
  }));
  initWaveDromSplitter();
}
function initWaveDromSplitter() {
  const el = document.getElementById('wavedrom-splitter');
  const v0 = document.querySelector(('.wavedrom-code-editor'));
  const item = document.querySelector('.wavedrom-preview-container');
  const val = document.querySelector('.wavedrom-debug-content');
  if (!((el && v0) && item && val))
    return;
    let tmp = false;
  let num = 0;
  let n = 0;
    el.addEventListener('mousedown', ev => {
                tmp = true;
        num = ev.clientX;
        n = v0.offsetWidth;
        el.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = ('none');
        ev.preventDefault();
  });
  document.addEventListener('mousemove', ev => {
        if (!tmp)
      return;
        const v1 = val.offsetWidth;
    const v2 = el.offsetWidth;
    const v3 = ev.clientX - num;
    let v4 = (n + v3);
    const v5 = v1 - v2 - (200);
    v4 = Math.max(200, Math.min(v4, v5));
        const v6 = v1 - v4 - v2;
    const v7 = (v4 / (v4 + v6));
    const v8 = v6 / (v4 + v6);
        v0.style.flex = v7;
    item.style.flex = v8;
  });
  document.addEventListener('mouseup', () => {
        tmp && (tmp = false, el.classList.remove(('dragging')), document.body.style.cursor = '', document.body.style.userSelect = '');
  });
}
function resetWaveDromUserEditing() {
  waveDromCodeUserEditing = false;
}
function updateWaveDromDebugCode() {
  if (!waveDromDebugPanelOpen)
    return;
  if (waveDromCodeUserEditing)
    return;
  const item = document.getElementById('wavedrom-debug-code');
  if (item)
    try {
      if ((('undefined') != typeof WaveDromIO) && WaveDromIO.exportToWaveDromString) {
        const val = WaveDromIO.exportToWaveDromString(document_wave, true);
                item.value = val;
        updateSyntaxHighlighting();
        (updateLineNumbers());
        (setWaveDromStatus(true));
        debouncedRenderWaveDromPreview();
      } else
        item.value = '{ signal: [] }';
    } catch (val) {
      item.value = ('// Error generating code: ' + val.message);
    }
}
function updateSyntaxHighlighting() {
  const item = document.getElementById(('wavedrom-debug-code'));
  const val = document.getElementById('wavedrom-highlight');
  if (!item || !val)
    return;
    const tmp = (highlightJson(item.value));
  const v0 = val.querySelector(('code'));
  v0 && (v0.innerHTML = tmp);
}
function updateLineNumbers() {
  const item = document.getElementById(('wavedrom-debug-code'));
  const val = document.getElementById('wavedrom-line-numbers');
  if (!item || !val)
    return;
  const num = item.value.split('\n').length;
  let tmp = '';
  for (let count = 1; count <= num; count++)
    tmp += '<span class="line-number">' + count + '</span>';
  val.innerHTML = tmp;
}
let waveDromRenderDebounceTimer = null;
let waveDromRenderIndex = 0;
function isWaveDromReady() {
  return ('undefined') != typeof WaveDrom && 'function' == typeof WaveDrom.RenderWaveForm && void (0) !== window.WaveSkin && window['WaveSkin']['default'];
}
function renderWaveDromPreview() {
  const el = document.getElementById(('wavedrom-render-target'));
  if (!el)
    return;
  const item = document.getElementById('wavedrom-debug-code');
  if (!item)
    return;
  const val = item.value;
  try {
    const tmp = WaveDromIO.parseWaveDromCode(val);
    if (!tmp)
      return void (el.innerHTML = '<div style="color:#f48771;padding:20px;">\u26A0️ Invalid WaveDrom JSON</div>');
    if (el.innerHTML = '', (isWaveDromReady()))
      try {
                const num = waveDromRenderIndex++;
        const v0 = 'WaveDrom_Preview_' + num;
        const v1 = document.createElement(('div'));
                v1.id = v0;
        v1.style.cssText = ('min-height:50px;background:#fff;padding:10px;border-radius:4px;');
        el.appendChild(v1);
        (setTimeout(() => {
    try {
        document.getElementById(v0) && WaveDrom.RenderWaveForm(num, tmp, ('WaveDrom_Preview_'), false);
    } catch (v2) {
        const v3 = document.getElementById(v0);
        v3 && (v3.innerHTML = (('<div style="color:#f48771;padding:10px;">\u26A0️ Render failed: ') + v2.message) + ('</div>'));
    }
}, 10));
      } catch (v0) {
        el.innerHTML = ('<div style="color:#f48771;padding:20px;">\u26A0️ Render error: ' + v0.message + ('</div>'));
      }
    else {
            const num = tmp.signal ? tmp.signal.length : 0;
      const v0 = ('undefined') != typeof WaveDrom;
      const v1 = (void 0 !== window.WaveSkin);
      el.innerHTML = '<div style="color:#858585;padding:20px;">\n                <p>\u23F3 Loading WaveDrom library...</p>\n                <p style="font-size:10px;">WaveDrom: ' + (v0 ? '\u2713' : '\u2717') + ' | Skin: ' + (v1 ? '\u2713' : '\u2717') + ('</p>\n                <p><strong>Signals:</strong> ') + num + ('</p>\n            </div>');
      let count = 0;
      const v2 = setInterval(() => {
                isWaveDromReady() ? (clearInterval(v2), renderWaveDromPreview()) : (++count > 10) && (clearInterval(v2), el.innerHTML = '<div style="color:#f48771;padding:20px;">\u26A0️ WaveDrom library failed to load</div>');
      }, 500);
    }
  } catch (tmp) {
    el.innerHTML = '<div style="color:#f48771;padding:20px;">\u26A0️ Error: ' + tmp.message + ('</div>');
  }
}
function debouncedRenderWaveDromPreview() {
    (clearTimeout(waveDromRenderDebounceTimer));
  waveDromRenderDebounceTimer = (setTimeout(() => {
    renderWaveDromPreview();
}, 150));
}
function setWaveDromStatus(item, val = '') {
  const tmp = document.getElementById(('wavedrom-debug-status'));
  tmp && (item ? (tmp.textContent = ('\u2713 Valid'), tmp.className = ('status-ok'), (debouncedRenderWaveDromPreview())) : (tmp.textContent = ('\u2717 ' + (val || 'Invalid JSON')), tmp.className = ('status-error')));
}
function applyWaveDromCodeToWaveform() {
  const item = document.getElementById(('wavedrom-debug-code'));
  if (!item)
    return;
  const val = item.value;
  try {
    const tmp = WaveDromIO.parseWaveDromCode(val);
    if (!tmp)
      return void setWaveDromStatus(false, 'Parse error');
    WaveDromIO.importFromWaveDrom(document_wave, tmp) ? (setWaveDromStatus(true), waveDromCodeUserEditing = true, (drawWaveform()), (setTimeout(() => {
    waveDromCodeUserEditing = false;
}, 100))) : setWaveDromStatus(false, ('Import failed'));
  } catch (tmp) {
    (setWaveDromStatus(false, tmp.message.substring(0, 30)));
  }
}
function highlightJson(item) {
  let val = item.replace(/&/g, ('&amp;')).replace(/</g, ('&lt;')).replace(/>/g, '&gt;');
  return val = val.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, num => '<span class="json-string">' + num + '</span>'), val = val.replace(/(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(\s*:)/g, (tmp, num, n) => '<span class="json-key">' + num + ('</span><span class="json-colon">') + n + '</span>'), val = val.replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, ('<span class="json-number">$1</span>')), val = val.replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>'), val = val.replace(/\bnull\b/g, '<span class="json-null">null</span>'), val = val.replace(/(\[|\])/g, '<span class="json-bracket">$1</span>'), val = val.replace(/(\{|\})/g, ('<span class="json-brace">$1</span>')), val;
}
async function handleAction(item) {
  if (document_wave)
    switch (item) {
    case ('theme'):
      await (toggleTheme());
      break;
    case ('time-axis'):
      if (timeAxisEnabled)
        timeAxisEnabled = false;
      else {
        const num = await wpPrompt(('Time unit (ps, ns, μs, ms, s):'), timeUnit, ('Time Axis'));
        if (null === num)
          break;
        const val = ('u' === num) || 'us' === num ? 'μs' : num;
        [
          'ps',
          'ns',
          'μs',
          'ms',
          's'
        ].includes(val) ? timeUnit = val : (await wpAlert('Invalid unit, using ns', 'Time Axis'), timeUnit = 'ns');
        const n = await (wpPrompt(('Time per main step (number):'), String(timePerStep), 'Time Axis'));
        if ((null === n))
          break;
        const tmp = (parseFloat(n));
                isNaN(tmp) || tmp <= 0 ? (await wpAlert(('Invalid value, using 10'), ('Time Axis')), timePerStep = 10) : timePerStep = tmp;
        timeAxisEnabled = true;
      }
      (drawWaveform());
      break;
    case 'toggle-axis-visibility':
      axisNumbersHidden = !axisNumbersHidden;
      {
        const val = document.querySelector(('[data-action="toggle-axis-visibility"]'));
        val && (val.textContent = axisNumbersHidden ? 'Show Axis Numbers' : ('Hide Axis Numbers'));
      }
      drawWaveform();
      break;
    case 'bit-signal': {
        const val = await (wpPrompt('Enter bit signal name:', 'Bit Signal', 'Add Bit Signal'));
        if (val) {
          const tmp = document_wave.addBitSignal(val);
                    ('function' == typeof getSelectedPaintColor) && getSelectedPaintColor() && document_wave.setSignalColor(tmp, getSelectedPaintColor());
          (drawWaveform());
          updateSidePanels();
        }
      }
      break;
    case 'vector-signal': {
        const val = await (wpPrompt('Enter vector signal name:', 'Vector Signal', ('Add Vector Signal')));
        if (val) {
          const tmp = document_wave.addVectorSignal(val);
                    'function' == typeof getSelectedPaintColor && (getSelectedPaintColor()) && document_wave.setSignalColor(tmp, (getSelectedPaintColor()));
          (drawWaveform());
          (updateSidePanels());
        }
      }
      break;
    case ('clock'):
      await (addClockSignalDialog());
      break;
    case ('counter'):
      await (addCounterSignalDialog());
      break;
    case 'reset':
      await addResetSignalDialog();
      break;
    case ('pulse'):
      await addPulseSignalDialog();
      break;
    case 'strobe':
      await addStrobeSignalDialog();
      break;
    case ('pwm'):
      await addPWMSignalDialog();
      break;
    case 'ramp':
      await addRampSignalDialog();
      break;
    case 'walking-one':
      await (addWalkingOneSignalDialog());
      break;
    case ('walking-zero'):
      await addWalkingZeroSignalDialog();
      break;
    case ('bus-idle'):
      await addBusIdleSignalDialog();
      break;
    case ('alternating'):
      await addAlternatingSignalDialog();
      break;
    case 'gray-code':
      await addGrayCodeSignalDialog();
      break;
    case 'blank-row':
      document_wave.addBlankRow(), (drawWaveform()), (updateSidePanels());
      break;
    case ('tutorial'):
      localStorage.removeItem(('wavepaint_tutorial_done')), ('function') == typeof queueTutorial ? queueTutorial() : (('function') == typeof runTutorial) && runTutorial();
      break;
    case 'contact':
      (showContactPopup());
      break;
    case 'clear-all-signals':
      'function' == typeof document_wave.clearAllWaveView ? document_wave.clearAllWaveView() : document_wave.clearAllSignals(), void (0) !== selectedSignalIndex && (selectedSignalIndex = -1), drawWaveform(), updateSidePanels();
      break;
    case ('import-wavedrom'):
      await importWaveDromAction();
      break;
    case 'export-wavedrom':
      await exportWaveDromAction();
      break;
    case 'show-wavedrom-code':
      await showWaveDromCodeAction();
      break;
    case 'wavedrom-debug':
      toggleWaveDromDebugPanel();
      break;
    case ('export-png'):
      await exportToPNG();
      break;
    case 'export-svg':
      await exportToSVG();
      break;
    case 'export-jpg':
      await (exportToJPG());
      break;
    case 'import-vcd':
      await importVcdAction();
      break;
    case 'export-vcd':
      await exportVcdAction();
      break;
    case 'toggle-vcd-panel':
      (toggleVcdPanel());
      break;
    case 'export-txt':
      await (exportTxtAction());
      break;
    case 'export-csv':
      await exportCsvAction();
    }
}
'undefined' != typeof module && module.exports && (module.exports = {
  importWaveDromAction: importWaveDromAction,
  exportWaveDromAction: exportWaveDromAction,
  showWaveDromCodeAction: showWaveDromCodeAction,
  toggleWaveDromDebugPanel: toggleWaveDromDebugPanel,
  openWaveDromDebugPanel: openWaveDromDebugPanel,
  resetWaveDromUserEditing: resetWaveDromUserEditing,
  updateWaveDromDebugCode: updateWaveDromDebugCode
});
'undefined' != typeof module && module.exports && (module.exports = { handleAction: handleAction });
let waveCellWidth = 48;
const WAVE_CELL_MIN = 4;
const WAVE_CELL_MAX = 200;
const SIGNAL_NAME_WIDTH_MIN = 80;
const SIGNAL_NAME_WIDTH_MAX = 400;
const SIGNAL_NAME_PADDING = 24;
const SIGNAL_NAME_WIDTH = 80;
// [PATCH-A6] 显示层信号名（#89 多比特信号位宽标记）：仅用于绘制/测宽/宽度缓存键。
// 有真实位宽（width>1，由 ui-bridge toNativeSignal 注入 msb/lsb）且名字本身未带
// 位域时拼成 `name[msb:lsb]`；不改 sig.name，避免影响改名/去重/命中/保存。
function displaySignalName(item) {
  const name = (item && 'string' === typeof item.name) ? item.name : '';
  const width = Number(item && item.width);
  if (!name || !(width > 1) || name.includes('['))
    return name;
  const msb = (null != item.msb && '' !== item.msb) ? item.msb : String(width - 1);
  const lsb = (null != item.lsb && '' !== item.lsb) ? item.lsb : '0';
  return name + '[' + msb + ':' + lsb + ']';
}
let _cachedDynamicNameWidth = null;
let _cachedSignalNamesHash = null;
function calculateDynamicNameWidth(v0, arr) {
  if (!arr || (0 === arr.length))
    return 80;
    const num = arr.map(sig => sig.groupName || '').join('|');
  const n = arr.map(v3 => displaySignalName(v3)).join('|') + '::' + num;
  if (_cachedSignalNamesHash === n && (null !== _cachedDynamicNameWidth))
    return _cachedDynamicNameWidth;
  let item = 0;
  void (0) !== document_wave && ('undefined') != typeof GroupManager && (item = GroupManager.getGroups(document_wave).reduce((v3, v4) => Math.max(v3, (v4.depth || 0) + (1)), 0));
  const val = (item > 0) ? (32 + 18 * item) + (10) : 0;
    v0.save();
  v0.font = ('12px Arial');
  let tmp = 0;
  for (const v3 of arr) {
    const v4 = v0.measureText(displaySignalName(v3)).width;
    v4 > tmp && (tmp = v4);
  }
  v0.restore();
    const v1 = (val + tmp + 24);
  const v2 = Math.max(80, Math.min(400, v1));
  return _cachedDynamicNameWidth = v2, _cachedSignalNamesHash = n, v2;
}
function invalidateDynamicNameWidthCache() {
    _cachedDynamicNameWidth = null;
  _cachedSignalNamesHash = null;
}
function getDynamicNameWidth() {
    return void (0) !== ctx && void (0) !== document_wave ? calculateDynamicNameWidth(ctx, document_wave.signalList()) : 80;
}
const WAVEDROM_STYLE = {
  arrowColor: '#0041c4',
  arrowLineWidth: 2,
  arrowHeadSize: 8,
  arrowHeadMarkerWidth: 10,
  arrowHeadMarkerHeight: 7,
  edgeIndicatorColor: '#000000',
  edgeIndicatorFill: '#000000',
  labelFontSize: 11,
  labelBackgroundColor: '#FFFFFF',
  labelTextColor: '#000000',
  waveLineWidth: 1,
  waveFillOpacity: 1,
  clockArrowSize: 8
};
'undefined' != typeof module && module.exports && (module.exports = {
  waveCellWidth: waveCellWidth,
  WAVE_CELL_MIN: 4,
  WAVE_CELL_MAX: 200,
  SIGNAL_NAME_WIDTH: 80,
  SIGNAL_NAME_WIDTH_MIN: 80,
  SIGNAL_NAME_WIDTH_MAX: 400,
  SIGNAL_NAME_PADDING: 24,
  calculateDynamicNameWidth: calculateDynamicNameWidth,
  invalidateDynamicNameWidthCache: invalidateDynamicNameWidthCache,
  getDynamicNameWidth: getDynamicNameWidth,
  WAVEDROM_STYLE: WAVEDROM_STYLE
});
let textExclusionZones = [];
let markerPreviewPosition = -1;
let timeJumpPreviewPosition = -1;
let timeSpanHasStart = false;
let timeSpanStartSignal = -1;
let timeSpanStartPosition = -1;
let timeSpanPreviewSignal = -1;
let timeSpanPreviewPosition = -1;
let textAnnotationPreviewSignal = -1;
let textAnnotationPreviewPosition = -1;
let textAnnotationPreviewArrow = -1;
let textAnnotationPreviewVPos = 'Above';
let paintUndoActive = false;
let cutHasStart = false;
let cutStartSample = -1;
let cutPreviewSample = -1;
let rangeSelecting = false;
let rangeSelStartSignal = -1;
let rangeSelStartSample = -1;
let rangeSelEndSignal = -1;
let rangeSelEndSample = -1;
let rangeSelActive = false;
let clipboard = null;
let pastePreviewSample = -1;
let pastePreviewSignal = -1;
let pendingMoveGroup = null;
let lastRawDragIndex = -1;
let selectedObjectType = null;
let selectedObjectId = null;
let selectedObjects = [];
function getTextExclusionZones() {
  return textExclusionZones;
}
function setTextExclusionZones(item) {
  textExclusionZones = item;
}
function clearTextExclusionZones() {
  textExclusionZones = [];
}
function chooseTimeSpanPlacement() {
  return new Promise(item => {
    const el = document.createElement(('div'));
        el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.background = 'rgba(0,0,0,0.45)';
    el.style.display = 'flex';
    el.style.alignItems = ('center');
    el.style.justifyContent = 'center';
    el.style.zIndex = '10000';
    const v0 = document.createElement('div');
        v0.style.background = ('var(--menu-bg)');
    v0.style.border = '1px solid var(--border-color)';
    v0.style.borderRadius = ('8px');
    v0.style.padding = ('16px');
    v0.style.minWidth = ('260px');
    v0.style.color = 'var(--text-color)';
    const v1 = document.createElement(('div'));
        v1.textContent = ('Time marker');
    v1.style.fontWeight = 'bold';
    v1.style.marginBottom = ('10px');
    const v2 = document.createElement('div');
        v2.textContent = 'Place the time span above or below the signal?';
    v2.style.marginBottom = ('12px');
    const v3 = document.createElement(('div'));
        v3.style.display = 'flex';
    v3.style.justifyContent = ('flex-end');
    v3.style.gap = '8px';
    const val = document.createElement('button');
    val.textContent = ('Above signal');
    const tmp = document.createElement('button');
    tmp.textContent = 'Below signal';
    const v4 = document.createElement(('button'));
        v4.textContent = ('Cancel');
    [
      val,
      tmp,
      v4
    ].forEach(v5 => {
                        v5.style.padding = '6px 10px';
            v5.style.border = '1px solid var(--border-color)';
            v5.style.background = ('var(--menu-bg)');
            v5.style.color = ('var(--text-color)');
            v5.style.cursor = ('pointer');
            v5.style.borderRadius = ('4px');
    });
    val.onclick = () => {
                        document.body.removeChild(el);
            item('above');
    };
    tmp.onclick = () => {
                        document.body.removeChild(el);
            (item('below'));
    };
    v4.onclick = () => {
                        document.body.removeChild(el);
            item('cancel');
    };
    v3.appendChild(v4);
    v3.appendChild(tmp);
    v3.appendChild(val);
    v0.appendChild(v1);
    v0.appendChild(v2);
    v0.appendChild(v3);
    el.appendChild(v0);
    document.body.appendChild(el);
  });
}
function getThemeDefaultSignalColor() {
  return 'function' == typeof getCurrentSkin ? getCurrentSkin().signalColor : getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
}
function getThemeDefaultArrowColor() {
  return (('function') == typeof getCurrentSkin) ? (getCurrentSkin()).arrowColor : WAVEDROM_STYLE.arrowColor;
}
function getThemeDefaultMarkerColor() {
  return ('function') == typeof getCurrentSkin ? (getCurrentSkin()).markerColor : '#00a0ff';
}
function getThemeDefaultTimeJumpColor() {
  return 'function' == typeof getCurrentSkin ? (getCurrentSkin()).timeJumpColor : '#808080';
}
function getThemeDefaultTimeSpanColor() {
  return ('function') == typeof getCurrentSkin ? (getCurrentSkin()).timeSpanColor : ('#00a0ff');
}
function getSignalEffectiveSubSteps(item) {
  if (!document_wave)
    return 0;
  const val = document_wave.subStepCount();
  return item && (item.subSteps > 0) ? item.subSteps : val;
}
function positionToPixelX(num) {
  return getDynamicNameWidth() + num * waveCellWidth;
}
function pixelXToPosition(num) {
  const n = num - getDynamicNameWidth();
  return n < 0 ? 0 : (n / waveCellWidth);
}
function snapPositionToSignalGrid(num, item) {
  const n = (('number' == typeof item) ? item : getSignalEffectiveSubSteps(item)) + (1);
  const val = Math.floor(num);
  const tmp = num - val;
  const v0 = Math.round(tmp * n);
  return v0 >= n ? (val + 1) : (val + (v0 / n));
}
function positionToSignalIndex(num, item) {
  const n = ((('number') == typeof item ? item : getSignalEffectiveSubSteps(item)) + 1);
  const val = Math.floor(num);
  const tmp = num - val;
  return val * n + Math.floor(tmp * n);
}
function signalIndexToPosition(num, item) {
  const n = (('number') == typeof item ? item : getSignalEffectiveSubSteps(item)) + (1);
  return (Math.floor(num / n) + num % n / n);
}
function mapCanvasPosition(num, n, item = {}) {
  if (!document_wave || !canvas)
    return null;
    const {
      snapToEdge: val = false,
      useGlobalOnly: tmp = false,
      useMaxSubSteps: v0 = false
    } = item;
  const v1 = document_wave.signalList();
  const v2 = (getDynamicNameWidth());
  const v3 = document_wave.m_sampleCount;
  const v4 = document_wave.subStepCount();
  const v5 = v4 + (1);
  const v6 = document_wave.maxSubSteps ? document_wave.maxSubSteps() : v4;
  const v7 = Math.floor(((n - 40) / 40));
  const v8 = v7 >= 0 && v7 < v1.length ? v1[v7] : null;
  const v9 = (num - v2);
  if (v9 < 0)
    return {
      signalIndex: v7 >= 0 && (v7 < v1.length) ? v7 : -1,
      signal: v8,
      clickedOnName: true,
      mainStep: -1,
      subStepFraction: 0,
      globalSampleIndex: -1,
      signalSampleIndex: -1,
      signalSubSteps: v8 ? getSignalEffectiveSubSteps(v8) : v4,
      globalSubSteps: v4
    };
  const v10 = v9 / waveCellWidth;
    let count = Math.floor(v10);
  let v11 = v10 - count;
    count < 0 && (count = 0, v11 = 0);
  (count >= v3) && (count = v3 - (1), v11 = 0.999);
    const v12 = tmp ? v4 : v8 ? getSignalEffectiveSubSteps(v8) : v4;
  const v13 = (v12 + 1);
  const v14 = ((v0 ? v6 : v12) + 1);
    let v15;
  let v16;
  let v17;
  val ? (v15 = Math.round(v11 * v5), v16 = Math.round((v11 * v13)), v17 = Math.round(v11 * v14), (v17 >= v14) && (count < v3 - (1) ? (count++, v15 = 0, v16 = 0, v17 = 0, v11 = 0) : (v15 = v5 - (1), v16 = v13 - (1), v17 = (v14 - 1))), (v15 >= v5) && (v15 = v5 - (1)), (v16 >= v13) && (v16 = v13 - (1))) : (v15 = Math.floor(v11 * v5), v16 = Math.floor((v11 * v13)), v17 = Math.floor(v11 * v14));
    const v18 = ((count * v5) + v15);
  const v19 = (count * v13 + v16);
  const v20 = v3 * v5;
  const v21 = (v3 * v13);
  const v22 = (v18 >= 0) && v18 < v20;
  const v23 = v19 >= 0 && (v19 < v21);
  let v24;
  return v24 = val ? count + (v17 / v14) : count + v11, {
    signalIndex: (v7 >= 0) && (v7 < v1.length) ? v7 : -1,
    signal: v8,
    clickedOnName: false,
    position: v24,
    mainStep: count,
    subStepFraction: v11,
    globalSampleIndex: v22 ? v18 : -1,
    globalSubStep: v15,
    globalSubSteps: v4,
    globalDivisor: v5,
    globalEffectiveCount: v20,
    signalSampleIndex: v23 ? v19 : -1,
    signalSubStep: v16,
    signalSubSteps: v12,
    signalDivisor: v13,
    signalEffectiveCount: v21,
    nameWidth: v2,
    relX: v9,
    stepWidth: waveCellWidth,
    globalStepWidth: waveCellWidth / v5,
    signalStepWidth: (waveCellWidth / v13)
  };
}
function mapToSignalSample(item, val) {
  const tmp = (mapCanvasPosition(item, val));
  return !tmp || tmp.clickedOnName || tmp.signalIndex < 0 || (tmp.signalSampleIndex < 0) ? null : {
    signalIndex: tmp.signalIndex,
    sampleIndex: tmp.signalSampleIndex
  };
}
function mapToNearestEdge(item, val) {
  const tmp = (mapCanvasPosition(item, val, { snapToEdge: true }));
  return !tmp || tmp.clickedOnName || (tmp.signalIndex < 0) || tmp.globalSampleIndex < 0 ? null : {
    signalIndex: tmp.signalIndex,
    sampleIndex: tmp.globalSampleIndex
  };
}
function mapXToSample(item) {
  const val = mapCanvasPosition(item, 60, {
      snapToEdge: true,
      useGlobalOnly: true
    });
  return !val || val.globalSampleIndex < 0 ? -1 : val.globalSampleIndex;
}
function quadraticPoint(num, n, item, val, tmp, v0, v1) {
  const v2 = 1 - v1;
  return {
    x: ((v2 * v2 * num) + 2 * v2 * v1 * item + (v1 * v1) * tmp),
    y: ((v2 * v2) * n + (2 * v2 * v1 * val)) + ((v1 * v1) * v0)
  };
}
function cubicPoint(num, n, item, val, tmp, v0, v1, v2, v3) {
  const v4 = (1 - v3);
  const v5 = v4 * v4;
  const v6 = (v5 * v4);
  const v7 = v3 * v3;
  const v8 = v7 * v3;
  return {
    x: (((v6 * num) + ((3 * v5) * v3 * item)) + ((3 * v4) * v7 * tmp) + v8 * v1),
    y: ((v6 * n + (3 * v5 * v3 * val) + ((3 * v4) * v7) * v0) + (v8 * v2))
  };
}
function pointToSegmentDistSq(num, n, item, val, tmp, v0) {
  const v1 = (tmp - item);
  const v2 = (v0 - val);
  const v3 = (v1 * v1 + v2 * v2);
  if ((0 === v3)) {
        const v7 = (num - item);
    const v8 = (n - val);
    return (v7 * v7 + v8 * v8);
  }
  let v4 = (((num - item) * v1 + (n - val) * v2) / v3);
  v4 = Math.max(0, Math.min(1, v4));
    const v5 = (num - (item + (v4 * v1)));
  const v6 = (n - (val + (v4 * v2)));
  return (v5 * v5) + (v6 * v6);
}
function getSharpLineSegments(num, item, n, val, arr) {
  const v0 = [];
  const tmp = n - num;
  if (arr.includes(('-|-')) || '<-|->' === arr) {
    const v1 = num + tmp / (2);
        v0.push({
      x1: num,
      y1: item,
      x2: v1,
      y2: item
    });
    v0.push({
      x1: v1,
      y1: item,
      x2: v1,
      y2: val
    });
    v0.push({
      x1: v1,
      y1: val,
      x2: n,
      y2: val
    });
  } else
    arr.startsWith('-|') || (('<-|>') === arr) ? (v0.push({
      x1: num,
      y1: item,
      x2: n,
      y2: item
    }), v0.push({
      x1: n,
      y1: item,
      x2: n,
      y2: val
    })) : arr.startsWith('|-') ? (v0.push({
      x1: num,
      y1: item,
      x2: num,
      y2: val
    }), v0.push({
      x1: num,
      y1: val,
      x2: n,
      y2: val
    })) : v0.push({
      x1: num,
      y1: item,
      x2: n,
      y2: val
    });
  return v0;
}
function drawVerticalGrid(v0, num, n, item, val, tmp, v1, v2, v3) {
    v0.strokeStyle = (v3 || '#c0c0c0');
  v0.lineWidth = 1;
  for (let count = 0; (count <= num); count++) {
    const v4 = tmp + count * n;
    if (v0.globalAlpha = 1, v0.beginPath(), v0.moveTo(v4, v1), v0.lineTo(v4, v2), v0.stroke(), item > 1) {
            v0.save();
      v0.strokeStyle = 'rgba(120,120,120,0.35)';
      v0.lineWidth = 0.7;
      v0.setLineDash([
        2,
        6
      ]);
      for (let v5 = 1; (v5 < item); v5++) {
        const v6 = v4 + v5 * val;
                v0.beginPath();
        v0.moveTo(v6, v1);
        v0.lineTo(v6, v2);
        v0.stroke();
      }
            v0.setLineDash([]);
      v0.restore();
    }
  }
  v0.globalAlpha = 1;
}
function drawSignalSubstepGrid(v0, num, n, item, val, tmp, v1, v2) {
  if (!(item <= 1)) {
        v0.save();
    v0.strokeStyle = 'rgba(120,120,120,0.35)';
    v0.lineWidth = 0.7;
    v0.setLineDash([
      2,
      6
    ]);
    for (let count = 0; count < num; count++) {
      const v3 = tmp + (count * n);
      for (let v4 = 1; v4 < item; v4++) {
        const v5 = v3 + v4 * val;
                v0.beginPath();
        v0.moveTo(v5, v1);
        v0.lineTo(v5, v2);
        v0.stroke();
      }
    }
        v0.setLineDash([]);
    v0.restore();
  }
}
function drawTimeAxis(v0, num, n, item, val, tmp, v1, v2) {
  const v3 = getComputedStyle(document.body);
  const v4 = ('undefined') != typeof window && (true === window._wpExportMode);
  const v5 = v3.getPropertyValue('--timeaxis-bg').trim() || '#2a2a2e';
  const v6 = v4 ? v3.getPropertyValue('--canvas-text').trim() || ('#333333') : v3.getPropertyValue(('--timeaxis-text')).trim() || '#e0e0e0';
  const v7 = v3.getPropertyValue(('--timeaxis-tick')).trim() || ('#888888');
  const v8 = 22;
    v0.save();
  v4 || (v0.fillStyle = v5, v0.fillRect(0, 0, tmp, v8));
  v0.strokeStyle = v4 ? v3.getPropertyValue('--canvas-grid').trim() || ('#e0e0e0') : v3.getPropertyValue('--border-color').trim() || ('#3a3a3f');
  v0.lineWidth = 1;
  v0.beginPath();
  v0.moveTo(0, v8);
  v0.lineTo(tmp, v8);
  v0.stroke();
  v0.restore();
  v0.fillStyle = v6;
  v0.font = '12px Arial';
    const v9 = ((num - 1) * v1);
  const v10 = (Number.isInteger(v9) ? String(v9) : v9.toPrecision(4)) + ' ' + v2;
  const v11 = v0.measureText(v10).width + (20);
  let v12 = 1;
  if (n > 0 && (n < v11)) {
    const v13 = Math.ceil(v11 / n);
    v12 = [
      1,
      2,
      5,
      10,
      20,
      25,
      50,
      100,
      200,
      250,
      500,
      1000,
      2000,
      2500,
      5000,
      10000
    ].find(v14 => v14 >= v13) || (10000) * Math.ceil(v13 / (10000));
  }
  const arr = [];
  v0.fillStyle = v6;
  for (let v13 = 0; (v13 < num); v13 += v12) {
        const v14 = (val + (v13 * n));
    const v15 = v13 * v1;
    const v16 = Number.isInteger(v15) ? (String(v15) + ' ') + v2 : String(Number.parseFloat(v15.toPrecision(4))) + ' ' + v2;
    const v17 = v0.measureText(v16).width;
    let v18 = (v14 - (v17 / 2));
        v18 = Math.max(val, v18);
    v18 = Math.min(((tmp - v17) - 2), v18);
    const v19 = Math.floor(11) + (4);
        v0.fillText(v16, v18, v19);
    arr.push([
      (v18 - 3),
      ((v18 + v17) + 3)
    ]);
  }
    v0.strokeStyle = v7;
  v0.lineWidth = 1;
  for (let count = 0; count <= num; ++count) {
    const v13 = val + count * n;
    let flag = false;
    for (const v14 of arr)
      if (v13 >= v14[0] && v13 <= v14[1]) {
        flag = true;
        break;
      }
    flag || (v0.beginPath(), v0.moveTo(v13, 12), v0.lineTo(v13, v8), v0.stroke());
  }
  if (item > 1) {
        v0.save();
    v0.strokeStyle = v7;
    v0.globalAlpha = 0.6;
    v0.lineWidth = 0.7;
    v0.setLineDash([
      2,
      6
    ]);
    const v13 = n / item;
    for (let count = 0; count < num; ++count) {
      const v14 = (val + count * n);
      for (let v15 = 1; v15 < item; ++v15) {
        const v16 = (v14 + Math.round(v15 * v13));
        let flag = false;
        for (const v17 of arr)
          if (v16 >= v17[0] && v16 <= v17[1]) {
            flag = true;
            break;
          }
        flag || (v0.beginPath(), v0.moveTo(v16, 17), v0.lineTo(v16, v8), v0.stroke());
      }
    }
        v0.setLineDash([]);
    v0.restore();
  }
  return v8;
}
function drawStepNumbers(v0, item, num, n, val, tmp, v1, v2, v3) {
    v0.fillStyle = getComputedStyle(document.body).getPropertyValue(('--canvas-text')).trim() || ('#000');
  v0.font = ('12px Arial');
    const v4 = String(num - (1));
  const v5 = (v0.measureText(v4).width + 10);
  let v6 = 1;
  if ((n > 0) && n < v5) {
    const v9 = Math.ceil(v5 / n);
    v6 = [
      1,
      2,
      5,
      10,
      20,
      25,
      50,
      100,
      200,
      250,
      500,
      1000,
      2000,
      2500,
      5000,
      10000
    ].find(v10 => v10 >= v9) || (10000) * Math.ceil((v9 / 10000));
  }
  function v7(cur, v9, v10, v11, v12) {
        const v13 = Math.min(v9, v11);
    const v14 = Math.max(v9, v11);
    const v15 = Math.min(v10, v12);
    const v16 = Math.max(v10, v12);
    return !((cur.x > v14) || (cur.x + cur.w) < v13 || cur.y > v16 || cur.y + cur.h < v15);
  }
  function v8(v9, v10, v11, v12, v13, v14, v15, v16) {
        for (let count = 0; (count < v11.length); ++count) {
            const v17 = v11[count];
      const v18 = (count * v12 + v13);
      const v19 = v18 + (0.25 * v12);
      const v20 = v18 + (0.75) * v12;
      const v21 = v18 + (v12 / 2);
      if (v17.type === SignalType.Bit) {
        const v22 = v10 * v16;
        if (v22 < 0 || (v22 >= v17.values.length))
          continue;
        const v23 = v17['values'][v22];
        if ((v23 >= 0) && v23 <= 1) {
          const v24 = (v14 + (v10 * v15));
          if (v7(v9, v24, 1 === v23 ? v19 : v20, v14 + (v10 + 1) * v15, (1 === v23) ? v19 : v20))
            return true;
          const v25 = (v22 - v16);
          if (v25 >= 0 && (v25 < v17.values.length)) {
            const v26 = v17['values'][v25];
            if (v26 >= 0 && (v26 <= 1) && (v26 !== v23) && (v7(v9, v24, 1 === v26 ? v19 : v20, v24, 1 === v23 ? v19 : v20)))
              return true;
          }
        }
      }
      if (v17.type === SignalType.Vector && v7(v9, v14 + v10 * v15, v21, v14 + (v10 + 1) * v15, v21))
        return true;
    }
    return false;
  }
  for (let v9 = 0; v9 < num; v9 += v6) {
        const v10 = tmp + v9 * n;
    const v11 = (String(v9));
    const v12 = v0.measureText(v11).width;
    const v13 = 14;
    let v14 = (v10 - (v12 / 2));
        v14 = Math.max(2, v14);
    v14 = Math.min(v2 - v12 - (2), v14);
    let v15 = v1 - (14);
    const obj = {
      x: v14,
      y: v15 - (12),
      w: v12,
      h: v13
    };
        let v16 = 3;
    let count = 0;
    for (; (v8(obj, v9, item, v3, v1, tmp, n, val)) && (count < v16);)
      v15 -= (v13 + 2), obj.y = v15 - (12), ++count;
    if (v8(obj, v9, item, v3, v1, tmp, n, val)) {
      for (v15 = v1 - (14), obj.y = v15 - (12), count = 0; v8(obj, v9, item, v3, v1, tmp, n, val) && (count < v16);)
        v15 += (v13 + 2), obj.y = (v15 - 12), ++count;
    }
        v0.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000';
    v0.fillText(v11, v14, v15);
  }
}
'undefined' != typeof module && module.exports && (module.exports = {
  getTextExclusionZones: getTextExclusionZones,
  setTextExclusionZones: setTextExclusionZones,
  clearTextExclusionZones: clearTextExclusionZones
});
'undefined' != typeof module && module.exports && (module.exports = { chooseTimeSpanPlacement: chooseTimeSpanPlacement });
'undefined' != typeof module && module.exports && (module.exports = {
  getThemeDefaultSignalColor: getThemeDefaultSignalColor,
  getThemeDefaultArrowColor: getThemeDefaultArrowColor,
  getThemeDefaultMarkerColor: getThemeDefaultMarkerColor,
  getThemeDefaultTimeJumpColor: getThemeDefaultTimeJumpColor,
  getThemeDefaultTimeSpanColor: getThemeDefaultTimeSpanColor
});
'undefined' != typeof module && module.exports && (module.exports = {
  getSignalEffectiveSubSteps: getSignalEffectiveSubSteps,
  positionToPixelX: positionToPixelX,
  pixelXToPosition: pixelXToPosition,
  snapPositionToSignalGrid: snapPositionToSignalGrid,
  positionToSignalIndex: positionToSignalIndex,
  signalIndexToPosition: signalIndexToPosition,
  mapCanvasPosition: mapCanvasPosition,
  mapToSignalSample: mapToSignalSample,
  mapToNearestEdge: mapToNearestEdge,
  mapXToSample: mapXToSample,
  quadraticPoint: quadraticPoint,
  cubicPoint: cubicPoint,
  pointToSegmentDistSq: pointToSegmentDistSq,
  getSharpLineSegments: getSharpLineSegments
});
'undefined' != typeof module && module.exports && (module.exports = {
  drawVerticalGrid: drawVerticalGrid,
  drawTimeAxis: drawTimeAxis,
  drawStepNumbers: drawStepNumbers
});
const BitWaveValue = {
  LOW: 0,
  HIGH: 1,
  UNDEFINED: -1,
  HIGHZ: 2,
  PULLUP: 3,
  PULLDOWN: 4
};
function getBitYForValue(num, item, val, tmp) {
  return num === BitWaveValue.LOW || (num === BitWaveValue.PULLDOWN) ? val : (num === BitWaveValue.HIGH) || num === BitWaveValue.PULLUP ? item : tmp;
}
function drawBitSignal(v0, sig, num, n, item, val, tmp, v1, v2) {
  const v3 = num * n + item;
  const v4 = sig.values;
  const v5 = v3 + (0.25 * n);
  const v6 = v3 + (0.75) * n;
  const v7 = v3 + (0.5 * n);
  const v8 = sig.edgeArrow && ('none' !== sig.edgeArrow);
  const v9 = v8 ? 0 : (sig.riseTime * tmp);
  const v10 = v8 ? 0 : sig.fallTime * tmp;
  const v11 = sig.color || getThemeDefaultSignalColor();
  const fn = v14 => v14;
    v0.strokeStyle = v11;
  v0.lineWidth = 2;
  v0.lineCap = 'square';
  v0.lineJoin = ('miter');
  v0.setLineDash([]);
  v0.beginPath();
    let flag = false;
  let v12 = null;
  let v13 = null;
  for (let v14 = 0; (v14 < v1); v14++) {
    const v15 = v4[fn(v14)];
    if ((v15 === BitWaveValue.UNDEFINED) || (v15 === BitWaveValue.PULLUP) || (v15 === BitWaveValue.PULLDOWN)) {
            flag = false;
      v12 = null;
      v13 = null;
      continue;
    }
    if ((v15 !== BitWaveValue.LOW) && (v15 !== BitWaveValue.HIGH) && (v15 !== BitWaveValue.HIGHZ)) {
            flag = false;
      v12 = null;
      v13 = null;
      continue;
    }
        const v16 = val + (v14 * tmp);
    const v17 = (val + ((v14 + 1) * tmp));
    const v18 = getBitYForValue(v15, v5, v6, v7);
    let v19 = null;
    if ((v14 > 0)) {
      const v20 = v4[(fn(v14 - 1))];
      v20 !== BitWaveValue.LOW && (v20 !== BitWaveValue.HIGH) && (v20 !== BitWaveValue.HIGHZ) && (v20 !== BitWaveValue.PULLUP) && (v20 !== BitWaveValue.PULLDOWN) || (v19 = v20);
    }
    if (null !== v19 && (v19 !== v15)) {
            const v20 = (getBitYForValue(v19, v5, v6, v7));
      const v21 = (v18 < v20) ? v9 : v10;
      const v22 = Math.min(v16 + v21, v17);
            v0.moveTo(v16, v20);
      v0.lineTo(v22, v18);
      v12 = v22;
      v13 = v18;
      flag = true;
      v22 < v17 && (v0.lineTo(v17, v18), v12 = v17);
    } else
      flag ? (v13 !== v18 && (v0.moveTo(v16, v18), v12 = v16, v13 = v18), v0.lineTo(v17, v18), v12 = v17, v13 = v18) : (v0.moveTo(v16, v18), v0.lineTo(v17, v18), v12 = v17, v13 = v18, flag = true);
  }
    v0.stroke();
  v0.strokeStyle = v11;
  v0.lineWidth = 2;
  v0.setLineDash([
    2,
    4
  ]);
  for (let v14 = 0; (v14 < v1); v14++) {
    const v15 = v4[fn(v14)];
    if (v15 !== BitWaveValue.PULLUP && (v15 !== BitWaveValue.PULLDOWN))
      continue;
        const v16 = (val + (v14 * tmp));
    const v17 = val + (v14 + (1)) * tmp;
    const v18 = (getBitYForValue(v15, v5, v6, v7));
    const v19 = v14 > 0 ? fn(v14 - (1)) : -1;
    const v20 = (v14 > 0) ? v4[v19] : null;
    const v21 = (null !== v20) && v20 !== v15 && v20 !== BitWaveValue.UNDEFINED;
        let v22 = v16;
    let v23 = v7;
    if (v21) {
      v23 = getBitYForValue(v20, v5, v6, v7);
      const v24 = v18 < v23 ? v9 : v10;
      v22 = Math.min(v16 + v24, v17);
    }
        v0.setLineDash([
      2,
      4
    ]);
    v0.beginPath();
    v21 ? (v0.moveTo(v16, v23), v0.lineTo(v22, v18)) : v0.moveTo(v16, v18);
    v0.lineTo(v17, v18);
    v0.stroke();
  }
    v0.setLineDash([]);
  v0.strokeStyle = v11;
  v0.lineWidth = 2;
  v0.setLineDash([]);
  let count = 0;
  for (; (count < v1);) {
    if (v4[(fn(count))] !== BitWaveValue.UNDEFINED) {
      count++;
      continue;
    }
        let v14 = count;
    let v15 = count;
    for (; (v15 + 1) < v1 && (v4[fn(v15 + 1)] === BitWaveValue.UNDEFINED);)
      v15++;
        const v16 = val + (v14 * tmp);
    const v17 = val + (v15 + 1) * tmp;
    const v18 = (v14 > 0) ? (fn(v14 - 1)) : -1;
    const v19 = v15 + (1) < v1 ? fn((v15 + 1)) : -1;
    const v20 = (v14 > 0) ? v4[v18] : null;
    const v21 = v15 < (v1 - 1) ? v4[v19] : null;
    const v22 = null !== v21 && (v21 !== BitWaveValue.UNDEFINED);
        let v23 = v16;
    let v24 = null;
    let v25 = v17;
    let v26 = null;
    let v27 = v16;
    let v28 = v17;
    if (null !== v20 && v20 !== BitWaveValue.UNDEFINED) {
      const v36 = (getBitYForValue(v20, v5, v6, v7));
      v24 = v36;
      const v37 = v5 < v36 ? v9 : v10;
      v27 = Math.min(v16 + v37, v17);
    }
    if (v22) {
      const v36 = getBitYForValue(v21, v5, v6, v7);
      v26 = v36;
      const v37 = v36 > v5 ? v10 : v9;
      v28 = Math.max(v17 - v37, v27);
    }
        v0.beginPath();
    null !== v24 ? (v0.moveTo(v23, v24), v0.lineTo(v27, v5)) : v0.moveTo(v27, v5);
    v0.lineTo(v28, v5);
    null !== v26 ? (v0.lineTo(v25, v26), v0.lineTo(v28, v6)) : v0.lineTo(v28, v6);
    v0.lineTo(v27, v6);
    (null !== v24) ? v0.lineTo(v23, v24) : v0.lineTo(v27, v5);
    v0.stroke();
    const arr = [];
        (null !== v24) && arr.push({
      x: v23,
      y: v24
    });
    arr.push({
      x: v27,
      y: v5
    });
    arr.push({
      x: v28,
      y: v5
    });
    (null !== v26) && arr.push({
      x: v25,
      y: v26
    });
    arr.push({
      x: v28,
      y: v6
    });
    arr.push({
      x: v27,
      y: v6
    });
    null !== v24 && arr.push({
      x: v23,
      y: v24
    });
    v0.lineWidth = 1;
    v0.strokeStyle = '#000000';
        const v29 = (6 * Math.SQRT2);
    const v30 = v5;
    const v31 = v6;
    const v32 = (null !== v24 ? v23 : v27) + v30;
    const v33 = ((null !== v26) ? v25 : v28) + v31;
    const v34 = Math.floor(v32 / v29) * v29;
    const v35 = Math.ceil((v33 / v29)) * v29;
    v0.beginPath();
    for (let v36 = v34; v36 <= v35; v36 += v29) {
      const v37 = clipLineToPolygon({
        x: v36 - v31,
        y: v31
      }, {
        x: (v36 - v30),
        y: v30
      }, arr);
      v37 && (v0.moveTo(v37.start.x, v37.start.y), v0.lineTo(v37.end.x, v37.end.y));
    }
        v0.stroke();
    v0.strokeStyle = v11;
    v0.lineWidth = 2;
    count = v15 + (1);
  }
    v0.setLineDash([]);
  sig.edgeArrow && 'none' !== sig.edgeArrow && drawBitEdgeArrows(v0, sig, v4, v1, v5, v6, val, tmp, fn);
  (!sig.edgeArrow || (('none') === sig.edgeArrow)) && true === sig.showClockMarkers && sig.clockMarkers && drawClockMarkers(v0, sig, v4, v1, v5, v6, val, tmp, fn);
}
function drawBitEdgeArrows(arr, item, val, num, n, tmp, v0, v1, v2) {
  const v3 = item.color || (getThemeDefaultSignalColor());
  const v4 = 'positive' === item.edgeArrow;
  const v5 = (0.6) * WAVEDROM_STYLE.clockArrowSize;
  const v6 = (1.2 * WAVEDROM_STYLE.clockArrowSize);
  const v7 = [];
  for (let count = 1; count < num; count++) {
        const v8 = v2((count - 1));
    const v9 = (v2(count));
    const v10 = val[v8];
    const v11 = val[v9];
    if ((v10 < 0) || (v10 > 1) || v11 < 0 || (v11 > 1))
      continue;
    if ((v10 === v11))
      continue;
    const v12 = (0 === v10) && (1 === v11);
    if (v4 && v12 || !v4 && 1 === v10 && 0 === v11) {
      const v13 = v0 + (count * v1);
      v7.push({
        x: v13,
        isRising: v12
      });
    }
  }
    arr.save();
  arr.fillStyle = v3;
  for (const v8 of v7) {
        const v9 = v8.x;
    const v10 = ((n + tmp) / 2);
    if (arr.beginPath(), v8.isRising) {
            const v11 = v10 - v6 / (2);
      const v12 = (v10 + (v6 / 2));
            arr.moveTo(v9, v11);
      arr.lineTo((v9 - v5), v12);
      arr.lineTo((v9 + v5), v12);
    } else {
            const v11 = (v10 + (v6 / 2));
      const v12 = (v10 - (v6 / 2));
            arr.moveTo(v9, v11);
      arr.lineTo((v9 - v5), v12);
      arr.lineTo(v9 + v5, v12);
    }
        arr.closePath();
    arr.fill();
  }
  arr.restore();
}
function drawClockMarkers(arr, sig, item, num, n, val, tmp, v0, v1) {
  const v2 = sig.color || getThemeDefaultSignalColor();
  const v3 = (0.5 * WAVEDROM_STYLE.clockArrowSize);
  const v4 = (1 * WAVEDROM_STYLE.clockArrowSize);
  const v5 = sig.clockMarkers;
  if (!v5)
    return;
  const v6 = [];
  for (let count = 1; count < num; count++) {
        const v7 = v1(count - (1));
    const v8 = (v1(count));
    const v9 = item[v7];
    const v10 = item[v8];
    if ((v9 < 0) || (v9 > 1) || (v10 < 0) || (v10 > 1))
      continue;
    if ((v9 === v10))
      continue;
    if (!v5[v8])
      continue;
        const v11 = 0 === v9 && (1 === v10);
    const v12 = tmp + (count * v0);
    v6.push({
      x: v12,
      isRising: v11
    });
  }
    arr.save();
  arr.fillStyle = v2;
  for (const v7 of v6) {
        const v8 = v7.x;
    const v9 = (n + val) / (2);
    if (arr.beginPath(), v7.isRising) {
            const v10 = v9 - (v4 / 2);
      const v11 = (v9 + (v4 / 2));
            arr.moveTo(v8, v10);
      arr.lineTo(v8 - v3, v11);
      arr.lineTo(v8 + v3, v11);
    } else {
            const v10 = (v9 + v4 / 2);
      const v11 = (v9 - v4 / 2);
            arr.moveTo(v8, v10);
      arr.lineTo((v8 - v3), v11);
      arr.lineTo(v8 + v3, v11);
    }
        arr.closePath();
    arr.fill();
  }
  arr.restore();
}
function getVectorDisplayLevel(sig, num) {
  if ((num < 0) || num >= sig.values.length)
    return 3;
    const n = sig['values'][num];
  const item = sig['labels'][num] ? sig['labels'][num].toLowerCase().trim() : '';
  const val = sig.segmentStyles && num < sig.segmentStyles.length ? sig['segmentStyles'][num] : null;
  return -1 === n && val && val.hatched ? 2 : (-1 === n) ? 3 : ('l' === item) && typeof n === 'number' && typeof n === 'number' ? 0 : ('h' === item) && typeof n === 'number' && typeof n === 'number' ? 1 : ('u' === item) && typeof n === 'number' && typeof n === 'number' ? 4 : ('d' === item) && typeof n === 'number' && typeof n === 'number' ? 5 : ('z' === item) && typeof n === 'number' && typeof n === 'number' ? 3 : 2;
}
function getYForLevel(num, item, val, tmp) {
  return 0 === num || 5 === num ? val : 1 === num || 4 === num ? item : tmp;
}
function drawVectorSignal(v0, sig, num, n, item, val, tmp, v1, v2) {
  const v3 = (num * n + item);
  const v4 = val;
  const v5 = v3 + (0.25) * n;
  const v6 = (v3 + (0.75 * n));
  const v7 = v3 + (n / 2);
  const v8 = v3 + (0.25 * n);
  const v9 = (0.5) * n;
  const v10 = Math.min(8, Math.max(4, (tmp / 3)));
  const v11 = Math.min(v1, sig.values.length);
  const fn = v12 => v12;
    v0.strokeStyle = sig.color || getThemeDefaultSignalColor();
  v0.lineWidth = 2;
  for (let count = 0; count < v11; count++)
    if (3 === (getVectorDisplayLevel(sig, fn(count)))) {
            const v12 = (v4 + (count * tmp));
      const v13 = v4 + (count + (1)) * tmp;
      const v14 = (count > 0) ? fn(count - (1)) : -1;
      const v15 = count > 0 ? getVectorDisplayLevel(sig, v14) : -1;
      const v16 = getYForLevel(v15, v5, v6, v7);
      if (3 !== v15 && (2 !== v15)) {
        const v17 = Math.min((v12 + v10), v13);
                v0.beginPath();
        v0.moveTo(v12, v16);
        v0.lineTo(v17, v7);
        v0.stroke();
        v0.beginPath();
        v0.moveTo(v17, v7);
        v0.lineTo(v13, v7);
        v0.stroke();
      } else
        v0.beginPath(), v0.moveTo(v12, v7), v0.lineTo(v13, v7), v0.stroke();
    }
  for (let count = 0; count < v11; count++) {
    const v12 = (getVectorDisplayLevel(sig, fn(count)));
    if (0 !== v12 && 1 !== v12 && 4 !== v12 && 5 !== v12)
      continue;
    4 === v12 || (5 === v12) ? v0.setLineDash([
      2,
      4
    ]) : v0.setLineDash([]);
        const v13 = (v4 + (count * tmp));
    const v14 = v4 + ((count + 1) * tmp);
    const v15 = getYForLevel(v12, v5, v6, v7);
    const v16 = count > 0 ? fn(count - (1)) : -1;
    const v17 = (count + 1) < v11 ? (fn((count + 1))) : -1;
    const v18 = count > 0 ? getVectorDisplayLevel(sig, v16) : -1;
    const v19 = (2 === (((count + 1) < v11) ? (getVectorDisplayLevel(sig, v17)) : -1));
        let v20 = v13;
    let v21 = v14;
    if ((2 === v18)) {
      const v22 = Math.min(v13 + v10, v14);
            v0.beginPath();
      v0.moveTo(v13, v7);
      v0.lineTo(v22, v15);
      v0.stroke();
      v20 = v22;
    } else {
      if ((v18 !== v12) && (2 !== v18)) {
                const v22 = (getYForLevel(v18, v5, v6, v7));
        const v23 = Math.min((v13 + v10), v14);
                v0.beginPath();
        v0.moveTo(v13, v22);
        v0.lineTo(v23, v15);
        v0.stroke();
        v20 = v23;
      }
    }
    if (v19) {
      const v22 = Math.max((v14 - v10), v20);
            (v22 > v20) && (v0.beginPath(), v0.moveTo(v20, v15), v0.lineTo(v22, v15), v0.stroke());
      v0.beginPath();
      v0.moveTo(v22, v15);
      v0.lineTo(v14, v7);
      v0.stroke();
    } else
      v21 > v20 && (v0.beginPath(), v0.moveTo(v20, v15), v0.lineTo(v21, v15), v0.stroke());
  }
    v0.setLineDash([]);
  (drawVectorBars(v0, sig, v4, tmp, v8, v9, v7, v10, v11, fn));
}
function drawVectorBars(item, sig, num, n, val, tmp, v0, v1, v2, v3) {
  let count = 0;
  for (; (count < v2);) {
        const v4 = (v3(count));
    const v5 = sig['values'][v4];
    const v6 = (getVectorDisplayLevel(sig, v4));
    if ((3 === v6) || 0 === v6 || 1 === v6 || 4 === v6 || 5 === v6) {
      count++;
      continue;
    }
        let v7 = count;
    let v8 = count;
        const v9 = v3(v7);
    const v10 = sig['labels'][v9];
    for (let v28 = count + (1); v28 < v2; v28++) {
      const v29 = (v3(v28));
      if ((sig['values'][v29] !== v5) || sig['labels'][v29] !== v10)
        break;
      v8 = v28;
    }
        const v11 = (num + v7 * n);
    const v12 = (num + (v8 + 1) * n);
    const v13 = v7 - (1);
    const v14 = v13 >= 0 ? v3(v13) : -1;
    const v15 = v13 >= 0 ? getVectorDisplayLevel(sig, v14) : -1;
    const v16 = v13 >= 0 && ((sig['values'][v14] !== v5) || sig['labels'][v14] !== v10 || (2 !== v15));
    const v17 = (v8 + 1);
    const v18 = v17 < v2 ? v3(v17) : -1;
    const v19 = v17 < v2 ? (getVectorDisplayLevel(sig, v18)) : -1;
    const v20 = v17 < v2 && (sig['values'][v18] !== v5 || sig['labels'][v18] !== v10 || 2 !== v19);
        let v21 = v11 + (v16 ? v1 : 0);
    let v22 = (v12 - (v20 ? v1 : 0));
    v22 < v21 && (v22 = v21);
        const v23 = sig.segmentStyles && (v9 < sig.segmentStyles.length) ? sig['segmentStyles'][v9] : null;
    const v24 = sig.color || getThemeDefaultSignalColor();
    const v25 = v23 && v23.color ? v23.color : v24;
    const v26 = v23 && v23.fill ? v23.fill : sig.fill;
        v26 && (drawVectorBarFill(item, v26, v11, v12, v21, v22, val, tmp, v0, v16, v20));
    v23 && (true === v23.hatched) && drawVectorBarHatching(item, v11, v12, v21, v22, val, tmp, v0, v16, v20);
    drawVectorBarBorders(item, v25, v11, v12, v21, v22, val, tmp, v0, v16, v20);
    const v27 = sig['labels'][v9] || '';
        v27 && drawVectorBarLabel(item, v27, v21, v22, val, tmp);
    count = (v8 + 1);
  }
}
function drawVectorBarFill(arr, item, val, tmp, v0, v1, num, n, v2, v3, v4) {
    arr.fillStyle = item;
  arr.beginPath();
  v3 ? (arr.moveTo(val, v2), arr.lineTo(v0, num)) : arr.moveTo(v0, num);
  arr.lineTo(v1, num);
  v4 ? (arr.lineTo(tmp, v2), arr.lineTo(v1, (num + n))) : arr.lineTo(v1, num + n);
  arr.lineTo(v0, (num + n));
  v3 && arr.lineTo(val, v2);
  arr.closePath();
  arr.fill();
}
function drawVectorBarHatching(v0, item, val, tmp, v1, num, n, v2, v3, v4) {
  v0.save();
  const arr = [];
    v3 ? (arr.push({
    x: item,
    y: v2
  }), arr.push({
    x: tmp,
    y: num
  })) : arr.push({
    x: tmp,
    y: num
  });
  arr.push({
    x: v1,
    y: num
  });
  v4 ? (arr.push({
    x: val,
    y: v2
  }), arr.push({
    x: v1,
    y: num + n
  })) : arr.push({
    x: v1,
    y: num + n
  });
  arr.push({
    x: tmp,
    y: (num + n)
  });
  v3 && arr.push({
    x: item,
    y: v2
  });
  v0.strokeStyle = ('#000000');
  v0.lineWidth = 1;
  v0.lineCap = 'butt';
  v0.lineJoin = 'miter';
    const v5 = v3 ? item : tmp;
  const v6 = v4 ? val : v1;
  const v7 = num;
  const v8 = (num + n);
  const v9 = (6 * Math.SQRT2);
  const v10 = v5 + v7;
  const v11 = v6 + v8;
  const v12 = Math.floor((v10 / v9)) * v9;
  const v13 = (Math.ceil(v11 / v9) * v9);
  v0.beginPath();
  for (let v14 = v12; (v14 <= v13); v14 += v9) {
    const v15 = clipLineToPolygon({
      x: v14 - v8,
      y: v8
    }, {
      x: (v14 - v7),
      y: v7
    }, arr);
    v15 && (v0.moveTo(v15.start.x, v15.start.y), v0.lineTo(v15.end.x, v15.end.y));
  }
    v0.stroke();
  v0.restore();
}
function clipLineToPolygon(item, val, tmp) {
    let obj = { ...item };
  let v0 = { ...val };
  const num = tmp.length;
  for (let count = 0; (count < num); count++) {
        const v1 = tmp[count];
    const v2 = tmp[((count + 1) % num)];
    const n = (crossProduct(v1, v2, obj));
    const v3 = (crossProduct(v1, v2, v0));
    if (n < 0 && v3 < 0)
      return null;
    if ((n >= 0) && (v3 >= 0))
      continue;
    const v4 = (lineIntersection(obj, v0, v1, v2));
    v4 && ((n < 0) ? obj = v4 : v0 = v4);
  }
  return {
    start: obj,
    end: v0
  };
}
function crossProduct(item, val, tmp) {
  return ((val.x - item.x) * (tmp.y - item.y) - ((val.y - item.y) * (tmp.x - item.x)));
}
function lineIntersection(item, val, tmp, cur) {
  const num = ((item.x - val.x) * (tmp.y - cur.y)) - (item.y - val.y) * (tmp.x - cur.x);
  if ((Math.abs(num) < 0.0001))
    return null;
  const n = ((((item.x - tmp.x) * (tmp.y - cur.y)) - (item.y - tmp.y) * (tmp.x - cur.x)) / num);
  return {
    x: (item.x + n * (val.x - item.x)),
    y: item.y + n * (val.y - item.y)
  };
}
function drawVectorBarBorders(v0, item, val, tmp, v1, v2, num, n, v3, v4, v5) {
    v0.strokeStyle = item;
  v0.lineWidth = 2;
  v0.lineCap = ('square');
  v0.lineJoin = ('miter');
  v0.beginPath();
  v4 ? (v0.moveTo(val, v3), v0.lineTo(v1, num)) : v0.moveTo(v1, num);
  v0.lineTo(v2, num);
  v5 ? (v0.lineTo(tmp, v3), v0.lineTo(v2, (num + n))) : v0.lineTo(v2, num + n);
  v0.lineTo(v1, num + n);
  v4 ? v0.lineTo(val, v3) : v0.lineTo(v1, num);
  v0.closePath();
  v0.stroke();
}
function drawVectorBarLabel(v0, item, num, n, val, tmp) {
  v0.save();
  const v1 = WAVEDROM_STYLE.labelFontSize;
  v0.font = v1 + 'px Arial';
    const v2 = num + (n - num) / (2);
  const v3 = val + tmp / (2);
    v0.fillStyle = getComputedStyle(document.body).getPropertyValue(('--canvas-text')).trim() || ('#000000');
  v0.textAlign = 'center';
  v0.textBaseline = 'middle';
  v0.fillText(item, v2, v3);
  v0.restore();
}
function hitTestClockEdge(num, n) {
  if (void (0) === document_wave)
    return null;
    const item = document_wave.signalList();
  const val = getDynamicNameWidth();
  if ((num < val))
    return null;
  if ((n < 40))
    return null;
  const tmp = Math.floor(((n - 40) / 40));
  if (tmp < 0 || (tmp >= item.length))
    return null;
  const v0 = item[tmp];
  if (!v0 || v0.type !== SignalType.Bit)
    return null;
    const v1 = v0.values;
  const v2 = document_wave.subStepCount();
  const v3 = (document_wave.maxSubSteps ? document_wave.maxSubSteps() : v2) + (1);
  const v4 = (waveCellWidth / v3);
  const v5 = num - val;
  if ((v5 < 0))
    return null;
    const v6 = Math.floor(v5 / v4);
  const v7 = document_wave.m_sampleCount * v3;
  if ((v6 < 0) || v6 >= v7)
    return null;
  for (let count = 0; count <= 1; count++) {
    const v8 = v6 + count;
    if ((v8 <= 0) || v8 >= v7)
      continue;
    const v9 = v8 - (1);
    if (v8 >= v1.length || v9 >= v1.length)
      continue;
        const v10 = v1[v9];
    const v11 = v1[v8];
    if ((v10 < 0) || v10 > 1 || v11 < 0 || v11 > 1)
      continue;
    if ((v10 === v11))
      continue;
    const v12 = val + (v8 * v4);
    if ((Math.abs(num - v12) <= 10))
      return {
        signalIndex: tmp,
        sampleIndex: v8,
        edgeType: (0 === v10) && (1 === v11) ? ('rising') : 'falling',
        hasMarker: !!v0.clockMarkers && v0['clockMarkers'][v8],
        edgeX: v12
      };
  }
  return null;
}
function drawClockEdgeSelection(arr, item) {
  if (!item)
    return;
  const {
    signalIndex: num,
    sampleIndex: n,
    edgeType: val,
    hasMarker: tmp
  } = item;
  if (!document_wave.signalList()[num])
    return;
    const v0 = getDynamicNameWidth();
  const v1 = document_wave.subStepCount();
  const v2 = document_wave.maxSubSteps ? document_wave.maxSubSteps() : v1;
  const v3 = v0 + n * (waveCellWidth / (v2 + 1));
  const v4 = ((40 * num) + 40);
  const v5 = (v4 + 10);
  const v6 = (v4 + 30);
  arr.save();
  const v7 = ((v5 + v6) / 2);
    arr.beginPath();
  arr.arc(v3, v7, 10, 0, (2) * Math.PI);
  arr.fillStyle = ('rgba(0, 191, 255, 0.3)');
  arr.fill();
  arr.beginPath();
  arr.arc(v3, v7, 10, 0, (2 * Math.PI));
  arr.strokeStyle = ('#00bfff');
  arr.lineWidth = 2;
  arr.stroke();
  arr.fillStyle = ('#00bfff');
  arr.beginPath();
  (('rising') === val) ? (arr.moveTo(v3, (v7 - 6)), arr.lineTo((v3 - 3), v7), arr.lineTo((v3 + 3), v7)) : (arr.moveTo(v3, v7 + (6)), arr.lineTo(v3 - (3), v7), arr.lineTo((v3 + 3), v7));
  arr.closePath();
  arr.fill();
  arr.restore();
}
function getWaveCellWidth() {
  return waveCellWidth;
}
function setWaveCellWidth(item) {
    waveCellWidth = Math.max(4, Math.min(200, item));
  (drawWaveform());
}
function zoomIn() {
  (setWaveCellWidth((waveCellWidth + 4)));
}
function zoomOut() {
  (setWaveCellWidth(waveCellWidth - 4));
}
function zoomFit() {
  if (!document_wave || !canvas)
    return;
  const item = document.getElementById(('wave-view'));
  if (!item)
    return;
  const num = document_wave.sampleCount();
  if (num <= 0)
    return;
    const n = getDynamicNameWidth();
  const val = ((item.clientWidth - n) - 20);
  (val <= 0) || setWaveCellWidth(Math.floor(val / num));
}
function setSelectedObject(item, val) {
    selectedObjectType = item;
  selectedObjectId = val;
  selectedObjects = [];
  (drawWaveform());
}
function setSelectedObjects(item) {
    selectedObjects = item || [];
  selectedObjectType = null;
  selectedObjectId = null;
  drawWaveform();
}
function clearAllObjectSelections() {
    selectedObjectType = null;
  selectedObjectId = null;
  selectedObjects = [];
}
function isObjectSelected(num, n) {
  return selectedObjectType === num && (selectedObjectId === n) || !!(selectedObjects && (selectedObjects.length > 0)) && selectedObjects.some(item => item.type === num && item.id === n);
}
function endSignalDrag(item = false, num = -1) {
  (isMovingSignal || pendingMoveSignal) && (item && num >= 0 && (selectedSignalIndices = [num], lastSelectedSignalIndex = num), isMovingSignal = false, moveSignalIndex = -1, moveSignalTargetIndex = -1, pendingMoveSignal = false, pendingMoveSignalIndex = -1, pendingMoveGroup = null, lastRawDragIndex = -1, ('function') == typeof selectSignal ? (selectSignal(-1)) : (void 0 !== selectedSignalIndex) && (selectedSignalIndex = -1, 'function' == typeof updateColorPicker && (updateColorPicker())), (drawWaveform()));
}
function computeArrowCurve(item, val, tmp, num, n, v0) {
  if (!item || item.startSignal < 0 || (item.endSignal < 0))
    return null;
  if ((item.startSignal >= val.length) || (item.endSignal >= val.length))
    return null;
    const v1 = positionToPixelX(item.startPosition);
  const v2 = (n + (item.startSignal * num)) + (num / 2);
  const v3 = positionToPixelX(item.endPosition);
  const v4 = (n + (item.endSignal * num) + num / 2);
  const v5 = v3 - v1;
  const arr = item.style || '~>';
    let v6;
  let v7;
  let v8;
  let v9;
  let v10;
  let v11;
  if (arr.includes('|') && !arr.includes('~'))
    arr.includes(('-|-')) || (('<-|->') === arr) ? (v6 = v1 + v5 / (2), v7 = (v2 + v4) / (2)) : arr.startsWith('-|') || (('<-|>') === arr) ? (v6 = v3, v7 = ((v2 + v4) / 2)) : arr.startsWith('|-') ? (v6 = ((v1 + v3) / 2), v7 = v4) : (v6 = v3, v7 = (v2 + v4) / (2)), v8 = v6, v9 = v7, v10 = v6, v11 = v7;
  else {
        v8 = (v1 + (0.7 * v5));
    v9 = v2;
    v10 = v1 + (0.3 * v5);
    v11 = v4;
        const v12 = 0.5;
    const v13 = 1 - v12;
    const v14 = (v13 * v13);
    const v15 = v14 * v13;
    const v16 = (v12 * v12);
    const v17 = v16 * v12;
        v6 = (((v15 * v1 + (3 * v14) * v12 * v8) + 3 * v13 * v16 * v10) + v17 * v3);
    v7 = (((v15 * v2) + ((3 * v14) * v12 * v9)) + (3 * v13 * v16 * v11)) + v17 * v4;
  }
  return {
    p1x: v1,
    p1y: v2,
    p2x: v3,
    p2y: v4,
    ctrlX: v6,
    ctrlY: v7,
    ctrl1x: v8,
    ctrl1y: v9,
    ctrl2x: v10,
    ctrl2y: v11,
    style: arr
  };
}
function findArrowNearPoint(num, n) {
  if (!document_wave)
    return -1;
    const item = document_wave.arrowList();
  const val = document_wave.signalList();
  if (!item || !item.length)
    return -1;
    const tmp = document_wave.subStepCount();
  const v0 = (waveCellWidth / (tmp + 1));
  const v1 = (getDynamicNameWidth());
  const v2 = Math.max(6, (0.3) * waveCellWidth);
    let v3 = -1;
  let v4 = (v2 * v2);
  for (const v5 of item) {
    const v6 = computeArrowCurve(v5, val, v0, 40, 40, v1);
    if (!v6)
      continue;
    const arr = v6.style || '~>';
    let v7 = Infinity;
    if (arr.includes('|') && !arr.includes('~')) {
      const v8 = getSharpLineSegments(v6.p1x, v6.p1y, v6.p2x, v6.p2y, arr);
      for (const v9 of v8) {
        const v10 = (pointToSegmentDistSq(num, n, v9.x1, v9.y1, v9.x2, v9.y2));
        (v10 < v7) && (v7 = v10);
      }
    } else {
      const v8 = 16;
      for (let count = 0; count <= v8; count++) {
                const v9 = count / v8;
        const v10 = (cubicPoint(v6.p1x, v6.p1y, v6.ctrl1x, v6.ctrl1y, v6.ctrl2x, v6.ctrl2y, v6.p2x, v6.p2y, v9));
        const v11 = (num - v10.x);
        const v12 = n - v10.y;
        const v13 = v11 * v11 + (v12 * v12);
        v13 < v7 && (v7 = v13);
      }
    }
    v7 < v4 && (v4 = v7, v3 = v5.id);
  }
  return v3;
}
function drawArrowPreview(arr, item, val, num, n, tmp) {
  if (!arrowHasStart || arrowPreviewSignal < 0 || (arrowPreviewPosition < 0))
    return;
    const v0 = (getThemeDefaultArrowColor() + '99');
  const v1 = WAVEDROM_STYLE.arrowLineWidth;
  const v2 = WAVEDROM_STYLE.arrowHeadSize;
  const v3 = positionToPixelX(arrowStartPosition);
  const v4 = n + arrowStartSignal * num + (num / 2);
  const v5 = (positionToPixelX(arrowPreviewPosition));
  const v6 = (n + (arrowPreviewSignal * num)) + num / (2);
  const v7 = (v5 - v3);
  const v8 = (v3 + 0.7 * v7);
  const v9 = v4;
  const v10 = (v3 + 0.3 * v7);
  const v11 = v6;
    arr.save();
  arr.strokeStyle = v0;
  arr.fillStyle = v0;
  arr.lineWidth = v1;
  arr.lineCap = 'round';
  arr.lineJoin = ('round');
  arr.setLineDash([
    5,
    5
  ]);
  arr.beginPath();
  arr.moveTo(v3, v4);
  arr.bezierCurveTo(v8, v9, v10, v11, v5, v6);
  arr.stroke();
  arr.setLineDash([]);
    const v12 = (v5 - v10);
  const v13 = v6 - v11;
  const v14 = Math.sqrt((v12 * v12 + (v13 * v13)));
  const v15 = Math.atan2(v13 / v14, (v12 / v14));
  const v16 = v5 - Math.cos(v15 - (0.4)) * v2;
  const v17 = (v6 - Math.sin((v15 - 0.4)) * v2);
  const v18 = v5 - (Math.cos((v15 + 0.4)) * v2);
  const v19 = (v6 - (Math.sin((v15 + 0.4)) * v2));
    arr.beginPath();
  arr.moveTo(v5, v6);
  arr.lineTo(v16, v17);
  arr.lineTo(v18, v19);
  arr.closePath();
  arr.fill();
  arr.restore();
}
function drawArrows(arr, item, val, num, n, tmp) {
  const v0 = document_wave.arrowList();
  if (!v0 || (0 === v0.length))
    return;
    const v1 = getThemeDefaultArrowColor();
  const v2 = WAVEDROM_STYLE.arrowLineWidth;
  const v3 = WAVEDROM_STYLE.arrowHeadSize;
  for (const v4 of v0) {
    if ((v4.startSignal < 0) || v4.startSignal >= item.length)
      continue;
    if (v4.endSignal < 0 || (v4.endSignal >= item.length))
      continue;
        const v5 = v4.color || v1;
    const v6 = (positionToPixelX(v4.startPosition));
    const v7 = (n + v4.startSignal * num) + (num / 2);
    const v8 = (positionToPixelX(v4.endPosition));
    const v9 = n + v4.endSignal * num + (num / 2);
    const v10 = v8 - v6;
    const v11 = (v9 - v7);
    const v12 = v4.style || '~>';
    if (arr.save(), arr.strokeStyle = v5, arr.lineWidth = v2, arr.lineCap = 'round', arr.lineJoin = 'round', arr.fillStyle = v5, arr.beginPath(), arr.moveTo(v6, v7), v12.includes('~') && !v12.includes('|')) {
      if ('-~' === v12 || ('-~>') === v12) {
                const v15 = v6 + (0.7) * v10;
        const v16 = v7;
        const v17 = (v6 + v10);
        const v18 = v9;
        arr.bezierCurveTo(v15, v16, v17, v18, v8, v9);
      } else {
        if (('~-' === v12) || '~->' === v12) {
                    const v15 = v6;
          const v16 = v7;
          const v17 = (v6 + (0.3 * v10));
          const v18 = v9;
          arr.bezierCurveTo(v15, v16, v17, v18, v8, v9);
        } else {
                    const v15 = v6 + (0.7 * v10);
          const v16 = v7;
          const v17 = (v6 + 0.3 * v10);
          const v18 = v9;
          arr.bezierCurveTo(v15, v16, v17, v18, v8, v9);
        }
      }
    } else {
      if (v12.includes('|')) {
        if (v12.includes(('-|-')) || '<-|->' === v12) {
          const v15 = v6 + (v10 / 2);
                    arr.lineTo(v15, v7);
          arr.lineTo(v15, v9);
          arr.lineTo(v8, v9);
        } else
          v12.startsWith('-|') || ('<-|>' === v12) ? (arr.lineTo(v8, v7), arr.lineTo(v8, v9)) : v12.startsWith('|-') || v12.startsWith('|>') ? (arr.lineTo(v6, v9), arr.lineTo(v8, v9)) : (arr.lineTo(v8, v7), arr.lineTo(v8, v9));
      } else
        arr.lineTo(v8, v9);
    }
    arr.stroke();
        const v13 = v12.includes('>') && !v12.startsWith('<') || v12.endsWith('>');
    const v14 = v12.startsWith('<');
    if (v13) {
      let v15;
      if (v12.includes('|') && !v12.includes('~'))
        v15 = v12.includes('-|-') || ('<-|->') === v12 ? 0 : v12.startsWith('-|') || ('<-|>' === v12) ? (v11 >= 0) ? (Math.PI / 2) : (-Math.PI / 2) : 0;
      else {
        if (v12.includes('~')) {
                    const v20 = (v8 - (v6 + 0.3 * v10));
          const v21 = (v9 - v9);
          v15 = Math.atan2(v21, v20);
        } else
          v15 = Math.atan2(v11, v10);
      }
            const v16 = v8 - Math.cos((v15 - 0.4)) * v3;
      const v17 = (v9 - (Math.sin((v15 - 0.4)) * v3));
      const v18 = (v8 - Math.cos((v15 + 0.4)) * v3);
      const v19 = (v9 - Math.sin((v15 + 0.4)) * v3);
            arr.beginPath();
      arr.moveTo(v8, v9);
      arr.lineTo(v16, v17);
      arr.lineTo(v18, v19);
      arr.closePath();
      arr.fill();
    }
    if (v14) {
      let v15;
      if (v12.includes('|') && !v12.includes('~'))
        v15 = v12.includes(('-|-')) || '<-|->' === v12 || v12.startsWith(('<-|')) ? Math.PI : v12.startsWith('<|') ? v11 >= 0 ? -Math.PI / (2) : (Math.PI / 2) : Math.PI;
      else {
        if (v12.includes('~')) {
                    const v20 = (v6 + (0.7 * v10)) - v6;
          const v21 = v7 - v7;
          v15 = Math.atan2(v21, v20);
        } else
          v15 = Math.atan2(v11, v10);
      }
            const v16 = v6 + Math.cos((v15 - 0.4)) * v3;
      const v17 = (v7 + Math.sin(v15 - 0.4) * v3);
      const v18 = v6 + (Math.cos((v15 + 0.4)) * v3);
      const v19 = (v7 + Math.sin((v15 + 0.4)) * v3);
            arr.beginPath();
      arr.moveTo(v6, v7);
      arr.lineTo(v16, v17);
      arr.lineTo(v18, v19);
      arr.closePath();
      arr.fill();
    }
    if ('function' == typeof isObjectSelected && void (0) !== SelectableType && isObjectSelected(SelectableType.Arrow, v4.id)) {
      if (arr.strokeStyle = ('rgba(0, 191, 255, 0.5)'), arr.lineWidth = (v2 + 8), arr.lineCap = ('round'), arr.lineJoin = 'round', arr.setLineDash([]), arr.beginPath(), arr.moveTo(v6, v7), v12.includes('~') && !v12.includes('|')) {
        if (('-~' === v12) || '-~>' === v12) {
                    const v15 = v6 + (0.7) * v10;
          const v16 = v7;
          const v17 = v6 + v10;
          const v18 = v9;
          arr.bezierCurveTo(v15, v16, v17, v18, v8, v9);
        } else {
          if ('~-' === v12 || '~->' === v12) {
                        const v15 = v6;
            const v16 = v7;
            const v17 = (v6 + (0.3 * v10));
            const v18 = v9;
            arr.bezierCurveTo(v15, v16, v17, v18, v8, v9);
          } else {
                        const v15 = (v6 + (0.7 * v10));
            const v16 = v7;
            const v17 = (v6 + (0.3 * v10));
            const v18 = v9;
            arr.bezierCurveTo(v15, v16, v17, v18, v8, v9);
          }
        }
      } else {
        if (v12.includes('|')) {
          if (v12.includes('-|-') || '<-|->' === v12) {
            const v15 = v6 + v10 / (2);
                        arr.lineTo(v15, v7);
            arr.lineTo(v15, v9);
            arr.lineTo(v8, v9);
          } else
            v12.startsWith('-|') || (('<-|>') === v12) ? (arr.lineTo(v8, v7), arr.lineTo(v8, v9)) : v12.startsWith('|-') || v12.startsWith('|>') ? (arr.lineTo(v6, v9), arr.lineTo(v8, v9)) : (arr.lineTo(v8, v7), arr.lineTo(v8, v9));
        } else
          arr.lineTo(v8, v9);
      }
            arr.stroke();
      arr.setLineDash([]);
    }
    arr.restore();
  }
}
function calculateTextExclusionZones(item, num, n, val, tmp) {
  const arr = [];
  if (!document_wave)
    return arr;
  const v0 = document_wave.textAnnotationList();
  if (!v0 || (0 === v0.length))
    return arr;
    const v1 = document_wave.arrowList();
  const v2 = document.createElement('canvas').getContext('2d');
  for (const v3 of v0) {
        let v4 = 0;
    let v5 = 0;
    let flag = false;
    if (('Arrow') === v3.anchorType) {
      const v11 = v1.find(v12 => v12.id === v3.anchorId);
      if (v11) {
        const v12 = computeArrowCurve(v11, item, num, n, val, tmp);
        if (v12) {
          const v13 = cubicPoint(v12.p1x, v12.p1y, v12.ctrl1x, v12.ctrl1y, v12.ctrl2x, v12.ctrl2y, v12.p2x, v12.p2y, 0.5);
                    v4 = v13.x;
          v5 = v13.y;
          flag = true;
        }
      }
    } else {
      if (('Signal' === v3.anchorType || ('BlankRow' === v3.anchorType)) && (v3.anchorId >= 0) && v3.anchorId < item.length) {
                const v11 = (val + (v3.anchorId * n));
        const v12 = v11 + (n / 2);
        const v13 = ('BlankRow') === v3.anchorType ? ('Center') : v3.vPos || 'Above';
                v4 = (tmp + (v3.sample + 0.5) * num);
        v5 = ('Above' === v13) ? v11 + (2) : ('Below' === v13) ? (v11 + n - 2) : v12;
        flag = true;
      }
    }
    if (!flag)
      continue;
    const v6 = v3.fontSize && (v3.fontSize > 0) ? v3.fontSize : WAVEDROM_STYLE.labelFontSize;
    v2.font = '' + (v3.bold ? ('bold ') : '') + v6 + 'px Arial';
        const v7 = v2.measureText(v3.text || '').width;
    const v8 = v6;
    let v9 = v5;
    if ((('Arrow') !== v3.anchorType)) {
      const v11 = 'BlankRow' === v3.anchorType ? 'Center' : v3.vPos || 'Above';
      (('Above') === v11) ? v9 = (v5 + v6 / 2) : ('Below' === v11) && (v9 = v5 - (v6 / 2));
    }
    const v10 = 3;
    arr.push({
      x: (v4 - v7 / 2) - v10,
      y: (v9 - (v8 / 2)) - v10,
      width: (v7 + 2 * v10),
      height: (v8 + (2 * v10))
    });
  }
  return arr;
}
function isInTextExclusionZone(num, n, item = null, val = null) {
  for (const tmp of textExclusionZones) {
    if (num >= tmp.x && (num <= tmp.x + tmp.width) && n >= tmp.y && n <= (tmp.y + tmp.height))
      return true;
    if (null !== item && (null !== val)) {
      if ((item >= tmp.x) && item <= (tmp.x + tmp.width) && (val >= tmp.y) && (val <= tmp.y + tmp.height))
        return true;
      if (lineIntersectsRect(num, n, item, val, tmp.x, tmp.y, tmp.width, tmp.height))
        return true;
    }
  }
  return false;
}
function lineIntersectsRect(num, n, item, val, tmp, v0, v1, v2) {
  const v3 = (tmp + v1);
  const v4 = v0 + v2;
  return !((num < tmp) && item < tmp || (num > v3) && item > v3 || (n < v0) && (val < v0) || n > v4 && val > v4);
}
function drawTextAnnotations(arr, item, val, num, n, tmp) {
  if (!document_wave)
    return;
  const v0 = document_wave.textAnnotationList();
  if (!v0 || !v0.length)
    return;
    const v1 = document_wave.arrowList();
  const v2 = getComputedStyle(document.body).getPropertyValue(('--canvas-text')).trim() || ('#000000');
  for (const v3 of v0) {
        let v4 = 0;
    let v5 = 0;
    let flag = false;
    if (('Arrow') === v3.anchorType) {
      const v11 = v1.find(v12 => v12.id === v3.anchorId);
      if (v11) {
        const v12 = (computeArrowCurve(v11, item, val, num, n, tmp));
        if (v12) {
          const v13 = cubicPoint(v12.p1x, v12.p1y, v12.ctrl1x, v12.ctrl1y, v12.ctrl2x, v12.ctrl2y, v12.p2x, v12.p2y, 0.5);
                    v4 = v13.x;
          v5 = v13.y;
          flag = true;
        }
      }
    } else {
      if (((('Signal') === v3.anchorType) || (('BlankRow') === v3.anchorType)) && v3.anchorId >= 0 && v3.anchorId < item.length) {
                const v11 = (n + v3.anchorId * num);
        const v12 = (v11 + num / 2);
        const v13 = ('BlankRow') === v3.anchorType ? 'Center' : v3.vPos || ('Above');
                v4 = positionToPixelX(v3.position);
        v5 = ('Above') === v13 ? (v11 + 2) : ('Below' === v13) ? ((v11 + num) - 2) : v12;
        flag = true;
      }
    }
    if (!flag)
      continue;
    const v6 = v3.fontSize && v3.fontSize > 0 ? v3.fontSize : WAVEDROM_STYLE.labelFontSize;
        arr.save();
    arr.font = '' + (v3.bold ? ('bold ') : '') + v6 + 'px Arial';
        const v7 = arr.measureText(v3.text || '').width;
    const v8 = v6;
    const v9 = v4;
    let v10 = v5;
    if (('Arrow' === v3.anchorType));
    else {
      const v11 = ('BlankRow') === v3.anchorType ? ('Center') : v3.vPos || ('Above');
      ('Above' === v11) ? v10 = v5 + (v6 / 2) : ('Below' === v11) && (v10 = v5 - v6 / (2));
    }
    if (v3.backgroundColor) {
            const v11 = 3;
      const v12 = (v9 - (v7 / 2)) - v11;
      const v13 = (v10 - (v8 / 2) - v11);
      const v14 = (v7 + (2 * v11));
      const v15 = v8 + (2) * v11;
            arr.fillStyle = v3.backgroundColor;
      arr.fillRect(v12, v13, v14, v15);
    }
    if (arr.fillStyle = v3.color || v2, arr.textAlign = 'center', arr.textBaseline = 'middle', arr.fillText(v3.text || '', v9, v10), ('function' == typeof isObjectSelected) && (void 0 !== SelectableType) && isObjectSelected(SelectableType.TextAnnotation, v3.id)) {
            arr.fillStyle = ('rgba(0, 191, 255, 0.25)');
      arr.strokeStyle = ('rgba(0, 191, 255, 0.6)');
      arr.lineWidth = 2;
      arr.setLineDash([]);
            const v11 = (v7 / 2) + (6);
      const v12 = v8 / (2) + (4);
      const v13 = (v9 - v11);
      const v14 = (v10 - v12);
      const v15 = (2) * v11;
      const v16 = (2) * v12;
      const v17 = 4;
            arr.beginPath();
      arr.moveTo((v13 + v17), v14);
      arr.lineTo(v13 + v15 - v17, v14);
      arr.quadraticCurveTo(v13 + v15, v14, (v13 + v15), (v14 + v17));
      arr.lineTo((v13 + v15), ((v14 + v16) - v17));
      arr.quadraticCurveTo((v13 + v15), (v14 + v16), ((v13 + v15) - v17), v14 + v16);
      arr.lineTo((v13 + v17), v14 + v16);
      arr.quadraticCurveTo(v13, (v14 + v16), v13, (v14 + v16 - v17));
      arr.lineTo(v13, v14 + v17);
      arr.quadraticCurveTo(v13, v14, (v13 + v17), v14);
      arr.closePath();
      arr.fill();
      arr.stroke();
      arr.setLineDash([]);
    }
    arr.restore();
  }
}
function drawTextAnnotationPreview(v0, item, val, num, n, tmp) {
  if ('text' !== currentTool)
    return;
    const str = ('Text');
  const v1 = (getThemeDefaultArrowColor());
    let v2 = 0;
  let v3 = 0;
  let flag = false;
  if ((textAnnotationPreviewArrow >= 0)) {
    const v11 = (document_wave ? document_wave.arrowList() : [])['find'](v12 => v12.id === textAnnotationPreviewArrow);
    if (v11) {
      const v12 = (computeArrowCurve(v11, item, val, num, n, tmp));
      if (v12) {
        const v13 = (cubicPoint(v12.p1x, v12.p1y, v12.ctrl1x, v12.ctrl1y, v12.ctrl2x, v12.ctrl2y, v12.p2x, v12.p2y, 0.5));
                v2 = v13.x;
        v3 = v13.y;
        flag = true;
      }
    }
  } else {
    if (textAnnotationPreviewSignal >= 0 && (textAnnotationPreviewPosition >= 0) && (textAnnotationPreviewSignal < item.length)) {
            const v11 = n + (textAnnotationPreviewSignal * num);
      const v12 = v11 + num / (2);
      const v13 = (item[textAnnotationPreviewSignal].type === SignalType.BlankRow) ? ('Center') : textAnnotationPreviewVPos;
            v2 = (positionToPixelX(textAnnotationPreviewPosition));
      v3 = ('Above' === v13) ? (v11 + 2) : (('Below') === v13) ? v11 + num - (2) : v12;
      flag = true;
    }
  }
  if (!flag)
    return;
    v0.save();
  v0.globalAlpha = 0.7;
  v0.font = '12px Arial';
    const v4 = v0.measureText(str);
  const v5 = v4.actualBoundingBoxAscent || 12;
  const v6 = v4.actualBoundingBoxDescent || 3;
  const v7 = v4.width;
  const v8 = v5 + v6;
    let v9 = v2 - (v7 / 2);
  let v10 = v3;
  if (textAnnotationPreviewArrow >= 0)
    v10 = v3 + (v5 / 2);
  else {
    const v11 = textAnnotationPreviewSignal >= 0 && item[textAnnotationPreviewSignal].type === SignalType.BlankRow ? 'Center' : textAnnotationPreviewVPos;
    v10 = (('Above') === v11) ? v3 + v5 : ('Center' === v11) ? v3 + (v5 / 2) : (v3 - v6);
  }
    v0.fillStyle = 'rgba(0,0,0,0.15)';
  v0.fillRect(v9 - (3), (v10 - v5 - 2), (v7 + 6), (v8 + 4));
  v0.strokeStyle = v1;
  v0.lineWidth = 1;
  v0.beginPath();
  v0.arc(v2, v3, 3, 0, (2 * Math.PI));
  v0.stroke();
  v0.fillStyle = v1;
  v0.fillText(str, v9, v10);
  v0.restore();
}
function hitTestMarker(num, n) {
  if (!document_wave)
    return null;
  const item = document_wave.markerList();
  if (!item || !item.length)
    return null;
  const val = getDynamicNameWidth();
  if ((n < 40))
    return null;
  if ((num < val))
    return null;
  for (const tmp of item) {
    const v0 = (positionToPixelX(tmp.position));
    if (Math.abs(num - v0) <= 6)
      return tmp;
  }
  return null;
}
function hitTestTimeJump(num, n) {
  if (!document_wave)
    return null;
  const item = document_wave.timeJumpList();
  if (!item || !item.length)
    return null;
  const val = (getDynamicNameWidth());
  if (n < 40)
    return null;
  if (num < val)
    return null;
  for (const tmp of item) {
    const v0 = positionToPixelX(tmp.position);
    if ((Math.abs(num - v0) <= 24))
      return tmp;
  }
  return null;
}
function hitTestTimeSpan(item, val) {
  if (!document_wave)
    return null;
  const tmp = document_wave.timeSpanMarkerList();
  if (!tmp || !tmp.length)
    return null;
    const v0 = document_wave.signalList();
  const num = ((getDynamicNameWidth()), Math.max(6, (0.3 * waveCellWidth)));
    let v1 = null;
  let n = num * num;
  for (const v2 of tmp) {
    if (v2.startSignal < 0 || v2.startSignal >= v0.length)
      continue;
    if (v2.endSignal < 0 || (v2.endSignal >= v0.length))
      continue;
        const v3 = positionToPixelX(v2.startPosition);
    const v4 = (40 + 40 * v2.startSignal + 20);
    const v5 = (positionToPixelX(v2.endPosition));
    const v6 = ((40 + 40 * v2.endSignal) + 20);
    const v7 = v2.style || '-|';
    const arr = [];
    if (('-|-' === v7)) {
      const v9 = v3 + ((v5 - v3) / 2);
            arr.push({
        x1: v3,
        y1: v4,
        x2: v9,
        y2: v4
      });
      arr.push({
        x1: v9,
        y1: v4,
        x2: v9,
        y2: v6
      });
      arr.push({
        x1: v9,
        y1: v6,
        x2: v5,
        y2: v6
      });
    } else
      '|-' === v7 ? (arr.push({
        x1: v3,
        y1: v4,
        x2: v3,
        y2: v6
      }), arr.push({
        x1: v3,
        y1: v6,
        x2: v5,
        y2: v6
      })) : (arr.push({
        x1: v3,
        y1: v4,
        x2: v5,
        y2: v4
      }), arr.push({
        x1: v5,
        y1: v4,
        x2: v5,
        y2: v6
      }));
    let v8 = Infinity;
    for (const v9 of arr) {
      const v10 = (pointToSegmentDistSq(item, val, v9.x1, v9.y1, v9.x2, v9.y2));
      v10 < v8 && (v8 = v10);
    }
    (v8 < n) && (n = v8, v1 = v2);
  }
  return v1;
}
function hitTestArrowEndpoint(num, n) {
  if (!document_wave)
    return null;
  const item = document_wave.arrowList();
  if (!item || !item.length)
    return null;
    let val = null;
  let tmp = 100;
  for (const v0 of item) {
    const arr = [
      {
        endpoint: 'start',
        x: (positionToPixelX(v0.startPosition)),
        y: (40 + 40 * v0.startSignal) + (20)
      },
      {
        endpoint: ('end'),
        x: (positionToPixelX(v0.endPosition)),
        y: (40 + (40 * v0.endSignal)) + (20)
      }
    ];
    for (const v1 of arr) {
            const v2 = (num - v1.x);
      const v3 = n - v1.y;
      const v4 = ((v2 * v2) + (v3 * v3));
      (v4 < tmp) && (tmp = v4, val = {
        arrow: v0,
        endpoint: v1.endpoint
      });
    }
  }
  return val;
}
function hitTestTextAnnotation(num, n) {
  if (!document_wave)
    return null;
  const item = document_wave.textAnnotationList();
  if (!item || !item.length)
    return null;
    const val = document_wave.signalList();
  const tmp = document_wave.subStepCount();
  const v0 = document_wave.maxSubSteps ? document_wave.maxSubSteps() : tmp;
  const v1 = waveCellWidth / (v0 + (1));
  const v2 = (getDynamicNameWidth());
  for (const v3 of item) {
        let v4;
    let v5;
    let flag = false;
    if (('Arrow') === v3.anchorType) {
      const v10 = document_wave.arrowList().find(v11 => v11.id === v3.anchorId);
      if (!v10)
        continue;
      if ('function' == typeof computeArrowCurve && 'function' == typeof cubicPoint) {
        const v11 = computeArrowCurve(v10, val, v1, 40, 40, v2);
        if (v11) {
          const v12 = (cubicPoint(v11.p1x, v11.p1y, v11.ctrl1x, v11.ctrl1y, v11.ctrl2x, v11.ctrl2y, v11.p2x, v11.p2y, 0.5));
                    v4 = v12.x;
          v5 = v12.y;
          flag = true;
        }
      } else {
                const v11 = positionToPixelX(v10.startPosition);
        const v12 = (40 + 40 * v10.startSignal + 20);
                v4 = (v11 + (positionToPixelX(v10.endPosition))) / (2);
        v5 = ((v12 + ((40 + (40 * v10.endSignal)) + 20)) / 2);
        flag = true;
      }
    } else {
      if (('Signal' === v3.anchorType) || (('BlankRow') === v3.anchorType)) {
        if ((v3.anchorId < 0) || v3.anchorId >= val.length)
          continue;
                const v10 = 40 + (40) * v3.anchorId;
        const v11 = (v10 + 20);
        const v12 = 'BlankRow' === v3.anchorType ? 'Center' : v3.vPos || ('Above');
        v4 = positionToPixelX(v3.position);
        const v13 = v3.fontSize || 12;
                v5 = ('Above') === v12 ? (v10 + 2 + (v13 / 2)) : 'Below' === v12 ? ((v10 + 40) - 2 - (v13 / 2)) : v11;
        flag = true;
      }
    }
    if (!flag)
      continue;
        const v6 = v3.fontSize || 12;
    const v7 = v3.text || '';
    const v8 = Math.max(v7.length * v6 * (0.6), 20);
    const v9 = (v6 + 8);
    if ((num >= (v4 - (v8 / 2))) && (num <= (v4 + v8 / 2)) && (n >= (v5 - v9 / 2)) && n <= v5 + v9 / (2))
      return v3;
  }
  return null;
}
function drawTimeJumpGlyph(arr, num, n, item, val, tmp, v0, v1) {
  const v2 = (Math.max(10, Math.floor(((2 * item) / 3))) / 2);
  const obj = {
      x: ((num - 8) - 12),
      y: n + v2
    };
  const v3 = {
      x: (num - 8 + 12),
      y: n - v2
    };
  const v4 = {
      x: num + (8) - (12),
      y: n + v2
    };
  const v5 = {
      x: ((num + 8) + 12),
      y: n - v2
    };
    arr.save();
  arr.fillStyle = v1;
  arr.beginPath();
  arr.moveTo(obj.x, obj.y);
  arr.lineTo(v3.x, v3.y);
  arr.lineTo(v5.x, v5.y);
  arr.lineTo(v4.x, v4.y);
  arr.closePath();
  arr.fill();
  arr.restore();
  const fn = (cur, data) => {
        const v6 = {
        x: cur.x - (5),
        y: cur.y
      };
    const v7 = {
        x: data.x + (5),
        y: data.y
      };
    const v8 = (data.x - cur.x);
    const v9 = (data.y - cur.y);
    const v10 = Math.hypot(v8, v9) || 1;
    const v11 = v8 / v10;
    const v12 = v9 / v10;
    const v13 = Math.min(5, 4);
    const v14 = {
        x: cur.x - v13,
        y: cur.y
      };
    const v15 = {
        x: (data.x + v13),
        y: data.y
      };
        arr.beginPath();
    arr.moveTo((cur.x - (5)), v6.y);
    arr.lineTo((cur.x - v13), v14.y);
    arr.quadraticCurveTo(cur.x, cur.y, (cur.x + (v11 * v13)), (cur.y + v12 * v13));
    arr.lineTo((data.x - v11 * v13), (data.y - (v12 * v13)));
    arr.quadraticCurveTo(data.x, data.y, (data.x + v13), v15.y);
    arr.lineTo((data.x + (5)), v7.y);
    arr.stroke();
  };
    arr.save();
  arr.strokeStyle = val;
  arr.lineWidth = tmp;
  arr.lineCap = 'round';
  arr.lineJoin = ('round');
  v0 && arr.setLineDash([
    4,
    4
  ]);
  (fn(obj, v3));
  (fn(v4, v5));
  arr.restore();
}
function drawMarkerPreview(v0, item, num, val, tmp) {
  if ((('marker') !== currentTool) || (markerPreviewPosition < 0) || markerPreviewPosition > num)
    return;
  const v1 = positionToPixelX(markerPreviewPosition);
    v0.save();
  v0.strokeStyle = getThemeDefaultMarkerColor();
  v0.lineWidth = 2;
  v0.setLineDash([
    4,
    4
  ]);
  v0.beginPath();
  v0.moveTo(v1, item);
  v0.lineTo(v1, canvas.height - (1));
  v0.stroke();
  v0.restore();
}
function drawTimeJumpPreview(item, val, num, n, tmp, v0, v1, v2) {
  if ('time-jump' !== currentTool || (timeJumpPreviewPosition < 0) || (timeJumpPreviewPosition > tmp))
    return;
    const v3 = (positionToPixelX(timeJumpPreviewPosition));
  const v4 = (getThemeDefaultTimeJumpColor());
  for (let count = 0; count < val.length; count++)
    val[count].type !== SignalType.BlankRow && drawTimeJumpGlyph(item, v3, ((num + count * n) + n / 2), n, v4, 2, true, v2);
}
function drawTimeJumps(v0, item, num, n, val, tmp, v1, v2) {
  const v3 = document_wave.timeJumpList();
  if (!v3 || !v3.length)
    return;
  const v4 = getThemeDefaultTimeJumpColor();
  for (const v5 of v3) {
    if (v5.position < 0 || v5.position > val)
      continue;
        const v6 = (positionToPixelX(v5.position));
    const v7 = v5.color || v4;
    for (let count = 0; count < item.length; count++)
      (item[count].type !== SignalType.BlankRow) && drawTimeJumpGlyph(v0, v6, num + (count * n) + n / (2), n, v7, 2, false, v2);
    ('function') == typeof isObjectSelected && (void 0 !== SelectableType) && isObjectSelected(SelectableType.TimeJump, v5.id) && (v0.save(), v0.strokeStyle = ('rgba(0, 191, 255, 0.5)'), v0.lineWidth = 10, v0.lineCap = ('round'), v0.setLineDash([]), v0.beginPath(), v0.moveTo(v6, num), v0.lineTo(v6, num + (item.length * n)), v0.stroke(), v0.setLineDash([]), v0.restore());
  }
}
function drawMarkers(v0, num, item, n, val) {
  const tmp = document_wave.markerList();
  if (!tmp || !tmp.length)
    return;
  const v1 = (getThemeDefaultMarkerColor());
    v0.save();
  v0.font = ('10px Arial');
  const v2 = (n - 10) - (4);
  for (const v3 of tmp) {
    const v4 = v3.position;
    if (v4 < 0 || v4 > num)
      continue;
        const v5 = v3.color || v1;
    const v6 = positionToPixelX(v4);
        v0.strokeStyle = v5;
    v0.lineWidth = 2;
    v0.beginPath();
    v0.moveTo(v6, n);
    v0.lineTo(v6, (canvas.height - 1));
    v0.stroke();
        const v7 = String(v3.id);
    const v8 = v0.measureText(v7).width;
    const v9 = Math.max(0, ((v6 - v8) - 6));
        v0.fillStyle = v5;
    v0.fillRect(v9, v2, (v8 + 6), 14);
    v0.fillStyle = ('#fff');
    v0.fillText(v7, (v9 + 3), v2 + (10) + (1));
    ('function') == typeof isObjectSelected && void (0) !== SelectableType && isObjectSelected(SelectableType.Marker, v3.id) && (v0.strokeStyle = 'rgba(0, 191, 255, 0.5)', v0.lineWidth = 10, v0.lineCap = 'round', v0.setLineDash([]), v0.beginPath(), v0.moveTo(v6, n), v0.lineTo(v6, (canvas.height - 1)), v0.stroke(), v0.setLineDash([]));
  }
  v0.restore();
}
function drawTimeSpanPreview(arr, num, n, item, val) {
  if ('time-span' !== currentTool || !timeSpanHasStart || timeSpanPreviewPosition < 0 || timeSpanStartSignal < 0)
    return;
    const tmp = positionToPixelX(timeSpanStartPosition);
  const v0 = ((num + (timeSpanStartSignal * n)) + n / 2);
  const v1 = (timeSpanPreviewSignal >= 0) ? timeSpanPreviewSignal : timeSpanStartSignal;
  const v2 = positionToPixelX(timeSpanPreviewPosition);
  const v3 = num + v1 * n + (n / 2);
  const v4 = (getThemeDefaultTimeSpanColor()) + '99';
    arr.save();
  arr.strokeStyle = v4;
  arr.lineWidth = WAVEDROM_STYLE.arrowLineWidth;
  arr.lineCap = 'round';
  arr.lineJoin = ('round');
  arr.setLineDash([
    5,
    5
  ]);
  arr.beginPath();
  arr.moveTo(tmp, v0);
  arr.lineTo(v2, v0);
  arr.lineTo(v2, v3);
  arr.stroke();
  arr.setLineDash([]);
  arr.fillStyle = v4;
  arr.beginPath();
  arr.arc(tmp, v0, 3, 0, (2) * Math.PI);
  arr.fill();
  arr.beginPath();
  arr.arc(v2, v3, 3, 0, (2) * Math.PI);
  arr.fill();
  arr.restore();
}
function drawTimeSpans(arr, item, num, n, val, tmp) {
  const v0 = document_wave.timeSpanMarkerList();
  if (!v0 || 0 === v0.length)
    return;
    const v1 = (getThemeDefaultTimeSpanColor());
  const v2 = WAVEDROM_STYLE.arrowLineWidth;
  for (const v3 of v0) {
    if (v3.startSignal < 0 || v3.startSignal >= item.length)
      continue;
    if ((v3.endSignal < 0) || (v3.endSignal >= item.length))
      continue;
        const v4 = v3.color || v1;
    const v5 = positionToPixelX(v3.startPosition);
    const v6 = ((num + v3.startSignal * n) + n / 2);
    const v7 = (positionToPixelX(v3.endPosition));
    const v8 = num + (v3.endSignal * n) + (n / 2);
    const v9 = (v7 - v5);
    const v10 = v3.style || '-|';
    if (arr.save(), arr.strokeStyle = v4, arr.lineWidth = v2, arr.lineCap = 'round', arr.lineJoin = 'round', arr.fillStyle = v4, arr.beginPath(), arr.moveTo(v5, v6), (('-|-') === v10)) {
      const v11 = (v5 + (v9 / 2));
            arr.lineTo(v11, v6);
      arr.lineTo(v11, v8);
      arr.lineTo(v7, v8);
    } else
      ('|-' === v10) ? (arr.lineTo(v5, v8), arr.lineTo(v7, v8)) : (arr.lineTo(v7, v6), arr.lineTo(v7, v8));
    if (arr.stroke(), arr.beginPath(), arr.arc(v5, v6, 3, 0, (2) * Math.PI), arr.fill(), arr.beginPath(), arr.arc(v7, v8, 3, 0, (2 * Math.PI)), arr.fill(), 'function' == typeof isObjectSelected && void (0) !== SelectableType && isObjectSelected(SelectableType.TimeSpan, v3.id)) {
      if (arr.strokeStyle = 'rgba(0, 191, 255, 0.5)', arr.lineWidth = (v2 + 8), arr.lineCap = ('round'), arr.lineJoin = 'round', arr.setLineDash([]), arr.beginPath(), arr.moveTo(v5, v6), '-|-' === v10) {
        const v11 = (v5 + v9 / 2);
                arr.lineTo(v11, v6);
        arr.lineTo(v11, v8);
        arr.lineTo(v7, v8);
      } else
        '|-' === v10 ? (arr.lineTo(v5, v8), arr.lineTo(v7, v8)) : (arr.lineTo(v7, v6), arr.lineTo(v7, v8));
            arr.stroke();
      arr.setLineDash([]);
    }
    arr.restore();
  }
}
function drawCutPreview(v0, item, num, n, val) {
  if ('cut' !== currentTool)
    return;
    v0.save();
  v0.strokeStyle = '#ff0000';
  v0.lineWidth = 2;
  v0.setLineDash([]);
  const tmp = item;
  if (cutPreviewSample >= 0) {
    const v1 = (n + cutPreviewSample * num);
        v0.beginPath();
    v0.moveTo(v1, tmp);
    v0.lineTo(v1, val);
    v0.stroke();
  }
  if (cutHasStart && cutStartSample >= 0 && (cutStartSample !== cutPreviewSample)) {
    const v1 = (n + cutStartSample * num);
    if (v0.beginPath(), v0.moveTo(v1, tmp), v0.lineTo(v1, val), v0.stroke(), (cutPreviewSample >= 0)) {
      const v2 = n + cutPreviewSample * num;
            v0.fillStyle = ('rgba(255, 0, 0, 0.15)');
      v0.fillRect(Math.min(v1, v2), tmp, Math.abs((v2 - v1)), val - tmp);
    }
  }
  v0.restore();
}
function drawRangeSelection(v0, num, n, item, val) {
  if (!rangeSelActive && !rangeSelecting || ('select' !== currentTool))
    return;
    const tmp = Math.min(rangeSelStartSignal, rangeSelEndSignal);
  const v1 = Math.max(rangeSelStartSignal, rangeSelEndSignal);
  const v2 = Math.min(rangeSelStartSample, rangeSelEndSample);
  const v3 = Math.max(rangeSelStartSample, rangeSelEndSample);
  if ((tmp < 0) || v1 < 0 || (v2 < 0) || (v3 < 0))
    return;
    const v4 = (val + v2 * item);
  const v5 = (val + ((v3 + 1) * item));
  const v6 = num + tmp * n;
  const v7 = (num + ((v1 + 1) * n));
    v0.save();
  v0.fillStyle = 'rgba(0, 191, 255, 0.2)';
  v0.fillRect(v4, v6, (v5 - v4), v7 - v6);
  v0.strokeStyle = ('rgba(0, 191, 255, 0.5)');
  v0.lineWidth = 2;
  v0.strokeRect(v4, v6, (v5 - v4), v7 - v6);
  v0.restore();
}
function drawPastePreview(v0, num, n, item, val) {
  if (!clipboard || pastePreviewSignal < 0 || (pastePreviewSample < 0) || 'select' !== currentTool)
    return;
    const tmp = clipboard.width;
  const v1 = clipboard.height;
  const v2 = val + (pastePreviewSample * item);
  const v3 = num + pastePreviewSignal * n;
  const v4 = (v2 + tmp * item);
  const v5 = v3 + (v1 * n);
    v0.save();
  v0.fillStyle = 'rgba(0, 200, 100, 0.15)';
  v0.fillRect(v2, v3, (v4 - v2), (v5 - v3));
  v0.strokeStyle = ('#00c864');
  v0.lineWidth = 2;
  v0.setLineDash([
    6,
    4
  ]);
  v0.strokeRect(v2, v3, (v4 - v2), (v5 - v3));
  v0.font = ('12px Arial');
  v0.fillStyle = ('#00c864');
    const v6 = 'Paste (' + tmp + 'x' + v1 + ')';
  const v7 = v0.measureText(v6).width;
    v0.fillText(v6, (v2 + (v4 - v2) / 2) - (v7 / 2), (v3 + (v5 - v3) / 2 + 4));
  v0.restore();
}
function drawMultiSelectionHighlight(v0, num, n, item, val, tmp) {
  if ((void 0 === tmp) || 0 === tmp.length)
    return;
  let v1 = 0;
  if ('undefined' != typeof GroupManager && void (0) !== document_wave) {
    if (null != pendingMoveGroup) {
      const v5 = pendingMoveGroup.depth || 0;
      v1 = (GroupManager.VISUAL.bracketPadding + (v5 * GroupManager.VISUAL.subgroupIndent));
    } else {
      const v5 = document_wave.signalList();
      let v6 = -1;
      for (const v7 of tmp) {
        const v8 = v5[v7];
        if (v8 && v8.groupName) {
          const v9 = GroupManager.getGroupDepth(v8.groupName);
          v9 > v6 && (v6 = v9);
        } else
          (v6 < 0) && (v6 = -1);
      }
      v6 >= 0 && (v1 = (GroupManager.VISUAL.bracketPadding + (v6 * GroupManager.VISUAL.subgroupIndent)));
    }
  }
    const v2 = [...tmp].sort((v5, v6) => v5 - v6);
  const arr = [];
  let v3 = [v2[0]];
  for (let count = 1; count < v2.length; count++)
    v2[count] === v2[(count - 1)] + (1) ? v3.push(v2[count]) : (arr.push(v3), v3 = [v2[count]]);
  arr.push(v3);
  const v4 = val && (tmp.length > 1);
  v0.save();
  for (const v5 of arr) {
        const v6 = v5[0];
    const v7 = ((v6 * n) + num);
    const v8 = ((v5[v5.length - 1] - v6 + 1) * n);
    const v9 = v1;
    const v10 = (item - v9);
        v0.fillStyle = v4 ? ('rgba(0, 191, 255, 0.25)') : 'rgba(0, 191, 255, 0.2)';
    v0.fillRect(v9, v7, v10, v8);
    v0.strokeStyle = ('rgba(0, 191, 255, 0.5)');
    v0.lineWidth = v4 ? 2 : 1.5;
    v0.strokeRect(v9, v7, v10, v8);
  }
    v0.setLineDash([]);
  v0.restore();
}
function drawVectorSelectionHighlight(v0, item, num, n, val, tmp) {
  if (!vectorSelecting || (vectorSelSignal < 0))
    return;
  const v1 = item[vectorSelSignal];
  if (!v1 || (v1.type !== SignalType.Vector))
    return;
    const v2 = document_wave ? document_wave.subStepCount() : 0;
  const v3 = v1.subSteps && (v1.subSteps > 0) ? v1.subSteps : v2;
  const v4 = waveCellWidth / (v3 + (1));
  const v5 = (vectorSelSignal * n + num);
  const v6 = (Math.min(vectorSelStartSample, vectorSelCurrentSample) * v4) + tmp;
  const v7 = ((Math.max(vectorSelStartSample, vectorSelCurrentSample) + 1) * v4) + tmp;
    v0.fillStyle = 'rgba(0, 191, 255, 0.2)';
  v0.fillRect(v6, v5, (v7 - v6), n);
  v0.save();
  v0.strokeStyle = ('rgba(0, 191, 255, 0.5)');
  v0.lineWidth = 2;
  v0.strokeRect(v6, v5, v7 - v6, n);
  v0.restore();
}
function calculateSignalMoveTarget(num, n, item, arr) {
  if (num === n)
    return num;
    const val = item[num];
  const tmp = val ? val.groupName : null;
  if (tmp && arr.length > 0) {
    let v6 = null;
    for (const v11 of arr)
      if (v11.name === tmp) {
        v6 = v11;
        break;
      }
    if (!v6)
      return n;
    let v7 = Math.max(v6.startIndex, Math.min(v6.endIndex, n));
        const v8 = (tmp + '/');
    const v9 = arr.filter(v11 => !!v11.name.startsWith(v8) && !v11.name.substring(v8.length).includes('/'));
    if (0 === v9.length)
      return v7;
    const v10 = n > num;
    for (const v11 of v9)
      if ((v7 >= v11.startIndex) && v7 <= v11.endIndex) {
        v10 ? (v7 = (v11.endIndex + 1), v7 > v6.endIndex && (v7 = v6.endIndex)) : (v7 = (v11.startIndex - 1), v7 < v6.startIndex && (v7 = v6.startIndex));
        break;
      }
    return v7;
  }
    const v0 = (n > num);
  const v1 = arr.filter(v6 => 'undefined' == typeof GroupManager || !GroupManager.getParentGroupName(v6.name)).sort((v6, v7) => v6.startIndex - v7.startIndex);
  if ((0 === v1.length))
    return n;
  const v2 = v1.map(cur => {
    const v6 = cur.startIndex > num ? -1 : 0;
    return {
      name: cur.name,
      startIndex: (cur.startIndex + v6),
      endIndex: cur.endIndex + v6
    };
  });
  function v3(v6) {
        for (const v7 of v2)
      if (v6 > v7.startIndex && v6 <= v7.endIndex)
        return v7;
    return null;
  }
    let v4;
  let v5 = v3(n);
  if (!v5)
    return n;
  if (v0) {
    v4 = v5.endIndex + (1);
    let count = v2.length + (1);
    for (; count > 0;) {
      count--;
      const v6 = (v3(v4));
      if (!v6)
        break;
      v4 = v6.endIndex + (1);
    }
  } else
    v4 = v5.startIndex;
  return (v4 < 0) ? num : v4 >= item.length ? (item.length - 1) : v4;
}
async function handleMouseEvent(ev) {
  const item = canvas.getBoundingClientRect();
  const num = (ev.clientX - item.left);
  const n = ev.clientY - item.top;
  const val = document_wave.signalList();
  const tmp = document_wave.subStepCount();
  const v0 = (document_wave.effectiveSampleCount(), getDynamicNameWidth());
  const v1 = (num < v0) && num >= 0;
  const v2 = Math.floor(((n - 40) / 40));
  const v3 = ('undefined' != typeof GroupManager ? GroupManager.getGroups(document_wave) : [])['reduce']((v12, v13) => Math.max(v12, (v13.depth || 0) + (1)), 0);
  const v4 = v3 > 0 ? (64 + (36 * v3)) + (20) : 0;
  if (('mousedown') === ev.type && (0 === ev.button) && v1 && (num < v4)) {
    const v12 = ('undefined') != typeof GroupManager && GroupManager.hitTestGroupBracket ? GroupManager.hitTestGroupBracket(document_wave, num, n, 40, 40, val) : null;
    if (v12) {
            ev.preventDefault();
      ev.stopPropagation();
      const v13 = GroupManager.getSignalsInGroupRecursive(document_wave, v12.name);
      return void ((v13.length > 0) && (selectedSignalIndices = [...v13].sort((v14, v15) => v14 - v15), lastSelectedSignalIndex = selectedSignalIndices[0], pendingMoveSignal = true, pendingMoveSignalIndex = selectedSignalIndices[0], pendingDragStartPos = {
        x: num,
        y: n
      }, pendingMoveGroup = v12, drawWaveform()));
    }
  }
  if (('mousedown') === ev.type && (0 === ev.button) && v1 && (v2 >= 0) && v2 < val.length) {
    if (ev.ctrlKey || ev.metaKey) {
      const v12 = selectedSignalIndices.indexOf(v2);
            (v12 >= 0) ? selectedSignalIndices.splice(v12, 1) : selectedSignalIndices.push(v2);
      lastSelectedSignalIndex = v2;
      drawWaveform();
    } else {
      if (ev.shiftKey && (lastSelectedSignalIndex >= 0)) {
                const v12 = Math.min(lastSelectedSignalIndex, v2);
        const v13 = Math.max(lastSelectedSignalIndex, v2);
        selectedSignalIndices = [];
        for (let count = v12; (count <= v13); count++)
          selectedSignalIndices.push(count);
        (drawWaveform());
      } else
        pendingMoveSignal = true, pendingMoveSignalIndex = v2, pendingDragStartPos = {
          x: num,
          y: n
        };
    }
    return void (('function') == typeof selectSignal ? (selectSignal(-1)) : (void 0 !== selectedSignalIndex) && (selectedSignalIndex = -1, 'function' == typeof updateColorPicker && (updateColorPicker())));
  }
  if (v1 && ('mousedown' === ev.type))
    return;
  if (('mousedown') === ev.type && !v1 && (selectedSignalIndices.length > 0) && (selectedSignalIndices = [], lastSelectedSignalIndex = -1, (drawWaveform())), ('arrow') !== currentTool && 'text' !== currentTool && ('cut') !== currentTool && ('select') !== currentTool && (('select-object') !== currentTool) && (v2 < 0 || (v2 >= val.length)))
    return;
    const v5 = v2 >= 0 && (v2 < val.length) ? val[v2] : null;
  const v6 = v5 && (v5.subSteps > 0) ? v5.subSteps : tmp;
  const v7 = v6 + (1);
  const v8 = waveCellWidth / v7;
  const v9 = (document_wave.m_sampleCount * v7);
  const v10 = mapCanvasPosition(num, n, {
      snapToEdge: (('arrow') === currentTool) || ('time-span') === currentTool || (('cut') === currentTool),
      useGlobalOnly: ('cut') === currentTool,
      useMaxSubSteps: ('arrow') === currentTool || 'time-span' === currentTool || ('marker') === currentTool || 'time-jump' === currentTool
    });
  let v11;
  if (('arrow') === currentTool || ('time-span' === currentTool) || ('marker') === currentTool || ('cut' === currentTool))
    v11 = v10 ? v10.globalSampleIndex : -1;
  else {
    if (v11 = v10 ? v10.signalSampleIndex : -1, !v1 && !v10)
      return;
  }
  ('mousedown' === ev.type) ? await handleMouseDown(ev, val, v2, v5, v11, v9, v8, v6, 40, 40, v0, v1, v10) : ('mousemove') === ev.type ? handleMouseMove(ev, val, v2, v5, v11, v9, v8, v6, 40, 40, v0, v1, num, n, v10) : (('mouseup') === ev.type) && await handleMouseUp(ev, val, v2, v5, v11);
}
async function handleMouseDown(ev, item, num, sig, n, val, tmp, v0, v1, v2, v3, v4, v5) {
  if (('cut' !== currentTool)) {
    if ('select' === currentTool && !v4 && (num >= 0) && num < item.length) {
      const v6 = (mapToSignalSample(ev.clientX - canvas.getBoundingClientRect().left, (ev.clientY - canvas.getBoundingClientRect().top)));
      if (v6)
        return rangeSelActive = false, rangeSelecting = true, rangeSelStartSignal = num, rangeSelStartSample = v6.sampleIndex, rangeSelEndSignal = num, rangeSelEndSample = v6.sampleIndex, pastePreviewSignal = -1, pastePreviewSample = -1, void drawWaveform();
    }
    if (('select-object') !== currentTool) {
      if ((('time-span') === currentTool)) {
        const v6 = mapCanvasPosition((ev.clientX - canvas.getBoundingClientRect().left), ev.clientY - canvas.getBoundingClientRect().top, {
          snapToEdge: true,
          useMaxSubSteps: true
        });
        if (!v6 || v6.signalIndex < 0 || (v6.position < 0))
          return;
        if (item[v6.signalIndex], !timeSpanHasStart)
          return timeSpanHasStart = true, timeSpanStartSignal = v6.signalIndex, timeSpanStartPosition = v6.position, timeSpanPreviewSignal = v6.signalIndex, timeSpanPreviewPosition = v6.position, void (drawWaveform());
                const v7 = timeSpanStartSignal;
        const v8 = v6.signalIndex;
        const v9 = document_wave.sampleCount();
        const v10 = Math.max(0, Math.min(timeSpanStartPosition, v9));
        const v11 = Math.max(0, Math.min(v6.position, v9));
        const arr = [
            {
              value: '-|',
              label: 'L-Shape \u2310'
            },
            {
              value: '|-',
              label: 'Corner \u2514'
            },
            {
              value: '-|-',
              label: 'Z-Shape \u2310\u2514'
            }
          ];
        const v12 = await showStylePickerDialog(arr, '-|', 'Time Span Style');
        return v12 ? (document_wave.addTimeSpanMarker(v7, v10, v8, v11, v12), timeSpanHasStart = false, timeSpanStartSignal = -1, timeSpanStartPosition = -1, timeSpanPreviewSignal = -1, timeSpanPreviewPosition = -1, void drawWaveform()) : (timeSpanHasStart = false, timeSpanStartSignal = -1, timeSpanStartPosition = -1, timeSpanPreviewSignal = -1, timeSpanPreviewPosition = -1, void (drawWaveform()));
      }
      if ('marker' === currentTool) {
        const v6 = (mapCanvasPosition((ev.clientX - canvas.getBoundingClientRect().left), (ev.clientY - canvas.getBoundingClientRect().top), {
    snapToEdge: true,
    useMaxSubSteps: true
}));
        if (!v6 || (v6.position < 0))
          return;
        return document_wave.addMarker(v6.position), markerPreviewPosition = v6.position, void (drawWaveform());
      }
      if ('time-jump' === currentTool) {
        const v6 = mapCanvasPosition(ev.clientX - canvas.getBoundingClientRect().left, (ev.clientY - canvas.getBoundingClientRect().top), {
          snapToEdge: true,
          useMaxSubSteps: true
        });
        if (!v6 || (v6.position < 0))
          return;
        return document_wave.addTimeJump(v6.position), timeJumpPreviewPosition = v6.position, void drawWaveform();
      }
      if (('text' === currentTool)) {
                const v6 = ev.clientX - canvas.getBoundingClientRect().left;
        const v7 = (ev.clientY - canvas.getBoundingClientRect().top);
        const v8 = findArrowNearPoint(v6, v7);
        if ((v8 >= 0)) {
          const v13 = await (wpPrompt(('Text:'), '', 'Add Text to Arrow'));
          return void (v13 && v13.trim() && (document_wave.addTextAnnotation(('Arrow'), v8, v13.trim(), 0, ('Above')), drawWaveform()));
        }
        const v9 = (mapCanvasPosition(v6, v7, {
    snapToEdge: true,
    useMaxSubSteps: true
}));
        if (!v9 || (v9.signalIndex < 0) || v9.position < 0)
          return;
                const v10 = item[v9.signalIndex];
        const v11 = (v2 + (v9.signalIndex * v1)) + v1 / (2);
        let str = 'Center';
        v10 && (v10.type !== SignalType.BlankRow) && (v7 < v11 - v1 / (4) ? str = 'Above' : v7 > v11 + v1 / (4) && (str = ('Below')));
        const v12 = await (wpPrompt(('Text:'), '', 'Add Text Annotation'));
        if (v12 && v12.trim()) {
          const v13 = v10 && (v10.type === SignalType.BlankRow) ? ('BlankRow') : 'Signal';
                    document_wave.addTextAnnotation(v13, v9.signalIndex, v12.trim(), v9.position, str);
          (drawWaveform());
        }
        return;
      }
      if ('arrow' === currentTool) {
        if ((num < 0) || (num >= item.length))
          return;
        if (!sig)
          return;
        const v6 = v5 ? v5.position : -1;
        if ((v6 < 0))
          return;
        if (arrowHasStart) {
          const v7 = document_wave.addArrow(arrowStartSignal, arrowStartPosition, num, v6);
                    v7 >= 0 && (('function') == typeof getSelectedPaintColor) && (getSelectedPaintColor()) && document_wave.setArrowColorById(v7, getSelectedPaintColor());
          arrowHasStart = false;
          arrowStartSignal = -1;
          arrowStartPosition = -1;
          arrowPreviewSignal = -1;
          arrowPreviewPosition = -1;
          drawWaveform();
        } else
          arrowHasStart = true, arrowStartSignal = num, arrowStartPosition = v6, arrowPreviewSignal = num, arrowPreviewPosition = v6, (drawWaveform());
        return;
      }
      if (('paint' === currentTool) && sig && sig.type === SignalType.Bit) {
                const v6 = window['WaveDromConstants']?.['WaveValue'] || {
            LOW: 0,
            HIGH: 1,
            UNDEFINED: -1,
            HIGHZ: 2,
            PULLUP: 3,
            PULLDOWN: 4
          };
        const v7 = ('function' == typeof getCurrentBitState) ? getCurrentBitState() : '1';
        const v8 = sig['values'][n];
        let v9;
        if (v9 = ('0' === v7) || '1' === v7 ? v8 === v6.LOW ? v6.HIGH : v8 === v6.HIGH ? v6.LOW : bitStateToValue(v7) : ('u' === v7) || ('d' === v7) ? (v8 === v6.PULLUP) ? v6.PULLDOWN : (v8 === v6.PULLDOWN) ? v6.PULLUP : (bitStateToValue(v7)) : bitStateToValue(v7), v9 !== v8 && (paintUndoActive || (document_wave.pushUndoSnapshot(), paintUndoActive = true), sig['values'][n] = v9, sig.driveStrengths)) {
          const v10 = DriveStrength;
          (v9 === v6.PULLUP) || (v9 === v6.PULLDOWN) ? sig['driveStrengths'][n] = v10.Weak : sig['driveStrengths'][n] = v10.Strong;
        }
                lastSampleIndex = n;
        lastSignalIndex = num;
        (drawWaveform());
      } else
        'erase' === currentTool && sig && sig.type === SignalType.Bit ? (paintUndoActive || (document_wave.pushUndoSnapshot(), paintUndoActive = true), sig['values'][n] = -1, lastSampleIndex = n, lastSignalIndex = num, (drawWaveform())) : ('paint' === currentTool) && sig && sig.type === SignalType.Vector ? (vectorSelecting = true, vectorSelSignal = num, vectorSelStartSample = n, vectorSelCurrentSample = n, drawWaveform()) : ('erase' === currentTool) && sig && (sig.type === SignalType.Vector) && (paintUndoActive || (document_wave.pushUndoSnapshot(), paintUndoActive = true), sig['values'][n] = -1, sig['labels'][n] = document_wave.valueToLabel(-1, sig.radix), lastSampleIndex = n, lastSignalIndex = num, (drawWaveform()));
    } else
      await handleSelectObjectClick(ev.clientX - canvas.getBoundingClientRect().left, (ev.clientY - canvas.getBoundingClientRect().top), item, v4, num);
  } else {
    if (n < 0)
      return;
    if (cutHasStart) {
      cutPreviewSample = n;
            const v6 = Math.min(cutStartSample, n);
      const v7 = Math.max(cutStartSample, n);
            (v6 !== v7) && await (wpConfirm('Remove waveform from sample ' + v6 + ' to ' + v7 + '?', 'Cut Range')) && document_wave.deleteRange(v6, v7);
      cutHasStart = false;
      cutStartSample = -1;
      cutPreviewSample = -1;
      (drawWaveform());
    } else
      cutHasStart = true, cutStartSample = n, cutPreviewSample = n, drawWaveform();
  }
}
async function handleSelectObjectClick(item, val, tmp, v0, num) {
  if (('function') == typeof hitTestTextAnnotation) {
    const v1 = (hitTestTextAnnotation(item, val));
    if (v1) {
      (('function') == typeof selectObject) && (selectObject(SelectableType.TextAnnotation, v1.id));
      const v2 = document_wave.textAnnotationList().find(v3 => v3.id === v1.id);
      return v2 && ('Arrow' !== v2.anchorType) && (isDraggingObject = true, draggingObjectType = SelectableType.TextAnnotation, draggingObjectId = v1.id, dragObjectStartPos = {
        x: item,
        y: val
      }, dragObjectStartSample = v2.position, dragObjectStartSignal = v2.anchorId, dragObjectUndoSaved = false), void drawWaveform();
    }
  }
  if ('function' == typeof hitTestMarker) {
    const v1 = (hitTestMarker(item, val));
    if (v1) {
      ('function') == typeof selectObject && (selectObject(SelectableType.Marker, v1.id));
      const v2 = document_wave.markerList().find(v3 => v3.id === v1.id);
      return v2 && (isDraggingObject = true, draggingObjectType = SelectableType.Marker, draggingObjectId = v1.id, dragObjectStartPos = {
        x: item,
        y: val
      }, dragObjectStartSample = v2.position, dragObjectUndoSaved = false), void drawWaveform();
    }
  }
  if (('function' == typeof hitTestTimeJump)) {
    const v1 = hitTestTimeJump(item, val);
    if (v1) {
      'function' == typeof selectObject && (selectObject(SelectableType.TimeJump, v1.id));
      const v2 = document_wave.timeJumpList().find(v3 => v3.id === v1.id);
      return v2 && (isDraggingObject = true, draggingObjectType = SelectableType.TimeJump, draggingObjectId = v1.id, dragObjectStartPos = {
        x: item,
        y: val
      }, dragObjectStartSample = v2.position, dragObjectUndoSaved = false), void (drawWaveform());
    }
  }
  if (('function') == typeof hitTestArrowEndpoint) {
    const v1 = hitTestArrowEndpoint(item, val);
    if (v1)
      return (('function') == typeof selectObject) && (selectObject(SelectableType.Arrow, v1.arrow.id)), isDraggingObject = true, draggingObjectType = SelectableType.Arrow, draggingObjectId = v1.arrow.id, draggingArrowEndpoint = v1.endpoint, dragObjectStartPos = {
        x: item,
        y: val
      }, dragObjectUndoSaved = false, void drawWaveform();
  }
  const n = (findArrowNearPoint(item, val));
  if (n >= 0)
    return (('function') == typeof selectObject) && selectObject(SelectableType.Arrow, n), void drawWaveform();
  if ((('function') == typeof hitTestTimeSpan)) {
    const v1 = (hitTestTimeSpan(item, val));
    if (v1)
      return ('function' == typeof selectObject) && selectObject(SelectableType.TimeSpan, v1.id), void drawWaveform();
  }
  if ('function' == typeof hitTestClockEdge && !v0) {
    const v1 = (hitTestClockEdge(item, val));
    if (v1) {
            const v2 = tmp[v1.signalIndex];
      const v3 = v2 ? v2.edgeArrow : void (0);
      return v3 && ('none' !== v3) ? void ('function' == typeof showToast && showToast('Polarity not available. Signal has ' + (('positive' === v3) ? ('Rising') : 'Falling') + (' Edge markers enabled.'), 'warning')) : ((('function') == typeof selectObject) && selectObject(SelectableType.ClockEdge, null, v1), void (drawWaveform()));
    }
  }
  if (v0 && num >= 0 && num < tmp.length)
    return (('function') == typeof selectObject) && (selectObject(SelectableType.Signal, num)), void drawWaveform();
    ('function' == typeof clearObjectSelection) && (clearObjectSelection());
  (drawWaveform());
}
function handleMouseMove(item, val, num, sig, n, tmp, v0, v1, v2, v3, v4, v5, v6, v7, v8) {
  if ('cut' === currentTool) {
    const v9 = (mapXToSample(v6));
    return (v9 >= 0) ? cutPreviewSample = v9 : cutHasStart || (cutPreviewSample = -1), void drawWaveform();
  }
  if ((isDraggingObject && isMouseDown) && ('select-object') === currentTool) {
        const v9 = pixelXToPosition(v6);
    const v10 = document_wave.m_sampleCount;
    const v11 = snapPositionToSignalGrid(v9, document_wave.maxSubSteps ? document_wave.maxSubSteps() : document_wave.subStepCount());
    const v12 = Math.max(0, Math.min(v10, v11));
    const v13 = !dragObjectUndoSaved;
    if (v13 && (dragObjectUndoSaved = true), draggingObjectType === SelectableType.Marker)
      document_wave.setMarkerPosition(draggingObjectId, v12, v13);
    else {
      if ((draggingObjectType === SelectableType.TimeJump))
        document_wave.setTimeJumpPosition(draggingObjectId, v12, v13);
      else {
        if (draggingObjectType === SelectableType.TextAnnotation) {
          const v14 = document_wave.textAnnotationList().find(v15 => v15.id === draggingObjectId);
          if (v14 && ((('Signal') === v14.anchorType) || (('BlankRow') === v14.anchorType))) {
            const v15 = Math.max(0, Math.min(val.length - (1), num));
            document_wave.setTextAnnotationPosition(draggingObjectId, v12, v15, v13);
          }
        } else {
          if ((draggingObjectType === SelectableType.Arrow) && draggingArrowEndpoint) {
            const v14 = document_wave.arrowList().find(v15 => v15.id === draggingObjectId);
            if (v14) {
              v13 && document_wave.pushUndoSnapshot();
              const v15 = (num >= 0) ? Math.min(val.length - (1), num) : ('start' === draggingArrowEndpoint) ? v14.startSignal : v14.endSignal;
              ('start' === draggingArrowEndpoint) ? (v14.startPosition = v12, v14.startSignal = v15) : (v14.endPosition = v12, v14.endSignal = v15);
            }
          }
        }
      }
    }
    return void (drawWaveform());
  }
  if ((pendingMoveSignal && isMouseDown)) {
        const v9 = (v6 - pendingDragStartPos.x);
    const v10 = (v7 - pendingDragStartPos.y);
    Math.sqrt((v9 * v9) + v10 * v10) >= 5 && (isMovingSignal = true, moveSignalIndex = pendingMoveSignalIndex, lastRawDragIndex = pendingMoveSignalIndex, pendingMoveSignal = false, pendingMoveSignalIndex = -1);
  }
  if (isMovingSignal && isMouseDown) {
        const v9 = Math.floor(((v7 - v3) / v2));
    const v10 = Math.max(0, Math.min(val.length - (1), v9));
    if ((v10 === lastRawDragIndex))
      return;
    if (lastRawDragIndex = v10, (selectedSignalIndices.length > 1) && selectedSignalIndices.includes(moveSignalIndex))
      (handleMultiSignalDrag(v10));
    else {
            const v11 = ('undefined' != typeof GroupManager) ? GroupManager.getGroups(document_wave) : [];
      const v12 = (calculateSignalMoveTarget(moveSignalIndex, v10, val, v11));
      (v12 !== moveSignalIndex) && (document_wave.moveSignal(moveSignalIndex, v12), moveSignalIndex = v12, 1 === selectedSignalIndices.length && (selectedSignalIndices = [v12]), drawWaveform());
    }
    return;
  }
  if ('time-span' === currentTool) {
    const v9 = (mapCanvasPosition(v6, v7, {
    snapToEdge: true,
    useMaxSubSteps: true
}));
    return v9 && v9.signalIndex >= 0 && val[v9.signalIndex] ? (timeSpanPreviewSignal = v9.signalIndex, timeSpanPreviewPosition = v9.position) : (timeSpanPreviewSignal = -1, timeSpanPreviewPosition = -1), void (timeSpanHasStart && (drawWaveform()));
  }
  if (('select' === currentTool)) {
    if ((rangeSelecting && isMouseDown)) {
      const v9 = (mapToSignalSample(v6, v7));
      return void (v9 && (rangeSelEndSignal = Math.max(0, Math.min((val.length - 1), v9.signalIndex)), rangeSelEndSample = Math.max(0, Math.min(tmp - (1), v9.sampleIndex)), (drawWaveform())));
    }
    if (clipboard && !rangeSelecting) {
      const v9 = (mapToSignalSample(v6, v7));
      return void (v9 && !v5 ? (pastePreviewSignal = v9.signalIndex, pastePreviewSample = v9.sampleIndex, (drawWaveform())) : ((pastePreviewSignal >= 0) || (pastePreviewSample >= 0)) && (pastePreviewSignal = -1, pastePreviewSample = -1, (drawWaveform())));
    }
  }
  if ((('text') === currentTool)) {
    const v9 = (findArrowNearPoint(v6, v7));
    if ((v9 >= 0))
      return textAnnotationPreviewArrow = v9, textAnnotationPreviewSignal = -1, textAnnotationPreviewPosition = -1, void drawWaveform();
    const v10 = mapCanvasPosition(v6, v7, {
      snapToEdge: true,
      useMaxSubSteps: true
    });
    if (v10 && (v10.signalIndex >= 0)) {
            textAnnotationPreviewArrow = -1;
      textAnnotationPreviewSignal = v10.signalIndex;
      textAnnotationPreviewPosition = v10.position;
      const v11 = (v3 + v10.signalIndex * v2) + v2 / (2);
      textAnnotationPreviewVPos = val[v10.signalIndex].type === SignalType.BlankRow ? ('Center') : v7 < (v11 - (v2 / 4)) ? ('Above') : v7 > v11 + (v2 / 4) ? ('Below') : 'Center';
    } else
      textAnnotationPreviewArrow = -1, textAnnotationPreviewSignal = -1, textAnnotationPreviewPosition = -1;
    return void drawWaveform();
  }
  if ((('marker') === currentTool)) {
    const v9 = mapCanvasPosition(v6, v7, {
      snapToEdge: true,
      useMaxSubSteps: true
    });
    return markerPreviewPosition = v9 ? v9.position : -1, void drawWaveform();
  }
  if (('time-jump' === currentTool)) {
    const v9 = (mapCanvasPosition(v6, v7, {
    snapToEdge: true,
    useMaxSubSteps: true
}));
    return timeJumpPreviewPosition = v9 ? v9.position : -1, void drawWaveform();
  }
  if ('arrow' === currentTool && arrowHasStart)
    return arrowPreviewSignal = num, arrowPreviewPosition = v8 ? v8.position : -1, void (drawWaveform());
  if (isMouseDown) {
    if (vectorSelecting && (num === vectorSelSignal)) {
      const v9 = mapToSignalSample(v6, v7);
      if (!v9)
        return;
            vectorSelCurrentSample = v9.sampleIndex;
      drawWaveform();
    } else {
      if ((('paint') === currentTool) && sig && sig.type === SignalType.Bit) {
        if ((n !== lastSampleIndex) || (num !== lastSignalIndex)) {
                    const v9 = window['WaveDromConstants']?.['WaveValue'] || {
              LOW: 0,
              HIGH: 1,
              UNDEFINED: -1,
              HIGHZ: 2,
              PULLUP: 3,
              PULLDOWN: 4
            };
          const v10 = ('function') == typeof getCurrentBitState ? (getCurrentBitState()) : '1';
          const v11 = sig['values'][n];
          let v12;
          if (v12 = '0' === v10 || ('1' === v10) ? (v11 === v9.LOW) ? v9.HIGH : (v11 === v9.HIGH) ? v9.LOW : (bitStateToValue(v10)) : ('u' === v10) || 'd' === v10 ? (v11 === v9.PULLUP) ? v9.PULLDOWN : v11 === v9.PULLDOWN ? v9.PULLUP : (bitStateToValue(v10)) : (bitStateToValue(v10)), v12 !== v11 && (paintUndoActive || (document_wave.pushUndoSnapshot(), paintUndoActive = true), sig['values'][n] = v12, sig.driveStrengths)) {
            const v13 = DriveStrength;
            v12 === v9.PULLUP || v12 === v9.PULLDOWN ? sig['driveStrengths'][n] = v13.Weak : sig['driveStrengths'][n] = v13.Strong;
          }
                    lastSampleIndex = n;
          lastSignalIndex = num;
          drawWaveform();
        }
      } else
        ('erase' === currentTool) && sig && (sig.type === SignalType.Bit) && ((n === lastSampleIndex) && num === lastSignalIndex || (paintUndoActive || (document_wave.pushUndoSnapshot(), paintUndoActive = true), sig['values'][n] = -1, lastSampleIndex = n, lastSignalIndex = num, drawWaveform()));
    }
  }
}
function handleMultiSignalDrag(num) {
  const arr = [...selectedSignalIndices].sort((v4, v5) => v4 - v5);
  const n = arr[0];
  const item = arr[arr.length - (1)];
  const val = arr.length;
    let tmp = null;
  let flag = false;
  let v0 = null;
  if (pendingMoveGroup && ('undefined') != typeof GroupManager) {
    if (v0 = GroupManager.getParentGroupName(pendingMoveGroup.name), v0) {
      const v4 = GroupManager.getGroups(document_wave).find(v5 => v5.name === v0);
      v4 && (tmp = {
        startIndex: v4.startIndex,
        endIndex: v4.endIndex
      });
    } else
      flag = true;
  }
  let v1 = -1;
    const v2 = num > item;
  const v3 = num < n;
  if (v3 ? v1 = num : v2 && (v1 = (num - val + 1)), null !== tmp && (v1 >= 0)) {
        let v4 = v1;
    let v5 = ((v1 + val) - 1);
    if (v4 < tmp.startIndex && (v1 = tmp.startIndex, v4 = v1, v5 = ((v1 + val) - 1)), (v5 > tmp.endIndex) && (v1 = tmp.endIndex - val + (1), v4 = v1, v5 = (v1 + val) - (1)), ('undefined') != typeof GroupManager) {
      const v6 = GroupManager.getGroups(document_wave).filter(v7 => GroupManager.getParentGroupName(v7.name) === v0 && v7.name !== pendingMoveGroup.name);
      for (const v7 of v6)
        if (v4 <= v7.endIndex && v5 >= v7.startIndex) {
          v2 ? (v1 = (v7.endIndex + 1), (v1 + val) - (1) > tmp.endIndex && (v1 = ((tmp.endIndex - val) + 1))) : v3 && (v1 = (v7.startIndex - val), v1 < tmp.startIndex && (v1 = tmp.startIndex));
          break;
        }
    }
  }
  if (flag && (v1 >= 0) && ('undefined') != typeof GroupManager) {
        const v4 = GroupManager.getGroups(document_wave);
    const v5 = document_wave.signalList();
    const v6 = v4.filter(v9 => !GroupManager.getParentGroupName(v9.name) && v9.name !== pendingMoveGroup.name && !v9.name.startsWith(pendingMoveGroup.name + '/'));
    const v7 = v1;
    const v8 = (v1 + val - 1);
    for (const v9 of v6)
      if ((v7 <= v9.endIndex) && v8 >= v9.startIndex) {
        v2 ? v1 = (v9.endIndex + 1) : v3 && (v1 = v9.startIndex - val, v1 < 0 && (v1 = 0));
        break;
      }
        (v1 < 0) && (v1 = 0);
    (v1 + val > v5.length) && (v1 = (v5.length - val));
  }
  if (v1 >= 0 && (v1 !== n)) {
    const v4 = document_wave.moveSignals(selectedSignalIndices, v1);
    if (v4.length > 0) {
      selectedSignalIndices = v4;
      const v5 = arr.indexOf(moveSignalIndex);
      moveSignalIndex = v4[Math.max(0, v5)];
    }
    drawWaveform();
  }
}
async function handleMouseUp(item, val, num, sig, tmp) {
  if (isDraggingObject && ((draggingObjectType === SelectableType.Arrow) && dragObjectUndoSaved && document_wave.dataChanged(), isDraggingObject = false, draggingObjectType = null, draggingObjectId = -1, draggingArrowEndpoint = null, dragObjectStartPos = {
      x: 0,
      y: 0
    }, dragObjectStartSample = -1, dragObjectStartSignal = -1, dragObjectUndoSaved = false, drawWaveform()), rangeSelecting && ('select' === currentTool)) {
    rangeSelecting = false;
    const n = Math.min(rangeSelStartSample, rangeSelEndSample);
        Math.max(rangeSelStartSample, rangeSelEndSample) > n || rangeSelStartSignal !== rangeSelEndSignal ? rangeSelActive = true : (rangeSelActive = false, rangeSelStartSignal = -1, rangeSelStartSample = -1, rangeSelEndSignal = -1, rangeSelEndSample = -1);
    drawWaveform();
  } else
    rangeSelecting && (rangeSelecting = false, rangeSelActive = false, rangeSelStartSignal = -1, rangeSelStartSample = -1, rangeSelEndSignal = -1, rangeSelEndSample = -1, drawWaveform());
  if (endSignalDrag((pendingMoveSignal && !isMovingSignal), pendingMoveSignalIndex), vectorSelecting && num === vectorSelSignal) {
        const v0 = Math.min(vectorSelStartSample, vectorSelCurrentSample);
    const n = Math.max(vectorSelStartSample, vectorSelCurrentSample);
    const v1 = await wpPrompt(('Enter vector value or label:'), '0', ('Vector Value'));
    if ((null !== v1)) {
      document_wave.pushUndoSnapshot();
      const v2 = (parseInt(v1, 10));
      if ((isNaN(v2))) {
        const v3 = v1.split('').reduce((v4, v5) => (v4 = (v4 << 5) - v4 + v5.charCodeAt(0)) & v4, 0);
        for (let count = v0; count <= n; count++)
          sig['values'][count] = v3, sig['labels'][count] = v1;
      } else {
        for (let count = v0; count <= n; count++)
          sig['values'][count] = v2, sig['labels'][count] = document_wave.valueToLabel(v2, sig.radix);
      }
    }
  }
    vectorSelecting = false;
  vectorSelSignal = -1;
  vectorSelStartSample = -1;
  vectorSelCurrentSample = -1;
  paintUndoActive = false;
  drawWaveform();
}
function drawWaveform() {
  if (!document_wave || !canvas || !ctx)
    return;
    const el = document.getElementById('wave-view');
  const item = el.clientWidth;
  const val = el.clientHeight;
  const arr = document_wave.signalList();
  const num = document_wave.sampleCount();
  const n = document_wave.subStepCount();
  const tmp = (document_wave.maxSubSteps ? document_wave.maxSubSteps() : n) + (1);
  const v0 = waveCellWidth;
  const v1 = n + (1);
  const v2 = (v0 / v1);
  const v3 = (num * v1);
  const v4 = (v0 / tmp);
  const v5 = 40;
  const v6 = 40;
  const v7 = calculateDynamicNameWidth(ctx, arr);
  const v8 = ((v7 + v0 * num) + 20);
  const v9 = ((arr.length * v5) + v6 + 20);
  const v10 = Math.max(v8, item);
  const v11 = Math.max(v9, 600, val);
  (void 0 !== isMouseDown) && isMouseDown || canvas.width === v10 && (canvas.height === v11) || (canvas.width = v10, canvas.height = v11);
  const v12 = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim() || ('#ffffff');
    ctx.fillStyle = v12;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  textExclusionZones = (calculateTextExclusionZones(arr, v4, v5, v6, v7));
  const v13 = getComputedStyle(document.body).getPropertyValue('--canvas-grid').trim() || (getComputedStyle(document.body)).getPropertyValue('--border-color') || ('#c0c0c0');
  if ((void 0 !== axisNumbersHidden) && axisNumbersHidden || (void (0) !== timeAxisEnabled && timeAxisEnabled ? (drawTimeAxis(ctx, num, v0, tmp, v7, canvas.width, timePerStep, (timeUnitString()))) : drawStepNumbers(ctx, arr, num, v0, tmp, v7, v6, canvas.width, v5)), drawVerticalGrid(ctx, num, v0, 1, v0, v7, v6, canvas.height, v13), (drawMultiSelectionHighlight(ctx, v6, v5, v7, isMovingSignal, selectedSignalIndices)), ctx.save(), textExclusionZones.length > 0) {
        ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    for (const v14 of textExclusionZones)
      ctx.rect(v14.x, v14.y, v14.width, v14.height);
    ctx.clip('evenodd');
  }
  if (arr.forEach((sig, v14) => {
            const v15 = (v14 * v5) + v6;
      const v16 = (v20 => v20.subSteps && v20.subSteps > 0 ? v20.subSteps : n)(sig);
      const v17 = (v16 + 1);
      const v18 = num * v17;
      const v19 = (v0 / v17);
      if ((v16 > 0) && drawSignalSubstepGrid(ctx, num, v0, v17, v19, v7, v15, v15 + v5), isMovingSignal && selectedSignalIndices.length <= 1 && v14 === moveSignalIndex) {
        let v20 = 0;
        if ('undefined' != typeof GroupManager && sig.groupName) {
          const v21 = GroupManager.getGroups(document_wave).find(v22 => v22.name === sig.groupName);
          v21 && (v20 = GroupManager.VISUAL.bracketPadding + (v21.depth * GroupManager.VISUAL.subgroupIndent) + GroupManager.VISUAL.bracketWidth + (5));
        }
                ctx.fillStyle = ('rgba(0, 191, 255, 0.25)');
        ctx.fillRect(v20, v15, v7 - v20, v5);
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(v20, v15, (v7 - v20), v5);
        ctx.restore();
      }
      if ((drawSignalName(ctx, sig, v14, arr, v5, v6, v7)), sig.type === SignalType.Bit)
        drawBitSignal(ctx, sig, v14, v5, v6, v7, v19, v18, v16);
      else {
        if (sig.type === SignalType.Vector)
          (drawVectorSignal(ctx, sig, v14, v5, v6, v7, v19, v18, v16));
        else {
          if (sig.type === SignalType.BlankRow) {
                        const v20 = ((v14 * v5 + v6) + 20);
            const v21 = v7;
            const v22 = (v7 + num * v0);
                        ctx.save();
            ctx.strokeStyle = ('rgba(128, 128, 128, 0.3)');
            ctx.lineWidth = 1;
            ctx.setLineDash([
              4,
              8
            ]);
            ctx.beginPath();
            ctx.moveTo(v21, v20);
            ctx.lineTo(v22, v20);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }), (('undefined') != typeof GroupManager) && GroupManager.drawGroupBrackets ? GroupManager.drawGroupBrackets(ctx, document_wave, arr, v6, v5, v7) : (drawFallbackGroupBrackets(ctx, arr, v6, v5, v7)), (drawVectorSelectionHighlight(ctx, arr, v6, v5, v2, v7)), drawMarkerPreview(ctx, v6, v3, v2, v7), drawTimeJumpPreview(ctx, arr, v6, v5, v3, v2, v7, v12), (drawTimeJumps(ctx, arr, v6, v5, v3, v2, v7, v12)), (drawMarkers(ctx, v3, v2, v6, v7)), (drawTimeSpanPreview(ctx, v6, v5, v2, v7)), drawTimeSpans(ctx, arr, v6, v5, v2, v7), (drawCutPreview(ctx, v6, v2, v7, canvas.height)), drawRangeSelection(ctx, v6, v5, v2, v7), (drawPastePreview(ctx, v6, v5, v2, v7)), drawArrowPreview(ctx, arr, v2, v5, v6, v7), (drawArrows(ctx, arr, v2, v5, v6, v7)), ('function' == typeof drawClockEdgeSelection) && 'function' == typeof getObjectSelection && (void 0 !== SelectableType)) {
    const v14 = (getObjectSelection());
    v14 && (v14.type === SelectableType.ClockEdge) && v14.object && (drawClockEdgeSelection(ctx, v14.object));
  }
    ctx.restore();
  (drawTextAnnotations(ctx, arr, v4, v5, v6, v7));
  drawTextAnnotationPreview(ctx, arr, v4, v5, v6, v7);
  textExclusionZones = [];
  ('function') == typeof updateWaveDromDebugCode && (updateWaveDromDebugCode());
}
function drawSignalName(v0, item, num, val, n, tmp, v1) {
  const v2 = num * n + tmp;
  const v3 = (('undefined' != typeof GroupManager) ? GroupManager.getGroups(document_wave) : [])['reduce']((v10, v11) => Math.max(v10, (v11.depth || 0) + (1)), 0);
  const v4 = ('undefined' != typeof GroupManager) ? GroupManager.VISUAL.bracketPadding : 64;
  const v5 = (('undefined') != typeof GroupManager) ? GroupManager.VISUAL.subgroupIndent : 36;
  const v6 = (v3 > 0) ? (v4 + (v3 * v5)) + (10) : 0;
    v0.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || ('#000');
  v0.font = ('12px Arial');
  const v7 = v1 - (6);
  const v8 = ((v7 - v6) - 4);
    let arr = displaySignalName(item);
  let v9 = v0.measureText(arr).width;
  if ((v9 > v8)) {
    for (; v9 > v8 && (arr.length > 1);)
      arr = arr.slice(0, -1), v9 = v0.measureText(arr + '\u2026').width;
    arr += '\u2026';
  }
    v0.textAlign = 'right';
  v0.textBaseline = 'middle';
  v0.fillText(arr, v7, (v2 + n / 2));
  v0.textAlign = 'left';
  v0.textBaseline = 'alphabetic';
  (('function') == typeof isObjectSelected) && (void 0 !== SelectableType) && (isObjectSelected(SelectableType.Signal, num)) && (v0.save(), v0.fillStyle = ('rgba(0, 191, 255, 0.25)'), v0.fillRect(1, v2 + (1), v1 - (2), n - (2)), v0.strokeStyle = 'rgba(0, 191, 255, 0.5)', v0.lineWidth = 2, v0.strokeRect(1, (v2 + 1), (v1 - 2), n - (2)), v0.restore());
}
function drawFallbackGroupBrackets(item, val, tmp, v0, v1) {
  ('undefined') != typeof GroupManager && GroupManager.drawGroupBrackets(item, document_wave, val, tmp, v0, v1);
}
let document_wave;
let canvas;
let ctx;
'undefined' != typeof module && module.exports && (module.exports = {
  drawBitSignal: drawBitSignal,
  drawBitEdgeArrows: drawBitEdgeArrows,
  drawClockMarkers: drawClockMarkers,
  drawVectorSignal: drawVectorSignal,
  drawVectorBars: drawVectorBars,
  getVectorDisplayLevel: getVectorDisplayLevel,
  getYForLevel: getYForLevel,
  hitTestClockEdge: hitTestClockEdge,
  drawClockEdgeSelection: drawClockEdgeSelection
});
'undefined' != typeof module && module.exports && (module.exports = {
  getWaveCellWidth: getWaveCellWidth,
  setWaveCellWidth: setWaveCellWidth,
  zoomIn: zoomIn,
  zoomOut: zoomOut,
  zoomFit: zoomFit
});
'undefined' != typeof module && module.exports && (module.exports = {
  setSelectedObject: setSelectedObject,
  isObjectSelected: isObjectSelected,
  endSignalDrag: endSignalDrag
});
'undefined' != typeof module && module.exports && (module.exports = {
  computeArrowCurve: computeArrowCurve,
  findArrowNearPoint: findArrowNearPoint,
  drawArrowPreview: drawArrowPreview,
  drawArrows: drawArrows
});
'undefined' != typeof module && module.exports && (module.exports = {
  calculateTextExclusionZones: calculateTextExclusionZones,
  isInTextExclusionZone: isInTextExclusionZone,
  lineIntersectsRect: lineIntersectsRect
});
'undefined' != typeof module && module.exports && (module.exports = {
  drawTextAnnotations: drawTextAnnotations,
  drawTextAnnotationPreview: drawTextAnnotationPreview
});
'undefined' != typeof module && module.exports && (module.exports = {
  hitTestMarker: hitTestMarker,
  hitTestTimeJump: hitTestTimeJump,
  hitTestTimeSpan: hitTestTimeSpan,
  hitTestTextAnnotation: hitTestTextAnnotation,
  hitTestArrowEndpoint: hitTestArrowEndpoint
});
'undefined' != typeof module && module.exports && (module.exports = {
  drawTimeJumpGlyph: drawTimeJumpGlyph,
  drawMarkerPreview: drawMarkerPreview,
  drawTimeJumpPreview: drawTimeJumpPreview,
  drawTimeJumps: drawTimeJumps,
  drawMarkers: drawMarkers,
  drawTimeSpanPreview: drawTimeSpanPreview,
  drawTimeSpans: drawTimeSpans
});
'undefined' != typeof module && module.exports && (module.exports = {
  drawCutPreview: drawCutPreview,
  drawRangeSelection: drawRangeSelection,
  drawPastePreview: drawPastePreview,
  drawMultiSelectionHighlight: drawMultiSelectionHighlight,
  drawVectorSelectionHighlight: drawVectorSelectionHighlight
});
'undefined' != typeof module && module.exports && (module.exports = { handleMouseEvent: handleMouseEvent });
'undefined' != typeof module && module.exports && (module.exports = { drawWaveform: drawWaveform });
let selectedSignalIndex = -1;
let isMouseDown = false;
let lastSampleIndex = -1;
let lastSignalIndex = -1;
let currentTool = 'none';
let selectedPaintColor = null;
let timeAxisEnabled = false;
let axisNumbersHidden = false;
let timeUnit = 'ns';
let timePerStep = 10;
let vectorSelecting = false;
let vectorSelSignal = -1;
let vectorSelStartSample = -1;
let vectorSelCurrentSample = -1;
let arrowHasStart = false;
let arrowStartSignal = -1;
let arrowStartPosition = -1;
let arrowPreviewSignal = -1;
let arrowPreviewPosition = -1;
let isMovingSignal = false;
let moveSignalIndex = -1;
let moveSignalTargetIndex = -1;
let pendingMoveSignal = false;
let pendingMoveSignalIndex = -1;
let pendingDragStartPos = {
    x: 0,
    y: 0
  };
let selectedSignalIndices = [];
let lastSelectedSignalIndex = -1;
let signalClipboard = null;
let isDraggingObject = false;
let draggingObjectType = null;
let draggingObjectId = -1;
let draggingArrowEndpoint = null;
let dragObjectStartPos = {
    x: 0,
    y: 0
  };
let dragObjectStartSample = -1;
let dragObjectStartSignal = -1;
let dragObjectUndoSaved = false;
let wpModalState = {
    isOpen: false,
    resolve: null,
    options: null,
    dragActive: false,
    dragOffsetX: 0,
    dragOffsetY: 0
  };
function clearSignalSelection() {
    selectedSignalIndex = -1;
  selectedSignalIndices = [];
  lastSelectedSignalIndex = -1;
}
function updateSelectionAfterRemove(num) {
    selectedSignalIndex === num ? selectedSignalIndex = -1 : (selectedSignalIndex > num) && selectedSignalIndex--;
  selectedSignalIndices = selectedSignalIndices.filter(n => n !== num).map(n => n > num ? n - (1) : n);
  lastSelectedSignalIndex === num ? lastSelectedSignalIndex = -1 : lastSelectedSignalIndex > num && lastSelectedSignalIndex--;
}
function timeUnitString() {
  return timeUnit;
}
const COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff00ff',
  '#00ffff',
  '#333333',
  '#666666',
  '#990000',
  '#009900',
  '#000099',
  '#999900',
  '#990099',
  '#009999',
  '#999999',
  '#cccccc',
  '#ff6666',
  '#66ff66',
  '#6666ff',
  '#ffff66',
  '#ff66ff',
  '#66ffff',
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#E91E63',
  '#9C27B0',
  '#00BCD4',
  '#795548',
  '#607D8B'
];
function openColorPicker(item, val = null, tmp = 'Choose Color') {
  return new Promise(v0 => {
    const el = document.querySelector(('.wp-color-picker-overlay'));
    el && el.remove();
        const v1 = getComputedStyle(document.body).getPropertyValue(('--signal-color')).trim() || ('#4CAF50');
    const v2 = item || v1;
    const v3 = document.createElement('div');
    v3.className = ('wp-color-picker-overlay');
    const v4 = document.createElement(('div'));
    v4.className = ('wp-color-picker');
    const v5 = document.createElement(('div'));
        v5.className = 'wp-color-picker-title';
    v5.textContent = tmp;
    v4.appendChild(v5);
    const v6 = document.createElement('div');
    v6.className = ('wp-color-picker-presets');
        let v7 = null;
    let v8 = v2;
        COLOR_PRESETS.forEach(v17 => {
      const v18 = document.createElement('div');
            v18.className = ('wp-color-preset');
      v18.style.backgroundColor = v17;
      v18.dataset.color = v17;
      v17.toLowerCase() === v2.toLowerCase() && (v18.classList.add(('selected')), v7 = v18);
      v18.addEventListener('click', () => {
                                v7 && v7.classList.remove(('selected'));
                v18.classList.add('selected');
                v7 = v18;
                v8 = v17;
                v11.value = v17;
                v12.value = v17;
      });
      v6.appendChild(v18);
    });
    v4.appendChild(v6);
    const v9 = document.createElement(('div'));
    v9.className = 'wp-color-picker-custom';
    const v10 = document.createElement(('label'));
        v10.textContent = 'Custom:';
    v9.appendChild(v10);
    const v11 = document.createElement(('input'));
        v11.type = ('color');
    v11.value = v2;
    v9.appendChild(v11);
    const v12 = document.createElement(('input'));
        v12.type = ('text');
    v12.value = v2;
    v12.placeholder = ('#RRGGBB');
    v9.appendChild(v12);
    v11.addEventListener('input', () => {
                        v7 && v7.classList.remove('selected');
            v7 = null;
            v8 = v11.value;
            v12.value = v11.value;
    });
    v12.addEventListener('input', () => {
      const v17 = v12.value.trim();
      /^#[0-9A-Fa-f]{6}$/['test'](v17) && (v7 && v7.classList.remove('selected'), v7 = null, v8 = v17, v11.value = v17);
    });
    v4.appendChild(v9);
    const v13 = document.createElement(('div'));
    v13.className = ('wp-color-picker-footer');
    const v14 = document.createElement('button');
        v14.className = 'wp-color-picker-btn cancel';
    v14.textContent = ('Cancel');
    v14.type = ('button');
    const v15 = document.createElement('button');
    if (v15.className = 'wp-color-picker-btn ok', v15.textContent = 'OK', v15.type = ('button'), v13.appendChild(v14), v13.appendChild(v15), v4.appendChild(v13), v3.appendChild(v4), document.body.appendChild(v3), val) {
      const v17 = val.getBoundingClientRect();
            v4.style.position = 'absolute';
      v4.style.left = v17.left + 'px';
      v4.style.top = ((v17.bottom + 5) + 'px');
    } else
      v4.style.position = ('fixed'), v4.style.left = ('50%'), v4.style.top = '50%', v4.style.transform = ('translate(-50%, -50%)');
    const fn = () => {
            v3.remove();
    };
        v14.addEventListener('click', () => {
            fn();
      v0(null);
    });
    v15.addEventListener(('click'), () => {
                        fn();
            (v0(v8));
    });
    v3.addEventListener('click', ev => {
            ev.target === v3 && (fn(), v0(null));
    });
    const v16 = v17 => {
            (('Escape') === v17.key) && ((fn()), v0(null), document.removeEventListener('keydown', v16));
    };
    document.addEventListener('keydown', v16);
  });
}
function updatePaintColorBox() {
  const item = document.querySelector(('#tool-paint-color .color-box'));
  if (item) {
    if (selectedPaintColor)
      item.style.backgroundColor = selectedPaintColor;
    else {
      let val;
            val = (('function') == typeof getCurrentSkin) ? (getCurrentSkin()).signalColor : getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
      item.style.backgroundColor = val;
    }
  }
}
function getCurrentPaintColor() {
  return selectedPaintColor || ((('function') == typeof getCurrentSkin) ? getCurrentSkin().signalColor : getComputedStyle(document.body).getPropertyValue(('--signal-color')).trim() || ('#000000'));
}
function getSelectedPaintColor() {
  return selectedPaintColor;
}
let currentBitState = '1';
function getCurrentBitState() {
  return currentBitState;
}
function setCurrentBitState(item) {
    currentBitState = item;
  updateBitStatePreview();
  const val = document.getElementById(('bit-state-menu'));
  val && (val.style.display = ('none'));
}
function updateBitStatePreview() {
  const item = document.getElementById(('tool-bit-state'));
  const val = document.getElementById(('bit-state-preview'));
  const tmp = document.getElementById('bit-state-icon');
  if (!item || !val || !tmp)
    return;
  item.setAttribute(('data-current-state'), currentBitState);
  let str = '';
  switch (currentBitState) {
  case '1':
    str = ('<line x1="2" y1="4" x2="14" y2="4" stroke="#4CAF50" stroke-width="2.5"/>');
    break;
  case '0':
    str = ('<line x1="2" y1="12" x2="14" y2="12" stroke="#4CAF50" stroke-width="2.5"/>');
    break;
  case 'z':
    str = ('<line x1="2" y1="8" x2="14" y2="8" stroke="#2196F3" stroke-width="2" stroke-dasharray="3,2"/>');
    break;
  case 'x':
    str = ('\n                <defs><pattern id="crosshatch-preview" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0,0 l4,4 M4,0 l-4,4" stroke="#F44336" stroke-width="0.5"/></pattern></defs>\n                <rect x="1" y="3" width="14" height="10" fill="url(#crosshatch-preview)" stroke="#F44336" stroke-width="1"/>\n            ');
    break;
  case 'u':
    str = '<line x1="2" y1="4" x2="14" y2="4" stroke="#9C27B0" stroke-width="1.5" stroke-dasharray="1,1"/>';
    break;
  case 'd':
    str = '<line x1="2" y1="12" x2="14" y2="12" stroke="#9C27B0" stroke-width="1.5" stroke-dasharray="1,1"/>';
  }
    tmp.innerHTML = str;
  item.title = 'Bit State: ' + {
    1: 'High (1)',
    0: 'Low (0)',
    z: ('High-Z (z)'),
    x: ('Undefined (x)'),
    u: ('Pull-up (u)'),
    d: ('Pull-down (d)')
  }[currentBitState] + (' - Click to change');
  document.querySelectorAll('.bit-state-option').forEach(el => {
        (el.dataset.state === currentBitState) ? el.classList.add('selected') : el.classList.remove(('selected'));
  });
}
function initBitStatePicker() {
  const item = document.getElementById(('bit-state-picker'));
  const val = document.getElementById(('tool-bit-state'));
  const tmp = document.getElementById(('bit-state-menu'));
  (item && val) && tmp && (val.addEventListener('click', ev => {
        ev.stopPropagation();
    const v0 = (('block') === tmp.style.display);
        document.querySelectorAll(('.dropdown-content')).forEach(v1 => {
            v1.style.display = 'none';
    });
    tmp.style.display = v0 ? ('none') : 'block';
  }), tmp.querySelectorAll(('.bit-state-option')).forEach(el => {
        el.addEventListener(('click'), ev => {
                        ev.preventDefault();
            ev.stopPropagation();
      const v0 = el.dataset.state;
      v0 && setCurrentBitState(v0);
    });
  }), document.addEventListener(('click'), ev => {
        item.contains(ev.target) || (tmp.style.display = ('none'));
  }), document.addEventListener('keydown', ev => {
        if ((('INPUT') === ev.target.tagName) || (('TEXTAREA') === ev.target.tagName) || ev.target.isContentEditable)
      return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey)
      return;
    if ((void 0 !== wpModalState) && wpModalState.isOpen)
      return;
    const obj = {
      0: '0',
      1: '1',
      z: 'z',
      Z: 'z',
      x: 'x',
      X: 'x',
      u: 'u',
      U: 'u',
      d: 'd',
      D: 'd'
    };
    obj[ev.key] && ((setCurrentBitState(obj[ev.key])), void (0) !== currentTool && 'paint' !== currentTool && ('function') == typeof setCurrentTool && (setCurrentTool('paint'), ('function' == typeof drawWaveform) && drawWaveform()), ev.preventDefault());
  }), updateBitStatePreview());
}
function bitStateToValue(item) {
  const val = window['WaveDromConstants']?.['WaveValue'] || {
      LOW: 0,
      HIGH: 1,
      UNDEFINED: -1,
      HIGHZ: 2,
      PULLUP: 3,
      PULLDOWN: 4
    };
  switch (item) {
  case '0':
  default:
    return val.LOW;
  case '1':
    return val.HIGH;
  case 'x':
    return val.UNDEFINED;
  case 'z':
    return val.HIGHZ;
  case 'u':
    return val.PULLUP;
  case 'd':
    return val.PULLDOWN;
  }
}

// —— 全局弹窗文案翻译 ——
// 重构（2026-09-02）：原 patch/zh.js 用 MutationObserver 在 DOM 层拦截翻译弹窗
// 文本；解混淆后改为在核心弹窗唯一入口 openWpModal 里直接翻译（标题/消息/按钮
// 赋值前过一遍 wpText）。等价且少一个外部补丁。未命中的文案原样返回。
function wpText(item) {
  if (typeof item !== 'string') return item;
  const t = item.trim();
  const dict = {
    // 通用按钮 / 对话框标题
    OK: '确定', Cancel: '取消', Input: '输入', Confirm: '确认',
    Notice: '提示', Dialog: '对话框', Yes: '是', No: '否',
    // —— 添加信号对话框标题 ——
    'Add Clock Signal': '添加时钟信号', 'Add Counter Signal': '添加计数器信号',
    'Add Reset Signal': '添加复位信号', 'Add Pulse Signal': '添加脉冲信号',
    'Add Strobe Signal': '添加选通信号', 'Add PWM Signal': '添加 PWM 信号',
    'Add Ramp Signal': '添加斜坡信号', 'Add Walking One Signal': '添加走查1信号',
    'Add Walking Zero Signal': '添加走查0信号', 'Add Bus Idle Signal': '添加总线空闲信号',
    'Add Alternating Signal': '添加交替信号', 'Add Gray Code Counter Signal': '添加格雷码计数器信号',
    // —— 提示消息 ——
    'Clock name:': '时钟名称：', 'Counter name:': '计数器名称：',
    'Signal name:': '信号名称：', 'Period (samples):': '周期（采样）：',
    'High time (samples):': '高电平时间（采样）：', 'Low time (samples)': '低电平时间（采样）',
    'Low time (samples):': '低电平时间（采样）：', 'Pulse width': '脉冲宽度',
    'Pulse width:': '脉冲宽度：', 'Duty cycle': '占空比', 'Duty cycle:': '占空比：',
    'Active cycles': '有效周期数', 'Active cycles:': '有效周期数：',
    'Samples per': '每周期采样数', 'Samples per cycle': '每周期采样数',
    'Bit width:': '位宽：', 'From value:': '起始值：', 'To value:': '结束值：',
    'End value:': '结束值：', 'Number of samples:': '采样数：',
    'Steps:': '步数：', 'Sub-Steps:': '子步数：'
  };
  if (dict.hasOwnProperty(t)) return dict[t];
  // 前缀匹配（有些消息后跟更多说明文字）
  for (const k in dict) {
    if (dict.hasOwnProperty(k) && k.length > 3 && t.indexOf(k) === 0) {
      return dict[k] + t.substring(k.length);
    }
  }
  return item;
}

function openWpModal(item) {
  const el = document.getElementById('wp-modal-overlay');
  const v0 = document.getElementById('wp-modal');
  const val = document.getElementById('wp-modal-header');
  const tmp = document.getElementById('wp-modal-title');
  const v1 = document.getElementById('wp-modal-message');
  const v2 = document.getElementById(('wp-modal-input'));
  const v3 = document.getElementById(('wp-modal-ok'));
  const v4 = document.getElementById('wp-modal-cancel');
  const v5 = document.getElementById(('wp-modal-close'));
  if (!(el && v0 && val && tmp && v1 && v2 && v3 && v4 && v5))
    return Promise.resolve({
      ok: false,
      value: null
    });
    wpModalState.isOpen = true;
  wpModalState.options = item;
  tmp.textContent = wpText(item.title || ('Dialog'));
  v1.textContent = wpText(item.message || '');
  v2.style.display = item.showInput ? ('block') : 'none';
  v2.type = item.inputType || 'text';
  v2.value = item.defaultValue || '';
  v3.textContent = wpText(item.okText || 'OK');
  v4.textContent = wpText(item.cancelText || ('Cancel'));
  v4.style.display = (false === item.showCancel) ? 'none' : 'inline-block';
  v5.style.display = false === item.showCancel ? ('none') : ('inline-block');
  el.classList.remove('hidden');
  v0.style.transform = ('translate(-50%, -50%)');
  v0.style.left = '50%';
  v0.style.top = '50%';
  item.showInput ? (setTimeout(() => {
        v2.focus();
    v2.select();
}, 0)) : setTimeout(() => v3.focus(), 0);
  // [PATCH-A5] 快速录入模式的清理钩子：关闭弹窗时统一解绑（由下面的关闭流程调用）
  let _0x_wpfQuickCleanup = null;
    const fn = v9 => {
            if (!wpModalState.isOpen)
        return;
            wpModalState.isOpen = false;
      el.classList.add(('hidden'));
      document.removeEventListener('keydown', v8);
      _0x_wpfQuickCleanup && _0x_wpfQuickCleanup();
      _0x_wpfQuickCleanup = null;
      const v10 = item.showInput ? v2.value : null;
            wpModalState.resolve && wpModalState.resolve({
        ok: v9,
        value: v10
      });
      wpModalState.resolve = null;
      wpModalState.options = null;
    };
  const v6 = () => fn(true);
  const v7 = () => fn(false);
  const v8 = ev => {
            wpModalState.isOpen && ((('Escape') === ev.key) && false !== item.showCancel ? (ev.preventDefault(), v7()) : ('Enter') === ev.key && (ev.preventDefault(), (v6())));
    };
  // [PATCH-A5] 快速录入模式（quickCommit）：位值/矢量值输入用的输入流。
  // 交互约定（沿用 v0.3.0 R6~R8，历史实现在外部模块里直接操作 #wp-modal DOM）：
  //   · 隐藏自带的「确定/取消」按钮，保留右上角 X —— 输入完回车或点别处即写入
  //   · 输入框失焦：有值写入、无值取消
  //   · 点遮罩 / 点 X：取消（mousedown 先于 blur，用标志位避免误提交）
  //   · invalid：以红框态打开，首次键入即清除（非法输入重开时用）
  if (item.quickCommit && item.showInput) {
    let _0x_wpfSuppressBlur = false;
        const _0x_wpfMarkSuppress = () => {
      _0x_wpfSuppressBlur = true;
    };
    const _0x_wpfClearError = () => {
      v2.classList.remove('wp-modal-error');
    };
    const _0x_wpfOnBlur = () => {
      if (_0x_wpfSuppressBlur) {
        _0x_wpfSuppressBlur = false;
        return;
      }
      const _0x_wpfText = String(v2.value || '').trim();
      v2.value = _0x_wpfText;
      _0x_wpfText ? v6() : v7();
    };
        v3.style.display = 'none';
    v4.style.display = 'none';
    v2['classList'][item.invalid ? 'add' : 'remove']('wp-modal-error');
    // [PATCH-A5/R6] 实时预览钩子：options.onPreview(当前输入串) 随每次键入触发
    //   （先清红框）。供 editor/value-input.js 在写值前预览目标范围的新值；
    //   预览副作用（撤销快照/恢复）由调用方自理，这里只负责转发输入。
    const _0x_wpfOnInput = () => {
      _0x_wpfClearError();
      try {
        const _0x_wpfOpts = wpModalState.options;
        _0x_wpfOpts && typeof _0x_wpfOpts.onPreview === 'function'
          && _0x_wpfOpts.onPreview(String(v2.value || ''));
      } catch (e) { /* 预览失败不阻断输入 */ }
    };
        el.addEventListener('mousedown', _0x_wpfMarkSuppress, true);
    v5.addEventListener('mousedown', _0x_wpfMarkSuppress, true);
        v2.addEventListener('blur', _0x_wpfOnBlur);
    v2.addEventListener('input', _0x_wpfOnInput);
    _0x_wpfQuickCleanup = () => {
            el.removeEventListener('mousedown', _0x_wpfMarkSuppress, true);
      v5.removeEventListener('mousedown', _0x_wpfMarkSuppress, true);
            v2.removeEventListener('blur', _0x_wpfOnBlur);
      v2.removeEventListener('input', _0x_wpfOnInput);
            v3.style.display = '';
      v4.style.display = '';
    };
  }
  return v3.onclick = v6, v4.onclick = v7, v5.onclick = v7, el.onclick = ev => {
        ev.target === el && false !== item.showCancel && v7();
  }, document.addEventListener('keydown', v8), val.onmousedown = ev => {
        if (!wpModalState.isOpen)
      return;
    wpModalState.dragActive = true;
    const v9 = v0.getBoundingClientRect();
        wpModalState.dragOffsetX = (ev.clientX - v9.left);
    wpModalState.dragOffsetY = ev.clientY - v9.top;
    v0.style.transform = ('none');
    v0.style.left = v9.left + 'px';
    v0.style.top = v9.top + 'px';
  }, document.onmousemove = ev => {
        if (!wpModalState.dragActive || !wpModalState.isOpen)
      return;
        const v9 = ev.clientX - wpModalState.dragOffsetX;
    const v10 = (ev.clientY - wpModalState.dragOffsetY);
        v0.style.left = Math.max(0, v9) + 'px';
    v0.style.top = Math.max(0, v10) + 'px';
  }, document.onmouseup = () => {
        wpModalState.dragActive = false;
  }, new Promise(v9 => {
        wpModalState.resolve = v9;
  });
}
function wpPrompt(item, val = '', tmp = 'Input') {
  return (openWpModal({
    title: tmp,
    message: item,
    showInput: true,
    defaultValue: val,
    showCancel: true,
    okText: 'OK',
    cancelText: ('Cancel')
})).then(cur => cur.ok ? cur.value : null);
}
// [PATCH-A5] 快速录入弹窗（位值 / 矢量值等高频输入）：
// 回车或失焦即写入、无输入失焦即取消、Esc 取消；隐藏自带确定/取消、保留右上角 X。
// 参数：message、defaultValue、title、invalid（是否以「非法输入」红框态打开）。
function wpQuickPrompt(item, val = '', tmp = 'Input', v0 = false, _0x_wpfOnPreview = null) {
  return openWpModal({
      title: tmp,
      message: item,
      showInput: true,
      defaultValue: val,
      showCancel: true,
      okText: 'OK',
      cancelText: 'Cancel',
      quickCommit: true,
      invalid: !!v0,
      onPreview: typeof _0x_wpfOnPreview === 'function' ? _0x_wpfOnPreview : null
    }).then(cur => cur.ok ? String(cur.value ?? '').trim() : null);
}
function wpConfirm(item, val = 'Confirm') {
  return (openWpModal({
    title: val,
    message: item,
    showInput: false,
    showCancel: true,
    okText: 'OK',
    cancelText: ('Cancel')
})).then(tmp => tmp.ok);
}
function wpAlert(item, val = 'Notice') {
  return (openWpModal({
    title: val,
    message: item,
    showInput: false,
    showCancel: false,
    okText: 'OK'
})).then(() => true);
}
function showAboutPopup() {
  const item = document.querySelector('.wp-about-overlay');
  item && item.remove();
  const el = document.createElement(('div'));
  el.className = ('wp-about-overlay');
  const val = document.createElement(('div'));
  val.className = ('wp-about-popup');
  const tmp = document.createElement('button');
    tmp.className = ('wp-about-close');
  tmp.innerHTML = '&times;';
  tmp.onclick = () => el.remove();
  const v0 = document.createElement('div');
    v0.className = 'wp-about-header';
  v0.innerHTML = '<span class="wp-about-logo">\uD83C\uDF0A</span> WavePaint Creator';
  const v1 = document.createElement(('div'));
  v1.className = ('wp-about-content');
  const v2 = document.createElement(('div'));
  v2.className = 'wp-about-left';
  const v3 = document.createElement(('div'));
    v3.className = ('wp-about-creator');
  v3.innerHTML = '\n        <h2 class="wp-about-name">Mariano Olmos Martín</h2>\n        <p class="wp-about-location">\uD83C\uDDEA\uD83C\uDDF8 Spain</p>\n    ';
  const v4 = document.createElement('div');
    v4.className = 'wp-about-description';
  v4.innerHTML = ('\n        <p>I created <strong>WavePaint</strong> as a free tool for the \n        <strong>FPGA, ASIC, and digital design community</strong>.</p>\n        <p>My goal is to help hardware engineers, students, and enthusiasts easily create \n        beautiful timing diagrams and waveforms for documentation, presentations, and learning.</p>\n        <p>Whether you\'re designing your next chip or teaching digital electronics, \n        I hope WavePaint makes your work a little easier! \uD83D\uDE80</p>\n    ');
  v2.appendChild(v3);
  v2.appendChild(v4);
  const v5 = document.createElement('div');
  v5.className = 'wp-about-photo-container';
  const v6 = document.createElement('img');
    v6.className = 'wp-about-photo';
  v6.src = 'img/mariano.webp?v=2';
  v6.alt = 'Mariano Olmos Martín';
  v5.appendChild(v6);
  v1.appendChild(v5);
  v1.appendChild(v2);
  const v7 = document.createElement('div');
    v7.className = 'wp-about-footer';
  v7.innerHTML = '\n        <a href="https://github.com/lodigic/WavePaint" target="_blank" rel="noopener noreferrer" class="wp-about-link">\n            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>\n            GitHub\n        </a>\n        <a href="terms.html" target="_blank" rel="noopener noreferrer" class="wp-about-link">\n            Terms\n        </a>\n        <a href="privacy.html" target="_blank" rel="noopener noreferrer" class="wp-about-link">\n            Privacy\n        </a>\n        <a href="cookie-policy.html" target="_blank" rel="noopener noreferrer" class="wp-about-link">\n            Cookies\n        </a>\n        <a href="https://ko-fi.com/wavepaint" target="_blank" rel="noopener noreferrer" class="wp-about-link">\n            \u2615 Buy me a coffee\n        </a>\n    ';
  val.appendChild(tmp);
  val.appendChild(v0);
  val.appendChild(v1);
  val.appendChild(v7);
  el.appendChild(val);
  el.onclick = ev => {
        (ev.target === el) && el.remove();
  };
  const fn = v8 => {
        (('Escape') === v8.key) && (el.remove(), document.removeEventListener('keydown', fn));
  };
    document.addEventListener('keydown', fn);
  document.body.appendChild(el);
}
function showContactPopup() {
  const item = document.querySelector(('.wp-contact-overlay'));
  item && item.remove();
  const el = document.createElement(('div'));
  el.className = ('wp-contact-overlay');
  const val = document.createElement(('div'));
  val.className = 'wp-contact-popup';
  const tmp = document.createElement(('button'));
    tmp.className = 'wp-contact-close';
  tmp.innerHTML = ('&times;');
  tmp.onclick = () => el.remove();
  const v0 = document.createElement('div');
    v0.className = 'wp-contact-header';
  v0.innerHTML = '<span class="wp-contact-icon">\u2709️</span> Contact Us';
  const v1 = document.createElement(('div'));
    v1.className = ('wp-contact-content');
  v1.innerHTML = '\n        <p class="wp-contact-intro">Need help with WavePaint or interested in sponsoring the project?</p>\n        <p class="wp-contact-message">Feel free to reach out to us. We\'d love to hear from you!</p>\n        <div class="wp-contact-email-box">\n            <span class="wp-contact-email-label">Email:</span>\n            <a href="mailto:contact@wavepaint.net" class="wp-contact-email">contact@wavepaint.net</a>\n        </div>\n        <p class="wp-contact-note">We typically respond within 24-48 hours.</p>\n    ';
  const v2 = document.createElement('div');
  v2.className = 'wp-contact-footer';
  const v3 = document.createElement('button');
    v3.className = ('wp-contact-btn wp-contact-btn-secondary');
  v3.innerHTML = 'Copy Email';
  v3.onclick = async () => {
        try {
            await navigator.clipboard.writeText(('contact@wavepaint.net'));
      v3.innerHTML = '\u2713 Copied!';
      setTimeout(() => {
                v3.innerHTML = 'Copy Email';
      }, 2000);
    } catch (v4) {
    }
  };
  const anchor = document.createElement('a');
    anchor.href = 'mailto:contact@wavepaint.net';
  anchor.className = ('wp-contact-btn wp-contact-btn-primary');
  anchor.innerHTML = 'Send Email';
  v2.appendChild(v3);
  v2.appendChild(anchor);
  val.appendChild(tmp);
  val.appendChild(v0);
  val.appendChild(v1);
  val.appendChild(v2);
  el.appendChild(val);
  el.onclick = ev => {
        ev.target === el && el.remove();
  };
  const fn = v4 => {
        (('Escape') === v4.key) && (el.remove(), document.removeEventListener(('keydown'), fn));
  };
    document.addEventListener(('keydown'), fn);
  document.body.appendChild(el);
}
function showToast(item, val = 2000) {
  const tmp = document.getElementById('wp-toast');
  tmp && tmp.remove();
  const el = document.createElement(('div'));
    el.id = ('wp-toast');
  el.textContent = item;
  el.style.cssText = '\n        position: fixed;\n        bottom: 20px;\n        left: 50%;\n        transform: translateX(-50%);\n        background: var(--menu-bg, #333);\n        color: var(--text-color, #fff);\n        padding: 12px 24px;\n        border-radius: 8px;\n        box-shadow: 0 4px 12px rgba(0,0,0,0.3);\n        z-index: 10000;\n        font-size: 14px;\n        opacity: 0;\n        transition: opacity 0.2s ease-in-out;\n        pointer-events: none;\n    ';
  document.body.appendChild(el);
  requestAnimationFrame(() => {
        el.style.opacity = '1';
  });
  (setTimeout(() => {
        el.style.opacity = '0';
    setTimeout(() => {
        el.parentNode && el.remove();
    }, 200);
}, val));
}
function getArrowStyleSVG(item, val = false) {
  const tmp = (getComputedStyle(document.body)).getPropertyValue(('--accent-color')) || ('#1ecb7a');
  const num = val ? '#fff' : tmp.trim();
  const v0 = 10;
  const v1 = 50;
  const v2 = 16;
  const fn = (v5, v6, v7 = 'right') => 'right' === v7 ? '<polygon points="' + v5 + ',' + v6 + ' ' + (v5 - (7)) + ',' + (v6 - 5.384615384615384) + ' ' + (v5 - (7)) + ',' + (v6 + 5.384615384615384) + '" fill="' + num + '"/>' : '<polygon points="' + v5 + ',' + v6 + ' ' + (v5 + (7)) + ',' + (v6 - 5.384615384615384) + ' ' + (v5 + (7)) + ',' + (v6 + 5.384615384615384) + '" fill="' + num + '"/>';
  const v3 = (v5, v6) => '<circle cx="' + v5 + '" cy="' + v6 + ('" r="3" fill="') + num + '"/>';
    let n = '';
  let str = '';
  let v4 = (v3(v0, 16));
  switch (item) {
  case '~':
    n = '<path d="M10,16 C27,6 33,26 50,16" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = v3(v1, v2);
    break;
  case '~>':
    n = '<path d="M10,16 C27,6 33,26 44,16" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = fn(v1, v2, ('right'));
    break;
  case '<~>':
    n = '<path d="M16,16 C27,6 33,26 44,16" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = (fn(v0, 16, ('left')) + (fn(v1, v2, 'right'))), v4 = '';
    break;
  case '-~>':
    n = '<path d="M10,16 L24,16 C32,16 33,24 44,16" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = fn(v1, v2, 'right');
    break;
  case ('~->'):
    n = '<path d="M10,16 C27,8 28,16 36,16 L44,16" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = fn(v1, v2, 'right');
    break;
  case '-':
    n = '<line x1="10" y1="16" x2="50" y2="16" stroke="' + num + ('" stroke-width="3"/>'), str = (v3(v1, v2));
    break;
  case '->':
  default:
    n = '<line x1="10" y1="16" x2="44" y2="16" stroke="' + num + ('" stroke-width="3"/>'), str = fn(v1, v2, ('right'));
    break;
  case ('<->'):
    n = '<line x1="16" y1="16" x2="44" y2="16" stroke="' + num + ('" stroke-width="3"/>'), str = (fn(v0, 16, ('left'))) + fn(v1, v2, 'right'), v4 = '';
    break;
  case '-|':
    n = '<path d="M10,16 L50,16 L50,24" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = (v3(v1, 24));
    break;
  case ('-|>'):
    n = '<path d="M10,11 L50,11 L50,21" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = '<polygon points="50,26 46,20 54,20" fill="' + num + '"/>', v4 = (v3(v0, 11));
    break;
  case '<-|>':
    n = '<path d="M16,11 L50,11 L50,21" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = fn(v0, 11, 'left') + ('<polygon points="50,26 46,20 54,20" fill="' + num + '"/>'), v4 = '';
    break;
  case '|-':
    n = '<path d="M10,8 L10,16 L50,16" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = v3(v1, v2), v4 = (v3(v0, 8));
    break;
  case ('|->'):
    n = '<path d="M10,8 L10,16 L44,16" stroke="' + num + ('" fill="none" stroke-width="3"/>'), str = fn(v1, v2, ('right')), v4 = (v3(v0, 8));
    break;
  case '-|-':
    const v5 = 30;
    n = '<path d="M10,10 L' + v5 + ',10 L' + v5 + (',22 L50,22" stroke="') + num + ('" fill="none" stroke-width="3"/>'), str = v3(v1, 22), v4 = (v3(v0, 10));
    break;
  case '-|->':
    const v6 = 30;
    n = '<path d="M10,10 L' + v6 + ',10 L' + v6 + (',22 L44,22" stroke="') + num + ('" fill="none" stroke-width="3"/>'), str = fn(v1, 22, ('right')), v4 = (v3(v0, 10));
    break;
  case ('<-|->'):
    const v7 = 30;
    n = '<path d="M16,10 L' + v7 + ',10 L' + v7 + (',22 L44,22" stroke="') + num + ('" fill="none" stroke-width="3"/>'), str = ((fn(v0, 10, ('left'))) + fn(v1, 22, ('right'))), v4 = '';
  }
  return '<svg width="60" height="32" viewBox="0 0 60 32" xmlns="http://www.w3.org/2000/svg">\n        ' + v4 + n + str + ('\n    </svg>');
}
function showStylePickerDialog(arr, num, item = 'Select Style') {
  return new Promise(val => {
    const tmp = document.querySelector('.style-picker-overlay');
    tmp && tmp.remove();
    const el = document.createElement('div');
    el.className = ('style-picker-overlay theme-dialog-overlay');
    const v0 = document.createElement(('div'));
        v0.className = 'style-picker-dialog theme-dialog';
    v0.style.minWidth = ('380px');
    v0.style.maxWidth = '420px';
    const v1 = document.createElement(('div'));
    v1.className = ('theme-dialog-header');
    const v2 = document.createElement('span');
        v2.className = ('theme-dialog-title');
    v2.textContent = item;
    const v3 = document.createElement(('button'));
        v3.className = 'theme-dialog-close';
    v3.innerHTML = '\u2715';
    v3.setAttribute('aria-label', 'Close');
    v3.addEventListener(('click'), () => {
            v11();
      val(null);
    });
    v1.appendChild(v2);
    v1.appendChild(v3);
    v0.appendChild(v1);
    const v4 = document.createElement(('div'));
    v4.className = 'theme-dialog-body';
    const v5 = document.createElement(('div'));
        v5.className = ('theme-dialog-options');
    v5.style.cssText = ('\n            display: grid;\n            grid-template-columns: repeat(3, 1fr);\n            gap: 10px;\n            justify-content: center;\n        ');
    let n = num;
        const v6 = [];
    const obj = {
        '~': 'Spline',
        '~>': ('Spline \u2192'),
        '<~>': 'Spline \u2194',
        '-': ('Straight'),
        '->': ('Straight \u2192'),
        '<->': 'Straight \u2194',
        '-|': ('L-Shape'),
        '-|>': 'L-Shape \u2192',
        '<-|>': 'L-Shape \u2194',
        '|-': 'Corner',
        '|->': 'Corner \u2192',
        '-|-': ('Z-Shape'),
        '-|->': 'Z-Shape \u2192',
        '<-|->': 'Z-Shape \u2194'
      };
        arr.forEach(v12 => {
            const v13 = document.createElement('div');
      const v14 = (v12.value === num);
            v13.className = 'theme-option arrow-style-option ' + (v14 ? ('selected') : '');
      v13.dataset.value = v12.value;
      v13.style.cssText = ('\n                padding: 10px 6px 8px 6px;\n                min-width: 100px;\n                gap: 6px;\n            ');
      const v15 = document.createElement(('div'));
            v15.className = 'arrow-style-icon';
      v15.style.cssText = '\n                width: 60px;\n                height: 32px;\n                display: flex;\n                align-items: center;\n                justify-content: center;\n            ';
      v15.innerHTML = getArrowStyleSVG(v12.value, v14);
      const v16 = document.createElement('span');
            v16.className = 'theme-option-label';
      v16.textContent = obj[v12.value] || v12.value;
      v16.style.fontSize = ('11px');
      const v17 = document.createElement(('div'));
            v17.className = ('theme-option-check');
      v17.innerHTML = '\u2713';
      v13.appendChild(v15);
      v13.appendChild(v16);
      v13.appendChild(v17);
      v13.addEventListener('click', () => {
                                n = v12.value;
                v6.forEach(v18 => {
          const v19 = v18.dataset.value === n;
                    v18.classList.toggle(('selected'), v19);
          v18.querySelector('.arrow-style-icon').innerHTML = getArrowStyleSVG(v18.dataset.value, v19);
        });
      });
      v13.addEventListener(('dblclick'), () => {
                                (v11());
                val(v12.value);
      });
      v6.push(v13);
      v5.appendChild(v13);
    });
    v4.appendChild(v5);
    v0.appendChild(v4);
    const v7 = document.createElement(('div'));
    v7.className = ('theme-dialog-footer');
    const v8 = document.createElement(('button'));
        v8.className = 'wp-modal-btn';
    v8.textContent = ('Cancel');
    v8.addEventListener(('click'), () => {
                        (v11());
            (val(null));
    });
    const v9 = document.createElement(('button'));
    function v10(v12) {
            'Escape' === v12.key ? ((v11()), val(null)) : ('Enter') === v12.key && (v11(), (val(n)));
    }
    function v11() {
                        document.removeEventListener(('keydown'), v10);
            el.parentNode && el.remove();
    }
        v9.className = ('wp-modal-btn primary');
    v9.textContent = 'Apply';
    v9.addEventListener(('click'), () => {
                        (v11());
            (val(n));
    });
    v7.appendChild(v8);
    v7.appendChild(v9);
    v0.appendChild(v7);
    el.appendChild(v0);
    document.body.appendChild(el);
    el.addEventListener(('click'), ev => {
            ev.target === el && (v11(), val(null));
    });
    document.addEventListener(('keydown'), v10);
  });
}
function showArrowContextMenu(num, n, item) {
  const val = document.querySelector(('.context-menu'));
  val && val.remove();
  const tmp = document_wave.arrowList().find(v2 => v2.id === item);
  if (!tmp)
    return;
  'function' == typeof selectObject && (void 0 !== SelectableType) && (selectObject(SelectableType.Arrow, item), (drawWaveform()));
  const el = document.createElement(('div'));
  function v0(v2, v3) {
    const v4 = document.createElement(('div'));
    return v4.textContent = v2, v4.style.padding = ('8px 12px'), v4.style.cursor = ('pointer'), v4.style.color = ('var(--text-color)'), v4.addEventListener(('mouseenter'), () => {
            v4.style.background = ('var(--accent-color)');
    }), v4.addEventListener('mouseleave', () => {
            v4.style.background = 'transparent';
    }), v4.addEventListener('click', () => {
                        (v3());
            document.body.removeChild(el);
    }), el.appendChild(v4), v4;
  }
  function v1(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener(('click'), v1), 'function' == typeof clearObjectSelection && (clearObjectSelection(), drawWaveform()));
  }
    el.className = ('context-menu');
  el.style.position = ('fixed');
  el.style.left = num + 'px';
  el.style.top = n + 'px';
  el.style.background = ('var(--bg-color)');
  el.style.border = '1px solid var(--border-color)';
  el.style.borderRadius = ('4px');
  el.style.boxShadow = ('0 2px 8px rgba(0,0,0,0.3)');
  el.style.zIndex = '5500';
  el.style.minWidth = '150px';
  v0(('Change color...'), async () => {
        const v2 = getComputedStyle(document.body).getPropertyValue('--arrow-color').trim() || ('#ff6b00');
    const v3 = tmp.color || v2;
    const v4 = await (openColorPicker(v3, null, 'Arrow Color'));
    v4 && (document_wave.setArrowColorById(item, v4), drawWaveform());
  });
  (v0('Change style...', async () => {
        const v2 = tmp.style || '~>';
    const v3 = await showStylePickerDialog([
            {
                value: '~',
                label: 'Spline (~)'
            },
            {
                value: '~>',
                label: 'Spline \u2192 (~>)'
            },
            {
                value: ('<~>'),
                label: ('Spline \u2194 (<~>)')
            },
            {
                value: '-',
                label: 'Straight (-)'
            },
            {
                value: '->',
                label: ('Straight \u2192 (->)')
            },
            {
                value: '<->',
                label: 'Straight \u2194 (<->)'
            }
        ], v2, ('Arrow Style'));
    v3 && (document_wave.setArrowStyleById(item, v3), drawWaveform());
}));
  v0('Delete arrow', () => {
                document_wave.subArrowById(item);
        (drawWaveform());
  });
  document.body.appendChild(el);
  setTimeout(() => {
        document.addEventListener(('click'), v1);
  }, 10);
}
function showMarkerContextMenu(num, n, item) {
  const val = document.querySelector(('.context-menu'));
    val && val.remove();
  (('function') == typeof selectObject) && void (0) !== SelectableType && ((selectObject(SelectableType.Marker, item.id)), (drawWaveform()));
  const el = document.createElement('div');
  function tmp(v1, v2) {
    const v3 = document.createElement('div');
    return v3.textContent = v1, v3.style.padding = ('8px 12px'), v3.style.cursor = ('pointer'), v3.style.color = ('var(--text-color)'), v3.addEventListener(('mouseenter'), () => {
            v3.style.background = ('var(--accent-color)');
    }), v3.addEventListener('mouseleave', () => {
            v3.style.background = ('transparent');
    }), v3.addEventListener(('click'), () => {
                        v2();
            el.parentNode && document.body.removeChild(el);
    }), el.appendChild(v3), v3;
  }
  function v0(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener('click', v0), ('function' == typeof clearObjectSelection) && ((clearObjectSelection()), drawWaveform()));
  }
    el.className = ('context-menu');
  el.style.position = 'fixed';
  el.style.left = (num + 'px');
  el.style.top = n + 'px';
  el.style.background = ('var(--bg-color)');
  el.style.border = '1px solid var(--border-color)';
  el.style.borderRadius = '4px';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.zIndex = '5500';
  el.style.minWidth = '150px';
  (tmp('Change color...', async () => {
        const v1 = item.color || ('#00a0ff');
    const v2 = await openColorPicker(v1, null, ('Marker Color'));
    v2 && (document_wave.setMarkerColorById(item.id, v2), (drawWaveform()));
}));
  tmp(('Delete marker'), () => {
                document_wave.subMarkerById(item.id);
        drawWaveform();
  });
  document.body.appendChild(el);
  setTimeout(() => {
        document.addEventListener(('click'), v0);
  }, 10);
}
function showTimeJumpContextMenu(num, n, item) {
  const val = document.querySelector(('.context-menu'));
    val && val.remove();
  'function' == typeof selectObject && void (0) !== SelectableType && (selectObject(SelectableType.TimeJump, item.id), drawWaveform());
  const el = document.createElement('div');
  function tmp(v1, v2) {
    const v3 = document.createElement('div');
    return v3.textContent = v1, v3.style.padding = '8px 12px', v3.style.cursor = ('pointer'), v3.style.color = 'var(--text-color)', v3.addEventListener(('mouseenter'), () => {
            v3.style.background = 'var(--accent-color)';
    }), v3.addEventListener(('mouseleave'), () => {
            v3.style.background = 'transparent';
    }), v3.addEventListener('click', () => {
                        v2();
            el.parentNode && document.body.removeChild(el);
    }), el.appendChild(v3), v3;
  }
  function v0(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener(('click'), v0), 'function' == typeof clearObjectSelection && (clearObjectSelection(), (drawWaveform())));
  }
    el.className = ('context-menu');
  el.style.position = ('fixed');
  el.style.left = num + 'px';
  el.style.top = (n + 'px');
  el.style.background = 'var(--bg-color)';
  el.style.border = '1px solid var(--border-color)';
  el.style.borderRadius = ('4px');
  el.style.boxShadow = ('0 2px 8px rgba(0,0,0,0.3)');
  el.style.zIndex = '5500';
  el.style.minWidth = ('150px');
  (tmp('Change color...', async () => {
        const v1 = item.color || '#ff6b00';
    const v2 = await openColorPicker(v1, null, ('Time Jump Color'));
    v2 && (document_wave.setTimeJumpColorById(item.id, v2), (drawWaveform()));
}));
  (tmp('Delete time jump', () => {
        document_wave.subTimeJumpById(item.id);
    drawWaveform();
}));
  document.body.appendChild(el);
  setTimeout(() => {
        document.addEventListener(('click'), v0);
  }, 10);
}
function showTimeSpanContextMenu(num, n, item) {
  const val = document.querySelector('.context-menu');
    val && val.remove();
  'function' == typeof selectObject && (void 0 !== SelectableType) && ((selectObject(SelectableType.TimeSpan, item.id)), drawWaveform());
  const el = document.createElement('div');
  function tmp(v1, v2) {
    const v3 = document.createElement(('div'));
    return v3.textContent = v1, v3.style.padding = '8px 12px', v3.style.cursor = 'pointer', v3.style.color = 'var(--text-color)', v3.addEventListener('mouseenter', () => {
            v3.style.background = 'var(--accent-color)';
    }), v3.addEventListener('mouseleave', () => {
            v3.style.background = 'transparent';
    }), v3.addEventListener(('click'), () => {
                        v2();
            el.parentNode && document.body.removeChild(el);
    }), el.appendChild(v3), v3;
  }
  function v0(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener(('click'), v0), 'function' == typeof clearObjectSelection && (clearObjectSelection(), (drawWaveform())));
  }
    el.className = 'context-menu';
  el.style.position = ('fixed');
  el.style.left = num + 'px';
  el.style.top = (n + 'px');
  el.style.background = 'var(--bg-color)';
  el.style.border = '1px solid var(--border-color)';
  el.style.borderRadius = '4px';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.zIndex = '5500';
  el.style.minWidth = ('150px');
  tmp('Change color...', async () => {
        const v1 = getThemeDefaultTimeSpanColor ? (getThemeDefaultTimeSpanColor()) : '#00a0ff';
    const v2 = item.color || v1;
    const v3 = await (openColorPicker(v2, null, 'Time Span Color'));
    v3 && (document_wave.setTimeSpanMarkerColor(item.id, v3), drawWaveform());
  });
  tmp('Change style...', async () => {
        const v1 = item.style || '-|';
    const v2 = await showStylePickerDialog([
        {
          value: '-|',
          label: 'L-Shape \u2310 (-|)'
        },
        {
          value: '|-',
          label: 'Corner \u2514 (|-)'
        },
        {
          value: ('-|-'),
          label: 'Z-Shape \u2310\u2514 (-|-)'
        }
      ], v1, ('Time Span Style'));
    v2 && (document_wave.setTimeSpanMarkerStyle(item.id, v2), (drawWaveform()));
  });
  tmp(('Delete time span'), () => {
                document_wave.subTimeSpanMarkerById(item.id);
        (drawWaveform());
  });
  document.body.appendChild(el);
  setTimeout(() => {
        document.addEventListener('click', v0);
  }, 10);
}
function findVectorSegmentBounds(sig, num) {
  if (!sig || sig.type !== SignalType.Vector)
    return null;
  if ((num < 0) || num >= sig.values.length)
    return null;
  const n = sig['values'][num];
  if (-1 === n)
    return null;
    const item = sig['labels'][num] ? sig['labels'][num] : '';
  const val = item.toLowerCase().trim();
  if ('l' === val || ('h' === val) || 'z' === val)
    return null;
  let count = num;
  for (; (count > 0) && (sig['values'][(count - 1)] === n) && sig['labels'][(count - 1)] === item;)
    count--;
  let v0 = num;
  for (; v0 < sig.values.length - (1) && sig['values'][(v0 + 1)] === n && sig['labels'][(v0 + 1)] === item;)
    v0++;
  return {
    start: count,
    end: v0
  };
}
function showSegmentPropertiesMenu(num, n, item, val, tmp) {
  document.querySelectorAll(('.context-menu')).forEach(v3 => v3.remove());
    const v0 = document_wave.signalList()[item];
  const el = document.createElement('div');
  function v1(v3, v4) {
    const v5 = document.createElement('div');
    return v5.textContent = v3, v5.style.padding = ('8px 12px'), v5.style.cursor = 'pointer', v5.style.color = 'var(--text-color)', v5.addEventListener('mouseenter', () => {
            v5.style.background = 'var(--accent-color)';
    }), v5.addEventListener('mouseleave', () => {
            v5.style.background = ('transparent');
    }), v5.addEventListener(('click'), () => {
                        (v4());
            el.parentNode && document.body.removeChild(el);
    }), el.appendChild(v5), v5;
  }
  function v2(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener(('click'), v2));
  }
    el.className = ('context-menu');
  el.style.position = ('fixed');
  el.style.left = (num + 'px');
  el.style.top = n + 'px';
  el.style.background = 'var(--bg-color)';
  el.style.border = ('1px solid var(--border-color)');
  el.style.borderRadius = ('4px');
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.zIndex = ('5500');
  el.style.minWidth = '180px';
  v1(('Edit value...'), async () => {
        const v3 = v0['labels'][val] || '';
    const v4 = await wpPrompt('Segment value:', v3, ('Edit Segment Value'));
    if (null !== v4) {
      document_wave.pushUndoSnapshot();
      for (let count = tmp.start; (count <= tmp.end); count++)
        (count >= 0) && (count < v0.labels.length) && (v0['labels'][count] = v4);
      document_wave.dataChanged();
    }
  });
  v1(('Segment properties...'), () => {
    showSegmentPropertiesDialog(item, val, tmp);
  });
  document.body.appendChild(el);
  setTimeout(() => {
        document.addEventListener('click', v2);
  }, 10);
}
function showSegmentPropertiesDialog(item, num, val) {
  const tmp = document_wave.signalList()[item];
  const v0 = tmp.segmentStyles && (num < tmp.segmentStyles.length) ? tmp['segmentStyles'][num] : {
      color: null,
      hatched: false,
      fill: null
    };
  const n = tmp.waveDromColorCodes && num < tmp.waveDromColorCodes.length ? tmp['waveDromColorCodes'][num] : null;
  const v1 = v0 && v0.color;
  const v2 = v0 && v0.hatched;
  const v3 = v0 && v0.fill;
  const v4 = tmp.color || getThemeDefaultSignalColor();
  const v5 = v1 ? v0.color : v4;
  const v6 = v3 ? v0.fill : ('#4CAF50');
  const v7 = document.body.classList.contains(('dark'));
  const v8 = v7 ? {
      modalBg: '#252528',
      headerBg: '#1a1a1c',
      sectionBg: ('#1e1e20'),
      sectionBorder: ('#3a3a3f'),
      inputBg: ('#2a2a2e'),
      inputBorder: ('#444449'),
      text: '#e8e8ec',
      textMuted: ('#9999a5'),
      accent: ('#7ee856'),
      accentHover: '#6bd648',
      accentGradient: '#4CAF50',
      btnCancel: '#3a3a3f',
      btnCancelHover: ('#4a4a4f')
    } : {
      modalBg: ('#ffffff'),
      headerBg: '#f5f7f5',
      sectionBg: '#f8faf8',
      sectionBorder: '#d8e4d8',
      inputBg: '#ffffff',
      inputBorder: '#c0d0c0',
      text: '#1a1a1f',
      textMuted: ('#5a6a5a'),
      accent: '#4CAF50',
      accentHover: '#3d9141',
      accentGradient: '#66bb6a',
      btnCancel: ('#e0e0e0'),
      btnCancelHover: '#d0d0d0'
    };
  const el = document.createElement('div');
  el.style.cssText = '\n        position: fixed; inset: 0; \n        background: rgba(0, 0, 0, ' + (v7 ? ('0.6') : '0.4') + ('); \n        display: flex; align-items: center; justify-content: center; \n        z-index: 10000;\n    ');
  const v9 = document.createElement('div');
    v9.style.cssText = '\n        background: ' + v8.modalBg + (';\n        border: 1px solid ') + v8.sectionBorder + (';\n        border-radius: 12px;\n        box-shadow: 0 20px 60px rgba(0, 0, 0, ') + (v7 ? ('0.5') : '0.2') + ('), 0 0 0 1px rgba(255,255,255,') + (v7 ? ('0.05') : '0') + (');\n        min-width: 380px;\n        max-width: 420px;\n        overflow: hidden;\n    ');
  v9.innerHTML = '\n        <!-- Header -->\n        <div style="\n            padding: 14px 18px;\n            background: ' + v8.headerBg + (';\n            border-bottom: 1px solid ') + v8.sectionBorder + (';\n            display: flex;\n            align-items: center;\n            justify-content: space-between;\n        ">\n            <div style="display: flex; align-items: center; gap: 10px;">\n                <div style="\n                    width: 28px; height: 28px;\n                    background: linear-gradient(135deg, ') + v8.accent + ', ' + v8.accentGradient + (');\n                    border-radius: 6px;\n                    display: flex; align-items: center; justify-content: center;\n                ">\n                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">\n                        <rect x="3" y="8" width="18" height="8" rx="1"/>\n                    </svg>\n                </div>\n                <span style="font-size: 14px; font-weight: 600; color: ') + v8.text + (';">Segment Properties</span>\n            </div>\n            <button id="seg-close-btn" style="\n                border: none; background: transparent; \n                color: ') + v8.textMuted + ('; cursor: pointer; \n                font-size: 18px; line-height: 1; padding: 4px;\n                border-radius: 4px;\n                transition: all 0.15s;\n            " onmouseover="this.style.color=\'') + v8.text + ('\';this.style.background=\'') + v8.sectionBg + ('\'" \n               onmouseout="this.style.color=\'') + v8.textMuted + ('\';this.style.background=\'transparent\'">\u2715</button>\n        </div>\n        \n        <!-- Content -->\n        <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">\n            <!-- Info text -->\n            <div style="\n                font-size: 12px; \n                color: ') + v8.textMuted + ('; \n                line-height: 1.4;\n            ">\n                Customize the appearance of this segment (samples ') + val.start + ' to ' + val.end + (').\n            </div>\n            \n            <!-- Custom Color Section -->\n            <div style="\n                background: ') + v8.sectionBg + (';\n                border: 1px solid ') + v8.sectionBorder + (';\n                border-radius: 8px;\n                padding: 14px;\n            ">\n                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ') + (v1 ? ('12px') : '0') + (';">\n                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: ') + v8.text + (';">\n                        <input type="checkbox" id="seg-use-custom-color" ') + (v1 ? ('checked') : '') + (' style="\n                            width: 16px; height: 16px; cursor: pointer;\n                            accent-color: ') + v8.accent + (';\n                        ">\n                        Use custom border color\n                    </label>\n                </div>\n                <div id="seg-color-row" style="display: ') + (v1 ? 'flex' : ('none')) + ('; align-items: center; gap: 12px;">\n                    <input type="color" id="seg-color" value="') + v5 + ('" style="\n                        width: 40px; height: 28px; \n                        border: 1px solid ') + v8.inputBorder + ('; \n                        border-radius: 4px; \n                        cursor: pointer;\n                        background: ') + v8.inputBg + (';\n                    ">\n                    <span id="seg-color-name" style="font-family: monospace; font-size: 12px; color: ') + v8.textMuted + ';">' + v5 + ('</span>\n                </div>\n            </div>\n            \n            <!-- Hatching Section -->\n            <div style="\n                background: ') + v8.sectionBg + (';\n                border: 1px solid ') + v8.sectionBorder + (';\n                border-radius: 8px;\n                padding: 14px;\n            ">\n                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: ') + v8.text + (';">\n                    <input type="checkbox" id="seg-hatched" ') + (v2 ? 'checked' : '') + (' style="\n                        width: 16px; height: 16px; cursor: pointer;\n                        accent-color: ') + v8.accent + (';\n                    ">\n                    Diagonal hatching pattern\n                </label>\n            </div>\n            \n            <!-- Fill Section -->\n            <div style="\n                background: ') + v8.sectionBg + (';\n                border: 1px solid ') + v8.sectionBorder + (';\n                border-radius: 8px;\n                padding: 14px;\n            ">\n                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ') + (v3 ? ('12px') : '0') + (';">\n                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: ') + v8.text + (';">\n                        <input type="checkbox" id="seg-use-fill" ') + (v3 ? 'checked' : '') + (' style="\n                            width: 16px; height: 16px; cursor: pointer;\n                            accent-color: ') + v8.accent + (';\n                        ">\n                        Fill segment\n                    </label>\n                </div>\n                <div id="seg-fill-row" style="display: ') + (v3 ? 'flex' : 'none') + ('; flex-direction: column; gap: 12px;">\n                    <!-- WaveDrom Standard Colors -->\n                    <div style="display: flex; flex-direction: column; gap: 6px;">\n                        <span style="font-size: 11px; color: ') + v8.textMuted + ('; text-transform: uppercase; letter-spacing: 0.5px;">WaveDrom Colors</span>\n                        <div id="seg-wavedrom-colors" style="display: flex; gap: 6px; flex-wrap: wrap;">\n                            <button class="seg-wd-color" data-code="=" data-color="#ffffff" title="= Default (White)" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #ffffff; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                            <button class="seg-wd-color" data-code="3" data-color="#ffffb4" title="3 Yellow" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #ffffb4; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                            <button class="seg-wd-color" data-code="4" data-color="#ffe0b9" title="4 Orange" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #ffe0b9; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                            <button class="seg-wd-color" data-code="5" data-color="#b9e0ff" title="5 Blue" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #b9e0ff; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                            <button class="seg-wd-color" data-code="6" data-color="#ccfdfe" title="6 Cyan" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #ccfdfe; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                            <button class="seg-wd-color" data-code="7" data-color="#cdfdc5" title="7 Green" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #cdfdc5; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                            <button class="seg-wd-color" data-code="8" data-color="#f0c1fb" title="8 Pink" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #f0c1fb; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                            <button class="seg-wd-color" data-code="9" data-color="#f5c2c0" title="9 Red" style="\n                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ') + v8.inputBorder + (';\n                                background: #f5c2c0; cursor: pointer; transition: all 0.15s;\n                            "></button>\n                        </div>\n                    </div>\n                    <!-- Custom Color Picker -->\n                    <div style="display: flex; align-items: center; gap: 12px;">\n                        <span style="font-size: 11px; color: ') + v8.textMuted + ('; text-transform: uppercase; letter-spacing: 0.5px; min-width: 50px;">Custom</span>\n                        <input type="color" id="seg-fill-color" value="') + v6 + ('" style="\n                            width: 40px; height: 28px; \n                            border: 1px solid ') + v8.inputBorder + ('; \n                            border-radius: 4px; \n                            cursor: pointer;\n                            background: ') + v8.inputBg + (';\n                        ">\n                        <span id="seg-fill-color-name" style="font-family: monospace; font-size: 12px; color: ') + v8.textMuted + ';">' + v6 + ('</span>\n                    </div>\n                </div>\n            </div>\n        </div>\n        \n        <!-- Footer -->\n        <div style="\n            padding: 14px 18px;\n            background: ') + v8.headerBg + (';\n            border-top: 1px solid ') + v8.sectionBorder + (';\n            display: flex;\n            justify-content: flex-end;\n            gap: 10px;\n        ">\n            <button id="seg-cancel-btn" style="\n                padding: 8px 18px; \n                cursor: pointer; \n                background: ') + v8.btnCancel + ('; \n                color: ') + v8.text + ('; \n                border: 1px solid ') + v8.sectionBorder + ('; \n                border-radius: 6px;\n                font-size: 13px;\n                font-weight: 500;\n                transition: all 0.15s;\n            " onmouseover="this.style.background=\'') + v8.btnCancelHover + ('\'" \n               onmouseout="this.style.background=\'') + v8.btnCancel + ('\'">Cancel</button>\n            <button id="seg-ok-btn" style="\n                padding: 8px 18px; \n                cursor: pointer; \n                background: linear-gradient(135deg, ') + v8.accent + ', ' + v8.accentGradient + ('); \n                color: white; \n                border: none; \n                border-radius: 6px;\n                font-size: 13px;\n                font-weight: 500;\n                transition: all 0.15s;\n            " onmouseover="this.style.opacity=\'0.9\'" \n               onmouseout="this.style.opacity=\'1\'">Apply</button>\n        </div>\n    ');
  el.appendChild(v9);
  document.body.appendChild(el);
    const v10 = v9.querySelector(('#seg-close-btn'));
  const v11 = v9.querySelector(('#seg-use-custom-color'));
  const v12 = v9.querySelector('#seg-color-row');
  const v13 = v9.querySelector(('#seg-color'));
  const v14 = v9.querySelector('#seg-color-name');
  const v15 = v9.querySelector('#seg-hatched');
  const v16 = v9.querySelector('#seg-use-fill');
  const v17 = v9.querySelector('#seg-fill-row');
  const v18 = v9.querySelector('#seg-fill-color');
  const v19 = v9.querySelector('#seg-fill-color-name');
  const v20 = v9.querySelector('#seg-ok-btn');
  const v21 = v9.querySelector(('#seg-cancel-btn'));
    v11.addEventListener(('change'), () => {
        v12.style.display = v11.checked ? ('flex') : 'none';
  });
  v13.addEventListener('input', () => {
        v14.textContent = v13.value;
  });
  v16.addEventListener('change', () => {
        v17.style.display = v16.checked ? 'flex' : ('none');
  });
  v18.addEventListener('input', () => {
        v19.textContent = v18.value;
    v9.querySelectorAll('.seg-wd-color').forEach(v22 => {
                        v22.style.borderColor = v8.inputBorder;
            v22.style.transform = ('scale(1)');
    });
  });
  const arr = v9.querySelectorAll(('.seg-wd-color'));
  if (arr.forEach(v22 => {
            v22.addEventListener(('click'), () => {
        const v23 = v22.dataset.color;
        const v24 = v22.dataset.code;
                v18.value = v23;
        v19.textContent = v23 + (' (WaveDrom ') + v24 + ')';
        arr.forEach(v25 => {
                                        v25.style.borderColor = v8.inputBorder;
                    v25.style.transform = ('scale(1)');
        });
        v22.style.borderColor = v8.accent;
        v22.style.transform = 'scale(1.1)';
      });
      v22.addEventListener('mouseenter', () => {
                ('scale(1.1)' !== v22.style.transform) && (v22.style.transform = 'scale(1.05)');
      });
      v22.addEventListener('mouseleave', () => {
                (v22.style.borderColor !== v8.accent) && (v22.style.transform = 'scale(1)');
      });
    }), (n && v3)) {
    const v22 = v9.querySelector('.seg-wd-color[data-code="' + n + '"]');
    v22 && (v22.style.borderColor = v8.accent, v22.style.transform = ('scale(1.1)'), v19.textContent = v18.value + (' (WaveDrom ') + n + ')');
  }
  const fn = () => {
        document.body.removeChild(el);
  };
    v10.addEventListener('click', fn);
  v21.addEventListener(('click'), fn);
  el.addEventListener(('click'), ev => {
        ev.target === el && (fn());
  });
  v20.addEventListener('click', () => {
    const obj = {
        color: v11.checked ? v13.value : null,
        hatched: v15.checked,
        fill: v16.checked ? v18.value : null
      };
    let v22 = null;
    const v23 = v9.querySelector(('.seg-wd-color[style*="scale(1.1)"]'));
    if (v23 && v16.checked && (v22 = v23.dataset.code), document_wave.pushUndoSnapshot(), !tmp.segmentStyles || tmp.segmentStyles.length !== tmp.values.length) {
      const v24 = tmp.segmentStyles || [];
      tmp.segmentStyles = [];
      for (let count = 0; (count < tmp.values.length); count++)
        tmp['segmentStyles'][count] = v24[count] ? { ...v24[count] } : {
          color: null,
          hatched: false
        };
    }
    if (!tmp.waveDromColorCodes || tmp.waveDromColorCodes.length !== tmp.values.length) {
      const v24 = tmp.waveDromColorCodes || [];
      tmp.waveDromColorCodes = [];
      for (let count = 0; count < tmp.values.length; count++)
        tmp['waveDromColorCodes'][count] = v24[count] || null;
    }
    for (let count = val.start; (count <= val.end); count++)
      count >= 0 && count < tmp.segmentStyles.length && (tmp['segmentStyles'][count] = {
        color: obj.color,
        hatched: obj.hatched,
        fill: obj.fill
      }, v16.checked && v22 ? tmp['waveDromColorCodes'][count] = v22 : v16.checked || (tmp['waveDromColorCodes'][count] = null));
        fn();
    (drawWaveform());
  });
}
function showSignalGroupContextMenu(num, n, item) {
  const val = document.querySelector(('.context-menu'));
  if (val && val.remove(), !item || 0 === item.length)
    return;
  const el = document.createElement(('div'));
  function tmp(v5, v6, v7 = false) {
    const v8 = document.createElement('div');
    return v8.textContent = v5, v8.style.padding = '8px 12px', v8.style.cursor = v7 ? ('default') : ('pointer'), v8.style.color = v7 ? 'var(--text-disabled, #888)' : ('var(--text-color)'), v8.style.opacity = v7 ? '0.6' : '1', v7 || (v8.addEventListener(('mouseenter'), () => {
            v8.style.background = 'var(--accent-color)';
    }), v8.addEventListener(('mouseleave'), () => {
            v8.style.background = ('transparent');
    }), v8.addEventListener(('click'), () => {
                        (v6());
            el.parentNode && document.body.removeChild(el);
    })), el.appendChild(v8), v8;
  }
  function v0() {
    const v5 = document.createElement(('div'));
        v5.style.height = ('1px');
    v5.style.background = 'var(--border-color)';
    v5.style.margin = ('4px 0');
    el.appendChild(v5);
  }
    el.className = 'context-menu';
  el.style.position = ('fixed');
  el.style.left = (num + 'px');
  el.style.top = n + 'px';
  el.style.background = ('var(--bg-color)');
  el.style.border = ('1px solid var(--border-color)');
  el.style.borderRadius = ('4px');
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.zIndex = ('5500');
  el.style.minWidth = ('180px');
  const v1 = document_wave.signalList();
    let arr = null;
  let flag = false;
  for (const v5 of item) {
    const v6 = v1[v5];
    v6 && v6.groupName && (flag = true, arr || (arr = v6.groupName));
  }
    const v2 = arr ? GroupManager.getShortGroupName(arr) : null;
  const v3 = arr && arr.includes('/');
  function v4(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener(('click'), v4));
  }
    item.length > 1 && (flag ? (tmp('Create Subgroup in "' + v2 + '"...', async () => {
    const v5 = (prompt('Enter subgroup name:', 'Subgroup'));
    if (v5 && v5.trim()) {
        const v6 = arr + '/' + v5.trim();
                document_wave.pushUndoSnapshot();
        GroupManager.createGroup(document_wave, v6, item);
        (drawWaveform());
    }
})) : (tmp(('Create Group...'), async () => {
    const v5 = prompt('Enter group name:', 'Group');
    v5 && v5.trim() && (document_wave.pushUndoSnapshot(), GroupManager.createGroup(document_wave, v5.trim(), item), (drawWaveform()));
})));
  arr && ((item.length > 1) && (v0()), (tmp('Rename "' + v2 + '"...', async () => {
    const v5 = (prompt('Enter new name for ' + (v3 ? 'subgroup' : ('group')) + ':', v2));
    if (v5 && v5.trim()) {
        document_wave.pushUndoSnapshot();
                const v6 = GroupManager.getParentGroupName(arr);
        const v7 = v6 ? (v6 + '/') + v5.trim() : v5.trim();
                GroupManager.renameGroup(document_wave, arr, v7);
        (drawWaveform());
    }
})), v0(), tmp('Remove from "' + v2 + '"', () => {
                document_wave.pushUndoSnapshot();
        GroupManager.removeSignalsFromGroup(document_wave, item);
        drawWaveform();
  }), (tmp('Delete "' + v2 + '"', () => {
        document_wave.pushUndoSnapshot();
    GroupManager.deleteGroup(document_wave, arr);
    drawWaveform();
})));
  0 !== el.children.length && (document.body.appendChild(el), setTimeout(() => {
        document.addEventListener('click', v4);
  }, 10));
}
async function showTextAnnotationPropertiesDialog(item) {
  if (!item)
    return;
    const num = item.text || '';
  const n = item.color || ('#ffffff');
  const val = item.backgroundColor || null;
  const tmp = null !== val;
  const v0 = item.fontSize || 12;
  const v1 = item.bold || false;
  const v2 = item.vPos || 'Above';
  const el = document.createElement(('div'));
  el.style.cssText = '\n        position: fixed;\n        top: 0;\n        left: 0;\n        width: 100%;\n        height: 100%;\n        background: rgba(0,0,0,0.5);\n        z-index: 6000;\n        display: flex;\n        justify-content: center;\n        align-items: center;\n    ';
  const v3 = document.createElement(('div'));
    v3.style.cssText = '\n        background: var(--bg-color);\n        border: 1px solid var(--border-color);\n        border-radius: 8px;\n        padding: 20px;\n        min-width: 320px;\n        max-width: 400px;\n        box-shadow: 0 4px 20px rgba(0,0,0,0.4);\n    ';
  v3.innerHTML = '\n        <h3 style="margin: 0 0 16px 0; color: var(--text-color); font-size: 16px;">Edit Text Properties</h3>\n        \n        <div style="margin-bottom: 12px;">\n            <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Text:</label>\n            <input type="text" id="ta-prop-text" value="' + num.replace(/"/g, ('&quot;')) + ('" \n                   style="width: 100%; padding: 6px 8px; background: var(--input-bg); border: 1px solid var(--border-color); \n                          border-radius: 4px; color: var(--text-color); box-sizing: border-box;">\n        </div>\n        \n        <div style="margin-bottom: 12px;">\n            <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Position:</label>\n            <select id="ta-prop-vpos" style="width: 100%; padding: 6px 8px; background: var(--input-bg); \n                    border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color);">\n                <option value="Above" ') + ((('Above') === v2) ? 'selected' : '') + ('>Above</option>\n                <option value="Center" ') + ((('Center') === v2) ? ('selected') : '') + ('>Center</option>\n                <option value="Below" ') + (('Below' === v2) ? ('selected') : '') + ('>Below</option>\n            </select>\n        </div>\n        \n        <div style="display: flex; gap: 12px; margin-bottom: 12px;">\n            <div style="flex: 1;">\n                <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Font Size:</label>\n                <input type="number" id="ta-prop-fontsize" value="') + v0 + ('" min="8" max="48"\n                       style="width: 100%; padding: 6px 8px; background: var(--input-bg); border: 1px solid var(--border-color); \n                              border-radius: 4px; color: var(--text-color); box-sizing: border-box;">\n            </div>\n            <div style="flex: 1; display: flex; align-items: flex-end;">\n                <label style="display: flex; align-items: center; gap: 8px; color: var(--text-color); font-size: 13px; cursor: pointer;">\n                    <input type="checkbox" id="ta-prop-bold" ') + (v1 ? 'checked' : '') + ('>\n                    <span>Bold</span>\n                </label>\n            </div>\n        </div>\n        \n        <div style="display: flex; gap: 12px; margin-bottom: 16px;">\n            <div style="flex: 1;">\n                <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Text Color:</label>\n                <input type="color" id="ta-prop-color" value="') + n + ('" \n                       style="width: 100%; height: 32px; padding: 2px; background: var(--input-bg); \n                              border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">\n            </div>\n            <div style="flex: 1;">\n                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">\n                    <input type="checkbox" id="ta-prop-bgcolor-enabled" ') + (tmp ? ('checked') : '') + ('>\n                    <span>Background:</span>\n                </label>\n                <input type="color" id="ta-prop-bgcolor" value="') + (val || ('#333333')) + ('" \n                       style="width: 100%; height: 32px; padding: 2px; background: var(--input-bg); \n                              border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;"\n                       ') + (tmp ? '' : ('disabled')) + ('>\n            </div>\n        </div>\n        \n        <div style="display: flex; justify-content: flex-end; gap: 8px;">\n            <button id="ta-prop-cancel" style="padding: 8px 16px; background: var(--button-bg); border: 1px solid var(--border-color); \n                    border-radius: 4px; color: var(--text-color); cursor: pointer;">Cancel</button>\n            <button id="ta-prop-ok" style="padding: 8px 16px; background: var(--accent-color); border: none; \n                    border-radius: 4px; color: white; cursor: pointer;">OK</button>\n        </div>\n    '), el.appendChild(v3), document.body.appendChild(el);
  const v4 = v3.querySelector(('#ta-prop-text'));
    v4.focus();
  v4.select();
    const v5 = v3.querySelector('#ta-prop-bgcolor-enabled');
  const v6 = v3.querySelector(('#ta-prop-bgcolor'));
  return v5.addEventListener(('change'), () => {
        v6.disabled = !v5.checked;
  }), new Promise(v7 => {
    const v8 = v3.querySelector('#ta-prop-ok');
    const v9 = v3.querySelector('#ta-prop-cancel');
    function v10() {
            const v12 = v3.querySelector('#ta-prop-text').value;
      const v13 = v3.querySelector('#ta-prop-vpos').value;
      const v14 = (parseInt(v3.querySelector(('#ta-prop-fontsize')).value, 10));
      const v15 = v3.querySelector(('#ta-prop-bold')).checked;
      const v16 = v3.querySelector('#ta-prop-color').value;
      const v17 = v3.querySelector(('#ta-prop-bgcolor-enabled')).checked ? v3.querySelector('#ta-prop-bgcolor').value : null;
            v12 !== num && document_wave.setTextAnnotationText(item.id, v12);
      v13 !== v2 && 'function' == typeof document_wave.setTextAnnotationVPos && document_wave.setTextAnnotationVPos(item.id, v13);
      (v14 !== v0) && ('function') == typeof document_wave.setTextAnnotationFontSize && document_wave.setTextAnnotationFontSize(item.id, v14);
      (v15 !== v1) && (('function') == typeof document_wave.setTextAnnotationBold) && document_wave.setTextAnnotationBold(item.id, v15);
      (v16 !== n) && ('function' == typeof document_wave.setTextAnnotationColor) && document_wave.setTextAnnotationColor(item.id, v16);
      (v17 !== val) && (('function') == typeof document_wave.setTextAnnotationBackgroundColor) && document_wave.setTextAnnotationBackgroundColor(item.id, v17);
      drawWaveform();
      el.remove();
      (v7(true));
    }
    function v11() {
                        el.remove();
            v7(false);
    }
        v8.addEventListener(('click'), v10);
    v9.addEventListener(('click'), v11);
    v4.addEventListener('keydown', v12 => {
                        (('Enter') === v12.key) && (v10());
            (('Escape') === v12.key) && (v11());
    });
    el.addEventListener(('click'), ev => {
            (ev.target === el) && (v11());
    });
  });
}
function showTextAnnotationContextMenu(num, n, item) {
  if (document.querySelectorAll('.context-menu').forEach(v0 => v0.remove()), !item)
    return;
  (('function') == typeof selectObject) && (void 0 !== SelectableType) && ((selectObject(SelectableType.TextAnnotation, item.id)), drawWaveform());
  const el = document.createElement(('div'));
  function val(v0, v1) {
    const v2 = document.createElement(('div'));
    return v2.textContent = v0, v2.style.padding = ('8px 12px'), v2.style.cursor = ('pointer'), v2.style.color = ('var(--text-color)'), v2.addEventListener(('mouseenter'), () => {
            v2.style.background = 'var(--accent-color)';
    }), v2.addEventListener('mouseleave', () => {
            v2.style.background = ('transparent');
    }), v2.addEventListener('click', () => {
                        v1();
            el.parentNode && document.body.removeChild(el);
    }), el.appendChild(v2), v2;
  }
  function tmp(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener('click', tmp), ('function' == typeof clearObjectSelection) && ((clearObjectSelection()), drawWaveform()));
  }
    el.className = 'context-menu';
  el.style.position = ('fixed');
  el.style.left = (num + 'px');
  el.style.top = n + 'px';
  el.style.background = ('var(--bg-color)');
  el.style.border = '1px solid var(--border-color)';
  el.style.borderRadius = ('4px');
  el.style.boxShadow = ('0 2px 8px rgba(0,0,0,0.3)');
  el.style.zIndex = '5500';
  el.style.minWidth = '150px';
  (val(('Edit properties...'), async () => {
    await (showTextAnnotationPropertiesDialog(item));
}));
  (val(('Delete'), () => {
        document_wave.removeTextAnnotation(item.id);
    (drawWaveform());
}));
  document.body.appendChild(el);
  setTimeout(() => {
        document.addEventListener(('click'), tmp);
  }, 10);
}
function runTutorial() {
  if (window.__wavepaintTutorialActive)
    return;
  window.__wavepaintTutorialActive = true;
    const arr = [
      {
        selector: ('#canvas'),
        title: '\uD83D\uDC4B Welcome to WavePaint!',
        text: ('Create beautiful waveform diagrams in seconds.\n\nLet\'s learn the basics \u2014 it only takes 30 seconds!'),
        position: ('center')
      },
      {
        selector: '#add-signal-btn',
        title: ('1️\u20E3 Add a Signal'),
        text: ('Click here to add your first signal.\n\nChoose <b>Bit Signal</b> for simple 0/1 waveforms, or <b>Vector Signal</b> for buses.'),
        position: 'bottom'
      },
      {
        selector: '#tool-paint',
        title: ('2️\u20E3 Paint Values'),
        text: ('Select the <b>Paint</b> tool, then click on signal cells to toggle values.\n\n<b>Tip:</b> Press <b>D</b> to quickly activate Paint mode!'),
        position: ('bottom')
      },
      {
        selector: '#tool-paint-color',
        title: '\uD83C\uDFA8 Choose Colors',
        text: 'Click here to pick which value to paint:\n\n\u2022 <b>High (1)</b> \u2014 Green\n\u2022 <b>Low (0)</b> \u2014 Green\n\u2022 <b>X / Z</b> \u2014 Special states',
        position: ('bottom')
      },
      {
        selector: ('#canvas'),
        title: '3️\u20E3 Start Creating!',
        text: ('Your canvas is ready!\n\n<b>Quick tips:</b>\n\u2022 <b>Click</b> cells to paint\n\u2022 <b>Right-click</b> signals for more options\n\u2022 <b>Scroll</b> to navigate\n\u2022 <b>Ctrl + Z</b> to undo'),
        position: ('top')
      },
      {
        selector: '#tool-save',
        title: '\uD83D\uDCBE Save Your Work',
        text: ('Don\'t forget to save!\n\nYou can also export as <b>PNG</b>, <b>SVG</b>, or <b>WaveDrom JSON</b> from the File menu.'),
        position: 'bottom'
      },
      {
        selector: '#logo',
        title: ('\uD83C\uDF89 You\'re Ready!'),
        text: ('That\'s it! You know the essentials.\n\n<b>Explore more:</b>\n\u2022 Add arrows, markers & annotations\n\u2022 Import VCD files from simulators\n\u2022 Check the <b>Help</b> menu anytime\n\nHappy designing!'),
        position: 'bottom'
      }
    ];
  const item = document.createElement('div');
  item.className = 'wp-tutorial-overlay';
  const el = document.createElement(('div'));
  el.className = 'wp-tutorial-tooltip wp-tutorial-quickstart';
  const val = document.createElement(('div'));
  val.className = 'tutorial-progress';
  const tmp = document.createElement(('div'));
    tmp.className = ('tutorial-progress-bar');
  tmp.style.width = '0%';
  val.appendChild(tmp);
  const v0 = document.createElement('div');
    v0.className = ('tutorial-step-dots');
  arr.forEach((v12, v13) => {
    const v14 = document.createElement('span');
        v14.className = ('tutorial-dot');
    v14.dataset.step = v13;
    v0.appendChild(v14);
  });
  const v1 = document.createElement(('div'));
  v1.className = 'title';
  const v2 = document.createElement('div');
  v2.className = ('text');
  const v3 = document.createElement(('div'));
  v3.className = 'actions';
  const v4 = document.createElement('button');
    v4.className = ('btn secondary');
  v4.textContent = 'Skip';
  v4.type = 'button';
  const v5 = document.createElement(('button'));
    v5.className = ('btn primary');
  v5.textContent = 'Next \u2192';
  v5.type = 'button';
  v3.appendChild(v4);
  v3.appendChild(v5);
  el.appendChild(val);
  el.appendChild(v0);
  el.appendChild(v1);
  el.appendChild(v2);
  el.appendChild(v3);
  const v6 = document.createElement('div');
    v6.className = 'wp-tutorial-arrow';
  document.body.appendChild(item);
  document.body.appendChild(el);
  document.body.appendChild(v6);
    let num = 0;
  let v7 = null;
    const fn = () => {
                        v7 && v7.classList.remove('wp-tutorial-highlight');
            document.querySelectorAll('.wp-tutorial-highlight').forEach(v12 => {
                v12.classList.remove(('wp-tutorial-highlight'));
      });
            item.parentElement && item.parentElement.removeChild(item);
            el.parentElement && el.parentElement.removeChild(el);
            v6.parentElement && v6.parentElement.removeChild(v6);
            document.removeEventListener(('keydown'), v11);
            localStorage.setItem(('wavepaint_tutorial_done'), ('true'));
            window.__wavepaintTutorialActive = false;
    };
  const v8 = (v12, v13, v14) => Math.max(v13, Math.min(v14, v12));
  const v9 = (cur, n = 'bottom') => {
            const v12 = 20;
      const v13 = 12;
            el.style.visibility = 'hidden';
      el.style.display = 'block';
      const v14 = el.getBoundingClientRect();
            let v15;
      let v16;
      let v17;
      let v18;
      el.style.visibility = ('visible');
      let str = 'down';
            const v19 = window.innerWidth;
      const v20 = window.innerHeight;
      if (('center' === n))
        return v15 = (v20 - v14.height) / (2), v16 = (v19 - v14.width) / (2), v6.style.display = 'none', el.style.top = v15 + 'px', void (el.style.left = v16 + 'px');
      switch (v6.style.display = ('block'), n) {
      case ('top'):
        v15 = (cur.top - v14.height) - v13 - (8), v16 = cur.left + (cur.width - v14.width) / (2), str = ('down');
        break;
      case ('left'):
        v15 = (cur.top + ((cur.height - v14.height) / 2)), v16 = cur.left - v14.width - v13 - (8), str = 'right';
        break;
      case 'right':
        v15 = (cur.top + ((cur.height - v14.height) / 2)), v16 = (cur.right + v13) + (8), str = 'left';
        break;
      default:
        v15 = (cur.bottom + v13) + (8), v16 = cur.left + ((cur.width - v14.width) / 2), str = 'up';
      }
            v15 < v12 && (v15 = cur.bottom + v13 + (8), str = 'up');
      v15 + v14.height > v20 - v12 && (v15 = ((cur.top - v14.height) - v13 - 8), str = 'down');
      v16 = (v8(v16, v12, v19 - v14.width - v12));
      v15 = (v8(v15, v12, v20 - v14.height - v12));
      el.style.top = v15 + 'px';
      el.style.left = v16 + 'px';
      v6.className = 'wp-tutorial-arrow';
      ('down') === str ? (v17 = v15 + v14.height, v18 = (v8(((cur.left + (cur.width / 2)) - 10), v12, v19 - v12 - 20)), v6.classList.add(('arrow-down'))) : 'up' === str ? (v17 = (v15 - v13), v18 = v8((cur.left + (cur.width / 2)) - (10), v12, v19 - v12 - (20)), v6.classList.add(('arrow-up'))) : 'right' === str ? (v17 = v8(((cur.top + cur.height / 2) - 10), v12, v20 - v12 - (20)), v18 = v16 + v14.width, v6.classList.add(('arrow-right'))) : (v17 = (v8((cur.top + cur.height / 2 - 10), v12, ((v20 - v12) - 20))), v18 = (v16 - v13), v6.classList.add(('arrow-left')));
      v6.style.top = v17 + 'px';
      v6.style.left = v18 + 'px';
    };
  const v10 = n => {
            v7 && v7.classList.remove('wp-tutorial-highlight');
      const v12 = arr[n];
      if (!v12)
        return void fn();
      const v13 = document.querySelector(v12.selector);
      if (!v13)
        return void (n < arr.length - (1) ? (v10((n + 1))) : (fn()));
            num = n;
      v7 = v13;
      ('center' !== v12.position) && v7.classList.add(('wp-tutorial-highlight'));
      const v14 = ((n + 1) / arr.length * 100);
            tmp.style.width = v14 + '%';
      v0.querySelectorAll(('.tutorial-dot')).forEach((v16, v17) => {
                                v16.classList.toggle(('active'), (v17 === n));
                v16.classList.toggle(('completed'), v17 < n);
      });
      v1.textContent = v12.title;
      v2.innerHTML = v12.text.replace(/\n/g, '<br>');
      v5.textContent = (n === (arr.length - 1)) ? ('Get Started!') : ('Next \u2192');
      const v15 = v7.getBoundingClientRect();
      v9(v15, v12.position || 'bottom');
    };
    v4.onclick = ev => {
                ev.preventDefault();
        ev.stopPropagation();
        (fn());
  };
  v5.onclick = ev => {
                ev.preventDefault();
        ev.stopPropagation();
        (num >= arr.length - 1) ? fn() : (v10((num + 1)));
  };
  v0.onclick = ev => {
    const v12 = ev.target.closest('.tutorial-dot');
    if (v12) {
      const v13 = parseInt(v12.dataset.step, 10);
      (isNaN(v13)) || v10(v13);
    }
  };
  const v11 = ev => {
        window.__wavepaintTutorialActive && ('Escape' === ev.key ? (fn()) : (('ArrowRight') === ev.key) || 'Enter' === ev.key || (' ' === ev.key) ? (ev.preventDefault(), (num >= arr.length - 1) ? (fn()) : v10((num + 1))) : ('ArrowLeft') === ev.key && (ev.preventDefault(), (num > 0) && (v10(num - 1))));
  };
    document.addEventListener('keydown', v11);
  window.addEventListener(('resize'), () => {
        if (v7 && window.__wavepaintTutorialActive) {
      const v12 = arr[num];
      v9(v7.getBoundingClientRect(), v12?.['position'] || ('bottom'));
    }
  });
  (v10(0));
}
function queueTutorial() {
    window.__wavepaintTutorialQueued = true;
  startTutorialIfNeeded();
}
function scheduleTutorialFallback() {
  let num = 0;
  const item = setInterval(() => {
        num += 1;
        const val = !!document.getElementById(('wp-beta-overlay'));
    const tmp = ('true') === localStorage.getItem(('wavepaint_tutorial_done'));
        (val || tmp) || ((queueTutorial()), (clearInterval(item)));
    num >= 10 && (clearInterval(item));
  }, 400);
}
function startTutorialIfNeeded(num = 0) {
  window.__wavepaintTutorialQueued && 'true' !== localStorage.getItem(('wavepaint_tutorial_done')) && (document.body.classList.contains('loading') || wpModalState && wpModalState.isOpen ? num < 12 && (setTimeout(() => startTutorialIfNeeded(num + 1), 300)) : (window.__wavepaintTutorialQueued = false, runTutorial()));
}
'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', initBitStatePicker) : setTimeout(initBitStatePicker, 0);
'undefined' != typeof window && (window.getCurrentBitState = getCurrentBitState, window.setCurrentBitState = setCurrentBitState, window.bitStateToValue = bitStateToValue);
const STORAGE_KEY_LAST_SIGNUP_PROMPT = 'wavepaint_last_signup_prompt_date';
function getTodayDateString() {
    return new Date()['toISOString']().split('T')[0];
}
function wasSignupPromptShownToday() {
  return (localStorage.getItem(STORAGE_KEY_LAST_SIGNUP_PROMPT) === (getTodayDateString()));
}
function markSignupPromptShown() {
  localStorage.setItem(STORAGE_KEY_LAST_SIGNUP_PROMPT, (getTodayDateString()));
}
function isUserLoggedIn() {
  return 'undefined' != typeof WPAuth && ('function') == typeof WPAuth.isLoggedIn ? WPAuth.isLoggedIn() : !!localStorage.getItem('wp_auth_token');
}
async function showDailySignupPromptIfNeeded() {
    (('function') == typeof initWelcomePopup) && await (initWelcomePopup());
  (queueTutorial());
}
function showSignupPromptModal() {
  const item = document.getElementById('wp-signup-prompt-overlay');
  item && item.remove();
  const el = document.createElement('div');
    el.id = ('wp-signup-prompt-overlay');
  el.className = 'wp-modal-overlay';
  el.style.zIndex = ('3000');
  const v0 = document.createElement(('div'));
    v0.className = 'wp-modal';
  v0.style.maxWidth = '480px';
  const v1 = document.createElement(('div'));
    v1.className = 'wp-modal-header';
  v1.style.flexDirection = ('column');
  v1.style.gap = '10px';
  v1.style.paddingBottom = ('15px');
  v1.style.textAlign = ('center');
  const val = document.createElement(('img'));
    val.src = 'img/WavePaint_header.png';
  val.alt = 'WavePaint';
  val.style.width = ('280px');
  val.style.height = 'auto';
  val.style.margin = '0 auto';
  const v2 = document.createElement('span');
    v2.className = ('wp-modal-title');
  v2.textContent = ('Create a Free Account');
  v2.style.fontSize = ('20px');
  v1.appendChild(val);
  v1.appendChild(v2);
  const v3 = document.createElement('div');
    v3.className = ('wp-modal-body');
  v3.style.gap = ('15px');
  v3.style.textAlign = 'center';
  const v4 = document.createElement('p');
    v4.style.margin = '0';
  v4.style.fontSize = ('14px');
  v4.style.lineHeight = ('1.5');
  v4.innerHTML = 'Create a free account to unlock all features and get the most out of WavePaint!';
  const v5 = document.createElement('ul');
    v5.style.textAlign = ('left');
  v5.style.margin = ('10px 0');
  v5.style.paddingLeft = ('20px');
  v5.style.fontSize = '13px';
  v5.style.lineHeight = ('1.8');
  v5.innerHTML = '\n        <li>\uD83D\uDCCA Export diagrams in high resolution</li>\n        <li>\uD83C\uDFA8 Access to advanced styling options</li>\n        <li>\uD83D\uDCE7 Get notified about new features and updates</li>\n        <li>\u2B50 Unlock premium features (coming soon)</li>\n    ';
  v3.appendChild(v4);
  v3.appendChild(v5);
  const v6 = document.createElement(('div'));
    v6.className = ('wp-modal-footer');
  v6.style.flexDirection = ('column');
  v6.style.gap = ('10px');
  const v7 = document.createElement(('button'));
    v7.className = ('wp-modal-btn primary');
  v7.textContent = 'Sign Up Free';
  v7.style.width = ('100%');
  v7.style.padding = '12px';
  v7.style.fontSize = '15px';
  const v8 = document.createElement('div');
    v8.style.fontSize = '13px';
  v8.innerHTML = 'Already have an account? <a href="#" id="signup-prompt-login" style="color: var(--accent); text-decoration: underline; cursor: pointer;">Log in</a>';
  const v9 = document.createElement(('button'));
    v9.className = ('wp-modal-btn');
  v9.textContent = 'Maybe Later';
  v9.style.width = ('100%');
  v9.style.marginTop = ('5px');
  v6.appendChild(v7);
  v6.appendChild(v8);
  v6.appendChild(v9);
  v0.appendChild(v1);
  v0.appendChild(v3);
  v0.appendChild(v6);
  el.appendChild(v0);
  document.body.appendChild(el);
  const tmp = () => {
        el.parentNode && el.parentNode.removeChild(el);
  };
    el.addEventListener('click', ev => {
        ev.target === el && (tmp(), queueTutorial());
  });
  v9.onclick = () => {
                (tmp());
        queueTutorial();
  };
  v7.onclick = () => {
                tmp();
        ('undefined') != typeof WPPremiumUI && ('function') == typeof WPPremiumUI.showRegisterModal ? (listenForRegistrationSuccess(), WPPremiumUI.showRegisterModal()) : (queueTutorial());
  };
  v8.querySelector(('#signup-prompt-login')).onclick = ev => {
                ev.preventDefault();
        (tmp());
        ('undefined' != typeof WPPremiumUI) && 'function' == typeof WPPremiumUI.showLoginModal && WPPremiumUI.showLoginModal();
  };
}
function listenForRegistrationSuccess() {
  if ((('undefined') != typeof WPAuth) && (('function') == typeof WPAuth.on)) {
    const item = () => {
            ('function' == typeof WPAuth.off) && WPAuth.off('login', item);
      setTimeout(() => {
                'function' == typeof runTutorial ? 'true' !== localStorage.getItem('wavepaint_tutorial_done') && (runTutorial()) : (queueTutorial());
      }, 500);
    };
        WPAuth.on(('login'), item);
    setTimeout(() => {
            'function' == typeof WPAuth.off && WPAuth.off(('login'), item);
    }, 60000);
  }
}
function showBetaWelcomeIfNeeded() {
  showDailySignupPromptIfNeeded();
}
function cancelCurrentTool() {
    arrowHasStart = false;
  arrowStartSignal = -1;
  arrowStartSample = -1;
  arrowPreviewSignal = -1;
  arrowPreviewSample = -1;
  isMovingSignal = false;
  moveSignalIndex = -1;
  moveSignalTargetIndex = -1;
  pendingMoveSignal = false;
  pendingMoveSignalIndex = -1;
  selectedSignalIndices = [];
  lastSelectedSignalIndex = -1;
  vectorSelecting = false;
  vectorSelSignal = -1;
  vectorSelStartSample = -1;
  vectorSelCurrentSample = -1;
  void (0) !== markerPreviewPosition && (markerPreviewPosition = -1);
  void (0) !== timeJumpPreviewPosition && (timeJumpPreviewPosition = -1);
  (void 0 !== timeSpanHasStart) && (timeSpanHasStart = false, timeSpanStartSignal = -1, timeSpanStartPosition = -1, timeSpanPreviewSignal = -1, timeSpanPreviewPosition = -1);
  void (0) !== textAnnotationPreviewSignal && (textAnnotationPreviewSignal = -1, textAnnotationPreviewPosition = -1, textAnnotationPreviewArrow = -1, textAnnotationPreviewVPos = 'Above');
  (void 0 !== cutHasStart) && (cutHasStart = false, cutStartSample = -1, cutPreviewSample = -1);
  (void 0 !== rangeSelecting) && (rangeSelecting = false, rangeSelStartSignal = -1, rangeSelStartSample = -1, rangeSelEndSignal = -1, rangeSelEndSample = -1, rangeSelActive = false);
  void (0) !== pastePreviewSignal && (pastePreviewSignal = -1, pastePreviewSample = -1);
  ('function') == typeof drawWaveform && drawWaveform();
}
function setCurrentTool(num) {
  const n = currentTool;
    (currentTool === num) ? ((cancelCurrentTool()), currentTool = ('none')) : ((cancelCurrentTool()), currentTool = num);
  'select-object' === n && ('select-object' !== currentTool) && ('function' == typeof clearObjectSelection) && (clearObjectSelection());
  document.querySelectorAll('.tool-btn').forEach(el => {
        (el.getAttribute(('data-tool')) === currentTool) ? el.classList.add(('active')) : el.classList.remove(('active'));
  });
}
const SelectableType = {
  None: 'none',
  Arrow: 'arrow',
  TimeSpan: 'timespan',
  Marker: 'marker',
  TimeJump: 'timejump',
  TextAnnotation: 'textannotation',
  Signal: 'signal',
  ClockEdge: 'clockedge'
};
let currentSelection = {
  type: SelectableType.None,
  id: null,
  object: null
};
function clearObjectSelection() {
    currentSelection = {
    type: SelectableType.None,
    id: null,
    object: null
  };
  (updatePropertiesButtonState());
  (hidePropertiesPanel());
  'function' == typeof setSelectedObject && setSelectedObject(null, null);
  'function' == typeof clearAllObjectSelections && clearAllObjectSelections();
}
function selectObject(num, item, val = null) {
    let n = null;
  let tmp = null;
  switch (num) {
  case SelectableType.Arrow:
    n = ('number') == typeof item ? item : item.id, tmp = document_wave.arrowList().find(v0 => v0.id === n);
    break;
  case SelectableType.TimeSpan:
    n = (('number') == typeof item) ? item : item.id, tmp = document_wave.timeSpanMarkerList().find(v0 => v0.id === n);
    break;
  case SelectableType.Marker:
    n = ('number' == typeof item) ? item : item.id, tmp = document_wave.markerList().find(v0 => v0.id === n);
    break;
  case SelectableType.TimeJump:
    n = 'number' == typeof item ? item : item.id, tmp = document_wave.timeJumpList().find(v0 => v0.id === n);
    break;
  case SelectableType.TextAnnotation:
    n = (('number') == typeof item) ? item : item.id, tmp = document_wave.textAnnotationList().find(v0 => v0.id === n);
    break;
  case SelectableType.Signal:
    n = item, tmp = document_wave.signalList()[n];
    break;
  case SelectableType.ClockEdge:
    n = val ? val.signalIndex : null, tmp = val;
  }
  tmp || (num === SelectableType.Signal) || (num === SelectableType.ClockEdge) ? (currentSelection = {
    type: num,
    id: n,
    object: tmp
  }, updatePropertiesButtonState(), ('function') == typeof setSelectedObject && setSelectedObject(num, n)) : clearObjectSelection();
}
function getObjectSelection() {
  return currentSelection;
}
function hasObjectSelection() {
  return (currentSelection.type !== SelectableType.None) && ((currentSelection.type === SelectableType.ClockEdge) ? null !== currentSelection.object : null !== currentSelection.id);
}
function updatePropertiesButtonState() {
  const item = document.getElementById('tool-properties');
  item && (hasObjectSelection() ? (item.disabled = false, item.classList.remove('disabled'), item.title = 'Properties (' + getSelectionTypeName() + ')') : (item.disabled = true, item.classList.add('disabled'), item.title = 'Properties (select an object first)'));
}
function getSelectionTypeName() {
  switch (currentSelection.type) {
  case SelectableType.Arrow:
    return 'Arrow';
  case SelectableType.TimeSpan:
    return 'Time Span';
  case SelectableType.Marker:
    return 'Marker';
  case SelectableType.TimeJump:
    return ('Time Jump');
  case SelectableType.TextAnnotation:
    return ('Text');
  case SelectableType.Signal:
    return ('Signal');
  case SelectableType.ClockEdge:
    return 'Clock Edge';
  default:
    return '';
  }
}
function showPropertiesPanel() {
  if (!hasObjectSelection())
    return;
  hidePropertiesPanel();
  const el = document.createElement('div');
    el.id = 'properties-panel';
  el.className = ('properties-panel');
  const item = buildPropertiesContent();
    el.innerHTML = item;
  document.body.appendChild(el);
  const val = document.getElementById(('tool-properties'));
  if (val) {
    const tmp = val.getBoundingClientRect();
        el.style.top = (tmp.bottom + 5 + 'px');
    el.style.left = Math.max(10, tmp.left - (100)) + 'px';
  }
    setupPropertiesPanelEvents(el);
  setTimeout(() => {
        document.addEventListener('mousedown', handlePropertiesPanelOutsideClick);
  }, 0);
}
function hidePropertiesPanel() {
  const item = document.getElementById('properties-panel');
    item && item.remove();
  document.removeEventListener(('mousedown'), handlePropertiesPanelOutsideClick);
}
function handlePropertiesPanelOutsideClick(ev) {
  const item = document.getElementById('properties-panel');
  const val = document.getElementById(('tool-properties'));
  item && !item.contains(ev.target) && val && !val.contains(ev.target) && (hidePropertiesPanel());
}
function buildPropertiesContent() {
  const item = currentSelection;
  let val = '<div class="properties-header">\n        <span class="properties-title">' + getSelectionTypeName() + (' Properties</span>\n        <button class="properties-close" onclick="hidePropertiesPanel()">&times;</button>\n    </div>\n    <div class="properties-body">');
  switch (item.type) {
  case SelectableType.Arrow:
    val += (buildArrowProperties(item.object));
    break;
  case SelectableType.TimeSpan:
    val += (buildTimeSpanProperties(item.object));
    break;
  case SelectableType.Marker:
    val += (buildMarkerProperties(item.object));
    break;
  case SelectableType.TimeJump:
    val += buildTimeJumpProperties(item.object);
    break;
  case SelectableType.TextAnnotation:
    val += buildTextAnnotationProperties(item.object);
    break;
  case SelectableType.Signal:
    val += buildSignalProperties(item.object, item.id);
    break;
  case SelectableType.ClockEdge:
    val += (buildClockEdgeProperties(item.object));
  }
  return val += '</div>', item.type !== SelectableType.ClockEdge && (val += '\n    <div class="properties-footer">\n        <button class="properties-delete-btn" onclick="deleteSelectedObject()">Delete</button>\n    </div>'), val;
}
function buildArrowProperties(item) {
  const val = [
      {
        value: '~',
        label: ('Spline')
      },
      {
        value: '~>',
        label: 'Spline \u2192'
      },
      {
        value: ('<~>'),
        label: '\u2190 Spline \u2192'
      },
      {
        value: '-',
        label: ('Straight')
      },
      {
        value: '->',
        label: 'Straight \u2192'
      },
      {
        value: '<->',
        label: '\u2190 Straight \u2192'
      }
    ];
  let num = '<select id="prop-arrow-style" class="prop-input">';
  for (const tmp of val) {
    const n = item.style === tmp.value ? ('selected') : '';
    num += '<option value="' + tmp.value + '" ' + n + '>' + tmp.label + '</option>';
  }
  return num += ('</select>'), '\n        <div class="prop-row">\n            <label class="prop-label">Style:</label>\n            ' + num + ('\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Color:</label>\n            <input type="color" id="prop-arrow-color" class="prop-color-input" value="') + (item.color || ('#00ff00')) + ('">\n            <button class="prop-reset-btn" onclick="resetArrowColor()">Reset</button>\n        </div>\n    ');
}
function buildTimeSpanProperties(item) {
  const val = [
      {
        value: '-|',
        label: ('L-Shape (horiz\u2192vert)')
      },
      {
        value: '|-',
        label: 'L-Shape (vert\u2192horiz)'
      },
      {
        value: ('-|-'),
        label: 'Z-Shape'
      }
    ];
  let num = '<select id="prop-timespan-style" class="prop-input">';
  for (const tmp of val) {
    const n = item.style === tmp.value ? 'selected' : '';
    num += '<option value="' + tmp.value + '" ' + n + '>' + tmp.label + '</option>';
  }
  return num += ('</select>'), '\n        <div class="prop-row">\n            <label class="prop-label">Style:</label>\n            ' + num + ('\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Color:</label>\n            <input type="color" id="prop-timespan-color" class="prop-color-input" value="') + (item.color || '#00ff00') + ('">\n            <button class="prop-reset-btn" onclick="resetTimeSpanColor()">Reset</button>\n        </div>\n    ');
}
function buildMarkerProperties(item) {
  const num = item.color || '#ffff00';
  return '\n        <div class="prop-row">\n            <label class="prop-label">Sample:</label>\n            <input type="number" id="prop-marker-sample" class="prop-input" value="' + item.sample + ('" min="0">\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Color:</label>\n            <input type="color" id="prop-marker-color" class="prop-color-input" value="') + num + ('">\n            <button class="prop-reset-btn" onclick="resetMarkerColor()">Reset</button>\n        </div>\n    ');
}
function buildTimeJumpProperties(item) {
  const num = item.color || ('#888888');
  return '\n        <div class="prop-row">\n            <label class="prop-label">Sample:</label>\n            <input type="number" id="prop-timejump-sample" class="prop-input" value="' + item.sample + ('" min="0">\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Color:</label>\n            <input type="color" id="prop-timejump-color" class="prop-color-input" value="') + num + ('">\n            <button class="prop-reset-btn" onclick="resetTimeJumpColor()">Reset</button>\n        </div>\n    ');
}
function buildTextAnnotationProperties(item) {
  const num = item.color || ('#ffffff');
  const n = item.backgroundColor || '#333333';
  const val = null !== item.backgroundColor && (void 0 !== item.backgroundColor);
  const tmp = [
      'Above',
      'Center',
      ('Below')
    ];
  let str = ('<select id="prop-text-vpos" class="prop-input">');
  for (const v0 of tmp)
    str += '<option value="' + v0 + '" ' + ((item.vPos === v0) ? 'selected' : '') + '>' + v0 + '</option>';
  return str += ('</select>'), '\n        <div class="prop-row">\n            <label class="prop-label">Text:</label>\n            <input type="text" id="prop-text-content" class="prop-input prop-text-input" value="' + (escapeHtml(item.text)) + ('">\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Position:</label>\n            ') + str + ('\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Font Size:</label>\n            <input type="number" id="prop-text-fontsize" class="prop-input" value="') + (item.fontSize || 12) + ('" min="8" max="48">\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Bold:</label>\n            <input type="checkbox" id="prop-text-bold" ') + (item.bold ? ('checked') : '') + ('>\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Color:</label>\n            <input type="color" id="prop-text-color" class="prop-color-input" value="') + num + ('">\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">\n                <input type="checkbox" id="prop-text-bgcolor-enabled" ') + (val ? 'checked' : '') + ('> Background:\n            </label>\n            <input type="color" id="prop-text-bgcolor" class="prop-color-input" value="') + n + '" ' + (val ? '' : ('disabled')) + ('>\n        </div>\n    ');
}
function buildSignalProperties(sig, item) {
  const num = sig.color || '#00ff00';
  let n = 'Bit Signal';
    sig.type === SignalType.Vector && (n = ('Vector Signal'));
  sig.type === SignalType.BlankRow && (n = ('Blank Row'));
  let val = '\n        <div class="prop-row">\n            <label class="prop-label">Name:</label>\n            <input type="text" id="prop-signal-name" class="prop-input prop-text-input" value="' + escapeHtml(sig.name) + ('">\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Type:</label>\n            <span class="prop-value">') + n + ('</span>\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Color:</label>\n            <input type="color" id="prop-signal-color" class="prop-color-input" value="') + num + ('">\n            <button class="prop-reset-btn" onclick="resetSignalColor()">Reset</button>\n        </div>\n    ');
  if ((sig.type === SignalType.Bit)) {
    const tmp = false !== sig.showClockMarkers;
    val += '\n        <div class="prop-row">\n            <label class="prop-label">Rise Time:</label>\n            <input type="number" id="prop-signal-rise" class="prop-input" value="' + (sig.riseTime || 0) + ('" min="0" max="1" step="0.1">\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Fall Time:</label>\n            <input type="number" id="prop-signal-fall" class="prop-input" value="') + (sig.fallTime || 0) + ('" min="0" max="1" step="0.1">\n        </div>\n        <div class="prop-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">\n            <label class="prop-label">Clock Markers:</label>\n            <input type="checkbox" id="prop-signal-clockmarkers" ') + (tmp ? ('checked') : '') + ('>\n            <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">Show P/N arrows</span>\n        </div>\n        ');
  }
  return val;
}
function buildClockEdgeProperties(item) {
  if (!item)
    return ('<div class="prop-row">No edge selected</div>');
    const {
      signalIndex: val,
      sampleIndex: num,
      edgeType: n,
      hasMarker: tmp
    } = item;
  const v0 = document_wave.signalList()[val];
  const v1 = v0 ? v0.name : ('Unknown');
  const v2 = v0 && v0.clockMarkers && true === v0['clockMarkers'][num];
  const v3 = v0 ? v0.edgeArrow : void (0);
  const v4 = v3 && ('none') !== v3;
  const v5 = (('positive') === v3) ? 'Rising' : 'negative' === v3 ? ('Falling') : '';
  const v6 = (('rising') === n) ? '\u2191 Rising Edge' : '\u2193 Falling Edge';
  let v7 = '\n        <div class="prop-row">\n            <label class="prop-label">Signal:</label>\n            <span class="prop-value">' + (escapeHtml(v1)) + ('</span>\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Position:</label>\n            <span class="prop-value">Sample ') + num + ('</span>\n        </div>\n        <div class="prop-row">\n            <label class="prop-label">Edge:</label>\n            <span class="prop-value">') + v6 + ('</span>\n        </div>\n    ');
  return v7 += v4 ? '\n        <div class="prop-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">\n            <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">\n                \u26A0️ Polarity not available.<br>\n                Signal has ' + v5 + (' Edge enabled in Signal Properties.\n            </span>\n        </div>\n        ') : '\n        <div class="prop-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">\n            <label class="prop-label">Show Polarity:</label>\n            <input type="checkbox" id="prop-clockedge-visible" ' + (v2 ? 'checked' : '') + (' title="Show polarity marker on this edge">\n        </div>\n        <div class="prop-help" style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">\n            Shows a P/N polarity arrow on this clock edge.\n        </div>\n        '), v7;
}
function escapeHtml(item) {
  return item ? item.replace(/&/g, ('&amp;')).replace(/</g, ('&lt;')).replace(/>/g, ('&gt;')).replace(/"/g, '&quot;').replace(/'/g, ('&#039;')) : '';
}
function setupPropertiesPanelEvents(item) {
  const val = currentSelection;
  if ((val.type === SelectableType.Arrow)) {
        const tmp = item.querySelector(('#prop-arrow-style'));
    const v0 = item.querySelector('#prop-arrow-color');
        tmp && tmp.addEventListener('change', () => {
            document_wave.setArrowStyleById(val.id, tmp.value);
    });
    v0 && v0.addEventListener('input', () => {
            document_wave.setArrowColorById(val.id, v0.value);
    });
  }
  if (val.type === SelectableType.TimeSpan) {
        const tmp = item.querySelector('#prop-timespan-style');
    const v0 = item.querySelector(('#prop-timespan-color'));
        tmp && tmp.addEventListener('change', () => {
            document_wave.setTimeSpanMarkerStyle(val.id, tmp.value);
    });
    v0 && v0.addEventListener(('input'), () => {
            document_wave.setTimeSpanMarkerColor(val.id, v0.value);
    });
  }
  if (val.type === SelectableType.Marker) {
        const tmp = item.querySelector('#prop-marker-sample');
    const v0 = item.querySelector(('#prop-marker-color'));
        tmp && tmp.addEventListener(('change'), () => {
      const v1 = (parseInt(tmp.value, 10));
      isNaN(v1) || 'function' != typeof document_wave.setMarkerSample || document_wave.setMarkerSample(val.id, v1);
    });
    v0 && v0.addEventListener(('input'), () => {
            (('function') == typeof document_wave.setMarkerColor) && document_wave.setMarkerColor(val.id, v0.value);
    });
  }
  if ((val.type === SelectableType.TimeJump)) {
    const tmp = item.querySelector('#prop-timejump-color');
    tmp && tmp.addEventListener(('input'), () => {
            'function' == typeof document_wave.setTimeJumpColor && document_wave.setTimeJumpColor(val.id, tmp.value);
    });
  }
  if ((val.type === SelectableType.TextAnnotation)) {
        const tmp = item.querySelector(('#prop-text-content'));
    const v0 = item.querySelector(('#prop-text-vpos'));
    const v1 = item.querySelector(('#prop-text-fontsize'));
    const v2 = item.querySelector(('#prop-text-bold'));
    const v3 = item.querySelector(('#prop-text-color'));
    const v4 = item.querySelector('#prop-text-bgcolor-enabled');
    const v5 = item.querySelector('#prop-text-bgcolor');
        tmp && tmp.addEventListener(('input'), () => {
            document_wave.setTextAnnotationText(val.id, tmp.value);
    });
    v0 && v0.addEventListener('change', () => {
            ('function') == typeof document_wave.setTextAnnotationVPos && document_wave.setTextAnnotationVPos(val.id, v0.value);
    });
    v1 && v1.addEventListener(('change'), () => {
            ('function') == typeof document_wave.setTextAnnotationFontSize && document_wave.setTextAnnotationFontSize(val.id, parseInt(v1.value, 10));
    });
    v2 && v2.addEventListener(('change'), () => {
            ('function') == typeof document_wave.setTextAnnotationBold && document_wave.setTextAnnotationBold(val.id, v2.checked);
    });
    v3 && v3.addEventListener('input', () => {
            ('function') == typeof document_wave.setTextAnnotationColor && document_wave.setTextAnnotationColor(val.id, v3.value);
    });
    (v4 && v5) && (v4.addEventListener(('change'), () => {
            if (v5.disabled = !v4.checked, (('function') == typeof document_wave.setTextAnnotationBackgroundColor)) {
        const v6 = v4.checked ? v5.value : null;
        document_wave.setTextAnnotationBackgroundColor(val.id, v6);
      }
    }), v5.addEventListener(('input'), () => {
            v4.checked && ('function') == typeof document_wave.setTextAnnotationBackgroundColor && document_wave.setTextAnnotationBackgroundColor(val.id, v5.value);
    }));
  }
  if ((val.type === SelectableType.Signal)) {
        const tmp = item.querySelector('#prop-signal-name');
    const v0 = item.querySelector('#prop-signal-color');
    const v1 = item.querySelector(('#prop-signal-rise'));
    const v2 = item.querySelector(('#prop-signal-fall'));
    const v3 = item.querySelector('#prop-signal-clockmarkers');
        tmp && tmp.addEventListener(('input'), () => {
            document_wave.setSignalName(val.id, tmp.value);
    });
    v0 && v0.addEventListener('input', () => {
            document_wave.setSignalColor(val.id, v0.value);
    });
    v1 && v1.addEventListener(('change'), () => {
            (('function') == typeof document_wave.setSignalRiseTime) && document_wave.setSignalRiseTime(val.id, parseFloat(v1.value));
    });
    v2 && v2.addEventListener('change', () => {
            'function' == typeof document_wave.setSignalFallTime && document_wave.setSignalFallTime(val.id, (parseFloat(v2.value)));
    });
    v3 && v3.addEventListener(('change'), () => {
      const v4 = document_wave.signalList()[val.id];
      v4 && (('function') == typeof document_wave.pushUndoSnapshot && document_wave.pushUndoSnapshot(), v4.showClockMarkers = v3.checked, (('function') == typeof drawWaveform) && drawWaveform());
    });
  }
  if (val.type === SelectableType.ClockEdge && val.object) {
    const tmp = item.querySelector('#prop-clockedge-visible');
    tmp && tmp.addEventListener(('change'), () => {
            const {
          signalIndex: v0,
          sampleIndex: num
        } = val.object;
      const v1 = document_wave.signalList()[v0];
      if (v1) {
                'function' == typeof document_wave.pushUndoSnapshot && document_wave.pushUndoSnapshot();
        v1.clockMarkers && (num < v1.clockMarkers.length) && (v1['clockMarkers'][num] = tmp.checked);
        const v2 = v1.clockMarkers && v1.clockMarkers.some(n => true === n);
                v1.showClockMarkers = v2;
        'function' == typeof drawWaveform && drawWaveform();
      }
    });
  }
}
function deleteSelectedObject() {
  const item = currentSelection;
  if ((hasObjectSelection())) {
    switch (item.type) {
    case SelectableType.Arrow:
      document_wave.subArrowById(item.id);
      break;
    case SelectableType.TimeSpan:
      document_wave.subTimeSpanMarkerById(item.id);
      break;
    case SelectableType.Marker:
      document_wave.subMarkerById(item.id);
      break;
    case SelectableType.TimeJump:
      document_wave.subTimeJumpById(item.id);
      break;
    case SelectableType.TextAnnotation:
      document_wave.removeTextAnnotation(item.id);
      break;
    case SelectableType.Signal:
      document_wave.subSignal(item.id);
    case SelectableType.ClockEdge:
    }
    (clearObjectSelection());
  }
}
function resetArrowColor() {
  if ((currentSelection.type === SelectableType.Arrow)) {
    document_wave.setArrowColorById(currentSelection.id, null);
    const item = document.querySelector(('#prop-arrow-color'));
    item && (item.value = ('#00ff00'));
  }
}
function resetTimeSpanColor() {
    if (currentSelection.type === SelectableType.TimeSpan) {
    document_wave.setTimeSpanMarkerColor(currentSelection.id, null);
    const item = document.querySelector('#prop-timespan-color');
    item && (item.value = '#00ff00');
  }
}
function resetMarkerColor() {
  if (currentSelection.type === SelectableType.Marker) {
    (('function') == typeof document_wave.setMarkerColor) && document_wave.setMarkerColor(currentSelection.id, null);
    const item = document.querySelector('#prop-marker-color');
    item && (item.value = '#ffff00');
  }
}
function resetSignalColor() {
  if (currentSelection.type === SelectableType.Signal) {
    document_wave.setSignalColor(currentSelection.id, null);
    const item = document.querySelector(('#prop-signal-color'));
    item && (item.value = ('#00ff00'));
  }
}
function togglePropertiesPanel() {
  document.getElementById(('properties-panel')) ? (hidePropertiesPanel()) : hasObjectSelection() && (showPropertiesPanel());
}
function initPropertyEditor() {
  const item = document.getElementById(('tool-properties'));
    item && item.addEventListener(('click'), togglePropertiesPanel);
  updatePropertiesButtonState();
}
async function prepareExportCanvas() {
  if (!canvas || !ctx || !document_wave)
    return await wpAlert('Canvas not available for export.', 'Export Error'), null;
    const item = document_wave.signalList();
  const num = document_wave.sampleCount();
  const n = 'function' == typeof getWaveCellWidth ? (getWaveCellWidth()) : 48;
  const val = (((('function') == typeof calculateDynamicNameWidth) ? (calculateDynamicNameWidth(ctx, item)) : 'function' == typeof getDynamicNameWidth ? getDynamicNameWidth() : 200) + (n * num) + 20);
  const tmp = (40 + (40 * item.length) + 20);
  const v0 = canvas.width;
  const v1 = canvas.height;
    canvas.width = val;
  canvas.height = tmp;
  window._wpExportMode = true;
  ('function') == typeof drawWaveform && drawWaveform();
  const v2 = document.createElement(('canvas'));
    v2.width = val;
  v2.height = tmp;
    const v3 = v2.getContext('2d');
  const v4 = getComputedStyle(document.body).getPropertyValue(('--canvas-bg')).trim() || '#ffffff';
  return v3.fillStyle = v4, v3.fillRect(0, 0, v2.width, v2.height), v3.drawImage(canvas, 0, 0), window._wpExportMode = false, {
    exportCanvas: v2,
    exportWidth: val,
    exportHeight: tmp,
    cleanup: () => {
                        canvas.width = v0;
            canvas.height = v1;
            (('function') == typeof drawWaveform) && (drawWaveform());
    }
  };
}
async function exportToPNG() {
  const item = await (prepareExportCanvas());
  if (!item)
    return;
    const {
      exportCanvas: val,
      exportWidth: tmp,
      exportHeight: v0,
      cleanup: v1
    } = item;
  const v2 = await wpPrompt(('Enter file name:'), ('waveform.png'), ('Export PNG'));
  if (!v2)
    return void (v1());
  let v3 = v2;
  v3.toLowerCase().endsWith(('.png')) || (v3 += ('.png'));
  try {
    const v4 = val.toDataURL('image/png');
    v1();
    const anchor = document.createElement('a');
        anchor.download = v3;
    anchor.href = v4;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    await wpAlert('PNG exported successfully!', ('Export PNG'));
  } catch (v4) {
        (v1());
    await wpAlert('Failed to export PNG: ' + v4.message, 'Export Error');
  }
}
async function exportToJPG() {
  const item = await prepareExportCanvas();
  if (!item)
    return;
    const {
      exportCanvas: val,
      exportWidth: tmp,
      exportHeight: v0,
      cleanup: v1
    } = item;
  const v2 = await (wpPrompt(('Enter file name:'), 'waveform.jpg', ('Export JPG')));
  if (!v2)
    return void (v1());
  let v3 = v2;
  v3.toLowerCase().endsWith(('.jpg')) || v3.toLowerCase().endsWith(('.jpeg')) || (v3 += '.jpg');
  try {
    const v4 = val.toDataURL('image/jpeg', 0.92);
    v1();
    const anchor = document.createElement('a');
        anchor.download = v3;
    anchor.href = v4;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    await (wpAlert(('JPG exported successfully!'), 'Export JPG'));
  } catch (v4) {
        v1();
    await (wpAlert('Failed to export JPG: ' + v4.message, ('Export Error')));
  }
}
'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', initPropertyEditor) : initPropertyEditor();
class SVGContext {
  constructor(item, val, tmp = {}) {
        this.width = item;
    this.height = val;
    this.elements = [];
    this.defs = [];
    this.defIds = 0;
    this.transparentBackground = false !== tmp.transparentBackground;
    this.isFirstFillRect = true;
    this.stateStack = [];
    this.state = {
      fillStyle: '#000000',
      strokeStyle: ('#000000'),
      lineWidth: 1,
      lineCap: ('butt'),
      lineJoin: ('miter'),
      lineDash: [],
      font: ('10px sans-serif'),
      textAlign: ('left'),
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      transform: {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0
      }
    };
    this.currentPath = '';
    this.pathStartX = 0;
    this.pathStartY = 0;
  }
  get fillStyle() {
        return this.state.fillStyle;
  }
  set fillStyle(item) {
        this.state.fillStyle = item;
  }
  get strokeStyle() {
        return this.state.strokeStyle;
  }
  set strokeStyle(item) {
        this.state.strokeStyle = item;
  }
  get lineWidth() {
        return this.state.lineWidth;
  }
  set lineWidth(item) {
        this.state.lineWidth = item;
  }
  get lineCap() {
        return this.state.lineCap;
  }
  set lineCap(item) {
        this.state.lineCap = item;
  }
  get lineJoin() {
        return this.state.lineJoin;
  }
  set lineJoin(item) {
        this.state.lineJoin = item;
  }
  get font() {
        return this.state.font;
  }
  set font(item) {
        this.state.font = item;
  }
  get textAlign() {
        return this.state.textAlign;
  }
  set textAlign(item) {
        this.state.textAlign = item;
  }
  get textBaseline() {
        return this.state.textBaseline;
  }
  set textBaseline(item) {
        this.state.textBaseline = item;
  }
  get globalAlpha() {
        return this.state.globalAlpha;
  }
  set globalAlpha(item) {
        this.state.globalAlpha = item;
  }
  save() {
        this.stateStack.push(JSON.parse(JSON.stringify(this.state)));
  }
  restore() {
        this.stateStack.length > 0 && (this.state = this.stateStack.pop());
  }
  translate(item, val) {
                this.state.transform.e += item;
        this.state.transform.f += val;
  }
  rotate(item) {
    const num = Math.cos(item);
    const n = Math.sin(item);
    const val = this.state.transform;
    const tmp = (val.a * num + (val.c * n));
    const v0 = (val.b * num + (val.d * n));
    const v1 = (val.c * num - val.a * n);
    const v2 = val.d * num - (val.b * n);
        val.a = tmp;
    val.b = v0;
    val.c = v1;
    val.d = v2;
  }
  scale(item, val) {
                this.state.transform.a *= item;
        this.state.transform.d *= val;
  }
  setLineDash(item) {
        this.state.lineDash = item || [];
  }
  getLineDash() {
        return this.state.lineDash;
  }
  beginPath() {
        this.currentPath = '';
  }
  moveTo(num, n) {
                this.currentPath += 'M ' + num + ' ' + n + ' ';
        this.pathStartX = num;
        this.pathStartY = n;
  }
  lineTo(num, n) {
        this.currentPath += 'L ' + num + ' ' + n + ' ';
  }
  quadraticCurveTo(num, n, item, val) {
        this.currentPath += 'Q ' + num + ' ' + n + ' ' + item + ' ' + val + ' ';
  }
  bezierCurveTo(num, n, item, val, tmp, v0) {
        this.currentPath += 'C ' + num + ' ' + n + ' ' + item + ' ' + val + ' ' + tmp + ' ' + v0 + ' ';
  }
  arc(num, n, item, val, tmp, v0 = false) {
    const v1 = (num + (item * Math.cos(val)));
    const v2 = (n + (item * Math.sin(val)));
    const v3 = (num + (item * Math.cos(tmp)));
    const v4 = (n + item * Math.sin(tmp));
    let v5 = (tmp - val);
        v0 && v5 > 0 && (v5 -= (2) * Math.PI);
    !v0 && (v5 < 0) && (v5 += (2) * Math.PI);
        const v6 = (Math.abs(v5) > Math.PI) ? 1 : 0;
    const v7 = v0 ? 0 : 1;
    if ('' !== this.currentPath && this.currentPath.includes('M') ? this.currentPath += 'L ' + v1 + ' ' + v2 + ' ' : this.currentPath += 'M ' + v1 + ' ' + v2 + ' ', Math.abs(v5) >= (2 * Math.PI) - (0.001)) {
            const v8 = (num + (item * Math.cos(val + Math.PI)));
      const v9 = n + (item * Math.sin((val + Math.PI)));
            this.currentPath += 'A ' + item + ' ' + item + ' 0 1 ' + v7 + ' ' + v8 + ' ' + v9 + ' ';
      this.currentPath += 'A ' + item + ' ' + item + ' 0 1 ' + v7 + ' ' + v1 + ' ' + v2 + ' ';
    } else
      this.currentPath += 'A ' + item + ' ' + item + ' 0 ' + v6 + ' ' + v7 + ' ' + v3 + ' ' + v4 + ' ';
  }
  closePath() {
    this.currentPath += 'Z ';
  }
  rect(num, n, item, val) {
    this.currentPath += 'M ' + num + ' ' + n + ' L ' + (num + item) + ' ' + n + ' L ' + (num + item) + ' ' + (n + val) + ' L ' + num + ' ' + (n + val) + ' Z ';
  }
  fill() {
        this.currentPath && this.elements.push(this._createPathElement(true, false));
  }
  stroke() {
        this.currentPath && this.elements.push(this._createPathElement(false, true));
  }
  fillRect(num, n, item, val) {
        if (this.transparentBackground && this.isFirstFillRect)
      return void (this.isFirstFillRect = false);
    const arr = [
      'x="' + num + '"',
      'y="' + n + '"',
      'width="' + item + '"',
      'height="' + val + '"',
      'fill="' + this._resolveFill() + '"'
    ];
        this.state.globalAlpha < 1 && arr.push('opacity="' + this.state.globalAlpha + '"');
    this.elements.push('<rect ' + arr.join(' ') + '/>');
  }
  strokeRect(num, n, item, val) {
    const arr = [
        'x="' + num + '"',
        'y="' + n + '"',
        'width="' + item + '"',
        'height="' + val + '"',
        ('fill="none"'),
        'stroke="' + this.state.strokeStyle + '"',
        'stroke-width="' + this.state.lineWidth + '"'
      ];
        this.state.lineDash.length > 0 && arr.push('stroke-dasharray="' + this.state.lineDash.join(' ') + '"');
    (this.state.globalAlpha < 1) && arr.push('opacity="' + this.state.globalAlpha + '"');
    this.elements.push('<rect ' + arr.join(' ') + '/>');
  }
  clearRect(num, n, item, val) {
        this.elements.push('<rect x="' + num + '" y="' + n + '" width="' + item + '" height="' + val + ('" fill="white"/>'));
  }
  fillText(item, num, n, val) {
    const tmp = (parseInt(this.state.font)) || 10;
    const v0 = this.state.font.replace(/^\d+px\s*/, '') || 'sans-serif';
    const v1 = this.state.font.includes(('bold')) ? 'bold' : 'normal';
    let str = ('start');
    ('center') === this.state.textAlign ? str = ('middle') : (('right') !== this.state.textAlign) && (('end') !== this.state.textAlign) || (str = 'end');
    let v2 = '0';
    ('middle') === this.state.textBaseline ? v2 = '0.35em' : (('top') === this.state.textBaseline) || ('hanging') === this.state.textBaseline ? v2 = '0.8em' : ('bottom') !== this.state.textBaseline && (('ideographic') !== this.state.textBaseline) || (v2 = ('-0.2em'));
    let v3 = '';
    const v4 = this.state.transform;
    (1 === v4.a) && (0 === v4.b) && 0 === v4.c && 1 === v4.d && (0 === v4.e) && 0 === v4.f || (v3 = ' transform="matrix(' + v4.a + ' ' + v4.b + ' ' + v4.c + ' ' + v4.d + ' ' + v4.e + ' ' + v4.f + ')"');
        const v5 = this._escapeXml(item);
    const arr = [
        'x="' + num + '"',
        'y="' + n + '"',
        'font-family="' + v0 + '"',
        'font-size="' + tmp + '"',
        'font-weight="' + v1 + '"',
        'fill="' + this._resolveFill() + '"',
        'text-anchor="' + str + '"',
        'dy="' + v2 + '"'
      ];
        v3 && arr.push(v3.trim());
    this.elements.push('<text ' + arr.join(' ') + '>' + v5 + '</text>');
  }
  strokeText(item, num, n, val) {
    const tmp = parseInt(this.state.font) || 10;
    const v0 = this.state.font.replace(/^\d+px\s*/, '') || ('sans-serif');
    let str = ('start');
    'center' === this.state.textAlign ? str = 'middle' : ('right') !== this.state.textAlign && 'end' !== this.state.textAlign || (str = ('end'));
    const v1 = this._escapeXml(item);
    this.elements.push('<text x="' + num + '" y="' + n + ('" font-family="') + v0 + ('" font-size="') + tmp + ('" fill="none" stroke="') + this.state.strokeStyle + ('" stroke-width="') + this.state.lineWidth + ('" text-anchor="') + str + '">' + v1 + '</text>');
  }
  measureText(item) {
    if (('undefined') != typeof document) {
      SVGContext._measureCtx || (SVGContext._measureCtx = document.createElement('canvas').getContext('2d'));
      const v0 = SVGContext._measureCtx;
      return v0.font = this.state.font, v0.measureText(item);
    }
    const num = parseInt(this.state.font) || 12;
    return { width: (item.length * num) * (0.6) };
  }
  clip(item) {
  }
  drawImage() {
  }
  _resolveFill() {
    const item = this.state.fillStyle;
    return (('string') == typeof item) ? item : ('#000000');
  }
  _createPathElement(item, val) {
    const arr = ['d="' + this.currentPath.trim() + '"'];
    return item ? arr.push('fill="' + this._resolveFill() + '"') : arr.push('fill="none"'), val && (arr.push('stroke="' + this.state.strokeStyle + '"'), arr.push('stroke-width="' + this.state.lineWidth + '"'), arr.push('stroke-linecap="' + this.state.lineCap + '"'), arr.push('stroke-linejoin="' + this.state.lineJoin + '"'), (this.state.lineDash.length > 0) && arr.push('stroke-dasharray="' + this.state.lineDash.join(' ') + '"')), this.state.globalAlpha < 1 && arr.push('opacity="' + this.state.globalAlpha + '"'), '<path ' + arr.join(' ') + '/>';
  }
  _escapeXml(item) {
    return ('string') != typeof item && (item = String(item)), item.replace(/&/g, '&amp;').replace(/</g, ('&lt;')).replace(/>/g, ('&gt;')).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  toSVG() {
        let num = '';
    return this.defs.length > 0 && (num = '<defs>\n    ' + this.defs.join('\n    ') + ('\n  </defs>\n  ')), '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + this.width + '" height="' + this.height + ('" viewBox="0 0 ') + this.width + ' ' + this.height + ('">\n  <title>WavePaint Waveform Export</title>\n  ') + num + this.elements.join('\n  ') + '\n</svg>';
  }
}
async function exportToSVG() {
  if (!document_wave)
    return void await (wpAlert(('Document not available for export.'), 'Export Error'));
  const item = await (wpPrompt('Enter file name:', ('waveform.svg'), 'Export SVG'));
  if (!item)
    return;
  let val = item;
  val.toLowerCase().endsWith('.svg') || (val += ('.svg'));
  try {
        const tmp = document_wave.signalList();
    const num = document_wave.sampleCount();
    const n = ('function') == typeof getWaveCellWidth ? getWaveCellWidth() : 48;
    const v0 = 40;
    const v1 = 40;
    const v2 = 20;
    const v3 = ((('function' == typeof getDynamicNameWidth) ? getDynamicNameWidth() : 200) + (n * num)) + v2;
    const v4 = v1 + (tmp.length * v0) + v2;
    const v5 = canvas;
    const v6 = ctx;
    const v7 = (canvas.width, canvas.height, new SVGContext(v3, v4));
        canvas = {
      width: v3,
      height: v4,
      getContext: () => v7
    };
    ctx = v7;
    window._wpExportMode = true;
    try {
      (('function') == typeof drawWaveform) && drawWaveform();
    } catch (v10) {
    }
        window._wpExportMode = false;
    canvas = v5;
    ctx = v6;
    ('function' == typeof drawWaveform) && drawWaveform();
        const v8 = v7.toSVG();
    const blob = new Blob([v8], { type: ('image/svg+xml') });
    const v9 = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
        anchor.download = val;
    anchor.href = v9;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(v9);
    await (wpAlert('SVG exported successfully!', ('Export SVG')));
  } catch (tmp) {
    await (wpAlert('Failed to export SVG: ' + tmp.message, 'Export Error'));
  }
}
async function openLoadExampleDialog() {
  const arr = getExampleList();
  const el = document.createElement('div');
  el.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
  const v0 = document.createElement('div');
  v0.style.cssText = 'background: var(--menu-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; min-width: 320px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
  const v1 = document.createElement('h3');
    v1.textContent = 'Load Example';
  v1.style.cssText = ('margin: 0 0 15px 0; color: var(--text-color); font-size: 16px;');
  v0.appendChild(v1);
  const v2 = document.createElement('p');
    v2.textContent = ('Select an example waveform to load:');
  v2.style.cssText = 'margin: 0 0 15px 0; color: var(--text-color); font-size: 13px;';
  v0.appendChild(v2);
  const v3 = document.createElement(('select'));
    v3.style.cssText = ('width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color); font-size: 13px; margin-bottom: 20px; cursor: pointer;');
  arr.forEach(item => {
    const val = document.createElement(('option'));
        val.value = item.id;
    val.textContent = item.name;
    v3.appendChild(val);
  });
  v0.appendChild(v3);
  const v4 = document.createElement(('div'));
  v4.style.cssText = ('display: flex; justify-content: flex-end; gap: 10px;');
  const v5 = document.createElement(('button'));
    v5.textContent = ('Cancel');
  v5.style.cssText = 'padding: 8px 16px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color); cursor: pointer;';
  v4.appendChild(v5);
  const v6 = document.createElement(('button'));
  return v6.textContent = 'Load', v6.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: var(--accent); color: #fff; cursor: pointer; font-weight: 500;', v4.appendChild(v6), v0.appendChild(v4), el.appendChild(v0), document.body.appendChild(el), setTimeout(() => v3.focus(), 0), new Promise(item => {
    const val = () => {
                document.body.removeChild(el);
      };
        v5.addEventListener('click', () => {
                        (val());
            item(false);
    });
    el.addEventListener(('click'), ev => {
      (ev.target === el) && (val(), (item(false)));
    });
    v6.addEventListener('click', async () => {
            const num = v3.value;
      const tmp = arr.find(v7 => v7.id === num);
            val();
      tmp ? await (loadExample(document_wave, num)) ? (selectedSignalIndex = -1, document.getElementById(('sample-spin')).value = document_wave.m_sampleCount, document.getElementById(('substep-spin')).value = document_wave.m_subStepCount, drawWaveform(), (updateSidePanels()), (updateColorPicker()), await wpAlert('Example \'' + tmp.name + ('\' loaded successfully!'), ('Load Example')), (item(true))) : (await (wpAlert('Failed to load example \'' + tmp.name + '\'.', 'Load Example')), (item(false))) : item(false);
    });
    v3.addEventListener('keydown', tmp => {
            ('Enter') === tmp.key ? v6.click() : ('Escape' === tmp.key) && v5.click();
    });
  });
}
function initMenuHandlers() {
    document.querySelectorAll('[data-action]').forEach(item => {
    item.addEventListener('click', async function (ev) {
            ev.preventDefault();
      const val = this.getAttribute(('data-action'));
      await (handleAction(val));
      const tmp = this.closest(('.dropdown-content'));
            tmp && (tmp.style.display = ('none'), tmp.querySelectorAll('.submenu-content').forEach(v0 => {
                v0.style.display = 'none';
      }));
      document.querySelectorAll('#menu-bar .submenu').forEach(v0 => {
                                v0.style.visibility = '';
                v0.style.display = '';
      });
    });
  });
  document.querySelectorAll(('#menu-bar .submenu li')).forEach(el => {
    const num = el.textContent.trim();
    'New' === num ? el.addEventListener('click', async function (ev) {
                        ev.preventDefault();
            await wpConfirm(('Create a new waveform? All unsaved changes will be lost.'), ('New File')) && (document_wave = new WaveDocument(), selectedSignalIndex = -1, (drawWaveform()), (updateSidePanels()), (updateColorPicker()));
            document.querySelectorAll(('#menu-bar .submenu')).forEach(item => {
                                item.style.visibility = '';
                item.style.display = '';
      });
    }) : ('Open' === num) ? el.addEventListener('click', async function (ev) {
                        ev.preventDefault();
            await (openFile(document_wave)) && (selectedSignalIndex = -1, document.getElementById(('sample-spin')).value = document_wave.m_sampleCount, document.getElementById('substep-spin').value = document_wave.m_subStepCount, drawWaveform(), updateSidePanels(), updateColorPicker(), await wpAlert('File loaded successfully!', ('Open File')));
            document.querySelectorAll('#menu-bar .submenu').forEach(item => {
                                item.style.visibility = '';
                item.style.display = '';
      });
    }) : (('Save As') === num) ? el.addEventListener('click', async function (ev) {
            ev.preventDefault();
      const item = await wpPrompt('Enter file name:', ('waveform.wp'), 'Save File');
            item && (await saveToFile(document_wave, item) ? await (wpAlert('File saved successfully!', 'Save File')) : await wpAlert(('Failed to save file.'), ('Save File')));
      document.querySelectorAll('#menu-bar .submenu').forEach(val => {
                                val.style.visibility = '';
                val.style.display = '';
      });
    }) : (('Copy Share Link') === num) ? el.addEventListener('click', async function (ev) {
                        ev.preventDefault();
            document.querySelectorAll(('#menu-bar .submenu')).forEach(item => {
                                item.style.visibility = '';
                item.style.display = '';
      });
      try {
        const len = await (createShareLink(document_wave));
        let item = false;
        try {
                    await navigator.clipboard.writeText(len);
          item = true;
        } catch (val) {
        }
        const n = (len.length > 8000) ? ('\n\n(Heads up: this diagram is large, so the link is long \u2014 some chat apps may truncate it.)') : '';
        item ? await wpAlert(('Share link copied to clipboard!\n\n' + len + n), 'Share Link') : await wpPrompt(('Copy this share link:'), len, 'Share Link');
      } catch (item) {
        await (wpAlert('Could not create a share link.', ('Share Link')));
      }
    }) : ('Load Example' === num) && el.addEventListener('click', async function (ev) {
                        ev.preventDefault();
            await (openLoadExampleDialog());
            document.querySelectorAll('#menu-bar .submenu').forEach(item => {
                                item.style.visibility = '';
                item.style.display = '';
      });
    });
  });
}
function initDropdownHandlers() {
    document.addEventListener(('click'), function (ev) {
        const val = document.querySelector(('.dropdown'));
    const tmp = document.querySelector(('.dropdown-content'));
    (val && tmp) && !val.contains(ev.target) && 'block' === tmp.style.display && (tmp.style.display = ('none'), tmp.querySelectorAll(('.submenu-content')).forEach(v0 => {
            v0.style.display = 'none';
    }));
  });
  document.querySelectorAll('.submenu').forEach(val => {
    const el = val.querySelector(('.submenu-content'));
    let tmp;
        val.addEventListener(('mouseenter'), function () {
                        tmp && (clearTimeout(tmp));
            el && (el.style.display = ('block'));
    });
    val.addEventListener('mouseleave', function (ev) {
      const v0 = ev.relatedTarget;
      el && !el.contains(v0) && (tmp = (setTimeout(() => {
    el && (el.style.display = 'none');
}, 300)));
    });
    el && (el.addEventListener('mouseenter', function () {
      tmp && (clearTimeout(tmp));
    }), el.addEventListener(('mouseleave'), function (ev) {
      const v0 = ev.relatedTarget;
      val.contains(v0) || (tmp = setTimeout(() => {
                el.style.display = 'none';
      }, 300));
    }));
  });
  const item = document.querySelector(('.dropdown'));
  if (item) {
        const el = item.querySelector('.dropdown-content');
    const v0 = item.querySelector('.tool-btn');
    let val;
        v0 && v0.addEventListener('click', function (ev) {
            if (ev.stopPropagation(), ('block' === el.style.display))
        el.style.display = 'none', el.querySelectorAll(('.submenu-content')).forEach(tmp => tmp.style.display = 'none');
      else {
        const tmp = v0.getBoundingClientRect();
                el.style.position = 'fixed';
        el.style.top = tmp.bottom + 'px';
        el.style.left = tmp.left + 'px';
        el.style.zIndex = ('1150');
        el.style.display = ('block');
      }
    });
    item.addEventListener('mouseleave', function (tmp) {
            ('block') === el.style.display && (val = (setTimeout(() => {
        el.style.display = ('none');
    el.querySelectorAll('.submenu-content').forEach(v1 => v1.style.display = 'none');
}, 100)));
    });
    item.addEventListener(('mouseenter'), function () {
      val && clearTimeout(val);
    });
    el.addEventListener('mouseenter', function () {
            val && (clearTimeout(val));
    });
  }
  document.addEventListener('click', function (ev) {
        ev.target.closest('.dropdown') || document.querySelectorAll('.dropdown-content').forEach(val => {
                        val.style.display = 'none';
            val.querySelectorAll('.submenu-content').forEach(tmp => tmp.style.display = 'none');
    });
  });
}
function initToolbarHandlers() {
  const item = document.getElementById(('tool-open'));
  const val = document.getElementById(('tool-save'));
    item && (item.onclick = async function () {
        try {
      await (openFile(document_wave)) && (selectedSignalIndex = -1, document.getElementById('sample-spin').value = document_wave.m_sampleCount, document.getElementById(('substep-spin')).value = document_wave.m_subStepCount, drawWaveform(), updateSidePanels(), updateColorPicker(), await wpAlert(('File loaded successfully!'), ('Open File')));
    } catch (v4) {
    }
  });
  val && (val.onclick = async function () {
        try {
      const v4 = await (wpPrompt('Enter file name:', 'waveform.wp', ('Save File')));
      v4 && (await saveToFile(document_wave, v4) ? await (wpAlert('File saved successfully!', 'Save File')) : await (wpAlert(('Failed to save file.'), ('Save File'))));
    } catch (v4) {
    }
  });
    const tmp = document.querySelector(('.tool-btn[title="Zoom Out"]'));
  const el = document.querySelector(('.tool-btn[title="Zoom In"]'));
  const v0 = document.querySelector('.tool-btn[title="Zoom Fit"]');
    tmp && tmp.addEventListener('click', () => {
        (('function') == typeof zoomOut) && zoomOut();
  });
  el && el.addEventListener(('click'), () => {
        (('function') == typeof zoomIn) && (zoomIn());
  });
  v0 && v0.addEventListener(('click'), () => {
        ('function' == typeof zoomFit) && (zoomFit());
  });
    const v1 = document.getElementById('tool-undo');
  const v2 = document.getElementById('tool-redo');
  const fn = v4 => {
            v4 && ((selectedSignalIndex >= document_wave.signalList().length) && (selectedSignalIndex = -1), (drawWaveform()), updateSidePanels(), updateColorPicker());
    };
    v1 && v1.addEventListener('click', () => {
    const v4 = document_wave.undo();
    (fn(v4));
  });
  v2 && v2.addEventListener(('click'), () => {
    const v4 = document_wave.redo();
    (fn(v4));
  });
  document.querySelectorAll(('.tool-btn')).forEach(v4 => {
        v4.addEventListener('click', function () {
      const v5 = this.getAttribute(('data-tool'));
      v5 && setCurrentTool(v5);
    });
  });
  const v3 = document.getElementById(('tool-paint-color'));
    v3 && v3.addEventListener('click', async function () {
    const v4 = await openColorPicker(getCurrentPaintColor(), v3, 'Paint Color');
    v4 && (selectedPaintColor = v4, (updatePaintColorBox()));
  });
  updatePaintColorBox();
  (initDropdownHandlers());
  document.getElementById('sample-spin').addEventListener('change', function () { // [A6-沉核心] 失焦/回车提交：逐键 input 全量重绘会闪烁，故绑 change
                document_wave.setSampleCount((parseInt(this.value)));
        (drawWaveform());
  });
  document.getElementById('substep-spin').addEventListener('change', function () { // [A6-沉核心] 子步同：change 提交
                document_wave.setSubStepCount(parseInt(this.value));
        drawWaveform();
  });
  document.getElementById('signal-color').addEventListener('input', function () {
        (selectedSignalIndex >= 0) && (document_wave.setSignalColor(selectedSignalIndex, this.value), (drawWaveform()));
  });
}
function initCanvasHandlers() {
    canvas.addEventListener('mousedown', function (ev) {
        (0 === ev.button) && (isMouseDown = true, (('function') == typeof resetWaveDromUserEditing) && (resetWaveDromUserEditing()), ('undefined') != typeof WaveDromIO && WaveDromIO.clearDocumentWaveDromPreserved && WaveDromIO.clearDocumentWaveDromPreserved(document_wave), (handleMouseEvent(ev)));
  });
  canvas.addEventListener('mousemove', function (item) {
        (isMouseDown || ('arrow') === currentTool && arrowHasStart || (('marker') === currentTool) || ('time-jump') === currentTool || ('time-span' === currentTool) || (('text') === currentTool) || (('cut') === currentTool)) && (handleMouseEvent(item));
  });
  canvas.addEventListener(('mouseup'), function (ev) {
    0 === ev.button && ((handleMouseEvent(ev)), isMouseDown = false, lastSampleIndex = -1, lastSignalIndex = -1);
  });
  document.addEventListener('mouseup', function (ev) {
        0 === ev.button && isMouseDown && (isMouseDown = false, 'function' == typeof endSignalDrag && endSignalDrag());
  });
  canvas.addEventListener('contextmenu', handleCanvasContextMenu);
  canvas.addEventListener(('wheel'), function (ev) {
        ev.ctrlKey && (ev.preventDefault(), (ev.deltaY < 0) ? 'function' == typeof zoomIn && (zoomIn()) : 'function' == typeof zoomOut && (zoomOut()));
  }, { passive: false });
  canvas.addEventListener(('dblclick'), async function (ev) {
        const item = canvas.getBoundingClientRect();
    const num = ev.clientX - item.left;
    const n = ev.clientY - item.top;
    const val = document_wave.signalList();
    const tmp = Math.floor(((n - 40) / 40));
    if (tmp >= val.length && 'function' == typeof showAddSignalContextMenu)
      return void showAddSignalContextMenu(ev.clientX, ev.clientY);
    if ((num >= (('function') == typeof getDynamicNameWidth ? (getDynamicNameWidth()) : 200)))
      return;
    if (tmp < 0 || (tmp >= val.length))
      return;
    const v0 = val[tmp];
    if ((v0.type === SignalType.BlankRow))
      return;
    const v1 = await wpPrompt(('Enter new signal name:'), v0.name, ('Rename Signal'));
    v1 && v1.trim() && (document_wave.setSignalName(tmp, v1.trim()), drawWaveform());
  });
}
function initKeyboardHandlers() {
  document.addEventListener('keydown', function (ev) {
        if (wpModalState.isOpen)
      return;
    const item = ev.target;
    if (item && (('INPUT') === item.tagName || ('TEXTAREA' === item.tagName) || item.isContentEditable) && 'Escape' !== ev.key)
      return;
    const val = navigator.platform.toUpperCase().includes('MAC') ? ev.metaKey : ev.ctrlKey;
    if (val && (('a' === ev.key) || 'A' === ev.key)) {
      const arr = document_wave.signalList();
      if (arr && (arr.length > 0))
        return ev.preventDefault(), selectedSignalIndices = arr.map((v0, v1) => v1), lastSelectedSignalIndex = arr.length - (1), void (drawWaveform());
    }
    if (val && ('z' === ev.key || ('Z' === ev.key)))
      return ev.preventDefault(), void (document_wave.undo() && (selectedSignalIndex >= document_wave.signalList().length && (selectedSignalIndex = -1), drawWaveform(), updateSidePanels(), updateColorPicker()));
    if (val && ('y' === ev.key || ('Y' === ev.key)))
      return ev.preventDefault(), void (document_wave.redo() && (selectedSignalIndex >= document_wave.signalList().length && (selectedSignalIndex = -1), (drawWaveform()), (updateSidePanels()), (updateColorPicker())));
    if (val && ('c' === ev.key || 'C' === ev.key)) {
      if ((selectedSignalIndices.length > 0)) {
        ev.preventDefault();
                const v0 = document_wave.signalList();
        const arr = [];
        for (const v1 of selectedSignalIndices)
          arr.push(cloneSignalData(v0[v1]));
        return signalClipboard = {
          signals: arr,
          count: arr.length
        }, void (clipboard = null);
      }
      if (rangeSelActive && (('select') === currentTool))
        return ev.preventDefault(), signalClipboard = null, void copySelection();
    }
    if (val && (('v' === ev.key) || ('V' === ev.key))) {
      if (('select') === currentTool && clipboard && clipboard.signals && clipboard.signals.length > 0)
        return ev.preventDefault(), void (pasteClipboard());
      if (signalClipboard && signalClipboard.signals && signalClipboard.signals.length > 0 && (selectedSignalIndices.length > 0)) {
                ev.preventDefault();
        document_wave.pushUndoSnapshot();
        const arr = document_wave.signalList();
        let count = (Math.max(...selectedSignalIndices) + 1);
        for (const v0 of signalClipboard.signals) {
          const v1 = cloneSignalData(v0, ' (copy)');
                    arr.splice(count, 0, v1);
          count++;
        }
        return selectedSignalIndices = [], lastSelectedSignalIndex = -1, (drawWaveform()), void updateSidePanels();
      }
    }
    if (val && (('x' === ev.key) || ('X' === ev.key)) && rangeSelActive && ('select' === currentTool))
      return ev.preventDefault(), copySelection(), void deleteSelection();
    if ('Delete' === ev.key && rangeSelActive && 'select' === currentTool)
      return ev.preventDefault(), void (deleteSelection());
    if ('Escape' === ev.key) {
      const el = document.querySelector(('.context-menu'));
            el && el.remove();
      ('function') == typeof clearObjectSelection && clearObjectSelection();
      rangeSelActive || rangeSelecting || !clipboard || (clipboard = null, pastePreviewSignal = -1, pastePreviewSample = -1, (drawWaveform()));
      cancelCurrentTool();
      selectedSignalIndices.length > 0 && (selectedSignalIndices = [], lastSelectedSignalIndex = -1, drawWaveform());
      currentTool = 'none';
      document.querySelectorAll('.tool-btn').forEach(v0 => {
                v0.classList.remove(('active'));
      });
      drawWaveform();
      ev.preventDefault();
    }
    if ((('Delete') === ev.key) && selectedSignalIndices.length > 0 && !rangeSelActive) {
      ev.preventDefault();
      const num = selectedSignalIndices.length;
      (wpConfirm((num > 1) ? 'Are you sure you want to delete ' + num + ' signals?' : ('Are you sure you want to delete the selected signal?'), 'Delete Signal')).then(v0 => {
                v0 && (document_wave.removeSignals(selectedSignalIndices), clearSignalSelection(), drawWaveform());
      });
    }
    const tmp = !ev.ctrlKey && !ev.metaKey && !ev.altKey;
    if (tmp && (('+' === ev.key) || ('=' === ev.key)))
      return ev.preventDefault(), void ('function' == typeof zoomIn && (zoomIn()));
    if (tmp && ('-' === ev.key || '_' === ev.key))
      return ev.preventDefault(), void ((('function') == typeof zoomOut) && (zoomOut()));
    if (tmp) {
      const v0 = {
        p: 'paint',
        e: ('erase'),
        s: ('select'),
        a: ('arrow'),
        r: ('time-span'),
        m: ('marker'),
        j: 'time-jump',
        t: 'text',
        c: 'cut',
        v: 'select-object'
      }[ev.key.toLowerCase()];
      v0 && (ev.preventDefault(), (setCurrentTool(v0)), (drawWaveform()));
    }
  });
}
function mapElementTypeToSelectableType(item) {
  if ((void 0 === SelectableType))
    return null;
  switch (item) {
  case ('arrow'):
    return SelectableType.Arrow;
  case 'marker':
    return SelectableType.Marker;
  case 'timeJump':
    return SelectableType.TimeJump;
  case 'timeSpan':
    return SelectableType.TimeSpan;
  case ('textAnnotation'):
    return SelectableType.TextAnnotation;
  default:
    return null;
  }
}
function selectElementForContextMenu(item) {
  if (('function' == typeof selectObject) && (void 0 !== SelectableType)) {
    switch (item.type) {
    case 'arrow':
      selectObject(SelectableType.Arrow, item.element.id);
      break;
    case 'marker':
      selectObject(SelectableType.Marker, item.element.id);
      break;
    case ('timeJump'):
      (selectObject(SelectableType.TimeJump, item.element.id));
      break;
    case ('timeSpan'):
      (selectObject(SelectableType.TimeSpan, item.element.id));
      break;
    case ('textAnnotation'):
      (selectObject(SelectableType.TextAnnotation, item.element.id));
    }
    (drawWaveform());
  }
}
function collectElementsAtPoint(item, val) {
  const arr = [];
  if (('function') == typeof findArrowNearPoint) {
    const num = findArrowNearPoint(item, val);
    if ((num >= 0)) {
      const tmp = document_wave.arrowList().find(v0 => v0.id === num);
      tmp && arr.push({
        type: ('arrow'),
        element: tmp,
        label: 'Arrow #' + num
      });
    }
  }
  if (('function' == typeof hitTestMarker)) {
    const tmp = (hitTestMarker(item, val));
    tmp && arr.push({
      type: 'marker',
      element: tmp,
      label: 'Marker #' + tmp.id
    });
  }
  if ('function' == typeof hitTestTimeJump) {
    const tmp = hitTestTimeJump(item, val);
    tmp && arr.push({
      type: 'timeJump',
      element: tmp,
      label: 'Time Jump #' + tmp.id
    });
  }
  if (('function' == typeof hitTestTimeSpan)) {
    const tmp = hitTestTimeSpan(item, val);
    tmp && arr.push({
      type: ('timeSpan'),
      element: tmp,
      label: 'Time Span #' + tmp.id
    });
  }
  if ((('function') == typeof hitTestTextAnnotation)) {
    const tmp = (hitTestTextAnnotation(item, val));
    if (tmp) {
      const v0 = tmp.text ? 'Text: "' + tmp.text.substring(0, 15) + ((tmp.text.length > 15) ? '...' : '') + '"' : 'Text #' + tmp.id;
      arr.push({
        type: 'textAnnotation',
        element: tmp,
        label: v0
      });
    }
  }
  return arr;
}
function showCombinedContextMenu(num, n, arr) {
  const item = document.querySelector('.context-menu');
    item && item.remove();
  ('function') == typeof setSelectedObjects && (setSelectedObjects(arr.map(cur => ({
    type: mapElementTypeToSelectableType(cur.type),
    id: cur.element.id
}))));
  const el = document.createElement(('div'));
  function val(v4) {
    const v5 = document.createElement(('div'));
        v5.className = 'submenu-container';
    v5.style.position = 'relative';
    const v6 = document.createElement('div');
        v6.innerHTML = v4 + (' <span style="float: right; opacity: 0.5;">\u25B6</span>');
    v6.style.padding = '8px 12px';
    v6.style.cursor = 'pointer';
    v6.style.color = 'var(--text-color)';
    v5.appendChild(v6);
    const v7 = document.createElement('div');
    return v7.className = ('context-menu'), v7.style.position = ('absolute'), v7.style.left = ('100%'), v7.style.top = ('-6px'), v7.style.display = 'none', v7.style.minWidth = '160px', v7.style.background = 'var(--bg-color)', v7.style.border = '1px solid var(--border-color)', v7.style.borderRadius = '4px', v7.style.boxShadow = ('0 2px 8px rgba(0,0,0,0.3)'), v7.style.zIndex = '5501', v5.appendChild(v7), v5.addEventListener(('mouseenter'), () => {
                        v6.style.background = ('var(--accent-color)');
            v7.style.display = ('block');
    }), v5.addEventListener(('mouseleave'), () => {
                        v6.style.background = ('transparent');
            v7.style.display = ('none');
    }), {
      container: v5,
      submenu: v7
    };
  }
  function tmp(v4, v5, v6, v7) {
    const v8 = document.createElement(('div'));
    return v8.textContent = v5, v8.style.padding = ('8px 12px'), v8.style.cursor = ('pointer'), v8.style.color = 'var(--text-color)', v8.addEventListener(('mouseenter'), () => {
                        v8.style.background = 'var(--accent-color)';
            v7 && selectElementForContextMenu(v7);
    }), v8.addEventListener('mouseleave', () => {
            v8.style.background = 'transparent';
    }), v8.addEventListener(('click'), ev => {
                        ev.stopPropagation();
            v6();
            el.parentNode && document.body.removeChild(el);
    }), v4.appendChild(v8), v8;
  }
    el.className = 'context-menu';
  el.style.position = 'fixed';
  el.style.left = (num + 'px');
  el.style.top = n + 'px';
  el.style.background = ('var(--bg-color)');
  el.style.border = '1px solid var(--border-color)';
  el.style.borderRadius = ('4px');
  el.style.boxShadow = ('0 2px 8px rgba(0,0,0,0.3)');
  el.style.zIndex = ('5500');
  el.style.minWidth = ('180px');
  const v0 = val(('Delete'));
  for (const v4 of arr)
    tmp(v0.submenu, v4.label, () => {
            (deleteElement(v4));
    }, v4);
  el.appendChild(v0.container);
  const v1 = arr.filter(v4 => 'textAnnotation' === v4.type);
  if (v1.length > 0) {
    const v4 = val('Edit');
    for (const v5 of v1)
      (tmp(v4.submenu, v5.label, async () => {
    await editElementProperties(v5);
}, v5));
    el.appendChild(v4.container);
  }
  const v2 = (val('Change Color'));
  for (const v4 of arr)
    (tmp(v2.submenu, v4.label, async () => {
    await changeElementColor(v4);
}, v4));
  function v3(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener(('click'), v3), ('function') == typeof clearObjectSelection && ((clearObjectSelection()), drawWaveform()));
  }
    el.appendChild(v2.container);
  document.body.appendChild(el);
  setTimeout(() => {
        document.addEventListener('click', v3);
  }, 10);
}
function deleteElement(item) {
  switch (item.type) {
  case ('arrow'):
    document_wave.subArrowById(item.element.id);
    break;
  case ('marker'):
    document_wave.subMarkerById(item.element.id);
    break;
  case ('timeJump'):
    document_wave.subTimeJumpById(item.element.id);
    break;
  case 'timeSpan':
    document_wave.subTimeSpanMarkerById(item.element.id);
    break;
  case 'textAnnotation':
    document_wave.removeTextAnnotation(item.element.id);
  }
  drawWaveform();
}
async function changeElementColor(item) {
    let val;
  let tmp;
  let v0;
  switch (item.type) {
  case 'arrow':
    val = getComputedStyle(document.body).getPropertyValue(('--arrow-color')).trim() || '#ff6b00', tmp = item.element.color || val, v0 = ('Arrow Color');
    break;
  case ('marker'):
    val = '#00a0ff', tmp = item.element.color || val, v0 = 'Marker Color';
    break;
  case 'timeJump':
    val = ('#888888'), tmp = item.element.color || val, v0 = 'Time Jump Color';
    break;
  case ('timeSpan'):
    val = getComputedStyle(document.body).getPropertyValue(('--arrow-color')).trim() || ('#ff6b00'), tmp = item.element.color || val, v0 = 'Time Span Color';
    break;
  case 'textAnnotation':
    val = getComputedStyle(document.body).getPropertyValue('--label-text-color').trim() || '#ffffff', tmp = item.element.color || val, v0 = ('Text Color');
    break;
  default:
    return;
  }
  const v1 = await (openColorPicker(tmp, null, v0));
  if (v1) {
    switch (item.type) {
    case 'arrow':
      document_wave.setArrowColorById(item.element.id, v1);
      break;
    case ('marker'):
      document_wave.setMarkerColorById(item.element.id, v1);
      break;
    case ('timeJump'):
      document_wave.setTimeJumpColorById(item.element.id, v1);
      break;
    case ('timeSpan'):
      document_wave.setTimeSpanMarkerColor(item.element.id, v1);
      break;
    case 'textAnnotation':
      'function' == typeof document_wave.setTextAnnotationColor && document_wave.setTextAnnotationColor(item.element.id, v1);
    }
    drawWaveform();
  }
}
async function editElementProperties(item) {
  (('textAnnotation') === item.type) && ('function') == typeof showTextAnnotationPropertiesDialog && await (showTextAnnotationPropertiesDialog(item.element));
}
function handleCanvasContextMenu(ev) {
  ev.preventDefault();
    const item = canvas.getBoundingClientRect();
  const num = ev.clientX - item.left;
  const n = ev.clientY - item.top;
  const val = document_wave.signalList();
  const tmp = collectElementsAtPoint(num, n);
  if ((tmp.length > 1))
    return void (showCombinedContextMenu(ev.clientX, ev.clientY, tmp));
  if (1 === tmp.length) {
    const v4 = tmp[0];
    switch ((selectElementForContextMenu(v4)), v4.type) {
    case 'arrow':
      return void showArrowContextMenu(ev.clientX, ev.clientY, v4.element.id);
    case 'marker':
      return void showMarkerContextMenu(ev.clientX, ev.clientY, v4.element);
    case 'timeJump':
      return void (showTimeJumpContextMenu(ev.clientX, ev.clientY, v4.element));
    case ('timeSpan'):
      return void (showTimeSpanContextMenu(ev.clientX, ev.clientY, v4.element));
    case ('textAnnotation'):
      return void showTextAnnotationContextMenu(ev.clientX, ev.clientY, v4.element);
    }
  }
  const v0 = Math.floor(((n - 40) / 40));
  if (v0 < 0 || (v0 >= val.length))
    return void showAddSignalContextMenu(ev.clientX, ev.clientY);
    const v1 = val[v0];
  const v2 = ('function' == typeof getDynamicNameWidth) ? (getDynamicNameWidth()) : 200;
  const v3 = (num >= v2);
  if (v3 && v1.type === SignalType.Vector) {
    const v4 = document_wave.getSignalEffectiveSampleCount ? document_wave.getSignalEffectiveSampleCount(v1) : v1.values.length;
    let v5;
    if (('function' == typeof mapToSignalSample)) {
      const v8 = mapToSignalSample(num, n);
      v5 = v8 ? v8.sampleIndex : -1;
    } else {
            const v8 = v1.subSteps && (v1.subSteps > 0) ? v1.subSteps : document_wave.subStepCount();
      const v9 = (((('function') == typeof getWaveCellWidth) ? getWaveCellWidth() : waveCellWidth) / (v8 + 1));
      v5 = Math.floor((num - v2) / v9);
    }
    if (v5 < 0 || (v5 >= v4))
      return;
    if (-1 === v1['values'][v5])
      return;
    const v6 = v1['labels'][v5] ? v1['labels'][v5].toLowerCase().trim() : '';
    if (('l' === v6) || 'h' === v6 || 'z' === v6)
      return;
    const v7 = findVectorSegmentBounds(v1, v5);
    if (!v7)
      return;
    return void showSegmentPropertiesMenu(ev.clientX, ev.clientY, v0, v5, v7);
  }
  v3 && v1.type !== SignalType.BlankRow || showSignalContextMenu(ev.clientX, ev.clientY, v0, v1);
}
function showAddSignalContextMenu(num, n) {
  document.querySelectorAll('.context-menu').forEach(v6 => v6.remove());
  const el = document.createElement(('div'));
  function item(v6, v7, v8) {
    const v9 = document.createElement(('div'));
    return v9.className = 'menu-item', v9.textContent = v7, v9.addEventListener(('click'), ev => {
                        ev.stopPropagation();
            (v8());
            el.parentElement && document.body.removeChild(el);
    }), v6.appendChild(v9), v9;
  }
  function val(v6) {
    const v7 = document.createElement('div');
        v7.className = 'context-menu-separator';
    v7.style.height = ('1px');
    v7.style.background = 'var(--border-color)';
    v7.style.margin = ('6px 12px');
    v7.style.padding = '0';
    v7.style.cursor = 'default';
    v6.appendChild(v7);
  }
    el.className = 'context-menu';
  el.style.position = 'fixed';
  el.style.left = num + 'px';
  el.style.top = n + 'px';
  el.style.zIndex = '5500';
  const v0 = document.createElement('div');
    v0.className = 'submenu-container';
  v0.style.position = ('relative');
  const tmp = document.createElement(('div'));
    tmp.innerHTML = 'Add Signal <span style="float: right; opacity: 0.5;">\u25B6</span>';
  v0.appendChild(tmp);
  const v1 = document.createElement(('div'));
    v1.className = 'context-menu';
  v1.style.position = ('absolute');
  v1.style.left = '100%';
  v1.style.top = ('-6px');
  v1.style.display = ('none');
  v1.style.minWidth = '160px';
  v0.appendChild(v1);
  v0.addEventListener(('mouseenter'), () => {
        v1.style.display = ('block');
  });
  v0.addEventListener('mouseleave', () => {
        v1.style.display = 'none';
  });
  item(v1, ('Bit Signal'), async () => {
    const v6 = await (wpPrompt(('Enter bit signal name:'), ('Bit Signal'), 'Add Bit Signal'));
    if (v6) {
      const v7 = document_wave.addBitSignal(v6);
            'function' == typeof getSelectedPaintColor && (getSelectedPaintColor()) && document_wave.setSignalColor(v7, (getSelectedPaintColor()));
      (drawWaveform());
      updateSidePanels();
    }
  });
  (item(v1, 'Vector Signal', async () => {
    const v6 = await wpPrompt('Enter vector signal name:', ('Vector Signal'), 'Add Vector Signal');
    if (v6) {
        const v7 = document_wave.addVectorSignal(v6);
                ('function') == typeof getSelectedPaintColor && getSelectedPaintColor() && document_wave.setSignalColor(v7, getSelectedPaintColor());
        (drawWaveform());
        updateSidePanels();
    }
}));
  (val(v1));
  const v2 = document.createElement('div');
    v2.className = 'submenu-container';
  v2.style.position = ('relative');
  const v3 = document.createElement(('div'));
    v3.innerHTML = 'Predefined Signals <span style="float: right; opacity: 0.5;">\u25B6</span>';
  v2.appendChild(v3);
  const v4 = document.createElement('div');
    v4.className = 'context-menu';
  v4.style.position = ('absolute');
  v4.style.left = '100%';
  v4.style.top = ('-6px');
  v4.style.display = 'none';
  v4.style.minWidth = '160px';
  v2.appendChild(v4);
  v2.addEventListener(('mouseenter'), () => {
        v4.style.display = ('block');
  });
  v2.addEventListener('mouseleave', () => {
    v4.style.display = 'none';
  });
  const arr = [
    {
      name: ('Clock'),
      fn: 'function' == typeof addClockSignalDialog ? addClockSignalDialog : null
    },
    {
      name: 'Counter',
      fn: 'function' == typeof addCounterSignalDialog ? addCounterSignalDialog : null
    },
    {
      name: ('Reset'),
      fn: ('function' == typeof addResetSignalDialog) ? addResetSignalDialog : null
    },
    {
      name: ('Pulse'),
      fn: ('function') == typeof addPulseSignalDialog ? addPulseSignalDialog : null
    },
    {
      name: ('Strobe/Enable'),
      fn: (('function') == typeof addStrobeSignalDialog) ? addStrobeSignalDialog : null
    },
    {
      name: 'PWM',
      fn: ('function' == typeof addPWMSignalDialog) ? addPWMSignalDialog : null
    },
    {
      name: ('Ramp'),
      fn: ('function' == typeof addRampSignalDialog) ? addRampSignalDialog : null
    },
    {
      name: ('Walking One'),
      fn: ('function' == typeof addWalkingOneSignalDialog) ? addWalkingOneSignalDialog : null
    },
    {
      name: ('Walking Zero'),
      fn: (('function') == typeof addWalkingZeroSignalDialog) ? addWalkingZeroSignalDialog : null
    },
    {
      name: 'Bus Idle',
      fn: 'function' == typeof addBusIdleSignalDialog ? addBusIdleSignalDialog : null
    },
    {
      name: 'Alternating',
      fn: ('function') == typeof addAlternatingSignalDialog ? addAlternatingSignalDialog : null
    },
    {
      name: ('Gray Code Counter'),
      fn: 'function' == typeof addGrayCodeSignalDialog ? addGrayCodeSignalDialog : null
    }
  ];
  for (const v6 of arr)
    v6.fn && (item(v4, v6.name, async () => {
    await v6.fn();
}));
  if (v1.appendChild(v2), val(v1), (item(v1, 'Blank Row', () => {
    document_wave.addBlankRow();
    (drawWaveform());
    (updateSidePanels());
})), el.appendChild(v0), signalClipboard && signalClipboard.signals && signalClipboard.signals.length > 0) {
    const v6 = document.createElement(('div'));
        v6.className = 'context-menu-separator';
    v6.style.height = '1px';
    v6.style.background = 'var(--border-color)';
    v6.style.margin = '4px 12px';
    v6.style.padding = '0';
    el.appendChild(v6);
        const v7 = signalClipboard.count > 1 ? 'Paste ' + signalClipboard.count + ' signals' : ('Paste signal');
    const v8 = document.createElement(('div'));
        v8.className = ('menu-item');
    v8.textContent = v7;
    v8.addEventListener('click', ev => {
                        ev.stopPropagation();
            document_wave.pushUndoSnapshot();
      const v9 = document_wave.signalList();
      for (const v10 of signalClipboard.signals) {
        const obj = {
          name: v10.name + ' (copy)',
          type: v10.type,
          color: v10.color,
          values: [...v10.values],
          labels: v10.labels ? [...v10.labels] : null,
          radix: v10.radix,
          segmentStyles: v10.segmentStyles ? v10.segmentStyles.map(v11 => ({ ...v11 })) : null,
          edgeArrow: v10.edgeArrow,
          riseTime: v10.riseTime,
          fallTime: v10.fallTime
        };
        v9.push(obj);
      }
            (drawWaveform());
      (updateSidePanels());
      el.parentElement && document.body.removeChild(el);
    });
    el.appendChild(v8);
  }
  document.body.appendChild(el);
  const fn = ev => {
        el.contains(ev.target) || (el.parentElement && document.body.removeChild(el), document.removeEventListener('click', fn));
  };
  let v5;
    (setTimeout(() => document.addEventListener('click', fn), 0));
  el.addEventListener(('mouseleave'), function () {
        v5 = (setTimeout(() => {
        el.parentElement && document.body.removeChild(el);
    document.removeEventListener('click', fn);
}, 100));
  });
  el.addEventListener('mouseenter', function () {
    v5 && clearTimeout(v5);
  });
}
function showSignalContextMenu(num, n, item, sig) {
  let val = [];
  val = (selectedSignalIndices.length > 0) && selectedSignalIndices.includes(item) ? [...selectedSignalIndices] : [item];
    const tmp = val.length > 1;
  const el = document.createElement(('div'));
  if (el.className = ('context-menu'), el.style.position = ('fixed'), el.style.left = (num + 'px'), el.style.top = (n + 'px'), el.style.background = 'var(--bg-color)', el.style.border = '1px solid var(--border-color)', el.style.borderRadius = ('4px'), el.style.boxShadow = ('0 2px 8px rgba(0,0,0,0.3)'), el.style.zIndex = '5500', el.style.minWidth = ('180px'), tmp) {
    const v4 = document.createElement('div');
        v4.textContent = val.length + (' signals selected');
    v4.style.padding = '8px 12px';
    v4.style.fontWeight = ('bold');
    v4.style.color = ('var(--text-color)');
    v4.style.borderBottom = '1px solid var(--border-color)';
    v4.style.fontSize = '12px';
    el.appendChild(v4);
  }
  function v0(v4, v5) {
    const v6 = document.createElement('div');
    return v6.textContent = v4, v6.style.padding = '8px 12px', v6.style.cursor = ('pointer'), v6.style.color = ('var(--text-color)'), v6.addEventListener(('mouseenter'), () => v6.style.background = 'var(--accent-color)'), v6.addEventListener(('mouseleave'), () => v6.style.background = 'transparent'), v6.addEventListener('click', () => {
                        (v5());
            document.body.removeChild(el);
    }), el.appendChild(v6), v6;
  }
  function v1() {
    const v4 = document.createElement('div');
        v4.className = 'context-menu-separator';
    v4.style.height = '1px';
    v4.style.background = 'var(--border-color)';
    v4.style.margin = '4px 12px';
    v4.style.padding = '0';
    el.appendChild(v4);
  }
  if ((sig.type !== SignalType.BlankRow)) {
        tmp || (v0('Rename signal...', () => {
    (wpPrompt(('Enter new signal name:'), sig.name, ('Rename Signal'))).then(v6 => {
        v6 && v6.trim() && (document_wave.setSignalName(item, v6.trim()), drawWaveform());
    });
}));
    (v1());
    (v0(tmp ? 'Copy ' + val.length + ' signals' : 'Copy signal', () => {
        const v6 = document_wave.signalList();
    const v7 = [];
    for (const v8 of val) {
        const v9 = v6[v8];
        v7.push({
            name: v9.name,
            type: v9.type,
            color: v9.color,
            values: [...v9.values],
            labels: v9.labels ? [...v9.labels] : null,
            radix: v9.radix,
            segmentStyles: v9.segmentStyles ? v9.segmentStyles.map(v10 => ({ ...v10 })) : null,
            edgeArrow: v9.edgeArrow,
            riseTime: v9.riseTime,
            fallTime: v9.fallTime
        });
    }
    signalClipboard = {
        signals: v7,
        count: v7.length
    };
}));
    signalClipboard && signalClipboard.signals && signalClipboard.signals.length > 0 && v0((signalClipboard.count > 1) ? 'Paste ' + signalClipboard.count + ' signals' : ('Paste signal'), () => {
            document_wave.pushUndoSnapshot();
      const v6 = document_wave.signalList();
      let count = item + (1);
      for (const v7 of signalClipboard.signals) {
        const obj = {
          name: (v7.name + ' (copy)'),
          type: v7.type,
          color: v7.color,
          values: [...v7.values],
          labels: v7.labels ? [...v7.labels] : null,
          radix: v7.radix,
          segmentStyles: v7.segmentStyles ? v7.segmentStyles.map(v8 => ({ ...v8 })) : null,
          edgeArrow: v7.edgeArrow,
          riseTime: v7.riseTime,
          fallTime: v7.fallTime
        };
                v6.splice(count, 0, obj);
        count++;
      }
            drawWaveform();
      (updateSidePanels());
    });
    (v0(tmp ? 'Duplicate ' + val.length + ' signals' : ('Duplicate signal'), () => {
    document_wave.pushUndoSnapshot();
        const v6 = document_wave.signalList();
    const v7 = [...val].sort((v8, v9) => v9 - v8);
    for (const v8 of v7) {
        const v9 = cloneSignalData(v6[v8], (' (copy)'));
        v6.splice((v8 + 1), 0, v9);
    }
        selectedSignalIndices = [];
    lastSelectedSignalIndex = -1;
    (drawWaveform());
    (updateSidePanels());
}));
    v1();
    v0(tmp ? 'Delete ' + val.length + ' signals' : ('Delete signal'), () => {
            wpConfirm(tmp ? 'Are you sure you want to delete ' + val.length + ' signals?' : 'Are you sure you want to delete signal "' + sig.name + '"?', ('Delete Signal')).then(v6 => {
                v6 && (tmp ? document_wave.removeSignals(val) : document_wave.removeSignal(item), clearSignalSelection(), drawWaveform());
      });
    });
    v0(tmp ? 'Change color (' + val.length + (' signals)...') : ('Change color...'), async () => {
            const v6 = getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || ('#000000');
      const v7 = sig.color || v6;
      const v8 = await (openColorPicker(v7, null, tmp ? 'Signals Color' : 'Signal Color'));
      v8 && (tmp ? document_wave.setSignalsColor(val, v8) : document_wave.setSignalColor(item, v8), (drawWaveform()));
    });
    tmp && (v1(), v0('Clear selection', () => {
            selectedSignalIndices = [];
      lastSelectedSignalIndex = -1;
      drawWaveform();
    }));
    v1();
    const v4 = document_wave.signalList();
        let arr = null;
    let flag = false;
    for (const v6 of val) {
      const v7 = v4[v6];
      v7 && v7.groupName && (flag = true, arr || (arr = v7.groupName));
    }
    const v5 = ('undefined' != typeof GroupManager) ? GroupManager.getGroupNames(document_wave) : [];
    if (tmp && (flag ? (v0('Create Subgroup in "' + GroupManager.getShortGroupName(arr) + '"...', () => {
    (wpPrompt('Enter subgroup name:', 'Subgroup', 'Create Subgroup')).then(v6 => {
        if (v6 && v6.trim()) {
            const v7 = (arr + '/') + v6.trim();
            document_wave.pushUndoSnapshot();
            GroupManager.createGroup(document_wave, v7, val);
            drawWaveform();
        }
    });
})) : (v0('Create Group...', () => {
    wpPrompt('Enter group name:', 'Group', 'Create Signal Group').then(v6 => {
        v6 && v6.trim() && (document_wave.pushUndoSnapshot(), GroupManager.createGroup(document_wave, v6.trim(), val), (drawWaveform()));
    });
}))), (v5.length > 0)) {
      const v6 = document.createElement(('div'));
            v6.className = ('submenu-container');
      v6.style.position = ('relative');
      const v7 = document.createElement('div');
            v7.style.padding = '8px 12px';
      v7.style.cursor = 'pointer';
      v7.style.color = 'var(--text-color)';
      v7.innerHTML = 'Add to Group <span style="float: right; opacity: 0.5;">\u25B6</span>';
      v7.addEventListener(('mouseenter'), () => v7.style.background = 'var(--accent-color)');
      v7.addEventListener(('mouseleave'), () => v7.style.background = 'transparent');
      v6.appendChild(v7);
      const v8 = document.createElement(('div'));
            v8.className = ('context-menu');
      v8.style.position = 'absolute';
      v8.style.left = ('100%');
      v8.style.top = '0';
      v8.style.display = 'none';
      v8.style.minWidth = '160px';
      v8.style.background = 'var(--bg-color)';
      v8.style.border = '1px solid var(--border-color)';
      v8.style.borderRadius = '4px';
      v8.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      v6.appendChild(v8);
      v6.addEventListener('mouseenter', () => {
                v8.style.display = ('block');
      });
      v6.addEventListener(('mouseleave'), () => {
                v8.style.display = 'none';
      });
      const v9 = [...v5].sort((v10, v11) => {
                const v12 = GroupManager.getGroupDepth(v10);
        const v13 = GroupManager.getGroupDepth(v11);
        return (v12 !== v13) ? v12 - v13 : v10.localeCompare(v11);
      });
      for (const v10 of v9) {
                const v11 = document.createElement('div');
        const v12 = GroupManager.getGroupDepth(v10);
        const v13 = GroupManager.getShortGroupName(v10);
        const v14 = (12) * v12;
        const v15 = (v12 > 0) ? '\u2514 ' : '';
                v11.textContent = v15 + v13;
        v11.title = v10;
        v11.style.padding = '8px 12px';
        v11.style.paddingLeft = 12 + v14 + 'px';
        v11.style.cursor = 'pointer';
        v11.style.color = ('var(--text-color)');
        v11.style.fontSize = (v12 > 0) ? '12px' : ('13px');
        v11.addEventListener('mouseenter', () => v11.style.background = 'var(--accent-color)');
        v11.addEventListener(('mouseleave'), () => v11.style.background = 'transparent');
        v11.addEventListener(('click'), () => {
                                        document_wave.pushUndoSnapshot();
                    GroupManager.addSignalsToGroup(document_wave, v10, val);
                    (drawWaveform());
                    el.parentNode && document.body.removeChild(el);
        });
        v8.appendChild(v11);
      }
      el.appendChild(v6);
    }
    if (arr) {
            const v6 = GroupManager.getShortGroupName(arr);
      const v7 = arr.includes('/');
            v0('Rename "' + v6 + '"...', () => {
                wpPrompt(v7 ? 'Enter new name for subgroup "' + v6 + '":' : 'Enter new name for group "' + v6 + '":', v6, ('Rename Group')).then(v8 => {
                    if (v8 && v8.trim()) {
            document_wave.pushUndoSnapshot();
                        const v9 = GroupManager.getParentGroupName(arr);
            const v10 = v9 ? ((v9 + '/') + v8.trim()) : v8.trim();
                        GroupManager.renameGroup(document_wave, arr, v10);
            drawWaveform();
          }
        });
      });
      v0(tmp ? 'Remove ' + val.length + ' from "' + v6 + '"' : 'Remove from "' + v6 + '"', () => {
                                document_wave.pushUndoSnapshot();
                GroupManager.removeSignalsFromGroup(document_wave, val);
                drawWaveform();
                (('function') == typeof updateSidePanels) && (updateSidePanels());
      });
      v0('Delete "' + v6 + '"', () => {
                wpConfirm(v7 ? 'Delete subgroup "' + v6 + ('" and ungroup its signals?') : 'Delete group "' + v6 + ('" and ungroup all its signals?'), ('Delete Group')).then(v8 => {
                    v8 && (document_wave.pushUndoSnapshot(), GroupManager.deleteGroup(document_wave, arr), drawWaveform());
        });
      });
    }
    if (tmp || (v0('Shift Left', () => {
                document_wave.shiftSignalValues(item, -1);
      }), v0(('Shift Right'), () => {
                document_wave.shiftSignalValues(item, 1);
      })), !tmp && sig.type === SignalType.Vector) {
      (v0(('Fill all segments...'), async () => {
    const v9 = sig.segmentStyles && sig.segmentStyles.find(v11 => v11 && v11.fill)?.['fill'] || '#ffffb4';
    const v10 = await openColorPicker(v9, null, ('Vector Fill Color'));
    if (v10) {
        document_wave.pushUndoSnapshot();
        for (let count = 0; count < sig.values.length; count++)
            sig['segmentStyles'][count] ? sig['segmentStyles'][count].fill = v10 : sig['segmentStyles'][count] = {
                color: null,
                hatched: false,
                fill: v10
            };
        document_wave.dataChanged();
    }
}));
            const v6 = [
          'Hex',
          'Decimal',
          ('Binary')
        ];
      const v7 = sig.radix || 0;
      const v8 = ((v7 + 1) % 3);
      v0('Value radix: ' + v6[v7] + ' \u2192 ' + v6[v8], () => {
                document_wave.pushUndoSnapshot();
        for (let count = 0; (count < sig.values.length); count++)
          (sig['labels'][count] === document_wave.valueToLabel(sig['values'][count], v7)) && (sig['labels'][count] = document_wave.valueToLabel(sig['values'][count], v8));
                sig.radix = v8;
        document_wave.dataChanged();
      });
    }
    tmp || sig.type !== SignalType.Bit || ((v0(('Invert Values'), () => {
    document_wave.pushUndoSnapshot();
    for (let count = 0; (count < sig.values.length); count++) {
        const v6 = sig['values'][count];
        (0 === v6) ? sig['values'][count] = 1 : 1 === v6 && (sig['values'][count] = 0);
    }
    drawWaveform();
})), v0('Properties...', () => {
      (showSignalPropertiesDialog(item, sig));
    }));
  } else
    (v0(('Delete Blank Row'), () => {
    wpConfirm(('Are you sure you want to delete this blank row?'), 'Delete Blank Row').then(v4 => {
        v4 && (document_wave.removeSignal(item), clearSignalSelection(), (drawWaveform()));
    });
}));
  function v2(ev) {
        el.contains(ev.target) || (el.parentNode && document.body.removeChild(el), document.removeEventListener('click', v2));
  }
  let v3;
    document.body.appendChild(el);
  setTimeout(() => document.addEventListener('click', v2), 10);
  el.addEventListener(('mouseleave'), function () {
        v3 = (setTimeout(() => {
        el.parentNode && document.body.removeChild(el);
    document.removeEventListener('click', v2);
}, 100));
  });
  el.addEventListener('mouseenter', function () {
    v3 && clearTimeout(v3);
  });
}
function showSignalPropertiesDialog(item, sig) {
  const num = sig.edgeArrow || ('none');
  const val = ('none') !== num;
  const tmp = (true === sig.showClockMarkers);
  const n = sig.riseTime || 0;
  const v0 = sig.fallTime || 0;
  const v1 = document.body.classList.contains('dark');
  const v2 = v1 ? {
      modalBg: ('#252528'),
      headerBg: '#1a1a1c',
      sectionBg: '#1e1e20',
      sectionBorder: ('#3a3a3f'),
      inputBg: '#2a2a2e',
      inputBorder: ('#444449'),
      text: ('#e8e8ec'),
      textMuted: ('#9999a5'),
      accent: ('#7ee856'),
      accentHover: '#6bd648',
      accentGradient: ('#4CAF50'),
      previewBg: ('#0d0d0f'),
      previewGrid: '#2a2a30',
      signalDefault: '#4CAF50'
    } : {
      modalBg: ('#ffffff'),
      headerBg: '#f5f7f5',
      sectionBg: '#f8faf8',
      sectionBorder: ('#d8e4d8'),
      inputBg: ('#ffffff'),
      inputBorder: '#c0d0c0',
      text: '#1a1a1f',
      textMuted: ('#5a6a5a'),
      accent: ('#4CAF50'),
      accentHover: '#3d9141',
      accentGradient: '#66bb6a',
      previewBg: ('#f0f4f0'),
      previewGrid: ('#d0dcd0'),
      signalDefault: ('#2e7d32')
    };
  const el = document.createElement(('div'));
  el.style.cssText = '\n        position: fixed; inset: 0; \n        background: rgba(0, 0, 0, ' + (v1 ? ('0.6') : '0.4') + ('); \n        display: flex; align-items: center; justify-content: center; \n        z-index: 10000;\n    ');
  const v3 = document.createElement('div');
    v3.style.cssText = '\n        background: ' + v2.modalBg + (';\n        border: 1px solid ') + v2.sectionBorder + (';\n        border-radius: 12px;\n        box-shadow: 0 20px 60px rgba(0, 0, 0, ') + (v1 ? ('0.5') : '0.2') + ('), 0 0 0 1px rgba(255,255,255,') + (v1 ? '0.05' : '0') + (');\n        min-width: 460px;\n        max-width: 520px;\n        overflow: hidden;\n    ');
  v3.innerHTML = '\n        <!-- Header -->\n        <div style="\n            padding: 14px 18px;\n            background: ' + v2.headerBg + (';\n            border-bottom: 1px solid ') + v2.sectionBorder + (';\n            display: flex;\n            align-items: center;\n            justify-content: space-between;\n        ">\n            <div style="display: flex; align-items: center; gap: 10px;">\n                <div style="\n                    width: 28px; height: 28px;\n                    background: linear-gradient(135deg, ') + v2.accent + ', ' + v2.accentGradient + (');\n                    border-radius: 6px;\n                    display: flex; align-items: center; justify-content: center;\n                ">\n                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">\n                        <polyline points="3,17 8,17 8,7 16,7 16,17 21,17"/>\n                    </svg>\n                </div>\n                <span style="font-size: 14px; font-weight: 600; color: ') + v2.text + (';">Signal Properties</span>\n            </div>\n            <button id="props-close-btn" style="\n                border: none; background: transparent; \n                color: ') + v2.textMuted + ('; cursor: pointer; \n                font-size: 18px; line-height: 1; padding: 4px;\n                border-radius: 4px;\n                transition: all 0.15s;\n            " onmouseover="this.style.color=\'') + v2.text + ('\';this.style.background=\'') + v2.sectionBg + ('\'" \n               onmouseout="this.style.color=\'') + v2.textMuted + ('\';this.style.background=\'transparent\'">\u2715</button>\n        </div>\n        \n        <!-- Content -->\n        <div style="padding: 18px; display: flex; gap: 18px;">\n            <!-- Left: Controls -->\n            <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">\n                <!-- Signal name badge -->\n                <div style="\n                    padding: 10px 14px;\n                    background: linear-gradient(135deg, ') + v2.accent + '15, ' + v2.accent + ('08);\n                    border: 1px solid ') + v2.accent + ('30;\n                    border-radius: 8px;\n                    display: flex; align-items: center; gap: 8px;\n                ">\n                    <div style="width: 8px; height: 8px; background: ') + (sig.color || v2.signalDefault) + ('; border-radius: 50%;"></div>\n                    <span style="font-size: 13px; color: ') + v2.text + ('; font-weight: 500;">') + (escapeHtml(sig.name || 'Unnamed Signal')) + ('</span>\n                </div>\n                \n                <!-- Clock Edge Markers -->\n                <div style="\n                    padding: 14px;\n                    background: ') + v2.sectionBg + (';\n                    border: 1px solid ') + v2.sectionBorder + (';\n                    border-radius: 8px;\n                    ') + (tmp ? 'opacity: 0.5;' : '') + ('\n                ">\n                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ') + v2.textMuted + ('; font-weight: 600; display: block; margin-bottom: 8px;">\n                        Clock Edge Markers\n                    </label>\n                    ') + (tmp ? '\n                    <div style="font-size: 11px; color: ' + v2.textMuted + ('; font-style: italic; margin-bottom: 8px;">\n                        \u26A0️ Polarity markers enabled on this signal.\n                    </div>\n                    ') : '') + ('\n                    <select id="edgeArrow" ') + (tmp ? 'disabled' : '') + (' style="\n                        width: 100%; padding: 8px 10px; font-size: 13px;\n                        background: ') + v2.inputBg + (';\n                        border: 1px solid ') + v2.inputBorder + (';\n                        border-radius: 6px;\n                        color: ') + v2.text + (';\n                        cursor: ') + (tmp ? 'not-allowed' : 'pointer') + (';\n                        outline: none;\n                        transition: border-color 0.15s;\n                    ">\n                        <option value="none" ') + ((('none') === num) ? ('selected') : '') + ('>None</option>\n                        <option value="positive" ') + ('positive' === num ? 'selected' : '') + ('>\u2191 Positive Edge</option>\n                        <option value="negative" ') + (('negative') === num ? ('selected') : '') + ('>\u2193 Negative Edge</option>\n                    </select>\n                </div>\n                \n                <!-- Transition Times -->\n                <div id="transitionSection" style="\n                    padding: 14px;\n                    background: ') + v2.sectionBg + (';\n                    border: 1px solid ') + v2.sectionBorder + (';\n                    border-radius: 8px;\n                    transition: opacity 0.2s;\n                    ') + (val ? 'opacity: 0.4; pointer-events: none;' : '') + ('\n                ">\n                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ') + v2.textMuted + ('; font-weight: 600; display: block; margin-bottom: 10px;">\n                        Transition Time\n                    </label>\n                    <div style="display: flex; gap: 16px;">\n                        <div style="flex: 1;">\n                            <label style="font-size: 12px; color: ') + v2.text + ('; display: block; margin-bottom: 6px;">Rise</label>\n                            <div style="display: flex; align-items: center; gap: 6px;">\n                                <input type="number" id="riseTime" min="0" max="10" step="0.1" value="') + n + ('" \n                                    style="\n                                        width: 56px; padding: 6px 8px; font-size: 13px; text-align: center;\n                                        background: ') + v2.inputBg + (';\n                                        border: 1px solid ') + v2.inputBorder + (';\n                                        border-radius: 5px;\n                                        color: ') + v2.text + (';\n                                        outline: none;\n                                    ">\n                                <span style="font-size: 11px; color: ') + v2.textMuted + (';">steps</span>\n                            </div>\n                        </div>\n                        <div style="flex: 1;">\n                            <label style="font-size: 12px; color: ') + v2.text + ('; display: block; margin-bottom: 6px;">Fall</label>\n                            <div style="display: flex; align-items: center; gap: 6px;">\n                                <input type="number" id="fallTime" min="0" max="10" step="0.1" value="') + v0 + ('" \n                                    style="\n                                        width: 56px; padding: 6px 8px; font-size: 13px; text-align: center;\n                                        background: ') + v2.inputBg + (';\n                                        border: 1px solid ') + v2.inputBorder + (';\n                                        border-radius: 5px;\n                                        color: ') + v2.text + (';\n                                        outline: none;\n                                    ">\n                                <span style="font-size: 11px; color: ') + v2.textMuted + (';">steps</span>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n                \n                ') + ((sig.type === SignalType.Vector) ? '\n                <!-- Fill Color (Vector signals only) -->\n                <div style="\n                    padding: 14px;\n                    background: ' + v2.sectionBg + (';\n                    border: 1px solid ') + v2.sectionBorder + (';\n                    border-radius: 8px;\n                ">\n                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ') + v2.textMuted + ('; font-weight: 600; display: block; margin-bottom: 8px;">\n                        Fill Color\n                    </label>\n                    <div style="display: flex; align-items: center; gap: 10px;">\n                        <div id="fillColorBox" style="\n                            width: 32px; height: 32px;\n                            border-radius: 6px;\n                            border: 2px solid ') + v2.inputBorder + (';\n                            cursor: pointer;\n                            background: ') + (sig.fill ? sig.fill : 'transparent') + (';\n                            ') + (sig.fill ? '' : 'background-image: linear-gradient(45deg, ' + v2.previewGrid + (' 25%, transparent 25%), linear-gradient(-45deg, ') + v2.previewGrid + (' 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ') + v2.previewGrid + (' 75%), linear-gradient(-45deg, transparent 75%, ') + v2.previewGrid + (' 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px;')) + ('\n                        "></div>\n                        <div style="display: flex; flex-direction: column; gap: 4px;">\n                            <span id="fillColorLabel" style="font-size: 12px; color: ') + v2.text + ';">' + (sig.fill ? sig.fill : 'No fill') + ('</span>\n                            <button id="clearFillBtn" style="\n                                font-size: 11px; padding: 2px 8px;\n                                background: transparent;\n                                border: 1px solid ') + v2.inputBorder + (';\n                                border-radius: 4px;\n                                color: ') + v2.textMuted + (';\n                                cursor: pointer;\n                                ') + (sig.fill ? '' : ('display: none;')) + ('\n                            ">Clear</button>\n                        </div>\n                    </div>\n                </div>\n                ') : '') + ('\n                \n                <!-- Per-Signal Substeps -->\n                <div style="\n                    padding: 14px;\n                    background: ') + v2.sectionBg + (';\n                    border: 1px solid ') + v2.sectionBorder + (';\n                    border-radius: 8px;\n                ">\n                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ') + v2.textMuted + ('; font-weight: 600; display: block; margin-bottom: 8px;">\n                        Substeps\n                    </label>\n                    <div style="display: flex; align-items: center; gap: 10px;">\n                        <input type="number" id="signalSubSteps" min="0" max="16" step="1" value="') + (sig.subSteps || 0) + ('" \n                            style="\n                                width: 56px; padding: 6px 8px; font-size: 13px; text-align: center;\n                                background: ') + v2.inputBg + (';\n                                border: 1px solid ') + v2.inputBorder + (';\n                                border-radius: 5px;\n                                color: ') + v2.text + (';\n                                outline: none;\n                            ">\n                        <span style="font-size: 11px; color: ') + v2.textMuted + (';">0 = use global</span>\n                    </div>\n                </div>\n            </div>\n            \n            <!-- Right: Preview -->\n            <div style="width: 130px; display: flex; flex-direction: column;">\n                <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ') + v2.textMuted + ('; font-weight: 600; margin-bottom: 8px; text-align: center;">\n                    Preview\n                </label>\n                <div style="\n                    flex: 1;\n                    background: ') + v2.previewBg + (';\n                    border: 1px solid ') + v2.sectionBorder + (';\n                    border-radius: 8px;\n                    padding: 10px;\n                    display: flex;\n                    align-items: center;\n                    justify-content: center;\n                ">\n                    <canvas id="signalPreviewCanvas" width="108" height="90"></canvas>\n                </div>\n            </div>\n        </div>\n        \n        <!-- Footer -->\n        <div style="\n            padding: 14px 18px;\n            background: ') + v2.headerBg + (';\n            border-top: 1px solid ') + v2.sectionBorder + (';\n            display: flex;\n            justify-content: flex-end;\n            gap: 10px;\n        ">\n            <button id="props-cancel-btn" style="\n                padding: 8px 18px;\n                border: 1px solid ') + v2.sectionBorder + (';\n                border-radius: 6px;\n                background: ') + v2.modalBg + (';\n                color: ') + v2.text + (';\n                font-size: 13px;\n                cursor: pointer;\n                transition: all 0.15s;\n            " onmouseover="this.style.background=\'') + v2.sectionBg + ('\'" \n               onmouseout="this.style.background=\'') + v2.modalBg + ('\'">Cancel</button>\n            <button id="props-ok-btn" style="\n                padding: 8px 22px;\n                border: none;\n                border-radius: 6px;\n                background: ') + v2.accent + (';\n                color: #fff;\n                font-size: 13px;\n                font-weight: 600;\n                cursor: pointer;\n                transition: all 0.15s;\n            " onmouseover="this.style.background=\'') + v2.accentHover + ('\'" \n               onmouseout="this.style.background=\'') + v2.accent + ('\'">Apply</button>\n        </div>\n    ');
  el.appendChild(v3);
  document.body.appendChild(el);
    const v4 = document.getElementById(('edgeArrow'));
  const v5 = document.getElementById(('transitionSection'));
  const v6 = document.getElementById(('riseTime'));
  const v7 = document.getElementById(('fallTime'));
  const v8 = document.getElementById('signalPreviewCanvas');
  const arr = v8.getContext('2d');
  let v9 = sig.fill || null;
  if ((sig.type === SignalType.Vector)) {
        const v13 = document.getElementById(('fillColorBox'));
    const v14 = document.getElementById('fillColorLabel');
    const v15 = document.getElementById('clearFillBtn');
        v13 && v13.addEventListener('click', async () => {
      const v16 = await (openColorPicker(v9 || '#4CAF50', v13, 'Fill Color'));
      v16 && (v9 = v16, v13.style.background = v16, v13.style.backgroundImage = 'none', v14 && (v14.textContent = v16), v15 && (v15.style.display = ''), (v10()));
    });
    v15 && v15.addEventListener('click', () => {
                        v9 = null;
            v13.style.background = ('transparent');
            v13.style.backgroundImage = 'linear-gradient(45deg, ' + v2.previewGrid + (' 25%, transparent 25%), linear-gradient(-45deg, ') + v2.previewGrid + (' 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ') + v2.previewGrid + (' 75%), linear-gradient(-45deg, transparent 75%, ') + v2.previewGrid + ' 75%)';
            v13.style.backgroundSize = ('8px 8px');
            v13.style.backgroundPosition = ('0 0, 0 4px, 4px -4px, -4px 0px');
            v14 && (v14.textContent = ('No fill'));
            v15.style.display = 'none';
            (v10());
    });
  }
  function v10() {
        const v13 = v8.width;
    const v14 = v8.height;
    const v15 = v4.value;
        (parseFloat(v6.value));
    parseFloat(v7.value);
    arr.fillStyle = v2.previewBg;
    arr.fillRect(0, 0, v13, v14);
    arr.strokeStyle = v2.previewGrid;
    arr.lineWidth = 1;
    for (let v18 = 27; (v18 < v13); v18 += 27)
      arr.beginPath(), arr.moveTo(v18, 0), arr.lineTo(v18, v14), arr.stroke();
        const v16 = 45;
    const v17 = sig.color || v2.signalDefault;
    if (arr.strokeStyle = v17, arr.lineWidth = 2.5, arr.lineCap = ('round'), arr.lineJoin = 'round', arr.beginPath(), arr.moveTo(0, 18), arr.lineTo(v13, 18), arr.stroke(), ('none' !== v15)) {
            const v18 = 7;
      const v19 = 4;
      const v20 = 54;
            arr.fillStyle = v17;
      ('positive' === v15) ? (arr.beginPath(), arr.moveTo(v20, v16 - v18), arr.lineTo((v20 - v19), v16), arr.lineTo((v20 + v19), v16), arr.closePath(), arr.fill(), arr.beginPath(), arr.moveTo(v20, v16), arr.lineTo(v20, 68), arr.stroke()) : (arr.beginPath(), arr.moveTo(v20, v16 + v18), arr.lineTo(v20 - v19, v16), arr.lineTo(v20 + v19, v16), arr.closePath(), arr.fill(), arr.beginPath(), arr.moveTo(v20, 22), arr.lineTo(v20, v16), arr.stroke());
    }
  }
    (v10());
  v4.addEventListener('change', () => {
                ('none') !== v4.value ? (v5.style.opacity = '0.4', v5.style.pointerEvents = ('none'), v6.value = '0', v7.value = '0') : (v5.style.opacity = '1', v5.style.pointerEvents = ('auto'));
        v10();
  });
  const fn = () => {
        const v13 = parseFloat(v6.value) || 0;
    const v14 = (parseFloat(v7.value)) || 0;
        ((v13 > 0) || (v14 > 0)) && (v4.value = 'none', v5.style.opacity = '1', v5.style.pointerEvents = 'auto');
    v10();
  };
    v6.addEventListener('input', fn);
  v7.addEventListener(('input'), fn);
  const v11 = () => {
        document.body.removeChild(el);
  };
    document.getElementById(('props-ok-btn')).addEventListener(('click'), () => {
        const v13 = v4.value;
    const v14 = 'none' !== v13 ? 0 : parseFloat(v6.value) || 0;
    const v15 = (('none') !== v13) ? 0 : (parseFloat(v7.value)) || 0;
        document_wave.setSignalRiseFallTime(item, v14, v15);
    sig.edgeArrow = v13;
    (sig.type === SignalType.Vector) && (sig.fill = v9);
    const v16 = document.getElementById('signalSubSteps');
    if (v16) {
      const v17 = parseInt(v16.value) || 0;
      document_wave.setSignalSubSteps(item, v17);
    }
        (v11());
    (drawWaveform());
  });
  document.getElementById('props-cancel-btn').addEventListener(('click'), v11);
  document.getElementById('props-close-btn').addEventListener('click', v11);
  el.addEventListener('click', ev => {
        ev.target === el && (v11());
  });
  const v12 = v13 => {
        (('Escape') === v13.key) && (v11(), document.removeEventListener('keydown', v12));
  };
  document.addEventListener(('keydown'), v12);
}
function escapeHtml(item) {
  return item ? item.replace(/&/g, ('&amp;')).replace(/</g, ('&lt;')).replace(/>/g, ('&gt;')).replace(/"/g, '&quot;').replace(/'/g, ('&#39;')) : '';
}
function clipboardDivisorOf(item) {
  const val = document_wave.subStepCount();
  return ((item && (item.subSteps > 0) ? item.subSteps : val) + 1);
}
function cloneSignalData(sig, num = '') {
    return {
    name: sig.name + num,
    type: sig.type,
    color: sig.color,
    fill: sig.fill || null,
    values: [...sig.values],
    labels: sig.labels ? [...sig.labels] : null,
    radix: sig.radix,
    segmentStyles: sig.segmentStyles ? sig.segmentStyles.map(item => item ? { ...item } : item) : null,
    driveStrengths: sig.driveStrengths ? [...sig.driveStrengths] : null,
    clockMarkers: sig.clockMarkers ? [...sig.clockMarkers] : null,
    waveDromColorCodes: sig.waveDromColorCodes ? [...sig.waveDromColorCodes] : null,
    edgeArrow: sig.edgeArrow,
    riseTime: sig.riseTime,
    fallTime: sig.fallTime,
    subSteps: sig.subSteps || 0,
    isClockPattern: sig.isClockPattern || false,
    clockHighSamples: sig.clockHighSamples,
    clockLowSamples: sig.clockLowSamples,
    showClockMarkers: sig.showClockMarkers || false,
    uiRowHeightHint: sig.uiRowHeightHint || 0,
    groupName: null,
    groupColor: null,
    groupPath: null
  };
}
function copySelection() {
  if (!rangeSelActive || (('select') !== currentTool))
    return;
    const item = document_wave.signalList();
  const num = Math.min(rangeSelStartSignal, rangeSelEndSignal);
  const n = Math.max(rangeSelStartSignal, rangeSelEndSignal);
  const val = Math.min(rangeSelStartSample, rangeSelEndSample);
  const tmp = Math.max(rangeSelStartSample, rangeSelEndSample);
  const v0 = (clipboardDivisorOf(item[rangeSelStartSignal]));
  const v1 = val / v0;
  const v2 = (tmp + 1) / v0;
  const arr = [];
  for (let count = num; (count <= n); count++) {
    const v3 = item[count];
    if (!v3)
      continue;
        const v4 = (clipboardDivisorOf(v3));
    const v5 = Math.round(v1 * v4);
    const v6 = Math.round(v2 * v4);
    const obj = {
        type: v3.type,
        name: v3.name,
        radix: v3.radix,
        color: v3.color,
        divisor: v4,
        values: v3.values.slice(v5, v6),
        labels: v3.labels.slice(v5, v6),
        segmentStyles: v3.segmentStyles.slice(v5, v6).map(cur => ({
          color: cur ? cur.color : null,
          hatched: !!cur && cur.hatched,
          fill: cur ? cur.fill : null
        }))
      };
    arr.push(obj);
  }
    clipboard = {
    signals: arr,
    startSignal: num,
    startSample: val,
    width: tmp - val + (1),
    widthMain: v2 - v1,
    height: (n - num) + (1)
  };
  showToast('Copied ' + clipboard.width + (' samples \xD7 ') + clipboard.height + ' signals');
  drawWaveform();
}
function pasteClipboard() {
  if (!clipboard || 0 === clipboard.signals.length)
    return;
    let num = (pastePreviewSignal >= 0) ? pastePreviewSignal : rangeSelStartSignal;
  let n = pastePreviewSample >= 0 ? pastePreviewSample : rangeSelStartSample;
    (num < 0) && (num = 0);
  n < 0 && (n = 0);
    const item = document_wave.signalList();
  const val = n / (clipboardDivisorOf(item[num]));
  const tmp = void (0) !== clipboard.widthMain ? clipboard.widthMain : clipboard.width / (clipboard['signals'][0]?.['divisor'] || 1);
  document_wave.pushUndoSnapshot();
  for (let count = 0; (count < clipboard.signals.length); count++) {
        const v0 = clipboard['signals'][count];
    const v1 = num + count;
    if ((v1 >= item.length))
      break;
    const v2 = item[v1];
    if (!v2)
      continue;
    if ((v2.type !== v0.type) && (v2.type !== SignalType.BlankRow) && v0.type !== SignalType.BlankRow)
      continue;
    if (v0.type === SignalType.BlankRow)
      continue;
        const v3 = clipboardDivisorOf(v2);
    const v4 = v0.divisor || v3;
    const v5 = Math.round(val * v3);
    const v6 = Math.round((tmp * v3));
    for (let v7 = 0; v7 < v6; v7++) {
      const v8 = (v5 + v7);
      if ((v8 < 0) || (v8 >= v2.values.length))
        break;
      const v9 = Math.min(v0.values.length - (1), Math.floor(((v7 * v4) / v3)));
      if (v9 < 0)
        continue;
            v2['values'][v8] = v0['values'][v9];
      v2['labels'][v8] = v0['labels'][v9];
      const v10 = v0['segmentStyles'][v9];
      v10 && (v2['segmentStyles'][v8] = new SegmentStyle(v10.color, v10.hatched, v10.fill));
    }
  }
    (showToast('Pasted ' + clipboard.width + ' samples \xD7 ' + clipboard.height + ' signals'));
  rangeSelActive = false;
  rangeSelStartSignal = -1;
  rangeSelStartSample = -1;
  rangeSelEndSignal = -1;
  rangeSelEndSample = -1;
  pastePreviewSignal = -1;
  pastePreviewSample = -1;
  (drawWaveform());
}
function deleteSelection() {
  if (!rangeSelActive)
    return;
    const item = document_wave.signalList();
  const val = Math.min(rangeSelStartSignal, rangeSelEndSignal);
  const num = Math.max(rangeSelStartSignal, rangeSelEndSignal);
  const n = Math.min(rangeSelStartSample, rangeSelEndSample);
  const tmp = Math.max(rangeSelStartSample, rangeSelEndSample);
  const v0 = clipboardDivisorOf(item[rangeSelStartSignal]);
  const v1 = (n / v0);
  const v2 = (tmp + 1) / v0;
  document_wave.pushUndoSnapshot();
  for (let count = val; (count <= num); count++) {
    const v3 = item[count];
    if (!v3 || (v3.type === SignalType.BlankRow))
      continue;
        const v4 = clipboardDivisorOf(v3);
    const v5 = Math.round((v1 * v4));
    const v6 = Math.round(v2 * v4);
    for (let v7 = v5; (v7 < v6) && v7 < v3.values.length; v7++)
      v7 < 0 || (v3['values'][v7] = -1, v3['labels'][v7] = '', v3['segmentStyles'][v7] = new SegmentStyle());
  }
    rangeSelActive = false;
  rangeSelStartSignal = -1;
  rangeSelStartSample = -1;
  rangeSelEndSignal = -1;
  rangeSelEndSample = -1;
  (drawWaveform());
}
'undefined' != typeof module && module.exports && (module.exports = {
  initMenuHandlers: initMenuHandlers,
  initDropdownHandlers: initDropdownHandlers
});
'undefined' != typeof module && module.exports && (module.exports = { initToolbarHandlers: initToolbarHandlers });
'undefined' != typeof module && module.exports && (module.exports = { initCanvasHandlers: initCanvasHandlers });
'undefined' != typeof module && module.exports && (module.exports = { initKeyboardHandlers: initKeyboardHandlers });
'undefined' != typeof module && module.exports && (module.exports = {
  handleCanvasContextMenu: handleCanvasContextMenu,
  showAddSignalContextMenu: showAddSignalContextMenu
});
'undefined' != typeof module && module.exports && (module.exports = { showSignalContextMenu: showSignalContextMenu });
'undefined' != typeof module && module.exports && (module.exports = {
  showSignalPropertiesDialog: showSignalPropertiesDialog,
  escapeHtml: escapeHtml
});
'undefined' != typeof module && module.exports && (module.exports = {
  copySelection: copySelection,
  pasteClipboard: pasteClipboard,
  deleteSelection: deleteSelection,
  cloneSignalData: cloneSignalData
});
document.addEventListener('DOMContentLoaded', function () {
  const item = () => {
            document.body.classList.remove('loading');
      const el = document.getElementById(('app-loader'));
      el && el.parentElement && el.parentElement.removeChild(el);
    };
  const val = (setTimeout(item, 3000));
  if (window.addEventListener('load', () => {
                        (clearTimeout(val));
            (item());
    }, { once: true }), canvas = document.getElementById(('wave-canvas')), !canvas)
    return clearTimeout(val), void (item());
    ctx = canvas.getContext('2d');
  document_wave = window.document_wave = new WaveDocument();
  ('dark' === (localStorage.getItem('theme') || ('dark'))) && document.body.classList.add(('dark'));
  ('dark' === (localStorage.getItem('canvasTheme') || 'light')) && document.body.classList.add(('canvas-dark'));
  initMenuHandlers();
  initToolbarHandlers();
  (initCanvasHandlers());
  initKeyboardHandlers();
  window.addEventListener('beforeunload', ev => {
        document_wave && document_wave.m_modified && (ev.preventDefault(), ev.returnValue = '');
  });
  window.Signal = Signal;
  window.SegmentStyle = SegmentStyle;
  window.WaveDocument = WaveDocument;
  window.drawWaveform = drawWaveform;
  window.updateSidePanels = updateSidePanels;
  window.updateColorPicker = updateColorPicker;
  drawWaveform();
  updateSidePanels();
  updateColorPicker();
  const tmp = (('function') == typeof hasSharePayload) && hasSharePayload();
    tmp && ('function' == typeof loadDocFromLink) && (loadDocFromLink(document_wave)).then(v0 => {
        if (!v0)
      return;
    selectedSignalIndex = -1;
    const el = document.getElementById('sample-spin');
    el && (el.value = document_wave.m_sampleCount);
    const v1 = document.getElementById('substep-spin');
        v1 && (v1.value = document_wave.m_subStepCount);
    document_wave.m_modified = false;
    (drawWaveform());
    (updateSidePanels());
    updateColorPicker();
  })['catch'](v0 => {
  });
  (clearTimeout(val));
  setTimeout(() => {
    item();
  }, 100);
  tmp || (showBetaWelcomeIfNeeded());
});
'undefined' != typeof module && module.exports && (module.exports = {});
