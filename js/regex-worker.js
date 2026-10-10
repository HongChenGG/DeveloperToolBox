// 正则表达式在独立线程中执行，避免灾难性回溯阻塞页面。
const MAX_MATCHES = 1000;
const MAX_RESULT_CHARACTERS = 64 * 1024;

function isUnicodeExpression(expression) {
    return expression.unicode === true || expression.flags.includes('v');
}

self.onmessage = function handleRegexRequest(event) {
    const request = event.data || {};
    const requestId = request.requestId;

    try {
        const expression = new RegExp(request.pattern, request.flags);
        const matches = [];
        let resultCharacterCount = 0;
        let truncated = false;

        function appendMatch(match) {
            const groups = match.slice(1);
            const matchCharacterCount = match[0].length + groups.reduce((total, group) => {
                return total + (group === undefined ? 0 : group.length);
            }, 0);
            if (matches.length >= MAX_MATCHES || resultCharacterCount + matchCharacterCount > MAX_RESULT_CHARACTERS) {
                truncated = true;
                return false;
            }
            matches.push({ index: match.index, match: match[0], groups });
            resultCharacterCount += matchCharacterCount;
            return true;
        }

        if (expression.global) {
            let match;
            while ((match = expression.exec(request.text)) !== null) {
                if (!appendMatch(match)) break;

                // 空匹配按 Unicode 代码点推进，避免停在代理对中间后重复匹配。
                if (match.index === expression.lastIndex) {
                    const currentIndex = expression.lastIndex;
                    const firstCodeUnit = request.text.charCodeAt(currentIndex);
                    const secondCodeUnit = request.text.charCodeAt(currentIndex + 1);
                    const isUnicodeMode = isUnicodeExpression(expression);
                    const isSurrogatePair = isUnicodeMode
                        && firstCodeUnit >= 0xD800
                        && firstCodeUnit <= 0xDBFF
                        && secondCodeUnit >= 0xDC00
                        && secondCodeUnit <= 0xDFFF;
                    expression.lastIndex += isSurrogatePair ? 2 : 1;
                }
            }
        } else {
            const match = expression.exec(request.text);
            if (match) appendMatch(match);
        }

        self.postMessage({
            requestId,
            ok: true,
            matches,
            truncated,
            error: null
        });
    } catch (error) {
        self.postMessage({
            requestId,
            ok: false,
            matches: [],
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
