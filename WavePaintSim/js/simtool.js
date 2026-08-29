// 仿真工具：Verilog 解析 + 信号识别 + 自动Testbench生成
window.SimTool = (function () {
    'use strict';
    function stripComments(src) {
        return String(src || '')
            .replace(/\/\/[^\n]*/g, ' ')
            .replace(/\/\*[\s\S]*?\*\//g, ' ');
    }
    // 解析 Verilog → { modName, ports, signals, inputs, outputs }
    function parseVerilog(src) {
        var text = stripComments(src);
        var out = { modName: '', ports: [], signals: [], inputs: [], outputs: [] };
        var m = text.match(/\bmodule\s+([A-Za-z_][A-Za-z0-9_$]*)/);
        if (m) out.modName = m[1];
        // 解析端口 (input/output/inout [+位宽] [reg/wire] [+位宽] 名称)
        var pre = /\b(input|output|inout)\b\s*(?:\[([^\]]*)\]\s*)?(?:(?:reg|wire)\s+(?:signed\s+)?)?(?:\[([^\]]*)\]\s*)?([A-Za-z_][A-Za-z0-9_$]*)/g;
        var pm;
        while ((pm = pre.exec(text)) !== null) {
            var dir = pm[1], range = (pm[2] || pm[3] || '').trim(), nm = pm[4];
            var msb = '', lsb = '';
            if (range) {
                var rm = range.match(/([0-9]+)\s*:\s*([0-9]+)/);
                if (rm) { msb = rm[1]; lsb = rm[2]; }
            }
            var p = { dir: dir, name: nm, msb: msb, lsb: lsb, isBus: range !== '' };
            out.ports.push(p);
            out.signals.push(p);
            if (dir === 'input') out.inputs.push(p);
            else if (dir === 'output') out.outputs.push(p);
        }
        // 补充 wire/reg 内部信号
        var sigRe = /\b(?:wire|reg)\b\s*(?:\[[^\]]*\])?\s*([A-Za-z_][A-Za-z0-9_$]*)/g;
        var sm;
        while ((sm = sigRe.exec(text)) !== null) {
            var n2 = sm[1];
            if (!out.signals.some(function (s) { return s.name === n2; })) {
                out.signals.push({ dir: 'net', name: n2, msb: '', lsb: '', isBus: false });
            }
        }
        return out;
    }
    // 读取绘图区(document_wave)手绘信号激励
    function readStimuli(dw) {
        if (!dw || !dw.m_signals) return [];
        var list = [];
        for (var i = 0; i < dw.m_signals.length; i++) {
            var s = dw.m_signals[i];
            if (!s || !s.values) continue;
            list.push({ name: s.name || ('sig' + i),
                values: Array.prototype.slice.call(s.values),
                isClock: !!s.isClockPattern,
                high: s.clockHighSamples || 1,
                low: s.clockLowSamples || 1 });
        }
        return list;
    }
    // 生成 Testbench 源码。opts: { moduleName, stimuli, timePerSample, dumpFile }
    function genTestbench(opts) {
        opts = opts || {};
        var mn = opts.moduleName || 'dut';
        var stim = opts.stimuli || [];
        var tps = opts.timePerSample || 10;
        var dump = opts.dumpFile || 'wave_out.vcd';
        var L = [];
        L.push('// 自动生成：由手绘激励生成 Testbench');
        L.push('`timescale 1ps/1ps');
        L.push('module tb;');

        // 声明输入 reg
        for (var i = 0; i < stim.length; i++)
            L.push('    reg ' + stim[i].name + ';');

        // DUT 实例（端口请按需调整）
        L.push('    ' + mn + ' dut (');
        L.push('        // TODO: 按端口连接');
        L.push('    );');
        L.push('');
        L.push('    initial begin');
        L.push('        $dumpfile("' + dump + '");');
        L.push('        $dumpvars(0, tb);');
        L.push('    end');

        // 时钟：always 翻转
        var maxEnd = 0;
        for (var c = 0; c < stim.length; c++) {
            if (stim[c].isClock) {
                var per = (stim[c].high + stim[c].low) * tps;
                L.push('    always #(' + Math.round(per / 2) + ') ' + stim[c].name + ' = ~' + stim[c].name + ';');
            }
        }

        // 非时钟信号：跳变点 #delay 驱动
        L.push('    initial begin');
        for (var j = 0; j < stim.length; j++) {
            if (stim[j].isClock) { L.push('        ' + stim[j].name + ' = 0;'); continue; }
            var v = stim[j].values, first = v && v.length ? v[0] : 0;
            L.push('        ' + stim[j].name + ' = ' + (first !== 0 ? 1 : 0) + ';');
        }
        for (var e = 0; e < stim.length; e++) {
            if (stim[e].isClock) continue;
            var vals = stim[e].values, prev = null, cur;
            for (var t = 0; t < vals.length; t++) {
                cur = vals[t] !== 0 ? 1 : 0;
                if (prev === null) { prev = cur; continue; }
                if (cur !== prev) {
                    L.push('        #' + (t * tps) + ' ' + stim[e].name + ' = ' + cur + ';');
                    prev = cur;
                }
            }
            maxEnd = Math.max(maxEnd, vals.length * tps);
        }
        L.push('    end');
        L.push('    initial begin #' + (maxEnd + tps) + ' $finish; end');
        L.push('endmodule');
        return L.join('\n');
    }
    // 解析 VCD 文本 → { timescale, tmax, signals:[{name,width,steps:[[time,val],...]}] }
    function parseVcd(vcd) {
        var out = { timescale: '1ns', tmax: 0, signals: [] };
        var lines = String(vcd || '').split(/\r?\n/);
        var vars = {}, order = [], curT = 0;
        for (var i = 0; i < lines.length; i++) {
            var ln = lines[i].replace(/\s+$/, '');
            if (!ln) continue;
            if (ln[0] === '$') {
                var vm = /^\$var\s+(\S+)\s+(\d+)\s+(\S+)\s+(\S+)/.exec(ln);
                if (vm) { var v = { width: +vm[2], id: vm[3], name: vm[4], steps: [] }; vars[v.id] = v; order.push(v); }
                continue;
            }
            if (ln[0] === '#') { curT = parseInt(ln.slice(1), 10) || 0; out.tmax = Math.max(out.tmax, curT); continue; }
            var isBus = (ln[0] === 'b' || ln[0] === 'B'), vid, val;
            if (isBus) { var sp = ln.indexOf(' '); val = ln.slice(1, sp); vid = ln.slice(sp + 1).replace(/\s+$/, ''); }
            else { val = ln[0]; vid = ln.slice(1).replace(/\s+$/, ''); }
            var vv = vars[vid]; if (!vv) continue;
            if (vv.steps.length === 0) vv.steps.push([0, val]);
            else if (vv.steps[vv.steps.length - 1][1] !== val) vv.steps.push([curT, val]);
        }
        var sigs = [];
        for (var oi = 0; oi < order.length; oi++) {
            var obj = order[oi];
            if (obj.steps.length === 0) obj.steps.push([0, '0']);
            var last = obj.steps[obj.steps.length - 1];
            if (last[0] < out.tmax) obj.steps.push([out.tmax, last[1]]);
            sigs.push({ name: obj.name, width: obj.width, id: obj.id, steps: obj.steps });
        }
        out.signals = sigs;
        return out;
    }
    return { stripComments: stripComments, parseVerilog: parseVerilog, readStimuli: readStimuli, genTestbench: genTestbench, parseVcd: parseVcd };
})();