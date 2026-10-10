// 文本 Diff 对比（依赖 lib/diff.min.js -> 全局 Diff 对象）
(function() {
    const MAX_INPUT_BYTES = 1024 * 1024;
    const textEncoder = new TextEncoder();

    function init() {
        const left = document.getElementById('diff-left');
        if (!left) return;
        const right = document.getElementById('diff-right');
        const output = document.getElementById('diff-output');
        const mode = document.getElementById('diff-mode');
        const btnRun = document.getElementById('btn-diff-run');
        const btnSwap = document.getElementById('btn-diff-swap');
        const btnClear = document.getElementById('btn-diff-clear');

        function escapeHtml(s) {
            return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        }

        function render(parts) {
            const addStyle = 'background:rgba(0,210,160,0.2);color:#0a7d5c;';
            const delStyle = 'background:rgba(255,99,72,0.2);color:#c0392b;text-decoration:line-through;';
            return parts.map(p => {
                const s = escapeHtml(p.value);
                if (p.added) return `<span style="${addStyle}">${s}</span>`;
                if (p.removed) return `<span style="${delStyle}">${s}</span>`;
                return `<span>${s}</span>`;
            }).join('');
        }

        function run() {
            const a = left.value, b = right.value;

            // 在调用 Diff 前按 UTF-8 字节数拒绝超限输入。
            if (textEncoder.encode(a).byteLength > MAX_INPUT_BYTES || textEncoder.encode(b).byteLength > MAX_INPUT_BYTES) {
                output.innerHTML = '<span style="color:var(--danger-color)">任一侧文本不能超过 1 MiB UTF-8 字节</span>';
                return;
            }
            if (typeof Diff === 'undefined') {
                output.innerHTML = '<span style="color:var(--danger-color)">diff.min.js 未加载</span>';
                return;
            }
            const m = mode.value;
            let parts;
            if (m === 'chars') parts = Diff.diffChars(a, b);
            else if (m === 'words') parts = Diff.diffWords(a, b);
            else if (m === 'lines') parts = Diff.diffLines(a, b);
            else if (m === 'sentences') parts = Diff.diffSentences(a, b);
            else if (m === 'json') {
                try {
                    const aj = JSON.stringify(JSON.parse(a), null, 2);
                    const bj = JSON.stringify(JSON.parse(b), null, 2);
                    parts = Diff.diffLines(aj, bj);
                } catch (e) {
                    output.innerHTML = '<span style="color:var(--danger-color)">JSON 解析失败: ' + escapeHtml(e.message) + '</span>';
                    return;
                }
            } else parts = Diff.diffLines(a, b);

            const adds = parts.filter(p => p.added).length;
            const dels = parts.filter(p => p.removed).length;
            const stat = `<div style="margin-bottom:10px;padding:8px;background:var(--bg-darker);border-radius:4px">
                <span style="color:var(--success-color)">+ ${adds} 处新增</span> &nbsp;
                <span style="color:var(--danger-color)">- ${dels} 处删除</span>
            </div>`;
            output.innerHTML = stat + '<pre style="white-space:pre-wrap;word-break:break-all;margin:0;font-family:Consolas,Monaco,monospace;font-size:13px;line-height:1.6">' + render(parts) + '</pre>';
        }

        btnRun && btnRun.addEventListener('click', run);
        btnSwap && btnSwap.addEventListener('click', () => { const t = left.value; left.value = right.value; right.value = t; run(); });
        btnClear && btnClear.addEventListener('click', () => { left.value = ''; right.value = ''; output.innerHTML = ''; });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
