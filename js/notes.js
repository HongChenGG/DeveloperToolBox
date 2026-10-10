// 会议纪要工具逻辑（独立文件）
(function() {
    'use strict';

    const MEETINGS_STORAGE_KEY = 'meetings_data_v2';

    // 会议数据只包含 JSON 值，使用序列化克隆可避免修改当前内存状态。
    function cloneMeetingsData(value) {
        return JSON.parse(JSON.stringify(value));
    }

    // 将旧版日期字符串迁移为毫秒时间戳，无法识别的值保持原样以避免数据丢失。
    function migrateTimestamp(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value !== 'string' || !value.trim()) return value;

        const timestamp = Date.parse(value);
        return Number.isFinite(timestamp) ? timestamp : value;
    }

    // 迁移会议及记录中的全部持久化日期字段；其他字段必须逐项验证，禁止修补未知结构。
    function migrateMeetingsData(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('会议数据格式错误');
        }

        const migratedMeetings = cloneMeetingsData(value);
        Object.entries(migratedMeetings).forEach(([storageMeetingId, meeting]) => {
            if (!meeting || typeof meeting !== 'object' || Array.isArray(meeting)) {
                throw new Error('会议条目格式错误');
            }
            if (typeof meeting.id !== 'string' && typeof meeting.id !== 'number') {
                throw new Error('会议 ID 格式错误');
            }
            if (String(meeting.id) !== storageMeetingId) {
                throw new Error('会议 ID 与存储键不一致');
            }
            if (typeof meeting.title !== 'string' || typeof meeting.type !== 'string') {
                throw new Error('会议文本字段格式错误');
            }
            if (!Array.isArray(meeting.notes)) {
                throw new Error('会议记录列表格式错误');
            }

            meeting.createdAt = migrateRequiredTimestamp(meeting.createdAt, '会议创建时间');
            meeting.updatedAt = migrateRequiredTimestamp(meeting.updatedAt, '会议更新时间');
            meeting.notes.forEach(note => {
                if (!note || typeof note !== 'object' || Array.isArray(note)) {
                    throw new Error('会议记录格式错误');
                }
                if (typeof note.id !== 'string' && typeof note.id !== 'number') {
                    throw new Error('会议记录 ID 格式错误');
                }
                if (typeof note.content !== 'string' || typeof note.type !== 'string') {
                    throw new Error('会议记录文本字段格式错误');
                }
                if (note.person !== undefined && typeof note.person !== 'string') {
                    throw new Error('会议记录负责人格式错误');
                }

                note.timestamp = migrateRequiredTimestamp(note.timestamp, '会议记录时间');
                if (note.updatedAt !== undefined) {
                    note.updatedAt = migrateRequiredTimestamp(note.updatedAt, '会议记录更新时间');
                }
            });
        });
        return migratedMeetings;
    }

    // 只有有限数值或可明确解析的旧日期字符串才属于支持的时间字段。
    function migrateRequiredTimestamp(value, fieldName) {
        const migratedValue = migrateTimestamp(value);
        if (typeof migratedValue !== 'number' || !Number.isFinite(migratedValue)) {
            throw new Error(`${fieldName}格式错误`);
        }
        return migratedValue;
    }

    // 解析存储内容；仅完整符合当前结构或可明确识别的旧日期格式才能进入内存。
    function parseMeetingsStorage(rawValue, timestamp = Date.now()) {
        if (rawValue === null || rawValue === '') {
            return { data: {}, recovery: null, writeBlocked: false };
        }

        try {
            return {
                data: migrateMeetingsData(JSON.parse(rawValue)),
                recovery: null,
                writeBlocked: false
            };
        } catch (error) {
            return {
                data: {},
                recovery: {
                    key: `${MEETINGS_STORAGE_KEY}_recovery_${timestamp}`,
                    rawValue
                },
                writeBlocked: true
            };
        }
    }

    // 保存 next state，并以 boolean 明确返回持久化结果。
    function trySaveMeetings(storage, nextMeetingsData, writeBlocked = false) {
        if (writeBlocked) return false;

        try {
            storage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(nextMeetingsData));
            return true;
        } catch (error) {
            return false;
        }
    }

    // 日期仅在显示边界格式化，持久化层始终保留时间戳。
    function formatMeetingTimestamp(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN');
    }

    // CommonJS 仅导出无 DOM 依赖的核心逻辑，浏览器路径继续执行界面初始化。
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            MEETINGS_STORAGE_KEY,
            cloneMeetingsData,
            formatMeetingTimestamp,
            migrateMeetingsData,
            parseMeetingsStorage,
            trySaveMeetings
        };
        return;
    }

    let meetingsData = {};
    let currentMeetingId = null;
    let editingNoteId = null;
    let modalMode = 'new-meeting';
    let storageRecovery = null;
    let storageWriteBlocked = false;

    // 初始化
    function init() {
        loadMeetingsFromStorage();
        bindEvents();
        createStorageRecoveryButton();
        renderMeetingsList();
    }

    // 从 localStorage 加载数据，并尽力另存损坏原文。
    function loadMeetingsFromStorage() {
        try {
            const result = parseMeetingsStorage(
                localStorage.getItem(MEETINGS_STORAGE_KEY),
                Date.now()
            );
            meetingsData = result.data;
            storageRecovery = result.recovery;
            storageWriteBlocked = result.writeBlocked;

            if (storageRecovery) {
                try {
                    localStorage.setItem(storageRecovery.key, storageRecovery.rawValue);
                } catch (error) {
                    console.error('保存会议恢复副本失败:', error);
                }
            }
        } catch (error) {
            meetingsData = {};
            storageWriteBlocked = true;
            console.error('读取会议数据失败:', error);
        }
    }

    // 保存 next state，失败时不替换当前内存状态。
    function saveMeetingsToStorage(nextMeetingsData) {
        const saved = trySaveMeetings(localStorage, nextMeetingsData, storageWriteBlocked);
        if (!saved) {
            const message = storageRecovery
                ? '检测到损坏的会议数据，已禁止覆盖原存储，请先下载恢复文件'
                : '保存失败，可能是存储空间不足或本地存储已禁用';
            console.error('保存会议数据失败');
            showToast(message, 'error');
        }
        return saved;
    }

    // 在现有工具栏中动态提供损坏数据下载入口。
    function createStorageRecoveryButton() {
        if (!storageRecovery || document.getElementById('notes-storage-recovery-download')) return;

        const exportButton = document.getElementById('btn-note-export');
        if (!exportButton) return;

        const recoveryButton = document.createElement('button');
        recoveryButton.type = 'button';
        recoveryButton.id = 'notes-storage-recovery-download';
        recoveryButton.className = 'btn btn-warning';
        recoveryButton.textContent = '下载损坏数据';
        recoveryButton.addEventListener('click', () => {
            if (typeof downloadFile !== 'function') {
                showToast('恢复文件下载功能不可用', 'error');
                return;
            }
            downloadFile(storageRecovery.rawValue, `${storageRecovery.key}.txt`);
        });
        exportButton.insertAdjacentElement('afterend', recoveryButton);
        showToast('会议数据损坏，已保留原始数据并阻止覆盖', 'warning');
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
        document.getElementById('meeting-search')?.addEventListener('input', (event) => {
            renderMeetingsList(event.target.value);
        });

        // 会议和记录 ID 只保留在 DOM 对象引用中，避免持久化字段进入 HTML 属性或内联事件。
        document.getElementById('meetings-list')?.addEventListener('click', (event) => {
            const meetingItem = event.target.closest('.meeting-item');
            const meeting = meetingItem?.__meetingReference;
            if (!meeting) return;
            selectMeeting(meeting.id);
        });

        document.getElementById('current-notes-list')?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('button');
            const noteItem = actionButton?.closest('.note-item');
            if (!actionButton || !noteItem) return;

            const note = noteItem.__noteReference;
            if (!note) return;
            if (actionButton.classList.contains('btn-edit')) {
                openModal('edit-record', note.id);
            } else if (actionButton.classList.contains('btn-delete')) {
                deleteNote(note.id);
            }
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

            // 克隆后构造新会议，持久化成功后才替换内存状态。
            const timestamp = Date.now();
            const meetingId = `meeting_${timestamp}`;
            const meetingType = modalNoteType.value;
            const nextMeetingsData = cloneMeetingsData(meetingsData);
            nextMeetingsData[meetingId] = {
                id: meetingId,
                title,
                type: meetingType,
                notes: [{
                    id: timestamp,
                    content,
                    type: meetingType,
                    person: modalNotePerson.value.trim(),
                    timestamp
                }],
                createdAt: timestamp,
                updatedAt: timestamp
            };

            if (!saveMeetingsToStorage(nextMeetingsData)) return;
            meetingsData = nextMeetingsData;
            renderMeetingsList();
            window.selectMeeting(meetingId);
            closeModal();
            showToast('会议创建成功', 'success');

        } else if (modalMode === 'add-record') {
            const content = modalNoteContent.value.trim();
            if (!content) {
                showToast('请输入记录内容', 'warning');
                return;
            }

            // 添加记录同样先写入克隆，避免失败时污染当前会议。
            const timestamp = Date.now();
            const nextMeetingsData = cloneMeetingsData(meetingsData);
            const nextMeeting = nextMeetingsData[currentMeetingId];
            if (!nextMeeting) return;

            nextMeeting.notes.push({
                id: timestamp,
                content,
                type: nextMeeting.type || '议题',
                person: modalNotePerson.value.trim(),
                timestamp
            });
            nextMeeting.updatedAt = timestamp;

            if (!saveMeetingsToStorage(nextMeetingsData)) return;
            meetingsData = nextMeetingsData;
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

            // 编辑只修改克隆中的目标记录，类型保持原值。
            const timestamp = Date.now();
            const nextMeetingsData = cloneMeetingsData(meetingsData);
            const nextMeeting = nextMeetingsData[currentMeetingId];
            const nextNote = nextMeeting?.notes.find(note => note.id === editingNoteId);
            if (!nextMeeting || !nextNote) return;

            nextNote.content = content;
            nextNote.person = modalNotePerson.value.trim();
            nextNote.updatedAt = timestamp;
            nextMeeting.updatedAt = timestamp;

            if (!saveMeetingsToStorage(nextMeetingsData)) return;
            meetingsData = nextMeetingsData;
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
        const normalizedSearchTerm = searchTerm.toLowerCase();
        const filteredMeetings = searchTerm
            ? meetings.filter(meeting => meeting.title.toLowerCase().includes(normalizedSearchTerm))
            : meetings;

        // 按毫秒时间戳排序，不修改原始会议对象。
        filteredMeetings.sort((firstMeeting, secondMeeting) => (
            Number(secondMeeting.updatedAt) - Number(firstMeeting.updatedAt)
        ));

        meetingsList.replaceChildren();
        if (filteredMeetings.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.color = 'var(--text-secondary)';
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '2.5rem 1.25rem';
            emptyState.textContent = '暂无会议，请点击“新建会议”';
            meetingsList.appendChild(emptyState);
            return;
        }

        filteredMeetings.forEach(meeting => {
            const meetingItem = document.createElement('div');
            meetingItem.className = 'meeting-item';
            meetingItem.classList.toggle('active', meeting.id === currentMeetingId);
            meetingItem.__meetingReference = meeting;

            const title = document.createElement('div');
            title.className = 'meeting-item-title';
            title.textContent = meeting.title;

            const meetingInfo = document.createElement('div');
            meetingInfo.className = 'meeting-item-info';

            const noteCount = document.createElement('span');
            noteCount.textContent = `${meeting.notes.length} 条记录`;

            const updatedDate = document.createElement('span');
            updatedDate.textContent = formatMeetingTimestamp(meeting.updatedAt).split(' ')[0];

            meetingInfo.append(noteCount, updatedDate);
            meetingItem.append(title, meetingInfo);
            meetingsList.appendChild(meetingItem);
        });
    }

    // 选择会议
    function selectMeeting(meetingId) {
        const meeting = meetingsData[meetingId];
        if (!meeting) return;

        currentMeetingId = meetingId;
        document.getElementById('notes-empty-state').style.display = 'none';
        document.getElementById('notes-detail').style.display = 'flex';

        document.getElementById('current-meeting-title').textContent = meeting.title;
        document.getElementById('current-meeting-info').textContent =
            `创建于 ${formatMeetingTimestamp(meeting.createdAt)} · 最后更新 ${formatMeetingTimestamp(meeting.updatedAt)} · ${meeting.notes.length} 条记录`;

        renderCurrentMeetingNotes();
        renderMeetingsList();
    }

    window.selectMeeting = selectMeeting;

    // 渲染当前会议的记录
    function renderCurrentMeetingNotes() {
        if (!currentMeetingId) return;

        const meeting = meetingsData[currentMeetingId];
        const notesList = document.getElementById('current-notes-list');
        if (!meeting || !notesList) return;

        notesList.replaceChildren();
        if (meeting.notes.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.color = 'var(--text-secondary)';
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '2.5rem';
            emptyState.textContent = '暂无记录，点击“添加记录”开始';
            notesList.appendChild(emptyState);
            return;
        }

        meeting.notes.forEach((note, index) => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.__noteReference = note;

            const header = document.createElement('div');
            header.className = 'note-item-header';

            const sequenceContainer = document.createElement('div');
            sequenceContainer.style.display = 'flex';
            sequenceContainer.style.alignItems = 'center';
            sequenceContainer.style.gap = '0.625rem';

            const sequence = document.createElement('span');
            sequence.style.color = 'var(--accent-color)';
            sequence.style.fontWeight = 'bold';
            sequence.style.fontSize = '1rem';
            sequence.textContent = `#${index + 1}`;
            sequenceContainer.appendChild(sequence);

            const noteType = document.createElement('span');
            noteType.className = 'note-item-type';
            noteType.textContent = note.type;
            header.append(sequenceContainer, noteType);

            const content = document.createElement('div');
            content.className = 'note-item-content';
            content.textContent = note.content;

            const footer = document.createElement('div');
            footer.className = 'note-item-footer';

            const metadata = document.createElement('div');
            const timestamp = document.createElement('span');
            timestamp.textContent = `时间：${formatMeetingTimestamp(note.timestamp)}`;
            metadata.appendChild(timestamp);

            if (note.person) {
                const person = document.createElement('span');
                person.style.marginLeft = '0.9375rem';
                person.textContent = `负责人：${note.person}`;
                metadata.appendChild(person);
            }

            const actions = document.createElement('div');
            actions.className = 'note-item-actions';

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'btn-edit';
            editButton.textContent = '编辑';

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn-delete';
            deleteButton.textContent = '删除';

            actions.append(editButton, deleteButton);
            footer.append(metadata, actions);
            noteItem.append(header, content, footer);
            notesList.appendChild(noteItem);
        });
    }

    // 编辑记录
    window.editNote = function(noteId) {
        openModal('edit-record', noteId);
    };

    // 删除记录
    function deleteNote(noteId) {
        if (!confirm('确定要删除这条记录吗？')) return;

        // 删除记录先写入克隆，保存失败时保留当前详情。
        const nextMeetingsData = cloneMeetingsData(meetingsData);
        const nextMeeting = nextMeetingsData[currentMeetingId];
        if (!nextMeeting) return;

        nextMeeting.notes = nextMeeting.notes.filter(note => note.id !== noteId);
        nextMeeting.updatedAt = Date.now();

        if (!saveMeetingsToStorage(nextMeetingsData)) return;
        meetingsData = nextMeetingsData;
        renderCurrentMeetingNotes();
        renderMeetingsList();
        showToast('记录已删除', 'info');
    }

    // 删除会议
    function deleteMeeting() {
        if (!currentMeetingId) return;
        if (!confirm('确定要删除整个会议及其所有记录吗？此操作不可恢复！')) return;

        // 删除会议先持久化克隆，失败时保持当前选择和界面。
        const nextMeetingsData = cloneMeetingsData(meetingsData);
        delete nextMeetingsData[currentMeetingId];

        if (!saveMeetingsToStorage(nextMeetingsData)) return;
        meetingsData = nextMeetingsData;
        currentMeetingId = null;
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
            content += `创建时间：${formatMeetingTimestamp(meeting.createdAt)}\n`;
            content += `更新时间：${formatMeetingTimestamp(meeting.updatedAt)}\n`;
            content += '-'.repeat(60) + '\n\n';

            meeting.notes.forEach((note, index) => {
                content += `${index + 1}. [【${note.type}】] ${note.content}\n`;
                if (note.person) {
                    content += `   负责人：${note.person}\n`;
                }
                content += `   时间：${formatMeetingTimestamp(note.timestamp)}\n\n`;
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

        // 清空也走同一事务顺序，避免持久化失败后界面被提前清空。
        const nextMeetingsData = {};
        if (!saveMeetingsToStorage(nextMeetingsData)) return;

        meetingsData = nextMeetingsData;
        currentMeetingId = null;
        renderMeetingsList();

        document.getElementById('notes-detail').style.display = 'none';
        document.getElementById('notes-empty-state').style.display = 'flex';

        showToast('已清空所有会议', 'info');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
