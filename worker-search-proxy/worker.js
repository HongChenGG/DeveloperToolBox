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
const SEARCH_ENGINES = new Set(['bing_html', 'ddg', 'google', 'bing']);
const DEFAULT_FETCH_MAX_CHARACTERS = 8000;

function normalizeSearchEngine(value) {
    const engine = String(value || 'bing_html').toLowerCase();
    if (!SEARCH_ENGINES.has(engine)) {
        throw createPolicyError('INVALID_ENGINE', `不支持的搜索引擎：${engine}`, 400);
    }
    return engine;
}

function normalizeMaximumCharacters(value) {
    const parsedValue = Number.parseInt(value || String(DEFAULT_FETCH_MAX_CHARACTERS), 10);
    return Number.isSafeInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : DEFAULT_FETCH_MAX_CHARACTERS;
}

function json(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...ALLOW_HEADERS, ...extra },
    });
}

function createPolicyError(code, message, status = 400) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

function createErrorResponse(error, fallbackCode = 'UPSTREAM_ERROR', fallbackStatus = 502) {
    return json({
        error: {
            code: error?.code || fallbackCode,
            message: error?.message || '上游请求失败',
        },
    }, error?.status || fallbackStatus);
}

function parseIpv4(address) {
    const parts = String(address).split('.');
    if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
    return parts.reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function isInIpv4Range(numericAddress, networkAddress, prefixLength) {
    const network = parseIpv4(networkAddress);
    const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
    return (numericAddress & mask) === (network & mask);
}

function isBlockedIpv4(address) {
    const numericAddress = parseIpv4(address);
    if (numericAddress === null) return false;

    // 安全边界采用允许全球可路由地址的策略，任何特殊用途网段都默认拒绝。
    const blockedRanges = [
        ['0.0.0.0', 8],
        ['10.0.0.0', 8],
        ['100.64.0.0', 10],
        ['127.0.0.0', 8],
        ['169.254.0.0', 16],
        ['172.16.0.0', 12],
        ['192.0.0.0', 24],
        ['192.0.2.0', 24],
        ['192.88.99.0', 24],
        ['192.168.0.0', 16],
        ['198.18.0.0', 15],
        ['198.51.100.0', 24],
        ['203.0.113.0', 24],
        ['224.0.0.0', 4],
        ['240.0.0.0', 4],
    ];

    return blockedRanges.some(([networkAddress, prefixLength]) => (
        isInIpv4Range(numericAddress, networkAddress, prefixLength)
    ));
}

function parseIpv6(address) {
    let normalizedAddress = String(address || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
    if (!normalizedAddress.includes(':') || normalizedAddress.includes('%')) return null;

    const embeddedIpv4Match = normalizedAddress.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (embeddedIpv4Match) {
        const numericIpv4 = parseIpv4(embeddedIpv4Match[2]);
        if (numericIpv4 === null) return null;
        normalizedAddress = `${embeddedIpv4Match[1]}${((numericIpv4 >>> 16) & 0xffff).toString(16)}:${(numericIpv4 & 0xffff).toString(16)}`;
    }

    if (!/^[0-9a-f:]+$/.test(normalizedAddress) || normalizedAddress.includes(':::')) return null;
    const compressionParts = normalizedAddress.split('::');
    if (compressionParts.length > 2) return null;

    const parseSection = section => {
        if (!section) return [];
        const groups = section.split(':');
        if (groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
        return groups.map(group => Number.parseInt(group, 16));
    };
    const leftGroups = parseSection(compressionParts[0]);
    const rightGroups = compressionParts.length === 2 ? parseSection(compressionParts[1]) : [];
    if (!leftGroups || !rightGroups) return null;

    if (compressionParts.length === 1) {
        return leftGroups.length === 8 ? leftGroups : null;
    }

    const omittedGroupCount = 8 - leftGroups.length - rightGroups.length;
    if (omittedGroupCount < 1) return null;
    return [...leftGroups, ...Array(omittedGroupCount).fill(0), ...rightGroups];
}

function isInIpv6Range(groups, networkGroups, prefixLength) {
    const wholeGroupCount = Math.floor(prefixLength / 16);
    for (let groupIndex = 0; groupIndex < wholeGroupCount; groupIndex++) {
        if (groups[groupIndex] !== networkGroups[groupIndex]) return false;
    }

    const remainingBits = prefixLength % 16;
    if (remainingBits === 0) return true;
    const mask = (0xffff << (16 - remainingBits)) & 0xffff;
    return (groups[wholeGroupCount] & mask) === (networkGroups[wholeGroupCount] & mask);
}

function ipv4FromMappedIpv6(groups) {
    const isIpv4Mapped = groups.slice(0, 5).every(group => group === 0) && groups[5] === 0xffff;
    if (!isIpv4Mapped) return null;
    return ((groups[6] << 16) | groups[7]) >>> 0;
}

function isBlockedIpv6(address) {
    const groups = parseIpv6(address);
    if (!groups) return String(address || '').includes(':');

    const mappedIpv4 = ipv4FromMappedIpv6(groups);
    if (mappedIpv4 !== null) {
        return isBlockedIpv4([
            mappedIpv4 >>> 24,
            (mappedIpv4 >>> 16) & 0xff,
            (mappedIpv4 >>> 8) & 0xff,
            mappedIpv4 & 0xff,
        ].join('.'));
    }

    // 仅允许 IANA 当前分配给全球单播的 2000::/3，并排除其中的特殊用途前缀。
    const globallyRoutedNetwork = parseIpv6('2000::');
    if (!isInIpv6Range(groups, globallyRoutedNetwork, 3)) return true;

    const blockedNetworks = [
        ['2001::', 23],
        ['2001:2::', 48],
        ['2001:10::', 28],
        ['2001:20::', 28],
        ['2001:db8::', 32],
        ['2002::', 16],
        ['3fff::', 20],
    ];
    return blockedNetworks.some(([networkAddress, prefixLength]) => (
        isInIpv6Range(groups, parseIpv6(networkAddress), prefixLength)
    ));
}

function isBlockedIpAddress(address) {
    return isBlockedIpv4(address) || isBlockedIpv6(address);
}

async function resolveHostnameWithDoh(hostname, { fetchImpl = fetch, signal } = {}) {
    const addresses = [];
    for (const recordType of ['A', 'AAAA']) {
        const resolverUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${recordType}`;
        const response = await fetchImpl(resolverUrl, {
            headers: { Accept: 'application/dns-json' },
            signal,
        });
        if (!response.ok) throw createPolicyError('DNS_ERROR', `DNS 查询失败：HTTP ${response.status}`, 502);
        const data = await response.json();
        for (const answer of data.Answer || []) {
            if ((answer.type === 1 || answer.type === 28) && typeof answer.data === 'string') {
                addresses.push(answer.data);
            }
        }
    }
    if (!addresses.length) throw createPolicyError('DNS_ERROR', '目标域名没有可用的 A/AAAA 记录', 502);
    return addresses;
}

async function validateOutboundUrl(rawUrl, {
    resolveHostname = resolveHostnameWithDoh,
    fetchImpl = fetch,
    signal,
} = {}) {
    const normalizedInput = /^[a-z][a-z0-9+.-]*:\/\//i.test(String(rawUrl || ''))
        ? String(rawUrl)
        : `https://${String(rawUrl || '')}`;
    let targetUrl;
    try {
        targetUrl = new URL(normalizedInput);
    } catch {
        throw createPolicyError('INVALID_URL', '目标 URL 格式无效', 400);
    }
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        throw createPolicyError('INVALID_URL', '仅允许 http 和 https 地址', 400);
    }
    if (targetUrl.username || targetUrl.password) {
        throw createPolicyError('INVALID_URL', '目标 URL 不允许包含用户名或密码凭据', 400);
    }

    const hostname = targetUrl.hostname.toLowerCase().replace(/\.$/, '');
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        throw createPolicyError('BLOCKED_TARGET', '目标地址不允许访问 localhost', 403);
    }
    if (parseIpv4(hostname) !== null || hostname.includes(':')) {
        throw createPolicyError('BLOCKED_TARGET', '目标地址不允许使用 IP 字面量', 403);
    }

    const addresses = await resolveHostname(hostname, { fetchImpl, signal });
    if (!Array.isArray(addresses) || !addresses.length) {
        throw createPolicyError('DNS_ERROR', '目标域名没有可用地址', 502);
    }
    if (addresses.some(isBlockedIpAddress)) {
        throw createPolicyError('BLOCKED_TARGET', '目标域名解析到私网或保留地址', 403);
    }

    return targetUrl;
}

async function cancelResponseBody(response) {
    if (!response?.body) return;
    try {
        await response.body.cancel();
    } catch {
        // 正文可能已由其他读取器取消；拒绝路径不应因此覆盖原始策略错误。
    }
}

function createDeadline(timeoutMs, parentSignal) {
    const controller = new AbortController();
    let timedOut = false;
    let parentAborted = false;
    const abortFromParent = () => {
        parentAborted = true;
        controller.abort();
    };
    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });

    const timeoutError = () => createPolicyError('TIMEOUT', '上游请求超时', 504);
    const run = async operation => {
        if (controller.signal.aborted) throw timeoutError();

        let abortListener;
        const aborted = new Promise((resolve, reject) => {
            abortListener = () => reject(timeoutError());
            controller.signal.addEventListener('abort', abortListener, { once: true });
        });
        try {
            return await Promise.race([Promise.resolve().then(operation), aborted]);
        } catch (error) {
            if (controller.signal.aborted || timedOut || parentAborted) throw timeoutError();
            throw error;
        } finally {
            controller.signal.removeEventListener('abort', abortListener);
        }
    };
    const dispose = () => {
        clearTimeout(timeoutId);
        parentSignal?.removeEventListener('abort', abortFromParent);
    };

    return { signal: controller.signal, run, dispose };
}

