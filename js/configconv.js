// YAML / JSON / Properties 互转（依赖 lib/js-yaml.min.js -> 全局 jsyaml）
(function() {
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
        function parseProperties(text) {
            const obj = {};
            text.split(/\r?\n/).forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#') || line.startsWith('!')) return;
                const idx = Math.min(...['=', ':'].map(c => { const i = line.indexOf(c); return i === -1 ? Infinity : i; }));
                if (idx === Infinity) return;
                const key = line.slice(0, idx).trim();
                let val = line.slice(idx + 1).trim();
                // 类型推断
                if (/^-?\d+$/.test(val)) val = parseInt(val);
                else if (/^-?\d*\.\d+$/.test(val)) val = parseFloat(val);
                else if (val === 'true') val = true;
                else if (val === 'false') val = false;
                // 嵌套
                setDeep(obj, key.split('.'), val);
            });
            return obj;
        }
        function setDeep(obj, path, val) {
            let cur = obj;
            for (let i = 0; i < path.length - 1; i++) {
                const k = path[i];
                if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
                cur = cur[k];
            }
            cur[path[path.length - 1]] = val;
        }
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
            if (output.value) navigator.clipboard.writeText(output.value).then(() => showToast && showToast('已复制', 'success'));
        });
        btnClear && btnClear.addEventListener('click', () => { input.value = ''; output.value = ''; });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
