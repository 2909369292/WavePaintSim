// ============================================================================
// WavePaintClean js/editor/templates.js —— 协议模板库
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F8）：
//   在「添加信号」菜单新增"协议模板"子菜单，一键生成常用协议时序信号组：
//   - SPI 写入 / SPI 读取：CS_N、SCLK、MOSI（+读取时的 MISO）
//   - I2C 写入 / I2C 读取：SCL、SDA
//   - UART 发送 / UART 接收：TXD / RXD
//   字节值可通过对话框输入（默认 0xA5 / UART 0x55），按当前画布步数生成，
//   生成前压撤销快照（Ctrl+Z 可整体撤销），信号追加到画布末尾。
//   说明：SPI 为模式 0（CPOL=0/CPHA=0，MSB first）；I2C 含 START/ACK/STOP；
//   UART 为 8N1、LSB first、空闲高。
// 依赖：core/wpf.js（window.__wpf）、解混淆核心 wavepaint.clean.js 全局 API；
//   菜单入口在 index.html（a[data-wpf-action^="tpl-"]）。
// 修改记录：
//   2026-08-30 初版（F8）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureTemplates) return;
  window.__wpfFeatureTemplates = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;

    // 字节输入解析（对话框参数，非画布格子值，不走 wpf.parseValue）：
    // 0x 前缀 / 含 a-f → 十六进制；纯数字 0-255 → 十进制；非法回退默认值。
    // 旧实现把「10」当 hex 解析成 16，与直觉不符。
    function parseByte(text, def) {
      const s = String(text || '').trim().toLowerCase();
      if (!s) return def;
      let base = 16, body = s;
      const prefixed = /^0x([0-9a-f]{1,2})$/.exec(s);
      if (prefixed) { body = prefixed[1]; }
      else if (/^[0-9]+$/.test(s)) { base = 10; }
      else if (!/^[0-9a-f]{1,2}$/.test(s)) return def;
      const n = parseInt(body, base);
      return Number.isFinite(n) && n >= 0 && n <= 255 ? n : def;
    }

    // 以主步为粒度构建电平序列（每步一个 0/1），子格自动铺开
    function buildSignal(name, mains) {
      const dw = window.document_wave;
      // 权威口径 wpf.stride()：子步 0 合法（stride=1），旧 (x||1)+1 会把 0 当 1（BUG-009 同款）
      const stride = wpf.stride();
      const steps = Math.max(4, Number(dw.m_sampleCount) || 30);
      const len = steps * stride;
      const sig = new window.Signal(name, window.SignalType.Bit, len);
      for (let s = 0; s < steps; s += 1) {
        const v = s < mains.length ? mains[s] : mains.length ? mains[mains.length - 1] : 0;
        for (let k = 0; k < stride; k += 1) sig.values[s * stride + k] = v;
      }
      return sig;
    }

    // SPI 模式 0：CS 低有效；SCLK 空闲低，每位在 SCLK 上升沿采样；
    // MOSI 在 SCLK 下降沿（本实现为前半周期）切换。占用 1(空闲) + 16(传输) + 1 步。
    function spiMasters(byte) {
      const idle = [1, 1];
      const cs = [], sclk = [], mosi = [], miso = [];
      const bits = [];
      for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1);
      const rbits = [];
      const rb = (byte ^ 0x3c) & 0xff; // 读取演示：MISO 回一个不同字节
      for (let i = 7; i >= 0; i -= 1) rbits.push((rb >> i) & 1);
      for (const half of idle) { cs.push(1); sclk.push(0); mosi.push(0); miso.push(0); }
      for (const b of bits) {
        cs.push(0); sclk.push(0); mosi.push(b); miso.push(0); // 前半周期：建立
        cs.push(0); sclk.push(1); mosi.push(b); miso.push(0); // 上升沿：采样
      }
      for (const b of rbits) {
        cs.push(0); sclk.push(0); mosi.push(0); miso.push(b);
        cs.push(0); sclk.push(1); mosi.push(0); miso.push(b);
      }
      for (const half of idle) { cs.push(1); sclk.push(0); mosi.push(0); miso.push(0); }
      return [
        { name: 'cs_n', values: cs },
        { name: 'sclk', values: sclk },
        { name: 'mosi', values: mosi },
        { name: 'miso', values: miso }
      ];
    }

    function spiWrite(byte) {
      return spiMasters(byte).filter(function (s) { return s.name !== 'miso'; });
    }

    function spiRead(byte) {
      return spiMasters(byte).filter(function (s) { return s.name !== 'mosi'; });
    }

    // I2C：START(SDA 在 SCL 高时下降) → 8bit 数据 + ACK(第 9 步 SDA 低) → STOP。
    function i2cSignals(byte) {
      const scl = [], sda = [];
      const push = function (c, d) { scl.push(c); sda.push(d); };
      push(1, 1); push(1, 1);          // 空闲
      push(1, 0);                      // START：SCL 高时 SDA 拉低
      push(0, 0);
      const bits = [];
      for (let i = 7; i >= 0; i -= 1) bits.push((byte >> i) & 1);
      for (const b of bits) {
        push(0, b);                    // 建立
        push(1, b);                    // SCL 高采样
        push(0, b);
      }
      push(0, 0); push(1, 0); push(0, 0); // ACK（主机释放，从机拉低）
      for (const b of bits) {            // 再发一个数据字节
        push(0, b);
        push(1, b);
        push(0, b);
      }
      push(0, 0); push(1, 0); push(0, 0); // 第二个 ACK
      push(0, 0); push(1, 0);          // STOP：SCL 高时 SDA 拉高
      push(1, 1); push(1, 1);
      return [
        { name: 'scl', values: scl },
        { name: 'sda', values: sda }
      ];
    }

    // UART 8N1：空闲高 → 起始低 → 8 数据位（LSB first）→ 停止高。
    function uartSignals(byte) {
      const line = [1, 1, 1];
      line.push(0); // 起始位
      for (let i = 0; i <= 7; i += 1) line.push((byte >> i) & 1);
      line.push(1); line.push(1); line.push(1); // 停止位 + 空闲
      return [
        { name: 'txd', values: line },
        { name: 'rxd', values: line }
      ];
    }

    const templates = {
      'tpl-spi-write': { title: 'SPI 写入（模式 0，字节 hex）', def: 'A5', names: 'cs_n/sclk/mosi', build: spiWrite },
      'tpl-spi-read': { title: 'SPI 读取（模式 0，字节 hex）', def: 'A5', names: 'cs_n/sclk/miso', build: spiRead },
      'tpl-i2c-write': { title: 'I2C 写入（START+数据+ACK+STOP）', def: 'A5', names: 'scl/sda', build: i2cSignals },
      'tpl-i2c-read': { title: 'I2C 读取（START+数据+ACK+STOP）', def: '3C', names: 'scl/sda', build: i2cSignals },
      'tpl-uart-tx': { title: 'UART 发送（8N1，字节 hex）', def: '55', names: 'txd', build: function (b) { return uartSignals(b).slice(0, 1); } },
      'tpl-uart-rx': { title: 'UART 接收（8N1，字节 hex）', def: '55', names: 'rxd', build: function (b) { return uartSignals(b).slice(1, 2); } }
    };

    function byteDialog(tpl) {
      wpf.openFormDialog({
        title: tpl.title,
        hint: '将生成信号：' + tpl.names + '（长度取当前画布步数）',
        okText: '生成',
        fields: [{ key: 'byte', label: '字节 (hex/十进制)', value: tpl.def }],
        onOk: function (v) {
          const byte = parseByte(v.byte, parseByte(tpl.def, 0xa5));
          const dw = window.document_wave;
          wpf.pushUndoSnapshot();
          tpl.build(byte).forEach(function (spec) { dw.m_signals.push(buildSignal(spec.name, spec.values)); });
          wpf.scheduleRedraw();
        }
      });
    }

    document.addEventListener('click', function (e) {
      const a = e.target && e.target.closest && e.target.closest('a[data-wpf-action^="tpl-"]');
      if (!a) return;
      const tpl = templates[a.getAttribute('data-wpf-action')];
      if (!tpl) return;
      e.preventDefault();
      e.stopPropagation();
      byteDialog(tpl);
    });
  }, 'editor/templates');
})();
