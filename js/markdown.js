// Markdown 编辑器（依赖 lib/marked.min.js -> 全局 marked）
(function() {
    function init() {
        const input = document.getElementById('md-input');
        if (!input) return;
        const preview = document.getElementById('md-preview');
        const btnCopyHtml = document.getElementById('btn-md-copy-html');
        const btnExportHtml = document.getElementById('btn-md-export-html');
        const btnExportMd = document.getElementById('btn-md-export-md');
        const btnClear = document.getElementById('btn-md-clear');

        function escapeHtml(s) {
            return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        }

        function render() {
            if (typeof marked === 'undefined') {
                preview.innerHTML = '<p style="color:red">marked.min.js 未加载</p>';
                return;
            }
            try {
                // 配置 marked
                if (marked.setOptions) marked.setOptions({ gfm: true, breaks: true });
                let html = marked.parse(input.value);
                // 简单消毒：移除 script、on*=、javascript:
                html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                           .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
                           .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
                           .replace(/javascript:/gi, '');
                preview.innerHTML = html;
            } catch (e) {
                preview.innerHTML = '<p style="color:red">渲染失败: ' + escapeHtml(e.message) + '</p>';
            }
        }

        input.addEventListener('input', render);
        btnCopyHtml && btnCopyHtml.addEventListener('click', () => {
            navigator.clipboard.writeText(preview.innerHTML).then(() => showToast && showToast('HTML 已复制', 'success'));
        });
        btnExportHtml && btnExportHtml.addEventListener('click', () => {
            const full = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>Markdown Export</title>
<style>body{max-width:820px;margin:40px auto;padding:20px;font-family:-apple-system,Segoe UI,sans-serif;line-height:1.7;color:#24292e}
pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow:auto}code{background:#f6f8fa;padding:2px 6px;border-radius:3px;font-family:Consolas,monospace}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe2e5;padding:8px 12px}th{background:#f6f8fa}
blockquote{border-left:4px solid #dfe2e5;padding:0 16px;color:#6a737d;margin:0}
h1,h2{border-bottom:1px solid #eaecef;padding-bottom:.3em}</style></head>
<body>${preview.innerHTML}</body></html>`;
            const blob = new Blob([full], { type: 'text/html' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'markdown-' + Date.now() + '.html';
            a.click();
        });
        btnExportMd && btnExportMd.addEventListener('click', () => {
            const blob = new Blob([input.value], { type: 'text/markdown' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'document-' + Date.now() + '.md';
            a.click();
        });
        btnClear && btnClear.addEventListener('click', () => { input.value = ''; preview.innerHTML = ''; });

        // 默认演示内容
        if (!input.value) {
            input.value = `# Markdown 演示

## 列表
- 项目 1
- 项目 2
  - 子项

## 代码
\`\`\`js
console.log('Hello');
\`\`\`

## 表格
| 字段 | 类型 |
|------|------|
| id   | int  |
| name | str  |

> 引用文字

**粗体** *斜体* ~~删除~~ [链接](https://example.com)
`;
            render();
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
