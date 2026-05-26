// 页面元信息：每个工具页的图标、标题、描述
// 切换导航时自动更新顶部 hero 区
(function() {
    const META = {
        json:       { icon: 'icon-json',      title: 'JSON 格式化',     desc: '美化 / 压缩 / 字段识别 / 表单填充' },
        sql:        { icon: 'icon-database',  title: 'SQL 拼接',        desc: 'MyBatis 日志一键拼回可执行 SQL' },
        'sql-cleaner': { icon: 'icon-filter', title: 'SQL 字段清洗',     desc: '识别列 → 勾选剔除 → 重新生成 INSERT' },
        qrcode:     { icon: 'icon-qrcode',    title: '二维码 / 条形码',  desc: '生成、下载、上传图片解析' },
        codec:      { icon: 'icon-transfer',  title: '编解码工具',       desc: 'Base64 / URL / Hex / Unicode 互转' },
        timestamp:  { icon: 'icon-time',      title: '时间戳转换',       desc: '毫秒/秒 ↔ 北京时间/UTC' },
        headers:    { icon: 'icon-copy',      title: '请求头工具',       desc: 'Headers 多格式互转与提取' },
        notes:      { icon: 'icon-json',      title: '会议纪要',         desc: '本地存储的笔记 / 提纲管理' },
        weather:    { icon: 'icon-time',      title: '天气查询',         desc: '城市选择 / 24h / 7d 预报' },

        // 新增 15 个
        jwt:        { icon: 'icon-key',       title: 'JWT 解析',         desc: '拆解 Header / Payload，显示过期时间' },
        regex:      { icon: 'icon-regex',     title: '正则测试',         desc: '13 个中文预设、实时高亮匹配' },
        cron:       { icon: 'icon-clock-cog', title: 'Cron 表达式',      desc: '中文描述 + 未来 10 次触发时间' },
        json2class: { icon: 'icon-class',     title: 'JSON 转类',        desc: '生成 Java / TS / Go / Python / C#' },
        textdiff:   { icon: 'icon-diff',      title: '文本对比',         desc: '字符 / 单词 / 行 / JSON 规范化' },
        idgen:      { icon: 'icon-id',        title: 'ID / Mock 生成',   desc: 'UUID / 雪花 / NanoID / 中文测试数据' },
        configconv: { icon: 'icon-yaml',      title: '配置文件互转',     desc: 'JSON ↔ YAML ↔ Properties ↔ XML' },
        hash:       { icon: 'icon-hash',      title: '哈希计算',         desc: 'MD5 / SHA 系列 / 文件哈希' },
        ipcalc:     { icon: 'icon-network',   title: 'IP / 子网计算',    desc: 'CIDR 分析 / 范围 / 进制互转' },
        baseconv:   { icon: 'icon-binary',    title: '进制 / Unicode',   desc: '2/8/10/16 进制 + Unicode 编解码' },
        tableconv:  { icon: 'icon-table',     title: '表格互转',         desc: 'CSV / JSON / Markdown / SQL INSERT' },
        markdown:   { icon: 'icon-md',        title: 'Markdown 编辑器',  desc: '实时预览 + HTML / MD 导出' },
        caseconv:   { icon: 'icon-case',      title: '命名 / 文本工具',  desc: '13 种命名风格 + 批处理 + 统计' },
        curl:       { icon: 'icon-curl',      title: 'cURL / JSONPath',  desc: '解析为 fetch / axios / Python / Java' },
        snippets:   { icon: 'icon-snip',      title: '代码片段库',       desc: '本地存储、搜索、导入导出 JSON' },

        // Java 后端
        lombok:     { icon: 'icon-class',     title: 'Lombok 展开',      desc: '@Data/@Builder → 完整 Java 类' },
        pojo:       { icon: 'icon-transfer',  title: 'POJO 转换',        desc: 'BeanUtils / MapStruct / 手动 setter' },
        spring:     { icon: 'icon-key',       title: 'Spring 注解速查',  desc: '50+ 常用注解、含示例代码' },
        mybatis:    { icon: 'icon-database',  title: 'MyBatis 生成器',   desc: 'DDL → Entity + Mapper + Service' },
        apimock:    { icon: 'icon-magic',     title: 'API Mock 生成',    desc: '字段定义 → Mock JSON + axios 代码' },

        // Vue 前端
        vsfc:       { icon: 'icon-code',      title: 'Vue SFC 生成器',   desc: '表单配置 → 完整 .vue 单文件组件' },
        j2vf:       { icon: 'icon-table',     title: 'JSON → el-form',   desc: 'JSON 字段推断 → Element UI 表单' },
        vplayground:{ icon: 'icon-play',      title: '组件 Playground',  desc: 'Vue + Element UI 离线运行 / 实时预览' },
        vuedocs:    { icon: 'icon-md',        title: 'Vue 速查文档',      desc: 'Vue 2 / Vue 3 模板语法 + 指令 + 生命周期 + API' },
        euidocs:    { icon: 'icon-class',     title: 'ElementUI 文档',    desc: '组件用法、属性、事件、插槽与示例（Element UI 2.x）' },

        // AI 助手
        aichat:     { icon: 'icon-ai',        title: 'AI 对话助手',       desc: '本地 Ollama / 中转站 OpenAI 兼容接口 · 流式输出 · 导出 HTML' },

        // 效率
        reminder:   { icon: 'icon-clock-cog', title: '备忘录提醒',        desc: '到点弹窗提醒 · 仅本地存储 · 支持稍后再说 / 已知道了' },
    };

    function applyMeta(targetId) {
        const meta = META[targetId];
        const hero = document.getElementById('page-hero');
        if (!hero || !meta) return;

        hero.innerHTML = `
            <div class="hero-icon">
                <svg viewBox="0 0 24 24"><use xlink:href="#${meta.icon}"></use></svg>
            </div>
            <div class="hero-text">
                <div class="hero-title">${meta.title}</div>
                <div class="hero-desc">${meta.desc}</div>
            </div>
        `;
        hero.setAttribute('data-page', targetId);
    }

    function bind() {
        // 初始化：找到 active 的 nav-item
        const active = document.querySelector('.nav-item.active');
        if (active) applyMeta(active.getAttribute('data-target'));

        // 监听所有 nav-item 点击
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                applyMeta(item.getAttribute('data-target'));
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }

    // 暴露给外部
    window.PAGE_META = META;
    window.refreshPageHero = applyMeta;
})();
