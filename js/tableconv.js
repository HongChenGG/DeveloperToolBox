// CSV / JSON / Markdown Table / SQL INSERT 互转
(function() {
    function init() {
        const input = document.getElementById('tbl-input');
        if (!input) return;
        const output = document.getElementById('tbl-output');
        const from = document.getElementById('tbl-from');
        const to = document.getElementById('tbl-to');
        const sep = document.getElementById('tbl-sep');
        const tableName = document.getElementById('tbl-name');
        const btnRun = document.getElementById('btn-tbl-run');
        const btnCopy = document.getElementById('btn-tbl-copy');
        const btnClear = document.getElementById('btn-tbl-clear');

        function parseCsv(text, delim) {
            const rows = [];
            let cur = [], field = '', inQuote = false;
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (inQuote) {
                    if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
                    else if (ch === '"') inQuote = false;
                    else field += ch;
                } else {
                    if (ch === '"') inQuote = true;
                    else if (ch === delim) { cur.push(field); field = ''; }
                    else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
                    else if (ch === '\r') { /* skip */ }
                    else field += ch;
                }
            }
            if (field || cur.length) { cur.push(field); rows.push(cur); }
            return rows.filter(r => r.some(c => c !== ''));
        }

        function toCsv(headers, data, delim) {
            const esc = v => {
                v = v === null || v === undefined ? '' : String(v);
                if (v.includes(delim) || v.includes('"') || v.includes('\n')) return '"' + v.replace(/"/g, '""') + '"';
                return v;
            };
            return [headers.map(esc).join(delim), ...data.map(row => headers.map(h => esc(row[h])).join(delim))].join('\n');
        }

        function toMd(headers, data) {
            const widths = headers.map(h => Math.max(h.length, ...data.map(r => String(r[h] ?? '').length)));
            const fmt = (row, i) => '| ' + row.map((v, j) => String(v ?? '').padEnd(widths[j])).join(' | ') + ' |';
            const sep = '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |';
            return [fmt(headers), sep, ...data.map(r => fmt(headers.map(h => r[h])))].join('\n');
        }

        function parseMd(text) {
            const lines = text.trim().split(/\r?\n/).filter(l => l.trim().startsWith('|'));
            if (lines.length < 2) throw new Error('Markdown 表格至少 2 行');
            const splitRow = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
            const headers = splitRow(lines[0]);
            const data = lines.slice(2).map(l => {
                const cells = splitRow(l);
                const obj = {};
                headers.forEach((h, i) => obj[h] = cells[i] ?? '');
                return obj;
            });
            return { headers, data };
        }

        function toSqlInsert(headers, data, table) {
            const esc = v => {
                if (v === null || v === undefined || v === '') return 'NULL';
                if (typeof v === 'number') return v;
                if (/^-?\d+(\.\d+)?$/.test(String(v))) return v;
                return "'" + String(v).replace(/'/g, "''") + "'";
            };
            return data.map(r =>
                `INSERT INTO ${table} (${headers.join(', ')}) VALUES (${headers.map(h => esc(r[h])).join(', ')});`
            ).join('\n');
        }

        function inferRows(text, fmt) {
            if (fmt === 'csv') {
                const rows = parseCsv(text, sep.value || ',');
                if (rows.length === 0) return { headers: [], data: [] };
                const headers = rows[0];
                const data = rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
                return { headers, data };
            }
            if (fmt === 'json') {
                const arr = JSON.parse(text);
                if (!Array.isArray(arr)) throw new Error('JSON 必须是数组');
                const headers = [...new Set(arr.flatMap(o => Object.keys(o)))];
                return { headers, data: arr };
            }
            if (fmt === 'md') return parseMd(text);
            throw new Error('不支持的输入格式');
        }

        function run() {
            try {
                const { headers, data } = inferRows(input.value, from.value);
                const t = to.value;
                const delim = sep.value || ',';
                if (t === 'csv') output.value = toCsv(headers, data, delim);
                else if (t === 'json') output.value = JSON.stringify(data, null, 2);
                else if (t === 'md') output.value = toMd(headers, data);
                else if (t === 'sql') output.value = toSqlInsert(headers, data, tableName.value || 'my_table');
            } catch (e) { output.value = '错误: ' + e.message; }
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
