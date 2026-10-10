// 增强：cURL ↔ Fetch/Axios + JSONPath 提取
(function() {
    const blockedPropertyNames = new Set(['__proto__', 'prototype', 'constructor']);
    const propertyNamePattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    const JSON_PATH_MAX_DEPTH = 512;
    const JSON_PATH_MAX_VISITED_NODES = 100000;

    function parseFilterLiteral(rawLiteral) {
        const literal = rawLiteral.trim();
        if (/^"(?:[^"\\]|\\.)*"$/.test(literal)) {
            return JSON.parse(literal);
        }
        if (/^'(?:[^'\\]|\\.)*'$/.test(literal)) {
            return literal.slice(1, -1)
                .replace(/\\'/g, "'")
                .replace(/\\\\/g, '\\');
        }
        if (literal === 'true') return true;
        if (literal === 'false') return false;
        if (literal === 'null') return null;
        if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(literal)) return Number(literal);
        throw new Error('JSONPath 过滤值仅支持字符串、数字、布尔值和 null');
    }

    function validatePropertyName(propertyName) {
        if (!propertyNamePattern.test(propertyName) || blockedPropertyNames.has(propertyName)) {
            throw new Error(`JSONPath 属性名不允许：${propertyName}`);
        }
        return propertyName;
    }

    function parseJsonPathFilter(expression) {
        const match = String(expression || '').trim().match(
            /^@((?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)\s*(==|!=|>=|<=|>|<)\s*([\s\S]+)$/
        );
        if (!match) {
            throw new Error('JSONPath 过滤表达式仅支持单个属性比较');
        }

        return {
            propertyPath: match[1].slice(1).split('.').map(validatePropertyName),
            operator: match[2],
            expectedValue: parseFilterLiteral(match[3])
        };
    }

    function readOwnPropertyPath(value, propertyPath) {
        let currentValue = value;

        for (const propertyName of propertyPath) {
            if (currentValue === null
                || typeof currentValue !== 'object'
                || !Object.prototype.hasOwnProperty.call(currentValue, propertyName)) {
                return undefined;
            }
            currentValue = currentValue[propertyName];
        }

        return currentValue;
    }

    function evaluateJsonPathFilter(item, parsedFilter) {
        const actualValue = readOwnPropertyPath(item, parsedFilter.propertyPath);
        const expectedValue = parsedFilter.expectedValue;

        switch (parsedFilter.operator) {
            case '==': return actualValue === expectedValue;
            case '!=': return actualValue !== expectedValue;
            case '>': return actualValue > expectedValue;
            case '>=': return actualValue >= expectedValue;
            case '<': return actualValue < expectedValue;
            case '<=': return actualValue <= expectedValue;
            default: throw new Error(`不支持的 JSONPath 运算符：${parsedFilter.operator}`);
        }
    }

    function findClosingBracket(expression, openingIndex) {
        let activeQuote = null;
        let isEscaped = false;
        let bracketDepth = 1;
        let parenthesisDepth = 0;

        for (let index = openingIndex + 1; index < expression.length; index++) {
            const character = expression[index];

            // 引号内的方括号和括号都是普通字符，转义符只影响紧随字符。
            if (activeQuote !== null) {
                if (isEscaped) {
                    isEscaped = false;
                } else if (character === '\\') {
                    isEscaped = true;
                } else if (character === activeQuote) {
                    activeQuote = null;
                }
                continue;
            }

            if (character === '"' || character === "'") {
                activeQuote = character;
                continue;
            }
            if (character === '(') {
                parenthesisDepth++;
                continue;
            }
            if (character === ')') {
                if (parenthesisDepth > 0) parenthesisDepth--;
                continue;
            }
            if (character === '[') {
                bracketDepth++;
                continue;
            }
            if (character === ']') {
                bracketDepth--;
                if (bracketDepth === 0 && parenthesisDepth === 0) return index;
            }
        }

        return -1;
    }

    function evaluateJsonPath(data, expression) {
        const normalizedExpression = String(expression || '').trim();
        if (!normalizedExpression.startsWith('$')) {
            throw new Error('表达式必须以 $ 开头');
        }

        let result = [data];
        let cursor = 1;

        while (cursor < normalizedExpression.length) {
            const currentCharacter = normalizedExpression[cursor];

            if (currentCharacter === '.') {
                if (normalizedExpression[cursor + 1] === '.') {
                    cursor += 2;
                    let recursiveKey = '';
                    while (cursor < normalizedExpression.length && /[A-Za-z0-9_$*]/.test(normalizedExpression[cursor])) {
                        recursiveKey += normalizedExpression[cursor++];
                    }
                    if (recursiveKey !== '*') validatePropertyName(recursiveKey);

                    const recursiveValues = [];
                    const activeObjects = new WeakSet();
                    const pendingActions = [];
                    for (let resultIndex = result.length - 1; resultIndex >= 0; resultIndex--) {
                        pendingActions.push({
                            type: 'visit',
                            value: result[resultIndex],
                            depth: 0
                        });
                    }
                    let visitedNodeCount = 0;

                    while (pendingActions.length) {
                        const currentAction = pendingActions.pop();
                        if (currentAction.type === 'emit') {
                            recursiveValues.push(currentAction.value);
                            continue;
                        }
                        if (currentAction.type === 'leave') {
                            activeObjects.delete(currentAction.value);
                            continue;
                        }

                        const value = currentAction.value;
                        if (value === null || typeof value !== 'object') continue;
                        if (activeObjects.has(value)) continue;
                        if (currentAction.depth > JSON_PATH_MAX_DEPTH) {
                            throw new Error(`JSONPath 递归深度不能超过 ${JSON_PATH_MAX_DEPTH}`);
                        }
                        activeObjects.add(value);
                        visitedNodeCount++;
                        if (visitedNodeCount > JSON_PATH_MAX_VISITED_NODES) {
                            throw new Error(`JSONPath 访问节点不能超过 ${JSON_PATH_MAX_VISITED_NODES}`);
                        }

                        // 离开节点后解除路径标记，既阻止循环引用，也保留共享对象的正常遍历语义。
                        pendingActions.push({ type: 'leave', value });
                        if (Array.isArray(value)) {
                            for (let index = value.length - 1; index >= 0; index--) {
                                pendingActions.push({
                                    type: 'visit',
                                    value: value[index],
                                    depth: currentAction.depth + 1
                                });
                            }
                            continue;
                        }

                        const entries = Object.entries(value);
                        for (let index = entries.length - 1; index >= 0; index--) {
                            const [key, childValue] = entries[index];
                            pendingActions.push({
                                type: 'visit',
                                value: childValue,
                                depth: currentAction.depth + 1
                            });
                            if (recursiveKey === '*' || key === recursiveKey) {
                                pendingActions.push({ type: 'emit', value: childValue });
                            }
                        }
                    }
                    result = recursiveValues;
                    continue;
                }

                cursor++;
                let propertyName = '';
                while (cursor < normalizedExpression.length && /[A-Za-z0-9_$*]/.test(normalizedExpression[cursor])) {
                    propertyName += normalizedExpression[cursor++];
                }
                if (!propertyName) throw new Error('JSONPath 属性名不能为空');

                if (propertyName === '*') {
                    result = result.flatMap(value => value && typeof value === 'object' ? Object.values(value) : []);
                } else {
                    validatePropertyName(propertyName);
                    result = result
                        .map(value => readOwnPropertyPath(value, [propertyName]))
                        .filter(value => value !== undefined);
                }
                continue;
            }

            if (currentCharacter === '[') {
                const closingIndex = findClosingBracket(normalizedExpression, cursor);
                if (closingIndex === -1) {
                    throw new Error('JSONPath 缺少闭合 ]');
                }

                const bracketContent = normalizedExpression.slice(cursor + 1, closingIndex).trim();
                cursor = closingIndex + 1;

                if (bracketContent === '*') {
                    result = result.flatMap(value => {
                        if (Array.isArray(value)) return value;
                        return value && typeof value === 'object' ? Object.values(value) : [];
                    });
                    continue;
                }

                if (/^-?\d+$/.test(bracketContent)) {
                    const index = Number(bracketContent);
                    result = result
                        .map(value => Array.isArray(value)
                            ? value[index < 0 ? value.length + index : index]
                            : readOwnPropertyPath(value, [bracketContent]))
                        .filter(value => value !== undefined);
                    continue;
                }

                if (bracketContent.startsWith('?(') && bracketContent.endsWith(')')) {
                    const parsedFilter = parseJsonPathFilter(bracketContent.slice(2, -1));
                    result = result.flatMap(value => Array.isArray(value)
                        ? value.filter(item => evaluateJsonPathFilter(item, parsedFilter))
                        : []);
                    continue;
                }

                const keyMatch = bracketContent.match(/^(['"])(.*)\1$/);
                if (!keyMatch) throw new Error(`不支持的 JSONPath 下标：${bracketContent}`);
                const propertyName = validatePropertyName(keyMatch[2]);
                result = result
                    .map(value => readOwnPropertyPath(value, [propertyName]))
                    .filter(value => value !== undefined);
                continue;
            }

            throw new Error(`JSONPath 在位置 ${cursor} 包含不支持的字符：${currentCharacter}`);
        }

        return result;
    }

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
                if (curlOut.value) copyToClipboard(curlOut.value);
            });
        }

        // ============ JSONPath 提取 ============
        const jpInput = document.getElementById('jp-input');
        if (jpInput) {
            const jpExpr = document.getElementById('jp-expr');
            const jpOut = document.getElementById('jp-out');
            const btnJp = document.getElementById('btn-jp-run');

            btnJp && btnJp.addEventListener('click', () => {
                try {
                    const data = JSON.parse(jpInput.value);
                    const r = evaluateJsonPath(data, jpExpr.value.trim());
                    jpOut.textContent = JSON.stringify(r, null, 2);
                } catch (e) { jpOut.textContent = '错误: ' + e.message; }
            });
            jpExpr && jpExpr.addEventListener('keydown', e => { if (e.key === 'Enter') btnJp.click(); });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            evaluateJsonPath,
            evaluateJsonPathFilter,
            parseJsonPathFilter
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
