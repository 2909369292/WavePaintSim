// WavePaint 汉化补丁：翻译 wpPrompt 弹窗（#wp-modal）中的动态英文文本
// 主 JS 是混淆的专有代码，故在 DOM 层拦截并翻译弹窗显示时的文字。
(function () {
    'use strict';

    var dict = {
        // —— 添加信号对话框标题 ——
        'Add Clock Signal': '添加时钟信号',
        'Add Counter Signal': '添加计数器信号',
        'Add Reset Signal': '添加复位信号',
        'Add Pulse Signal': '添加脉冲信号',
        'Add Strobe Signal': '添加选通信号',
        'Add PWM Signal': '添加 PWM 信号',
        'Add Ramp Signal': '添加斜坡信号',
        'Add Walking One Signal': '添加走查1信号',
        'Add Walking Zero Signal': '添加走查0信号',
        'Add Bus Idle Signal': '添加总线空闲信号',
        'Add Alternating Signal': '添加交替信号',
        'Add Gray Code Counter Signal': '添加格雷码计数器信号',
        // —— 提示消息 ——
        'Clock name:': '时钟名称：',
        'Counter name:': '计数器名称：',
        'Signal name:': '信号名称：',
        'Period (samples):': '周期（采样）：',
        'High time (samples):': '高电平时间（采样）：',
        'Low time (samples)': '低电平时间（采样）',
        'Low time (samples):': '低电平时间（采样）：',
        'Pulse width': '脉冲宽度',
        'Pulse width:': '脉冲宽度：',
        'Duty cycle': '占空比',
        'Duty cycle:': '占空比：',
        'Active cycles': '有效周期数',
        'Active cycles:': '有效周期数：',
        'Samples per': '每周期采样数',
        'Samples per cycle': '每周期采样数',
        'Bit width:': '位宽：',
        'From value:': '起始值：',
        'To value:': '结束值：',
        'End value:': '结束值：',
        'Number of samples:': '采样数：',
        'Steps:': '步数：',
        'Sub-Steps:': '子步数：'
    };

    function translate(s) {
        if (typeof s !== 'string') return s;
        var t = s.trim();
        if (dict.hasOwnProperty(t)) return dict[t];
        // 前缀匹配（有些消息后跟更多说明文字）
        for (var k in dict) {
            if (dict.hasOwnProperty(k) && k.length > 3 && t.indexOf(k) === 0) {
                return dict[k] + t.substring(k.length);
            }
        }
        return s;
    }

    function apply() {
        var ov = document.getElementById('wp-modal-overlay');
        if (!ov) return;
        var visible = !(ov.classList && ov.classList.contains('hidden'));
        if (!visible) return;
        var title = document.getElementById('wp-modal-title');
        var msg = document.getElementById('wp-modal-message');
        var cancel = document.getElementById('wp-modal-cancel');
        var ok = document.getElementById('wp-modal-ok');
        if (title) title.textContent = translate(title.textContent);
        if (msg) msg.textContent = translate(msg.textContent);
        if (cancel) cancel.textContent = '取消';
        if (ok) ok.textContent = '确定';
    }

    // 仅监听弹窗覆盖层的 class 变化（避免全局观察/轮询干扰主程序渲染循环）
    if (window.MutationObserver) {
        var overlay = document.getElementById('wp-modal-overlay');
        if (overlay) {
            new MutationObserver(apply).observe(overlay, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }
    apply();
})();
