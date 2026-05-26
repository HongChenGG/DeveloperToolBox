/**
 * toolbox-search-proxy
 * ---------------------------------------------------------------
 * 极简 Cloudflare Workers 反代，解决浏览器端 AI 的两个跨域痛点：
 *
 *   1) GET  /search?q=关键词           → 搜索（默认 Bing HTML 抓取，无需 Key；可切 ddg / Google CSE / Bing API）
 *   2) GET  /fetch?url=https://xxx     → 抓取任意网页正文（自动转纯文本）
 *
 * 都自带 Access-Control-Allow-Origin: *，浏览器端 fetch 直接调用即可。
 *
 * 部署：
 *   方式 A — 仪表盘粘贴（最简单）
 *     1. 登录 dash.cloudflare.com → Workers & Pages → Create
 *     2. 选 "Hello World" 模板 → Quick edit → 把本文件全部粘贴覆盖
 *     3. 右上角 Save and deploy，记下 *.workers.dev 地址（例：https://toolbox-search-proxy.xxx.workers.dev）
 *     4. 仪表盘里 Settings → Variables：
 *          - PROXY_TOKEN                          （可选但强烈建议：自己的访问密钥，防止被薅免费额度）
 *          - GOOGLE_API_KEY  / GOOGLE_CX         （可选，想用 Google CSE 时填；2025 起新建 CSE 已无法"搜整个网络"）
 *          - BING_API_KEY                         （可选，想用 Bing 时填）
 *          - DEFAULT_ENGINE = bing_html | ddg | google | bing （可选，默认 bing_html）
 *        不填任何搜索 Key 也能用 —— 默认走 Bing HTML 抓取，无需注册。
 *     5. 在 toolbox 的"AI 设置 → 联网搜索"里：
 *          搜索引擎 URL 模板  =  https://toolbox-search-proxy.xxx.workers.dev/search?q={q}
 *          代理 Token         =  上一步那个 PROXY_TOKEN
 *
 *   方式 B — wrangler CLI（适合多环境）
 *     npm i -g wrangler && wrangler login
 *     wrangler init toolbox-search-proxy --type=javascript
 *     把本文件替换 src/index.js → wrangler deploy
 *
 * 配额（免费）：
 *   Workers Free  - 10 万次请求/天
 *   Bing HTML     - 无官方限制（抓取公开页面，建议适度使用 + 缓存）
 *   DuckDuckGo    - 无官方限制（但云 IP 命中率不稳定，约 50%）
 *   Google CSE    - 1000 次/天免费（需 API Key + CX）
 *   Bing Web API  - F0 阶梯 1000 次/月免费
 *
 * 注意：本 Worker 不缓存搜索结果（避免命中 KV 计费）。如需缓存请自行加 Cache API。
 */

const ALLOW_HEADERS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Token',
    'Access-Control-Max-Age':       '86400',
};

function json(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...ALLOW_HEADERS, ...extra },
    });
}

function text(body, status = 200, extra = {}) {
    return new Response(body, {
        status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...ALLOW_HEADERS, ...extra },
    });
}

// 校验访问 Token（可选）：通过 ?token=xxx 或 X-Proxy-Token Header 传
function authorize(request, env) {
    if (!env.PROXY_TOKEN) return true; // 未设置 = 公开
    const url = new URL(request.url);
    const t = url.searchParams.get('token') || request.headers.get('X-Proxy-Token') || '';
    return t === env.PROXY_TOKEN;
}

