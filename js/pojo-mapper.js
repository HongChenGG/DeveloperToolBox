// POJO ↔ DTO 字段映射：从两个 Java 类生成 BeanUtils / MapStruct / 手写 setter
(function () {
    'use strict';

    function parseClass(src) {
        // 预处理:剥掉所有 @注解 行(包括带参数的多行注解和单行注解)
        // 例:@Column("user_id") / @NotBlank / @JsonProperty(value = "x") 都剔除
        const cleanSrc = stripAnnotations(src);
        const classMatch = cleanSrc.match(/(?:^|\s)(?:public\s+|abstract\s+|final\s+)*class\s+(\w+)/);
        if (!classMatch) throw new Error('未找到 class 定义');
        const name = classMatch[1];
        const fields = [];
        // 使用多行行首匹配，兼容 Safari 14 且不消费相邻字段边界。
        const fieldRegex = /^[ \t]*(?:private|protected|public)[ \t]+(?:static[ \t]+)?(?:final[ \t]+)?([\w.]+(?:<[^<>]*(?:<[^<>]*>[^<>]*)*>)?(?:\[\])?)[ \t]+(\w+)[ \t]*(?:=\s*[^;]+)?;/gm;
        let m;
        while ((m = fieldRegex.exec(cleanSrc)) !== null) {
            fields.push({ type: m[1], name: m[2] });
        }
        return { name, fields };
    }

    // 剥掉 @Annotation / @Annotation(...) (支持多行参数和嵌套括号)
    function stripAnnotations(src) {
        let out = '';
        const len = src.length;
        let i = 0;
        while (i < len) {
            const c = src[i];
            // 字符串字面量整体保留
            if (c === '"' || c === "'") {
                out += c; i++;
                while (i < len && src[i] !== c) {
                    if (src[i] === '\\' && i + 1 < len) { out += src[i] + src[i + 1]; i += 2; continue; }
                    out += src[i]; i++;
                }
                if (i < len) { out += src[i]; i++; }
                continue;
            }
            // @ 开头的注解
            if (c === '@' && i + 1 < len && /[A-Za-z_]/.test(src[i + 1])) {
                i++;  // 吃掉 @
                while (i < len && /[\w.]/.test(src[i])) i++;  // 注解名(支持包名)
                // 跳过空白后看是否有 ( 参数列表
                let j = i;
                while (j < len && /\s/.test(src[j])) j++;
                if (j < len && src[j] === '(') {
                    let depth = 1;
                    j++;
                    while (j < len && depth > 0) {
                        const cj = src[j];
                        if (cj === '"' || cj === "'") {
                            j++;
                            while (j < len && src[j] !== cj) {
                                if (src[j] === '\\' && j + 1 < len) { j += 2; continue; }
                                j++;
                            }
                            if (j < len) j++;
                            continue;
                        }
                        if (cj === '(') depth++;
                        else if (cj === ')') depth--;
                        j++;
                    }
                    i = j;
                }
                out += ' ';
                continue;
            }
            out += c; i++;
        }
        return out;
    }

    function generate(srcCls, dstCls, mode) {
        const sName = srcCls.name;
        const dName = dstCls.name;
        const srcLow = sName[0].toLowerCase() + sName.slice(1);
        const dstLow = dName[0].toLowerCase() + dName.slice(1);

        // 字段匹配：同名（忽略大小写）
        const pairs = [];
        const unmatched = [];
        dstCls.fields.forEach(df => {
            const sf = srcCls.fields.find(f => f.name.toLowerCase() === df.name.toLowerCase());
            if (sf) pairs.push({ src: sf, dst: df });
            else unmatched.push(df);
        });

        if (mode === 'beanutils') {
            const lines = [];
            lines.push('// 方式 1: Spring BeanUtils（同名字段自动拷贝）');
            lines.push(`${dName} ${dstLow} = new ${dName}();`);
            lines.push(`BeanUtils.copyProperties(${srcLow}, ${dstLow});`);
            if (unmatched.length) {
                lines.push('// 不匹配字段需手动设置:');
                unmatched.forEach(f => lines.push(`// ${dstLow}.set${cap(f.name)}(...);`));
            }
            return lines.join('\n');
        }

        if (mode === 'manual') {
            const lines = [];
            lines.push(`public static ${dName} convert(${sName} ${srcLow}) {`);
            lines.push(`    if (${srcLow} == null) return null;`);
            lines.push(`    ${dName} ${dstLow} = new ${dName}();`);
            pairs.forEach(p => {
                if (p.src.type === p.dst.type) {
                    lines.push(`    ${dstLow}.set${cap(p.dst.name)}(${srcLow}.get${cap(p.src.name)}());`);
                } else {
                    lines.push(`    // TODO 类型不同：${p.src.type} -> ${p.dst.type}`);
                    lines.push(`    ${dstLow}.set${cap(p.dst.name)}(/* convert(${srcLow}.get${cap(p.src.name)}()) */);`);
                }
            });
            if (unmatched.length) {
                lines.push('    // 无法匹配的目标字段：');
                unmatched.forEach(f => lines.push(`    // ${dstLow}.set${cap(f.name)}(...);`));
            }
            lines.push(`    return ${dstLow};`);
            lines.push('}');
            return lines.join('\n');
        }

        if (mode === 'mapstruct') {
            const lines = [];
            lines.push('import org.mapstruct.Mapper;');
            lines.push('import org.mapstruct.Mapping;');
            lines.push('import org.mapstruct.factory.Mappers;');
            lines.push('');
            lines.push('@Mapper');
            lines.push(`public interface ${sName}To${dName}Mapper {`);
            lines.push(`    ${sName}To${dName}Mapper INSTANCE = Mappers.getMapper(${sName}To${dName}Mapper.class);`);
            lines.push('');
            // 标注同名字段映射
            const mismatched = pairs.filter(p => p.src.name !== p.dst.name);
            mismatched.forEach(p => {
                lines.push(`    @Mapping(source = "${p.src.name}", target = "${p.dst.name}")`);
            });
            lines.push(`    ${dName} convert(${sName} ${srcLow});`);
            if (unmatched.length) {
                lines.push('');
                lines.push('    // 以下目标字段无法自动映射，请使用 @Mapping(expression=...) 或自定义方法:');
                unmatched.forEach(f => lines.push(`    // ${f.type} ${f.name}`));
            }
            lines.push('}');
            return lines.join('\n');
        }
        return '';
    }

    function cap(s) { return s[0].toUpperCase() + s.slice(1); }

    function init() {
        const srcEl = document.getElementById('pojo-src');
        if (!srcEl) return;
        const dstEl = document.getElementById('pojo-dst');
        const outEl = document.getElementById('pojo-out');
        const modeEl = document.getElementById('pojo-mode');
        const btn = document.getElementById('btn-pojo-gen');
        const btnCopy = document.getElementById('btn-pojo-copy');
        const btnSample = document.getElementById('btn-pojo-sample');

        if (btnSample) btnSample.addEventListener('click', () => {
            srcEl.value = `public class UserEntity {
    private Long id;
    private String username;
    private String passwordHash;
    private Date createTime;
    private Integer status;
}`;
            dstEl.value = `public class UserDTO {
    private Long id;
    private String username;
    private String createTime;
    private String statusText;
}`;
        });

        btn.addEventListener('click', () => {
            try {
                const s = parseClass(srcEl.value);
                const d = parseClass(dstEl.value);
                outEl.value = generate(s, d, modeEl.value);
            } catch (e) {
                outEl.value = '解析失败：' + e.message;
            }
        });

        if (btnCopy) btnCopy.addEventListener('click', () => {
            if (!outEl.value) return;
            copyToClipboard(outEl.value);
        });
    }

    // Node 测试通过条件导出访问纯函数，浏览器仍按原流程初始化。
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { cap, generate, parseClass, stripAnnotations };
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
})();
