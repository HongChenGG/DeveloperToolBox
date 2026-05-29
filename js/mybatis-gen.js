// MyBatis 生成器：DDL → Entity + Mapper.xml + Mapper.java + Service
(function () {
    'use strict';

    function snake2Camel(s, pascal = false) {
        const parts = s.toLowerCase().split('_').filter(Boolean);
        const out = parts.map((p, i) => (i === 0 && !pascal) ? p : p[0].toUpperCase() + p.slice(1)).join('');
        return out;
    }

    // SQL 类型 → Java
    function sqlToJava(t) {
        t = t.toLowerCase().replace(/\(.*/, '');
        if (/(varchar|char|text|json|enum|uuid)/.test(t)) return 'String';
        if (/tinyint|smallint/.test(t)) return 'Integer';
        if (/bigint|long/.test(t)) return 'Long';
        if (/int/.test(t)) return 'Integer';
        if (/decimal|numeric|number/.test(t)) return 'BigDecimal';
        if (/float|double|real/.test(t)) return 'Double';
        if (/datetime|timestamp/.test(t)) return 'LocalDateTime';
        if (/date/.test(t)) return 'LocalDate';
        if (/time/.test(t)) return 'LocalTime';
        if (/bool|bit/.test(t)) return 'Boolean';
        if (/blob|binary|varbinary|image/.test(t)) return 'byte[]';
        return 'String';
    }
    // SQL 类型 → JdbcType
    function sqlToJdbc(t) {
        t = t.toLowerCase().replace(/\(.*/, '');
        if (/(varchar|char|text)/.test(t)) return 'VARCHAR';
        if (/bigint/.test(t)) return 'BIGINT';
        if (/tinyint/.test(t)) return 'TINYINT';
        if (/smallint/.test(t)) return 'SMALLINT';
        if (/int/.test(t)) return 'INTEGER';
        if (/decimal|numeric/.test(t)) return 'DECIMAL';
        if (/float/.test(t)) return 'FLOAT';
        if (/double/.test(t)) return 'DOUBLE';
        if (/datetime|timestamp/.test(t)) return 'TIMESTAMP';
        if (/date/.test(t)) return 'DATE';
        if (/time/.test(t)) return 'TIME';
        if (/bool|bit/.test(t)) return 'BOOLEAN';
        if (/blob|binary/.test(t)) return 'BLOB';
        return 'VARCHAR';
    }

    function parseDDL(ddl) {
        const tableMatch = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\[]?(\w+)[`"\]]?/i);
        if (!tableMatch) throw new Error('未找到 CREATE TABLE 语句');
        const table = tableMatch[1];
        // 用括号深度匹配字段定义体,避免 PARTITION/ROW_FORMAT/COMMENT 后置子句干扰
        const openIdx = ddl.indexOf('(', tableMatch.index);
        if (openIdx === -1) throw new Error('未找到字段定义体');
        let depth = 0, closeIdx = -1;
        for (let i = openIdx; i < ddl.length; i++) {
            const ch = ddl[i];
            if (ch === '(') depth++;
            else if (ch === ')') { depth--; if (depth === 0) { closeIdx = i; break; } }
        }
        if (closeIdx === -1) throw new Error('字段定义体括号未闭合');
        const body = ddl.substring(openIdx + 1, closeIdx);

        // 按顶层逗号切字段(忽略嵌套括号 / 字符串字面量),不强制要求换行
        const fieldDefs = splitTopLevelComma(body);

        const cols = [];
        let pk = null;
        fieldDefs.forEach(line => {
            line = line.trim();
            if (!line) return;
            if (/^PRIMARY\s+KEY/i.test(line)) {
                const m = line.match(/PRIMARY\s+KEY\s*\(\s*[`"\[]?(\w+)/i);
                if (m) pk = m[1];
                return;
            }
            if (/^(UNIQUE|KEY|INDEX|CONSTRAINT|FOREIGN|CHECK)/i.test(line)) return;
            const m = line.match(/[`"\[]?(\w+)[`"\]]?\s+([A-Za-z]+(?:\([^)]+\))?)/);
            if (m) {
                const name = m[1];
                const type = m[2];
                const isAutoInc = /AUTO_INCREMENT|IDENTITY/i.test(line);
                const comment = (line.match(/COMMENT\s+['"]([^'"]+)['"]/i) || [])[1] || '';
                cols.push({ name, type, isAutoInc, comment });
                if (isAutoInc) pk = pk || name;
            }
        });

        if (!pk && cols.length) pk = cols[0].name;
        return { table, cols, pk };
    }

    // 按顶层逗号切分(忽略嵌套括号和字符串字面量)
    function splitTopLevelComma(str) {
        const out = [];
        let cur = '';
        let depth = 0;
        const len = str.length;
        let i = 0;
        while (i < len) {
            const c = str[i];
            if (c === "'" || c === '"' || c === '`') {
                cur += c; i++;
                while (i < len && str[i] !== c) {
                    if (str[i] === '\\' && i + 1 < len) { cur += str[i] + str[i + 1]; i += 2; continue; }
                    cur += str[i]; i++;
                }
                if (i < len) { cur += str[i]; i++; }
                continue;
            }
            if (c === '(') { depth++; cur += c; i++; continue; }
            if (c === ')') { depth--; cur += c; i++; continue; }
            if (c === ',' && depth === 0) { out.push(cur); cur = ''; i++; continue; }
            cur += c; i++;
        }
        if (cur.trim()) out.push(cur);
        return out;
    }

    function genEntity(pkg, info, useLombok) {
        const entityName = snake2Camel(info.table, true);
        const lines = [];
        lines.push(`package ${pkg}.entity;`);
        lines.push('');
        const imports = new Set();
        info.cols.forEach(c => {
            const t = sqlToJava(c.type);
            if (t === 'LocalDateTime') imports.add('import java.time.LocalDateTime;');
            if (t === 'LocalDate')     imports.add('import java.time.LocalDate;');
            if (t === 'LocalTime')     imports.add('import java.time.LocalTime;');
            if (t === 'BigDecimal')    imports.add('import java.math.BigDecimal;');
        });
        imports.forEach(i => lines.push(i));
        if (useLombok) {
            lines.push('import lombok.Data;');
            lines.push('');
            lines.push('@Data');
        } else {
            lines.push('');
        }
        lines.push(`public class ${entityName} {`);
        info.cols.forEach(c => {
            if (c.comment) lines.push(`    /** ${c.comment} */`);
            lines.push(`    private ${sqlToJava(c.type)} ${snake2Camel(c.name)};`);
        });
        if (!useLombok) {
            lines.push('');
            info.cols.forEach(c => {
                const t = sqlToJava(c.type);
                const f = snake2Camel(c.name);
                const m = f[0].toUpperCase() + f.slice(1);
                lines.push(`    public ${t} get${m}() { return ${f}; }`);
                lines.push(`    public void set${m}(${t} ${f}) { this.${f} = ${f}; }`);
            });
        }
        lines.push('}');
        return lines.join('\n');
    }

    function genMapperXml(pkg, info) {
        const entityName = snake2Camel(info.table, true);
        const ns = `${pkg}.mapper.${entityName}Mapper`;
        const lines = [];
        lines.push('<?xml version="1.0" encoding="UTF-8"?>');
        lines.push('<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"');
        lines.push('        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">');
        lines.push(`<mapper namespace="${ns}">`);
        lines.push('');
        lines.push(`    <resultMap id="BaseResultMap" type="${pkg}.entity.${entityName}">`);
        info.cols.forEach(c => {
            const tag = c.name === info.pk ? 'id' : 'result';
            lines.push(`        <${tag} column="${c.name}" property="${snake2Camel(c.name)}" jdbcType="${sqlToJdbc(c.type)}"/>`);
        });
        lines.push('    </resultMap>');
        lines.push('');
        lines.push('    <sql id="Base_Column_List">');
        lines.push('        ' + info.cols.map(c => c.name).join(', '));
        lines.push('    </sql>');
        lines.push('');
        // selectById
        lines.push('    <select id="selectById" resultMap="BaseResultMap">');
        lines.push(`        SELECT <include refid="Base_Column_List"/> FROM ${info.table}`);
        lines.push(`        WHERE ${info.pk} = #{${snake2Camel(info.pk)}}`);
        lines.push('    </select>');
        lines.push('');
        // insert
        const insertCols = info.cols.filter(c => !c.isAutoInc).map(c => c.name).join(', ');
        const insertVals = info.cols.filter(c => !c.isAutoInc).map(c => `#{${snake2Camel(c.name)}}`).join(', ');
        lines.push(`    <insert id="insert" parameterType="${pkg}.entity.${entityName}"${info.cols.find(c => c.isAutoInc) ? ` useGeneratedKeys="true" keyProperty="${snake2Camel(info.pk)}"` : ''}>`);
        lines.push(`        INSERT INTO ${info.table} (${insertCols})`);
        lines.push(`        VALUES (${insertVals})`);
        lines.push('    </insert>');
        lines.push('');
        // update
        lines.push(`    <update id="updateById" parameterType="${pkg}.entity.${entityName}">`);
        lines.push(`        UPDATE ${info.table}`);
        lines.push('        <set>');
        info.cols.filter(c => c.name !== info.pk).forEach(c => {
            const f = snake2Camel(c.name);
            lines.push(`            <if test="${f} != null">${c.name} = #{${f}},</if>`);
        });
        lines.push('        </set>');
        lines.push(`        WHERE ${info.pk} = #{${snake2Camel(info.pk)}}`);
        lines.push('    </update>');
        lines.push('');
        // delete
        lines.push('    <delete id="deleteById">');
        lines.push(`        DELETE FROM ${info.table} WHERE ${info.pk} = #{${snake2Camel(info.pk)}}`);
        lines.push('    </delete>');
        lines.push('');
        lines.push('</mapper>');
        return lines.join('\n');
    }

    function genMapperJava(pkg, info) {
        const entityName = snake2Camel(info.table, true);
        const pkType = sqlToJava(info.cols.find(c => c.name === info.pk).type);
        const lines = [];
        lines.push(`package ${pkg}.mapper;`);
        lines.push('');
        lines.push(`import ${pkg}.entity.${entityName};`);
        lines.push('import org.apache.ibatis.annotations.Mapper;');
        lines.push('');
        lines.push('@Mapper');
        lines.push(`public interface ${entityName}Mapper {`);
        lines.push(`    ${entityName} selectById(${pkType} ${snake2Camel(info.pk)});`);
        lines.push(`    int insert(${entityName} record);`);
        lines.push(`    int updateById(${entityName} record);`);
        lines.push(`    int deleteById(${pkType} ${snake2Camel(info.pk)});`);
        lines.push('}');
        return lines.join('\n');
    }

    function genService(pkg, info) {
        const entityName = snake2Camel(info.table, true);
        const pkType = sqlToJava(info.cols.find(c => c.name === info.pk).type);
        const varName = entityName[0].toLowerCase() + entityName.slice(1);
        const lines = [];
        lines.push(`package ${pkg}.service;`);
        lines.push('');
        lines.push(`import ${pkg}.entity.${entityName};`);
        lines.push(`import ${pkg}.mapper.${entityName}Mapper;`);
        lines.push('import org.springframework.beans.factory.annotation.Autowired;');
        lines.push('import org.springframework.stereotype.Service;');
        lines.push('');
        lines.push('@Service');
        lines.push(`public class ${entityName}Service {`);
        lines.push('    @Autowired');
        lines.push(`    private ${entityName}Mapper ${varName}Mapper;`);
        lines.push('');
        lines.push(`    public ${entityName} getById(${pkType} id) {`);
        lines.push(`        return ${varName}Mapper.selectById(id);`);
        lines.push('    }');
        lines.push('');
        lines.push(`    public int save(${entityName} ${varName}) {`);
        lines.push(`        return ${varName}Mapper.insert(${varName});`);
        lines.push('    }');
        lines.push('');
        lines.push(`    public int update(${entityName} ${varName}) {`);
        lines.push(`        return ${varName}Mapper.updateById(${varName});`);
        lines.push('    }');
        lines.push('');
        lines.push(`    public int delete(${pkType} id) {`);
        lines.push(`        return ${varName}Mapper.deleteById(id);`);
        lines.push('    }');
        lines.push('}');
        return lines.join('\n');
    }

    function init() {
        const ddl = document.getElementById('mb-ddl');
        if (!ddl) return;
        const pkg = document.getElementById('mb-pkg');
        const lombok = document.getElementById('mb-lombok');
        const tabs = document.querySelectorAll('.mb-tab');
        const out = document.getElementById('mb-out');
        const btn = document.getElementById('btn-mb-gen');
        const btnCopy = document.getElementById('btn-mb-copy');
        const btnSample = document.getElementById('btn-mb-sample');
        let results = {};

        btnSample.addEventListener('click', () => {
            ddl.value = `CREATE TABLE user (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  password VARCHAR(100) NOT NULL COMMENT '密码',
  email VARCHAR(100) COMMENT '邮箱',
  age INT COMMENT '年龄',
  status TINYINT DEFAULT 1 COMMENT '状态:1启用 0禁用',
  create_time DATETIME COMMENT '创建时间',
  update_time DATETIME COMMENT '更新时间',
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='用户表';`;
        });

        btn.addEventListener('click', () => {
            try {
                const info = parseDDL(ddl.value);
                const p = pkg.value.trim() || 'com.example';
                results = {
                    entity: genEntity(p, info, lombok.checked),
                    xml: genMapperXml(p, info),
                    mapper: genMapperJava(p, info),
                    service: genService(p, info)
                };
                showTab('entity');
                if (typeof showToast === 'function') showToast('生成成功', 'success');
            } catch (e) {
                out.value = '错误：' + e.message;
                if (typeof showToast === 'function') showToast(e.message, 'error');
            }
        });

        function showTab(k) {
            tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === k));
            out.value = results[k] || '';
        }
        tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

        btnCopy.addEventListener('click', () => {
            if (!out.value) return;
            navigator.clipboard.writeText(out.value);
            if (typeof showToast === 'function') showToast('已复制', 'success');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
