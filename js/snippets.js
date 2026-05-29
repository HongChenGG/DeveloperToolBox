// 代码片段管理器（localStorage）
(function() {
    const STORAGE_KEY = 'toolbox_snippets_v1';

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

        function load() {
            try { snippets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
            catch (e) { snippets = []; }
        }
        function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets)); }

        function getAllTags() {
            const s = new Set();
            snippets.forEach(sn => (sn.tags || []).forEach(t => s.add(t)));
            return [...s].sort();
        }

        function render() {
            // 标签过滤选项
            const curTag = filterTag.value;
            filterTag.innerHTML = '<option value="">全部标签</option>' + getAllTags().map(t => `<option value="${t}">${t}</option>`).join('');
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
                list.innerHTML = '<div style="padding:30px;color:var(--text-secondary);text-align:center">暂无片段</div>';
                return;
            }
            list.innerHTML = filtered.map(s => `
                <div class="snip-item" data-id="${s.id}" style="padding:10px;border-bottom:1px solid var(--border-color);cursor:pointer;${currentId === s.id ? 'background:var(--hover-bg)' : ''}">
                    <div style="font-weight:bold;color:var(--text-primary);margin-bottom:4px">${escapeHtml(s.title || '(无标题)')}</div>
                    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">${s.lang || ''} · ${new Date(s.updateAt || s.createAt).toLocaleString('zh-CN', {hour12:false})}</div>
                    <div>${(s.tags || []).map(t => `<span style="display:inline-block;padding:1px 6px;background:var(--accent-color);color:white;border-radius:8px;font-size:10px;margin-right:3px">${escapeHtml(t)}</span>`).join('')}</div>
                </div>
            `).join('');
            list.querySelectorAll('.snip-item').forEach(el => {
                el.addEventListener('click', () => {
                    currentId = el.getAttribute('data-id');
                    edit(snippets.find(x => x.id === currentId));
                    render();
                });
            });
        }

        function escapeHtml(s) { return (s + '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

        function edit(s) {
            if (!s) return;
            empty.style.display = 'none';
            editor.style.display = 'flex';
            title.value = s.title || '';
            tags.value = (s.tags || []).join(', ');
            lang.value = s.lang || 'text';
            content.value = s.content || '';
        }

        function blank() {
            currentId = 'new-' + Date.now();
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
            const data = {
                title: title.value.trim() || '(无标题)',
                tags: tags.value.split(/[,，\s]+/).filter(Boolean),
                lang: lang.value,
                content: content.value,
                updateAt: Date.now()
            };
            const idx = snippets.findIndex(x => x.id === currentId);
            if (idx >= 0) Object.assign(snippets[idx], data);
            else snippets.unshift({ id: currentId, createAt: Date.now(), ...data });
            save(); render();
            showToast && showToast('已保存', 'success');
        });
        btnDel && btnDel.addEventListener('click', () => {
            if (!currentId) return;
            if (!confirm('确定删除？')) return;
            snippets = snippets.filter(x => x.id !== currentId);
            save(); currentId = null;
            editor.style.display = 'none';
            empty.style.display = 'flex';
            render();
        });
        btnCopy && btnCopy.addEventListener('click', () => {
            if (!content.value) return;
            navigator.clipboard.writeText(content.value).then(() => showToast && showToast('已复制', 'success'));
        });
        btnExport && btnExport.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'snippets-' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
        });
        btnImport && btnImport.addEventListener('click', () => importFile.click());
        importFile && importFile.addEventListener('change', e => {
            const f = e.target.files[0];
            if (!f) return;
            // 限制文件大小:JSON 配置文件不该超过 10MB,防误导大文件爆浏览器
            if (f.size > 10 * 1024 * 1024) {
                showToast && showToast('文件过大(>10MB),不像是片段配置,已拒绝', 'error');
                importFile.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const arr = JSON.parse(reader.result);
                    if (!Array.isArray(arr)) throw new Error('文件格式错误');
                    snippets = [...arr, ...snippets];
                    save(); render();
                    showToast && showToast('导入 ' + arr.length + ' 条', 'success');
                } catch (err) { showToast && showToast('导入失败: ' + err.message, 'error'); }
            };
            reader.readAsText(f);
            importFile.value = '';
        });
        search && search.addEventListener('input', render);
        filterTag && filterTag.addEventListener('change', render);

        load(); render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