async function readResponseBodyLimited(response, maxBodyBytes, { runWithDeadline } = {}) {
    const declaredLengthHeader = response.headers.get('Content-Length');
    const declaredLength = declaredLengthHeader === null ? null : Number(declaredLengthHeader);
    if (declaredLength !== null && Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
        await cancelResponseBody(response);
        throw createPolicyError('BODY_TOO_LARGE', `响应正文超过 ${maxBodyBytes} 字节上限`, 413);
    }
    if (!response.body) return new Uint8Array();

    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    let completed = false;
    let readerCancelled = false;
    const cancelReader = async () => {
        if (readerCancelled) return;
        readerCancelled = true;
        try {
            await reader.cancel();
        } catch {
            // 读取异常后 cancel 也可能失败；仍需继续释放 reader 锁并保留原始错误。
        }
    };

    try {
        while (true) {
            const readResult = runWithDeadline
                ? await runWithDeadline(() => reader.read())
                : await reader.read();
            if (readResult.done) {
                completed = true;
                break;
            }

            totalBytes += readResult.value.byteLength;
            if (totalBytes > maxBodyBytes) {
                await cancelReader();
                throw createPolicyError('BODY_TOO_LARGE', `响应正文超过 ${maxBodyBytes} 字节上限`, 413);
            }
            chunks.push(readResult.value);
        }
    } catch (error) {
        await cancelReader();
        throw error;
    } finally {
        if (!completed) await cancelReader();
        reader.releaseLock();
    }

    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return combined;
}

