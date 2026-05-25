// Hash 计算器（文本 + 文件）依赖 lib/crypto-js.min.js (全局 CryptoJS)
(function() {
    function init() {
        const textInput = document.getElementById('hash-text');
        if (!textInput) return;
        const out = document.getElementById('hash-out');
        const fileInput = document.getElementById('hash-file');
        const fileInfo = document.getElementById('hash-file-info');
        const btnText = document.getElementById('btn-hash-text');
        const btnClear = document.getElementById('btn-hash-clear');

        function htmlRow(label, val) {
            return `<div style="margin-bottom:8px;padding:10px;background:var(--bg-darker);border-radius:4px;font-family:monospace;font-size:13px;">
                <div style="color:var(--accent-color);font-weight:bold;margin-bottom:4px;">${label}</div>
                <div style="word-break:break-all;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <span style="flex:1">${val}</span>
                    <button class="btn btn-success" style="padding:4px 10px;font-size:12px;flex:none" data-copy="${val}">复制</button>
                </div>
            </div>`;
        }

        function calcText() {
            const t = textInput.value;
            if (typeof CryptoJS === 'undefined') { out.innerHTML = '<span style="color:var(--danger-color)">crypto-js.min.js 未加载</span>'; return; }
            const md5 = CryptoJS.MD5(t).toString();
            const sha1 = CryptoJS.SHA1(t).toString();
            const sha256 = CryptoJS.SHA256(t).toString();
            const sha512 = CryptoJS.SHA512(t).toString();
            const sha3 = CryptoJS.SHA3(t).toString();
            const ripemd = CryptoJS.RIPEMD160(t).toString();
            const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(t));
            out.innerHTML =
                htmlRow('MD5', md5) +
                htmlRow('SHA-1', sha1) +
                htmlRow('SHA-256', sha256) +
                htmlRow('SHA-512', sha512) +
                htmlRow('SHA-3', sha3) +
                htmlRow('RIPEMD-160', ripemd) +
                htmlRow('Base64', base64) +
                htmlRow('字符长度 / 字节长度', t.length + ' / ' + new Blob([t]).size);
            // 绑定复制
            out.querySelectorAll('[data-copy]').forEach(btn => {
                btn.addEventListener('click', () => {
                    navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(() => showToast && showToast('已复制', 'success'));
                });
            });
        }

        async function calcFile(file) {
            if (!file) return;
            fileInfo.textContent = `文件: ${file.name}（${(file.size / 1024).toFixed(2)} KB）计算中...`;
            const buf = await file.arrayBuffer();
            const wordArray = CryptoJS.lib.WordArray.create(buf);
            const md5 = CryptoJS.MD5(wordArray).toString();
            const sha1 = CryptoJS.SHA1(wordArray).toString();
            const sha256 = CryptoJS.SHA256(wordArray).toString();
            // Web Crypto SHA-512 也可
            let sha512 = '';
            try {
                const hash = await crypto.subtle.digest('SHA-512', buf);
                sha512 = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) { sha512 = CryptoJS.SHA512(wordArray).toString(); }
            fileInfo.textContent = `文件: ${file.name}（${(file.size / 1024).toFixed(2)} KB）`;
            out.innerHTML =
                htmlRow('文件 MD5', md5) +
                htmlRow('文件 SHA-1', sha1) +
                htmlRow('文件 SHA-256', sha256) +
                htmlRow('文件 SHA-512', sha512);
            out.querySelectorAll('[data-copy]').forEach(btn => {
                btn.addEventListener('click', () => {
                    navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(() => showToast && showToast('已复制', 'success'));
                });
            });
        }

        btnText && btnText.addEventListener('click', calcText);
        textInput.addEventListener('input', () => { if (textInput.value) calcText(); else out.innerHTML = ''; });
        fileInput && fileInput.addEventListener('change', e => calcFile(e.target.files[0]));
        btnClear && btnClear.addEventListener('click', () => {
            textInput.value = ''; out.innerHTML = ''; fileInput.value = ''; fileInfo.textContent = '';
        });

        // 拖拽文件
        const dropZone = document.getElementById('hash-drop');
        if (dropZone) {
            ['dragover', 'dragenter'].forEach(ev => dropZone.addEventListener(ev, e => {
                e.preventDefault(); dropZone.style.background = 'var(--hover-bg)';
            }));
            ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => {
                e.preventDefault(); dropZone.style.background = '';
            }));
            dropZone.addEventListener('drop', e => {
                const f = e.dataTransfer.files[0];
                if (f) calcFile(f);
            });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
