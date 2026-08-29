(function () {
    'use strict';
    var panel = document.getElementById('sim-panel');
    var toggleBtn = document.getElementById('sim-toggle-btn');
    var header = document.getElementById('sim-panel-header');
    var sigBox = document.getElementById('sim-sigs');
    var tbOut = document.getElementById('sim-tbout');
    var filesBox = document.getElementById('sim-files');
    var status = document.getElementById('sim-status');
    var disp = document.getElementById('sim-wavedisp');

    function show() { panel.classList.remove('collapsed'); toggleBtn.style.display = 'none'; }
    function hide() { panel.classList.add('collapsed'); toggleBtn.style.display = 'inline'; }
    if (toggleBtn) toggleBtn.onclick = show;
    if (header) header.onclick = hide;
    var collapseBtn = document.getElementById('sim-collapse');
    if (collapseBtn) collapseBtn.onclick = hide;

    function addFile(name, code) {
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:4px';
        row.innerHTML =
            '<div><input class="sim-fname" style="width:110px;font:12px Consolas;border:1px solid #ccc" value="' +
            (name || 'dut.v') + '"> <button class="sim-del">删除</button></div>' +
            '<textarea rows="4" spellcheck="false" style="width:100%;box-sizing:border-box;font:12px Consolas;border:1px solid #ccc">' +
            (code || '') + '</textarea>';
        row.querySelector('.sim-del').onclick = function () {
            if (filesBox.children.length > 1) filesBox.removeChild(row);
        };
        filesBox.appendChild(row);
    }

    function collectFiles() {
        var out = [], rows = filesBox.children;
        for (var i = 0; i < rows.length; i++) {
            var name = rows[i].querySelector('.sim-fname').value.trim() || ('file' + i + '.v');
            var code = rows[i].querySelector('textarea').value;
            if (code.trim()) out.push({ name: name, content: code });
        }
        return out;
    }

    function allModules(files) {
        var mods = [];
        for (var i = 0; i < files.length; i++) {
            var m = window.SimTool.parseVerilogDesign(files[i].content);
            if (m && m.topName) mods.push(m);
        }
        return mods;
    }

    function renderSigs(mods) {
        sigBox.innerHTML = '';
        var used = {};
        if (window.document_wave && document_wave.m_signals)
            for (var i = 0; i < document_wave.m_signals.length; i++)
                if (document_wave.m_signals[i].name) used[document_wave.m_signals[i].name] = true;
        for (var mi = 0; mi < mods.length; mi++) {
            var title = document.createElement('div');
            title.style.cssText = 'font-size:11px;color:#888';
            title.textContent = '模块 ' + mods[mi].topName + ':';
            sigBox.appendChild(title);
            (mods[mi].topModule && mods[mi].topModule.ports || []).forEach(function (s) {
                var chip = document.createElement('span');
                chip.className = 'sim-sig-chip' + (used[s.name] ? ' used' : '');
                chip.textContent = (s.direction === 'input' ? 'IN ' : s.direction === 'output' ? 'OUT ' : 'IO ') + s.name;
                chip.title = '点击将该信号加入波形';
                sigBox.appendChild(chip);
            });
        }
    }

    function valueAt(steps, t) {
        var v = '0';
        for (var i = 0; i < steps.length; i++) { if (steps[i][0] <= t) v = steps[i][1]; else break; }
        return v;
    }

    function renderVcd(data) {
        disp.innerHTML = '';
        if (!data.signals.length) { disp.textContent = '（无信号）'; return; }
        var maxT = data.tmax || 1;
        data.signals.forEach(function (sig) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;font:12px Consolas;border-bottom:1px solid #eee;align-items:center';
            var nm = document.createElement('span');
            nm.style.cssText = 'width:110px;overflow:hidden;white-space:nowrap';
            nm.textContent = sig.name + (sig.width > 1 ? '[' + sig.width + ']' : '');
            var wave = document.createElement('span');
            wave.style.cssText = 'display:inline-flex';
            var cells = 60;
            for (var c = 0; c < cells; c++) {
                var tmid = (maxT * (c + 0.5)) / cells;
                var val = valueAt(sig.steps, tmid);
                var bit = document.createElement('span');
                bit.style.cssText = 'display:inline-block;width:6px;height:14px;background:' + (val === '0' ? '#fff' : '#4CAF50') + ';border-right:1px solid #ddd';
                bit.title = sig.name + ' @' + Math.round(tmid) + 'ps = ' + val;
                wave.appendChild(bit);
            }
            row.appendChild(nm);
            row.appendChild(wave);
            disp.appendChild(row);
        });
    }

    document.getElementById('sim-addfile').onclick = function () { addFile('dut_extra.v', ''); };
    var lastMods = [];
    document.getElementById('sim-parse').onclick = function () {
        lastMods = allModules(collectFiles());
        renderSigs(lastMods);
        tbOut.value = lastMods.map(function (m) {
            return m.topName + ' : ' + (m.topModule && m.topModule.ports || []).map(function (p) { return p.direction + ' ' + p.name; }).join(' ');
        }).join('\n') || '（未识别到模块）';
    };
    document.getElementById('sim-tb').onclick = function () {
        lastMods = allModules(collectFiles());
        var top = lastMods.length ? lastMods[0] : null;
        var project = { signals: window.SimTool.readStimuli ? window.SimTool.readStimuli(window.document_wave) : [] };
        var tbResult = window.SimTool.buildAutoTestbench(top, project);
        tbOut.value = tbResult.ok ? tbResult.source : tbResult.error;
        status.textContent = tbResult.ok ? 'TB 已生成' : tbResult.error;
    };
    document.getElementById('sim-run').onclick = function () {
        var files = collectFiles();
        if (!files.length) { status.textContent = '请先填写 DUT 代码'; return; }
        var top = lastMods.length ? lastMods[0] : null;
        var project = { signals: window.SimTool.readStimuli ? window.SimTool.readStimuli(window.document_wave) : [] };
        var tbResult = window.SimTool.buildAutoTestbench(top, project);
        if (!tbResult.ok) { status.textContent = tbResult.error; return; }
        var payload = window.SimTool.buildSimulationPayload(files, tbResult.source);
        status.textContent = '正在仿真...';
        fetch('/api/sim', { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: payload })
            .then(function (r) { return r.text(); })
            .then(function (txt) {
                if (/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):/.test(txt)) {
                    status.textContent = txt.replace(/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):\s*/, '').trim();
                    renderVcd({ signals: [], tmax: 0 });
                    return;
                }
                var data = window.SimTool.parseVcd(txt);
                status.textContent = '仿真完成：信号 ' + data.signals.length + ' 个，时长 ' + data.tmax + 'ps';
                renderVcd(data);
            })
            .catch(function (e) { status.textContent = '请求失败: ' + e; });
    };

    addFile('dut_top.v', '');
})();
