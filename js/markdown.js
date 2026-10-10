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
        let renderedHtml = '';

        function showRenderError(error) {
            const errorMessage = document.createElement('p');
            errorMessage.style.color = 'var(--danger-color)';
            errorMessage.textContent = `渲染失败: ${error.message}`;
            preview.replaceChildren(errorMessage);
        }

        function render() {
            if (typeof marked === 'undefined' || typeof ToolboxSecurity === 'undefined') {
                showRenderError(new Error('Markdown 安全渲染依赖未加载'));
                return;
            }

            try {
                renderedHtml = ToolboxSecurity.renderMarkdown(input.value, { markedApi: marked });
                preview.innerHTML = renderedHtml;
            } catch (error) {
                renderedHtml = '';
                showRenderError(error);
            }
        }

        function downloadBlob(contentValue, mimeType, fileName) {
            const blob = new Blob([contentValue], { type: mimeType });
            const objectUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = objectUrl;
            downloadLink.download = fileName;
            downloadLink.click();
            URL.revokeObjectURL(objectUrl);
        }

        input.addEventListener('input', render);
        btnCopyHtml && btnCopyHtml.addEventListener('click', () => {
            copyToClipboard(renderedHtml);
        });
        btnExportHtml && btnExportHtml.addEventListener('click', () => {
            const full = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>Markdown Export</title>
<style>body{max-width:52rem;margin:2.5rem auto;padding:1.25rem;font-family:-apple-system,Segoe UI,sans-serif;line-height:1.7;color:#24292e}
pre{background:#f6f8fa;padding:1rem;border-radius:.4rem;overflow:auto}code{background:#f6f8fa;padding:.125rem .375rem;border-radius:.2rem;font-family:Consolas,monospace}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe2e5;padding:.5rem .75rem}th{background:#f6f8fa}
blockquote{border-left:.25rem solid #dfe2e5;padding:0 1rem;color:#6a737d;margin:0}
h1,h2{border-bottom:1px solid #eaecef;padding-bottom:.3em}</style></head>
<body>${renderedHtml}</body></html>`;
            downloadBlob(full, 'text/html;charset=utf-8', 'markdown-' + Date.now() + '.html');
        });
        btnExportMd && btnExportMd.addEventListener('click', () => {
            downloadBlob(input.value, 'text/markdown;charset=utf-8', 'document-' + Date.now() + '.md');
        });
        btnClear && btnClear.addEventListener('click', () => {
            input.value = '';
            renderedHtml = '';
            preview.replaceChildren();
        });

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