function isSupportedContentType(contentType) {
    const mediaType = String(contentType || '').split(';', 1)[0].trim().toLowerCase();
    return new Set([
        'text/plain',
        'text/html',
        'application/json',
        'application/xml',
        'text/xml',
        'application/xhtml+xml',
    ]).has(mediaType);
}

async function fetchWithOutboundPolicy(rawUrl, {
    fetchImpl = fetch,
    resolveHostname = resolveHostnameWithDoh,
    signal,
    maxRedirects = 3,
    timeoutMs = 15000,
    maxBodyBytes = 1024 * 1024,
    headers = {},
} = {}) {
    const deadline = createDeadline(timeoutMs, signal);

    try {
        let currentUrl = await deadline.run(() => validateOutboundUrl(rawUrl, {
            resolveHostname,
            fetchImpl,
            signal: deadline.signal,
        }));

        for (let redirectCount = 0; ; redirectCount++) {
            let response;
            try {
                response = await deadline.run(() => fetchImpl(currentUrl, {
                    redirect: 'manual',
                    headers,
                    signal: deadline.signal,
                }));
            } catch (error) {
                if (error?.code === 'TIMEOUT') throw error;
                throw createPolicyError('UPSTREAM_ERROR', error?.message || '上游请求失败', 502);
            }

            if ([301, 302, 303, 307, 308].includes(response.status)) {
                if (redirectCount >= maxRedirects) {
                    await cancelResponseBody(response);
                    throw createPolicyError('REDIRECT_LIMIT', '重定向次数超过限制', 508);
                }
                const location = response.headers.get('Location');
                if (!location) {
                    await cancelResponseBody(response);
                    throw createPolicyError('UPSTREAM_ERROR', '重定向响应缺少 Location', 502);
                }

                await cancelResponseBody(response);
                currentUrl = await deadline.run(() => validateOutboundUrl(new URL(location, currentUrl).href, {
                    resolveHostname,
                    fetchImpl,
                    signal: deadline.signal,
                }));
                continue;
            }

            const contentType = response.headers.get('Content-Type') || '';
            if (!isSupportedContentType(contentType)) {
                await cancelResponseBody(response);
                throw createPolicyError('UNSUPPORTED_CONTENT_TYPE', `不支持的 Content-Type：${contentType || '(缺失)'}`, 415);
            }

            const bodyBytes = await readResponseBodyLimited(response, maxBodyBytes, {
                runWithDeadline: deadline.run,
            });
            return { response, finalUrl: currentUrl.href, bodyBytes };
        }
    } finally {
        deadline.dispose();
    }
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

async function runSearchRequest(url, options, deadline) {
    const response = await deadline.run(() => options.fetchImpl(url, {
        ...options.requestInit,
        signal: deadline.signal,
    }));

    try {
        if (!response.ok) {
            throw createPolicyError('SEARCH_FAILED', `${options.engineName} HTTP ${response.status}`, 502);
        }
        const bodyBytes = await readResponseBodyLimited(response, options.maxBodyBytes, {
            runWithDeadline: deadline.run,
        });
        return new TextDecoder('utf-8').decode(bodyBytes);
    } catch (error) {
        await cancelResponseBody(response);
        throw error;
    }
}

// ───────────────── 搜索：Google CSE ─────────────────
async function searchGoogle(query, env, options) {
    if (!env.GOOGLE_API_KEY || !env.GOOGLE_CX) {
        throw new Error('Google CSE 未配置（缺 GOOGLE_API_KEY / GOOGLE_CX 环境变量）');
    }
    const url = `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_API_KEY}&cx=${env.GOOGLE_CX}&q=${encodeURIComponent(query)}&num=8&hl=zh-CN`;
    const raw = await runSearchRequest(url, {
        ...options,
        engineName: 'Google CSE',
    }, options.deadline);
    const data = JSON.parse(raw);
    const items = (data.items || []).map(item => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
    }));
    return { engine: 'google', query, items };
}

