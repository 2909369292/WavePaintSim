(function () {
  'use strict';

  var panel = document.getElementById('sim-panel');
  var toggleBtn = document.getElementById('sim-toggle-btn');
  var header = document.getElementById('sim-panel-header');
  var resultList = document.getElementById('result-list');
  var sourceFiles = document.getElementById('source-files');
  var sourceEditor = document.getElementById('verilog-source');
  var portPreview = document.getElementById('port-preview');
  var modulePreview = document.getElementById('module-preview');
  var waveDisp = document.getElementById('sim-wavedisp');
  var status = document.getElementById('sim-status');

  var state = {
    files: [{ id: 'file0', name: 'dut_top.v', content: '' }],
    active: 0,
    modules: [],
    outputs: []
  };

  function getPort() {
    var m = /[?&]port=(\d+)/.exec(location.search);
    return m ? m[1] : null;
  }

  function show() {
    panel.classList.remove('collapsed');
    document.body.classList.add('sim-open');
    toggleBtn.style.display = 'none';
  }

  function hide() {
    panel.classList.add('collapsed');
    document.body.classList.remove('sim-open');
    toggleBtn.style.display = 'block';
  }

  if (toggleBtn) toggleBtn.onclick = show;
  if (header) header.onclick = hide;
  var collapseBtn = document.getElementById('sim-collapse');
  if (collapseBtn) collapseBtn.onclick = hide;
  document.body.classList.add('sim-open');

  function parseAllModules() {
    state.modules = [];
    for (var i = 0; i < state.files.length; i++) {
      var parsed = window.SimTool.parseVerilog(state.files[i].content);
      if (parsed && parsed.modName) state.modules.push(parsed);
    }
    return state.modules;
  }

  function renderFileTabs() {
    sourceFiles.innerHTML = '';
    state.files.forEach(function (file, index) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'source-chip' + (index === state.active ? ' active' : '');
      chip.textContent = file.name || ('file' + index);
      chip.onclick = function () {
        syncEditor();
        state.active = index;
        renderFileTabs();
        sourceEditor.value = state.files[state.active].content || '';
      };
      sourceFiles.appendChild(chip);
    });
  }

  function syncEditor() {
    if (!state.files[state.active]) return;
    state.files[state.active].content = String(sourceEditor.value || '');
  }

  function renderModulePreview() {
    if (!state.modules.length) {
      portPreview.textContent = 'No ports found.';
      modulePreview.textContent = 'No module found.';
      return;
    }
    portPreview.textContent = state.modules.map(function (m) {
      return m.modName + ': ' + (m.ports || []).map(function (p) {
        return (p.dir || p.direction || 'net') + ' ' + p.name;
      }).join(', ');
    }).join('\n');
    modulePreview.textContent = 'modules: ' + state.modules.length + '\n' +
      state.modules.map(function (m) {
        return m.modName + ': ' + (m.ports || []).length + ' ports, ' + (m.signals || []).length + ' signals';
      }).join('\n');
  }

  function renderResults(signals) {
    resultList.innerHTML = '';
    (signals || []).forEach(function (sig) {
      var row = document.createElement('div');
      row.className = 'signal-chip';
      row.textContent = sig.name + (sig.width > 1 ? ' [' + sig.width + ']' : '');
      resultList.appendChild(row);
    });
  }

  function renderWave(data) {
    waveDisp.innerHTML = '';
    if (!data || !data.signals || !data.signals.length) {
      waveDisp.textContent = '(no signals)';
      return;
    }
    var maxT = data.tmax || 1;
    data.signals.forEach(function (sig) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;font:12px Consolas;border-bottom:1px solid #eee;';
      var nm = document.createElement('span');
      nm.style.cssText = 'width:110px;white-space:nowrap;overflow:hidden;';
      nm.textContent = sig.name + (sig.width > 1 ? '[' + sig.width + ']' : '');
      var wave = document.createElement('span');
      wave.style.cssText = 'display:inline-flex;';
      for (var c = 0; c < 60; c++) {
        var tmid = (maxT * (c + 0.5)) / 60;
        var val = '0';
        for (var i = 0; i < sig.steps.length; i++) {
          if (sig.steps[i][0] <= tmid) val = sig.steps[i][1];
          else break;
        }
        var bit = document.createElement('span');
        bit.style.cssText = 'display:inline-block;width:6px;height:14px;background:' + (val === '0' ? '#fff' : '#4CAF50') + ';border-right:1px solid #ddd';
        wave.appendChild(bit);
      }
      row.appendChild(nm);
      row.appendChild(wave);
      waveDisp.appendChild(row);
    });
  }

  function buildPayload(files, tb) {
    var lines = ['@@FILE:tb.v', tb, '@@END'];
    files.forEach(function (file, index) {
      var name = String(file.name || ('dut_' + index + '.v')).trim() || ('dut_' + index + '.v');
      lines.push('@@FILE:' + name);
      lines.push(String(file.content || ''));
      lines.push('@@END');
    });
    return lines.join('\n');
  }

  function buildTb() {
    syncEditor();
    var mods = parseAllModules();
    if (!mods.length) {
      status.textContent = 'No module found.';
      return null;
    }
    var stim = window.SimTool.readStimuli(window.document_wave);
    var tb = window.SimTool.genTestbench({ moduleName: mods[0].modName, stimuli: stim, timePerSample: 1000 });
    sourceEditor.value = tb;
    status.textContent = 'TB generated.';
    return tb;
  }

  function simulate() {
    syncEditor();
    var mods = parseAllModules();
    if (!mods.length) {
      status.textContent = 'No module found.';
      return;
    }
    var tb = window.SimTool.genTestbench({ moduleName: mods[0].modName, stimuli: window.SimTool.readStimuli(window.document_wave), timePerSample: 1000 });
    var port = getPort();
    if (!port) {
      status.textContent = 'No local sim service.';
      return;
    }
    status.textContent = 'Running...';
    fetch('http://127.0.0.1:' + port + '/api/sim', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: buildPayload(state.files, tb)
    }).then(function (r) { return r.text(); }).then(function (txt) {
      if (/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):/.test(txt)) {
        status.textContent = txt.replace(/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):\s*/, '').trim();
        renderWave({ signals: [], tmax: 0 });
        renderResults([]);
        return;
      }
      var data = window.SimTool.parseVcd(txt);
      status.textContent = 'Done: ' + data.signals.length + ' signals, tmax ' + data.tmax;
      renderWave(data);
      renderResults(data.signals);
    }).catch(function (e) {
      status.textContent = 'Request failed: ' + e;
    });
  }

  document.getElementById('sim-addfile').onclick = function () {
    syncEditor();
    state.files.push({ id: 'file' + state.files.length, name: 'dut_' + state.files.length + '.v', content: '' });
    state.active = state.files.length - 1;
    renderFileTabs();
    sourceEditor.value = '';
  };

  document.getElementById('sim-removefile').onclick = function () {
    if (state.files.length <= 1) return;
    syncEditor();
    state.files.splice(state.active, 1);
    state.active = Math.max(0, state.active - 1);
    renderFileTabs();
    sourceEditor.value = state.files[state.active].content || '';
  };

  document.getElementById('sim-parse').onclick = function () {
    syncEditor();
    parseAllModules();
    renderModulePreview();
    renderResults([]);
    status.textContent = 'Parsed ' + state.modules.length + ' module(s).';
  };

  document.getElementById('sim-tb').onclick = function () {
    buildTb();
  };

  document.getElementById('sim-run').onclick = function () {
    simulate();
  };

  sourceEditor.addEventListener('input', function () {
    syncEditor();
  });

  renderFileTabs();
  sourceEditor.value = state.files[0].content || '';
})();
