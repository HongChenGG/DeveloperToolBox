// API Mock 工具：字段定义 → mock JSON + axios/fetch 调用代码
(function () {
    'use strict';

    const FAKERS = {
        string: () => randomChinese(2, 6),
        name: () => '张' + randomChinese(1, 2),
        email: () => randomEnglish(6) + '@example.com',
        phone: () => '1' + (Math.floor(Math.random() * 9) + 3) + Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join(''),
        url: () => 'https://example.com/' + randomEnglish(8),
        int: () => Math.floor(Math.random() * 1000),
        float: () => +(Math.random() * 100).toFixed(2),
        boolean: () => Math.random() > 0.5,
        date: () => new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().slice(0, 10),
        datetime: () => new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().slice(0, 19).replace('T', ' '),
        timestamp: () => Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 30 * 86400),
        uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
        }),
        id: () => Math.floor(Math.random() * 1000000),
    };

    function randomChinese(min, max) {
        const len = min + Math.floor(Math.random() * (max - min + 1));
        let s = ''; for (let i = 0; i < len; i++) s += String.fromCharCode(0x4e00 + Math.floor(Math.random() * 0x4e00));
        return s;
    }
    function randomEnglish(len) {
        const c = 'abcdefghijklmnopqrstuvwxyz'; let s = '';
        for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)];
        return s;
    }

    function mockField(field) {
        const type = (field.type || 'string').toLowerCase();
        if (FAKERS[type]) return FAKERS[type]();
        if (type === 'array') return Array.from({ length: 3 }, () => mockField({ type: field.itemType || 'string' }));
        if (type === 'object') return {};
        return null;
    }

    function generate(cfg) {
        // 单条 / 列表
        if (cfg.isList) {
            return Array.from({ length: cfg.listCount || 10 }, () => buildOne(cfg.fields));
        }
        return buildOne(cfg.fields);
    }
    function buildOne(fields) {
        const o = {};
        fields.forEach(f => { o[f.name] = mockField(f); });
        return o;
    }

    function genAxios(url, method, data, isList) {
        const lines = [];
        lines.push('// axios 调用示例');
        lines.push(`import axios from 'axios';`);
        lines.push('');
        if (method === 'GET') {
            lines.push(`axios.get('${url}', { params: { page: 1, size: 10 } })`);
        } else {
            const body = isList ? '{ items: [...] }' : JSON.stringify(data, null, 2);
            lines.push(`axios.${method.toLowerCase()}('${url}', ${body})`);
        }
        lines.push(`  .then(res => {`);
        lines.push(`    console.log(res.data);`);
        lines.push(`  })`);
        lines.push(`  .catch(err => {`);
        lines.push(`    console.error(err);`);
        lines.push(`  });`);
        lines.push('');
        lines.push('// Vue 组件中：');
        lines.push(`async fetchData() {`);
        lines.push(`  try {`);
        lines.push(`    this.loading = true;`);
        lines.push(`    const { data } = await axios.${method.toLowerCase()}('${url}');`);
        lines.push(`    this.list = data${isList ? '' : ''};`);
        lines.push(`  } finally {`);
        lines.push(`    this.loading = false;`);
        lines.push(`  }`);
        lines.push(`}`);
        return lines.join('\n');
    }

    function init() {
        const fieldsBody = document.getElementById('mock-fields');
        if (!fieldsBody) return;
        const urlEl = document.getElementById('mock-url');
        const methodEl = document.getElementById('mock-method');
        const listEl = document.getElementById('mock-is-list');
        const countEl = document.getElementById('mock-count');
        const outJson = document.getElementById('mock-out-json');
        const outAxios = document.getElementById('mock-out-axios');
        const btn = document.getElementById('btn-mock-gen');
        const btnAdd = document.getElementById('btn-mock-add');
        const btnSample = document.getElementById('btn-mock-sample');

        function addRow(name = '', type = 'string') {
            const TYPES = ['string', 'name', 'email', 'phone', 'url', 'int', 'float', 'boolean', 'date', 'datetime', 'timestamp', 'uuid', 'id'];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input class="ctl-input" style="width:100%" placeholder="字段名" value="${name}"></td>
                <td><select class="ctl-input" style="width:100%">${TYPES.map(t => `<option ${t === type ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
                <td><button class="btn btn-secondary" style="height:32px;padding:0 10px" onclick="this.closest('tr').remove()">×</button></td>`;
            fieldsBody.appendChild(tr);
        }
        btnAdd.addEventListener('click', () => addRow());

        btnSample.addEventListener('click', () => {
            fieldsBody.innerHTML = '';
            [['id', 'id'], ['username', 'name'], ['email', 'email'], ['phone', 'phone'], ['age', 'int'], ['avatar', 'url'], ['createTime', 'datetime']].forEach(([n, t]) => addRow(n, t));
            urlEl.value = '/api/user/list';
            listEl.checked = true;
        });

        // 初始 3 行
        addRow('id', 'id');
        addRow('name', 'name');
        addRow('createTime', 'datetime');

        btn.addEventListener('click', () => {
            const fields = Array.from(fieldsBody.querySelectorAll('tr')).map(tr => {
                const els = tr.querySelectorAll('input, select');
                return { name: els[0].value.trim(), type: els[1].value };
            }).filter(f => f.name);
            if (!fields.length) {
                if (typeof showToast === 'function') showToast('请添加至少一个字段', 'warning');
                return;
            }
            const isList = listEl.checked;
            const data = generate({ fields, isList, listCount: parseInt(countEl.value) || 10 });
            outJson.value = JSON.stringify(data, null, 2);
            outAxios.value = genAxios(urlEl.value || '/api/data', methodEl.value, isList ? data[0] : data, isList);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
