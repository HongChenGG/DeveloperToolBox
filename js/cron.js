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

    const CRON_INPUT_DEBOUNCE_MS = 250;
    const MONTH_NAMES = { JAN:1, FEB:2, MAR:3, APR:4, MAY:5, JUN:6, JUL:7, AUG:8, SEP:9, OCT:10, NOV:11, DEC:12 };
    const DOW_NAMES = { SUN:0, MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6 };

    function normalizeCronField(field, names, allowQuestionMark) {
        let normalizedField = String(field).toUpperCase();
        if (normalizedField === '?') {
            if (!allowQuestionMark) throw new Error('Cron 字段不允许使用 ?');
            return '*';
        }
        if (normalizedField.includes('?')) throw new Error('Cron 字段语法不完整');
        if (normalizedField.includes('#')) throw new Error('不支持 Cron 特殊语法 #');

        normalizedField = normalizedField.replace(/[A-Z]+/g, token => {
            if (names && Object.prototype.hasOwnProperty.call(names, token)) return String(names[token]);
            if (token.includes('L')) throw new Error('不支持 Cron 特殊语法 L');
            if (token.includes('W')) throw new Error('不支持 Cron 特殊语法 W');
            throw new Error(`Cron 字段包含无效字符 ${token}`);
        });
        return normalizedField;
    }

    function parseField(field, min, max, names, options = {}) {
        const normalizedField = normalizeCronField(field, names, options.allowQuestionMark);
        const parts = normalizedField.split(',');
        const values = new Set();
        const normalizeValue = options.normalizeValue || (value => value);

        if (!normalizedField || parts.some(part => !part)) throw new Error('Cron 字段语法不完整');

        const parseValue = token => {
            if (!/^\d+$/.test(token)) throw new Error('Cron 字段必须是完整整数');
            const value = Number(token);
            if (!Number.isSafeInteger(value) || value < min || value > max) {
                throw new Error(`Cron 字段值 ${token} 超出范围 ${min}-${max}`);
            }
            return value;
        };

        parts.forEach(part => {
            const stepParts = part.split('/');
            if (stepParts.length > 2) throw new Error('Cron 步长语法不完整');

            const rangeText = stepParts[0];
            let step = 1;
            if (stepParts.length === 2) {
                const stepText = stepParts[1];
                step = Number(stepText);
                if (!/^\d+$/.test(stepText) || !Number.isSafeInteger(step) || step <= 0) {
                    throw new Error('Cron 步长必须是正整数');
                }
            }

            let start;
            let end;
            if (rangeText === '*') {
                start = min;
                end = max;
            } else {
                const rangeParts = rangeText.split('-');
                if (rangeParts.length === 1) {
                    start = parseValue(rangeParts[0]);
                    end = stepParts.length === 2 ? max : start;
                } else if (rangeParts.length === 2 && rangeParts[0] && rangeParts[1]) {
                    start = parseValue(rangeParts[0]);
                    end = parseValue(rangeParts[1]);
                    if (start > end) throw new Error('Cron 范围起点不得大于终点');
                } else {
                    throw new Error('Cron 范围语法不完整');
                }
            }

            for (let value = start; value <= end; value += step) {
                values.add(normalizeValue(value));
            }
        });

        return values;
    }

    function parseCron(expression) {
        const normalizedExpression = String(expression ?? '').trim();
        const parts = normalizedExpression ? normalizedExpression.split(/\s+/) : [];
        let second;
        let minute;
        let hour;
        let dayOfMonth;
        let month;
        let dayOfWeek;
        let year = '*';

        if (parts.length === 5) {
            [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
            second = '0';
        } else if (parts.length === 6) {
            [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts;
        } else if (parts.length === 7) {
            [second, minute, hour, dayOfMonth, month, dayOfWeek, year] = parts;
        } else {
            throw new Error('Cron 必须是 5/6/7 段');
        }

        return {
            seconds: parseField(second, 0, 59),
            minutes: parseField(minute, 0, 59),
            hours: parseField(hour, 0, 23),
            doms: parseField(dayOfMonth, 1, 31, null, { allowQuestionMark: true }),
            months: parseField(month, 1, 12, MONTH_NAMES),
            dows: parseField(dayOfWeek, 0, 7, DOW_NAMES, {
                allowQuestionMark: true,
                normalizeValue: value => value === 7 ? 0 : value
            }),
            years: parseField(year, 1970, 2199),
            domStar: dayOfMonth === '*' || dayOfMonth === '?',
            dowStar: dayOfWeek === '*' || dayOfWeek === '?'
        };
    }

    function nextRuns(expression, count = 10, startDate = new Date()) {
        if (!Number.isInteger(count) || count < 0) throw new Error('执行次数必须是非负整数');

        const cron = parseCron(expression);
        const results = [];
        const startTimestamp = startDate && typeof startDate.getTime === 'function'
            ? startDate.getTime()
            : new Date(startDate).getTime();
        if (!Number.isFinite(startTimestamp)) throw new Error('起始时间无效');

        const current = new Date(startTimestamp);
        current.setMilliseconds(0);
        current.setSeconds(current.getSeconds() + 1);
        const sortedYears = [...cron.years].sort((left, right) => left - right);
        const sortedMonths = [...cron.months].sort((left, right) => left - right);
        let iterations = 0;

        while (results.length < count && iterations < 500000) {
            iterations += 1;
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            const day = current.getDate();
            const dayOfWeek = current.getDay();
            const hour = current.getHours();
            const minute = current.getMinutes();
            const second = current.getSeconds();

            if (year > 2199) break;
            if (!cron.years.has(year)) {
                const nextYear = sortedYears.find(candidate => candidate > year);
                if (nextYear === undefined) break;
                current.setFullYear(nextYear, 0, 1);
                current.setHours(0, 0, 0, 0);
                continue;
            }
            if (!cron.months.has(month)) {
                const nextMonth = sortedMonths.find(candidate => candidate > month);
                if (nextMonth === undefined) current.setFullYear(year + 1, sortedMonths[0] - 1, 1);
                else current.setFullYear(year, nextMonth - 1, 1);
                current.setHours(0, 0, 0, 0);
                continue;
            }

            // 日期和星期遵循标准 Cron 的 OR 关系。
            const dayOfMonthMatches = cron.doms.has(day);
            const dayOfWeekMatches = cron.dows.has(dayOfWeek);
            let dayMatches;
            if (cron.domStar && cron.dowStar) dayMatches = true;
            else if (cron.domStar) dayMatches = dayOfWeekMatches;
            else if (cron.dowStar) dayMatches = dayOfMonthMatches;
            else dayMatches = dayOfMonthMatches || dayOfWeekMatches;

            if (!dayMatches) {
                current.setDate(current.getDate() + 1);
                current.setHours(0, 0, 0, 0);
                continue;
            }
            if (!cron.hours.has(hour)) {
                current.setHours(current.getHours() + 1);
                current.setMinutes(0, 0, 0);
                continue;
            }
            if (!cron.minutes.has(minute)) {
                current.setMinutes(current.getMinutes() + 1);
                current.setSeconds(0, 0);
                continue;
            }
            if (!cron.seconds.has(second)) {
                current.setSeconds(current.getSeconds() + 1);
                continue;
            }

            results.push(new Date(current));
            current.setSeconds(current.getSeconds() + 1);
        }

        return results;
    }

    function debounce(callback, delay) {
        let timerId;
        return function debouncedCallback(...args) {
            if (timerId !== undefined) clearTimeout(timerId);
            timerId = setTimeout(() => {
                timerId = undefined;
                callback.apply(this, args);
            }, delay);
        };
    }

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

        input.addEventListener('input', debounce(run, CRON_INPUT_DEBOUNCE_MS));
        btnClear && btnClear.addEventListener('click', () => {
            input.value = ''; descOut.innerHTML = ''; nextOut.innerHTML = '';
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { CRON_INPUT_DEBOUNCE_MS, debounce, nextRuns, parseCron, parseField };
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    }
})();
