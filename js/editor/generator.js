// ============================================================================
// WavePaintClean js/editor/generator.js —— 波形生成器
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F7）：
//   在「添加信号」菜单新增"波形生成器"子菜单：
//   正弦波 / 三角波 / 锯齿波 / 随机波形 / 带毛刺时钟。
//   点击后弹出参数对话框（名称、周期、相位等），按当前画布步数×(子步+1)
//   生成 Bit 信号并追加到画布（生成前压撤销快照，可 Ctrl+Z 撤销）。
//   位模式说明：正弦/三角/锯齿按 50% 阈值转为 0/1 电平（位信号语义）。
// 依赖：core/wpf.js（window.__wpf）、解混淆核心 wavepaint.clean.js 全局 API；
//   菜单入口在 index.html（a[data-wpf-action^="gen-"]）。
// 修改记录：
//   2026-08-30 初版（F7）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureGenerator) return;
  window.__wpfFeatureGenerator = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;

    // ------------------------------------------------------------ 参数对话框
    function openDialog(title, fields, onOk) {
      const mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;'
        + 'display:flex;align-items:center;justify-content:center;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:10px;min-width:300px;padding:16px 18px;'
        + 'box-shadow:0 8px 30px rgba(0,0,0,.3);font-size:13px;color:#222;';
      const h = document.createElement('div');
      h.textContent = title;
      h.style.cssText = 'font-weight:600;margin-bottom:10px;';
      box.appendChild(h);

      const inputs = {};
      fields.forEach(function (f) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin:6px 0;';
        const span = document.createElement('span');
        span.textContent = f.label;
        span.style.cssText = 'width:110px;text-align:right;';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = f.value;
        input.style.cssText = 'flex:1;padding:4px 6px;border:1px solid #ccc;border-radius:4px;';
        inputs[f.key] = input;
        row.appendChild(span);
        row.appendChild(input);
        box.appendChild(row);
      });

      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px;';
      const cancel = document.createElement('button');
      cancel.textContent = '取消';
      cancel.style.cssText = 'padding:4px 14px;cursor:pointer;';
      const ok = document.createElement('button');
      ok.textContent = '生成';
      ok.style.cssText = 'padding:4px 14px;cursor:pointer;background:#4CAF50;color:#fff;border:none;border-radius:4px;';
      cancel.addEventListener('click', function () { document.body.removeChild(mask); });
      ok.addEventListener('click', function () {
        const values = {};
        Object.keys(inputs).forEach(function (k) { values[k] = inputs[k].value; });
        document.body.removeChild(mask);
        onOk(values);
      });
      footer.appendChild(cancel);
      footer.appendChild(ok);
      box.appendChild(footer);
      mask.appendChild(box);
      document.body.appendChild(mask);
      if (fields.length) inputs[fields[0].key].focus();
    }

    // ------------------------------------------------------------ 信号构建
    function appendSignal(name, mainValues) {
      const dw = window.document_wave;
      const stride = Math.max(1, (Number(dw.m_subStepCount) || 1) + 1);
      const steps = Math.max(4, Number(dw.m_sampleCount) || 30);
      const len = steps * stride;
      const sig = new window.Signal(name, window.SignalType.Bit, len);
      // 主值铺开到每个子格（与数据模型一致：每步第 1 格 = 主值）
      for (let step = 0; step < steps; step += 1) {
        const v = mainValues[step % mainValues.length];
        for (let k = 0; k < stride; k += 1) sig.values[step * stride + k] = v;
      }
      wpf.pushUndoSnapshot();
      dw.m_signals.push(sig);
      wpf.scheduleRedraw();
    }

    function num(v, def) {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : def;
    }

    // ------------------------------------------------------------ 生成器
    const generators = {
      'gen-sine': {
        title: '生成正弦波（50% 阈值转电平）',
        fields: [
          { key: 'name', label: '信号名', value: 'sine' },
          { key: 'period', label: '周期（步）', value: '16' },
          { key: 'phase', label: '相位（步）', value: '0' }
        ],
        run: function (v) {
          const p = num(v.period, 16), ph = num(v.phase, 0);
          const dw = window.document_wave;
          const steps = Math.max(4, Number(dw.m_sampleCount) || 30);
          const mains = [];
          for (let s = 0; s < steps; s += 1) {
            mains.push(Math.sin(2 * Math.PI * (s + ph) / p) >= 0 ? 1 : 0);
          }
          appendSignal(v.name || 'sine', mains);
        }
      },
      'gen-triangle': {
        title: '生成三角波（50% 阈值转电平）',
        fields: [
          { key: 'name', label: '信号名', value: 'tri' },
          { key: 'period', label: '周期（步）', value: '16' },
          { key: 'phase', label: '相位（步）', value: '0' }
        ],
        run: function (v) {
          const p = num(v.period, 16), ph = num(v.phase, 0);
          const dw = window.document_wave;
          const steps = Math.max(4, Number(dw.m_sampleCount) || 30);
          const mains = [];
          for (let s = 0; s < steps; s += 1) {
            const t = ((s + ph) % p + p) % p;
            const level = t < p / 2 ? (2 * t / p) : (2 - 2 * t / p);
            mains.push(level >= 0.5 ? 1 : 0);
          }
          appendSignal(v.name || 'tri', mains);
        }
      },
      'gen-sawtooth': {
        title: '生成锯齿波（50% 阈值转电平）',
        fields: [
          { key: 'name', label: '信号名', value: 'saw' },
          { key: 'period', label: '周期（步）', value: '16' },
          { key: 'phase', label: '相位（步）', value: '0' }
        ],
        run: function (v) {
          const p = num(v.period, 16), ph = num(v.phase, 0);
          const dw = window.document_wave;
          const steps = Math.max(4, Number(dw.m_sampleCount) || 30);
          const mains = [];
          for (let s = 0; s < steps; s += 1) {
            const t = ((s + ph) % p + p) % p;
            mains.push(t / p >= 0.5 ? 1 : 0);
          }
          appendSignal(v.name || 'saw', mains);
        }
      },
      'gen-random': {
        title: '生成随机波形',
        fields: [
          { key: 'name', label: '信号名', value: 'rand' },
          { key: 'high', label: '高电平概率 %', value: '50' }
        ],
        run: function (v) {
          const high = Math.min(100, Math.max(0, num(v.high, 50))) / 100;
          const dw = window.document_wave;
          const steps = Math.max(4, Number(dw.m_sampleCount) || 30);
          const mains = [];
          for (let s = 0; s < steps; s += 1) mains.push(Math.random() < high ? 1 : 0);
          appendSignal(v.name || 'rand', mains);
        }
      },
      'gen-glitch': {
        title: '生成带毛刺时钟',
        fields: [
          { key: 'name', label: '信号名', value: 'gclk' },
          { key: 'period', label: '时钟周期（步）', value: '2' },
          { key: 'interval', label: '毛刺间隔（步）', value: '10' },
          { key: 'width', label: '毛刺宽度（子步）', value: '1' }
        ],
        run: function (v) {
          const p = num(v.period, 2);
          const interval = num(v.interval, 10);
          const gw = Math.max(1, num(v.width, 1));
          const dw = window.document_wave;
          const stride = Math.max(1, (Number(dw.m_subStepCount) || 1) + 1);
          const steps = Math.max(4, Number(dw.m_sampleCount) || 30);
          const len = steps * stride;
          const sig = new window.Signal(v.name || 'gclk', window.SignalType.Bit, len);
          // 基础时钟按主步翻转（偶步高、奇步低）；在 interval 整数倍主步上插入反向毛刺
          for (let s = 0; s < steps; s += 1) {
            const base = s % (p * 2) < p ? 1 : 0;
            const glitchHere = (s % interval === interval - 1);
            for (let k = 0; k < stride; k += 1) {
              let val = base;
              if (glitchHere && k >= 1 && k < 1 + gw) val = base ^ 1;
              sig.values[s * stride + k] = val;
            }
          }
          wpf.pushUndoSnapshot();
          dw.m_signals.push(sig);
          wpf.scheduleRedraw();
        }
      }
    };

    // 绑定菜单（事件委托到 document，兼容动态菜单）
    document.addEventListener('click', function (e) {
      const a = e.target && e.target.closest && e.target.closest('a[data-wpf-action]');
      if (!a) return;
      const gen = generators[a.getAttribute('data-wpf-action')];
      if (!gen) return;
      e.preventDefault();
      e.stopPropagation(); // 不让核心 data-action 处理器介入
      openDialog(gen.title, gen.fields, gen.run);
    });
  }, 'editor/generator');
})();
