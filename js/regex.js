// 正则表达式测试器
(function() {
    const PRESETS = {
        '手机号': '^1[3-9]\\d{9}$',
        '邮箱': '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
        '身份证(18位)': '^[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$',
        'IPv4': '^((25[0-5]|2[0-4]\\d|[01]?\\d?\\d)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d?\\d)$',
        'URL': '^https?:\\/\\/[^\\s]+$',
        '日期(YYYY-MM-DD)': '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$',
        '时间(HH:mm:ss)': '^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$',
        '中文': '[\\u4e00-\\u9fa5]+',
        '统一社会信用代码': '^[0-9A-HJ-NPQRTUWXY]{2}\\d{6}[0-9A-HJ-NPQRTUWXY]{10}$',
        '车牌号': '^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z0-9]{5,6}$',
        '密码(8位+大小写+数字)': '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$',
        'MAC地址': '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
        '十六进制颜色': '^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
    };

    const WORKER_TIMEOUT_MILLISECONDS = 500;
    const WORKER_TEXT_LIMIT_BYTES = 1024 * 1024;
    const textEncoder = new TextEncoder();

    function init() {
        const pattern = document.getElementById('regex-pattern');
        if (!pattern) return;
        const text = document.getElementById('regex-text');
        const flags = document.getElementById('regex-flags');
        const result = document.getElementById('regex-result');
        const highlight = document.getElementById('regex-highlight');
        const preset = document.getElementById('regex-preset');
        const btnClear = document.getElementById('btn-regex-clear');
        const btnRun = document.createElement('button');
        let activeWorker = null;
        let activeTimeoutId = null;
        let activeRequestId = 0;
        let fallbackOnly = window.location.protocol === 'file:';

        // Worker 不可用时需要显式按钮触发，避免输入期间同步执行危险正则。
        btnRun.id = 'btn-regex-run';
        btnRun.type = 'button';
        btnRun.className = 'btn btn-primary';
        btnRun.textContent = '执行';
        preset.closest('.toolbar').insertBefore(btnRun, btnClear);

        // 填充预设
        Object.keys(PRESETS).forEach(name => {
            const opt = document.createElement('option');
            opt.value = PRESETS[name];
            opt.textContent = name;
            preset.appendChild(opt);
        });
        preset.addEventListener('change', () => {
            if (preset.value) {
                pattern.value = preset.value;
                run(false);
            }
        });

        function escapeHtml(value) {
            return value.replace(/[&<>"']/g, character => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character]));
        }

        function getUtf8Size(value) {
            return textEncoder.encode(value).byteLength;
        }

        function stopActiveWorker() {
            if (activeTimeoutId !== null) {
                clearTimeout(activeTimeoutId);
                activeTimeoutId = null;
            }
            if (activeWorker) {
                activeWorker.terminate();
                activeWorker = null;
            }
        }

        function beginRequest() {
            activeRequestId += 1;
            stopActiveWorker();
            return activeRequestId;
        }

        function renderError(message) {
            result.innerHTML = '<span style="color:var(--danger-color)">' + escapeHtml(message) + '</span>';
        }

        function renderMatches(textValue, matches, truncated = false) {
            let html = '';
            let lastIndex = 0;

            matches.forEach(match => {
                html += escapeHtml(textValue.slice(lastIndex, match.index));
                html += `<mark style="background:var(--warning-color);color:#000;padding:0 2px;border-radius:2px">${escapeHtml(match.match)}</mark>`;
                lastIndex = match.index + match.match.length;
            });
            html += escapeHtml(textValue.slice(lastIndex));
            highlight.innerHTML = html || '<span style="color:var(--text-secondary)">无文本</span>';

            if (matches.length === 0) {
                result.innerHTML = '<span style="color:var(--danger-color)">未匹配</span>';
                return;
            }

            const list = matches.map((match, matchIndex) => {
                let item = `<div style="margin-bottom:6px;padding:6px;background:var(--bg-darker);border-radius:4px">
                    <b>#${matchIndex + 1}</b> 位置 ${match.index}: <code style="color:var(--accent-color)">${escapeHtml(match.match)}</code>`;
                if (match.groups.length) {
                    item += '<div style="margin-top:4px;font-size:12px;color:var(--text-secondary)">分组: ' +
                        match.groups.map((group, groupIndex) => `[${groupIndex + 1}]=${group === undefined ? '<i>undefined</i>' : '<code>' + escapeHtml(group) + '</code>'}`).join(' | ') + '</div>';
                }
                item += '</div>';
                return item;
            }).join('');
            const summaryText = `${truncated ? '结果已截断 · ' : ''}✓ 匹配到 ${matches.length} 处`;
            const summaryColor = truncated ? 'var(--warning-color)' : 'var(--success-color)';
            result.innerHTML = `<div style="color:${summaryColor};font-weight:bold;margin-bottom:8px">${summaryText}</div>` + list;
        }

        function renderWorkerUnavailable() {
            highlight.textContent = text.value;
            renderError('Worker 不可用，请通过本地 HTTP 服务器打开工具箱后重试');
        }

        function run(triggeredByButton) {
            if (fallbackOnly && !triggeredByButton) return;

            const patternValue = pattern.value;
            const textValue = text.value;
            const flagsValue = flags.value;
            const requestId = beginRequest();

            if (!patternValue) {
                result.innerHTML = '<span style="color:var(--text-secondary)">请输入正则表达式</span>';
                highlight.innerHTML = escapeHtml(textValue);
                return;
            }

            if (fallbackOnly) {
                renderWorkerUnavailable();
                return;
            }

            if (getUtf8Size(textValue) > WORKER_TEXT_LIMIT_BYTES) {
                renderError('测试文本不能超过 1 MiB');
                return;
            }

            let worker;
            try {
                worker = new Worker('js/regex-worker.js');
            } catch (error) {
                fallbackOnly = true;
                stopActiveWorker();
                renderWorkerUnavailable();
                return;
            }

            activeWorker = worker;
            activeTimeoutId = setTimeout(() => {
                if (requestId !== activeRequestId) return;
                stopActiveWorker();
                renderError('正则执行超过 500 毫秒，已终止');
            }, WORKER_TIMEOUT_MILLISECONDS);

            worker.onmessage = event => {
                const response = event.data || {};
                if (requestId !== activeRequestId || response.requestId !== requestId) return;
                stopActiveWorker();
                if (!response.ok) {
                    renderError('正则错误: ' + response.error);
                    return;
                }
                renderMatches(textValue, response.matches, response.truncated === true);
            };
            worker.onerror = () => {
                if (requestId !== activeRequestId) return;
                fallbackOnly = true;
                stopActiveWorker();
                renderWorkerUnavailable();
            };
            worker.onmessageerror = worker.onerror;

            try {
                worker.postMessage({
                    requestId,
                    pattern: patternValue,
                    flags: flagsValue,
                    text: textValue
                });
            } catch (error) {
                fallbackOnly = true;
                stopActiveWorker();
                renderWorkerUnavailable();
            }
        }

        [pattern, text, flags].forEach(element => element.addEventListener('input', () => run(false)));
        btnRun.addEventListener('click', () => run(true));
        btnClear && btnClear.addEventListener('click', () => {
            beginRequest();
            pattern.value = '';
            text.value = '';
            result.innerHTML = '';
            highlight.innerHTML = '';
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
