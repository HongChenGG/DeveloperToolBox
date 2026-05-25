// Lombok 反推：@Data/@Builder/@Getter/@Setter/@AllArgsConstructor/@NoArgsConstructor → 标准 Java
(function () {
    'use strict';

    function methodName(prefix, name, type) {
        if (prefix === 'get' && (type === 'boolean' || type === 'Boolean')) prefix = 'is';
        return prefix + name[0].toUpperCase() + name.slice(1);
    }

    function expand(src) {
        const classMatch = src.match(/(?:^|\s)(?:public\s+|abstract\s+|final\s+)*class\s+(\w+)/);
        if (!classMatch) throw new Error('未找到 class 定义');
        const className = classMatch[1];

        // 类上的注解
        const beforeClass = src.substring(0, classMatch.index);
        const annotations = (beforeClass.match(/@\w+(?:\([^)]*\))?/g) || []).map(a => a.replace(/\(.*/, ''));

        // 字段提取
        const fields = [];
        const fieldRegex = /(?:^|\n)\s*(?:private|protected|public)\s+(?:final\s+)?(\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)\s*(?:=\s*[^;]+)?;/g;
        let m;
        while ((m = fieldRegex.exec(src)) !== null) {
            fields.push({ type: m[1], name: m[2] });
        }
        if (fields.length === 0) throw new Error('未找到任何字段（需要形如 private String name;）');

        const has = (a) => annotations.includes(a);
        const data = has('@Data');
        const hasGetter = data || has('@Getter');
        const hasSetter = data || has('@Setter');
        const hasToString = data || has('@ToString');
        const hasEquals = data || has('@EqualsAndHashCode');
        const hasBuilder = has('@Builder');
        const hasNoArgs = data || has('@NoArgsConstructor');
        const hasAllArgs = has('@AllArgsConstructor');

        const out = [];
        out.push(`public class ${className} {`);
        fields.forEach(f => out.push(`    private ${f.type} ${f.name};`));
        out.push('');

        if (hasNoArgs) {
            out.push(`    public ${className}() {`);
            out.push('    }');
            out.push('');
        }
        if (hasAllArgs) {
            const params = fields.map(f => `${f.type} ${f.name}`).join(', ');
            out.push(`    public ${className}(${params}) {`);
            fields.forEach(f => out.push(`        this.${f.name} = ${f.name};`));
            out.push('    }');
            out.push('');
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
            fields.forEach(f => {
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
            out.push(`            ${className} obj = new ${className}();`);
            fields.forEach(f => out.push(`            obj.${f.name} = this.${f.name};`));
            out.push('            return obj;');
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
            navigator.clipboard.writeText(output.value).then(() => {
                if (typeof showToast === 'function') showToast('已复制', 'success');
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
