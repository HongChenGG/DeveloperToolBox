// 增强：cURL ↔ Fetch/Axios + JSONPath 提取
(function() {
    function init() {
        // ============ cURL 转换 ============
        const curlInput = document.getElementById('curl-input');
        if (curlInput) {
            const curlOut = document.getElementById('curl-out');
            const curlTarget = document.getElementById('curl-target');
            const btnCurl = document.getElementById('btn-curl-convert');
            const btnCurlClear = document.getElementById('btn-curl-clear');
            const btnCurlCopy = document.getElementById('btn-curl-copy');

            function parseCurl(cmd) {
                cmd = cmd.replace(/\\\r?\n/g, ' ').trim();
                if (!/^curl\s/i.test(cmd)) throw new Error('请粘贴 curl 命令');
                cmd = cmd.replace(/^curl\s+/i, '');
                // 简易 tokenizer 支持引号
                const tokens = [];
                let buf = '', quote = null;
                for (let i = 0; i < cmd.length; i++) {
                    const c = cmd[i];
                    if (quote) {
                        if (c === quote) { quote = null; }
                        else if (c === '\\' && cmd[i + 1] === quote) { buf += cmd[++i]; }
                        else buf += c;
                    } else {
                        if (c === '"' || c === "'") quote = c;
                        else if (/\s/.test(c)) { if (buf) tokens.push(buf); buf = ''; }
                        else buf += c;
                    }
                }
                if (buf) tokens.push(buf);

                let url = '', method = 'GET', headers = {}, body = null;
                for (let i = 0; i < tokens.length; i++) {
                    const t = tokens[i];
                    if (t === '-X' || t === '--request') method = tokens[++i].toUpperCase();
                    else if (t === '-H' || t === '--header') {
                        const h = tokens[++i];
                        const idx = h.indexOf(':');
                        if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
                    } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
                        body = tokens[++i];
                        if (method === 'GET') method = 'POST';
                    } else if (t === '-u' || t === '--user') {
                        headers['Authorization'] = 'Basic ' + btoa(tokens[++i]);
                    } else if (t === '--url') url = tokens[++i];
                    else if (t === '-A' || t === '--user-agent') headers['User-Agent'] = tokens[++i];
                    else if (t === '-e' || t === '--referer') headers['Referer'] = tokens[++i];
                    else if (!t.startsWith('-') && !url) url = t;
                }
                return { url, method, headers, body };
            }

            function toFetch(p) {
                const opts = { method: p.method };
                if (Object.keys(p.headers).length) opts.headers = p.headers;
                if (p.body) opts.body = p.body;
                return `fetch('${p.url}', ${JSON.stringify(opts, null, 2)})\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
            }
            function toAxios(p) {
                const cfg = { method: p.method.toLowerCase(), url: p.url };
                if (Object.keys(p.headers).length) cfg.headers = p.headers;
                if (p.body) {
                    try { cfg.data = JSON.parse(p.body); } catch { cfg.data = p.body; }
                }
                return `axios(${JSON.stringify(cfg, null, 2)})\n  .then(res => console.log(res.data))\n  .catch(err => console.error(err));`;
            }
            function toPython(p) {
                const lines = ['import requests', '', `url = '${p.url}'`];
                if (Object.keys(p.headers).length) lines.push('headers = ' + JSON.stringify(p.headers, null, 2));
                if (p.body) {
                    try { lines.push('data = ' + JSON.stringify(JSON.parse(p.body), null, 2)); }
                    catch { lines.push(`data = ${JSON.stringify(p.body)}`); }
                }
                const args = ['url'];
                if (Object.keys(p.headers).length) args.push('headers=headers');
                if (p.body) args.push('json=data');
                lines.push('', `resp = requests.${p.method.toLowerCase()}(${args.join(', ')})`);
                lines.push('print(resp.status_code, resp.text)');
                return lines.join('\n');
            }
            function toJava(p) {
                const lines = ['// OkHttp', `OkHttpClient client = new OkHttpClient();`];
                if (p.body) lines.push(`RequestBody body = RequestBody.create(MediaType.parse("application/json"), ${JSON.stringify(p.body)});`);
                lines.push(`Request request = new Request.Builder()`);
                lines.push(`    .url("${p.url}")`);
                Object.entries(p.headers).forEach(([k, v]) => lines.push(`    .addHeader("${k}", "${v}")`));
                if (p.method === 'GET') lines.push('    .get()');
                else if (p.body) lines.push(`    .${p.method.toLowerCase()}(body)`);
                else lines.push(`    .method("${p.method}", null)`);
                lines.push(`    .build();`);
                lines.push(`Response response = client.newCall(request).execute();`);
                lines.push(`System.out.println(response.body().string());`);
                return lines.join('\n');
            }

            btnCurl && btnCurl.addEventListener('click', () => {
                try {
                    const p = parseCurl(curlInput.value);
                    const t = curlTarget.value;
                    if (t === 'fetch') curlOut.value = toFetch(p);
                    else if (t === 'axios') curlOut.value = toAxios(p);
                    else if (t === 'python') curlOut.value = toPython(p);
                    else if (t === 'java') curlOut.value = toJava(p);
                } catch (e) { curlOut.value = '错误: ' + e.message; }
            });
            btnCurlClear && btnCurlClear.addEventListener('click', () => { curlInput.value = ''; curlOut.value = ''; });
            btnCurlCopy && btnCurlCopy.addEventListener('click', () => {
                if (curlOut.value) navigator.clipboard.writeText(curlOut.value).then(() => showToast && showToast('已复制', 'success'));
            });
        }

        // ============ JSONPath 提取 ============
        const jpInput = document.getElementById('jp-input');
        if (jpInput) {
            const jpExpr = document.getElementById('jp-expr');
            const jpOut = document.getElementById('jp-out');
            const btnJp = document.getElementById('btn-jp-run');

            // 简易 JSONPath：支持 $.a.b、$.a[0]、$.a[*]、$..key（递归）、$.a[?(@.x==1)]
            function evalPath(data, expr) {
                if (!expr.startsWith('$')) throw new Error('表达式必须以 $ 开头');
                let result = [data];
                let i = 1;
                while (i < expr.length) {
                    const c = expr[i];
                    if (c === '.') {
                        if (expr[i + 1] === '.') {
                            // 递归
                            i += 2;
                            let key = '';
                            while (i < expr.length && /[\w*]/.test(expr[i])) key += expr[i++];
                            const acc = [];
                            const walk = v => {
                                if (v === null || typeof v !== 'object') return;
                                if (Array.isArray(v)) v.forEach(walk);
                                else {
                                    for (const [k, val] of Object.entries(v)) {
                                        if (key === '*' || k === key) acc.push(val);
                                        walk(val);
                                    }
                                }
                            };
                            result.forEach(walk);
                            result = acc;
                        } else {
                            i++;
                            let key = '';
                            while (i < expr.length && /[\w*]/.test(expr[i])) key += expr[i++];
                            if (key === '*') result = result.flatMap(v => typeof v === 'object' && v !== null ? Object.values(v) : []);
                            else result = result.map(v => v?.[key]).filter(v => v !== undefined);
                        }
                    } else if (c === '[') {
                        const end = expr.indexOf(']', i);
                        const inside = expr.slice(i + 1, end);
                        i = end + 1;
                        if (inside === '*') result = result.flatMap(v => Array.isArray(v) ? v : (typeof v === 'object' && v !== null ? Object.values(v) : []));
                        else if (/^-?\d+$/.test(inside)) {
                            const idx = parseInt(inside);
                            result = result.map(v => Array.isArray(v) ? (idx < 0 ? v[v.length + idx] : v[idx]) : v?.[inside]).filter(v => v !== undefined);
                        } else if (inside.startsWith('?(') && inside.endsWith(')')) {
                            const filter = inside.slice(2, -1).replace(/@\./g, 'item.');
                            const fn = new Function('item', `try { return (${filter}); } catch(e){ return false; }`);
                            result = result.flatMap(v => Array.isArray(v) ? v.filter(fn) : []);
                        } else {
                            // 字符串 key
                            const key = inside.replace(/^['"]|['"]$/g, '');
                            result = result.map(v => v?.[key]).filter(v => v !== undefined);
                        }
                    } else i++;
                }
                return result;
            }

            btnJp && btnJp.addEventListener('click', () => {
                try {
                    const data = JSON.parse(jpInput.value);
                    const r = evalPath(data, jpExpr.value.trim());
                    jpOut.textContent = JSON.stringify(r, null, 2);
                } catch (e) { jpOut.textContent = '错误: ' + e.message; }
            });
            jpExpr && jpExpr.addEventListener('keydown', e => { if (e.key === 'Enter') btnJp.click(); });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
