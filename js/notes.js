// 会议纪要工具逻辑 (独立文件)
(function() {
    'use strict';
    
    const MEETINGS_STORAGE_KEY = 'meetings_data_v2';
    let meetingsData = {};
    let currentMeetingId = null;
    let editingNoteId = null;
    let modalMode = 'new-meeting';

    // 初始化
    function init() {
        loadMeetingsFromStorage();
        bindEvents();
        renderMeetingsList();
    }

    // 从localStorage加载数据
    function loadMeetingsFromStorage() {
        try {
            const stored = localStorage.getItem(MEETINGS_STORAGE_KEY);
            if (stored) {
                meetingsData = JSON.parse(stored);
            }
        } catch (e) {
            console.error('加载会议数据失败:', e);
        }
    }

    // 保存到localStorage
    function saveMeetingsToStorage() {
        try {
            localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetingsData));
        } catch (e) {
            console.error('保存会议数据失败:', e);
            showToast('保存失败，可能是存储空间不足', 'error');
        }
    }

    // 绑定事件
    function bindEvents() {
        // 新建会议
        document.getElementById('btn-new-meeting')?.addEventListener('click', () => {
            openModal('new-meeting');
        });

        // 添加记录
        document.getElementById('btn-add-record')?.addEventListener('click', () => {
            if (!currentMeetingId) return;
            openModal('add-record');
        });

        // 删除会议
        document.getElementById('btn-delete-meeting')?.addEventListener('click', deleteMeeting);

        // 导出纪要
        document.getElementById('btn-note-export')?.addEventListener('click', exportNotes);

        // 清空所有
        document.getElementById('btn-note-clear-all')?.addEventListener('click', clearAllMeetings);

        // 搜索
        document.getElementById('meeting-search')?.addEventListener('input', (e) => {
            renderMeetingsList(e.target.value);
        });

        // 弹窗按钮
        document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
        document.getElementById('btn-modal-cancel')?.addEventListener('click', closeModal);
        document.getElementById('btn-modal-save')?.addEventListener('click', saveModal);

        // 点击弹窗外部关闭
        document.getElementById('note-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'note-modal') {
                closeModal();
            }
        });
    }

    // 打开弹窗
    function openModal(mode, noteId = null) {
        modalMode = mode;
        editingNoteId = noteId;
        const modal = document.getElementById('note-modal');
        const modalTitleEl = document.getElementById('modal-title');
        const modalMeetingInput = document.getElementById('modal-meeting-input');
        const modalMeetingTitle = document.getElementById('modal-meeting-title');
        const modalNoteContent = document.getElementById('modal-note-content');
        const modalNoteType = document.getElementById('modal-note-type');
        const modalNotePerson = document.getElementById('modal-note-person');

        // 清空表单
        modalMeetingTitle.value = '';
        modalNoteContent.value = '';
        modalNoteType.value = '议题';
        modalNotePerson.value = '';

        if (mode === 'new-meeting') {
            modalTitleEl.textContent = '新建会议';
            modalMeetingInput.style.display = 'block';
            modalNoteType.parentElement.parentElement.style.display = 'grid'; // 显示类型选择
        } else if (mode === 'add-record') {
            modalTitleEl.textContent = '添加记录';
            modalMeetingInput.style.display = 'none';
            modalNoteType.parentElement.parentElement.style.display = 'none'; // 隐藏类型选择
        } else if (mode === 'edit-record' && noteId) {
            modalTitleEl.textContent = '编辑记录';
            modalMeetingInput.style.display = 'none';
            modalNoteType.parentElement.parentElement.style.display = 'none'; // 隐藏类型选择
            // 填充数据
            const meeting = meetingsData[currentMeetingId];
            const note = meeting.notes.find(n => n.id === noteId);
            if (note) {
                modalNoteContent.value = note.content;
                modalNoteType.value = note.type;
                modalNotePerson.value = note.person || '';
            }
        }

        modal.style.display = 'flex';
    }

    // 关闭弹窗
    function closeModal() {
        document.getElementById('note-modal').style.display = 'none';
    }

    // 保存弹窗
    function saveModal() {
        const modalMeetingTitle = document.getElementById('modal-meeting-title');
        const modalNoteContent = document.getElementById('modal-note-content');
        const modalNoteType = document.getElementById('modal-note-type');
        const modalNotePerson = document.getElementById('modal-note-person');

        if (modalMode === 'new-meeting') {
            const title = modalMeetingTitle.value.trim();
            const content = modalNoteContent.value.trim();
            
            if (!title) {
                showToast('请输入会议主题', 'warning');
                return;
            }
            if (!content) {
                showToast('请输入记录内容', 'warning');
                return;
            }

            // 创建新会议
            const meetingId = 'meeting_' + Date.now();
            const meetingType = modalNoteType.value; // 保存会议类型
            meetingsData[meetingId] = {
                id: meetingId,
                title: title,
                type: meetingType, // 保存会议的类型
                notes: [{
                    id: Date.now(),
                    content: content,
                    type: meetingType, // 第一条记录使用相同类型
                    person: modalNotePerson.value.trim(),
                    timestamp: new Date().toLocaleString('zh-CN')
                }],
                createdAt: new Date().toLocaleString('zh-CN'),
                updatedAt: new Date().toLocaleString('zh-CN')
            };

            saveMeetingsToStorage();
            renderMeetingsList();
            selectMeeting(meetingId);
            closeModal();
            showToast('会议创建成功', 'success');

        } else if (modalMode === 'add-record') {
            const content = modalNoteContent.value.trim();
            if (!content) {
                showToast('请输入记录内容', 'warning');
                return;
            }

            const meeting = meetingsData[currentMeetingId];
            // 使用会议的类型，而不是让用户选择
            meeting.notes.push({
                id: Date.now(),
                content: content,
                type: meeting.type || '议题', // 使用会议的类型
                person: modalNotePerson.value.trim(),
                timestamp: new Date().toLocaleString('zh-CN')
            });
            meeting.updatedAt = new Date().toLocaleString('zh-CN');

            saveMeetingsToStorage();
            renderCurrentMeetingNotes();
            renderMeetingsList();
            closeModal();
            showToast('记录添加成功', 'success');

        } else if (modalMode === 'edit-record') {
            const content = modalNoteContent.value.trim();
            if (!content) {
                showToast('请输入记录内容', 'warning');
                return;
            }

            const meeting = meetingsData[currentMeetingId];
            const note = meeting.notes.find(n => n.id === editingNoteId);
            if (note) {
                note.content = content;
                // 编辑时不改变类型，保持原有类型
                note.person = modalNotePerson.value.trim();
                note.updatedAt = new Date().toLocaleString('zh-CN');
            }
            meeting.updatedAt = new Date().toLocaleString('zh-CN');

            saveMeetingsToStorage();
            renderCurrentMeetingNotes();
            renderMeetingsList();
            closeModal();
            showToast('记录更新成功', 'success');
        }
    }

    // 渲染会议列表
    function renderMeetingsList(searchTerm = '') {
        const meetingsList = document.getElementById('meetings-list');
        const meetings = Object.values(meetingsData);

        // 搜索过滤
        const filtered = searchTerm 
            ? meetings.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
            : meetings;

        // 按更新时间排序
        filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        if (filtered.length === 0) {
            meetingsList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 40px 20px;">暂无会议，请点击"新建会议"</div>';
            return;
        }

        meetingsList.innerHTML = filtered.map(meeting => `
            <div class="meeting-item ${meeting.id === currentMeetingId ? 'active' : ''}" onclick="selectMeeting('${meeting.id}')">
                <div class="meeting-item-title">${escapeHtml(meeting.title)}</div>
                <div class="meeting-item-info">
                    <span>${meeting.notes.length} 条记录</span>
                    <span>${meeting.updatedAt.split(' ')[0]}</span>
                </div>
            </div>
        `).join('');
    }

    // 选择会议
    window.selectMeeting = function(meetingId) {
        currentMeetingId = meetingId;
        document.getElementById('notes-empty-state').style.display = 'none';
        document.getElementById('notes-detail').style.display = 'flex';
        
        const meeting = meetingsData[meetingId];
        document.getElementById('current-meeting-title').textContent = meeting.title;
        document.getElementById('current-meeting-info').textContent = 
            `创建于 ${meeting.createdAt} · 最后更新 ${meeting.updatedAt} · ${meeting.notes.length} 条记录`;

        renderCurrentMeetingNotes();
        renderMeetingsList();
    };

    // 渲染当前会议的记录
    function renderCurrentMeetingNotes() {
        if (!currentMeetingId) return;
        
        const meeting = meetingsData[currentMeetingId];
        const notesList = document.getElementById('current-notes-list');

        if (meeting.notes.length === 0) {
            notesList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无记录，点击"添加记录"开始</div>';
            return;
        }

        notesList.innerHTML = meeting.notes.map((note, index) => `
            <div class="note-item">
                <div class="note-item-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: var(--accent-color); font-weight: bold; font-size: 16px;">#${index + 1}</span>
                    </div>
                    <span class="note-item-type note-type-${note.type}">${note.type}</span>
                </div>
                <div class="note-item-content">${escapeHtml(note.content)}</div>
                <div class="note-item-footer">
                    <div>
                        <span>时间：${note.timestamp}</span>
                        ${note.person ? `<span style="margin-left: 15px;">负责人：${escapeHtml(note.person)}</span>` : ''}
                    </div>
                    <div class="note-item-actions">
                        <button class="btn-edit" onclick="editNote(${note.id})">编辑</button>
                        <button class="btn-delete" onclick="deleteNote(${note.id})">删除</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 编辑记录
    window.editNote = function(noteId) {
        openModal('edit-record', noteId);
    };

    // 删除记录
    window.deleteNote = function(noteId) {
        if (!confirm('确定要删除这条记录吗？')) return;

        const meeting = meetingsData[currentMeetingId];
        meeting.notes = meeting.notes.filter(n => n.id !== noteId);
        meeting.updatedAt = new Date().toLocaleString('zh-CN');

        saveMeetingsToStorage();
        renderCurrentMeetingNotes();
        renderMeetingsList();
        showToast('记录已删除', 'info');
    };

    // 删除会议
    function deleteMeeting() {
        if (!currentMeetingId) return;
        if (!confirm('确定要删除整个会议及其所有记录吗？此操作不可恢复！')) return;

        delete meetingsData[currentMeetingId];
        currentMeetingId = null;

        saveMeetingsToStorage();
        renderMeetingsList();
        
        document.getElementById('notes-detail').style.display = 'none';
        document.getElementById('notes-empty-state').style.display = 'flex';
        
        showToast('会议已删除', 'info');
    }

    // 导出纪要
    function exportNotes() {
        const meetings = Object.values(meetingsData);
        if (meetings.length === 0) {
            showToast('暂无会议可导出', 'warning');
            return;
        }

        let content = '='.repeat(60) + '\n';
        content += '会议纪要汇总\n';
        content += '='.repeat(60) + '\n\n';

        meetings.forEach(meeting => {
            content += `\n会议主题：${meeting.title}\n`;
            content += `创建时间：${meeting.createdAt}\n`;
            content += `更新时间：${meeting.updatedAt}\n`;
            content += '-'.repeat(60) + '\n\n';

            meeting.notes.forEach((note, index) => {
                content += `${index + 1}. [【${note.type}】] ${note.content}\n`;
                if (note.person) {
                    content += `   负责人：${note.person}\n`;
                }
                content += `   时间：${note.timestamp}\n\n`;
            });
        });

        content += '\n' + '='.repeat(60) + '\n';
        content += `总计：${meetings.length} 个会议，${meetings.reduce((sum, m) => sum + m.notes.length, 0)} 条记录\n`;
        content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
        content += '='.repeat(60) + '\n';

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `会议纪要_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('纪要导出成功', 'success');
    }

    // 清空所有
    function clearAllMeetings() {
        const meetings = Object.values(meetingsData);
        if (meetings.length === 0) {
            showToast('暂无会议', 'info');
            return;
        }

        if (!confirm(`确定要清空所有 ${meetings.length} 个会议吗？此操作不可恢复！`)) return;

        meetingsData = {};
        currentMeetingId = null;
        saveMeetingsToStorage();
        renderMeetingsList();
        
        document.getElementById('notes-detail').style.display = 'none';
        document.getElementById('notes-empty-state').style.display = 'flex';
        
        showToast('已清空所有会议', 'info');
    }

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
