// 离线检测：weather / music 依赖外网，无网时自动隐藏
// 入口：进入页面 + online/offline 事件 + 真实探测
(function () {
    'use strict';

    const ONLINE_PROBE_URL = 'https://www.baidu.com/favicon.ico'; // 国内可达
    const PROBE_TIMEOUT = 3000;

    // 需要联网的功能 nav 项 data-target 列表
    const ONLINE_FEATURES = ['weather', 'music'];

    // 浏览器 onLine 不可靠，做一次真实 HEAD 探测
    function realCheckOnline() {
        if (!navigator.onLine) return Promise.resolve(false);
        return new Promise((resolve) => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => { ctrl.abort(); resolve(false); }, PROBE_TIMEOUT);
            fetch(ONLINE_PROBE_URL + '?_=' + Date.now(), {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store',
                signal: ctrl.signal
            }).then(() => {
                clearTimeout(timer);
                resolve(true);
            }).catch(() => {
                clearTimeout(timer);
                resolve(false);
            });
        });
    }

    function applyVisibility(online) {
        // nav-item 隐藏
        ONLINE_FEATURES.forEach((tgt) => {
            const item = document.querySelector(`.nav-item[data-target="${tgt}"]`);
            if (item) item.style.display = online ? '' : 'none';
        });
        // 音乐悬浮按钮 + 播放面板：都受网络控制
        const toggleBtn = document.getElementById('btn-toggle-player');
        if (toggleBtn) toggleBtn.style.display = online ? '' : 'none';
        const player = document.getElementById('music-player');
        if (player && !online) player.style.display = 'none';

        // 如果当前正显示在被禁用页面，回退到 json
        if (!online) {
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav && ONLINE_FEATURES.includes(activeNav.getAttribute('data-target'))) {
                const fallback = document.querySelector('.nav-item[data-target="json"]');
                if (fallback) fallback.click();
            }
        }

        // 标记 body，供 CSS 钩子
        document.body.setAttribute('data-online', online ? '1' : '0');
    }

    function init() {
        realCheckOnline().then((online) => {
            applyVisibility(online);
            if (!online && typeof showToast === 'function') {
                showToast('离线模式：天气 / 音乐 已隐藏', 'info');
            }
        });

        // 网络状态变化
        window.addEventListener('online', () => {
            realCheckOnline().then(applyVisibility);
        });
        window.addEventListener('offline', () => applyVisibility(false));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
