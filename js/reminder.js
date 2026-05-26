// 备忘录提醒
// - 添加 {时间, 内容}；存 localStorage
// - 每次打开页面扫描"已到期 && 未确认"，依次弹窗提醒
// - 点"知道了"标记 confirmed=true → 永久不再提醒
// - 点"稍后再说" → 仅本次会话不再弹，下次打开页面继续提醒
// - 列表内每条可"取消提醒"（删除）
(function () {
    'use strict';

    const LS_KEY = 'toolbox_reminders';

    let items = load();
    const snoozedThisSession = new Set();   // 本会话临时屏蔽

    function load() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }
    function save() {
        try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
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
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function render() {
        const $list  = document.getElementById('rem-list');
        const $tt    = document.getElementById('rem-stat-total');
        const $tp    = document.getElementById('rem-stat-pending');
        const $td    = document.getElementById('rem-stat-done');
        if (!$list) return;

        items.sort((a, b) => a.at - b.at);
        const now = Date.now();
        const pending = items.filter(r => !r.confirmed && r.at <= now);
        const future  = items.filter(r => r.at > now);
        const done    = items.filter(r => r.confirmed);

        if ($tt) $tt.textContent = items.length;
        if ($tp) $tp.textContent = pending.length;
        if ($td) $td.textContent = done.length;

        if (items.length === 0) {
            $list.innerHTML = `<div style="margin:auto;text-align:center;color:var(--text-secondary);font-size:14px;padding:40px 20px">
                <div style="font-size:48px;margin-bottom:12px">📝</div>
                <div style="font-size:16px;color:var(--text-primary);margin-bottom:6px">还没有提醒</div>
                <div style="font-size:12px">在上方添加一条吧，到点会自动弹窗提醒</div>
            </div>`;
            return;
        }

        const renderOne = (r) => {
            const overdue = !r.confirmed && r.at <= now;
            const stateCls = r.confirmed ? 'rem-state-done' : (overdue ? 'rem-state-overdue' : 'rem-state-pending');
            const stateTxt = r.confirmed ? '已确认' : (overdue ? '已过期 · 待提醒' : '待提醒');
            return `<div class="rem-card ${stateCls}" data-id="${r.id}">
                <div class="rem-card-time">
                    <div class="rem-card-time-main">${fmtTime(r.at)}</div>
                    <div class="rem-card-time-rel">${fmtRelative(r.at)}</div>
                </div>
                <div class="rem-card-body">
                    <div class="rem-card-content">${escapeHtml(r.content)}</div>
                    <div class="rem-card-state">${stateTxt}</div>
                </div>
                <div class="rem-card-actions">
                    ${r.confirmed ? '' : '<button class="rem-act rem-act-ack" data-act="ack" title="标记为已确认（不再提醒）">✓ 已知</button>'}
                    <button class="rem-act rem-act-del" data-act="del" title="取消并删除此提醒">✕ 取消</button>
                </div>
            </div>`;
        };

        const grouped = [];
        if (pending.length) grouped.push(`<div class="rem-group-title">⏰ 已过期待确认 (${pending.length})</div>`, ...pending.map(renderOne));
        if (future.length)  grouped.push(`<div class="rem-group-title">📅 未来提醒 (${future.length})</div>`,    ...future.map(renderOne));
        if (done.length)    grouped.push(`<div class="rem-group-title">✓ 已确认 (${done.length})</div>`,         ...done.map(renderOne));
        $list.innerHTML = grouped.join('');
    }

    // ---------- 增删改 ----------
    function add(at, content) {
        if (!at || !content.trim()) return false;
        items.push({
            id: genId(),
            at: at,
            content: content.trim(),
            confirmed: false,
            createdAt: Date.now()
        });
        save();
        render();
        return true;
    }

    function ack(id) {
        const r = items.find(x => x.id === id);
        if (r) { r.confirmed = true; save(); render(); }
    }

    function del(id) {
        items = items.filter(x => x.id !== id);
        save();
        render();
    }

    // ---------- 到期弹窗 ----------
    let modalQueue = [];
    let modalShowing = false;

    function scanAndPrompt() {
        const now = Date.now();
        modalQueue = items.filter(r => !r.confirmed && r.at <= now && !snoozedThisSession.has(r.id));
        showNext();
    }

    function showNext() {
        if (modalShowing) return;
        const r = modalQueue.shift();
        if (!r) return;
        const $modal = document.getElementById('rem-modal');
        const $time  = document.getElementById('rem-modal-time');
        const $body  = document.getElementById('rem-modal-content');
        if (!$modal) return;
        modalShowing = true;
        $time.textContent = `预定时间：${fmtTime(r.at)} · ${fmtRelative(r.at)}`;
        $body.textContent = r.content;
        $modal.style.display = 'flex';
        $modal.dataset.currentId = r.id;
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
            add(at, $c.value);
            $c.value = '';
            if (typeof showToast === 'function') showToast('已添加提醒：' + fmtTime(at), 'success');
        });

        document.getElementById('rem-clear-done').addEventListener('click', () => {
            const cnt = items.filter(r => r.confirmed).length;
            if (cnt === 0) { if (typeof showToast === 'function') showToast('没有已确认的提醒', 'info'); return; }
            if (!confirm(`确定清掉 ${cnt} 条已确认的提醒？`)) return;
            items = items.filter(r => !r.confirmed);
            save();
            render();
        });

        // 列表事件委托：知道了 / 取消
        $list.addEventListener('click', (e) => {
            const btn = e.target.closest('.rem-act');
            if (!btn) return;
            const card = btn.closest('.rem-card');
            const id = card?.getAttribute('data-id');
            if (!id) return;
            const act = btn.getAttribute('data-act');
            if (act === 'ack') ack(id);
            else if (act === 'del') {
                if (!confirm('确定取消并删除此提醒？')) return;
                del(id);
            }
        });

        // 弹窗按钮
        const $modal = document.getElementById('rem-modal');
        document.getElementById('rem-modal-ack').addEventListener('click', () => {
            const id = $modal.dataset.currentId;
            if (id) ack(id);
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
