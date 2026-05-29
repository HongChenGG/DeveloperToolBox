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
            maxTokens: 2048,
            contextLen: 20,
            frequencyPenalty: 0,
            presencePenalty: 0,
            stream: true,
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
    function saveSessions() {
        try {
            localStorage.setItem(LS_SES, JSON.stringify(sessions));
        } catch (e) {
            console.warn('[ai-chat] saveSessions 失败:', e.message);
            if (typeof showToast === 'function') {
                showToast('保存会话失败:' + (e.name === 'QuotaExceededError' ? 'localStorage 已满,请删除旧会话' : e.message), 'error');
            }
        }
    }

    function getCurrent() {
        return sessions.find(s => s.id === currentId);
    }

    function createSession() {
        const s = {
            id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            title: '新对话',
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
            const transcript = slice.map((m, i) => `[${i+1}][${m.role}] ${m.content}`).join('\n\n');
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
            const resp = await fetch(url, {
                method: 'POST', headers,
                body: JSON.stringify({
                    model: p.model,
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user',   content: compressPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 800,
                    stream: false
                })
            });
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
        const bubbles = $msgs.children;                 // 每条消息一个外层 div
        const anchor = bubbles[upTo];                   // 第 upTo 条之前插入
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
    function renderMd(text) {
        if (typeof marked === 'undefined') return escapeHtml(text);
        try {
            const parse = t => (typeof marked.parse === 'function' ? marked.parse(t) : marked(t));

            // 0) 预处理：中文 + ** 边界修复（CommonMark 不认 CJK 为单词边界）
            text = fixCjkMarkdown(text);

            // 1) 抽取 <think>...</think>（包括流式未闭合的情况），用占位符替换
            const thinkBlocks = [];
            let processed = text.replace(/<think>([\s\S]*?)<\/think>/gi, (m, inner) => {
                const html = parse(inner.trim() || '');
                thinkBlocks.push(`<details class="ai-think-block"><summary>💭 思考过程</summary><div class="ai-think-inner">${html}</div></details>`);
                return `\n\n${THINK_SEP}${thinkBlocks.length - 1}${THINK_SEP}\n\n`;
            });
            // 流式未闭合：最后一个 <think> 没有匹配的 </think>
            const lastOpen = processed.toLowerCase().lastIndexOf('<think>');
            if (lastOpen !== -1 && processed.toLowerCase().indexOf('</think>', lastOpen) === -1) {
                const before = processed.slice(0, lastOpen);
                const inner = processed.slice(lastOpen + 7);
                const html = parse(inner);
                thinkBlocks.push(`<details class="ai-think-block" open><summary>💭 思考中<span class="ai-thinking ai-thinking-inline"><span></span><span></span><span></span></span></summary><div class="ai-think-inner">${html}</div></details>`);
                processed = before + `\n\n${THINK_SEP}${thinkBlocks.length - 1}${THINK_SEP}\n\n`;
            }

            // 2) marked 渲染主体
            let html = parse(processed);

            // 3) 回填思考块（marked 可能把占位符包进 <p>）
            thinkBlocks.forEach((block, i) => {
                const tag = `${THINK_SEP}${i}${THINK_SEP}`;
                const inP = `<p>${tag}</p>`;
                html = html.split(inP).join(block).split(tag).join(block);
            });

            // 4) 增强代码块（加 header + 语言标签 + 复制按钮）
            return enhanceCodeBlocks(html);
        } catch {
            return escapeHtml(text);
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
        if (m.loading && !m.content) {
            // 流式开始前的"思考中"动画
            bodyHtml = `<div class="ai-thinking" aria-label="正在思考"><span></span><span></span><span></span></div>`;
        } else if (isUser) {
            bodyHtml = `<div style="white-space:pre-wrap;word-break:break-word">${escapeHtml(m.content)}</div>`;
        } else {
            bodyHtml = renderMd(m.content || '');
        }
        return `
            <div style="display:flex;justify-content:${align};animation:ai-fade-in 0.3s ease">
                <div class="${bubbleClass}" style="max-width:82%;padding:12px 16px;border-radius:12px;position:relative">
                    <div class="ai-msg-content">${bodyHtml}</div>
                    <div style="display:flex;gap:10px;margin-top:6px;font-size:11px;opacity:.55">
                        <span>${isUser ? '我' : '助手'}</span>
                        <button class="ai-msg-copy" data-idx="${idx}" style="background:none;border:none;color:inherit;cursor:pointer;padding:0;font-size:11px">📋 复制</button>
                        <button class="ai-msg-del" data-idx="${idx}" style="background:none;border:none;color:inherit;cursor:pointer;padding:0;font-size:11px">🗑️ 删除</button>
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
                updateLastAssistant(assistantMsg.content, true);

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
            assistantMsg.loading = false;
            updateLastAssistant(assistantMsg.content, true);
            return;
        }
        // 达到上限
        assistantMsg.content += '\n\n*[联网轮数已达上限，停止]*';
        updateLastAssistant(assistantMsg.content, true);
    }

    // ---------------- 流式聊天 ----------------
    async function sendMessage(userText) {
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

        s.messages.push({ role: 'user', content: userText, ts: Date.now() });
        // 自动取首条用户消息作为会话标题
        if (s.title === '新对话' && userText.trim()) {
            s.title = userText.trim().slice(0, 24);
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
            msgs.push(...remain.map(m => ({ role: m.role, content: m.content })));
        } else {
            const history = s.messages.slice(-Math.max(1, p.contextLen));
            msgs.push(...history.map(m => ({ role: m.role, content: m.content })));
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
                await readSSE(resp, chunk => {
                    if (assistantMsg.loading) assistantMsg.loading = false;
                    assistantMsg.content += chunk;
                    updateLastAssistant(assistantMsg.content);   // throttle 渲染
                });
                updateLastAssistant(assistantMsg.content, true); // 流结束补一次完整渲染
            } else {
                const data = await resp.json();
                const content = data?.choices?.[0]?.message?.content || '';
                assistantMsg.loading = false;
                assistantMsg.content = content;
                updateLastAssistant(content, true);
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
            updateLastAssistant(assistantMsg.content, true);
            saveSessions();
        } finally {
            isStreaming = false;
            abortCtrl = null;
            $btnSend.style.display = '';
            $btnStop.style.display = 'none';
        }

        // 回复完成后异步触发压缩（不阻塞用户继续输入）
        compressOldMessages(s);
    }

    // G: 流式渲染节流——每 80ms 至多渲一次；结束时主流程会再补渲一次保证完整
    let _lastRender = 0;
    function updateLastAssistant(content, force) {
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
        const bubbles = $msgs.querySelectorAll('.ai-bubble-assistant .ai-msg-content');
        const last = bubbles[bubbles.length - 1];
        if (last) {
            last.innerHTML = renderMd(content);
        } else {
            renderMessages();
        }
        scrollToBottom();
    }

    // 读取 SSE 流（OpenAI 兼容协议）
    async function readSSE(resp, onChunk) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buf = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            // 按行分割
            const lines = buf.split('\n');
            buf = lines.pop() || ''; // 留最后一段不完整的
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const payload = trimmed.slice(5).trim();
                if (payload === '[DONE]') return;
                try {
                    const obj = JSON.parse(payload);
                    const delta = obj?.choices?.[0]?.delta?.content
                               ?? obj?.choices?.[0]?.message?.content
                               ?? '';
                    if (delta) onChunk(delta);
                } catch {
                    // 忽略解析失败的行
                }
            }
        }
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
        p.maxTokens        = parseInt(document.getElementById('ai-cfg-max-tokens').value) || 2048;
        p.contextLen       = parseInt(document.getElementById('ai-cfg-context-len').value) || 20;
        p.frequencyPenalty = parseFloat(document.getElementById('ai-cfg-frequency-penalty').value);
        p.presencePenalty  = parseFloat(document.getElementById('ai-cfg-presence-penalty').value);
        p.stream           = document.getElementById('ai-cfg-stream').checked;
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
            else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); confirm(); }
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
            const body = isUser ? `<div class="text">${escapeHtml(m.content)}</div>` : renderMd(m.content);
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
            if (!text) return;
            if (isStreaming) {
                showToast('上一条还在生成中，请等待或点 ⏹ 停止', 'warning');
                return;
            }
            $input.value = '';
            sendMessage(text);
        });
        $btnStop.addEventListener('click', stopStreaming);
        $input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
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

        // 消息区事件委托：复制/删除消息、复制代码块
        $msgs.addEventListener('click', e => {
            // 代码块复制
            const codeBtn = e.target.closest('.ai-code-copy-btn');
            if (codeBtn) {
                e.stopPropagation();
                const block = codeBtn.closest('.ai-code-block');
                const codeEl = block?.querySelector('pre code');
                if (codeEl) {
                    copyText(codeEl.innerText);
                    const orig = codeBtn.innerHTML;
                    codeBtn.innerHTML = '✓ 已复制';
                    codeBtn.classList.add('copied');
                    setTimeout(() => { codeBtn.innerHTML = orig; codeBtn.classList.remove('copied'); }, 1500);
                }
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
