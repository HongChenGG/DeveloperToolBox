// 代码片段管理器（localStorage）
(function() {
    'use strict';

    const STORAGE_KEY = 'toolbox_snippets_v1';

    // 片段数据仅包含 JSON 值，克隆后修改可避免保存失败时污染内存。
    function cloneSnippets(value) {
        return JSON.parse(JSON.stringify(value));
    }

    // 逐项校验本地片段，避免合法 JSON 中的语义损坏绕过恢复流程。
    function validateStoredSnippets(storedSnippets) {
        if (!Array.isArray(storedSnippets)) throw new Error('片段数据格式错误');
        const snippetIds = new Set();

        storedSnippets.forEach((snippet, index) => {
            if (!snippet || typeof snippet !== 'object' || Array.isArray(snippet)) {
                throw new Error(`第 ${index + 1} 条片段格式错误`);
            }
            if (typeof snippet.id !== 'string' || snippet.id.length === 0 || snippetIds.has(snippet.id)) {
                throw new Error(`第 ${index + 1} 条片段 ID 无效或重复`);
            }
            snippetIds.add(snippet.id);
            if (typeof snippet.title !== 'string') throw new Error(`第 ${index + 1} 条片段标题格式错误`);
            if (!Array.isArray(snippet.tags) || snippet.tags.some(tag => typeof tag !== 'string')) {
                throw new Error(`第 ${index + 1} 条片段标签格式错误`);
            }
            if (typeof snippet.lang !== 'string') throw new Error(`第 ${index + 1} 条片段语言格式错误`);
            if (typeof snippet.content !== 'string') throw new Error(`第 ${index + 1} 条片段内容格式错误`);
            if (!Number.isFinite(snippet.createAt) || !Number.isFinite(snippet.updateAt)) {
                throw new Error(`第 ${index + 1} 条片段时间格式错误`);
            }
        });
    }

    // 解析存储内容；损坏时返回恢复信息并阻止覆盖原键。
    function parseSnippetsStorage(rawValue, timestamp = Date.now()) {
        if (rawValue === null || rawValue === '') {
            return { data: [], recovery: null, writeBlocked: false };
        }

        try {
            const parsedSnippets = JSON.parse(rawValue);
            validateStoredSnippets(parsedSnippets);
            return {
                data: cloneSnippets(parsedSnippets),
                recovery: null,
                writeBlocked: false
            };
        } catch (error) {
            return {
                data: [],
                recovery: {
                    key: `${STORAGE_KEY}_recovery_${timestamp}`,
                    rawValue
                },
                writeBlocked: true
            };
        }
    }

    // 保存 next state，并以 boolean 明确返回持久化结果。
    function trySaveSnippets(storage, nextSnippets, writeBlocked = false) {
        if (writeBlocked) return false;

        try {
            storage.setItem(STORAGE_KEY, JSON.stringify(nextSnippets));
            return true;
        } catch (error) {
            return false;
        }
    }

    // 导入前先逐项完成全部校验，避免校验中途产生部分结果。
    function validateImportedSnippets(importedSnippets) {
        if (!Array.isArray(importedSnippets)) throw new Error('文件格式错误');

        importedSnippets.forEach((item, index) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error(`第 ${index + 1} 条片段格式错误`);
            }
            if (item.tags !== undefined && !Array.isArray(item.tags)) {
                throw new Error(`第 ${index + 1} 条片段标签格式错误`);
            }
        });
    }

    // 校验全部通过后再规范化，并始终使用新生成的导入 ID。
    function normalizeImportedSnippets(importedSnippets, importedAt, createId) {
        validateImportedSnippets(importedSnippets);
        const idFactory = createId || ((item, index) => `import-${importedAt}-${index}`);

        return importedSnippets.map((item, index) => ({
            id: idFactory(item, index),
            title: String(item.title || '(无标题)'),
            tags: (item.tags || []).map(tag => String(tag)),
            lang: String(item.lang || 'text'),
            content: String(item.content || ''),
            createAt: Number(item.createAt) || importedAt,
            updateAt: Number(item.updateAt) || importedAt
        }));
    }

    // CommonJS 仅导出无 DOM 依赖的核心逻辑，浏览器路径继续执行界面初始化。
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            STORAGE_KEY,
            cloneSnippets,
            normalizeImportedSnippets,
            parseSnippetsStorage,
            trySaveSnippets,
            validateImportedSnippets,
            validateStoredSnippets
        };
        return;
    }

    // 优先使用浏览器原生 UUID，兼容环境使用时间和随机数组合。
    function createSnippetId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `snippet-${crypto.randomUUID()}`;
        }
        return `snippet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function init() {
        const list = document.getElementById('snip-list');
        if (!list) return;
        const search = document.getElementById('snip-search');
        const filterTag = document.getElementById('snip-filter-tag');
        const editor = document.getElementById('snip-editor');
        const title = document.getElementById('snip-title');
        const tags = document.getElementById('snip-tags');
        const lang = document.getElementById('snip-lang');
        const content = document.getElementById('snip-content');
        const empty = document.getElementById('snip-empty');
        const btnNew = document.getElementById('btn-snip-new');
        const btnSave = document.getElementById('btn-snip-save');
        const btnDel = document.getElementById('btn-snip-del');
        const btnCopy = document.getElementById('btn-snip-copy');
        const btnExport = document.getElementById('btn-snip-export');
        const btnImport = document.getElementById('btn-snip-import');
        const importFile = document.getElementById('snip-import-file');

        let snippets = [];
        let currentId = null;
        let storageRecovery = null;
        let storageWriteBlocked = false;

        // 从 localStorage 加载片段，并尽力另存损坏原文。
        function load() {
            try {
                const result = parseSnippetsStorage(localStorage.getItem(STORAGE_KEY), Date.now());
                snippets = result.data;
                storageRecovery = result.recovery;
                storageWriteBlocked = result.writeBlocked;

                if (storageRecovery) {
                    try {
                        localStorage.setItem(storageRecovery.key, storageRecovery.rawValue);
                    } catch (error) {
                        console.error('保存片段恢复副本失败:', error);
                    }
                }
            } catch (error) {
                snippets = [];
                storageWriteBlocked = true;
                console.error('读取片段数据失败:', error);
            }
        }

        // 保存 next state，失败时不替换当前内存状态。
        function save(nextSnippets) {
            const saved = trySaveSnippets(localStorage, nextSnippets, storageWriteBlocked);
            if (!saved) {
                const message = storageRecovery
                    ? '检测到损坏的片段数据，已禁止覆盖原存储，请先下载恢复文件'
                    : '保存失败，可能是存储空间不足或本地存储已禁用';
                console.error('保存片段数据失败');
                if (typeof showToast === 'function') showToast(message, 'error');
            }
            return saved;
        }

        // 在现有工具栏中动态提供损坏数据下载入口。
        function createStorageRecoveryButton() {
            if (!storageRecovery || document.getElementById('snippets-storage-recovery-download')) return;
            if (!btnExport) return;

            const recoveryButton = document.createElement('button');
            recoveryButton.type = 'button';
            recoveryButton.id = 'snippets-storage-recovery-download';
            recoveryButton.className = 'btn btn-warning';
            recoveryButton.textContent = '下载损坏数据';
            recoveryButton.addEventListener('click', () => {
                if (typeof downloadFile !== 'function') {
                    if (typeof showToast === 'function') showToast('恢复文件下载功能不可用', 'error');
                    return;
                }
                downloadFile(storageRecovery.rawValue, `${storageRecovery.key}.txt`);
            });
            btnExport.insertAdjacentElement('afterend', recoveryButton);
            if (typeof showToast === 'function') {
                showToast('片段数据损坏，已保留原始数据并阻止覆盖', 'warning');
            }
        }

        function getAllTags() {
            const s = new Set();
            snippets.forEach(sn => (sn.tags || []).forEach(t => s.add(t)));
            return [...s].sort();
        }

        function render() {
            // 标签过滤选项
            const curTag = filterTag.value;
            const allTagsOption = document.createElement('option');
            allTagsOption.value = '';
            allTagsOption.textContent = '全部标签';
            const tagOptions = getAllTags().map(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                return option;
            });
            filterTag.replaceChildren(allTagsOption, ...tagOptions);
            filterTag.value = curTag;

            const q = (search.value || '').toLowerCase();
            const tagF = filterTag.value;
            const filtered = snippets.filter(s => {
                if (tagF && !(s.tags || []).includes(tagF)) return false;
                if (!q) return true;
                return (s.title || '').toLowerCase().includes(q) ||
                       (s.content || '').toLowerCase().includes(q) ||
                       (s.tags || []).join(',').toLowerCase().includes(q);
            });
            if (!filtered.length) {
                const emptyMessage = document.createElement('div');
                emptyMessage.style.padding = '1.875rem';
                emptyMessage.style.color = 'var(--text-secondary)';
                emptyMessage.style.textAlign = 'center';
                emptyMessage.textContent = '暂无片段';
                list.replaceChildren(emptyMessage);
                return;
            }

            const fragment = document.createDocumentFragment();
            filtered.forEach(snippet => {
                const item = document.createElement('div');
                item.className = 'snip-item';
                item.dataset.id = String(snippet.id ?? '');
                item.style.padding = '0.625rem';
                item.style.borderBottom = '1px solid var(--border-color)';
                item.style.cursor = 'pointer';
                if (String(currentId) === String(snippet.id)) {
                    item.style.background = 'var(--hover-bg)';
                }

                const titleElement = document.createElement('div');
                titleElement.style.fontWeight = 'bold';
                titleElement.style.color = 'var(--text-primary)';
                titleElement.style.marginBottom = '0.25rem';
                titleElement.textContent = snippet.title || '(无标题)';

                const metaElement = document.createElement('div');
                metaElement.style.fontSize = '0.6875rem';
                metaElement.style.color = 'var(--text-secondary)';
                metaElement.style.marginBottom = '0.25rem';
                metaElement.textContent = `${snippet.lang || ''} · ${new Date(snippet.updateAt || snippet.createAt).toLocaleString('zh-CN', { hour12: false })}`;

                const tagsElement = document.createElement('div');
                (Array.isArray(snippet.tags) ? snippet.tags : []).forEach(tag => {
                    const tagElement = document.createElement('span');
                    tagElement.style.display = 'inline-block';
                    tagElement.style.padding = '0.0625rem 0.375rem';
                    tagElement.style.background = 'var(--accent-color)';
                    tagElement.style.color = 'white';
                    tagElement.style.borderRadius = '0.5rem';
                    tagElement.style.fontSize = '0.625rem';
                    tagElement.style.marginRight = '0.1875rem';
                    tagElement.textContent = String(tag);
                    tagsElement.appendChild(tagElement);
                });

                item.append(titleElement, metaElement, tagsElement);
                item.addEventListener('click', () => {
                    currentId = item.dataset.id;
                    edit(snippets.find(candidate => String(candidate.id) === currentId));
                    render();
                });
                fragment.appendChild(item);
            });

            list.replaceChildren(fragment);
        }

        function edit(snippet) {
            if (!snippet) return;
            empty.style.display = 'none';
            editor.style.display = 'flex';
            title.value = snippet.title || '';
            tags.value = (snippet.tags || []).join(', ');
            lang.value = snippet.lang || 'text';
            content.value = snippet.content || '';
        }

        function blank() {
            currentId = createSnippetId();
            empty.style.display = 'none';
            editor.style.display = 'flex';
            title.value = '';
            tags.value = '';
            lang.value = 'sql';
            content.value = '';
            title.focus();
        }

        btnNew && btnNew.addEventListener('click', blank);
        btnSave && btnSave.addEventListener('click', () => {
            if (!currentId) return;

            // 保存编辑内容时先修改克隆，持久化成功后再替换当前列表。
            const timestamp = Date.now();
            const nextSnippets = cloneSnippets(snippets);
            const nextData = {
                title: title.value.trim() || '(无标题)',
                tags: tags.value.split(/[,，\s]+/).filter(Boolean),
                lang: lang.value,
                content: content.value,
                updateAt: timestamp
            };
            const snippetIndex = nextSnippets.findIndex(
                snippet => String(snippet.id) === String(currentId)
            );
            if (snippetIndex >= 0) {
                Object.assign(nextSnippets[snippetIndex], nextData);
            } else {
                nextSnippets.unshift({ id: currentId, createAt: timestamp, ...nextData });
            }

            if (!save(nextSnippets)) return;
            snippets = nextSnippets;
            render();
            if (typeof showToast === 'function') showToast('已保存', 'success');
        });
        btnDel && btnDel.addEventListener('click', () => {
            if (!currentId) return;
            if (!confirm('确定删除？')) return;

            // 删除前先保存候选状态，失败时保留编辑器和当前选择。
            const nextSnippets = snippets.filter(
                snippet => String(snippet.id) !== String(currentId)
            );
            if (!save(nextSnippets)) return;
            snippets = nextSnippets;
            currentId = null;
            editor.style.display = 'none';
            empty.style.display = 'flex';
            render();
        });
        btnCopy && btnCopy.addEventListener('click', () => {
            if (!content.value) return;
            copyToClipboard(content.value);
        });
        btnExport && btnExport.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            a.href = objectUrl;
            a.download = 'snippets-' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(objectUrl);
        });
        btnImport && btnImport.addEventListener('click', () => importFile.click());
        importFile && importFile.addEventListener('change', event => {
            const selectedFile = event.target.files[0];
            if (!selectedFile) return;

            // JSON 配置文件不应超过 10MB，避免误选大文件拖垮浏览器。
            if (selectedFile.size > 10 * 1024 * 1024) {
                if (typeof showToast === 'function') {
                    showToast('文件过大(>10MB),不像是片段配置,已拒绝', 'error');
                }
                importFile.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const importedSnippets = JSON.parse(reader.result);
                    const importedAt = Date.now();
                    const normalizedSnippets = normalizeImportedSnippets(
                        importedSnippets,
                        importedAt,
                        createSnippetId
                    );
                    const nextSnippets = [...normalizedSnippets, ...cloneSnippets(snippets)];

                    if (!save(nextSnippets)) return;
                    snippets = nextSnippets;
                    render();
                    if (typeof showToast === 'function') {
                        showToast('导入 ' + normalizedSnippets.length + ' 条', 'success');
                    }
                } catch (error) {
                    if (typeof showToast === 'function') {
                        showToast('导入失败: ' + error.message, 'error');
                    }
                }
            };
            reader.readAsText(selectedFile);
            importFile.value = '';
        });
        search && search.addEventListener('input', render);
        filterTag && filterTag.addEventListener('change', render);

        load();
        createStorageRecoveryButton();
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
