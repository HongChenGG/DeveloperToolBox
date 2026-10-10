// Lombok 反推：@Data/@Builder/@Getter/@Setter/@AllArgsConstructor/@NoArgsConstructor → 标准 Java
(function () {
    'use strict';

    function methodName(prefix, name, type) {
        if (prefix === 'get' && (type === 'boolean' || type === 'Boolean')) prefix = 'is';
        return prefix + name[0].toUpperCase() + name.slice(1);
    }

    // 提取字段修饰符与初始化器，供构造器和 Builder 复用。
    function parseFields(src) {
        const fields = [];
        const fieldRegex = /(?:^|\n)\s*(?:private|protected|public)\s+(?:(final)\s+)?(\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)\s*(?:=\s*([^;]+))?;/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(src)) !== null) {
            fields.push({
                type: fieldMatch[2],
                name: fieldMatch[3],
                isFinal: Boolean(fieldMatch[1]),
                initializer: fieldMatch[4] === undefined ? null : fieldMatch[4].trim()
            });
        }
        return fields;
    }

    // force=true 时按 Java 类型生成字段默认值。
    function defaultValueForType(type) {
        if (type === 'boolean') return 'false';
        if (type === 'char') return "'\\0'";
        if (['byte', 'short', 'int', 'long', 'float', 'double'].includes(type)) return '0';
        return 'null';
    }

    function expand(src) {
        const classMatch = src.match(/(?:^|\s)(?:public\s+|abstract\s+|final\s+)*class\s+(\w+)/);
        if (!classMatch) throw new Error('未找到 class 定义');
        const className = classMatch[1];

        // 类上的注解
        const beforeClass = src.substring(0, classMatch.index);
        const annotationTexts = beforeClass.match(/@\w+(?:\s*\([^)]*\))?/g) || [];
        const annotations = annotationTexts.map(annotation => annotation.replace(/\s*\(.*/, ''));

        // 字段提取
        const fields = parseFields(src);
        if (fields.length === 0) throw new Error('未找到任何字段（需要形如 private String name;）');

        const has = (a) => annotations.includes(a);
        const data = has('@Data');
        const hasGetter = data || has('@Getter');
        const hasSetter = data || has('@Setter');
        const hasToString = data || has('@ToString');
        const hasEquals = data || has('@EqualsAndHashCode');
        const hasBuilder = has('@Builder');
        const hasNoArgs = has('@NoArgsConstructor');
        const hasAllArgs = has('@AllArgsConstructor');
        const noArgsAnnotation = annotationTexts.find(annotation => annotation.startsWith('@NoArgsConstructor')) || '';
        const forceNoArgs = /\bforce\s*=\s*true\b/.test(noArgsAnnotation);
        const requiredFields = fields.filter(field => field.isFinal && field.initializer === null);

        if (hasNoArgs && requiredFields.length > 0 && !forceNoArgs) {
            throw new Error('@NoArgsConstructor 遇到未初始化 final 字段时需要 force = true');
        }

        const out = [];
        out.push(`public class ${className} {`);
        fields.forEach(field => {
            const finalModifier = field.isFinal ? 'final ' : '';
            const initializer = field.initializer === null ? '' : ` = ${field.initializer}`;
            out.push(`    private ${finalModifier}${field.type} ${field.name}${initializer};`);
        });
        out.push('');

        // 按参数类型去重，避免组合注解生成重复构造器。
        const constructorSignatures = new Set();
        const appendConstructor = (constructorFields, visibility = 'public', defaultedFields = []) => {
            const signature = constructorFields.map(field => field.type).join(',');
            if (constructorSignatures.has(signature)) return;
            constructorSignatures.add(signature);

            const params = constructorFields.map(field => `${field.type} ${field.name}`).join(', ');
            out.push(`    ${visibility} ${className}(${params}) {`);
            constructorFields.forEach(field => out.push(`        this.${field.name} = ${field.name};`));
            defaultedFields.forEach(field => out.push(`        this.${field.name} = ${defaultValueForType(field.type)};`));
            out.push('    }');
            out.push('');
        };

        if (hasNoArgs) {
            appendConstructor([], 'public', forceNoArgs ? requiredFields : []);
        } else if (data && requiredFields.length === 0) {
            appendConstructor([]);
        }
        if (data && requiredFields.length > 0) {
            appendConstructor(requiredFields);
        }
        if (hasAllArgs) {
            appendConstructor(fields);
        }
        if (hasBuilder) {
            appendConstructor(fields, 'private');
        }
        if (hasGetter) {
            fields.forEach(f => {
                out.push(`    public ${f.type} ${methodName('get', f.name, f.type)}() {`);
                out.push(`        return this.${f.name};`);
                out.push('    }');
                out.push('');
            });
        }
        if (hasSetter) {
            fields.filter(field => !field.isFinal).forEach(f => {
                out.push(`    public void ${methodName('set', f.name)}(${f.type} ${f.name}) {`);
                out.push(`        this.${f.name} = ${f.name};`);
                out.push('    }');
                out.push('');
            });
        }
        if (hasToString) {
            out.push('    @Override');
            out.push('    public String toString() {');
            const parts = fields.map(f => `"${f.name}=" + ${f.name}`).join(' + ", " + ');
            out.push(`        return "${className}(" + ${parts || '""'} + ")";`);
            out.push('    }');
            out.push('');
        }
        if (hasEquals) {
            out.push('    @Override');
            out.push('    public boolean equals(Object o) {');
            out.push('        if (this == o) return true;');
            out.push(`        if (!(o instanceof ${className})) return false;`);
            out.push(`        ${className} other = (${className}) o;`);
            out.push(`        return ${fields.map(f => `java.util.Objects.equals(${f.name}, other.${f.name})`).join(' && ') || 'true'};`);
            out.push('    }');
            out.push('');
            out.push('    @Override');
            out.push('    public int hashCode() {');
            out.push(`        return java.util.Objects.hash(${fields.map(f => f.name).join(', ')});`);
            out.push('    }');
            out.push('');
        }
        if (hasBuilder) {
            out.push(`    public static ${className}Builder builder() {`);
            out.push(`        return new ${className}Builder();`);
            out.push('    }');
            out.push('');
            out.push(`    public static class ${className}Builder {`);
            fields.forEach(f => out.push(`        private ${f.type} ${f.name};`));
            out.push('');
            fields.forEach(f => {
                out.push(`        public ${className}Builder ${f.name}(${f.type} ${f.name}) {`);
                out.push(`            this.${f.name} = ${f.name};`);
                out.push('            return this;');
                out.push('        }');
                out.push('');
            });
            out.push(`        public ${className} build() {`);
            out.push(`            return new ${className}(${fields.map(field => `this.${field.name}`).join(', ')});`);
            out.push('        }');
            out.push('    }');
        }
        out.push('}');
        return out.join('\n');
    }

    function init() {
        const input = document.getElementById('lombok-input');
        if (!input) return;
        const output = document.getElementById('lombok-output');
        const btn = document.getElementById('btn-lombok-expand');
        const btnCopy = document.getElementById('btn-lombok-copy');
        const btnSample = document.getElementById('btn-lombok-sample');

        if (btnSample) btnSample.addEventListener('click', () => {
            input.value = `import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String username;
    private String email;
    private Integer age;
    private Boolean active;
}`;
        });

        btn.addEventListener('click', () => {
            try {
                output.value = expand(input.value);
                if (typeof showToast === 'function') showToast('展开成功', 'success');
            } catch (e) {
                output.value = '解析失败：' + e.message;
                if (typeof showToast === 'function') showToast(e.message, 'error');
            }
        });

        if (btnCopy) btnCopy.addEventListener('click', () => {
            if (!output.value) return;
            copyToClipboard(output.value);
        });
    }

    // Node 测试通过条件导出访问纯函数，浏览器仍按原流程初始化。
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { defaultValueForType, expand, methodName, parseFields };
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
})();