// 把 HTML 压成可读纯文本（极简版，节省上下文 token）
function htmlToText(html) {
    return String(html)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// ───────────────── 搜索：Google CSE ─────────────────
async function searchGoogle(query, env) {
    if (!env.GOOGLE_API_KEY || !env.GOOGLE_CX) {
        throw new Error('Google CSE 未配置（缺 GOOGLE_API_KEY / GOOGLE_CX 环境变量）');
    }
    const u = `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_API_KEY}&cx=${env.GOOGLE_CX}&q=${encodeURIComponent(query)}&num=8&hl=zh-CN`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`Google CSE HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const items = (data.items || []).map(it => ({
        title:   it.title || '',
        link:    it.link  || '',
        snippet: it.snippet || '',
    }));
    return { engine: 'google', query, items };
}

// ───────────────── 搜索：Bing Web Search ─────────────────
async function searchBing(query, env) {
    if (!env.BING_API_KEY) {
        throw new Error('Bing 未配置（缺 BING_API_KEY 环境变量）');
    }
    const u = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=8&mkt=zh-CN`;
    const r = await fetch(u, { headers: { 'Ocp-Apim-Subscription-Key': env.BING_API_KEY } });
    if (!r.ok) throw new Error(`Bing HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const items = (data.webPages?.value || []).map(it => ({
        title:   it.name || '',
        link:    it.url  || '',
        snippet: it.snippet || '',
    }));
    return { engine: 'bing', query, items };
}

// 通用：标签清洗 & HTML 实体解码（小工具，搜索/抓取共用）
function stripTags(s) {
    return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
        .replace(/\s+/g, ' ').trim();
}

// 模拟真实浏览器的请求头（云 IP 反爬必备）
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
};

// ───────────────── 搜索：Bing HTML（无需 Key，云 IP 友好，默认引擎） ─────────────────
async function searchBingHtml(query) {
    const u = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-CN&cc=CN&FORM=QBLH`;
    const r = await fetch(u, { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.bing.com/' } });
    if (!r.ok) throw new Error(`Bing HTTP ${r.status}`);
    const html = await r.text();

    // 结构：<li class="b_algo"> <h2><a href="..">title</a></h2> <p class="b_lineclamp...">snippet</p> </li>
    const items = [];
    const blockRe = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
    const titleLinkRe = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
    const snippetRe1  = /<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i;
    const snippetRe2  = /<div[^>]*class="b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i;
    let bm;
    while ((bm = blockRe.exec(html)) !== null) {
        const block = bm[1];
        const t = block.match(titleLinkRe);
        if (!t) continue;
        const sm = block.match(snippetRe1) || block.match(snippetRe2);
        items.push({
            title:   stripTags(t[2]),
            link:    t[1],
            snippet: sm ? stripTags(sm[1]) : '',
        });
        if (items.length >= 10) break;
    }
    return { engine: 'bing-html', query, items };
}

// ───────────────── 搜索：DuckDuckGo Lite（备用，云 IP 命中率约 50%） ─────────────────
async function searchDuckDuckGo(query) {
    // lite 端点结构最简单，比 html 端点更宽容；POST 表单更像真人
    const u = 'https://lite.duckduckgo.com/lite/';
    const form = new URLSearchParams({ q: query, kl: 'cn-zh' }).toString();
    const r = await fetch(u, {
        method: 'POST',
        headers: {
            ...BROWSER_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://lite.duckduckgo.com/',
            'Origin':  'https://lite.duckduckgo.com',
        },
        body: form,
    });
    if (!r.ok) throw new Error(`DuckDuckGo HTTP ${r.status}`);
    const html = await r.text();

    // lite 结构：<a class="result-link" href="...">Title</a> 后跟一行 <td class="result-snippet">snippet</td>
    const items = [];
    const linkRe    = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRe = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

    const links = [];
    let m;
    while ((m = linkRe.exec(html)) !== null) {
        let raw = m[1];
        if (raw.startsWith('//')) raw = 'https:' + raw;
        if (raw.startsWith('/l/?')) {
            try {
                const u2 = new URL('https://duckduckgo.com' + raw);
                const real = u2.searchParams.get('uddg');
                if (real) raw = decodeURIComponent(real);
            } catch {}
        }
        links.push({ title: stripTags(m[2]), link: raw });
        if (links.length >= 10) break;
    }
    const snippets = [];
    while ((m = snippetRe.exec(html)) !== null) {
        snippets.push(stripTags(m[1]));
        if (snippets.length >= 10) break;
    }
    for (let i = 0; i < links.length; i++) {
        items.push({ title: links[i].title, link: links[i].link, snippet: snippets[i] || '' });
    }
    return { engine: 'duckduckgo-lite', query, items };
}

// ───────────────── 路由 ─────────────────
async function handle(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: ALLOW_HEADERS });
    }

    // 健康检查
    if (url.pathname === '/' || url.pathname === '/health') {
        return json({
            name: 'toolbox-search-proxy',
            ok: true,
            engines: {
                bing_html:  true, // 默认：Bing HTML 抓取，无需 Key，云 IP 友好
                ddg:        true, // 备选：DuckDuckGo lite，云 IP 命中率约 50%
                google:     !!env.GOOGLE_API_KEY && !!env.GOOGLE_CX,
                bing:       !!env.BING_API_KEY,
            },
            defaultEngine: (env.DEFAULT_ENGINE || 'bing_html').toLowerCase(),
            authRequired: !!env.PROXY_TOKEN,
        });
    }

    if (!authorize(request, env)) {
        return json({ error: 'unauthorized: 缺少或错误的 PROXY_TOKEN（?token= 或 X-Proxy-Token）' }, 401);
    }

    // /search?q=...&engine=bing_html|ddg|google|bing
    if (url.pathname === '/search') {
        const q = url.searchParams.get('q') || '';
        if (!q) return json({ error: "missing 'q' parameter" }, 400);
        // 默认引擎：用户指定 > 环境变量 > bing_html（Bing HTML 抓取，对云 IP 友好，无需 Key）
        const engine = (url.searchParams.get('engine') || (env.DEFAULT_ENGINE || 'bing_html')).toLowerCase();
        try {
            let result;
            if (engine === 'google')          result = await searchGoogle(q, env);
            else if (engine === 'bing')       result = await searchBing(q, env);        // Azure API
            else if (engine === 'ddg')        result = await searchDuckDuckGo(q);       // DDG lite 备选
            else                              result = await searchBingHtml(q);         // 默认：Bing HTML 抓取
            // 主引擎返回空时自动尝试备选，避免假成功
            if (!result.items || result.items.length === 0) {
                if (engine === 'bing_html' || engine === '') {
                    try {
                        const fb = await searchDuckDuckGo(q);
                        if (fb.items && fb.items.length > 0) {
                            return json({ ...fb, fallback: 'bing_html(empty) → ddg' });
                        }
                    } catch {}
                }
            }
            return json(result);
        } catch (e) {
            // 默认引擎抛错时也尝试备选
            if (engine === 'bing_html' || engine === '') {
                try {
                    const fb = await searchDuckDuckGo(q);
                    return json({ ...fb, fallback: 'bing_html → ddg', primaryError: e.message });
                } catch (e2) {
                    return json({ error: `bing_html: ${e.message} | ddg: ${e2.message}` }, 500);
                }
            }
            return json({ error: e.message }, 500);
        }
    }

    // /fetch?url=...&format=text|raw
    if (url.pathname === '/fetch') {
        const target = url.searchParams.get('url') || '';
        if (!target) return json({ error: "missing 'url' parameter" }, 400);
        if (!/^https?:\/\//i.test(target)) return json({ error: 'only http(s) URLs are allowed' }, 400);
        const format = url.searchParams.get('format') || 'text';
        try {
            const r = await fetch(target, {
                redirect: 'follow',
                headers: { 'User-Agent': 'Mozilla/5.0 toolbox-search-proxy' },
            });
            const raw = await r.text();
            const cap = parseInt(env.FETCH_MAX_CHARS || '8000', 10);
            if (format === 'raw') {
                return new Response(raw.slice(0, cap), {
                    status: r.status,
                    headers: { 'Content-Type': r.headers.get('Content-Type') || 'text/plain; charset=utf-8', ...ALLOW_HEADERS },
                });
            }
            const plain = htmlToText(raw).slice(0, cap);
            return json({ url: target, status: r.status, text: plain, truncated: raw.length > cap });
        } catch (e) {
            return json({ error: e.message, url: target }, 502);
        }
    }

    return json({ error: 'not found', routes: ['/', '/health', '/search?q=...', '/fetch?url=...'] }, 404);
}

export default {
    fetch: handle,
};
