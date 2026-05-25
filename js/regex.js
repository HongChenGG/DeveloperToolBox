// 正则表达式测试器
(function() {
    const PRESETS = {
        '手机号': '^1[3-9]\\d{9}$',
        '邮箱': '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
        '身份证(18位)': '^[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$',
        'IPv4': '^((25[0-5]|2[0-4]\\d|[01]?\\d?\\d)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d?\\d)$',
        'URL': '^https?:\\/\\/[^\\s]+$',
        '日期(YYYY-MM-DD)': '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$',
        '时间(HH:mm:ss)': '^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$',
        '中文': '[\\u4e00-\\u9fa5]+',
        '统一社会信用代码': '^[0-9A-HJ-NPQRTUWXY]{2}\\d{6}[0-9A-HJ-NPQRTUWXY]{10}$',
        '车牌号': '^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z0-9]{5,6}$',
        '密码(8位+大小写+数字)': '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$',
        'MAC地址': '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
        '十六进制颜色': '^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
    };

    function init() {
        const pattern = document.getElementById('regex-pattern');
        if (!pattern) return;
        const text = document.getElementById('regex-text');
        const flags = document.getElementById('regex-flags');
        const result = document.getElementById('regex-result');
        const highlight = document.getElementById('regex-highlight');
        const preset = document.getElementById('regex-preset');
        const btnClear = document.getElementById('btn-regex-clear');

        // 填充预设
        Object.keys(PRESETS).forEach(k => {
            const opt = document.createElement('option');
            opt.value = PRESETS[k];
            opt.textContent = k;
            preset.appendChild(opt);
        });
        preset.addEventListener('change', () => {
            if (preset.value) {
                pattern.value = preset.value;
                run();
            }
        });

        function escapeHtml(s) {
            return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        }

        function run() {
            const p = pattern.value;
            const t = text.value;
            const f = flags.value;
            if (!p) {
                result.innerHTML = '<span style="color:var(--text-secondary)">请输入正则表达式</span>';
                highlight.innerHTML = escapeHtml(t);
                return;
            }
            let re;
            try { re = new RegExp(p, f); }
            catch (e) {
                result.innerHTML = '<span style="color:var(--danger-color)">正则错误: ' + escapeHtml(e.message) + '</span>';
                return;
            }
            // 高亮匹配
            let html = '';
            let lastIdx = 0;
            const matches = [];
            if (f.includes('g')) {
                let m;
                const reG = new RegExp(p, f);
                while ((m = reG.exec(t)) !== null) {
                    matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
                    if (m.index === reG.lastIndex) reG.lastIndex++;
                }
            } else {
                const m = re.exec(t);
                if (m) matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
            }
            matches.forEach(m => {
                html += escapeHtml(t.slice(lastIdx, m.index));
                html += `<mark style="background:var(--warning-color);color:#000;padding:0 2px;border-radius:2px">${escapeHtml(m.match)}</mark>`;
                lastIdx = m.index + m.match.length;
            });
            html += escapeHtml(t.slice(lastIdx));
            highlight.innerHTML = html || '<span style="color:var(--text-secondary)">无文本</span>';

            // 结果列表
            if (matches.length === 0) {
                result.innerHTML = '<span style="color:var(--danger-color)">未匹配</span>';
            } else {
                const list = matches.map((m, i) => {
                    let s = `<div style="margin-bottom:6px;padding:6px;background:var(--bg-darker);border-radius:4px">
                        <b>#${i + 1}</b> 位置 ${m.index}: <code style="color:var(--accent-color)">${escapeHtml(m.match)}</code>`;
                    if (m.groups.length) {
                        s += '<div style="margin-top:4px;font-size:12px;color:var(--text-secondary)">分组: ' +
                            m.groups.map((g, j) => `[${j + 1}]=${g === undefined ? '<i>undefined</i>' : '<code>' + escapeHtml(g) + '</code>'}`).join(' | ') + '</div>';
                    }
                    s += '</div>';
                    return s;
                }).join('');
                result.innerHTML = `<div style="color:var(--success-color);font-weight:bold;margin-bottom:8px">✓ 匹配到 ${matches.length} 处</div>` + list;
            }
        }

        [pattern, text, flags].forEach(el => el.addEventListener('input', run));
        btnClear && btnClear.addEventListener('click', () => {
            pattern.value = '';
            text.value = '';
            result.innerHTML = '';
            highlight.innerHTML = '';
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