// ───────────────── 搜索：Bing Web Search ─────────────────
async function searchBing(query, env, options) {
    if (!env.BING_API_KEY) {
        throw new Error('Bing 未配置（缺 BING_API_KEY 环境变量）');
    }
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=8&mkt=zh-CN`;
    const raw = await runSearchRequest(url, {
        ...options,
        engineName: 'Bing',
        requestInit: { headers: { 'Ocp-Apim-Subscription-Key': env.BING_API_KEY } },
    }, options.deadline);
    const data = JSON.parse(raw);
    const items = (data.webPages?.value || []).map(item => ({
        title: item.name || '',
        link: item.url || '',
        snippet: item.snippet || '',
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
async function searchBingHtml(query, options) {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-CN&cc=CN&FORM=QBLH`;
    const html = await runSearchRequest(url, {
        ...options,
        engineName: 'Bing',
        requestInit: { headers: { ...BROWSER_HEADERS, 'Referer': 'https://www.bing.com/' } },
    }, options.deadline);

    // 结构：<li class="b_algo"> <h2><a href="..">title</a></h2> <p class="b_lineclamp...">snippet</p> </li>
    const items = [];
    const resultBlockPattern = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
    const titleLinkPattern = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
    const lineClampSnippetPattern = /<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i;
    const captionSnippetPattern = /<div[^>]*class="b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i;
    let resultMatch;
    while ((resultMatch = resultBlockPattern.exec(html)) !== null) {
        const resultBlock = resultMatch[1];
        const titleMatch = resultBlock.match(titleLinkPattern);
        if (!titleMatch) continue;
        const snippetMatch = resultBlock.match(lineClampSnippetPattern) || resultBlock.match(captionSnippetPattern);
        items.push({
            title: stripTags(titleMatch[2]),
            link: titleMatch[1],
            snippet: snippetMatch ? stripTags(snippetMatch[1]) : '',
        });
        if (items.length >= 10) break;
    }
    return { engine: 'bing-html', query, items };
}

