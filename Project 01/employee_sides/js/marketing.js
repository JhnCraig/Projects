function setupActionPanel(table) {
    const wrapper = table.closest('.main-table-wrapper'); const header = Array.from(table.querySelectorAll('thead th')).find((cell) => /actions?/i.test(cell.textContent.trim()));
    if (!wrapper || !header || wrapper.dataset.actionPanelReady) return; wrapper.dataset.actionPanelReady = 'true'; const actionIndex = header.cellIndex;
    const layout = document.createElement('div'); layout.className = 'table-with-actions'; wrapper.parentNode.insertBefore(layout, wrapper); layout.appendChild(wrapper);
    const panel = document.createElement('div'); panel.className = 'user-action-panel'; panel.innerHTML = '<table class="table table-premium action-table align-middle"><thead><tr><th>Action</th></tr></thead><tbody></tbody></table>'; layout.appendChild(panel); header.style.display = 'none';
    const render = () => { const body = panel.querySelector('tbody'); body.innerHTML = ''; Array.from(table.tBodies[0]?.rows || []).forEach((row) => { row.__actionButtons = row.__actionButtons || Array.from(row.querySelectorAll('.edit-entry-btn, .delete-entry-btn')); if (row.cells[actionIndex]) row.cells[actionIndex].style.display = 'none'; const actionRow = document.createElement('tr'); const cell = document.createElement('td'); const buttons = document.createElement('div'); buttons.className = 'action-buttons'; row.__actionButtons.forEach((button) => { const clone = button.cloneNode(true); clone.addEventListener('click', () => button.click()); buttons.appendChild(clone); }); cell.appendChild(buttons); actionRow.appendChild(cell); body.appendChild(actionRow); }); };
    const observer = new MutationObserver(render); if (table.tBodies[0]) observer.observe(table.tBodies[0], { childList: true }); render();
}
document.addEventListener('click', (event) => { const editButton = event.target.closest('.edit-entry-btn'); if (!editButton || editButton.dataset.entry) return; const source = document.querySelector(`tr [data-id="${editButton.dataset.id}"]`); if (source?.closest('tr')?.dataset.entry) editButton.dataset.entry = source.closest('tr').dataset.entry; }, true);
document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('table.table-premium').forEach(setupActionPanel));

// New entry modal file upload handlers
const newEntryUploadBtn = document.getElementById("newEntryUploadBtn");
const newEntryFileInput = document.getElementById("newEntryFileInput");
const selectedFileName = document.getElementById("selectedFileName");

if (newEntryUploadBtn && newEntryFileInput) {
    newEntryUploadBtn.addEventListener("click", () => newEntryFileInput.click());
}

if (newEntryFileInput) {
    newEntryFileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            if (selectedFileName) {
                selectedFileName.textContent = `Selected: ${file.name}`;
            }
            document.getElementById('file_name').value = file.name;
        }
    });
}

// Edit modal file upload handlers
const editUploadBtn = document.getElementById("editUploadBtn");
const editFileInput = document.getElementById("editFileInput");
const selectedEditFileName = document.getElementById("selectedEditFileName");

if (editUploadBtn && editFileInput) {
    editUploadBtn.addEventListener("click", () => editFileInput.click());
}

if (editFileInput) {
    editFileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            if (selectedEditFileName) {
                selectedEditFileName.textContent = `Selected: ${file.name}`;
            }
            document.getElementById('edit_file_name').value = file.name;
        }
    });
}

