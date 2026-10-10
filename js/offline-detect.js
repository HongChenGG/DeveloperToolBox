// 离线优先状态：启动时不做任何外部探测，仅记录浏览器报告的网络状态。
(function () {
    'use strict';

    const networkOnlySelectors = [
        '.nav-item[data-target="weather"]',
        '#btn-toggle-player',
        '[data-network-only]'
    ];

    function updateOnlineState(online) {
        networkOnlySelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.hidden = !online;
            });
        });

        if (!online) {
            const musicPlayer = document.getElementById('music-player');
            const audioPlayer = document.getElementById('audio-player');
            if (musicPlayer) musicPlayer.style.display = 'none';
            audioPlayer?.pause();

            const activeNavigation = document.querySelector('.nav-item.active');
            if (activeNavigation?.getAttribute('data-target') === 'weather') {
                document.querySelector('.nav-item[data-target="json"]')?.click();
            }
        }

        document.body.setAttribute('data-online', online ? '1' : '0');
    }

    function init() {
        updateOnlineState(navigator.onLine);
        window.addEventListener('online', () => updateOnlineState(true));
        window.addEventListener('offline', () => updateOnlineState(false));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
