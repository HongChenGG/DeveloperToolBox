(function initializeToolboxSecurity(globalObject, factory) {
    const securityApi = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = securityApi;
    }

    if (globalObject) {
        globalObject.ToolboxSecurity = securityApi;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createToolboxSecurity() {
    const utf8Encoder = new TextEncoder();
    const approvedLinkProtocols = new Set(['http:', 'https:', 'mailto:']);
    const approvedImageProtocols = new Set(['http:', 'https:']);
    const approvedImageDataUrlPattern = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i;
    const safeLanguagePattern = /^[A-Za-z0-9_+#.-]{1,32}$/;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getSafeAbsoluteUrl(value, approvedProtocols) {
        const rawValue = String(value ?? '').trim();
        if (!rawValue) {
            return null;
        }

        try {
            const parsedUrl = new URL(rawValue);
            return approvedProtocols.has(parsedUrl.protocol.toLowerCase()) ? parsedUrl.href : null;
        } catch (error) {
            return null;
        }
    }

    function getSafeLinkUrl(value) {
        return getSafeAbsoluteUrl(value, approvedLinkProtocols);
    }

    function getSafeImageUrl(value) {
        const rawValue = String(value ?? '').trim();
        if (approvedImageDataUrlPattern.test(rawValue)) {
            return rawValue;
        }

        return getSafeAbsoluteUrl(rawValue, approvedImageProtocols);
    }

    function getUtf8ByteLength(value) {
        return utf8Encoder.encode(String(value ?? '')).length;
    }

    function hasUnclosedCodeFence(markdownText) {
        const fenceMatches = String(markdownText ?? '').match(/(^|\n)\s*```/g);
        return Boolean(fenceMatches && fenceMatches.length % 2 !== 0);
    }

    function renderStreamingPlainText(markdownText) {
        return `<p class="streaming-plain-text">${escapeHtml(markdownText).replace(/\r?\n/g, '<br>')}</p>`;
    }

    function createSafeRenderer(markedApi) {
        const renderer = new markedApi.Renderer();

        // 原始 HTML 必须作为文本显示，禁止模型或用户创建可执行节点。
        renderer.html = html => escapeHtml(html);

        renderer.link = (href, title, text) => {
            const safeHref = getSafeLinkUrl(href);
            if (!safeHref) {
                return text;
            }

            const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
            return `<a href="${escapeHtml(safeHref)}"${titleAttribute} rel="noopener noreferrer">${text}</a>`;
        };

        renderer.image = (href, title, text) => {
            const safeSource = getSafeImageUrl(href);
            if (!safeSource) {
                return escapeHtml(text || '图片');
            }

            const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
            return `<img src="${escapeHtml(safeSource)}" alt="${escapeHtml(text || '')}"${titleAttribute}>`;
        };

        renderer.code = (code, language) => {
            const normalizedLanguage = String(language || '').trim().split(/\s+/, 1)[0];
            const languageClass = safeLanguagePattern.test(normalizedLanguage)
                ? ` class="language-${escapeHtml(normalizedLanguage)}"`
                : '';

            return `<pre><code${languageClass}>${escapeHtml(code)}</code></pre>\n`;
        };

        return renderer;
    }

    function renderMarkdown(markdownText, { markedApi, streaming = false } = {}) {
        const normalizedText = String(markdownText ?? '');
        if (streaming && hasUnclosedCodeFence(normalizedText)) {
            return renderStreamingPlainText(normalizedText);
        }

        const parser = markedApi || (typeof globalThis !== 'undefined' ? globalThis.marked : null);
        if (!parser || typeof parser.parse !== 'function' || typeof parser.Renderer !== 'function') {
            return renderStreamingPlainText(normalizedText);
        }

        try {
            return parser.parse(normalizedText, {
                breaks: true,
                gfm: true,
                renderer: createSafeRenderer(parser)
            });
        } catch (error) {
            return renderStreamingPlainText(normalizedText);
        }
    }

    return {
        escapeHtml,
        getSafeImageUrl,
        getSafeLinkUrl,
        getUtf8ByteLength,
        renderMarkdown
    };
}));

