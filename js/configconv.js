// YAML / JSON / Properties 互转（依赖 lib/js-yaml.min.js -> 全局 jsyaml）
(function() {
    const blockedPathSegments = new Set(['__proto__', 'prototype', 'constructor']);

    function validatePathSegment(pathSegment) {
        if (!pathSegment || blockedPathSegments.has(pathSegment)) {
            throw new Error(`Properties 包含危险路径：${pathSegment || '(空)'}`);
        }
        return pathSegment;
    }

    function setDeepOwn(target, pathSegments, value) {
        if (!pathSegments.length) {
            throw new Error('Properties 键不能为空');
        }

        const safeSegments = pathSegments.map(validatePathSegment);
        let currentObject = target;

        for (let index = 0; index < safeSegments.length - 1; index++) {
            const pathSegment = safeSegments[index];
            if (!Object.prototype.hasOwnProperty.call(currentObject, pathSegment)
                || currentObject[pathSegment] === null
                || typeof currentObject[pathSegment] !== 'object') {
                currentObject[pathSegment] = Object.create(null);
            }
            currentObject = currentObject[pathSegment];
        }

        currentObject[safeSegments[safeSegments.length - 1]] = value;
    }

    function parsePropertiesNumber(rawValue) {
        if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(rawValue)) return rawValue;

        const numberValue = Number(rawValue);
        if (!Number.isFinite(numberValue)) return rawValue;

        const exponentParts = rawValue.toLowerCase().split('e');
        const decimalParts = exponentParts[0].replace(/^-/, '').split('.');
        const fractionalDigits = decimalParts[1]?.length || 0;
        const exponentText = exponentParts[1] || '0';
        if (exponentText.replace(/^[+-]/, '').length > 4) return rawValue;
        const exponent = Number(exponentText);
        if (!Number.isInteger(exponent) || Math.abs(exponent) > 1000) return rawValue;
        if (fractionalDigits === 0 && exponent >= 0) {
            const integerDigits = `${decimalParts[0]}${'0'.repeat(exponent)}`.replace(/^0+/, '') || '0';
            const integerValue = BigInt(integerDigits) * (rawValue.startsWith('-') ? -1n : 1n);
            return integerValue >= BigInt(Number.MIN_SAFE_INTEGER) && integerValue <= BigInt(Number.MAX_SAFE_INTEGER)
                ? Number(integerValue)
                : rawValue;
        }
        const decimalPlaces = Math.max(0, fractionalDigits - exponent);
        const digitSequence = `${decimalParts[0]}${decimalParts[1] || ''}`;
        const removableTrailingZeros = Math.min(
            decimalPlaces,
            digitSequence.match(/0+$/)?.[0].length || 0
        );
        const adjustedDecimalPlaces = decimalPlaces - removableTrailingZeros;
        const normalizedDigitsText = digitSequence
            .slice(0, digitSequence.length - removableTrailingZeros)
            .replace(/^0+/, '') || '0';

        // 用十进制缩放后的安全整数验证精度，避免二进制浮点吞掉有效数字。
        if (adjustedDecimalPlaces > 100) return rawValue;
        const scaledNumber = numberValue * (10 ** adjustedDecimalPlaces);
        if (!Number.isSafeInteger(scaledNumber)) return rawValue;
        if (BigInt(normalizedDigitsText) !== BigInt(Math.abs(scaledNumber))) return rawValue;

        return numberValue;
    }

    function parseProperties(text) {
        const result = Object.create(null);

        String(text || '').split(/\r?\n/).forEach(rawLine => {
            const line = rawLine.trim();
            if (!line || line.startsWith('#') || line.startsWith('!')) return;

            const separatorIndex = Math.min(...['=', ':'].map(separator => {
                const index = line.indexOf(separator);
                return index === -1 ? Infinity : index;
            }));
            if (separatorIndex === Infinity) return;

            const key = line.slice(0, separatorIndex).trim();
            let value = line.slice(separatorIndex + 1).trim();
            value = parsePropertiesNumber(value);
            if (value === 'true') value = true;
            else if (value === 'false') value = false;

            setDeepOwn(result, key.split('.'), value);
        });

        return result;
    }

    function init() {
        const input = document.getElementById('conv-input');
        if (!input) return;
        const output = document.getElementById('conv-output');
        const from = document.getElementById('conv-from');
        const to = document.getElementById('conv-to');
        const btnRun = document.getElementById('btn-conv-run');
        const btnCopy = document.getElementById('btn-conv-copy');
        const btnClear = document.getElementById('btn-conv-clear');

        // --- Properties 解析与生成 ---
        function toProperties(obj, prefix = '') {
            const lines = [];
            function walk(o, p) {
                for (const [k, v] of Object.entries(o)) {
                    const key = p ? p + '.' + k : k;
                    if (v !== null && typeof v === 'object' && !Array.isArray(v)) walk(v, key);
                    else if (Array.isArray(v)) {
                        v.forEach((item, i) => {
                            if (typeof item === 'object' && item !== null) walk(item, key + '[' + i + ']');
                            else lines.push(key + '[' + i + ']=' + item);
                        });
                    } else lines.push(key + '=' + (v === null ? '' : v));
                }
            }
            walk(obj, prefix);
            return lines.join('\n');
        }

        function run() {
            const f = from.value, t = to.value;
            const text = input.value;
            if (!text.trim()) return;
            let data;
            try {
                if (f === 'json') data = JSON.parse(text);
                else if (f === 'yaml') {
                    if (typeof jsyaml === 'undefined') throw new Error('js-yaml.min.js 未加载');
                    data = jsyaml.load(text);
                } else if (f === 'properties') data = parseProperties(text);
                else if (f === 'xml') {
                    const doc = new DOMParser().parseFromString(text, 'text/xml');
                    if (doc.querySelector('parsererror')) throw new Error('XML 解析失败');
                    data = xmlToObj(doc.documentElement);
                }
            } catch (e) {
                output.value = '解析失败: ' + e.message;
                return;
            }
            try {
                if (t === 'json') output.value = JSON.stringify(data, null, 2);
                else if (t === 'yaml') output.value = jsyaml.dump(data, { indent: 2, lineWidth: 200 });
                else if (t === 'properties') output.value = toProperties(data);
                else if (t === 'xml') output.value = '<root>\n' + objToXml(data, 1) + '</root>';
            } catch (e) {
                output.value = '生成失败: ' + e.message;
            }
        }

        function xmlToObj(node) {
            const obj = {};
            const children = Array.from(node.children);
            if (children.length === 0) return node.textContent.trim();
            children.forEach(c => {
                const v = xmlToObj(c);
                if (obj[c.tagName] !== undefined) {
                    if (!Array.isArray(obj[c.tagName])) obj[c.tagName] = [obj[c.tagName]];
                    obj[c.tagName].push(v);
                } else obj[c.tagName] = v;
            });
            return obj;
        }
        function objToXml(obj, indent) {
            const pad = '  '.repeat(indent);
            let s = '';
            if (obj === null || typeof obj !== 'object') return pad + String(obj) + '\n';
            for (const [k, v] of Object.entries(obj)) {
                if (Array.isArray(v)) {
                    v.forEach(item => {
                        s += pad + `<${k}>\n` + objToXml(item, indent + 1) + pad + `</${k}>\n`;
                    });
                } else if (v !== null && typeof v === 'object') {
                    s += pad + `<${k}>\n` + objToXml(v, indent + 1) + pad + `</${k}>\n`;
                } else {
                    s += pad + `<${k}>${v === null ? '' : v}</${k}>\n`;
                }
            }
            return s;
        }

        btnRun && btnRun.addEventListener('click', run);
        btnCopy && btnCopy.addEventListener('click', () => {
            if (output.value) copyToClipboard(output.value);
        });
        btnClear && btnClear.addEventListener('click', () => { input.value = ''; output.value = ''; });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            parseProperties,
            setDeepOwn
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
