// 备忘录提醒
// - 添加 {时间, 内容}；存 localStorage
// - 每次打开页面扫描"已到期 && 未确认"，依次弹窗提醒
// - 点"知道了"标记 confirmed=true → 永久不再提醒
// - 点"稍后再说" → 仅本次会话不再弹，下次打开页面继续提醒
// - 列表内每条可"取消提醒"（删除）
(function () {
    'use strict';

    const REMINDERS_STORAGE_KEY = 'toolbox_reminders';

    // 提醒数据仅包含 JSON 值，克隆后修改可保持保存失败时的内存一致性。
    function cloneReminderItems(value) {
        return JSON.parse(JSON.stringify(value));
    }

    // 解析存储内容；提醒字段逐项校验，未知结构只进入恢复流程。
    function parseRemindersStorage(rawValue, timestamp = Date.now()) {
        if (rawValue === null || rawValue === '') {
            return { data: [], recovery: null, writeBlocked: false };
        }

        try {
            const parsedItems = JSON.parse(rawValue);
            if (!Array.isArray(parsedItems)) throw new Error('提醒数据格式错误');

            parsedItems.forEach(reminder => {
                if (!reminder || typeof reminder !== 'object' || Array.isArray(reminder)) {
                    throw new Error('提醒条目格式错误');
                }
                if (typeof reminder.id !== 'string' && typeof reminder.id !== 'number') {
                    throw new Error('提醒 ID 格式错误');
                }
                if (typeof reminder.at !== 'number' || !Number.isFinite(reminder.at)) {
                    throw new Error('提醒时间格式错误');
                }
                if (typeof reminder.content !== 'string' || typeof reminder.confirmed !== 'boolean') {
                    throw new Error('提醒字段格式错误');
                }
                if (typeof reminder.createdAt !== 'number' || !Number.isFinite(reminder.createdAt)) {
                    throw new Error('提醒创建时间格式错误');
                }
            });

            return {
                data: cloneReminderItems(parsedItems),
                recovery: null,
                writeBlocked: false
            };
        } catch (error) {
            return {
                data: [],
                recovery: {
                    key: `${REMINDERS_STORAGE_KEY}_recovery_${timestamp}`,
                    rawValue
                },
                writeBlocked: true
            };
        }
    }

    // 保存 next state，并以 boolean 明确返回持久化结果。
    function trySaveReminders(storage, nextItems, writeBlocked = false) {
        if (writeBlocked) return false;

        try {
            storage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(nextItems));
            return true;
        } catch (error) {
            return false;
        }
    }

    // 将扫描到的新到期提醒追加到现有队列，保留原顺序并消除重复项。
    function mergeReminderQueue(currentQueue, reminderItems, now, snoozedIds, currentId = null) {
        const snoozedSet = snoozedIds instanceof Set ? snoozedIds : new Set(snoozedIds || []);
        const eligibleIds = new Set(
            reminderItems
                .filter(reminder => (
                    !reminder.confirmed
                    && reminder.at <= now
                    && !snoozedSet.has(reminder.id)
                    && reminder.id !== currentId
                ))
                .map(reminder => reminder.id)
        );
        const nextQueue = [];
        const queuedIds = new Set();

        currentQueue.forEach(reminderId => {
            if (!eligibleIds.has(reminderId) || queuedIds.has(reminderId)) return;
            queuedIds.add(reminderId);
            nextQueue.push(reminderId);
        });
        reminderItems.forEach(reminder => {
            if (!eligibleIds.has(reminder.id) || queuedIds.has(reminder.id)) return;
            queuedIds.add(reminder.id);
            nextQueue.push(reminder.id);
        });

        return nextQueue;
    }

    // 出队前重新读取当前状态，跳过已确认、已稍后处理和重复项。
    function takeNextReminder(currentQueue, reminderItems, now, snoozedIds) {
        const snoozedSet = snoozedIds instanceof Set ? snoozedIds : new Set(snoozedIds || []);
        const remainingQueue = [...currentQueue];
        const checkedIds = new Set();

        while (remainingQueue.length > 0) {
            const reminderId = remainingQueue.shift();
            if (checkedIds.has(reminderId)) continue;
            checkedIds.add(reminderId);

            const reminder = reminderItems.find(candidate => candidate.id === reminderId);
            const canShow = reminder
                && !reminder.confirmed
                && reminder.at <= now
                && !snoozedSet.has(reminderId);
            if (!canShow) continue;

            return {
                reminder,
                queue: remainingQueue.filter(queuedId => queuedId !== reminderId)
            };
        }

        return { reminder: null, queue: [] };
    }

    // CommonJS 仅导出无 DOM 依赖的核心逻辑，浏览器路径继续执行界面初始化。
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            REMINDERS_STORAGE_KEY,
            cloneReminderItems,
            mergeReminderQueue,
            parseRemindersStorage,
            takeNextReminder,
            trySaveReminders
        };
        return;
    }

    let items = [];
    let storageRecovery = null;
    let storageWriteBlocked = false;
    const snoozedThisSession = new Set();

    // 从 localStorage 加载提醒，并尽力另存损坏原文。
    function loadRemindersFromStorage() {
        try {
            const result = parseRemindersStorage(
                localStorage.getItem(REMINDERS_STORAGE_KEY),
                Date.now()
            );
            items = result.data;
            storageRecovery = result.recovery;
            storageWriteBlocked = result.writeBlocked;

            if (storageRecovery) {
                try {
                    localStorage.setItem(storageRecovery.key, storageRecovery.rawValue);
                } catch (error) {
                    console.error('保存提醒恢复副本失败:', error);
                }
            }
        } catch (error) {
            items = [];
            storageWriteBlocked = true;
            console.error('读取提醒数据失败:', error);
        }
    }

    // 保存 next state，失败时不替换当前内存状态。
    function save(nextItems) {
        const saved = trySaveReminders(localStorage, nextItems, storageWriteBlocked);
        if (!saved) {
            const message = storageRecovery
                ? '检测到损坏的提醒数据，已禁止覆盖原存储，请先下载恢复文件'
                : '保存失败，可能是存储空间不足或本地存储已禁用';
            console.error('保存提醒数据失败');
            if (typeof showToast === 'function') showToast(message, 'error');
        }
        return saved;
    }

    // 在现有工具栏中动态提供损坏数据下载入口。
    function createStorageRecoveryButton() {
        if (!storageRecovery || document.getElementById('reminder-storage-recovery-download')) return;

        const clearButton = document.getElementById('rem-clear-done');
        if (!clearButton) return;

        const recoveryButton = document.createElement('button');
        recoveryButton.type = 'button';
        recoveryButton.id = 'reminder-storage-recovery-download';
        recoveryButton.className = 'btn btn-warning';
        recoveryButton.textContent = '下载损坏数据';
        recoveryButton.addEventListener('click', () => {
            if (typeof downloadFile !== 'function') {
                if (typeof showToast === 'function') showToast('恢复文件下载功能不可用', 'error');
                return;
            }
            downloadFile(storageRecovery.rawValue, `${storageRecovery.key}.txt`);
        });
        clearButton.insertAdjacentElement('afterend', recoveryButton);
        if (typeof showToast === 'function') {
            showToast('提醒数据损坏，已保留原始数据并阻止覆盖', 'warning');
        }
    }

    function genId() {
        return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    function fmtTime(ts) {
        const d = new Date(ts);
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function fmtRelative(ts) {
        const diff = ts - Date.now();
        const abs = Math.abs(diff);
        const min = Math.round(abs / 60000);
        const hr  = Math.round(abs / 3600000);
        const day = Math.round(abs / 86400000);
        let txt;
        if (abs < 60000)        txt = '不到 1 分钟';
        else if (min < 60)       txt = min + ' 分钟';
        else if (hr  < 24)       txt = hr  + ' 小时';
        else                     txt = day + ' 天';
        return diff < 0 ? '已过期 ' + txt : '还有 ' + txt;
    }

    // ---------- 列表渲染 ----------
    function createEmptyReminderState() {
        const emptyState = document.createElement('div');
        emptyState.style.margin = 'auto';
        emptyState.style.textAlign = 'center';
        emptyState.style.color = 'var(--text-secondary)';
        emptyState.style.fontSize = '0.875rem';
        emptyState.style.padding = '2.5rem 1.25rem';

        const icon = document.createElement('div');
        icon.style.fontSize = '3rem';
        icon.style.marginBottom = '0.75rem';
        icon.textContent = '📝';

        const title = document.createElement('div');
        title.style.fontSize = '1rem';
        title.style.color = 'var(--text-primary)';
        title.style.marginBottom = '0.375rem';
        title.textContent = '还没有提醒';

        const description = document.createElement('div');
        description.style.fontSize = '0.75rem';
        description.textContent = '在上方添加一条吧，到点会自动弹窗提醒';

        emptyState.append(icon, title, description);
        return emptyState;
    }

    function createReminderCard(reminder, now) {
        const overdue = !reminder.confirmed && reminder.at <= now;
        const stateClass = reminder.confirmed
            ? 'rem-state-done'
            : (overdue ? 'rem-state-overdue' : 'rem-state-pending');
        const stateText = reminder.confirmed
            ? '已确认'
            : (overdue ? '已过期 · 待提醒' : '待提醒');

        const card = document.createElement('div');
        card.className = `rem-card ${stateClass}`;
        card.__reminderReference = reminder;

        const timeContainer = document.createElement('div');
        timeContainer.className = 'rem-card-time';

        const time = document.createElement('div');
        time.className = 'rem-card-time-main';
        time.textContent = fmtTime(reminder.at);

        const relativeTime = document.createElement('div');
        relativeTime.className = 'rem-card-time-rel';
        relativeTime.textContent = fmtRelative(reminder.at);
        timeContainer.append(time, relativeTime);

        const body = document.createElement('div');
        body.className = 'rem-card-body';

        const content = document.createElement('div');
        content.className = 'rem-card-content';
        content.textContent = reminder.content;

        const state = document.createElement('div');
        state.className = 'rem-card-state';
        state.textContent = stateText;
        body.append(content, state);

        const actions = document.createElement('div');
        actions.className = 'rem-card-actions';

        if (!reminder.confirmed) {
            const acknowledgeButton = document.createElement('button');
            acknowledgeButton.type = 'button';
            acknowledgeButton.className = 'rem-act rem-act-ack';
            acknowledgeButton.title = '标记为已确认（不再提醒）';
            acknowledgeButton.textContent = '✓ 已知';
            actions.appendChild(acknowledgeButton);
        }

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'rem-act rem-act-del';
        deleteButton.title = '取消并删除此提醒';
        deleteButton.textContent = '✕ 取消';
        actions.appendChild(deleteButton);

        card.append(timeContainer, body, actions);
        return card;
    }

    function appendReminderGroup(list, titleText, reminderItems, now) {
        if (reminderItems.length === 0) return;

        const title = document.createElement('div');
        title.className = 'rem-group-title';
        title.textContent = `${titleText} (${reminderItems.length})`;
        list.appendChild(title);
        reminderItems.forEach(reminder => list.appendChild(createReminderCard(reminder, now)));
    }

    function render() {
        const $list  = document.getElementById('rem-list');
        const $tt    = document.getElementById('rem-stat-total');
        const $tp    = document.getElementById('rem-stat-pending');
        const $td    = document.getElementById('rem-stat-done');
        if (!$list) return;

        // 排序仅用于展示，避免渲染过程修改内存顺序。
        const sortedItems = [...items].sort((firstItem, secondItem) => firstItem.at - secondItem.at);
        const now = Date.now();
        const pending = sortedItems.filter(reminder => !reminder.confirmed && reminder.at <= now);
        const future = sortedItems.filter(reminder => reminder.at > now);
        const done = sortedItems.filter(reminder => reminder.confirmed);

        if ($tt) $tt.textContent = items.length;
        if ($tp) $tp.textContent = pending.length;
        if ($td) $td.textContent = done.length;

        $list.replaceChildren();
        if (items.length === 0) {
            $list.appendChild(createEmptyReminderState());
            return;
        }

        appendReminderGroup($list, '⏰ 已过期待确认', pending, now);
        appendReminderGroup($list, '📅 未来提醒', future, now);
        appendReminderGroup($list, '✓ 已确认', done, now);
    }

    // ---------- 增删改 ----------
    function add(at, content) {
        if (!at || !content.trim()) return false;

        // 新增提醒先写入克隆，保存成功后再替换当前内存。
        const nextItems = cloneReminderItems(items);
        nextItems.push({
            id: genId(),
            at,
            content: content.trim(),
            confirmed: false,
            createdAt: Date.now()
        });

        if (!save(nextItems)) return false;
        items = nextItems;
        render();
        return true;
    }

    function ack(id) {
        // 确认操作失败时保留原状态和当前提醒弹窗。
        const nextItems = cloneReminderItems(items);
        const nextReminder = nextItems.find(reminder => reminder.id === id);
        if (!nextReminder) return false;

        nextReminder.confirmed = true;
        if (!save(nextItems)) return false;
        items = nextItems;
        render();
        return true;
    }

    function del(id) {
        // 删除操作先持久化候选状态，失败时列表保持不变。
        const nextItems = items.filter(reminder => reminder.id !== id);
        if (!save(nextItems)) return false;
        items = nextItems;
        render();
        return true;
    }

    // ---------- 到期弹窗 ----------
    let modalQueue = [];
    let modalShowing = false;

    function scanAndPrompt() {
        const now = Date.now();
        const modal = document.getElementById('rem-modal');
        const currentId = modalShowing ? modal?.dataset.currentId || null : null;
        modalQueue = mergeReminderQueue(
            modalQueue,
            items,
            now,
            snoozedThisSession,
            currentId
        );
        showNext();
    }

    function showNext() {
        if (modalShowing) return;

        // 展示前复核当前内存，避免已确认或已稍后处理的提醒再次弹出。
        const nextResult = takeNextReminder(
            modalQueue,
            items,
            Date.now(),
            snoozedThisSession
        );
        modalQueue = nextResult.queue;
        const reminder = nextResult.reminder;
        if (!reminder) return;

        const $modal = document.getElementById('rem-modal');
        const $time  = document.getElementById('rem-modal-time');
        const $body  = document.getElementById('rem-modal-content');
        if (!$modal) return;
        modalShowing = true;
        $time.textContent = `预定时间：${fmtTime(reminder.at)} · ${fmtRelative(reminder.at)}`;
        $body.textContent = reminder.content;
        $modal.style.display = 'flex';
        $modal.dataset.currentId = reminder.id;
    }

    function closeModal() {
        const $modal = document.getElementById('rem-modal');
        if (!$modal) return;
        $modal.style.display = 'none';
        delete $modal.dataset.currentId;
        modalShowing = false;
        // 衔接下一条
        setTimeout(showNext, 200);
    }

    function init() {
        const $list  = document.getElementById('rem-list');
        if (!$list) return; // 页面尚未挂载

        loadRemindersFromStorage();
        createStorageRecoveryButton();

        // 默认时间设为当前 +5min（更友好）
        const $at = document.getElementById('rem-at');
        if ($at && !$at.value) {
            const d = new Date(Date.now() + 5 * 60000);
            const p = n => String(n).padStart(2, '0');
            $at.value = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        }

        document.getElementById('rem-add').addEventListener('click', () => {
            const $c = document.getElementById('rem-content');
            const v  = $at.value;
            if (!v) { if (typeof showToast === 'function') showToast('请选择提醒时间', 'warning'); return; }
            if (!$c.value.trim()) { if (typeof showToast === 'function') showToast('请填写提醒内容', 'warning'); $c.focus(); return; }
            const at = new Date(v).getTime();
            if (isNaN(at)) { if (typeof showToast === 'function') showToast('时间格式不正确', 'error'); return; }
            if (!add(at, $c.value)) return;
            $c.value = '';
            if (typeof showToast === 'function') showToast('已添加提醒：' + fmtTime(at), 'success');
        });

        document.getElementById('rem-clear-done').addEventListener('click', () => {
            const cnt = items.filter(r => r.confirmed).length;
            if (cnt === 0) { if (typeof showToast === 'function') showToast('没有已确认的提醒', 'info'); return; }
            if (!confirm(`确定清掉 ${cnt} 条已确认的提醒？`)) return;

            // 清理已完成提醒也遵循先保存再替换内存的顺序。
            const nextItems = items.filter(reminder => !reminder.confirmed);
            if (!save(nextItems)) return;
            items = nextItems;
            render();
        });

        // 列表事件委托：提醒 ID 仅从 DOM 对象引用读取，不进入属性字符串。
        $list.addEventListener('click', (event) => {
            const button = event.target.closest('.rem-act');
            const card = button?.closest('.rem-card');
            const reminder = card?.__reminderReference;
            if (!button || !reminder) return;

            if (button.classList.contains('rem-act-ack')) {
                ack(reminder.id);
            } else if (button.classList.contains('rem-act-del')) {
                if (!confirm('确定取消并删除此提醒？')) return;
                del(reminder.id);
            }
        });

        // 弹窗按钮
        const $modal = document.getElementById('rem-modal');
        document.getElementById('rem-modal-ack').addEventListener('click', () => {
            const id = $modal.dataset.currentId;
            if (id && !ack(id)) return;
            closeModal();
        });
        document.getElementById('rem-modal-later').addEventListener('click', () => {
            const id = $modal.dataset.currentId;
            if (id) snoozedThisSession.add(id);   // 仅本会话屏蔽
            closeModal();
        });
        // 点击遮罩 = 稍后再说
        $modal.addEventListener('click', (e) => {
            if (e.target.id === 'rem-modal') {
                const id = $modal.dataset.currentId;
                if (id) snoozedThisSession.add(id);
                closeModal();
            }
        });

        render();
        // 启动时延后扫描，避开首屏抖动
        setTimeout(scanAndPrompt, 800);
        // 每分钟检查一次：用户长时间挂着页面，到点也能弹
        setInterval(scanAndPrompt, 60 * 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
