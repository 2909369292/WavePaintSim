// ============================================================================
// WavePaintSim feature-templates.js —— 协议模板库
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
// 依赖：feature-common.js、混淆核心全局 API；菜单入口在 index.html
//   （a[data-wpf-action^="tpl-"]）。
// 修改记录：
//   2026-08-30 初版（F8）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureTemplates) return;
  window.__wpfFeatureTemplates = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;

    function parseByte(text, def) {
      const m = /^(0x)?([0-9a-f]{1,2})$/i.exec(String(text || '').trim());
      if (!m) return def;
      return parseInt(m[2], 16) & 0xff;
    }

    // 以主步为粒度构建电平序列（每步一个 0/1），子格自动铺开
    function buildSignal(name, mains) {
      const dw = window.document_wave;
      const stride = Math.max(1, (Number(dw.m_subStepCount) || 1) + 1);
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

    function byteDialog(tpl, action) {
      const mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;'
        + 'display:flex;align-items:center;justify-content:center;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:10px;min-width:300px;padding:16px 18px;'
        + 'box-shadow:0 8px 30px rgba(0,0,0,.3);font-size:13px;color:#222;';
      const h = document.createElement('div');
      h.textContent = tpl.title;
      h.style.cssText = 'font-weight:600;margin-bottom:6px;';
      const p = document.createElement('div');
      p.textContent = '将生成信号：' + tpl.names + '（长度取当前画布步数）';
      p.style.cssText = 'color:#666;margin-bottom:10px;';
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;';
      const span = document.createElement('span');
      span.textContent = '字节 (hex)';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = tpl.def;
      input.style.cssText = 'flex:1;padding:4px 6px;border:1px solid #ccc;border-radius:4px;';
      row.appendChild(span); row.appendChild(input);
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px;';
      const cancel = document.createElement('button');
      cancel.textContent = '取消';
      const ok = document.createElement('button');
      ok.textContent = '生成';
      ok.style.cssText = 'padding:4px 14px;cursor:pointer;background:#4CAF50;color:#fff;border:none;border-radius:4px;';
      cancel.style.cssText = 'padding:4px 14px;cursor:pointer;';
      cancel.addEventListener('click', function () { document.body.removeChild(mask); });
      ok.addEventListener('click', function () {
        document.body.removeChild(mask);
        const byte = parseByte(input.value, parseByte(tpl.def, 0xa5));
        const dw = window.document_wave;
        wpf.pushUndoSnapshot();
        tpl.build(byte).forEach(function (spec) { dw.m_signals.push(buildSignal(spec.name, spec.values)); });
        wpf.scheduleRedraw();
      });
      footer.appendChild(cancel); footer.appendChild(ok);
      box.appendChild(h); box.appendChild(p); box.appendChild(row); box.appendChild(footer);
      mask.appendChild(box);
      document.body.appendChild(mask);
      input.focus();
    }

    document.addEventListener('click', function (e) {
      const a = e.target && e.target.closest && e.target.closest('a[data-wpf-action^="tpl-"]');
      if (!a) return;
      const tpl = templates[a.getAttribute('data-wpf-action')];
      if (!tpl) return;
      e.preventDefault();
      e.stopPropagation();
      byteDialog(tpl, a.getAttribute('data-wpf-action'));
    });
  }, 'feature-templates');
})();
