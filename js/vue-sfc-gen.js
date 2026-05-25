// Vue SFC 生成器：表单配置 → .vue 文件
// 支持 Vue 2 (Options API) 和 Vue 3 (<script setup> Composition API)
(function () {
    'use strict';

    function generate(cfg) {
        const props = cfg.props.filter(p => p.name);
        const datas = cfg.datas.filter(d => d.name);
        const methods = cfg.methods.filter(m => m);
        const computeds = cfg.computeds.filter(c => c);
        const watches = cfg.watches.filter(w => w);
        // 路由：根据版本生成
        return cfg.vueVer === '3'
            ? buildVue3(cfg, props, datas, methods, computeds, watches)
            : buildVue2(cfg, props, datas, methods, computeds, watches);
    }

    // ========== Vue 2 Options API ==========
    function buildVue2(cfg, props, datas, methods, computeds, watches) {
        let tpl = `<template>\n  <div class="${kebab(cfg.name)}">\n    <h2>{{ title }}</h2>`;
        props.forEach(p => { tpl += `\n    <p>${p.name}: {{ ${p.name} }}</p>`; });
        if (cfg.useElement) tpl += `\n    <el-button type="primary" @click="onClick">操作</el-button>`;
        tpl += `\n  </div>\n</template>\n`;

        let script = `\n<script>\nexport default {\n  name: '${cfg.name}',`;
        if (props.length) {
            script += `\n  props: {`;
            props.forEach(p => {
                const def = p.default ? `, default: ${formatDefault(p.type, p.default)}` : '';
                const req = p.required ? `, required: true` : '';
                script += `\n    ${p.name}: { type: ${p.type}${def}${req} },`;
            });
            script += `\n  },`;
        }
        script += `\n  data() {\n    return {\n      title: '${cfg.name}',`;
        datas.forEach(d => script += `\n      ${d.name}: ${formatDefault(d.type, d.default || '')},`);
        script += `\n    };\n  },`;

        if (computeds.length) {
            script += `\n  computed: {`;
            computeds.forEach(c => script += `\n    ${c}() {\n      return null; // TODO\n    },`);
            script += `\n  },`;
        }
        if (watches.length) {
            script += `\n  watch: {`;
            watches.forEach(w => script += `\n    ${w}(newVal, oldVal) {\n      // TODO\n    },`);
            script += `\n  },`;
        }
        script += `\n  created() {\n    // 初始化\n  },`;
        script += `\n  mounted() {\n    // DOM 就绪\n  },`;

        if (methods.length || cfg.useElement) {
            script += `\n  methods: {`;
            if (cfg.useElement) script += `\n    onClick() {\n      this.$message.success('点击了');\n    },`;
            methods.forEach(m => script += `\n    ${m}() {\n      // TODO\n    },`);
            script += `\n  },`;
        }
        script += `\n};\n<\/script>\n`;

        let style = `\n<style scoped>\n.${kebab(cfg.name)} {\n  padding: 16px;\n}\n<\/style>\n`;
        return tpl + script + style;
    }

    // ========== Vue 3 Composition API (<script setup>) ==========
    function buildVue3(cfg, props, datas, methods, computeds, watches) {
        const elNs = cfg.useElement; // Element Plus

        let tpl = `<template>\n  <div class="${kebab(cfg.name)}">\n    <h2>{{ title }}</h2>`;
        props.forEach(p => { tpl += `\n    <p>${p.name}: {{ ${p.name} }}</p>`; });
        if (elNs) tpl += `\n    <el-button type="primary" @click="onClick">操作</el-button>`;
        tpl += `\n  </div>\n</template>\n`;

        let script = `\n<script setup>\n`;
        script += `import { ref, reactive, computed, watch, onMounted } from 'vue';\n`;
        if (elNs) script += `import { ElMessage } from 'element-plus';\n`;

        // defineProps
        if (props.length) {
            script += `\nconst props = defineProps({`;
            props.forEach(p => {
                const def = p.default ? `, default: ${formatDefault(p.type, p.default)}` : '';
                const req = p.required ? `, required: true` : '';
                script += `\n  ${p.name}: { type: ${p.type}${def}${req} },`;
            });
            script += `\n});\n`;
        }

        // reactive state (title + datas)
        script += `\nconst title = ref('${cfg.name}');\n`;
        datas.forEach(d => {
            if (d.type === 'Array' || d.type === 'Object') {
                script += `const ${d.name} = reactive(${formatDefault(d.type, d.default || '')});\n`;
            } else {
                script += `const ${d.name} = ref(${formatDefault(d.type, d.default || '')});\n`;
            }
        });

        // computed
        if (computeds.length) {
            script += `\n`;
            computeds.forEach(c => script += `const ${c} = computed(() => {\n  return null; // TODO\n});\n`);
        }
        // watch
        if (watches.length) {
            script += `\n`;
            watches.forEach(w => script += `watch(() => ${w}, (newVal, oldVal) => {\n  // TODO\n});\n`);
        }
        // methods
        if (methods.length || elNs) {
            script += `\n`;
            if (elNs) script += `function onClick() {\n  ElMessage.success('点击了');\n}\n`;
            methods.forEach(m => script += `function ${m}() {\n  // TODO\n}\n`);
        }
        // lifecycle
        script += `\nonMounted(() => {\n  // DOM 就绪\n});\n<\/script>\n`;

        let style = `\n<style scoped>\n.${kebab(cfg.name)} {\n  padding: 16px;\n}\n<\/style>\n`;
        return tpl + script + style;
    }

    function kebab(s) {
        return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    function formatDefault(type, val) {
        if (val === '' || val === undefined) {
            if (type === 'String') return "''";
            if (type === 'Number') return '0';
            if (type === 'Boolean') return 'false';
            if (type === 'Array') return '() => []';
            if (type === 'Object') return '() => ({})';
            return 'null';
        }
        if (type === 'String') return `'${val}'`;
        return val;
    }

    function init() {
        const root = document.getElementById('vsfc-root');
        if (!root) return;
        const nameEl = document.getElementById('vsfc-name');
        const useEl = document.getElementById('vsfc-use-element');
        const verEl = document.getElementById('vsfc-vue-ver');
        const propsBody = document.getElementById('vsfc-props');
        const datasBody = document.getElementById('vsfc-datas');
        const methodsEl = document.getElementById('vsfc-methods');
        const computedsEl = document.getElementById('vsfc-computeds');
        const watchesEl = document.getElementById('vsfc-watches');
        const out = document.getElementById('vsfc-out');
        const btnGen = document.getElementById('btn-vsfc-gen');
        const btnAddProp = document.getElementById('btn-vsfc-add-prop');
        const btnAddData = document.getElementById('btn-vsfc-add-data');
        const btnCopy = document.getElementById('btn-vsfc-copy');

        function addPropRow(name = '', type = 'String', def = '', req = false) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input class="ctl-input" style="width:100%" placeholder="字段名" value="${name}"></td>
                <td><select class="ctl-input" style="width:100%">
                    <option ${type === 'String' ? 'selected' : ''}>String</option>
                    <option ${type === 'Number' ? 'selected' : ''}>Number</option>
                    <option ${type === 'Boolean' ? 'selected' : ''}>Boolean</option>
                    <option ${type === 'Array' ? 'selected' : ''}>Array</option>
                    <option ${type === 'Object' ? 'selected' : ''}>Object</option>
                </select></td>
                <td><input class="ctl-input" style="width:100%" placeholder="默认值" value="${def}"></td>
                <td style="text-align:center"><input type="checkbox" ${req ? 'checked' : ''}></td>
                <td><button class="btn btn-secondary" style="height:32px;padding:0 10px" onclick="this.closest('tr').remove()">×</button></td>`;
            propsBody.appendChild(tr);
        }
        function addDataRow(name = '', type = 'String', def = '') {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input class="ctl-input" style="width:100%" placeholder="字段名" value="${name}"></td>
                <td><select class="ctl-input" style="width:100%">
                    <option ${type === 'String' ? 'selected' : ''}>String</option>
                    <option ${type === 'Number' ? 'selected' : ''}>Number</option>
                    <option ${type === 'Boolean' ? 'selected' : ''}>Boolean</option>
                    <option ${type === 'Array' ? 'selected' : ''}>Array</option>
                    <option ${type === 'Object' ? 'selected' : ''}>Object</option>
                </select></td>
                <td><input class="ctl-input" style="width:100%" placeholder="初始值" value="${def}"></td>
                <td><button class="btn btn-secondary" style="height:32px;padding:0 10px" onclick="this.closest('tr').remove()">×</button></td>`;
            datasBody.appendChild(tr);
        }

        btnAddProp.addEventListener('click', () => addPropRow());
        btnAddData.addEventListener('click', () => addDataRow());
        addPropRow('value', 'String', '', true);
        addDataRow('loading', 'Boolean', 'false');

        btnGen.addEventListener('click', () => {
            const cfg = {
                name: (nameEl.value || 'MyComponent').trim(),
                useElement: useEl.checked,
                vueVer: verEl ? verEl.value : '2',
                props: Array.from(propsBody.querySelectorAll('tr')).map(tr => {
                    const tds = tr.querySelectorAll('input, select');
                    return { name: tds[0].value.trim(), type: tds[1].value, default: tds[2].value.trim(), required: tds[3].checked };
                }),
                datas: Array.from(datasBody.querySelectorAll('tr')).map(tr => {
                    const tds = tr.querySelectorAll('input, select');
                    return { name: tds[0].value.trim(), type: tds[1].value, default: tds[2].value.trim() };
                }),
                methods: methodsEl.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
                computeds: computedsEl.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
                watches: watchesEl.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
            };
            out.value = generate(cfg);
        });

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