// ───────────────── 搜索：DuckDuckGo Lite（备用，云 IP 命中率约 50%） ─────────────────
async function searchDuckDuckGo(query, options) {
    // lite 端点结构最简单，比 html 端点更宽容；POST 表单更像真人
    const url = 'https://lite.duckduckgo.com/lite/';
    const form = new URLSearchParams({ q: query, kl: 'cn-zh' }).toString();
    const html = await runSearchRequest(url, {
        ...options,
        engineName: 'DuckDuckGo',
        requestInit: {
            method: 'POST',
            headers: {
                ...BROWSER_HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://lite.duckduckgo.com/',
                'Origin': 'https://lite.duckduckgo.com',
            },
            body: form,
        },
    }, options.deadline);

    // lite 结构：<a class="result-link" href="...">Title</a> 后跟一行 <td class="result-snippet">snippet</td>
    const items = [];
    const linkPattern = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetPattern = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

    const links = [];
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
        let rawLink = match[1];
        if (rawLink.startsWith('//')) rawLink = `https:${rawLink}`;
        if (rawLink.startsWith('/l/?')) {
            try {
                const redirectUrl = new URL(`https://duckduckgo.com${rawLink}`);
                const destinationUrl = redirectUrl.searchParams.get('uddg');
                if (destinationUrl) rawLink = decodeURIComponent(destinationUrl);
            } catch (error) {
                console.warn('DuckDuckGo 跳转链接解析失败:', error.message);
            }
        }
        links.push({ title: stripTags(match[2]), link: rawLink });
        if (links.length >= 10) break;
    }

    const snippets = [];
    while ((match = snippetPattern.exec(html)) !== null) {
        snippets.push(stripTags(match[1]));
        if (snippets.length >= 10) break;
    }
    for (let resultIndex = 0; resultIndex < links.length; resultIndex++) {
        items.push({
            title: links[resultIndex].title,
            link: links[resultIndex].link,
            snippet: snippets[resultIndex] || '',
        });
    }
    return { engine: 'duckduckgo-lite', query, items };
}

