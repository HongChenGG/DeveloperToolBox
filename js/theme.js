// 主题切换功能
(function() {
    'use strict';

    const THEME_STORAGE_KEY = 'selected_theme';

    // 把 #RRGGBB 转 rgba 字符串（用于动态阴影色）
    function hexToRgba(hex, alpha) {
        if (!hex || typeof hex !== 'string') return `rgba(0, 180, 216, ${alpha})`;
        const h = hex.replace('#', '');
        const n = h.length === 3
            ? h.split('').map(c => parseInt(c + c, 16))
            : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        return `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${alpha})`;
    }

    // 主题配置
    const themes = {
        blue: {
            name: '清新青蓝',
            '--bg-dark': '#F0F8FF',
            '--bg-darker': '#E6F3FF',
            '--bg-panel': '#FFFFFF',
            '--accent-color': '#00B4D8',
            '--border-color': '#B8E6F5',
            '--hover-bg': 'rgba(0, 180, 216, 0.1)',
            'body-bg': 'linear-gradient(135deg, #E6F3FF 0%, #F0F8FF 50%, #E0F2FE 100%)',
            'sidebar-bg': 'linear-gradient(180deg, #FFFFFF 0%, #E6F3FF 100%)',
            'logo-bg': 'linear-gradient(135deg, #00B4D8 0%, #0096C7 100%)',
            'btn-primary': 'linear-gradient(135deg, #00B4D8 0%, #0096C7 100%)',
            'btn-primary-hover': 'linear-gradient(135deg, #0096C7 0%, #0077B6 100%)'
        },
        pink: {
            name: '甜美粉色',
            '--bg-dark': '#FFF5F7',
            '--bg-darker': '#FFE8ED',
            '--bg-panel': '#FFFFFF',
            '--accent-color': '#FF6B9D',
            '--border-color': '#FFD1DC',
            '--hover-bg': 'rgba(255, 107, 157, 0.1)',
            'body-bg': 'linear-gradient(135deg, #FFF5F7 0%, #FFE8ED 50%, #FFF0F5 100%)',
            'sidebar-bg': 'linear-gradient(180deg, #FFFFFF 0%, #FFE8ED 100%)',
            'logo-bg': 'linear-gradient(135deg, #FF6B9D 0%, #FFA07A 100%)',
            'btn-primary': 'linear-gradient(135deg, #FF6B9D 0%, #FF8FAB 100%)',
            'btn-primary-hover': 'linear-gradient(135deg, #FF5A8C 0%, #FF7E9A 100%)'
        },
        purple: {
            name: '神秘紫色',
            '--bg-dark': '#F5F3FF',
            '--bg-darker': '#EDE9FE',
            '--bg-panel': '#FFFFFF',
            '--accent-color': '#A78BFA',
            '--border-color': '#DDD6FE',
            '--hover-bg': 'rgba(167, 139, 250, 0.1)',
            'body-bg': 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #E9D5FF 100%)',
            'sidebar-bg': 'linear-gradient(180deg, #FFFFFF 0%, #EDE9FE 100%)',
            'logo-bg': 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
            'btn-primary': 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
            'btn-primary-hover': 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
        },
        orange: {
            name: '阳光橙色',
            '--bg-dark': '#FFF7ED',
            '--bg-darker': '#FFEDD5',
            '--bg-panel': '#FFFFFF',
            '--accent-color': '#FB923C',
            '--border-color': '#FED7AA',
            '--hover-bg': 'rgba(251, 146, 60, 0.1)',
            'body-bg': 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FED7AA 100%)',
            'sidebar-bg': 'linear-gradient(180deg, #FFFFFF 0%, #FFEDD5 100%)',
            'logo-bg': 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)',
            'btn-primary': 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)',
            'btn-primary-hover': 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
        },
        green: {
            name: '清新绿色',
            '--bg-dark': '#F0FDF4',
            '--bg-darker': '#DCFCE7',
            '--bg-panel': '#FFFFFF',
            '--accent-color': '#10B981',
            '--border-color': '#BBF7D0',
            '--hover-bg': 'rgba(16, 185, 129, 0.1)',
            'body-bg': 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%)',
            'sidebar-bg': 'linear-gradient(180deg, #FFFFFF 0%, #DCFCE7 100%)',
            'logo-bg': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            'btn-primary': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            'btn-primary-hover': 'linear-gradient(135deg, #059669 0%, #047857 100%)'
        },
        dark: {
            name: '深色模式',
            '--bg-dark': '#1E293B',
            '--bg-darker': '#0F172A',
            '--bg-panel': '#1E293B',
            '--accent-color': '#60A5FA',
            '--border-color': '#334155',
            '--hover-bg': 'rgba(96, 165, 250, 0.1)',
            '--text-primary': '#F1F5F9',
            '--text-secondary': '#CBD5E1',
            'body-bg': 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
            'sidebar-bg': 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
            'logo-bg': 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
            'btn-primary': 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
            'btn-primary-hover': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
        },
        midnight: {
            name: '极光午夜',
            '--bg-dark': '#0B1120',
            '--bg-darker': '#020617',
            '--bg-panel': '#0F172A',
            '--accent-color': '#7DD3FC',
            '--border-color': '#1E293B',
            '--hover-bg': 'rgba(125, 211, 252, 0.12)',
            '--text-primary': '#F0F9FF',
            '--text-secondary': '#94A3B8',
            'body-bg': 'radial-gradient(ellipse at top, #1E1B4B 0%, #0B1120 40%, #020617 100%)',
            'sidebar-bg': 'linear-gradient(180deg, #0F172A 0%, #020617 100%)',
            'logo-bg': 'linear-gradient(135deg, #7DD3FC 0%, #C084FC 50%, #F0ABFC 100%)',
            'btn-primary': 'linear-gradient(135deg, #7DD3FC 0%, #C084FC 100%)',
            'btn-primary-hover': 'linear-gradient(135deg, #38BDF8 0%, #A855F7 100%)'
        }
    };

    // 应用主题
    function applyTheme(themeName) {
        const theme = themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        
        // 应用CSS变量
        Object.keys(theme).forEach(key => {
            if (key.startsWith('--')) {
                root.style.setProperty(key, theme[key]);
            }
        });

        // 应用body背景
        document.body.style.background = theme['body-bg'];

        // 应用侧边栏背景
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.background = theme['sidebar-bg'];
        }

        // 应用logo背景
        const logoArea = document.querySelector('.logo-area');
        if (logoArea) {
            logoArea.style.background = theme['logo-bg'];
        }

        // 应用主按钮样式和天气组件样式
        const style = document.getElementById('dynamic-theme-style') || document.createElement('style');
        style.id = 'dynamic-theme-style';
        style.textContent = `
            .btn-primary {
                background: ${theme['btn-primary']} !important;
            }
            .btn-primary:hover {
                background: ${theme['btn-primary-hover']} !important;
            }
            /* 主题设置按钮（侧栏底部）：强调阴影，复用主题渐变 */
            #btn-theme-settings {
                background: ${theme['btn-primary']} !important;
                box-shadow: 0 4px 14px ${hexToRgba(theme['--accent-color'], 0.35)} !important;
                transition: all 0.25s ease;
            }
            #btn-theme-settings:hover {
                background: ${theme['btn-primary-hover']} !important;
                box-shadow: 0 6px 20px ${hexToRgba(theme['--accent-color'], 0.55)} !important;
                transform: translateY(-2px);
            }
            /* 音乐播放浮动按钮：圆形 + 主题渐变 + 悬浮放大 */
            #btn-toggle-player {
                background: ${theme['btn-primary']} !important;
                box-shadow: 0 6px 20px ${hexToRgba(theme['--accent-color'], 0.45)} !important;
            }
            #btn-toggle-player:hover {
                background: ${theme['btn-primary-hover']} !important;
                box-shadow: 0 10px 28px ${hexToRgba(theme['--accent-color'], 0.65)} !important;
                transform: scale(1.08) rotate(8deg);
            }
            .meeting-item-info span:first-child {
                background: ${theme['btn-primary']} !important;
            }
            .note-item::before {
                background: ${theme['btn-primary']} !important;
            }
            #city-select {
                background: var(--bg-panel) !important;
                color: var(--text-primary) !important;
                border-color: var(--border-color) !important;
            }
            .weather-detail-item {
                background: ${(themeName === 'dark' || themeName === 'midnight') ? 'rgba(51, 65, 85, 0.5)' : 'rgba(255, 255, 255, 0.5)'} !important;
            }
            .hourly-item, .daily-item {
                background: var(--bg-darker) !important;
                border-color: var(--border-color) !important;
                color: var(--text-primary) !important;
            }
            .weather-detail-value, .weather-detail-label {
                color: var(--text-primary) !important;
            }
        `;
        if (!document.getElementById('dynamic-theme-style')) {
            document.head.appendChild(style);
        }

        // 保存到localStorage
        localStorage.setItem(THEME_STORAGE_KEY, themeName);

        // 在 body 上标记主题（供 CSS 暗色适配）
        document.body.setAttribute('data-theme', themeName);

        // 通知 3D 背景更新颜色
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: themeName } }));

        // 更新选中状态
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.remove('active');
        });
        const activeCard = document.querySelector(`.theme-card[data-theme="${themeName}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
        }

        showToast(`已切换到${theme.name}主题`, 'success');
    }

    // 初始化
    function init() {
        // 加载保存的主题
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'blue';
        applyTheme(savedTheme);

        // 绑定主题设置按钮
        const btnThemeSettings = document.getElementById('btn-theme-settings');
        if (btnThemeSettings) {
            btnThemeSettings.addEventListener('click', () => {
                document.getElementById('theme-modal').style.display = 'flex';
            });
        }

        // 绑定关闭按钮
        const btnCloseThemeModal = document.getElementById('btn-close-theme-modal');
        if (btnCloseThemeModal) {
            btnCloseThemeModal.addEventListener('click', () => {
                document.getElementById('theme-modal').style.display = 'none';
            });
        }

        // 点击弹窗外部关闭
        const themeModal = document.getElementById('theme-modal');
        if (themeModal) {
            themeModal.addEventListener('click', (e) => {
                if (e.target.id === 'theme-modal') {
                    themeModal.style.display = 'none';
                }
            });
        }

        // 绑定主题卡片点击事件
        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const themeName = card.getAttribute('data-theme');
                applyTheme(themeName);
            });
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
