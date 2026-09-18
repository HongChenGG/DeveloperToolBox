// AI 对话助手
// 支持：Ollama / OpenAI 兼容中转站 · 流式输出 · 会话管理 · HTML 导出
// 所有数据存 localStorage，纯前端 fetch，不依赖任何后端
(function() {
    'use strict';

    // ---------------- 常量 ----------------
    const LS_CFG  = 'ai_chat_config';      // 配置
    const LS_SES  = 'ai_chat_sessions';    // 会话列表
    const LS_CUR  = 'ai_chat_current';     // 当前会话 id

    // 预设模板
    const PRESETS = {
        ollama:   { baseUrl: 'http://localhost:11434/v1', apiKey: '',           model: 'qwen2.5:7b' },
        deepseek: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '',         model: 'deepseek-chat' },
        oneapi:   { baseUrl: 'https://your-oneapi.com/v1',  apiKey: '',         model: 'gpt-4o-mini' },
        custom:   { baseUrl: '', apiKey: '', model: '' }
    };

    // 默认系统提示词：告诉模型"我是谁、在哪个环境、回答风格"
    // 避免用户没填 system 时，模型回答"我是 ChatGPT/Qwen/..."的尴尬
    const DEFAULT_SYSTEM = '你是「红尘百宝箱」内置的 AI 编程助手，运行在用户的浏览器里，专注帮助开发者解决编码、调试、架构和工具使用问题。\n\n回答风格：\n- 简洁、准确、贴合实战，能直接抄走的代码优先\n- 代码一律用 Markdown 围栏代码块并标注语言（如 ```js / ```python / ```bash）\n- 不确定的事情明确说"不确定"，不要硬编\n- 默认中文回答，除非用户用英文\n- 复杂问题先给结论，再展开\n\n如果用户问你是谁、用的什么模型，可以照实说明你是基于他在设置里配置的模型（Ollama / 中转站等）运行的对话助手。';

    // 系统提示词模板库：用户可以一键切换不同的"人设"
    const SYSTEM_TEMPLATES = [
        { id: 'default',     icon: '🤖', name: '通用助手',          desc: '默认编程助手，回答简洁实战',
          content: DEFAULT_SYSTEM },
        { id: 'java_vue',    icon: '☕', name: 'Java + Vue2 全栈',  desc: '后端 Java 8 + Spring Boot 2，前端 Vue2 + ElementUI',
          content: '你是一位资深 Java + Vue2 全栈工程师，专精：\n- 后端：Java 8 / Spring Boot 2.x / MyBatis(-Plus) / MySQL / Redis（默认 JDK 8 语法，禁用 Java 9+ 的 var、record、sealed、switch 表达式等新特性）\n- 前端：Vue 2.7 / Element UI 2.15 / Axios / Vuex / Vue Router 3\n\n回答风格：\n- 先讲方案选择和取舍，再给可直接使用的代码\n- Java 严格按 JDK 8 写：用 Optional/Stream 但不用 var；新建集合用 new ArrayList<>() 而非 List.of()；时间 API 用 java.time（JDK 8 已支持），不用第三方\n- Lombok 注解可用；写明文件路径与类名（如 src/main/java/com/example/UserService.java）\n- Vue 用 Options API（除非用户明确要 Composition），<template>/<script>/<style scoped> 三段式\n- 注释一律中文，命名遵循驼峰/帕斯卡惯例\n- 涉及数据库给完整 DDL；涉及接口给请求/响应示例\n- 不堆砌"最佳实践"空话，只给当下能用的方案' },
        { id: 'doc_writer',  icon: '📝', name: '技术文档撰写',      desc: '产出结构化中文技术文档',
          content: '你是一位资深技术文档作者，擅长把复杂概念写得清晰可读。\n\n输出风格：\n- 结论先行：第一段直接给"是什么 + 为什么用 + 一句话总结"\n- 章节结构：概述 → 适用场景 → 核心概念 → 操作步骤（带编号） → 代码示例 → 常见问题 → 参考链接\n- 用 Markdown：### 标题、有序列表、表格对比、代码块（标注语言）\n- 避免"很简单"、"显然"、"众所周知"等模糊词\n- 每个概念给一个具体例子，不要纯理论' },
        { id: 'writer_zh',   icon: '✍️', name: '中文写作助手',      desc: '公文、文案、博客、随笔多文风',
          content: '你是一位中文写作助手，擅长在公文、新媒体文案、博客随笔、产品介绍等不同文风之间切换。\n\n输出原则：\n- 先确认文体定位（用户没说就询问一次）\n- 结构清晰：开头点题 → 中段展开 → 结尾收束\n- 语言通顺、用词准确，拒绝官话套话和陈词滥调\n- 主动给替换词建议或不同语气版本\n- 写完后可附"修改思路"说明为什么这么改' },
        { id: 'tutor',       icon: '🧠', name: '解题答疑导师',      desc: '数学、物理、算法题循序解析',
          content: '你是一位耐心的解题导师，擅长数学、物理、算法和逻辑题。\n\n解题流程：\n1. 复述题意（确认理解正确）\n2. 拆解关键信息和未知量\n3. 列出解题思路（多种方法时给出对比）\n4. 分步骤推导，每步标号且说明"为什么这一步"\n5. 给出最终答案\n6. 回顾：易错点、变式题、复杂度分析（算法题）\n\n算法题代码用 Markdown 围栏，标注语言；数学公式用普通文本（不用 LaTeX 命令，浏览器渲染不了）。' },
        { id: 'sql_pro',     icon: '🗄️', name: 'SQL 数据库专家',    desc: 'MySQL/PG/Oracle 多方言 + 性能优化',
          content: '你是 SQL 与数据库设计专家，精通 MySQL / PostgreSQL / Oracle / SQL Server 方言差异。\n\n回答风格：\n- 先确认数据库类型和版本（用户没说就问一次或合理假设并标注）\n- 必要时让用户提供 SHOW CREATE TABLE 或 DDL\n- 给 SQL 后说明：执行顺序、用到的索引、可能的全表扫描和锁\n- 性能问题给优化方案（加索引/重写子查询/分页改 keyset 等）和原因\n- 复杂查询拆 CTE / 临时表，方便阅读\n- 拒绝写一句话长 SQL 不带格式，全部用大写关键字 + 缩进对齐' }
    ];

    // 内置默认搜索代理（用户留空时静默走这个，不在 UI 暴露）
    const DEFAULT_SEARCH_PROXY = 'https://toolbox-search-proxy.744882174.workers.dev/search?q={q}&token=mtb_kx9P3aQ7vL2nR8sZ';

    // 默认模型配置（一个 profile = 一组 baseUrl/apiKey/model/参数）
    function makeDefaultProfile(id, name) {
        return {
            id: id || ('p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
            name: name || '默认',
            baseUrl: '',
            apiKey: '',
            model: '',
            temperature: 0.7,
            topP: 1,
            maxTokens: 32768,
            contextLen: 50,
            frequencyPenalty: 0,
            presencePenalty: 0,
            stream: true,
            // 思考深度控制（OpenAI 兼容的 reasoning_effort）
            // 留空 = 不发送该字段；Qwen3.8 默认 xhigh 会过度思考，建议 medium/low
            reasoningEffort: 'medium',
            // 思考块初始状态：false = 默认折叠，true = 默认展开
            thinkDefaultOpen: false,
            // 联网搜索（基于 OpenAI function calling，要求模型支持 tools）
            webEnabled: false,
            searchUrlTemplate: ''   // 留空 → 自动使用 DEFAULT_SEARCH_PROXY
        };
    }

    // 默认配置：模型列表 + 全局项（system / 压缩 / 技能）
    const DEFAULT_CFG = {
        profiles: [makeDefaultProfile('p_default', '默认')],
        currentProfileId: 'p_default',
        system: DEFAULT_SYSTEM,
        systemTemplate: 'default',  // 当前选中的模板 id
        compressEnabled: false,
        compressThreshold: 20,
        compressKeepLast: 6,
        skills: []                  // [{id, name, content, enabled, source, createdAt}]
    };

    // ---------------- 状态 ----------------
    let cfg = loadCfg();
    let sessions = loadSessions();
    let currentId = localStorage.getItem(LS_CUR) || null;
    let abortCtrl = null;     // 当前流的 AbortController
    let isStreaming = false;
    let userNearBottom = true; // 智能滚动：用户是否在底部附近
    let _editingProfileId = null;  // 设置弹窗当前正在编辑哪个模型
    let pendingImages = [];        // 待发送的图片（data URL 数组）
    let _editingMsgIdx = null;     // 正在编辑哪条用户消息（null = 普通发送）

    // ---------------- 持久化 ----------------
    function loadCfg() {
        try {
            const raw = localStorage.getItem(LS_CFG);
            const old = raw ? JSON.parse(raw) : {};
            // 旧版本迁移：扁平字段 → profiles[0]
            if (!Array.isArray(old.profiles)) {
                const p = makeDefaultProfile('p_default', '默认');
                if (old.baseUrl !== undefined) p.baseUrl = old.baseUrl;
                if (old.apiKey  !== undefined) p.apiKey  = old.apiKey;
                if (old.model   !== undefined) p.model   = old.model;
                ['temperature','topP','maxTokens','contextLen','frequencyPenalty','presencePenalty','stream'].forEach(k => {
                    if (old[k] !== undefined) p[k] = old[k];
                });
                const merged = { ...DEFAULT_CFG, ...old, profiles: [p], currentProfileId: p.id };
                // 删除扁平字段，避免后续混淆
                delete merged.baseUrl; delete merged.apiKey; delete merged.model;
                delete merged.temperature; delete merged.topP; delete merged.maxTokens;
                delete merged.contextLen; delete merged.frequencyPenalty; delete merged.presencePenalty;
                delete merged.stream;
                return merged;
            }
            const merged = { ...DEFAULT_CFG, ...old };
            // 防御：profiles 为空时补一个默认模型
            if (!merged.profiles || merged.profiles.length === 0) {
                merged.profiles = [makeDefaultProfile('p_default', '默认')];
                merged.currentProfileId = merged.profiles[0].id;
            }
            // 防御：currentProfileId 失效时回退
            if (!merged.profiles.find(p => p.id === merged.currentProfileId)) {
                merged.currentProfileId = merged.profiles[0].id;
            }
            // 迁移：把历史版本写死的"百度模板"还原为空字符串，让内置代理接管
            // 用户主动配置的其他 URL 保留不动
            const LEGACY_DEFAULTS = ['https://www.baidu.com/s?wd={q}'];
            // 给每个 profile 补齐新版本新增的字段（旧数据没有这些键，
            // 否则 reasoningEffort 等会缺省成 undefined 而走服务端默认）
            merged.profiles = merged.profiles.map(p => ({ ...makeDefaultProfile(p.id, p.name), ...p }));
            merged.profiles.forEach(p => {
                if (LEGACY_DEFAULTS.includes(p.searchUrlTemplate)) p.searchUrlTemplate = '';
            });
            if (!Array.isArray(merged.skills)) merged.skills = [];
            return merged;
        } catch { return JSON.parse(JSON.stringify(DEFAULT_CFG)); }
    }
    function saveCfg() {
        try {
            localStorage.setItem(LS_CFG, JSON.stringify(cfg));
        } catch (e) {
            console.warn('[ai-chat] saveCfg 失败:', e.message);
            if (typeof showToast === 'function') {
                showToast('保存配置失败:' + (e.name === 'QuotaExceededError' ? 'localStorage 已满,请清理旧会话' : e.message), 'error');
            }
        }
    }

    // 返回当前激活模型（用于发送 / 状态显示）
    function getProfile() {
        return cfg.profiles.find(p => p.id === cfg.currentProfileId) || cfg.profiles[0];
    }
    // 返回当前正在设置弹窗中编辑的模型
    function getEditingProfile() {
        return cfg.profiles.find(p => p.id === _editingProfileId) || getProfile();
    }

    function loadSessions() {
        try {
            const raw = localStorage.getItem(LS_SES);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }
    function isQuotaError(e) {
        return !!(e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22));
    }

    function saveSessions() {
        try {
            localStorage.setItem(LS_SES, JSON.stringify(sessions));
            return;
        } catch (e) {
            if (!isQuotaError(e)) {
                console.warn('[ai-chat] saveSessions 失败:', e.message);
                if (typeof showToast === 'function') showToast('保存会话失败:' + e.message, 'error');
                return;
            }
        }
        // 存储满：从最老的消息开始剥离图片（保留文字）后重试，避免整条会话存不进去
        for (let round = 0; round < 40; round++) {
            if (stripOldestImages(3) === 0) break;
            try {
                localStorage.setItem(LS_SES, JSON.stringify(sessions));
                if (typeof showToast === 'function') {
                    showToast('localStorage 已满，已自动清理较早的图片（文字保留）', 'warning');
                }
                return;
            } catch (e2) {
                if (!isQuotaError(e2)) break;
            }
        }
        if (typeof showToast === 'function') {
            showToast('保存会话失败：localStorage 已满，请删除旧会话', 'error');
        }
    }

    // 从最老的消息开始剥离图片，返回实际剥离数量
    function stripOldestImages(max) {
        let n = 0;
        // sessions 用 unshift 存新会话，所以尾部是最旧的
        for (let i = sessions.length - 1; i >= 0 && n < max; i--) {
            const s = sessions[i];
            if (!s.messages) continue;
            for (let j = 0; j < s.messages.length && n < max; j++) {
                const m = s.messages[j];
                if (m.images && m.images.length) { delete m.images; n++; }
            }
        }
        return n;
    }

    function getCurrent() {
        return sessions.find(s => s.id === currentId);
    }

    function createSession() {
        const s = {
            id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            title: '新对话',
            titleAuto: true,          // 标题还是自动生成的（未被 AI 改写/用户手动改）
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };
        sessions.unshift(s);
        currentId = s.id;
        localStorage.setItem(LS_CUR, currentId);
        saveSessions();
        return s;
    }

    function deleteSession(id) {
        sessions = sessions.filter(s => s.id !== id);
        if (currentId === id) {
            currentId = sessions[0]?.id || null;
            if (currentId) localStorage.setItem(LS_CUR, currentId);
            else localStorage.removeItem(LS_CUR);
        }
        saveSessions();
    }

    // ---------------- 会话标题 ----------------
    // 首轮对话结束后，用 AI 把对话内容概括成短标题（替代原来的"截前 24 个字"）
    // 失败不重试太多次，失败时保留临时标题
    async function generateSessionTitle(s, p) {
        if (!s || !s.titleAuto) return;
        if (!p.baseUrl || !p.model) return;
        s.titleTries = (s.titleTries || 0) + 1;
        if (s.titleTries > 3) { s.titleAuto = false; return; }   // 最多试 3 次，避免反复失败刷请求

        const firstUser = s.messages.find(m => m.role === 'user');
        const firstAsst = s.messages.find(m => m.role === 'assistant' && m.content);
        if (!firstUser) return;
        const snippet = [
            `用户：${(firstUser.content || '').slice(0, 400)}`,
            firstAsst ? `助手：${firstAsst.content.slice(0, 400)}` : ''
        ].filter(Boolean).join('\n');
        if (!snippet.trim()) return;

        const hasCjk = /[一-龥]/.test(snippet);
        const prompt = hasCjk
            ? `请为下面这段对话起一个简洁的标题，不超过 12 个字。只输出标题本身，不要引号、不要句号、不要解释。\n\n${snippet}`
            : `Give this conversation a short title, max 6 words. Output only the title, no quotes, no trailing punctuation.\n\n${snippet}`;

        try {
            const url = p.baseUrl.replace(/\/$/, '') + '/chat/completions';
            const headers = { 'Content-Type': 'application/json' };
            if (p.apiKey) headers['Authorization'] = 'Bearer ' + p.apiKey;
            // 标题任务不需要思考；服务端不认 reasoning_effort 时回退重试
            const mkBody = withEffort => JSON.stringify({
                model: p.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 64,
                stream: false,
                ...(withEffort ? { reasoning_effort: 'none' } : {})
            });
            let resp = await fetch(url, { method: 'POST', headers, body: mkBody(true) });
            if (resp.status === 400) resp = await fetch(url, { method: 'POST', headers, body: mkBody(false) });
            if (!resp.ok) return;
            const data = await resp.json();
            let title = (data?.choices?.[0]?.message?.content || '').trim();
            // 清理：去引号/书名号/换行/markdown 标记，限长
            title = title
                .replace(/^[\s"'“”‘’「」『』【】《》*#]+/, '')
                .replace(/[\s"'“”‘’「」『』【】《》*#]+$/, '')
                .replace(/[\r\n]+/g, ' ')
                .slice(0, 30)
                .trim();
            if (!title) return;
            if (!s.titleAuto) return;      // 期间已被改写（用户手动改名）就放弃
            s.title = title;
            s.titleAuto = false;           // 只自动生成一次
            s.updatedAt = Date.now();
            saveSessions();
            renderSessions();
        } catch (e) {
            console.warn('[ai-chat] 生成标题失败:', e.message);
        }
    }

    // ---------------- 历史压缩 ----------------
    // 达到阈值时，把"已压缩位置~倒数 keepLast 之间"的历史发给同一个 AI 总结
    // 展示层完全不动；后续请求时把"摘要 + 最近 keepLast 条"代替原始历史发送
    // 设计要点：
    //  - s._compressing 互斥：避免连续发送时并发触发多次压缩 → 浪费 token + 后写覆盖前写
    //  - 失败可见：toast 弹错而不是只 console.warn
    //  - 语言自适应：根据被压片段是否含 CJK 决定中/英文摘要器 prompt
    //  - 完成不全量重渲：直接在 $msgs 最前面 prepend 一条 mark，避免重置 <details> 折叠状态
    async function compressOldMessages(s) {
        if (!cfg.compressEnabled) return;
        const p = getProfile();
        if (!p.baseUrl || !p.model) return;
        if (s._compressing) return;                     // A: 并发互斥

        const startIdx = s.compressed?.upToIndex || 0;
        const newCount = s.messages.length - startIdx;
        if (newCount < cfg.compressThreshold) return;

        const endIdx = Math.max(startIdx, s.messages.length - cfg.compressKeepLast);
        const slice = s.messages.slice(startIdx, endIdx);
        if (slice.length === 0) return;

        s._compressing = true;
        try {
            const transcript = slice.map((m, i) => {
                const imgs = (m.images && m.images.length) ? ` [${m.images.length}张图片]` : '';
                return `[${i+1}][${m.role}] ${m.content || ''}${imgs}`;
            }).join('\n\n');
            // C: 语言自适应——片段含 CJK 用中文 prompt，否则用英文
            const hasCjk = /[一-龥　-〿＀-￯]/.test(transcript);
            const prevSummary = s.compressed?.summary
                ? (hasCjk ? `已有摘要：\n${s.compressed.summary}\n\n继续追加新内容。\n\n` : `Existing summary:\n${s.compressed.summary}\n\nAppend new content below.\n\n`)
                : '';
            const compressPrompt = hasCjk
                ? `${prevSummary}请把下面这段对话压缩成简洁的"上下文摘要"，保留：用户身份/偏好、已确认的事实、未完结的任务、关键决定。\n用第三人称客观叙述，每点一行，不要寒暄不要总结性套话。\n\n=== 对话原文 ===\n${transcript}`
                : `${prevSummary}Compress the following conversation into a concise "context summary". Keep: user identity/preferences, established facts, pending tasks, key decisions. Use third-person objective tone, one bullet per line, no pleasantries.\n\n=== Transcript ===\n${transcript}`;
            const sysPrompt = hasCjk
                ? '你是对话摘要器，专门压缩聊天上下文。'
                : 'You are a conversation summarizer that compresses chat history.';

            const url = p.baseUrl.replace(/\/$/, '') + '/chat/completions';
            const headers = { 'Content-Type': 'application/json' };
            if (p.apiKey) headers['Authorization'] = 'Bearer ' + p.apiKey;
            // 摘要任务不需要思考：显式关掉，避免思考 token 吃掉 max_tokens 导致摘要为空
            // （部分服务端不认 reasoning_effort，返回 400 时自动回退重试）
            const mkBody = withEffort => JSON.stringify({
                model: p.model,
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user',   content: compressPrompt }
                ],
                temperature: 0.3,
                max_tokens: 800,
                stream: false,
                ...(withEffort ? { reasoning_effort: 'none' } : {})
            });
            let resp = await fetch(url, { method: 'POST', headers, body: mkBody(true) });
            if (resp.status === 400) resp = await fetch(url, { method: 'POST', headers, body: mkBody(false) });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            const summary = data?.choices?.[0]?.message?.content?.trim();
            if (!summary) throw new Error('摘要为空');
            s.compressed = { summary, upToIndex: endIdx, at: Date.now() };
            saveSessions();
            insertCompressMark(s);                     // D: 不重渲整体，只插入分隔条
            if (typeof showToast === 'function') showToast(`已压缩前 ${endIdx} 条历史为摘要`, 'success');
        } catch (e) {
            // B: 失败给用户提示，避免下次因上下文超限再次报错时一头雾水
            console.warn('[ai-chat] 压缩失败:', e.message);
            if (typeof showToast === 'function') showToast('历史压缩失败：' + e.message, 'warning');
        } finally {
            s._compressing = false;
        }
    }

    // 在不重置 DOM 状态的前提下插入"已压缩"分隔条
    function insertCompressMark(s) {
        if (!$msgs) return;
        if (s !== getCurrent()) return;                 // 切了会话就不画
        const upTo = s.compressed?.upToIndex;
        if (!upTo || upTo <= 0) return;
        // 已有 mark 就先撤掉旧的（位置可能变）
        const old = $msgs.querySelector('.ai-compress-mark');
        if (old) old.remove();
        // 用 data-msg-idx 定位（不能直接用 children 下标：压缩分隔条本身也占一个子节点）
        const anchor = $msgs.querySelector(`[data-msg-idx="${upTo}"]`);
        const mark = document.createElement('div');
        mark.className = 'ai-compress-mark';
        const tip = String(s.compressed.summary).slice(0, 200).replace(/"/g, '&quot;');
        mark.setAttribute('title', tip);
        mark.textContent = `— 以上 ${upTo} 条已压缩为摘要（仅影响发给 AI 的上下文，展示不变）—`;
        if (anchor) $msgs.insertBefore(mark, anchor);
        else $msgs.appendChild(mark);
    }

    // ---------------- DOM 引用 ----------------
    let $msgs, $sessList, $input, $btnSend, $btnStop, $modelTip, $connStatus, $tokTip;

    // ---------------- 渲染 ----------------
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    // ---------------- 图片（多模态）支持 ----------------
    const MAX_IMAGES    = 8;                    // 单条消息最多图片数
    const IMG_MAX_EDGE  = 1280;                 // 压缩后最长边（px）
    const IMG_QUALITY   = 0.85;                 // JPEG 质量
    const IMG_MAX_BYTES = 20 * 1024 * 1024;     // 单张原图大小上限 20MB（防内存爆）
    const MAX_IMG_MSGS  = 2;                    // 请求时最多给最近 N 条带图消息保留图片

    // 把图片压缩成 data URL：等比缩放到 IMG_MAX_EDGE，转 JPEG，减小 localStorage 占用
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type || !file.type.startsWith('image/')) {
                reject(new Error('不是图片文件')); return;
            }
            if (file.size > IMG_MAX_BYTES) {
                reject(new Error(`图片过大（${(file.size / 1048576).toFixed(1)}MB，上限 20MB）`)); return;
            }
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('读取文件失败'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('图片解码失败'));
                img.onload = () => {
                    try {
                        let w = img.naturalWidth || img.width;
                        let h = img.naturalHeight || img.height;
                        const scale = Math.min(1, IMG_MAX_EDGE / Math.max(w, h));
                        w = Math.max(1, Math.round(w * scale));
                        h = Math.max(1, Math.round(h * scale));
                        const canvas = document.createElement('canvas');
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#fff';           // JPEG 不支持透明，铺白底
                        ctx.fillRect(0, 0, w, h);
                        ctx.drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', IMG_QUALITY));
                    } catch (e) { reject(e); }
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function addPendingImage(dataUrl) {
        if (pendingImages.length >= MAX_IMAGES) {
            showToast(`最多 ${MAX_IMAGES} 张图片`, 'warning');
            return;
        }
        pendingImages.push(dataUrl);
        renderPendingImages();
    }

    function removePendingImage(idx) {
        if (idx < 0 || idx >= pendingImages.length) return;
        pendingImages.splice(idx, 1);
        renderPendingImages();
    }

    function renderPendingImages() {
        const box = document.getElementById('ai-image-preview');
        if (!box) return;
        if (!pendingImages.length) {
            box.style.display = 'none';
            box.innerHTML = '';
            return;
        }
        box.style.display = 'flex';
        box.innerHTML = pendingImages.map((src, i) =>
            `<div style="position:relative">
                <img src="${src}" title="点击 × 移除" style="height:56px;width:56px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color)">
                <button data-img-del="${i}" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:none;background:#e53e3e;color:#fff;font-size:12px;line-height:16px;cursor:pointer;padding:0">×</button>
             </div>`
        ).join('');
    }

    // 本地消息 → OpenAI 请求格式；带图片时用多模态数组
    function toApiMessage(m) {
        if (m.images && m.images.length) {
            const parts = [];
            if (m.content) parts.push({ type: 'text', text: m.content });
            for (const url of m.images) parts.push({ type: 'image_url', image_url: { url } });
            return { role: m.role, content: parts };
        }
        return { role: m.role, content: m.content };
    }

    // 只给最近 MAX_IMG_MSGS 条带图消息保留图片，更早的图片剥离成纯文本。
    // 原因：历史图片每次请求都会重新编码成 vision token（每张 ~1k+），
    //       多轮带图对话会瞬间吃光上下文并拖慢推理。
    function withImageBudget(list) {
        let budget = MAX_IMG_MSGS;
        const out = new Array(list.length);
        for (let i = list.length - 1; i >= 0; i--) {
            const m = list[i];
            if (m.images && m.images.length) {
                if (budget > 0) { budget--; out[i] = toApiMessage(m); }
                else out[i] = { role: m.role, content: (m.content || '') + '（此消息附带的图片已省略）' };
            } else {
                out[i] = toApiMessage(m);
            }
        }
        return out;
    }

    // 页面内图片查看器（data URL 不能直接顶层导航，会被浏览器拦截）
    function openImageViewer(src) {
        if (!src) return;
        const mask = document.createElement('div');
        mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out';
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 10px 50px rgba(0,0,0,.6)';
        mask.appendChild(img);
        const onKey = ev => { if (ev.key === 'Escape') close(); };
        const close = () => { mask.remove(); document.removeEventListener('keydown', onKey); };
        mask.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(mask);
    }

    // marked 全局配置：GFM + 换行符识别（中文场景更顺手）
    // 注意:marked v5+ 已废弃 highlight 选项,代码块语法高亮放在 enhanceCodeBlocks 里
    // 用 hljs 直接处理 marked 输出的 HTML,流式期间 _skipHighlight=true 跳过高亮
    let _skipHighlight = false;
    if (typeof marked !== 'undefined' && marked.setOptions) {
        marked.setOptions({ gfm: true, breaks: true, pedantic: false });
    }

    // 中文与 ** / * 紧邻时 CommonMark 不认作加粗（CJK 不算单词边界）
    // 思路：先在中文和 */** 之间补空格，再对所有 **xxx**/*xxx* 把首尾空白 trim 掉
    // 例：中文**加粗**中文 → 中文 **加粗** 中文
    //     ** 标题**         → **标题**
    // F: 代码块（``` 围栏 / 行内 `code`）整体保护，避免预处理破坏代码示例
    function fixCjkMarkdown(text) {
        if (!text) return text;
        const stash = [];
        const PH = ' CB '; // 占位符前缀，正文不可能出现
        // 1) 先抽走代码块：``` fenced 优先，再抽行内 `code`
        let t = text.replace(/```[\s\S]*?```/g, m => {
            const i = stash.push(m) - 1;
            return PH + i + PH;
        });
        t = t.replace(/`[^`\n]+`/g, m => {
            const i = stash.push(m) - 1;
            return PH + i + PH;
        });
        // 2) CJK ↔ */** 加空格
        t = t.replace(/([一-龥　-〿＀-￯])(\*\*?)/g, '$1 $2');
        t = t.replace(/(\*\*?)([一-龥　-〿＀-￯])/g, '$1 $2');
        // 3) **xxx**：trim 首尾空白，保留中间空格（CommonMark 要求闭合定界符前不能有空白）
        t = t.replace(/\*\*([^*\n]+?)\*\*/g, (m, inner) => '**' + inner.trim() + '**');
        // 4) *xxx*：同上，前面不能紧邻 *（避开 **）
        t = t.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, (m, p, inner) => p + '*' + inner.trim() + '*');
        // 5) 回填代码块
        t = t.replace(new RegExp(PH + '(\\d+)' + PH, 'g'), (m, i) => stash[+i]);
        return t;
    }

    // Markdown 渲染（用项目已有的 marked.js）
    // 额外处理：<think> 推理块折叠、代码块加 OpenAI 风格头部、CJK 加粗修复
    const THINK_SEP = ' THINK ';
    // ---------------- 数学公式（KaTeX，本地离线） ----------------
    const MATH_SEP = '\u0000MATH\u0000';

    function renderMathHtml(tex, display) {
        if (typeof katex === 'undefined') {
            return escapeHtml(display ? '$$' + tex + '$$' : '$' + tex + '$');
        }
        try {
            return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });
        } catch (e) {
            return escapeHtml(display ? '$$' + tex + '$$' : '$' + tex + '$');
        }
    }

    // 抽取数学公式：$$ 块级 / $ 行内。先保护代码块，避免代码里的 $ 被误判
    function extractMath(text) {
        const blocks = [];
        const stash = [];
        let t = text.replace(/```[\s\S]*?```|`[^`\n]+`/g, m => {
            const i = stash.push(m) - 1;
            return '\u0000CODE' + i + '\u0000';
        });
        // 块级公式 $$...$$
        t = t.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => {
            blocks.push({ tex: tex.trim(), display: true });
            return '\n\n' + MATH_SEP + (blocks.length - 1) + MATH_SEP + '\n\n';
        });
        // 行内公式 $...$：$ 后非空白、前非空白，且不与 $$ 冲突
        t = t.replace(/(^|[^\\$])\$([^\s$][^$\n]{0,200}?[^\s$])\$(?!\$)/g, (m, pre, tex) => {
            // 含中文的多半不是公式（避免 “$100 和 $200” 这种误判）
            if (/[\u4e00-\u9fa5]/.test(tex)) return m;
            // 纯数字（如 $100$）不当公式
            if (/^\d+(\.\d+)?$/.test(tex)) return m;
            blocks.push({ tex: tex, display: false });
            return pre + MATH_SEP + (blocks.length - 1) + MATH_SEP;
        });
        // 回填代码块
        t = t.replace(/\u0000CODE(\d+)\u0000/g, (m, i) => stash[+i]);
        return { text: t, blocks };
    }

    function restoreMath(html, blocks) {
        if (!blocks.length) return html;
        // 先剥掉包裹块级公式的 <p>，再一次性回填
        // （旧版对每个公式做两次 split/join，公式多时是 O(n*m)）
        const wrapped = new RegExp('<p>\\s*' + MATH_SEP + '(\\d+)' + MATH_SEP + '\\s*</p>', 'g');
        html = html.replace(wrapped, (m, i) => MATH_SEP + i + MATH_SEP);
        const anyTag = new RegExp(MATH_SEP + '(\\d+)' + MATH_SEP, 'g');
        return html.replace(anyTag, (m, i) => {
            const b = blocks[+i];
            return b ? renderMathHtml(b.tex, b.display) : m;
        });
    }

    function renderMd(text) {
        if (typeof marked === 'undefined') return escapeHtml(text);
        // 保存原始文本：下面会把公式/思考块换成占位符，
        // 一旦渲染抛异常，catch 里必须用原始文本，否则占位符会泄漏到界面
        const original = text;
        try {
            const parse = t => (typeof marked.parse === 'function' ? marked.parse(t) : marked(t));

            // 0) 预处理：中文 + ** 边界修复（CommonMark 不认 CJK 为单词边界）
            text = fixCjkMarkdown(text);

            // 0.5) 抽取数学公式（必须在 marked 之前，否则 _ ^ * 会被当 markdown 语法）
            const mathTop = extractMath(text);
            text = mathTop.text;

            // 1) 抽取  thinking / <thinking> 等推理块（含流式未闭合的情况），用占位符替换
            const thinkBlocks = [];
            const pushThink = (inner, open) => {
                const sub = extractMath((inner || '').trim());
                const html = restoreMath(parse(sub.text), sub.blocks);
                thinkBlocks.push(open
                    ? `<details class="ai-think-block" open><summary>💭 思考中<span class="ai-thinking ai-thinking-inline"><span></span><span></span><span></span></span></summary><div class="ai-think-inner">${html}</div></details>`
                    : `<details class="ai-think-block"><summary>💭 思考过程</summary><div class="ai-think-inner">${html}</div></details>`);
                return `\n\n${THINK_SEP}${thinkBlocks.length - 1}${THINK_SEP}\n\n`;
            };
            let processed = text.replace(/<(think|thinking)>([\s\S]*?)<\/\1>/gi, (m, tag, inner) => pushThink(inner, false));
            // 流式未闭合：找最后一个没有对应闭合标签的开标签
            const openRe = /<(think|thinking)>/gi;
            let mo, lastOpen = null;
            while ((mo = openRe.exec(processed)) !== null) {
                if (processed.toLowerCase().indexOf(`</${mo[1].toLowerCase()}>`, mo.index) === -1) lastOpen = mo;
            }
            if (lastOpen) {
                const before = processed.slice(0, lastOpen.index);
                const inner = processed.slice(lastOpen.index + lastOpen[0].length);
                processed = before + pushThink(inner, true);
            }

            // 2) marked 渲染主体
            let html = parse(processed);

            // 3) 回填思考块（marked 可能把占位符包进 <p>）
            thinkBlocks.forEach((block, i) => {
                const tag = `${THINK_SEP}${i}${THINK_SEP}`;
                const inP = `<p>${tag}</p>`;
                html = html.split(inP).join(block).split(tag).join(block);
            });

            // 4) 回填数学公式
            html = restoreMath(html, mathTop.blocks);

            // 5) 增强代码块（加 header + 语言标签 + 复制按钮）
            return enhanceCodeBlocks(html);
        } catch {
            return escapeHtml(original);
        }
    }

    // 把 marked 输出的 <pre><code class="language-X">...</code></pre>
    // 包装成 OpenAI 风格：上方深色头部（语言名 + 复制按钮），下方代码
    // 同时直接调用 hljs 给代码内容上色(marked v11 已废弃 highlight 选项,
    // 必须在 marked 渲染后用 hljs 处理),给 <code> 加 'hljs' class 让主题 CSS 生效
    function enhanceCodeBlocks(html) {
        return html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (m, attrs, code) => {
            const langMatch = attrs.match(/language-([\w+\-#.]+)/i);
            const language = langMatch ? langMatch[1] : 'text';

            // marked 已把代码 escape 成 HTML 实体,hljs 要原文,先反转义
            let rawCode = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&');

            // 流式中 _skipHighlight=true 时不上色(纯文本输出更快),force 渲染时上色
            let highlighted;
            if (_skipHighlight || typeof hljs === 'undefined') {
                highlighted = code;  // 用 marked 已 escape 的原版,安全
            } else {
                try {
                    if (langMatch && hljs.getLanguage(language)) {
                        highlighted = hljs.highlight(rawCode, { language, ignoreIllegals: true }).value;
                    } else {
                        highlighted = hljs.highlightAuto(rawCode).value;
                    }
                } catch (e) {
                    highlighted = code;  // 出错保底用 marked 原版
                }
            }

            // 确保 class 里有 hljs(主题选择器靠这个)
            let newAttrs = attrs;
            if (/class="[^"]*"/.test(newAttrs)) {
                if (!/\bhljs\b/.test(newAttrs)) {
                    newAttrs = newAttrs.replace(/class="([^"]*)"/, 'class="$1 hljs"');
                }
            } else {
                newAttrs = (newAttrs ? newAttrs + ' ' : ' ') + 'class="hljs"';
            }
            return `<div class="ai-code-block">`
                + `<div class="ai-code-header">`
                +   `<span class="ai-code-lang">${escapeHtml(language)}</span>`
                +   `<button class="ai-code-copy-btn" type="button" aria-label="复制代码">`
                +     `<svg viewBox="0 0 24 24" width="12" height="12" style="vertical-align:-2px;margin-right:4px"><use xlink:href="#icon-copy"></use></svg>复制`
                +   `</button>`
                + `</div>`
                + `<pre><code${newAttrs}>${highlighted}</code></pre>`
                + `</div>`;
        });
    }

    function renderSessions() {
        if (!$sessList) return;
        if (sessions.length === 0) {
            $sessList.innerHTML = '<div style="color:var(--text-secondary);font-size:12px;text-align:center;padding:20px 10px">还没有对话，点上方"新建会话"开始</div>';
            return;
        }
        $sessList.innerHTML = sessions.map(s => {
            const active = s.id === currentId;
            const time = new Date(s.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            return `
                <div class="ai-session-item ${active ? 'active' : ''}" data-id="${s.id}" style="padding:10px;border-radius:6px;cursor:pointer;background:${active ? 'var(--hover-bg)' : 'transparent'};border:1px solid ${active ? 'var(--accent-color)' : 'transparent'}">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                        <div class="ai-session-title" style="flex:1;font-size:13px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</div>
                        <button class="ai-session-del" data-id="${s.id}" style="background:none;border:none;color:var(--text-secondary);font-size:14px;cursor:pointer;padding:0 4px" title="删除会话">×</button>
                    </div>
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${time} · ${s.messages.length} 条</div>
                </div>
            `;
        }).join('');
    }

    function renderMessages() {
        if (!$msgs) return;
        const s = getCurrent();
        if (!s || s.messages.length === 0) {
            $msgs.innerHTML = `
                <div style="margin:auto;text-align:center;color:var(--text-secondary);font-size:14px;padding:40px 20px">
                    <div style="font-size:48px;margin-bottom:12px">💬</div>
                    <div style="font-size:16px;color:var(--text-primary);margin-bottom:8px">开始一段对话</div>
                    <div style="font-size:12px">先点"设置"配置 API 地址，然后在下方输入消息</div>
                </div>
            `;
            return;
        }
        // 如果有压缩摘要，在被压缩消息之后插入一条提示条
        const compressedAt = s.compressed?.upToIndex;
        const htmlParts = s.messages.map((m, idx) => renderMessage(m, idx));
        if (compressedAt && compressedAt > 0 && compressedAt < s.messages.length) {
            htmlParts.splice(compressedAt, 0,
                `<div class="ai-compress-mark" title="${escapeHtml(s.compressed.summary).slice(0, 200).replace(/"/g, '&quot;')}">— 以上 ${compressedAt} 条已压缩为摘要（仅影响发给 AI 的上下文，展示不变）—</div>`);
        }
        $msgs.innerHTML = htmlParts.join('');
        scrollToBottom();
    }

    function renderMessage(m, idx) {
        const isUser = m.role === 'user';
        const bubbleClass = isUser ? 'ai-bubble-user' : 'ai-bubble-assistant';
        const align = isUser ? 'flex-end' : 'flex-start';
        let bodyHtml;
        if (m.loading && !m.content && !m.reasoning) {
            // 流式开始前的"思考中"动画
            bodyHtml = `<div class="ai-thinking" aria-label="正在思考"><span></span><span></span><span></span></div>`;
        } else if (isUser) {
            const safeImgs = (m.images || []).filter(src => typeof src === 'string' && /^data:image\//i.test(src));
            const imgs = safeImgs.length
                ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">' +
                  safeImgs.map(src => `<img src="${src}" data-img-view="1" title="点击查看大图" style="max-width:150px;max-height:150px;border-radius:6px;border:1px solid var(--border-color);display:block;cursor:zoom-in">`).join('') +
                  '</div>'
                : '';
            bodyHtml = imgs + (m.content ? `<div style="white-space:pre-wrap;word-break:break-word">${escapeHtml(m.content)}</div>` : '');
        } else {
            bodyHtml = renderAssistantBody(m);
        }
        return `
            <div data-msg-idx="${idx}" style="display:flex;justify-content:${align};animation:ai-fade-in 0.3s ease">
                <div class="${bubbleClass}" style="max-width:82%;padding:12px 16px;border-radius:12px;position:relative">
                    <div class="ai-msg-content">${bodyHtml}</div>
                    <div style="display:flex;gap:6px;margin-top:8px;align-items:center;flex-wrap:wrap">
                        <span style="font-size:11px;opacity:.55;margin-right:2px">${isUser ? '我' : '助手'}</span>
                        <button class="ai-msg-act ai-msg-copy" data-idx="${idx}">📋 复制</button>
                        ${isUser
                            ? `<button class="ai-msg-act ai-msg-edit" data-idx="${idx}" title="编辑后重发，会替换该消息之后的内容">✏️ 编辑</button>`
                            : `<button class="ai-msg-act ai-msg-regen" data-idx="${idx}" title="重新生成（会丢弃这条之后的回复）">🔄 重新生成</button>`}
                        <button class="ai-msg-act ai-msg-del" data-idx="${idx}">🗑️ 删除</button>
                    </div>
                </div>
            </div>
        `;
    }

    function copyText(text) {
        // 优先 clipboard API；file:// 协议可能不可用，做降级
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                () => showToast('已复制', 'success'),
                () => fallbackCopy(text)
            );
        } else {
            fallbackCopy(text);
        }
    }
    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('已复制', 'success');
        } catch { showToast('复制失败', 'error'); }
        document.body.removeChild(ta);
    }

    function isNearBottom() {
        if (!$msgs) return true;
        return $msgs.scrollHeight - $msgs.scrollTop - $msgs.clientHeight < 80;
    }
    function scrollToBottom(force) {
        if (!$msgs) return;
        if (force || userNearBottom) {
            $msgs.scrollTop = $msgs.scrollHeight;
            userNearBottom = true;
        }
    }

    // ---------------- 状态条 ----------------
    function updateStatus() {
        const p = getProfile();
        if ($modelTip) $modelTip.textContent = `模型：${p.name} · ID：${p.model || '未配置'}`;
        if ($connStatus) {
            if (!p.baseUrl) {
                $connStatus.textContent = `⚠️ 「${p.name}」未配置 API`;
                $connStatus.style.color = '#ef4444';
            } else {
                $connStatus.textContent = '✓ ' + p.baseUrl.replace(/^https?:\/\//, '').slice(0, 40);
                $connStatus.style.color = '#10b981';
            }
        }
        renderProfileBar();
        updateSkillBadge();
    }

    // ---------------- 联网搜索（function calling 工具） ----------------
    // OpenAI 风格 tools 定义：暴露两个工具给 AI
    //   1) web_search(query) → 抓搜索页 HTML，截一段返回（最朴素，但通用）
    //   2) web_fetch(url)    → 抓任意 URL 的正文，返回纯文本片段
    // 触发条件：profile.webEnabled = true 且模型支持 tools；
    //          不支持的模型会忽略 tools 字段，行为退化为普通对话。
    const WEB_TOOLS = [
        {
            type: 'function',
            function: {
                name: 'web_search',
                description: '通过搜索引擎查询关键词，返回结果页的正文文本片段。用于：用户问到时事、新闻、不确定的事实、最新数据时调用。',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: '搜索关键词，简洁明确' }
                    },
                    required: ['query']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'web_fetch',
                description: '抓取指定 URL 的网页正文文本。用于：当用户给了具体链接、或上一步 web_search 已经给出了你想读的链接时调用。',
                parameters: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: '完整的 http/https URL' }
                    },
                    required: ['url']
                }
            }
        }
    ];

    // HTML → 纯文本：抽 <title>、剥脚本/样式、压缩空白
    function htmlToText(html) {
        if (!html) return '';
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        let body = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return (title ? `【标题】${title}\n\n` : '') + body;
    }

    // 把 Worker 反代 /search 的 JSON 结果（{items:[{title,link,snippet}]}）渲染为给 LLM 阅读的纯文本
    function formatSearchJson(j) {
        if (!j || !Array.isArray(j.items)) return JSON.stringify(j).slice(0, 4000);
        const lines = j.items.map((it, i) => {
            const t = it.title || '';
            const l = it.link  || '';
            const s = it.snippet || it.description || '';
            return `${i + 1}. ${t}\n   ${l}\n   ${s}`;
        });
        return `引擎：${j.engine || 'proxy'}  查询：${j.query || ''}\n\n` + lines.join('\n\n');
    }

    // 把 URL 里的敏感参数（如 token）抹掉，避免回吐给 LLM/用户
    function sanitizeUrl(u) {
        try {
            const x = new URL(u);
            ['token', 'key', 'apikey', 'api_key', 'access_token', 'secret'].forEach(k => x.searchParams.delete(k));
            return x.toString();
        } catch { return u.replace(/([?&])(token|key|apikey|api_key|access_token|secret)=[^&]*/gi, '$1$2=***'); }
    }

    async function execWebSearch(query, p) {
        // 留空 → 静默使用内置代理；用户填了 → 用他的
        const tpl = (p.searchUrlTemplate && p.searchUrlTemplate.trim()) || DEFAULT_SEARCH_PROXY;
        const url = tpl.replace(/\{q\}/g, encodeURIComponent(query));
        const safeUrl = sanitizeUrl(url);
        try {
            const r = await fetch(url, { method: 'GET' });
            const ct = r.headers.get('Content-Type') || '';
            // 走代理 Worker 时，对端返回结构化 JSON，直接格式化
            if (ct.includes('application/json')) {
                const j = await r.json();
                if (j.error) return `搜索失败：${j.error}`;
                const formatted = formatSearchJson(j);
                return `搜索：${query}\n来源：${safeUrl}\n\n${formatted.slice(0, 4000)}${formatted.length > 4000 ? '\n…（已截断）' : ''}`;
            }
            // 直连搜索引擎 HTML：清洗为纯文本
            const text = await r.text();
            const plain = htmlToText(text);
            return `搜索：${query}\n来源：${safeUrl}\n\n${plain.slice(0, 4000)}${plain.length > 4000 ? '\n…（已截断）' : ''}`;
        } catch (e) {
            return `搜索失败：${e.message}（可能是 CORS 阻挡或目标不可达，建议部署 worker-search-proxy）`;
        }
    }

    async function execWebFetch(url, p) {
        if (!/^https?:\/\//i.test(url)) return '错误：URL 必须以 http:// 或 https:// 开头';
        // 自动复用搜索模板的代理源走 /fetch 接口（绕开目标站 CORS）。用户未自定义则走内置默认
        const tpl = (p && p.searchUrlTemplate && p.searchUrlTemplate.trim()) || DEFAULT_SEARCH_PROXY;
        const proxyBase = derivProxyBase(tpl);
        const finalUrl = proxyBase
            ? `${proxyBase}/fetch?url=${encodeURIComponent(url)}${proxyTokenSuffix(tpl)}`
            : url;
        try {
            const r = await fetch(finalUrl, { method: 'GET' });
            const ct = r.headers.get('Content-Type') || '';
            if (ct.includes('application/json')) {
                const j = await r.json();
                if (j.error) return `抓取失败：${j.error}`;
                const body = j.text || '';
                return `URL：${url}\n\n${body.slice(0, 6000)}${j.truncated ? '\n…（已截断）' : ''}`;
            }
            const text = await r.text();
            const plain = htmlToText(text);
            return `URL：${url}\n\n${plain.slice(0, 6000)}${plain.length > 6000 ? '\n…（已截断）' : ''}`;
        } catch (e) {
            return `抓取失败：${e.message}（如果是 CORS 错误，建议配置 worker-search-proxy 反代）`;
        }
    }

    // 从搜索 URL 模板里抽出代理 Worker 的根（如 https://x.workers.dev/search?q={q} → https://x.workers.dev）
    function derivProxyBase(tpl) {
        if (!tpl) return '';
        try {
            const u = new URL(tpl);
            // 只在路径形如 /search 时认为是本项目的代理 Worker
            if (/\/search\b/.test(u.pathname)) return u.origin;
        } catch {}
        return '';
    }
    // 把模板里的 ?token=... 透传给 /fetch
    function proxyTokenSuffix(tpl) {
        try {
            const u = new URL(tpl);
            const t = u.searchParams.get('token');
            return t ? `&token=${encodeURIComponent(t)}` : '';
        } catch { return ''; }
    }

    async function execToolCall(call, p) {
        const name = call.function?.name;
        let args = {};
        try { args = JSON.parse(call.function?.arguments || '{}'); } catch {}
        if (name === 'web_search') return execWebSearch(args.query || '', p);
        if (name === 'web_fetch')  return execWebFetch(args.url || '', p);
        return `未知工具：${name}`;
    }

    // 联网模式下走非流式 + tool-use 循环（最多 4 轮）
    async function runWithTools(p, msgs, headers, url, assistantMsg) {
        const allMsgs = [...msgs];
        const MAX_ROUNDS = 4;
        for (let round = 0; round < MAX_ROUNDS; round++) {
            const body = {
                model: p.model,
                messages: allMsgs,
                temperature: Number(p.temperature),
                top_p: Number(p.topP),
                max_tokens: Number(p.maxTokens),
                tools: WEB_TOOLS,
                tool_choice: 'auto',
                stream: false
            };
            // 联网模式同样要遵守用户的思考深度设置，否则每轮工具调用都默认深度思考
            if (p.reasoningEffort) body.reasoning_effort = p.reasoningEffort;
            const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: abortCtrl.signal });
            if (!resp.ok) {
                let t = ''; try { t = await resp.text(); } catch {}
                throw new Error(`HTTP ${resp.status}: ${t.slice(0, 300)}`);
            }
            const data = await resp.json();
            const choice = data?.choices?.[0];
            const m = choice?.message || {};
            const toolCalls = m.tool_calls || [];

            if (toolCalls.length > 0) {
                // 显示进度
                assistantMsg.loading = false;
                const tip = toolCalls.map(c => {
                    let a = {}; try { a = JSON.parse(c.function?.arguments || '{}'); } catch {}
                    if (c.function?.name === 'web_search') return `🔍 搜索：${a.query || ''}`;
                    if (c.function?.name === 'web_fetch')  return `🌐 抓取：${a.url || ''}`;
                    return `🔧 ${c.function?.name}`;
                }).join('\n');
                assistantMsg.content = (assistantMsg.content ? assistantMsg.content + '\n\n' : '') + `*[联网中…]\n${tip}*`;
                updateLastAssistant(assistantMsg, true);

                // 把模型的 assistant message（带 tool_calls）原样塞进去
                allMsgs.push({ role: 'assistant', content: m.content || '', tool_calls: toolCalls });

                // 串行执行每个 tool（多数情况只有 1 个）
                for (const c of toolCalls) {
                    const result = await execToolCall(c, p);
                    allMsgs.push({ role: 'tool', tool_call_id: c.id, content: result });
                }
                continue; // 进入下一轮，让模型基于 tool 返回继续
            }

            // 没有 tool_call → 最终回答
            const finalText = m.content || '';
            // 把上面"联网中"的提示压成折叠块，最终答案紧跟其后
            if (/\*\[联网中…\]/.test(assistantMsg.content)) {
                assistantMsg.content = `<details><summary>🌐 联网过程</summary>\n\n${assistantMsg.content.replace(/^\*|\*$/g, '')}\n\n</details>\n\n${finalText}`;
            } else {
                assistantMsg.content = finalText;
            }
            assistantMsg.reasoning = m.reasoning || m.reasoning_content || '';
            assistantMsg.loading = false;
            updateLastAssistant(assistantMsg, true);
            return;
        }
        // 达到上限
        assistantMsg.content += '\n\n*[联网轮数已达上限，停止]*';
        updateLastAssistant(assistantMsg, true);
    }

    // ---------------- 消息操作：重新生成 / 编辑重发 ----------------
    // 从指定助手消息处重新生成：丢弃该轮之后的所有内容，用同一条用户提问重发
    async function regenerateAt(idx) {
        const s = getCurrent();
        if (!s) return;
        if (isStreaming) { showToast('正在生成中，请先点 ⏹ 停止', 'warning'); return; }
        let userIdx = -1;
        for (let i = Math.min(idx, s.messages.length) - 1; i >= 0; i--) {
            if (s.messages[i].role === 'user') { userIdx = i; break; }
        }
        if (userIdx < 0) { showToast('找不到对应的提问', 'warning'); return; }
        const userMsg = s.messages[userIdx];
        // 不是最后一轮时，重新生成会连带丢弃后面的对话，先确认
        const dropped = s.messages.length - userIdx - 1;
        if (dropped > 1 && !confirm(`重新生成会丢弃该提问之后的 ${dropped} 条消息，确定吗？`)) return;
        s.messages.splice(userIdx, s.messages.length - userIdx);
        s.updatedAt = Date.now();
        saveSessions();
        renderMessages();
        await sendMessage(userMsg.content, userMsg.images);
    }

    // 编辑模式提示条：让用户知道当前在编辑哪条、可随时取消
    function renderEditHint() {
        const box = document.getElementById('ai-edit-hint');
        if (!box) return;
        if (_editingMsgIdx === null) { box.style.display = 'none'; box.innerHTML = ''; return; }
        box.style.display = 'flex';
        box.innerHTML = `<span>✏️ 正在编辑第 ${_editingMsgIdx + 1} 条消息，发送后会替换其后的内容</span>` +
            `<button id="ai-edit-cancel" style="background:none;border:none;color:var(--accent-color);cursor:pointer;font-size:11px;padding:0;text-decoration:underline">取消编辑</button>`;
    }

    // 编辑用户消息：回填到输入框（含图片），发送时替换该消息之后的所有内容
    function startEditMessage(idx) {
        const s = getCurrent();
        const m = s && s.messages[idx];
        if (!m || m.role !== 'user') return;
        if (isStreaming) { showToast('正在生成中，请先点 ⏹ 停止', 'warning'); return; }
        $input.value = m.content || '';
        pendingImages = (m.images || []).slice();
        renderPendingImages();
        _editingMsgIdx = idx;
        renderEditHint();
        $input.focus();
        $input.setSelectionRange($input.value.length, $input.value.length);
        showToast('编辑后点发送，该消息之后的内容会被替换', 'info');
    }

    // ---------------- 流式聊天 ----------------
    async function sendMessage(userText, images) {
        const p = getProfile();
        if (!p.baseUrl) {
            showToast(`模型「${p.name}」未配置 API 地址，请先打开设置`, 'warning');
            return;
        }
        if (!p.model) {
            showToast(`模型「${p.name}」未设置模型 ID`, 'warning');
            return;
        }
        if (hasNonLatin1(p.baseUrl)) {
            showToast(`模型「${p.name}」的 Base URL 含中文/全角字符，请到设置里检查`, 'error');
            return;
        }
        if (p.apiKey && hasNonLatin1(p.apiKey)) {
            showToast(`模型「${p.name}」的 API Key 含中文/全角字符，请到设置里重新粘贴`, 'error');
            return;
        }
        let s = getCurrent();
        if (!s) s = createSession();

        // 编辑模式：先丢弃被编辑消息及其之后的所有内容，再作为新消息发出
        if (_editingMsgIdx !== null && _editingMsgIdx >= 0 && _editingMsgIdx < s.messages.length) {
            s.messages.splice(_editingMsgIdx);
        }
        _editingMsgIdx = null;
        renderEditHint();

        const imgs = (images || []).slice(0, MAX_IMAGES);
        s.messages.push({ role: 'user', content: userText, images: imgs.length ? imgs : undefined, ts: Date.now() });
        // 自动取首条用户消息作为会话标题
        if (s.title === '新对话' && userText.trim()) {
            // 先给个临时标题（立即显示），稍后用 AI 概括替换
            s.title = userText.trim().slice(0, 24);
            renderSessions();
        }
        s.updatedAt = Date.now();
        saveSessions();
        userNearBottom = true; // 用户发送消息一定要看到底部
        renderMessages();
        renderSessions();
        scrollToBottom(true);

        // 构造请求消息
        const msgs = [];
        if (cfg.system && cfg.system.trim()) {
            msgs.push({ role: 'system', content: cfg.system.trim() });
        }
        // 注入已启用的技能（Skills）：每个作为独立的 system 消息追加
        const enabledSkills = (cfg.skills || []).filter(sk => sk.enabled);
        for (const sk of enabledSkills) {
            msgs.push({ role: 'system', content: `【已加载技能：${sk.name}】\n${sk.content}` });
        }
        // E: 开启压缩时只受压缩配置控制，contextLen 不再二次截断（避免双重语义混淆）
        //    未开压缩时，contextLen 是上下文条数上限
        if (s.compressed?.summary) {
            msgs.push({ role: 'system', content: '【以下是之前对话的上下文摘要，请在回答时参考】\n' + s.compressed.summary });
            const remain = s.messages.slice(s.compressed.upToIndex);
            msgs.push(...withImageBudget(remain));
        } else {
            const history = s.messages.slice(-Math.max(1, p.contextLen));
            msgs.push(...withImageBudget(history));
        }

        // 占位的 assistant 消息（带 loading 标记，渲染时显示思考动画）
        const assistantMsg = { role: 'assistant', content: '', ts: Date.now(), loading: true };
        s.messages.push(assistantMsg);
        renderMessages();
        scrollToBottom(true);

        // 拼接 URL
        const url = p.baseUrl.replace(/\/$/, '') + '/chat/completions';
        const headers = { 'Content-Type': 'application/json' };
        if (p.apiKey) headers['Authorization'] = 'Bearer ' + p.apiKey;

        const body = {
            model: p.model,
            messages: msgs,
            temperature: Number(p.temperature),
            top_p: Number(p.topP),
            max_tokens: Number(p.maxTokens),
            frequency_penalty: Number(p.frequencyPenalty),
            presence_penalty: Number(p.presencePenalty),
            stream: !!p.stream
        };
        // 思考深度：仅当用户配置了才发送（空字符串 = 用服务端默认）
        if (p.reasoningEffort) body.reasoning_effort = p.reasoningEffort;

        abortCtrl = new AbortController();
        isStreaming = true;
        $btnSend.style.display = 'none';
        $btnStop.style.display = '';

        try {
            // 联网模式：走 tool-use 循环（非流式），与普通模式完全互斥
            if (p.webEnabled) {
                await runWithTools(p, msgs, headers, url, assistantMsg);
                s.updatedAt = Date.now();
                saveSessions();
                isStreaming = false;
                abortCtrl = null;
                $btnSend.style.display = '';
                $btnStop.style.display = 'none';
                compressOldMessages(s);
                if (s.titleAuto && s.messages.some(m => m.role === 'assistant' && m.content)) {
                    generateSessionTitle(s, p);
                }
                return;
            }

            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: abortCtrl.signal
            });

            if (!resp.ok) {
                let errText = '';
                try { errText = await resp.text(); } catch {}
                throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 300)}`);
            }

            if (p.stream) {
                const finishReason = await readSSE(resp,
                    // 正式回答
                    chunk => {
                        if (assistantMsg.loading) assistantMsg.loading = false;
                        assistantMsg.content += chunk;
                        updateLastAssistant(assistantMsg);   // throttle 渲染
                    },
                    // 思考过程（ollama /v1 放在 reasoning，vLLM 放在 reasoning_content）
                    reasoning => {
                        if (assistantMsg.loading) assistantMsg.loading = false;
                        assistantMsg.reasoning = (assistantMsg.reasoning || '') + reasoning;
                        updateLastAssistant(assistantMsg);
                    }
                );
                // 被 max_tokens 截断时标记（思考 token 也算在 max_tokens 内）
                if (finishReason === 'length') {
                    assistantMsg.truncated = true;
                    showToast('输出达到 max_tokens 上限被截断，可在设置里调大「最大输出长度」', 'error');
                }
                updateLastAssistant(assistantMsg, true); // 流结束补一次完整渲染
            } else {
                const data = await resp.json();
                const choice = data?.choices?.[0] || {};
                const msg = choice.message || {};
                assistantMsg.loading = false;
                assistantMsg.content = msg.content || '';
                assistantMsg.reasoning = msg.reasoning || msg.reasoning_content || '';
                if (choice.finish_reason === 'length') {
                    assistantMsg.truncated = true;
                    showToast('输出达到 max_tokens 上限被截断，可在设置里调大「最大输出长度」', 'error');
                }
                updateLastAssistant(assistantMsg, true);
            }
            s.updatedAt = Date.now();
            saveSessions();
        } catch (e) {
            if (e.name === 'AbortError') {
                assistantMsg.content += '\n\n*（已停止）*';
            } else {
                assistantMsg.content = `**❌ 请求失败**\n\n\`\`\`\n${e.message}\n\`\`\`\n\n排查建议：\n- 检查 API Base URL 是否正确（要带 \`/v1\`）\n- 检查 API Key（中转站需要，Ollama 不需要）\n- Ollama 本地：确认已设置 \`OLLAMA_ORIGINS=*\` 后重启 ollama\n- 网络/CORS：F12 控制台看具体报错`;
                showToast('请求失败：' + e.message, 'error');
            }
            updateLastAssistant(assistantMsg, true);
            saveSessions();
        } finally {
            isStreaming = false;
            abortCtrl = null;
            $btnSend.style.display = '';
            $btnStop.style.display = 'none';
        }

        // 回复完成后异步触发压缩（不阻塞用户继续输入）
        compressOldMessages(s);
        // 首轮问答结束后，用 AI 概括出正式标题（同样不阻塞）
        if (s.titleAuto && s.messages.some(m => m.role === 'assistant' && m.content)) {
            generateSessionTitle(s, p);
        }
    }

    // 助手消息正文：思考块（可折叠，像 pi / HAPI）+ 正式回答
    function renderAssistantBody(msg) {
        const content = msg.content || '';
        const reasoning = msg.reasoning || '';
        // 正在思考（还没出正文）时展开并显示三点动画
        const isThinking = msg.loading && !content;
        let thinkHtml = '';
        if (reasoning) {
            // 展开优先级：用户手动改过 > 流式思考中 > 设置里的默认值
            const open = (msg.thinkOpen !== undefined)
                ? msg.thinkOpen
                : (isThinking || !!cfg.thinkDefaultOpen);
            const summary = isThinking
                ? '💭 思考中<span class="ai-thinking ai-thinking-inline"><span></span><span></span><span></span></span>'
                : '💭 思考过程';
            thinkHtml = `<details class="ai-think-block"${open ? ' open' : ''}>` +
                        `<summary>${summary}</summary>` +
                        `<div class="ai-think-inner">${renderMd(reasoning)}</div>` +
                        `</details>`;
        }
        const truncHint = msg.truncated
            ? '<div class="ai-truncated-hint">⚠️ 输出达到 max_tokens 上限被截断，可在设置里调大「最大输出长度」</div>'
            : '';
        return thinkHtml + renderMd(content) + truncHint;
    }

    // G: 流式渲染节流——每 80ms 至多渲一次；结束时主流程会再补渲一次保证完整
    let _lastRender = 0;
    function updateLastAssistant(msg, force) {
        const s = getCurrent();
        if (!s) return;
        if (!force) {
            const now = Date.now();
            if (now - _lastRender < 80) return;
            _lastRender = now;
        } else {
            _lastRender = Date.now();
        }
        // 流式中:跳过高亮以加速;force=true 时(流结束/非流式)正常高亮
        _skipHighlight = !force;
        // 用户正在选中文本时不重渲染，避免把选择/复制打断
        if (!force) {
            const sel = window.getSelection && window.getSelection();
            if (sel && String(sel).length > 0) return;
        }
        const bubbles = $msgs.querySelectorAll('.ai-bubble-assistant .ai-msg-content');
        const last = bubbles[bubbles.length - 1];
        if (last) {
            last.innerHTML = (typeof msg === 'string') ? renderMd(msg) : renderAssistantBody(msg);
        } else {
            renderMessages();
        }
        scrollToBottom();
    }

    // 读取 SSE 流（OpenAI 兼容协议）
    // 读取 SSE 流。返回 finish_reason（'stop' / 'length' / ...），
    // 调用方据此判断是否被 max_tokens 截断。
    async function readSSE(resp, onChunk, onReasoning) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buf = '';
        let finishReason = '';
        // 返回 true 表示遇到 [DONE]，应结束
        const handleLine = line => {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) return false;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') return true;
            try {
                const obj = JSON.parse(payload);
                const choice = obj?.choices?.[0] || {};
                const d = choice.delta || {};
                const m = choice.message || {};
                if (choice.finish_reason) finishReason = choice.finish_reason;
                const reasoning = d.reasoning ?? d.reasoning_content ?? m.reasoning ?? m.reasoning_content ?? '';
                const delta = d.content ?? m.content ?? '';
                if (reasoning && onReasoning) onReasoning(reasoning);
                if (delta) onChunk(delta);
            } catch {
                // 忽略解析失败的行
            }
            return false;
        };
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            // 按行分割
            const lines = buf.split('\n');
            buf = lines.pop() || ''; // 留最后一段不完整的
            for (const line of lines) {
                if (handleLine(line)) return finishReason;
            }
        }
        // 流结束时 buf 里可能还残留最后一行（旧版直接丢弃了）
        if (buf.trim()) handleLine(buf);
        return finishReason;
    }

    function stopStreaming() {
        if (abortCtrl) abortCtrl.abort();
    }

    // ---------------- 拉取模型列表 ----------------
    // 校验是否仅含 HTTP header 允许的 ISO-8859-1 字符（避免中文/全角粘进 apiKey 导致 fetch 抛错）
    function hasNonLatin1(s) { return /[^\x00-\xFF]/.test(s); }

    async function fetchModels() {
        const baseUrl = document.getElementById('ai-cfg-baseurl').value.trim();
        const apiKey  = document.getElementById('ai-cfg-apikey').value.trim();
        if (!baseUrl) {
            showToast('请先填写 API Base URL', 'warning');
            return;
        }
        if (hasNonLatin1(baseUrl)) {
            showToast('Base URL 含中文/全角字符，请检查是否粘错（应为纯英文 URL）', 'error');
            return;
        }
        if (apiKey && hasNonLatin1(apiKey)) {
            showToast('API Key 含中文/全角字符，请检查输入框是否混入了非法字符', 'error');
            return;
        }
        const url = baseUrl.replace(/\/$/, '') + '/models';
        const headers = {};
        if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

        const $sel = document.getElementById('ai-cfg-model-select');
        const $btn = document.getElementById('ai-btn-fetch-models');
        const oldText = $btn.textContent;
        $btn.textContent = '拉取中…';
        $btn.disabled = true;

        try {
            const resp = await fetch(url, { headers });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const list = data?.data || data?.models || [];
            const ids = list.map(m => m.id || m.name || m.model).filter(Boolean);
            if (ids.length === 0) {
                showToast('未拉取到模型', 'warning');
                $sel.style.display = 'none';
                return;
            }
            $sel.innerHTML = '<option value="">— 选择模型 —</option>' + ids.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('');
            $sel.style.display = '';
            $sel.onchange = () => {
                if ($sel.value) document.getElementById('ai-cfg-model').value = $sel.value;
            };
            showToast(`已拉取 ${ids.length} 个模型`, 'success');
        } catch (e) {
            showToast('拉取失败：' + e.message, 'error');
        } finally {
            $btn.textContent = oldText;
            $btn.disabled = false;
        }
    }

    // ---------------- 设置弹窗 ----------------
    function openSettings() {
        // 默认编辑当前激活模型
        _editingProfileId = cfg.currentProfileId;
        renderProfileEditList();
        loadProfileToForm(_editingProfileId);

        document.getElementById('ai-cfg-system').value            = cfg.system;
        document.getElementById('ai-cfg-model-select').style.display = 'none';

        // 压缩相关
        const $cmpOn  = document.getElementById('ai-cfg-compress-enabled');
        const $cmpThr = document.getElementById('ai-cfg-compress-threshold');
        const $cmpKp  = document.getElementById('ai-cfg-compress-keeplast');
        if ($cmpOn)  $cmpOn.checked  = !!cfg.compressEnabled;
        if ($cmpThr) $cmpThr.value   = cfg.compressThreshold;
        if ($cmpKp)  $cmpKp.value    = cfg.compressKeepLast;

        // 模板高亮
        renderTemplateButtons();
        // 技能列表
        renderSkillList();

        document.getElementById('ai-settings-modal').style.display = 'flex';
    }
    function closeSettings() {
        document.getElementById('ai-settings-modal').style.display = 'none';
    }
    function saveSettings() {
        // 先把表单回写到当前正在编辑的模型
        saveFormToProfile();

        cfg.system = document.getElementById('ai-cfg-system').value;

        const $cmpOn  = document.getElementById('ai-cfg-compress-enabled');
        const $cmpThr = document.getElementById('ai-cfg-compress-threshold');
        const $cmpKp  = document.getElementById('ai-cfg-compress-keeplast');
        cfg.compressEnabled   = $cmpOn ? !!$cmpOn.checked : cfg.compressEnabled;
        cfg.compressThreshold = $cmpThr ? Math.max(2, parseInt($cmpThr.value) || 20) : cfg.compressThreshold;
        cfg.compressKeepLast  = $cmpKp ? Math.max(1, parseInt($cmpKp.value) || 6)  : cfg.compressKeepLast;

        saveCfg();
        updateStatus();
        closeSettings();
        showToast('设置已保存', 'success');
    }

    // 表单 → 模型
    function saveFormToProfile() {
        const p = getEditingProfile();
        if (!p) return;
        p.name             = (document.getElementById('ai-cfg-profile-name')?.value || '').trim() || p.name || '未命名';
        p.baseUrl          = document.getElementById('ai-cfg-baseurl').value.trim();
        p.apiKey           = document.getElementById('ai-cfg-apikey').value.trim();
        p.model            = document.getElementById('ai-cfg-model').value.trim();
        p.temperature      = parseFloat(document.getElementById('ai-cfg-temperature').value);
        p.topP             = parseFloat(document.getElementById('ai-cfg-top-p').value);
        p.maxTokens        = parseInt(document.getElementById('ai-cfg-max-tokens').value) || 32768;
        p.contextLen       = parseInt(document.getElementById('ai-cfg-context-len').value) || 50;
        p.frequencyPenalty = parseFloat(document.getElementById('ai-cfg-frequency-penalty').value);
        p.presencePenalty  = parseFloat(document.getElementById('ai-cfg-presence-penalty').value);
        p.stream           = document.getElementById('ai-cfg-stream').checked;
        const $re = document.getElementById('ai-cfg-reasoning-effort');
        if ($re) p.reasoningEffort = $re.value;
        const $to = document.getElementById('ai-cfg-think-open');
        if ($to) p.thinkDefaultOpen = $to.value === '1';
        const $web = document.getElementById('ai-cfg-web-enabled');
        const $url = document.getElementById('ai-cfg-search-url');
        if ($web) p.webEnabled = !!$web.checked;
        // 保存原样：留空就保持空，由 execWebSearch/Fetch 在调用时静默兜底
        if ($url) p.searchUrlTemplate = $url.value.trim();
    }

    // 模型 → 表单
    function loadProfileToForm(pid) {
        _editingProfileId = pid;
        const p = getEditingProfile();
        const $name = document.getElementById('ai-cfg-profile-name');
        if ($name) $name.value = p.name;
        document.getElementById('ai-cfg-baseurl').value           = p.baseUrl;
        document.getElementById('ai-cfg-apikey').value            = p.apiKey;
        document.getElementById('ai-cfg-model').value             = p.model;
        document.getElementById('ai-cfg-temperature').value       = p.temperature;
        document.getElementById('ai-cfg-temp-val').textContent    = p.temperature;
        document.getElementById('ai-cfg-top-p').value             = p.topP;
        document.getElementById('ai-cfg-topp-val').textContent    = p.topP;
        document.getElementById('ai-cfg-max-tokens').value        = p.maxTokens;
        document.getElementById('ai-cfg-context-len').value       = p.contextLen;
        document.getElementById('ai-cfg-frequency-penalty').value = p.frequencyPenalty;
        document.getElementById('ai-cfg-fp-val').textContent      = p.frequencyPenalty;
        document.getElementById('ai-cfg-presence-penalty').value  = p.presencePenalty;
        document.getElementById('ai-cfg-pp-val').textContent      = p.presencePenalty;
        document.getElementById('ai-cfg-stream').checked          = p.stream;
        const $re = document.getElementById('ai-cfg-reasoning-effort');
        if ($re) $re.value = p.reasoningEffort || '';
        const $to = document.getElementById('ai-cfg-think-open');
        if ($to) $to.value = p.thinkDefaultOpen ? '1' : '0';
        const $web = document.getElementById('ai-cfg-web-enabled');
        const $url = document.getElementById('ai-cfg-search-url');
        if ($web) $web.checked = !!p.webEnabled;
        // 用户没自定义就显示为空（让 placeholder 出来），不暴露内置默认
        if ($url) $url.value   = p.searchUrlTemplate || '';
        document.getElementById('ai-cfg-model-select').style.display = 'none';
        renderProfileEditList();
    }

    // ---------------- 多模型管理 ----------------
    function renderProfileEditList() {
        const $list = document.getElementById('ai-profile-edit-list');
        if (!$list) return;
        $list.innerHTML = cfg.profiles.map(p => {
            const active = p.id === _editingProfileId ? ' active' : '';
            const isCurrent = p.id === cfg.currentProfileId;
            const canDel = cfg.profiles.length > 1;
            return `<div class="ai-profile-edit-item${active}" data-pid="${p.id}">
                <div class="ai-profile-edit-name">${isCurrent ? '★ ' : ''}${escapeHtml(p.name)}</div>
                <div class="ai-profile-edit-model">${escapeHtml(p.model || '未配置')}</div>
                <div class="ai-profile-edit-actions">
                    ${isCurrent ? '' : `<button type="button" data-act="use" data-pid="${p.id}" title="设为当前使用模型">用</button>`}
                    ${canDel ? `<button type="button" data-act="del" data-pid="${p.id}" title="删除此模型">删</button>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    function newProfile() {
        saveFormToProfile();   // 先存当前编辑中的，避免丢失
        const np = makeDefaultProfile(null, '新模型 ' + (cfg.profiles.length + 1));
        cfg.profiles.push(np);
        loadProfileToForm(np.id);
        showToast('已新建模型，请填写 API 配置', 'info');
    }

    function deleteProfile(pid) {
        if (cfg.profiles.length <= 1) {
            showToast('至少保留一个模型', 'warning');
            return;
        }
        const target = cfg.profiles.find(p => p.id === pid);
        if (!target) return;
        if (!confirm(`确定删除模型「${target.name}」？此操作不可撤销`)) return;
        cfg.profiles = cfg.profiles.filter(p => p.id !== pid);
        // 修复 currentProfileId / _editingProfileId
        if (cfg.currentProfileId === pid) {
            cfg.currentProfileId = cfg.profiles[0].id;
        }
        if (_editingProfileId === pid) {
            loadProfileToForm(cfg.profiles[0].id);
        } else {
            renderProfileEditList();
        }
        saveCfg();
        updateStatus();
        showToast('模型已删除', 'success');
    }

    function switchProfile(pid) {
        if (!cfg.profiles.find(p => p.id === pid)) return;
        cfg.currentProfileId = pid;
        saveCfg();
        updateStatus();
        const p = getProfile();
        if (typeof showToast === 'function') showToast(`已切换：${p.name}`, 'success');
    }

    function setProfileAsCurrent(pid) {
        // 设置弹窗里"用"按钮：把这个模型设为当前激活模型
        saveFormToProfile();
        switchProfile(pid);
        renderProfileEditList();
    }

    // 顶部模型选择条：渲染所有 chip
    function renderProfileBar() {
        const $bar = document.getElementById('ai-profile-bar');
        if (!$bar) return;
        const cur = cfg.currentProfileId;
        const chips = cfg.profiles.map(p => {
            const active = p.id === cur ? ' active' : '';
            const modelShort = (p.model || '未配置').slice(0, 20);
            const ok = p.baseUrl && p.model;
            return `<button type="button" class="ai-profile-chip${active}" data-pid="${p.id}" title="${escapeHtml(p.baseUrl || '未配置')}">
                ${ok ? '<span class="pf-dot"></span>' : ''}
                <span>${escapeHtml(p.name)}</span>
                <span class="pf-model">${escapeHtml(modelShort)}</span>
            </button>`;
        }).join('');
        $bar.innerHTML = `<span class="ai-profile-label">模型</span>${chips}<button type="button" class="ai-profile-add" id="ai-profile-add-quick" title="新建模型（在设置中配置）">+ 新模型</button>`;
    }

    // ---------------- Skills 技能库 ----------------
    function renderSkillList() {
        const $list = document.getElementById('ai-skill-list');
        if (!$list) return;
        const skills = cfg.skills || [];
        if (skills.length === 0) {
            $list.innerHTML = '<div class="ai-skill-empty">还没有任何技能。用下方按钮从 .md/.txt 文件导入，或手动新建</div>';
            return;
        }
        $list.innerHTML = skills.map(sk => {
            const preview = (sk.content || '').slice(0, 120).replace(/\s+/g, ' ');
            return `<div class="ai-skill-item${sk.enabled ? ' enabled' : ''}" data-sid="${sk.id}">
                <input type="checkbox" class="ai-skill-check" data-sid="${sk.id}" ${sk.enabled ? 'checked' : ''} title="启用后会随每次请求注入到 system 提示词">
                <div class="ai-skill-main">
                    <div class="ai-skill-title">${escapeHtml(sk.name)}</div>
                    <div class="ai-skill-desc">${escapeHtml(preview)}</div>
                    <div class="ai-skill-meta">${(sk.content || '').length} 字符 · ${escapeHtml(sk.source || 'manual')}</div>
                </div>
                <div class="ai-skill-actions">
                    <button class="sk-edit" data-sid="${sk.id}">编辑</button>
                    <button class="sk-del" data-sid="${sk.id}">删除</button>
                </div>
            </div>`;
        }).join('');
    }

    function toggleSkill(sid) {
        const sk = (cfg.skills || []).find(x => x.id === sid);
        if (!sk) return;
        sk.enabled = !sk.enabled;
        saveCfg();
        renderSkillList();
        updateSkillBadge();
    }

    function deleteSkill(sid) {
        const sk = (cfg.skills || []).find(x => x.id === sid);
        if (!sk) return;
        if (!confirm(`确定删除技能「${sk.name}」？`)) return;
        cfg.skills = (cfg.skills || []).filter(x => x.id !== sid);
        saveCfg();
        renderSkillList();
        updateSkillBadge();
        showToast('技能已删除', 'success');
    }

    function editSkill(sid) {
        const sk = (cfg.skills || []).find(x => x.id === sid);
        if (!sk) return;
        openSkillEditor({
            title: '编辑技能',
            namePlaceholder: '技能名称',
            contentPlaceholder: '技能内容(Markdown)',
            initName: sk.name,
            initContent: sk.content || '',
            onConfirm: (name, content) => {
                sk.name = name;
                sk.content = content;
                saveCfg();
                renderSkillList();
                showToast('技能已更新', 'success');
            }
        });
    }

    function importSkillFromFile() {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.md,.txt,.markdown';
        inp.multiple = true;
        inp.onchange = async () => {
            const files = Array.from(inp.files || []);
            if (files.length === 0) return;
            if (!Array.isArray(cfg.skills)) cfg.skills = [];
            let ok = 0;
            for (const f of files) {
                try {
                    const text = await f.text();
                    cfg.skills.push({
                        id: 'sk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                        name: f.name.replace(/\.(md|markdown|txt)$/i, ''),
                        content: text,
                        enabled: false,
                        source: 'file:' + f.name,
                        createdAt: Date.now()
                    });
                    ok++;
                } catch (e) {
                    console.warn('[ai-chat] 读取技能失败', f.name, e);
                }
            }
            saveCfg();
            renderSkillList();
            updateSkillBadge();
            showToast(`已导入 ${ok} 个技能（默认未启用，请点勾启用）`, 'success');
        };
        inp.click();
    }

    function addSkillManual() {
        openSkillEditor({
            title: '新增技能',
            namePlaceholder: '例如:单元测试规范、代码评审清单',
            contentPlaceholder: '启用后作为 system 提示词注入,支持多行 Markdown\n\n粘贴几百行内容也没问题',
            onConfirm: (name, content) => {
                if (!Array.isArray(cfg.skills)) cfg.skills = [];
                cfg.skills.push({
                    id: 'sk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                    name: name,
                    content: content,
                    enabled: true,
                    source: 'manual',
                    createdAt: Date.now()
                });
                saveCfg();
                renderSkillList();
                updateSkillBadge();
                showToast('已添加技能:' + name, 'success');
            }
        });
    }

    /**
     * 弹一个支持多行 textarea 的 Skill 编辑器,替代 prompt()
     * 用原生 DOM,不依赖任何 UI 库,贴几百行 Markdown 没问题
     */
    function openSkillEditor({ title, namePlaceholder, contentPlaceholder, initName = '', initContent = '', onConfirm }) {
        // 已有同类弹层先关掉,避免重复打开
        const existing = document.getElementById('ai-skill-editor-mask');
        if (existing) existing.remove();

        const mask = document.createElement('div');
        mask.id = 'ai-skill-editor-mask';
        mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;';

        const box = document.createElement('div');
        box.style.cssText = 'background:var(--bg-card,#1e1e2e);color:var(--text-primary,#eee);border:1px solid var(--border-color,#333);border-radius:12px;padding:20px;width:min(720px,92vw);max-height:85vh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);';

        const h = document.createElement('div');
        h.textContent = title;
        h.style.cssText = 'font-size:16px;font-weight:600;';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = namePlaceholder;
        nameInput.value = initName;
        nameInput.style.cssText = 'padding:8px 12px;background:var(--bg-darker,#111);border:1px solid var(--border-color,#333);color:inherit;border-radius:6px;font-size:14px;';

        const contentInput = document.createElement('textarea');
        contentInput.placeholder = contentPlaceholder;
        contentInput.value = initContent;
        contentInput.style.cssText = 'flex:1;min-height:300px;padding:10px 12px;background:var(--bg-darker,#111);border:1px solid var(--border-color,#333);color:inherit;border-radius:6px;font-family:Consolas,monospace;font-size:13px;line-height:1.5;resize:vertical;';

        const tip = document.createElement('div');
        tip.style.cssText = 'font-size:12px;color:var(--text-secondary,#888);';
        tip.textContent = 'Ctrl + Enter 确认 · ESC 取消';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

        const btnCancel = document.createElement('button');
        btnCancel.textContent = '取消';
        btnCancel.className = 'btn-ghost';
        btnCancel.style.cssText = 'padding:6px 16px;background:transparent;border:1px solid var(--border-color,#444);color:inherit;border-radius:6px;cursor:pointer;';

        const btnOk = document.createElement('button');
        btnOk.textContent = '确认';
        btnOk.style.cssText = 'padding:6px 16px;background:var(--accent-color,#7c8cff);border:none;color:white;border-radius:6px;cursor:pointer;font-weight:600;';

        btnRow.appendChild(btnCancel);
        btnRow.appendChild(btnOk);
        box.appendChild(h);
        box.appendChild(nameInput);
        box.appendChild(contentInput);
        box.appendChild(tip);
        box.appendChild(btnRow);
        mask.appendChild(box);
        document.body.appendChild(mask);
        nameInput.focus();

        function close() { mask.remove(); document.removeEventListener('keydown', onKey); }
        function confirm() {
            const name = nameInput.value.trim();
            const content = contentInput.value;
            if (!name) { showToast('请填写技能名称', 'warning'); nameInput.focus(); return; }
            close();
            onConfirm(name, content);
        }
        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            // Ctrl+Enter 确认,但 IME 候选期间放行让回车确认上屏
            else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); confirm(); }
        }
        document.addEventListener('keydown', onKey);
        btnCancel.addEventListener('click', close);
        btnOk.addEventListener('click', confirm);
        mask.addEventListener('click', e => { if (e.target === mask) close(); });
    }

    function updateSkillBadge() {
        const $badge = document.getElementById('ai-skill-badge');
        if (!$badge) return;
        const count = (cfg.skills || []).filter(s => s.enabled).length;
        if (count > 0) {
            $badge.style.display = '';
            $badge.textContent = '🧩 ' + count + ' 技能已加载';
            $badge.title = (cfg.skills || []).filter(s => s.enabled).map(s => '· ' + s.name).join('\n');
        } else {
            $badge.style.display = 'none';
        }
    }

    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        document.getElementById('ai-cfg-baseurl').value = p.baseUrl;
        document.getElementById('ai-cfg-apikey').value  = p.apiKey;
        document.getElementById('ai-cfg-model').value   = p.model;
    }

    // ---------------- 系统提示词模板 ----------------
    function renderTemplateButtons() {
        const $box = document.getElementById('ai-tpl-list');
        if (!$box) return;
        const current = cfg.systemTemplate || 'default';
        $box.innerHTML = SYSTEM_TEMPLATES.map(t => {
            const active = t.id === current;
            return `<button type="button" class="ai-tpl-item${active ? ' active' : ''}" data-tpl-id="${t.id}" title="${escapeHtml(t.desc)}">
                <span class="ai-tpl-icon">${t.icon}</span>
                <span class="ai-tpl-name">${escapeHtml(t.name)}</span>
            </button>`;
        }).join('');
    }
    function applyTemplate(id) {
        const t = SYSTEM_TEMPLATES.find(x => x.id === id);
        if (!t) return;
        cfg.systemTemplate = id;
        document.getElementById('ai-cfg-system').value = t.content;
        renderTemplateButtons();
        showToast(`已切换：${t.name}`, 'success');
    }

    // ---------------- HTML 导出 ----------------
    function exportHtml() {
        const s = getCurrent();
        if (!s || s.messages.length === 0) {
            showToast('当前对话为空', 'warning');
            return;
        }
        const html = buildExportHtml(s);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${s.title.replace(/[^\w一-龥-]/g, '_').slice(0, 30)}-${formatTime(s.updatedAt)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('已导出 HTML', 'success');
    }

    // 导出为 Markdown（图片只做占位标注，避免 base64 把文件撞到几百 MB）
    function exportMarkdown() {
        const s = getCurrent();
        if (!s || s.messages.length === 0) { showToast('当前对话为空', 'warning'); return; }
        const lines = [`# ${s.title}`, '', `> 导出时间：${new Date().toLocaleString('zh-CN')}`, ''];
        for (const m of s.messages) {
            lines.push(`## ${m.role === 'user' ? '我' : 'AI 助手'}`, '');
            if (m.reasoning) {
                lines.push('<details><summary>💭 思考过程</summary>', '', m.reasoning, '', '</details>', '');
            }
            if (m.images && m.images.length) {
                lines.push(`> （附带 ${m.images.length} 张图片，未包含在 Markdown 中）`, '');
            }
            if (m.content) lines.push(m.content, '');
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${s.title.replace(/[^\w一-龥-]/g, '_').slice(0, 30)}-${formatTime(s.updatedAt)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('已导出 Markdown', 'success');
    }

    // 复制整段对话为纯文本
    function copyConversation() {
        const s = getCurrent();
        if (!s || s.messages.length === 0) { showToast('当前对话为空', 'warning'); return; }
        const text = s.messages.map(m => {
            const who = m.role === 'user' ? '我' : 'AI';
            const imgs = (m.images && m.images.length) ? `（${m.images.length}张图片）` : '';
            return `${who}：${m.content || ''}${imgs}`;
        }).join('\n\n');
        copyText(text);
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    function buildExportHtml(s) {
        // 导出时强制启用高亮(防止流式刚结束 _skipHighlight 没回收的边界情况)
        const savedSkip = _skipHighlight;
        _skipHighlight = false;
        try {
        const msgsHtml = s.messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const cls = isUser ? 'user' : 'assistant';
            const role = isUser ? '我' : 'AI 助手';
            const avatar = isUser ? '我' : 'AI';
            let body;
            if (isUser) {
                const safeImgs = (m.images || []).filter(src => typeof src === 'string' && /^data:image\//i.test(src));
                const imgs = safeImgs.length
                    ? '<div class="imgs">' + safeImgs.map(src => `<img src="${src}" alt="图片">`).join('') + '</div>'
                    : '';
                body = imgs + (m.content ? `<div class="text">${escapeHtml(m.content)}</div>` : '');
            } else {
                const think = m.reasoning
                    ? `<details class="think"><summary>💭 思考过程</summary><div class="think-inner">${renderMd(m.reasoning)}</div></details>`
                    : '';
                body = think + renderMd(m.content || '');
            }
            const time = m.ts ? new Date(m.ts).toLocaleString('zh-CN') : '';
            return `
            <div class="msg ${cls}">
                <div class="avatar">${avatar}</div>
                <div class="bubble">
                    <div class="meta-row"><span class="role">${role}</span><span class="time">${time}</span></div>
                    <div class="body">${body}</div>
                </div>
            </div>`;
        }).join('\n');

        const profile = getProfile();
        const modelName = escapeHtml(profile.model || '未知');
        const exportTime = new Date().toLocaleString('zh-CN');

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(s.title)} - AI 对话导出</title>
<style>
  :root {
    --bg: #f5f7fb;
    --panel: #ffffff;
    --text: #1f2328;
    --muted: #6b7280;
    --border: #e5e7eb;
    --primary: #4f46e5;
    --primary-soft: #eef2ff;
    --user-bg: linear-gradient(135deg,#6366f1,#8b5cf6);
    --user-text: #ffffff;
    --code-bg: #282c34;
    --code-text: #abb2bf;
    --inline-code-bg: #f3f4f6;
    --shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    font-size: 15px;
  }
  .wrap { max-width: 920px; margin: 0 auto; padding: 36px 24px 60px; }
  .header {
    background: linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
    color: #fff; padding: 28px 32px; border-radius: 16px;
    box-shadow: var(--shadow); margin-bottom: 28px;
  }
  .header h1 {
    margin: 0 0 10px; font-size: 24px; font-weight: 600; letter-spacing: .3px;
    word-break: break-word;
  }
  .header .meta {
    display: flex; flex-wrap: wrap; gap: 18px;
    font-size: 13px; opacity: .92;
  }
  .header .meta span { display: inline-flex; align-items: center; gap: 6px; }
  .header .meta b { font-weight: 500; }

  .msg { display: flex; gap: 12px; margin-bottom: 20px; align-items: flex-start; }
  .msg.user { flex-direction: row-reverse; }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; color: #fff;
    background: linear-gradient(135deg,#10b981,#059669);
  }
  .msg.user .avatar { background: var(--user-bg); }

  .bubble {
    max-width: calc(100% - 60px);
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px 18px;
    box-shadow: var(--shadow);
  }
  .msg.user .bubble {
    background: var(--user-bg); border-color: transparent; color: var(--user-text);
  }
  .msg.user .bubble .role,
  .msg.user .bubble .time { color: rgba(255,255,255,.85); }
  .msg.user .bubble a { color: #fff; text-decoration: underline; }

  .meta-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  .role { font-weight: 600; font-size: 13px; color: var(--primary); }
  .time { font-size: 11px; color: var(--muted); }

  .body { font-size: 15px; word-wrap: break-word; overflow-wrap: break-word; }
  .body > *:first-child { margin-top: 0; }
  .body > *:last-child { margin-bottom: 0; }
  .text { white-space: pre-wrap; word-break: break-word; }
  .imgs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .imgs img { max-width: 240px; max-height: 240px; border-radius: 8px; border: 1px solid var(--border); }
  .think { background: #f9fafb; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; margin: 8px 0; }
  .think summary { cursor: pointer; font-size: 13px; color: var(--muted); }
  .think-inner { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); font-size: 13px; color: var(--muted); }

  .body h1, .body h2, .body h3, .body h4 {
    margin: 18px 0 10px; font-weight: 600; line-height: 1.4;
  }
  .body h1 { font-size: 22px; border-bottom: 2px solid var(--border); padding-bottom: 6px; }
  .body h2 { font-size: 19px; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
  .body h3 { font-size: 17px; }
  .body h4 { font-size: 15px; color: var(--muted); }
  .body p { margin: 8px 0; }
  .body ul, .body ol { margin: 8px 0; padding-left: 26px; }
  .body li { margin: 4px 0; }

  pre {
    background: var(--code-bg); color: var(--code-text);
    padding: 14px 16px; border-radius: 8px; overflow-x: auto;
    font-size: 13px; line-height: 1.55; margin: 10px 0;
    font-family: 'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace;
  }
  pre code { background: transparent; padding: 0; color: inherit; font-size: inherit; }
  code {
    background: var(--inline-code-bg); padding: 2px 6px; border-radius: 4px;
    font-size: 13px;
    font-family: 'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace;
    color: #be185d;
  }
  .msg.user .bubble code {
    background: rgba(255,255,255,.2); color: #fff;
  }

  /* 代码块外壳:深色头部(语言标签 + 复制按钮) */
  .ai-code-block {
    background: #0d1117;
    border-radius: 8px;
    overflow: hidden;
    margin: 14px 0;
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 2px 8px rgba(0,0,0,.18);
  }
  .ai-code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px 6px 16px;
    background: linear-gradient(180deg, #1c2128 0%, #161b22 100%);
    border-bottom: 1px solid rgba(255,255,255,.08);
  }
  .ai-code-lang {
    color: #8b949e;
    font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: .5px;
    text-transform: lowercase;
    user-select: none;
  }
  .ai-code-copy-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,.14);
    color: #c9d1d9;
    padding: 3px 11px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
    transition: all .18s ease;
    display: inline-flex;
    align-items: center;
    line-height: 1;
  }
  .ai-code-copy-btn:hover {
    background: rgba(255,255,255,.08);
    border-color: rgba(255,255,255,.28);
    color: #fff;
  }
  .ai-code-copy-btn.copied {
    background: rgba(16,185,129,.18);
    border-color: rgba(16,185,129,.45);
    color: #6ee7b7;
  }
  .ai-code-block pre {
    margin: 0;
    background: transparent;
    padding: 14px 16px;
    border-radius: 0;
    overflow-x: auto;
    font-size: 12.5px;
    line-height: 1.62;
    color: #e6edf3;
    border: none;
  }
  .ai-code-block pre code {
    background: transparent;
    padding: 0;
    color: inherit;
    font-size: inherit;
    font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
  }
  /* 用户气泡里的代码块在浅色背景上仍保持深色外观 */
  .msg.user .ai-code-block { box-shadow: 0 2px 8px rgba(0,0,0,.3); }

  /* highlight.js · atom-one-dark 主题（内联,离线可用） */
  pre code.hljs{display:block;overflow-x:auto;padding:1em}
  code.hljs{padding:3px 5px}
  .hljs{color:#abb2bf;background:#282c34}
  .hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}
  .hljs-doctag,.hljs-formula,.hljs-keyword{color:#c678dd}
  .hljs-deletion,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-subst{color:#e06c75}
  .hljs-literal{color:#56b6c2}
  .hljs-addition,.hljs-attribute,.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#98c379}
  .hljs-attr,.hljs-number,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-pseudo,.hljs-template-variable,.hljs-type,.hljs-variable{color:#d19a66}
  .hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-symbol,.hljs-title{color:#61aeee}
  .hljs-built_in,.hljs-class .hljs-title,.hljs-title.class_{color:#e6c07b}
  .hljs-emphasis{font-style:italic}
  .hljs-strong{font-weight:700}
  .hljs-link{text-decoration:underline}

  blockquote {
    border-left: 4px solid var(--primary); margin: 10px 0;
    padding: 6px 14px; color: var(--muted); background: var(--primary-soft);
    border-radius: 0 6px 6px 0;
  }

  table { border-collapse: collapse; margin: 10px 0; width: 100%; font-size: 13px; }
  th, td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  tr:nth-child(even) td { background: #fafbfc; }

  hr { border: none; border-top: 1px solid var(--border); margin: 18px 0; }
  a { color: var(--primary); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .footer {
    margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border);
    color: var(--muted); font-size: 12px; text-align: center;
  }
  .footer a { color: var(--primary); }

  @media (max-width: 600px) {
    .wrap { padding: 18px 12px 40px; }
    .header { padding: 20px; border-radius: 12px; }
    .header h1 { font-size: 19px; }
    .bubble { padding: 12px 14px; max-width: calc(100% - 50px); }
    .avatar { width: 32px; height: 32px; font-size: 12px; }
  }
  @media print {
    body { background: #fff; }
    .header { background: #f3f4f6; color: #1f2328; box-shadow: none; }
    .msg { page-break-inside: avoid; }
    .bubble, pre { box-shadow: none; }
  }
</style>
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="icon-copy" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
  </svg>
  <div class="wrap">
    <div class="header">
      <h1>${escapeHtml(s.title)}</h1>
      <div class="meta">
        <span><b>导出</b> ${exportTime}</span>
        <span><b>消息</b> ${s.messages.length} 条</span>
        <span><b>模型</b> ${modelName}</span>
      </div>
    </div>
    ${msgsHtml}
    <div class="footer">由 <a href="#">红尘百宝箱 · AI 对话助手</a> 导出</div>
  </div>
  <script>
    // 离线"复制"按钮:点击复制代码块原文
    document.querySelectorAll('.ai-code-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.closest('.ai-code-block')?.querySelector('pre code');
        if (!code) return;
        const text = code.innerText;
        const fallback = () => {
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(fallback);
        } else { fallback(); }
        const originalText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '✓ 已复制';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = originalText; }, 1200);
      });
    });
  </script>
</body>
</html>`;
        } finally {
            _skipHighlight = savedSkip;
        }
    }

    // ---------------- 事件绑定 ----------------
    function bind() {
        // DOM 引用
        $msgs        = document.getElementById('ai-messages');
        $sessList    = document.getElementById('ai-sessions');
        $input       = document.getElementById('ai-input');
        $btnSend     = document.getElementById('ai-btn-send');
        $btnStop     = document.getElementById('ai-btn-stop');
        $modelTip    = document.getElementById('ai-model-tip');
        $connStatus  = document.getElementById('ai-conn-status');
        $tokTip      = document.getElementById('ai-token-tip');
        if (!$msgs) return; // 页面没渲染

        // 工具栏按钮
        document.getElementById('ai-btn-new').addEventListener('click', () => {
            createSession();
            renderSessions();
            renderMessages();
        });
        document.getElementById('ai-btn-settings').addEventListener('click', openSettings);
        document.getElementById('ai-btn-export').addEventListener('click', exportHtml);
        const $btnExportMd = document.getElementById('ai-btn-export-md');
        if ($btnExportMd) $btnExportMd.addEventListener('click', exportMarkdown);
        const $btnCopyConv = document.getElementById('ai-btn-copy-conv');
        if ($btnCopyConv) $btnCopyConv.addEventListener('click', copyConversation);
        document.getElementById('ai-btn-clear-msgs').addEventListener('click', () => {
            const s = getCurrent();
            if (!s) return;
            if (!confirm('清空当前对话的所有消息？此操作会同时清掉压缩摘要')) return;
            s.messages = [];
            delete s.compressed;
            s.updatedAt = Date.now();
            saveSessions();
            renderMessages();
            renderSessions();
        });

        // 发送 & 停止
        $btnSend.addEventListener('click', () => {
            const text = $input.value.trim();
            if (!text && !pendingImages.length) return;   // 允许只发图片
            if (isStreaming) {
                showToast('上一条还在生成中，请等待或点 ⏹ 停止', 'warning');
                return;
            }
            $input.value = '';
            const imgs = pendingImages.slice();
            pendingImages = [];
            renderPendingImages();
            sendMessage(text, imgs);
        });
        $btnStop.addEventListener('click', stopStreaming);

        // 图片：按钮 / 选择 / 删除 / 粘贴
        const $btnImg  = document.getElementById('ai-btn-image');
        const $fileImg = document.getElementById('ai-image-file');
        if ($btnImg && $fileImg) {
            $btnImg.addEventListener('click', () => $fileImg.click());
            $fileImg.addEventListener('change', async () => {
                for (const f of Array.from($fileImg.files || [])) {
                    try { addPendingImage(await compressImage(f)); }
                    catch (err) { showToast('图片处理失败：' + err.message, 'error'); }
                }
                $fileImg.value = '';
            });
        }
        const $imgPrev = document.getElementById('ai-image-preview');
        if ($imgPrev) {
            $imgPrev.addEventListener('click', e => {
                const btn = e.target.closest('[data-img-del]');
                if (btn) removePendingImage(parseInt(btn.getAttribute('data-img-del'), 10));
            });
        }
        // 取消编辑
        const $editHint = document.getElementById('ai-edit-hint');
        if ($editHint) {
            $editHint.addEventListener('click', e => {
                if (e.target.closest('#ai-edit-cancel')) {
                    _editingMsgIdx = null;
                    renderEditHint();
                    showToast('已取消编辑', 'info');
                }
            });
        }
        // 粘贴图片（Ctrl+V 直接贴截图）
        $input.addEventListener('paste', async e => {
            const items = Array.from(e.clipboardData?.items || []);
            const imgItems = items.filter(it => it.type && it.type.startsWith('image/'));
            if (!imgItems.length) return;
            e.preventDefault();
            // 剪贴板里同时带文字时，手动插回输入框，避免 preventDefault 把文字吞掉
            const pastedText = e.clipboardData.getData('text/plain');
            if (pastedText) {
                const start = $input.selectionStart ?? $input.value.length;
                const end   = $input.selectionEnd   ?? $input.value.length;
                $input.value = $input.value.slice(0, start) + pastedText + $input.value.slice(end);
                $input.selectionStart = $input.selectionEnd = start + pastedText.length;
            }
            for (const it of imgItems) {
                const f = it.getAsFile();
                if (!f) continue;
                try { addPendingImage(await compressImage(f)); }
                catch (err) { showToast('粘贴图片失败：' + err.message, 'error'); }
            }
        });
        $input.addEventListener('keydown', e => {
            // IME 候选状态时回车应该是"确认上屏",不能触发发送
            // - e.isComposing: 标准 IME 标志(Mac 中文/日文/韩文输入法都会设)
            // - e.keyCode === 229: 部分老 Safari/Firefox 在候选期 isComposing 为 false 时的兜底判断
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                if (isStreaming) {
                    showToast('上一条还在生成中，请等待或点 ⏹ 停止', 'warning');
                    return;
                }
                $btnSend.click();
            }
        });

        // 设置弹窗
        document.getElementById('ai-btn-close-settings').addEventListener('click', closeSettings);
        document.getElementById('ai-btn-cancel-settings').addEventListener('click', closeSettings);
        document.getElementById('ai-btn-save-settings').addEventListener('click', saveSettings);
        document.getElementById('ai-btn-fetch-models').addEventListener('click', fetchModels);
        document.getElementById('ai-btn-reset-system').addEventListener('click', () => {
            document.getElementById('ai-cfg-system').value = DEFAULT_SYSTEM;
            cfg.systemTemplate = 'default';
            renderTemplateButtons();
            showToast('已填入默认系统提示词', 'success');
        });
        // 系统提示词模板：事件委托
        const $tplBox = document.getElementById('ai-tpl-list');
        if ($tplBox) {
            $tplBox.addEventListener('click', e => {
                const btn = e.target.closest('.ai-tpl-item');
                if (btn) applyTemplate(btn.getAttribute('data-tpl-id'));
            });
        }
        document.querySelectorAll('.ai-preset').forEach(b => {
            b.addEventListener('click', () => applyPreset(b.getAttribute('data-preset')));
        });

        // 多模型：编辑列表事件委托（点条目切换正在编辑的模型；按钮"用"/"删"分发）
        const $pfList = document.getElementById('ai-profile-edit-list');
        if ($pfList) {
            $pfList.addEventListener('click', e => {
                const actBtn = e.target.closest('[data-act]');
                if (actBtn) {
                    e.stopPropagation();
                    const pid = actBtn.getAttribute('data-pid');
                    const act = actBtn.getAttribute('data-act');
                    if (act === 'use') setProfileAsCurrent(pid);
                    else if (act === 'del') deleteProfile(pid);
                    return;
                }
                const item = e.target.closest('.ai-profile-edit-item');
                if (item) {
                    // 切换前先保存当前表单到旧模型
                    saveFormToProfile();
                    loadProfileToForm(item.getAttribute('data-pid'));
                }
            });
        }
        const $pfAdd = document.getElementById('ai-cfg-profile-add');
        if ($pfAdd) $pfAdd.addEventListener('click', newProfile);

        // 顶部模型条：chip 切换 / 新建按钮（事件委托，profile bar 内容动态生成）
        const $pfBar = document.getElementById('ai-profile-bar');
        if ($pfBar) {
            $pfBar.addEventListener('click', e => {
                if (e.target.closest('#ai-profile-add-quick')) {
                    openSettings();
                    setTimeout(newProfile, 50);
                    return;
                }
                const chip = e.target.closest('.ai-profile-chip');
                if (chip) switchProfile(chip.getAttribute('data-pid'));
            });
        }

        // 技能区：勾选/编辑/删除（事件委托）+ 导入按钮
        const $skList = document.getElementById('ai-skill-list');
        if ($skList) {
            $skList.addEventListener('click', e => {
                const cb = e.target.closest('.ai-skill-check');
                if (cb) { toggleSkill(cb.getAttribute('data-sid')); return; }
                const ed = e.target.closest('.sk-edit');
                if (ed) { editSkill(ed.getAttribute('data-sid')); return; }
                const dl = e.target.closest('.sk-del');
                if (dl) { deleteSkill(dl.getAttribute('data-sid')); return; }
            });
        }
        const $skImport = document.getElementById('ai-skill-import');
        if ($skImport) $skImport.addEventListener('click', importSkillFromFile);
        const $skAdd = document.getElementById('ai-skill-add');
        if ($skAdd) $skAdd.addEventListener('click', addSkillManual);
        // 滑块值同步
        const bindRange = (rangeId, valId) => {
            const r = document.getElementById(rangeId);
            const v = document.getElementById(valId);
            r.addEventListener('input', () => { v.textContent = r.value; });
        };
        bindRange('ai-cfg-temperature', 'ai-cfg-temp-val');
        bindRange('ai-cfg-top-p', 'ai-cfg-topp-val');
        bindRange('ai-cfg-frequency-penalty', 'ai-cfg-fp-val');
        bindRange('ai-cfg-presence-penalty', 'ai-cfg-pp-val');
        // 点击弹窗外部不再关闭：避免编辑一半误触丢失（必须走 × / 取消 / 保存）

        // 会话列表点击（事件委托）
        $sessList.addEventListener('click', e => {
            const del = e.target.closest('.ai-session-del');
            if (del) {
                e.stopPropagation();
                if (!confirm('删除该会话？此操作不可撤销')) return;
                deleteSession(del.getAttribute('data-id'));
                renderSessions();
                renderMessages();
                return;
            }
            const item = e.target.closest('.ai-session-item');
            if (item) {
                currentId = item.getAttribute('data-id');
                localStorage.setItem(LS_CUR, currentId);
                renderSessions();
                renderMessages();
            }
        });

        // 记录思考块的展开状态（toggle 事件不冒泡，必须用捕获阶段）
        $msgs.addEventListener('toggle', e => {
            const d = e.target && e.target.closest ? e.target.closest('.ai-think-block') : null;
            if (!d) return;
            const wrap = d.closest('[data-msg-idx]');
            if (!wrap) return;
            const idx = parseInt(wrap.getAttribute('data-msg-idx'), 10);
            const s = getCurrent();
            if (s && s.messages[idx]) s.messages[idx].thinkOpen = d.open;
        }, true);

        // 代码块复制：用 mousedown 而非 click。
        // 原因：流式渲染每 80ms 会重写整条消息的 innerHTML，mousedown 和 mouseup
        // 之间 DOM 被替换时，浏览器不会合成 click（两个事件 target 不同），导致点了没反应。
        $msgs.addEventListener('mousedown', e => {
            const codeBtn = e.target.closest('.ai-code-copy-btn');
            if (!codeBtn) return;
            e.preventDefault();
            e.stopPropagation();
            const block = codeBtn.closest('.ai-code-block');
            const codeEl = block && block.querySelector('pre code');
            if (!codeEl) return;
            copyText(codeEl.textContent || '');
            const orig = codeBtn.innerHTML;
            codeBtn.innerHTML = '✓ 已复制';
            codeBtn.classList.add('copied');
            setTimeout(() => { codeBtn.innerHTML = orig; codeBtn.classList.remove('copied'); }, 1500);
        });

        // 消息区事件委托：复制/删除消息、复制代码块
        $msgs.addEventListener('click', e => {
            // 图片查看大图（data URL 无法直接顶层导航，会被浏览器拦截）
            const imgEl = e.target.closest('[data-img-view]');
            if (imgEl) { e.preventDefault(); openImageViewer(imgEl.getAttribute('src')); return; }
            // 代码块复制已在 mousedown 阶段处理（见上方）
            if (e.target.closest('.ai-code-copy-btn')) return;
            // 编辑用户消息
            const editBtn = e.target.closest('.ai-msg-edit');
            if (editBtn) {
                e.stopPropagation();
                startEditMessage(parseInt(editBtn.getAttribute('data-idx'), 10));
                return;
            }
            // 重新生成
            const regenBtn = e.target.closest('.ai-msg-regen');
            if (regenBtn) {
                e.stopPropagation();
                regenerateAt(parseInt(regenBtn.getAttribute('data-idx'), 10));
                return;
            }
            // 消息复制
            const copyBtn = e.target.closest('.ai-msg-copy');
            if (copyBtn) {
                e.stopPropagation();
                const i = parseInt(copyBtn.getAttribute('data-idx'));
                const s = getCurrent();
                if (s && s.messages[i]) copyText(s.messages[i].content);
                return;
            }
            // 消息删除
            const delBtn = e.target.closest('.ai-msg-del');
            if (delBtn) {
                e.stopPropagation();
                const i = parseInt(delBtn.getAttribute('data-idx'));
                const s = getCurrent();
                if (!s) return;
                s.messages.splice(i, 1);
                s.updatedAt = Date.now();
                saveSessions();
                renderMessages();
                renderSessions();
                return;
            }
        });
        // 智能滚动：监听用户是否上翻
        $msgs.addEventListener('scroll', () => {
            userNearBottom = isNearBottom();
        });

        // 切到 AI 页时刷新
        document.querySelectorAll('.nav-item[data-target="aichat"]').forEach(it => {
            it.addEventListener('click', () => {
                // 初次进入若没会话，自动创建一个
                if (sessions.length === 0) createSession();
                renderSessions();
                renderMessages();
                updateStatus();
            });
        });

        // 初次进入若 hash 已切到 aichat，刷新一次
        if (document.querySelector('.nav-item.active')?.getAttribute('data-target') === 'aichat') {
            if (sessions.length === 0) createSession();
            renderSessions();
            renderMessages();
        }
        updateStatus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
