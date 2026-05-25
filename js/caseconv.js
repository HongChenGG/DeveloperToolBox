// 命名风格转换 + 文本工具集
(function() {
    function init() {
        const input = document.getElementById('case-input');
        if (!input) return;
        const grid = document.getElementById('case-grid');
        const btnDedup = document.getElementById('btn-text-dedup');
        const btnSort = document.getElementById('btn-text-sort');
        const btnReverse = document.getElementById('btn-text-reverse');
        const btnTrim = document.getElementById('btn-text-trim');
        const btnRemoveEmpty = document.getElementById('btn-text-noempty');
        const btnStat = document.getElementById('btn-text-stat');
        const textOut = document.getElementById('text-out');
        const stat = document.getElementById('text-stat');

        // 拆词：从任意命名形式拆出单词数组
        function tokenize(s) {
            return s
                // camelCase → camel Case
                .replace(/([a-z\d])([A-Z])/g, '$1 $2')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                // 分隔符 → 空格
                .replace(/[_\-\.\s/\\]+/g, ' ')
                .trim()
                .split(/\s+/)
                .map(w => w.toLowerCase())
                .filter(Boolean);
        }
        function camelCase(s) { const t = tokenize(s); return t[0] + t.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join(''); }
        function pascalCase(s) { return tokenize(s).map(w => w[0].toUpperCase() + w.slice(1)).join(''); }
        function snakeCase(s) { return tokenize(s).join('_'); }
        function snakeUpper(s) { return tokenize(s).join('_').toUpperCase(); }
        function kebabCase(s) { return tokenize(s).join('-'); }
        function dotCase(s) { return tokenize(s).join('.'); }
        function pathCase(s) { return tokenize(s).join('/'); }
        function titleCase(s) { return tokenize(s).map(w => w[0].toUpperCase() + w.slice(1)).join(' '); }
        function sentenceCase(s) { const t = tokenize(s); if (!t.length) return ''; t[0] = t[0][0].toUpperCase() + t[0].slice(1); return t.join(' '); }

        function render() {
            const s = input.value.trim();
            if (!s) { grid.innerHTML = ''; return; }
            const list = [
                ['camelCase（小驼峰）', camelCase(s)],
                ['PascalCase（大驼峰）', pascalCase(s)],
                ['snake_case（下划线）', snakeCase(s)],
                ['SNAKE_UPPER（常量）', snakeUpper(s)],
                ['kebab-case（短横线）', kebabCase(s)],
                ['dot.case（点分）', dotCase(s)],
                ['path/case（路径）', pathCase(s)],
                ['Title Case', titleCase(s)],
                ['Sentence case', sentenceCase(s)],
                ['UPPERCASE', s.toUpperCase()],
                ['lowercase', s.toLowerCase()],
                ['rEvErSe CaSe', [...s].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('')],
                ['反转字符串', [...s].reverse().join('')]
            ];
            grid.innerHTML = list.map(([k, v]) => `
                <div style="padding:10px;background:var(--bg-darker);border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px">
                    <div style="flex:1;min-width:0">
                        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">${k}</div>
                        <div style="font-family:monospace;color:var(--text-primary);word-break:break-all">${v}</div>
                    </div>
                    <button class="btn btn-success" style="padding:4px 12px;font-size:12px;flex:none" data-c="${v.replace(/"/g, '&quot;')}">复制</button>
                </div>
            `).join('');
            grid.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
                navigator.clipboard.writeText(b.getAttribute('data-c')).then(() => showToast && showToast('已复制', 'success'));
            }));
        }
        input.addEventListener('input', render);

        // 文本工具
        function lines() { return input.value.split(/\r?\n/); }
        btnDedup && btnDedup.addEventListener('click', () => { textOut.value = [...new Set(lines())].join('\n'); });
        btnSort && btnSort.addEventListener('click', () => { textOut.value = lines().sort((a, b) => a.localeCompare(b, 'zh')).join('\n'); });
        btnReverse && btnReverse.addEventListener('click', () => { textOut.value = lines().reverse().join('\n'); });
        btnTrim && btnTrim.addEventListener('click', () => { textOut.value = lines().map(l => l.trim()).join('\n'); });
        btnRemoveEmpty && btnRemoveEmpty.addEventListener('click', () => { textOut.value = lines().filter(l => l.trim()).join('\n'); });
        btnStat && btnStat.addEventListener('click', () => {
            const t = input.value;
            const ls = lines();
            const cn = (t.match(/[一-龥]/g) || []).length;
            const en = (t.match(/[a-zA-Z]/g) || []).length;
            const num = (t.match(/\d/g) || []).length;
            const words = t.split(/\s+/).filter(Boolean).length;
            stat.innerHTML = `字符 ${t.length} · 字节 ${new Blob([t]).size} · 行数 ${ls.length} · 单词 ${words} · 中文 ${cn} · 英文 ${en} · 数字 ${num}`;
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