// ───────────────── 路由 ─────────────────
async function handle(request, env, dependencies = {}) {
    const url = new URL(request.url);
    const fetchImpl = dependencies.fetchImpl || fetch;
    const resolveHostname = dependencies.resolveHostname || resolveHostnameWithDoh;
    const timeoutMs = dependencies.timeoutMs || 15000;
    const maxBodyBytes = dependencies.maxBodyBytes || 1024 * 1024;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: ALLOW_HEADERS });
    }

    // 健康检查
    if (url.pathname === '/' || url.pathname === '/health') {
        let defaultEngine;
        try {
            defaultEngine = normalizeSearchEngine(env.DEFAULT_ENGINE || 'bing_html');
        } catch {
            defaultEngine = 'bing_html';
        }
        return json({
            name: 'toolbox-search-proxy',
            ok: true,
            engines: {
                bing_html:  true, // 默认：Bing HTML 抓取，无需 Key，云 IP 友好
                ddg:        true, // 备选：DuckDuckGo lite，云 IP 命中率约 50%
                google:     !!env.GOOGLE_API_KEY && !!env.GOOGLE_CX,
                bing:       !!env.BING_API_KEY,
            },
            defaultEngine,
            authRequired: !!env.PROXY_TOKEN,
        });
    }

    if (!authorize(request, env)) {
        return createErrorResponse(createPolicyError('UNAUTHORIZED', '缺少或错误的 PROXY_TOKEN', 401));
    }

    // /search?q=...&engine=bing_html|ddg|google|bing
    if (url.pathname === '/search') {
        const query = url.searchParams.get('q') || '';
        if (!query) return createErrorResponse(createPolicyError('INVALID_QUERY', "缺少 'q' 参数", 400));

        let engine;
        try {
            engine = normalizeSearchEngine(url.searchParams.get('engine') || env.DEFAULT_ENGINE || 'bing_html');
        } catch (error) {
            return createErrorResponse(error);
        }
        const deadline = createDeadline(timeoutMs, request.signal);
        const searchOptions = { deadline, fetchImpl, maxBodyBytes };
        try {
            let result;
            if (engine === 'google') result = await searchGoogle(query, env, searchOptions);
            else if (engine === 'bing') result = await searchBing(query, env, searchOptions);
            else if (engine === 'ddg') result = await searchDuckDuckGo(query, searchOptions);
            else result = await searchBingHtml(query, searchOptions);

            // 主引擎返回空时复用同一 deadline 尝试备用引擎，禁止为 fallback 重置时限。
            if ((!result.items || result.items.length === 0) && (engine === 'bing_html' || engine === '')) {
                try {
                    const fallbackResult = await searchDuckDuckGo(query, searchOptions);
                    if (fallbackResult.items && fallbackResult.items.length > 0) {
                        return json({ ...fallbackResult, fallback: 'bing_html(empty) → ddg' });
                    }
                } catch (fallbackError) {
                    if (fallbackError?.code === 'TIMEOUT') throw fallbackError;
                    console.warn('Bing 空结果后的 DuckDuckGo 备用搜索失败:', fallbackError.message);
                }
            }
            return json(result);
        } catch (error) {
            if (error?.code === 'TIMEOUT') return createErrorResponse(error);

            if (engine === 'bing_html' || engine === '') {
                try {
                    const fallbackResult = await searchDuckDuckGo(query, searchOptions);
                    return json({ ...fallbackResult, fallback: 'bing_html → ddg', primaryError: error.message });
                } catch (fallbackError) {
                    if (fallbackError?.code === 'TIMEOUT') return createErrorResponse(fallbackError);
                    return createErrorResponse(createPolicyError(
                        'SEARCH_FAILED',
                        `bing_html: ${error.message} | ddg: ${fallbackError.message}`,
                        502,
                    ));
                }
            }
            return createErrorResponse(createPolicyError('SEARCH_FAILED', error.message, 502));
        } finally {
            deadline.dispose();
        }
    }

    // /fetch?url=...
    if (url.pathname === '/fetch') {
        const target = url.searchParams.get('url') || '';
        if (!target) return createErrorResponse(createPolicyError('INVALID_URL', "缺少 'url' 参数", 400));
        try {
            const result = await fetchWithOutboundPolicy(target, {
                fetchImpl,
                resolveHostname,
                signal: request.signal,
                timeoutMs,
                maxBodyBytes,
                headers: { 'User-Agent': 'Mozilla/5.0 toolbox-search-proxy' },
            });
            const raw = new TextDecoder('utf-8').decode(result.bodyBytes);
            const maximumCharacters = normalizeMaximumCharacters(env.FETCH_MAX_CHARS);
            const plainText = htmlToText(raw).slice(0, maximumCharacters);
            return json({
                requestedUrl: target,
                finalUrl: result.finalUrl,
                status: result.response.status,
                contentType: result.response.headers.get('Content-Type') || '',
                text: plainText,
                truncated: raw.length > maximumCharacters,
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }

    return json({
        error: {
            code: 'NOT_FOUND',
            message: '路由不存在',
        },
        routes: ['/', '/health', '/search?q=...', '/fetch?url=...'],
    }, 404);
}

export {
    fetchWithOutboundPolicy,
    handle as handleRequest,
    isBlockedIpAddress,
    readResponseBodyLimited,
    validateOutboundUrl,
};

export default {
    fetch: handle,
};
