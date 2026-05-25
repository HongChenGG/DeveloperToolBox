// JSON -> 实体类生成器（Java/TypeScript/Go/Python/C#）
(function() {
    function init() {
        const input = document.getElementById('j2c-input');
        if (!input) return;
        const output = document.getElementById('j2c-output');
        const lang = document.getElementById('j2c-lang');
        const className = document.getElementById('j2c-classname');
        const btnGen = document.getElementById('btn-j2c-gen');
        const btnCopy = document.getElementById('btn-j2c-copy');
        const btnClear = document.getElementById('btn-j2c-clear');

        // 命名风格转换
        const toPascal = s => s.replace(/(^|[_\-\s])([a-z0-9])/g, (_, __, c) => c.toUpperCase());
        const toCamel = s => { const p = toPascal(s); return p.charAt(0).toLowerCase() + p.slice(1); };
        const toSnake = s => s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

        function detectType(v, lang) {
            if (v === null) return { type: nullType(lang), isObj: false, isArr: false };
            if (Array.isArray(v)) {
                if (v.length === 0) return { type: anyType(lang) + arrSuffix(lang), isObj: false, isArr: true, elem: null };
                const elem = v.find(x => x !== null) ?? v[0];
                const inner = detectType(elem, lang);
                return { type: wrapArray(inner.type, lang), isObj: false, isArr: true, elem };
            }
            if (typeof v === 'object') return { type: 'OBJ', isObj: true, isArr: false };
            if (typeof v === 'string') return { type: strType(lang), isObj: false, isArr: false };
            if (typeof v === 'boolean') return { type: boolType(lang), isObj: false, isArr: false };
            if (typeof v === 'number') return { type: Number.isInteger(v) ? intType(lang) : floatType(lang), isObj: false, isArr: false };
            return { type: anyType(lang), isObj: false, isArr: false };
        }

        function nullType(l) { return ({ java:'Object', ts:'any', go:'interface{}', python:'Any', csharp:'object' })[l]; }
        function anyType(l) { return ({ java:'Object', ts:'any', go:'interface{}', python:'Any', csharp:'object' })[l]; }
        function strType(l) { return ({ java:'String', ts:'string', go:'string', python:'str', csharp:'string' })[l]; }
        function boolType(l) { return ({ java:'Boolean', ts:'boolean', go:'bool', python:'bool', csharp:'bool' })[l]; }
        function intType(l) { return ({ java:'Long', ts:'number', go:'int64', python:'int', csharp:'long' })[l]; }
        function floatType(l) { return ({ java:'Double', ts:'number', go:'float64', python:'float', csharp:'double' })[l]; }
        function arrSuffix(l) { return ({ java:'[]', ts:'[]', go:'', python:'', csharp:'[]' })[l]; }
        function wrapArray(t, l) {
            if (l === 'java') return 'List<' + (t === 'long' ? 'Long' : t === 'int' ? 'Integer' : t === 'double' ? 'Double' : t === 'boolean' ? 'Boolean' : t) + '>';
            if (l === 'ts') return t + '[]';
            if (l === 'go') return '[]' + t;
            if (l === 'python') return 'List[' + t + ']';
            if (l === 'csharp') return 'List<' + t + '>';
        }

        function genJava(name, obj, classes) {
            const fields = [];
            for (const [k, v] of Object.entries(obj)) {
                let t = detectType(v, 'java');
                if (t.isObj) {
                    const subName = toPascal(k);
                    genJava(subName, v, classes);
                    t = { type: subName };
                } else if (t.isArr && t.elem && typeof t.elem === 'object' && !Array.isArray(t.elem)) {
                    const subName = toPascal(k.replace(/s$/, '')) || toPascal(k) + 'Item';
                    genJava(subName, t.elem, classes);
                    t = { type: 'List<' + subName + '>' };
                }
                fields.push({ name: toCamel(k), type: t.type, raw: k });
            }
            const code = `public class ${name} {\n` +
                fields.map(f => `    @JsonProperty("${f.raw}")\n    private ${f.type} ${f.name};`).join('\n\n') +
                '\n\n' + fields.map(f => {
                    const upper = f.name.charAt(0).toUpperCase() + f.name.slice(1);
                    return `    public ${f.type} get${upper}() { return ${f.name}; }\n    public void set${upper}(${f.type} ${f.name}) { this.${f.name} = ${f.name}; }`;
                }).join('\n') + '\n}';
            classes.unshift(code);
        }

        function genTs(name, obj, classes) {
            const fields = [];
            for (const [k, v] of Object.entries(obj)) {
                let t = detectType(v, 'ts');
                if (t.isObj) {
                    const subName = toPascal(k);
                    genTs(subName, v, classes);
                    t = { type: subName };
                } else if (t.isArr && t.elem && typeof t.elem === 'object' && !Array.isArray(t.elem)) {
                    const subName = toPascal(k.replace(/s$/, '')) || toPascal(k) + 'Item';
                    genTs(subName, t.elem, classes);
                    t = { type: subName + '[]' };
                }
                fields.push({ name: k, type: t.type });
            }
            const code = `export interface ${name} {\n` +
                fields.map(f => `    ${f.name}: ${f.type};`).join('\n') + '\n}';
            classes.unshift(code);
        }

        function genGo(name, obj, classes) {
            const fields = [];
            for (const [k, v] of Object.entries(obj)) {
                let t = detectType(v, 'go');
                if (t.isObj) {
                    const subName = toPascal(k);
                    genGo(subName, v, classes);
                    t = { type: subName };
                } else if (t.isArr && t.elem && typeof t.elem === 'object' && !Array.isArray(t.elem)) {
                    const subName = toPascal(k.replace(/s$/, '')) || toPascal(k) + 'Item';
                    genGo(subName, t.elem, classes);
                    t = { type: '[]' + subName };
                }
                fields.push({ name: toPascal(k), type: t.type, raw: k });
            }
            const code = `type ${name} struct {\n` +
                fields.map(f => `    ${f.name} ${f.type} \`json:"${f.raw}"\``).join('\n') + '\n}';
            classes.unshift(code);
        }

        function genPython(name, obj, classes) {
            const fields = [];
            for (const [k, v] of Object.entries(obj)) {
                let t = detectType(v, 'python');
                if (t.isObj) {
                    const subName = toPascal(k);
                    genPython(subName, v, classes);
                    t = { type: subName };
                } else if (t.isArr && t.elem && typeof t.elem === 'object' && !Array.isArray(t.elem)) {
                    const subName = toPascal(k.replace(/s$/, '')) || toPascal(k) + 'Item';
                    genPython(subName, t.elem, classes);
                    t = { type: 'List[' + subName + ']' };
                }
                fields.push({ name: toSnake(k), type: t.type });
            }
            const code = `@dataclass\nclass ${name}:\n` +
                fields.map(f => `    ${f.name}: ${f.type} = None`).join('\n');
            classes.unshift(code);
        }

        function genCSharp(name, obj, classes) {
            const fields = [];
            for (const [k, v] of Object.entries(obj)) {
                let t = detectType(v, 'csharp');
                if (t.isObj) {
                    const subName = toPascal(k);
                    genCSharp(subName, v, classes);
                    t = { type: subName };
                } else if (t.isArr && t.elem && typeof t.elem === 'object' && !Array.isArray(t.elem)) {
                    const subName = toPascal(k.replace(/s$/, '')) || toPascal(k) + 'Item';
                    genCSharp(subName, t.elem, classes);
                    t = { type: 'List<' + subName + '>' };
                }
                fields.push({ name: toPascal(k), type: t.type, raw: k });
            }
            const code = `public class ${name}\n{\n` +
                fields.map(f => `    [JsonPropertyName("${f.raw}")]\n    public ${f.type} ${f.name} { get; set; }`).join('\n\n') + '\n}';
            classes.unshift(code);
        }

        function generate() {
            let data;
            try { data = JSON.parse(input.value); }
            catch (e) { if (typeof showToast === 'function') showToast('JSON 解析失败: ' + e.message, 'error'); return; }
            if (typeof data !== 'object' || data === null) {
                if (typeof showToast === 'function') showToast('请输入 JSON 对象或数组', 'warning');
                return;
            }
            const root = Array.isArray(data) ? (data[0] || {}) : data;
            const cn = className.value.trim() || 'Root';
            const classes = [];
            const l = lang.value;
            try {
                if (l === 'java') { genJava(cn, root, classes); output.textContent = '// 需要 Jackson 依赖：import com.fasterxml.jackson.annotation.JsonProperty;\n\n' + classes.join('\n\n'); }
                else if (l === 'ts') { genTs(cn, root, classes); output.textContent = classes.join('\n\n'); }
                else if (l === 'go') { genGo(cn, root, classes); output.textContent = 'package model\n\n' + classes.join('\n\n'); }
                else if (l === 'python') { genPython(cn, root, classes); output.textContent = 'from dataclasses import dataclass\nfrom typing import List, Any, Optional\n\n' + classes.join('\n\n'); }
                else if (l === 'csharp') { genCSharp(cn, root, classes); output.textContent = 'using System.Collections.Generic;\nusing System.Text.Json.Serialization;\n\n' + classes.join('\n\n'); }
                if (typeof showToast === 'function') showToast('生成成功（共 ' + classes.length + ' 个类）', 'success');
            } catch (e) {
                if (typeof showToast === 'function') showToast('生成失败: ' + e.message, 'error');
            }
        }

        btnGen && btnGen.addEventListener('click', generate);
        btnCopy && btnCopy.addEventListener('click', () => {
            if (!output.textContent) return;
            navigator.clipboard.writeText(output.textContent).then(() => {
                if (typeof showToast === 'function') showToast('已复制', 'success');
            });
        });
        btnClear && btnClear.addEventListener('click', () => { input.value = ''; output.textContent = ''; });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
