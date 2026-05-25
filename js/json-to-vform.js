// JSON → Vue el-form：根据 JSON 字段类型推断 form 控件
// 支持 Vue 2 (Element UI) 和 Vue 3 (Element Plus + <script setup>)
(function () {
    'use strict';

    function infer(val) {
        if (val === null) return { type: 'input', placeholder: '请输入' };
        if (typeof val === 'boolean') return { type: 'switch' };
        if (typeof val === 'number') return { type: 'input-number' };
        if (Array.isArray(val)) return { type: 'select-multi', options: val };
        if (typeof val === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(val)) return { type: 'date-picker' };
            if (/@/.test(val) && val.includes('.')) return { type: 'input', rule: 'email' };
            if (val.length > 50) return { type: 'textarea' };
            return { type: 'input' };
        }
        if (typeof val === 'object') return { type: 'input', placeholder: '复杂对象' };
        return { type: 'input' };
    }

    function generate(json, vueVer) {
        const data = {};
        const formItems = [];
        const rules = {};

        Object.keys(json).forEach(key => {
            const val = json[key];
            const ctrl = infer(val);
            data[key] = val;

            const label = labelOf(key);
            let item;
            switch (ctrl.type) {
                case 'switch':
                    item = `      <el-form-item label="${label}" prop="${key}">\n        <el-switch v-model="form.${key}"></el-switch>\n      </el-form-item>`;
                    break;
                case 'input-number':
                    item = `      <el-form-item label="${label}" prop="${key}">\n        <el-input-number v-model="form.${key}" :min="0"></el-input-number>\n      </el-form-item>`;
                    break;
                case 'date-picker':
                    // Vue 2 用 yyyy-MM-dd / Vue 3(Plus) 用 YYYY-MM-DD
                    const dfmt = vueVer === '3' ? 'YYYY-MM-DD' : 'yyyy-MM-dd';
                    item = `      <el-form-item label="${label}" prop="${key}">\n        <el-date-picker v-model="form.${key}" type="date" placeholder="选择日期" value-format="${dfmt}"></el-date-picker>\n      </el-form-item>`;
                    break;
                case 'textarea':
                    item = `      <el-form-item label="${label}" prop="${key}">\n        <el-input type="textarea" v-model="form.${key}" :rows="4" placeholder="请输入${label}"></el-input>\n      </el-form-item>`;
                    break;
                case 'select-multi':
                    const opts = (ctrl.options || []).map(o => `          <el-option label="${o}" value="${o}"></el-option>`).join('\n');
                    item = `      <el-form-item label="${label}" prop="${key}">\n        <el-select v-model="form.${key}" multiple placeholder="请选择${label}">\n${opts}\n        </el-select>\n      </el-form-item>`;
                    break;
                default:
                    item = `      <el-form-item label="${label}" prop="${key}">\n        <el-input v-model="form.${key}" placeholder="请输入${label}"></el-input>\n      </el-form-item>`;
            }
            formItems.push(item);

            if (ctrl.rule === 'email') {
                rules[key] = [{ type: 'email', message: '请输入合法邮箱', trigger: 'blur' }];
            } else {
                rules[key] = [{ required: true, message: `请填写${label}`, trigger: 'blur' }];
            }
        });

        return vueVer === '3'
            ? buildVue3(formItems, data, rules)
            : buildVue2(formItems, data, rules);
    }

    // ========== Vue 2 + Element UI ==========
    function buildVue2(formItems, data, rules) {
        const tpl = `<template>\n  <el-form ref="form" :model="form" :rules="rules" label-width="100px">\n${formItems.join('\n')}\n      <el-form-item>\n        <el-button type="primary" @click="submit">提交</el-button>\n        <el-button @click="reset">重置</el-button>\n      </el-form-item>\n  </el-form>\n</template>`;

        const script = `\n<script>\nexport default {\n  data() {\n    return {\n      form: ${JSON.stringify(data, null, 8).replace(/\n/g, '\n      ')},\n      rules: ${JSON.stringify(rules, null, 8).replace(/\n/g, '\n      ')}\n    };\n  },\n  methods: {\n    submit() {\n      this.$refs.form.validate(valid => {\n        if (valid) {\n          this.$message.success('提交成功');\n          console.log(this.form);\n        }\n      });\n    },\n    reset() {\n      this.$refs.form.resetFields();\n    }\n  }\n};\n<\/script>`;

        return tpl + script;
    }

    // ========== Vue 3 + Element Plus (<script setup>) ==========
    function buildVue3(formItems, data, rules) {
        // 模板：注意 Element Plus 中 ref 改为 ref 字符串，submit 用 formRef.value
        const tpl = `<template>\n  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">\n${formItems.join('\n')}\n      <el-form-item>\n        <el-button type="primary" @click="submit">提交</el-button>\n        <el-button @click="reset">重置</el-button>\n      </el-form-item>\n  </el-form>\n</template>`;

        const script = `\n<script setup>\nimport { ref, reactive } from 'vue';\nimport { ElMessage } from 'element-plus';\n\nconst formRef = ref(null);\nconst form = reactive(${JSON.stringify(data, null, 2)});\nconst rules = ${JSON.stringify(rules, null, 2)};\n\nfunction submit() {\n  formRef.value.validate(valid => {\n    if (valid) {\n      ElMessage.success('提交成功');\n      console.log(form);\n    }\n  });\n}\n\nfunction reset() {\n  formRef.value.resetFields();\n}\n<\/script>`;

        return tpl + script;
    }

    function labelOf(key) {
        const dict = { id: 'ID', name: '姓名', username: '用户名', password: '密码', email: '邮箱', phone: '手机号', age: '年龄', gender: '性别', address: '地址', remark: '备注', status: '状态', createTime: '创建时间', updateTime: '更新时间', title: '标题', content: '内容', desc: '描述', description: '描述', price: '价格', amount: '数量', enabled: '启用' };
        return dict[key] || key;
    }

    function init() {
        const input = document.getElementById('j2vf-input');
        if (!input) return;
        const out = document.getElementById('j2vf-out');
        const btn = document.getElementById('btn-j2vf-gen');
        const btnSample = document.getElementById('btn-j2vf-sample');
        const btnCopy = document.getElementById('btn-j2vf-copy');
        const verEl = document.getElementById('j2vf-vue-ver');

        btnSample.addEventListener('click', () => {
            input.value = JSON.stringify({
                username: '',
                password: '',
                email: 'test@example.com',
                age: 18,
                gender: 'male',
                birthday: '2000-01-01',
                hobby: ['coding', 'music'],
                bio: '一段较长的个人简介内容...........',
                enabled: true
            }, null, 2);
        });

        btn.addEventListener('click', () => {
            try {
                const json = JSON.parse(input.value);
                out.value = generate(json, verEl ? verEl.value : '2');
            } catch (e) {
                out.value = 'JSON 解析失败：' + e.message;
            }
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
