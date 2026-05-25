// Cron 表达式工具
(function() {
    const PRESETS = [
        { label: '每分钟', expr: '* * * * *' },
        { label: '每 5 分钟', expr: '*/5 * * * *' },
        { label: '每小时整点', expr: '0 * * * *' },
        { label: '每天凌晨 0 点', expr: '0 0 * * *' },
        { label: '每天 9 点', expr: '0 9 * * *' },
        { label: '每周一 9 点', expr: '0 9 * * 1' },
        { label: '每月 1 号 0 点', expr: '0 0 1 * *' },
        { label: '工作日 9 点', expr: '0 9 * * 1-5' },
        { label: 'Spring: 每 30 秒', expr: '*/30 * * * * ?' },
        { label: 'Spring: 每天 2 点 30', expr: '0 30 2 * * ?' }
    ];

    function init() {
        const input = document.getElementById('cron-input');
        if (!input) return;
        const descOut = document.getElementById('cron-desc');
        const nextOut = document.getElementById('cron-next');
        const presetSel = document.getElementById('cron-preset');
        const btnClear = document.getElementById('btn-cron-clear');

        PRESETS.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.expr;
            opt.textContent = p.label + ' (' + p.expr + ')';
            presetSel.appendChild(opt);
        });
        presetSel.addEventListener('change', () => {
            if (presetSel.value) { input.value = presetSel.value; run(); }
        });

        // ============ 自实现 Cron 解析（支持 5/6/7 段，含 Spring 格式） ============
        // 5 段: 分 时 日 月 周
        // 6 段: 秒 分 时 日 月 周
        // 7 段: 秒 分 时 日 月 周 年
        function parseField(field, min, max, names) {
            field = field.replace(/\?/g, '*');
            if (names) {
                Object.keys(names).forEach(k => {
                    field = field.replace(new RegExp(k, 'gi'), names[k]);
                });
            }
            const values = new Set();
            field.split(',').forEach(part => {
                let step = 1;
                let range = part;
                if (part.includes('/')) {
                    const [r, s] = part.split('/');
                    step = parseInt(s);
                    range = r;
                }
                let start, end;
                if (range === '*') { start = min; end = max; }
                else if (range.includes('-')) {
                    const [s, e] = range.split('-').map(Number);
                    start = s; end = e;
                } else {
                    const v = parseInt(range);
                    start = end = v;
                    if (step === 1) { values.add(v); return; }
                    end = max;
                }
                for (let i = start; i <= end; i += step) values.add(i);
            });
            return values;
        }

        const MONTH_NAMES = { JAN:1, FEB:2, MAR:3, APR:4, MAY:5, JUN:6, JUL:7, AUG:8, SEP:9, OCT:10, NOV:11, DEC:12 };
        const DOW_NAMES = { SUN:0, MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6 };

        function parseCron(expr) {
            const parts = expr.trim().split(/\s+/);
            let sec, min, hour, dom, month, dow, year;
            if (parts.length === 5) {
                [min, hour, dom, month, dow] = parts;
                sec = '0';
            } else if (parts.length === 6) {
                [sec, min, hour, dom, month, dow] = parts;
            } else if (parts.length === 7) {
                [sec, min, hour, dom, month, dow, year] = parts;
            } else {
                throw new Error('Cron 必须是 5/6/7 段');
            }
            return {
                seconds: parseField(sec, 0, 59),
                minutes: parseField(min, 0, 59),
                hours: parseField(hour, 0, 23),
                doms: parseField(dom, 1, 31),
                months: parseField(month, 1, 12, MONTH_NAMES),
                dows: parseField(dow.replace(/7/g, '0'), 0, 6, DOW_NAMES),
                domStar: dom === '*' || dom === '?',
                dowStar: dow === '*' || dow === '?',
            };
        }

        function nextRuns(expr, count) {
            const c = parseCron(expr);
            const results = [];
            const now = new Date();
            const cur = new Date(now.getTime() + 1000);
            cur.setMilliseconds(0);
            let iter = 0;
            while (results.length < count && iter < 500000) {
                iter++;
                const Y = cur.getFullYear(), M = cur.getMonth() + 1, D = cur.getDate();
                const dw = cur.getDay(), h = cur.getHours(), m = cur.getMinutes(), s = cur.getSeconds();
                if (!c.months.has(M)) { cur.setMonth(cur.getMonth() + 1); cur.setDate(1); cur.setHours(0,0,0,0); continue; }
                // dom/dow: 标准 cron 是 OR 关系（除非都是 *）
                const domOk = c.doms.has(D);
                const dowOk = c.dows.has(dw);
                let dayOk;
                if (c.domStar && c.dowStar) dayOk = true;
                else if (c.domStar) dayOk = dowOk;
                else if (c.dowStar) dayOk = domOk;
                else dayOk = domOk || dowOk;
                if (!dayOk) { cur.setDate(cur.getDate() + 1); cur.setHours(0,0,0,0); continue; }
                if (!c.hours.has(h)) { cur.setHours(cur.getHours() + 1); cur.setMinutes(0,0,0); continue; }
                if (!c.minutes.has(m)) { cur.setMinutes(cur.getMinutes() + 1); cur.setSeconds(0,0); continue; }
                if (!c.seconds.has(s)) { cur.setSeconds(cur.getSeconds() + 1); continue; }
                results.push(new Date(cur));
                cur.setSeconds(cur.getSeconds() + 1);
            }
            return results;
        }

        function run() {
            const expr = (input.value || '').trim();
            if (!expr) {
                descOut.innerHTML = '<span style="color:var(--text-secondary)">请输入 Cron 表达式</span>';
                nextOut.innerHTML = '';
                return;
            }
            // 中文描述（cronstrue）
            try {
                if (typeof cronstrue !== 'undefined') {
                    const text = cronstrue.toString(expr, { locale: 'zh_CN', use24HourTimeFormat: true });
                    descOut.innerHTML = '<span style="color:var(--success-color);font-weight:bold;font-size:16px">📝 ' + text + '</span>';
                } else {
                    descOut.textContent = '(cronstrue 未加载)';
                }
            } catch (e) {
                descOut.innerHTML = '<span style="color:var(--danger-color)">描述失败: ' + e.message + '</span>';
            }
            // 未来执行时间
            try {
                const list = nextRuns(expr, 10);
                if (!list.length) {
                    nextOut.innerHTML = '<span style="color:var(--text-secondary)">未来 500000 步内无匹配</span>';
                    return;
                }
                nextOut.innerHTML = '<div style="font-weight:bold;margin-bottom:8px">未来 10 次执行时间：</div>' +
                    list.map((d, i) => {
                        const pad = n => String(n).padStart(2, '0');
                        const w = ['日','一','二','三','四','五','六'][d.getDay()];
                        return `<div style="padding:4px 8px;background:var(--bg-darker);border-radius:4px;margin-bottom:3px;font-family:monospace">
                            <b>#${i + 1}</b> ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} 周${w}
                        </div>`;
                    }).join('');
            } catch (e) {
                nextOut.innerHTML = '<span style="color:var(--danger-color)">计算失败: ' + e.message + '</span>';
            }
        }

        input.addEventListener('input', run);
        btnClear && btnClear.addEventListener('click', () => {
            input.value = ''; descOut.innerHTML = ''; nextOut.innerHTML = '';
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
