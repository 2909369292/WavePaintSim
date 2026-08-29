window.SimTool = (function () {
    'use strict';

    function stripComments(source) {
        return String(source || '')
            .replace(/\/\/.*$/gm, ' ')
            .replace(/\/\*[\s\S]*?\*\//g, ' ');
    }

    function normalizeWhitespace(source) {
        return String(source || '').replace(/\s+/g, ' ').trim();
    }

    function lowerName(name) {
        return String(name || '').trim().toLowerCase();
    }

    function padVectorBits(bits, width) {
        var text = String(bits || '0').toLowerCase();
        if (text.length === width) return text;
        if (text.length > width) return text.slice(-width);
        var fill = (text[0] === 'x' || text[0] === 'z') ? text[0] : '0';
        while (text.length < width) text = fill + text;
        return text;
    }

    function numericToBits(value, width) {
        try {
            var mask = (1n << BigInt(width)) - 1n;
            var number = BigInt(value);
            if (number < 0) number = (number + (1n << BigInt(width))) & mask;
            return padVectorBits((number & mask).toString(2), width);
        } catch {
            return new Array(width + 1).join('0');
        }
    }

    function normalizeVectorValue(value, width) {
        var safeWidth = Math.max(1, Number(width) || 1);
        var text = String(value ?? '').trim().replace(/\s+/g, '').replace(/_/g, '').toLowerCase();
        if (safeWidth <= 1) return /^[01xz]$/.test(text) ? text : '0';
        if (!text) return new Array(safeWidth + 1).join('0');
        if (/^[01xz]+$/.test(text)) return padVectorBits(text, safeWidth);

        var sized = /^(\d+)?'([bhdox])([0-9a-fxz]+)$/i.exec(text);
        var prefixed = /^(0[bhdox])([0-9a-fxz]+)$/i.exec(text);
        var baseToken = sized ? sized[2].toLowerCase() : prefixed ? prefixed[1].slice(1).toLowerCase() : '';
        var payload = sized ? sized[3] : prefixed ? prefixed[2] : text;

        if (baseToken === 'b') return padVectorBits(payload, safeWidth);
        if (baseToken === 'h' || baseToken === 'x') {
            var bits = '';
            for (var i = 0; i < payload.length; i++) {
                var digit = payload[i];
                if (digit === 'x' || digit === 'z') bits += digit.repeat(4);
                else if (/^[0-9a-f]$/.test(digit)) bits += parseInt(digit, 16).toString(2).padStart(4, '0');
                else return new Array(safeWidth + 1).join('0');
            }
            return padVectorBits(bits, safeWidth);
        }
        if (baseToken === 'o') {
            var obits = '';
            for (var j = 0; j < payload.length; j++) {
                var odigit = payload[j];
                if (odigit === 'x' || odigit === 'z') obits += odigit.repeat(3);
                else if (/^[0-7]$/.test(odigit)) obits += parseInt(odigit, 8).toString(2).padStart(3, '0');
                else return new Array(safeWidth + 1).join('0');
            }
            return padVectorBits(obits, safeWidth);
        }
        if (baseToken === 'd') return /[xz]/.test(payload) ? new Array(safeWidth + 1).join('x') : numericToBits(payload, safeWidth);
        if (/^[+-]?\d+$/.test(text)) return numericToBits(text, safeWidth);
        if (/^[0-9a-f]+$/i.test(text)) return numericToBits('0x' + text, safeWidth);
        return new Array(safeWidth + 1).join('0');
    }

    function inferSignalWidth(signal) {
        var explicitWidth = Number(signal && signal.width);
        if (Number.isFinite(explicitWidth) && explicitWidth > 1) return Math.floor(explicitWidth);
        var values = Array.isArray(signal && signal.values) ? signal.values : [];
        for (var i = 0; i < values.length; i++) {
            var text = String(values[i] ?? '').trim();
            if (/^[01xz]+$/i.test(text) && text.length > 1) return text.length;
        }
        return 1;
    }

    function formatVectorValue(value, width, radix) {
        var safeWidth = Math.max(1, Number(width) || 1);
        var bits = normalizeVectorValue(value, safeWidth);
        if (safeWidth <= 1) return bits;
        if (/[xz]/.test(bits)) return bits.indexOf('z') >= 0 && bits.indexOf('x') < 0 ? 'Z' : 'X';
        radix = radix || 'hexadecimal';
        try {
            var number = BigInt('0b' + bits);
            if (radix === 'decimal') return number.toString(10);
            if (radix === 'binary') return bits;
            var digits = Math.ceil(safeWidth / 4);
            return '0x' + number.toString(16).toUpperCase().padStart(digits, '0');
        } catch {
            return bits;
        }
    }

    function parseRange(text) {
        var match = /\[(.*?)\]/.exec(text || '');
        if (!match) return { msb: '', lsb: '', width: 1 };
        var parts = match[1].replace(/\s+/g, '').split(':');
        if (parts.length !== 2) return { msb: '', lsb: '', width: 1 };
        var a = Number(parts[0]);
        var b = Number(parts[1]);
        return { msb: parts[0], lsb: parts[1], width: Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) + 1 : 1 };
    }

    function parseListIdentifiers(text) {
        return String(text || '')
            .split(',')
            .map(function (part) { return part.trim(); })
            .filter(Boolean)
            .map(function (part) { return part.replace(/\[[^\]]*\]/g, ''); })
            .map(function (part) { return part.replace(/=.*$/, '').trim(); })
            .filter(Boolean);
    }

    function splitTopLevelCommas(text) {
        var items = [];
        var depth = 0;
        var current = '';
        String(text || '').split('').forEach(function (char) {
            if (char === '(' || char === '[' || char === '{') depth += 1;
            if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
            if (char === ',' && depth === 0) {
                if (current.trim()) items.push(current.trim());
                current = '';
                return;
            }
            current += char;
        });
        if (current.trim()) items.push(current.trim());
        return items;
    }

    function parseAnsiPortList(block) {
        var ports = [];
        var currentDirection = '';
        var currentRange = { msb: '', lsb: '', width: 1 };
        splitTopLevelCommas(block).forEach(function (item) {
            item = normalizeWhitespace(item);
            if (!item) return;
            var directionMatch = /^(input|output|inout)\b/.exec(item);
            if (directionMatch) {
                currentDirection = directionMatch[1];
                item = item.slice(directionMatch[0].length).trim();
                var rangeMatch0 = /\[[^\]]*\]/.exec(item);
                if (rangeMatch0) currentRange = parseRange(rangeMatch0[0]);
            }
            if (!currentDirection) return;
            var rangeMatch = /\[[^\]]*\]/.exec(item);
            var widthInfo = rangeMatch ? parseRange(rangeMatch[0]) : currentRange;
            var namesSection = item.replace(/\[[^\]]*\]/g, ' ').replace(/^(?:logic|reg|wire|bit|signed|unsigned)\b/g, ' ');
            var names = parseListIdentifiers(namesSection);
            if (rangeMatch) currentRange = widthInfo;
            names.forEach(function (name) {
                ports.push({ direction: currentDirection, name: name, msb: widthInfo.msb, lsb: widthInfo.lsb, width: widthInfo.width });
            });
        });
        return ports;
    }

    function parseModuleHeader(header) {
        var trimmed = normalizeWhitespace(header);
        var nameMatch = /^module\s+([A-Za-z_][A-Za-z0-9_$]*)/.exec(trimmed);
        var name = nameMatch ? nameMatch[1] : 'top';
        var portBlockMatch = /\((.*)\)\s*;?$/.exec(trimmed);
        return { name: name, portBlock: portBlockMatch ? portBlockMatch[1] : '' };
    }

    function parseDirectionDeclarations(body) {
        var ports = [];
        var declPattern = /\b(input|output|inout)\b\s*(?:reg|wire|logic|bit)?\s*(?:signed\s*)?(\[[^\]]*\])?\s*([^;]+);/g;
        var match;
        while ((match = declPattern.exec(body)) !== null) {
            var direction = match[1];
            var range = parseRange(match[2] || '');
            parseListIdentifiers(match[3]).forEach(function (name) {
                ports.push({ direction: direction, name: name, msb: range.msb, lsb: range.lsb, width: range.width });
            });
        }
        return ports;
    }

    function parseDeclarations(body) {
        var declarations = [];
        var declPattern = /\b(?:logic|reg|wire|bit|int|byte|shortint|integer|time)\b\s*(?:signed\s*)?(\[[^\]]*\])?\s*([^;]+);/g;
        var match;
        while ((match = declPattern.exec(body)) !== null) {
            var range = parseRange(match[1] || '');
            parseListIdentifiers(match[2]).forEach(function (name) {
                declarations.push({ name: name, msb: range.msb, lsb: range.lsb, width: range.width, kind: 'net' });
            });
        }
        return declarations;
    }

    function parseInstances(body) {
        var instances = [];
        var instancePattern = /\b([A-Za-z_][A-Za-z0-9_$]*)\b\s*(#\s*\([^;{}]*?\))?\s+([A-Za-z_][A-Za-z0-9_$]*)\s*\(([^;]*?)\)\s*;/gs;
        var match;
        while ((match = instancePattern.exec(body)) !== null) {
            var moduleName = match[1];
            if (/^(assign|if|for|case|always|initial|begin|end|function|task|module|typedef|import|export|class|interface|package|return)$/i.test(moduleName)) continue;
            var connectionText = match[4] || '';
            var connections = connectionText
                .split(/,(?![^()]*\))/)
                .map(function (item) { return item.trim(); })
                .filter(Boolean)
                .map(function (item) {
                    var named = /^\.(\w+)\s*\(\s*([^)]*?)\s*\)$/.exec(item);
                    if (named) return { port: named[1], signal: named[2].trim(), type: 'named' };
                    return { port: '', signal: item.replace(/^\(|\)$/g, '').trim(), type: 'ordered' };
                });
            instances.push({ moduleName: moduleName, instanceName: match[3], parameterOverride: match[2] || '', connections: connections });
        }
        return instances;
    }

    function parseVerilogDesign(source) {
        var text = stripComments(source);
        var modules = [];
        var modulePattern = /\bmodule\s+[A-Za-z_][A-Za-z0-9_$]*[\s\S]*?endmodule\b/g;
        var match;
        while ((match = modulePattern.exec(text)) !== null) {
            var block = match[0];
            var headerEnd = block.indexOf(';');
            if (headerEnd < 0) continue;
            var header = block.slice(0, headerEnd + 1);
            var body = block.slice(headerEnd + 1, block.length - 'endmodule'.length);
            var parsedHeader = parseModuleHeader(header);
            var ansiPorts = parseAnsiPortList(parsedHeader.portBlock);
            var ports = ansiPorts.length ? ansiPorts : parseDirectionDeclarations(body);
            modules.push({
                name: parsedHeader.name,
                header: header,
                body: body,
                ports: ports,
                declarations: parseDeclarations(body),
                instances: parseInstances(body)
            });
        }

        var instantiatedModules = new Set();
        modules.forEach(function (moduleInfo) {
            (moduleInfo.instances || []).forEach(function (instance) {
                if (instance && instance.moduleName) instantiatedModules.add(instance.moduleName);
            });
        });
        var topModule = null;
        for (var i = modules.length - 1; i >= 0; i--) {
            if (!instantiatedModules.has(modules[i].name)) {
                topModule = modules[i];
                break;
            }
        }
        if (!topModule) topModule = modules[modules.length - 1] || null;
        return { source: text, modules: modules, topModule: topModule, moduleCount: modules.length, topName: topModule ? topModule.name : 'top' };
    }

    function normalizeSignalName(name) {
        return String(name || '')
            .trim()
            .toLowerCase()
            .replace(/^i_?/, '')
            .replace(/^o_?/, '')
            .replace(/^in_?/, '')
            .replace(/^out_?/, '')
            .replace(/_i$/, '')
            .replace(/_o$/, '')
            .replace(/_n$/, '_n');
    }

    function readStimuli(dw) {
        if (!dw || !dw.m_signals) return [];
        var list = [];
        for (var i = 0; i < dw.m_signals.length; i++) {
            var s = dw.m_signals[i];
            if (!s || !s.values) continue;
            list.push({
                name: s.name || ('sig' + i),
                values: Array.prototype.slice.call(s.values),
                isClock: !!s.isClockPattern,
                kind: s.isClockPattern ? 'clock' : 'logic',
                width: inferSignalWidth(s),
                period: (s.clockHighSamples || 1) + (s.clockLowSamples || 1)
            });
        }
        return list;
    }

    function matchSignalsToPorts(signals, ports) {
        var signalMap = new Map();
        (signals || []).forEach(function (signal) { signalMap.set(normalizeSignalName(signal.name), signal); });
        return (ports || []).map(function (port) {
            var exact = signalMap.get(normalizeSignalName(port.name));
            if (exact) return { port: port, signal: exact, matched: true, strategy: 'name' };
            var fallback = (signals || []).find(function (signal) { return signal.role !== 'result'; }) || null;
            return { port: port, signal: fallback, matched: false, strategy: fallback ? 'fallback' : 'none' };
        });
    }

    function formatVerilogValue(value, width) {
        var safeWidth = Math.max(1, Number(width) || 1);
        var normalized = String(value ?? '').trim().replace(/\s+/g, '').replace(/_/g, '');
        if (safeWidth > 1) return safeWidth + "'b" + normalizeVectorValue(normalized, safeWidth);
        var bit = /[01xz]/i.exec(normalized);
        return "1'b" + (bit ? bit[0].toLowerCase() : '0');
    }

    function buildAutoTestbench(design, project) {
        var top = design && design.topModule;
        if (!top) return { ok: false, error: 'No module found.', source: '' };
        project = project || {};
        var ports = top.ports || [];
        var stimuli = Array.isArray(project.signals) ? project.signals : [];
        var bindings = matchSignalsToPorts(stimuli, ports);
        var lines = [];
        lines.push('`timescale 1ps/1ps');
        lines.push('module tb;');
        bindings.forEach(function (binding) {
            var width = binding.port.width > 1 ? '[' + (binding.port.msb || (binding.port.width - 1)) + ':' + (binding.port.lsb || 0) + '] ' : '';
            if (binding.port.direction === 'output' || binding.port.direction === 'inout') lines.push('  wire ' + width + binding.port.name + ';');
            else lines.push('  reg ' + width + binding.port.name + ';');
        });
        lines.push('');
        lines.push('  ' + top.name + ' dut (');
        ports.forEach(function (port, index) {
            var comma = index === ports.length - 1 ? '' : ',';
            lines.push('    .' + port.name + '(' + port.name + ')' + comma);
        });
        lines.push('  );');
        lines.push('');
        lines.push('  initial begin');
        lines.push('    $dumpfile("wave_out.vcd");');
        lines.push('    $dumpvars(0, tb);');
        bindings.forEach(function (binding) {
            if (binding.port.direction === 'output' || binding.port.direction === 'inout') return;
            var signal = binding.signal;
            if (signal && signal.kind === 'clock') {
                lines.push('    ' + binding.port.name + ' = 0;');
                return;
            }
            var initialValue = formatVerilogValue(signal && signal.values && signal.values[0], binding.port.width);
            lines.push('    ' + binding.port.name + ' = ' + initialValue + ';');
        });
        lines.push('    #1000 $finish;');
        lines.push('  end');
        bindings.forEach(function (binding) {
            var signal = binding.signal;
            if (!signal || binding.port.direction === 'output' || binding.port.direction === 'inout') return;
            if (signal.kind === 'clock') {
                var halfPeriod = Math.max(1, Math.floor(Number(signal.period) || 1));
                lines.push('  always #(' + halfPeriod + ') ' + binding.port.name + ' = ~' + binding.port.name + ';');
                return;
            }
            var values = Array.isArray(signal.values) ? signal.values : [];
            var previous = values[0] || '0';
            for (var index = 1; index < values.length; index++) {
                var current = values[index] || '0';
                if (current === previous) continue;
                lines.push('  initial #' + index + ' ' + binding.port.name + ' = ' + formatVerilogValue(current, binding.port.width) + ';');
                previous = current;
            }
        });
        lines.push('endmodule');
        return { ok: true, source: lines.join('\n'), bindings: bindings };
    }

    function genTestbench(opts) {
        opts = opts || {};
        var mn = opts.moduleName || 'dut';
        var stim = opts.stimuli || [];
        var dump = opts.dumpFile || 'wave_out.vcd';
        var lines = [];
        lines.push('// generated testbench');
        lines.push('`timescale 1ps/1ps');
        lines.push('module tb;');
        for (var i = 0; i < stim.length; i++) {
            var width = Math.max(1, Number(stim[i].width) || 1);
            var range = width > 1 ? ' [' + (width - 1) + ':0]' : '';
            lines.push('    reg' + range + ' ' + stim[i].name + ';');
        }
        lines.push('    ' + mn + ' dut (');
        lines.push('        // auto-wired by launcher');
        lines.push('    );');
        lines.push('');
        lines.push('    initial begin');
        lines.push('        $dumpfile("' + dump + '");');
        lines.push('        $dumpvars(0, tb);');
        for (var j = 0; j < stim.length; j++) {
            if (stim[j].kind === 'clock') continue;
            var values = Array.isArray(stim[j].values) ? stim[j].values : [];
            if (!values.length) continue;
            lines.push('        ' + stim[j].name + ' = ' + formatVerilogValue(values[0], stim[j].width) + ';');
        }
        lines.push('        #' + Math.max(1, (stim[0] && stim[0].values ? stim[0].values.length : 1) * tps) + ' $finish;');
        lines.push('    end');
        for (var k = 0; k < stim.length; k++) {
            if (stim[k].kind !== 'clock') continue;
            var period = Math.max(1, Number(stim[k].period) || 1);
            lines.push('    always #(' + period + ') ' + stim[k].name + ' = ~' + stim[k].name + ';');
        }
        lines.push('endmodule');
        return lines.join('\n');
    }

    function buildSimulationPayload(sourceFiles, testbench) {
        var files = Array.isArray(sourceFiles) ? sourceFiles : [{ name: 'dut.sv', content: String(sourceFiles || '') }];
        var lines = ['@@FILE:tb.v', testbench, '@@END'];
        files.forEach(function (file, index) {
            var rawName = String(file && file.name || ('dut_' + (index + 1) + '.sv')).trim() || ('dut_' + (index + 1) + '.sv');
            var payloadName = rawName.replace(/[\\/]/g, '_').replace(/^\.+/, '') || ('dut_' + (index + 1) + '.sv');
            var finalName = /\.[^.]+$/.test(payloadName) ? payloadName : (payloadName + '.sv');
            lines.push('@@FILE:' + finalName);
            lines.push(String(file && file.content || ''));
            lines.push('@@END');
        });
        return lines.join('\n');
    }

    function parseVcd(vcdText) {
        var result = { tmax: 0, signals: [] };
        var lines = String(vcdText || '').split(/\r?\n/);
        var byId = new Map();
        var time = 0;
        var scopes = [];

        lines.forEach(function (rawLine) {
            var line = rawLine.trim();
            if (!line) return;
            if (line.startsWith('$scope')) {
                var scopeMatch = /^\$scope\s+\S+\s+([^\s]+)\s+\$end/.exec(line);
                if (scopeMatch) scopes.push(scopeMatch[1]);
                return;
            }
            if (line.startsWith('$upscope')) {
                scopes.pop();
                return;
            }
            if (line.startsWith('$var')) {
                var match = /^\$var\s+\S+\s+(\d+)\s+(\S+)\s+(.+?)\s+\$end$/.exec(line);
                if (match) {
                    var signal = {
                        width: Number(match[1]) || 1,
                        id: match[2],
                        name: match[3].trim(),
                        scope: scopes.join('.'),
                        steps: []
                    };
                    byId.set(signal.id, signal);
                    result.signals.push(signal);
                }
                return;
            }
            if (line.startsWith('#')) {
                time = Number(line.slice(1)) || 0;
                result.tmax = Math.max(result.tmax, time);
                return;
            }
            if (line[0] === 'b' || line[0] === 'B') {
                var spaceIndex = line.indexOf(' ');
                if (spaceIndex < 0) return;
                var value = line.slice(1, spaceIndex).trim();
                var id = line.slice(spaceIndex + 1).trim();
                var signal2 = byId.get(id);
                if (!signal2) return;
                if (!signal2.steps.length || signal2.steps[signal2.steps.length - 1][1] !== value) signal2.steps.push([time, value]);
                return;
            }
            var id2 = line.slice(1).trim();
            var value2 = line[0];
            var signal3 = byId.get(id2);
            if (!signal3) return;
            if (!signal3.steps.length || signal3.steps[signal3.steps.length - 1][1] !== value2) signal3.steps.push([time, value2]);
        });

        result.signals.forEach(function (signal) {
            if (!signal.steps.length) signal.steps.push([0, '0']);
            if (signal.steps[signal.steps.length - 1][0] < result.tmax) {
                signal.steps.push([result.tmax, signal.steps[signal.steps.length - 1][1]]);
            }
        });
        return result;
    }

    function vcdToProjectOutputs(vcdText, project) {
        var parsed = parseVcd(vcdText);
        var timeSteps = Math.max(1, Number(project && project.timeSteps) || 24);
        var excludedSignals = new Set((project && project.signals || []).map(function (signal) { return normalizeSignalName(signal && signal.name); }));
        var sampleTimes = Array.from({ length: timeSteps }, function (_, index) {
            if (timeSteps <= 1) return parsed.tmax || 0;
            return Math.round((Math.max(0, parsed.tmax || 0) * index) / (timeSteps - 1));
        });
        var outputs = [];
        parsed.signals.forEach(function (signal) {
            var normalizedName = normalizeSignalName(signal.name);
            if (excludedSignals.has(normalizedName)) return;
            if (/^(tb|testbench|dut|uut)$/i.test(normalizedName)) return;
            var values = Array.from({ length: timeSteps }, function () { return '0'; });
            var stepCursor = 0;
            for (var index = 0; index < timeSteps; index++) {
                var sampleTime = sampleTimes[index];
                while (stepCursor + 1 < signal.steps.length && signal.steps[stepCursor + 1][0] <= sampleTime) stepCursor += 1;
                var current = signal.steps[stepCursor] && signal.steps[stepCursor][1] || '0';
                values[index] = signal.width > 1 ? normalizeVectorValue(current, signal.width) : normalizeVectorValue(current, 1);
            }
            outputs.push({
                id: signal.id || ('vcd_' + outputs.length),
                name: signal.name,
                role: 'result',
                kind: signal.width > 1 ? 'vector' : 'logic',
                width: signal.width > 1 ? signal.width : 1,
                msb: signal.width > 1 ? String(signal.width - 1) : '',
                lsb: signal.width > 1 ? '0' : '',
                radix: 'hexadecimal',
                scope: signal.scope || '',
                values: values,
                labels: Array.from({ length: timeSteps }, function (_, index) {
                    return formatVectorValue(values[index], signal.width > 1 ? signal.width : 1, 'hexadecimal');
                })
            });
        });
        return { parsed: parsed, outputs: outputs };
    }

    return {
        stripComments: stripComments,
        normalizeVectorValue: normalizeVectorValue,
        formatVectorValue: formatVectorValue,
        readStimuli: readStimuli,
        parseVerilogDesign: parseVerilogDesign,
        matchSignalsToPorts: matchSignalsToPorts,
        buildAutoTestbench: buildAutoTestbench,
        genTestbench: genTestbench,
        buildSimulationPayload: buildSimulationPayload,
        parseVcd: parseVcd,
        vcdToProjectOutputs: vcdToProjectOutputs
    };
})();