function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const notification = document.createElement('div');
    const background = type === 'danger' ? '#dc3545' : '#28a745';
    notification.style.cssText = `
                min-width: 320px;
                max-width: 360px;
                margin-top: 0.75rem;
                padding: 18px 22px;
                border-radius: 18px;
                color: white;
                background: ${background};
                box-shadow: 0 18px 40px rgba(0,0,0,0.26);
                font-size: 15px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: space-between;
                opacity: 0;
                transform: translateX(24px);
                pointer-events: auto;
                transition: opacity 180ms ease, transform 180ms ease;
            `;
    notification.innerHTML = `
                <span style="flex:1; padding-right: 14px;">${escapeHtml(message)}</span>
                <button type="button" aria-label="Close" style="border:none; background:transparent; color:white; font-size:18px; line-height:1; cursor:pointer;">×</button>
            `;
    const closeBtn = notification.querySelector('button');
    closeBtn?.addEventListener('click', () => notification.remove());
    toastContainer.appendChild(notification);
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(24px)';
        setTimeout(() => notification.remove(), 180);
    }, 3200);
}
function normalizeDateInputValue(value) { if (!value) return ''; const raw = String(value).trim(); const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/); if (match) return `${match[1]}-${match[2]}-${match[3]}`; const date = new Date(raw); if (!Number.isNaN(date.getTime())) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; return raw; }
function formatDate(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); }
function renderDocumentCell(value) {
    if (!value) return '';
    const cleanName = value.replace(/-[a-f0-9]{32}(?=\.)/i, '');
    return `<div style="display:inline-block; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><a href="/uploads/${encodeURIComponent(value)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</a></div>`;
}
async function loadMarketingRows() {
    const tbody = document.getElementById('marketingTableBody');

    if (!tbody) return;
    try {
        const res = await fetch('/api/sales_marketing');
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Failed to load marketing records');
        const rows = Array.isArray(result.data) ? result.data : [];
        if (!rows.length) { tbody.innerHTML = '<tr><td colspan="16" class="text-center text-muted py-4"></td></tr>'; return; }

        tbody.innerHTML = rows.map((entry) => `
                    <tr data-entry="${JSON.stringify(entry).replace(/"/g, '&quot;')}">
                        <td><div style="white-space:nowrap;">${escapeHtml(formatDate(entry.date_received))}</div></td>
                        <td>${escapeHtml(entry.client_name || '')}</td>
                        <td>${escapeHtml(entry.project_name || '')}</td>
                        <td>${escapeHtml(entry.source || '')}</td>
                        <td>${escapeHtml(entry.project_value || '')}</td>
                        <td>${escapeHtml(entry.project_type || '')}</td>
                        <td><div style="white-space:nowrap;">${escapeHtml(formatDate(entry.deadline_submission))}</div></td>
                        <td>${escapeHtml(entry.days_deadline || '')}</td>
                        <td>${escapeHtml(entry.status || '')}</td>
                        <td><div style="white-space:nowrap;">${escapeHtml(formatDate(entry.date_submitted))}</div></td>
                        <td>${escapeHtml(entry.response_time || '')}</td>
                        <td><div style="white-space:nowrap;">${escapeHtml(formatDate(entry.follow_up_date))}</div></td>
                        <td>${escapeHtml(entry.days_follow_up || '')}</td>
                        <td>${renderDocumentCell(entry.file_name || '')}</td>
                        <td>${escapeHtml(entry.lost_reason || '')}</td>
                        <td><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-subtle edit-entry-btn" type="button" data-id="${entry.id}" data-entry="${JSON.stringify(entry).replace(/"/g, '&quot;')}" data-bs-toggle="modal" data-bs-target="#editModal" title="Edit entry" aria-label="Edit entry"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-entry-btn" type="button" data-id="${entry.id}" title="Delete entry" aria-label="Delete entry"><i class="bi bi-trash3"></i></button></div></td>
                    </tr>
                `).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="16" class="text-center text-danger py-4">${escapeHtml(err.message || 'Unable to load marketing records')}</td></tr>`; }
}
document.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.edit-entry-btn');
    if (editButton) {
        const entry = JSON.parse(editButton.dataset.entry || '{}');
        if (!Object.keys(entry).length) return;
        document.getElementById('edit_date_received').value = normalizeDateInputValue(entry.date_received);
        document.getElementById('edit_status').value = entry.status || '';
        document.getElementById('edit_client_name').value = entry.client_name || '';
        document.getElementById('edit_project_name').value = entry.project_name || '';
        document.getElementById('edit_project_type').value = entry.project_type || '';
        document.getElementById('edit_source').value = entry.source || '';
        document.getElementById('edit_project_value').value = entry.project_value || '';
        document.getElementById('edit_deadline_submission').value = normalizeDateInputValue(entry.deadline_submission);
        document.getElementById('edit_days_deadline').value = entry.days_deadline || '';
        document.getElementById('edit_date_submitted').value = normalizeDateInputValue(entry.date_submitted);
        document.getElementById('edit_response_time').value = entry.response_time || '';
        document.getElementById('edit_follow_up_date').value = normalizeDateInputValue(entry.follow_up_date);
        document.getElementById('edit_days_follow_up').value = entry.days_follow_up || '';
        document.getElementById('edit_file_name').value = entry.file_name || '';
        document.getElementById('edit_lost_reason').value = entry.lost_reason || '';
        document.getElementById('edit_id').value = entry.id || '';
        return;
    }
    const deleteButton = event.target.closest('.delete-entry-btn');
    if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id) return;
        showDeleteConfirmation(id, 'sales_marketing');
    }
});
document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirmDeleteBtn');
    const entryId = btn?.dataset.entryId;
    const kind = btn?.dataset.kind;
    if (!entryId || !kind) return;
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    try {
        const res = await fetch(`/api/${kind}/${entryId}`, { method: 'DELETE' });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Delete failed');
        modal.hide();
        showToast('Entry deleted.', 'danger');
        loadMarketingRows();
    } catch (err) {
        modal.hide();
        showToast('Delete failed: ' + (err.message || err), 'danger');
    }
});
function showDeleteConfirmation(entryId, kind) {
    const btn = document.getElementById('confirmDeleteBtn');
    if (!btn) return;
    btn.dataset.entryId = entryId;
    btn.dataset.kind = kind;
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}
document.addEventListener('DOMContentLoaded', loadMarketingRows);
document.getElementById('saveMarketingBtn')?.addEventListener('click', async () => {
    await submitMarketingModal('create');
});

const saveEditedMarketingBtn = document.getElementById("saveEditedMarketingBtn");

const marketingFields = [
    { key: "date_received", id: "date_received" },
    { key: "client_name", id: "client_name" },
    { key: "project_name", id: "project_name" },
    { key: "source", id: "source" },
    { key: "project_value", id: "project_value" },
    { key: "project_type", id: "project_type" },
    { key: "deadline_submission", id: "deadline_submission" },
    { key: "days_deadline", id: "days_deadline" },
    { key: "status", id: "status" },
    { key: "date_submitted", id: "date_submitted" },
    { key: "response_time", id: "response_time" },
    { key: "follow_up_date", id: "follow_up_date" },
    { key: "days_follow_up", id: "days_follow_up" },
    { key: "file_name", id: "file_name" },
    { key: "lost_reason", id: "lost_reason" }
];

function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? input.value : "";
}

function collectMarketingPayload(mode) {
    const payload = { kind: "sales_marketing", action: mode === "edit" ? "edit" : "create" };
    if (mode === "edit") {
        payload.id = getInputValue("edit_id");
    }
    marketingFields.forEach(({ key, id }) => {
        const inputId = mode === "edit" ? `edit_${id}` : id;
        payload[key] = getInputValue(inputId);
    });

    if (mode === "edit") {
        payload.original_date_received = getInputValue("edit_date_received");
    }

    return payload;
}

async function submitMarketingModal(mode) {
    const button = mode === 'edit' ? saveEditedMarketingBtn : null;
    if (button) button.disabled = true;
    try {
        const formData = new FormData();
        formData.append('kind', 'sales_marketing');
        formData.append('action', mode === 'edit' ? 'edit' : 'create');
        if (mode === 'edit') {
            formData.append('id', document.getElementById('edit_id')?.value || '');
        }
        formData.append('date_received', document.getElementById(mode === 'edit' ? 'edit_date_received' : 'date_received')?.value || '');
        formData.append('status', document.getElementById(mode === 'edit' ? 'edit_status' : 'status')?.value || '');
        formData.append('client_name', document.getElementById(mode === 'edit' ? 'edit_client_name' : 'client_name')?.value || '');
        formData.append('project_name', document.getElementById(mode === 'edit' ? 'edit_project_name' : 'project_name')?.value || '');
        formData.append('project_type', document.getElementById(mode === 'edit' ? 'edit_project_type' : 'project_type')?.value || '');
        formData.append('source', document.getElementById(mode === 'edit' ? 'edit_source' : 'source')?.value || '');
        formData.append('project_value', document.getElementById(mode === 'edit' ? 'edit_project_value' : 'project_value')?.value || '');
        formData.append('deadline_submission', document.getElementById(mode === 'edit' ? 'edit_deadline_submission' : 'deadline_submission')?.value || '');
        formData.append('days_deadline', document.getElementById(mode === 'edit' ? 'edit_days_deadline' : 'days_deadline')?.value || '');
        formData.append('date_submitted', document.getElementById(mode === 'edit' ? 'edit_date_submitted' : 'date_submitted')?.value || '');
        formData.append('response_time', document.getElementById(mode === 'edit' ? 'edit_response_time' : 'response_time')?.value || '');
        formData.append('follow_up_date', document.getElementById(mode === 'edit' ? 'edit_follow_up_date' : 'follow_up_date')?.value || '');
        formData.append('days_follow_up', document.getElementById(mode === 'edit' ? 'edit_days_follow_up' : 'days_follow_up')?.value || '');
        formData.append('lost_reason', document.getElementById(mode === 'edit' ? 'edit_lost_reason' : 'lost_reason')?.value || '');
        formData.append('file_name', document.getElementById(mode === 'edit' ? 'edit_file_name' : 'file_name')?.value || '');

        const fileInput = document.getElementById(mode === 'edit' ? 'editFileInput' : 'newEntryFileInput');
        if (fileInput?.files?.[0]) {
            formData.append('documents_file', fileInput.files[0]);
        }

        const res = await fetch('/api/sales_marketing', { method: 'POST', body: formData });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || res.statusText || 'Save failed');

        const modalEl = document.getElementById(mode === 'edit' ? 'editModal' : 'newEntryModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        showToast(mode === 'edit' ? 'Entry updated successfully.' : 'Entry saved successfully.', 'success');

        // Clear file inputs
        const newFileInput = document.getElementById('newEntryFileInput');
        if (newFileInput) newFileInput.value = '';
        if (fileInput) fileInput.value = '';

        loadMarketingRows();
    } catch (err) {
        showToast('Save failed: ' + (err.message || err), 'danger');
    } finally {
        if (button) button.disabled = false;
    }
}

if (saveEditedMarketingBtn) {
    saveEditedMarketingBtn.addEventListener("click", () => submitMarketingModal("edit"));
}