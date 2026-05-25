// JWT 解析器
(function() {
    function init() {
        const input = document.getElementById('jwt-input');
        if (!input) return;
        const headerOut = document.getElementById('jwt-header');
        const payloadOut = document.getElementById('jwt-payload');
        const signatureOut = document.getElementById('jwt-signature');
        const metaOut = document.getElementById('jwt-meta');
        const btnParse = document.getElementById('btn-jwt-parse');
        const btnClear = document.getElementById('btn-jwt-clear');

        // Base64Url 解码（支持 UTF-8）
        function base64UrlDecode(str) {
            let s = str.replace(/-/g, '+').replace(/_/g, '/');
            const pad = s.length % 4;
            if (pad) s += '='.repeat(4 - pad);
            try {
                const binary = atob(s);
                const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                return new TextDecoder('utf-8').decode(bytes);
            } catch (e) {
                return atob(s);
            }
        }

        function formatTs(ts) {
            if (!ts) return '';
            const d = new Date(ts * 1000);
            return d.toLocaleString('zh-CN', { hour12: false });
        }

        function parse() {
            const raw = (input.value || '').trim().replace(/^Bearer\s+/i, '');
            if (!raw) {
                if (typeof showToast === 'function') showToast('请输入 JWT', 'warning');
                return;
            }
            const parts = raw.split('.');
            if (parts.length !== 3) {
                if (typeof showToast === 'function') showToast('JWT 格式错误，应为 3 段（用 . 分隔）', 'error');
                return;
            }
            try {
                const header = JSON.parse(base64UrlDecode(parts[0]));
                const payload = JSON.parse(base64UrlDecode(parts[1]));
                headerOut.textContent = JSON.stringify(header, null, 2);
                payloadOut.textContent = JSON.stringify(payload, null, 2);
                signatureOut.textContent = parts[2];

                // 元信息
                const now = Math.floor(Date.now() / 1000);
                const meta = [];
                if (header.alg) meta.push(`算法: ${header.alg}`);
                if (header.typ) meta.push(`类型: ${header.typ}`);
                if (payload.iss) meta.push(`签发方 (iss): ${payload.iss}`);
                if (payload.sub) meta.push(`主体 (sub): ${payload.sub}`);
                if (payload.aud) meta.push(`受众 (aud): ${payload.aud}`);
                if (payload.iat) meta.push(`签发于 (iat): ${formatTs(payload.iat)}`);
                if (payload.nbf) meta.push(`生效于 (nbf): ${formatTs(payload.nbf)}`);
                if (payload.exp) {
                    const left = payload.exp - now;
                    const status = left > 0
                        ? `<span style="color:var(--success-color);font-weight:bold">✓ 有效（剩余 ${formatDuration(left)}）</span>`
                        : `<span style="color:var(--danger-color);font-weight:bold">✗ 已过期（${formatDuration(-left)} 前）</span>`;
                    meta.push(`过期于 (exp): ${formatTs(payload.exp)} ${status}`);
                }
                metaOut.innerHTML = meta.map(m => `<div style="padding:4px 0">${m}</div>`).join('');
                if (typeof showToast === 'function') showToast('解析成功', 'success');
            } catch (e) {
                if (typeof showToast === 'function') showToast('解析失败: ' + e.message, 'error');
            }
        }

        function formatDuration(sec) {
            sec = Math.abs(Math.floor(sec));
            const d = Math.floor(sec / 86400);
            const h = Math.floor((sec % 86400) / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            const parts = [];
            if (d) parts.push(d + '天');
            if (h) parts.push(h + '小时');
            if (m) parts.push(m + '分');
            if (!d && !h) parts.push(s + '秒');
            return parts.join(' ');
        }

        btnParse && btnParse.addEventListener('click', parse);
        btnClear && btnClear.addEventListener('click', () => {
            input.value = '';
            headerOut.textContent = '';
            payloadOut.textContent = '';
            signatureOut.textContent = '';
            metaOut.innerHTML = '';
        });
        // 输入框 Ctrl+Enter 触发
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') parse();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
