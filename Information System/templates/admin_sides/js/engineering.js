//Admin engineering table and entry actions
//Loads, renders, filters, saves, edits, and deletes engineering projects.

//Keep the data table and action panel aligned.
function syncTableRowHeights(mainTable, actionTable) {
    const mainRows = Array.from(mainTable.tBodies[0]?.rows || []);
    const actionRows = Array.from(actionTable.tBodies[0]?.rows || []);
    mainRows.forEach((row, index) => {
        const actionRow = actionRows[index];
        if (!actionRow) return;
        row.style.height = 'auto';
        actionRow.style.height = 'auto';
        const rowHeight = Math.max(row.offsetHeight, actionRow.offsetHeight);
        row.style.height = `${rowHeight}px`;
        actionRow.style.height = `${rowHeight}px`;
    });
}

let engineeringRows = [];

function setupActionPanel(table) {
    const wrapper = table.closest('.main-table-wrapper'); const header = Array.from(table.querySelectorAll('thead th')).find((cell) => /actions?/i.test(cell.textContent.trim()));
    if (!wrapper || !header || wrapper.dataset.actionPanelReady) return; wrapper.dataset.actionPanelReady = 'true'; const actionIndex = header.cellIndex;
    const layout = document.createElement('div'); layout.className = 'table-with-actions'; wrapper.parentNode.insertBefore(layout, wrapper); layout.appendChild(wrapper);
    const panel = document.createElement('div'); panel.className = 'user-action-panel'; panel.innerHTML = '<table class="table table-premium action-table align-middle"><thead><tr><th>Action</th></tr></thead><tbody></tbody></table>'; layout.appendChild(panel); header.style.display = 'none';
    const render = () => { const body = panel.querySelector('tbody'); body.innerHTML = ''; Array.from(table.tBodies[0]?.rows || []).forEach((row) => { row.__actionButtons = row.__actionButtons || Array.from(row.querySelectorAll('.edit-entry-btn, .delete-entry-btn')); if (row.cells[actionIndex]) row.cells[actionIndex].style.display = 'none'; const actionRow = document.createElement('tr'); const cell = document.createElement('td'); const buttons = document.createElement('div'); buttons.className = 'action-buttons'; row.__actionButtons.forEach((button) => { const clone = button.cloneNode(true); clone.addEventListener('click', () => button.click()); buttons.appendChild(clone); }); cell.appendChild(buttons); actionRow.appendChild(cell); body.appendChild(actionRow); }); syncTableRowHeights(table, panel.querySelector('.action-table')); };
    const observer = new MutationObserver(render); if (table.tBodies[0]) observer.observe(table.tBodies[0], { childList: true }); render(); syncTableRowHeights(table, panel.querySelector('.action-table'));
}
document.addEventListener('click', (event) => { const editButton = event.target.closest('.edit-entry-btn'); if (!editButton || editButton.dataset.entry) return; const source = document.querySelector(`tr [data-id="${editButton.dataset.id}"]`); if (source?.closest('tr')?.dataset.entry) editButton.dataset.entry = source.closest('tr').dataset.entry; }, true);
document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('table.table-premium').forEach(setupActionPanel));

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const selectedFileName = document.getElementById("selectedFileName");
const newEntryUploadBtn = document.getElementById("newEntryUploadBtn");
const newEntryFileInput = document.getElementById("newEntryFileInput");
const newEntrySelectedFileName = document.getElementById("newEntrySelectedFileName");

if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", () => fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (selectedFileName) {
            selectedFileName.textContent = file ? file.name : "No file chosen";
        }

        const importModal = new bootstrap.Modal(document.getElementById("importFileModal"));
        importModal.show();
    });
}

if (newEntryUploadBtn && newEntryFileInput) {
    newEntryUploadBtn.addEventListener("click", () => newEntryFileInput.click());
}
if (newEntryFileInput) {
    newEntryFileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (newEntrySelectedFileName) {
            newEntrySelectedFileName.textContent = file ? `Selected: ${file.name}` : "No file chosen";
        }
        const fileNameInput = document.getElementById('file_name');
        if (fileNameInput) {
            fileNameInput.value = file ? file.name : '';
        }
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeDateInputValue(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    return raw;
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function renderDocumentCell(value) {
    if (!value) return '';
    const cleanName = value.replace(/-[a-f0-9]{32}(?=\.)/i, '');
    return `<div style="display:inline-block; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><a href="/uploads/${encodeURIComponent(value)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</a></div>`;
}

function resetEngineeringNewEntry() {
    ['project_name', 'location', 'client', 'date', 'status', 'materials_needed',
        'accomplishment_percentage', 'target_completion', 'manpower', 'file_name',
        'lost_reason'].forEach((id) => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
    const fileInput = document.getElementById('newEntryFileInput');
    if (fileInput) fileInput.value = '';
    const selectedFile = document.getElementById('newEntrySelectedFileName');
    if (selectedFile) selectedFile.textContent = 'No file chosen';
}

function showToast(message, type = 'success') {
    message = message === 'The file headers do not match this table.' ? 'Invalid File: The file does not match.' : message;
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

//Load engineering records and render project rows.
async function loadEngineeringRows() {
    const tbody = document.getElementById('engineeringTableBody');
    if (!tbody) return;
    if (window.location.protocol === 'file:') {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-danger py-4">This page must be opened through the Flask server, not directly from the file system. Start backEnd.py and open the page at http://127.0.0.1:5000/engineering.html</td></tr>';
        return;
    }

    try {
        const res = await fetch('/api/engineering');
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Failed to load engineering records');

        const rows = Array.isArray(result.data) ? result.data : [];
        engineeringRows = rows;
        const tableWrapper = tbody.closest('.main-table-wrapper');
        tableWrapper?.classList.toggle('is-empty', !rows.length);
        tableWrapper?.parentElement.querySelector('.user-action-panel')?.classList.toggle('is-empty', !rows.length);
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted py-4"></td></tr>';
            return;
        }

        tbody.innerHTML = rows.map((entry) => `
                        <tr data-entry="${JSON.stringify(entry).replace(/"/g, '&quot;')}" data-document="${escapeHtml(entry.file_name || '')}">
                            <td>${escapeHtml(entry.project_name || '')}</td>
                            <td>${escapeHtml(entry.location || '')}</td>
                            <td>${escapeHtml(entry.client || '')}</td>
                            <td style="white-space: nowrap;">${escapeHtml(formatDate(entry.date))}</td>
                            <td>${escapeHtml(entry.status || '')}</td>
                            <td>${escapeHtml(entry.materials_needed || '')}</td>
                            <td>${escapeHtml(entry.accomplishment_percentage || '')}</td>
                            <td style="white-space: nowrap;">${escapeHtml(formatDate(entry.target_completion))}</td>
                            <td>${escapeHtml(entry.manpower || '')}</td>
                            <td>${renderDocumentCell(entry.file_name || '')}</td>
                            <td>${escapeHtml(entry.lost_reason || '')}</td>
                            <td><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-subtle edit-entry-btn" type="button" data-id="${entry.id}" data-entry="${JSON.stringify(entry).replace(/"/g, '&quot;')}" data-bs-toggle="modal" data-bs-target="#editModal" title="Edit entry" aria-label="Edit entry"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-entry-btn" type="button" data-id="${entry.id}" title="Delete entry" aria-label="Delete entry"><i class="bi bi-trash3"></i></button></div></td>

                        </tr>
                    `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger py-4">${escapeHtml(err.message || 'Unable to load engineering records')}</td></tr>`;
    }
}

//Save new and edited engineering projects.
async function submitEngineeringEntry() {
    if (window.location.protocol === 'file:') {
        showToast('This page must be opened through the Flask server. Start backEnd.py and open it using http://127.0.0.1:5000/engineering.html', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('kind', 'engineering');
    formData.append('project_name', document.getElementById('project_name')?.value || '');
    formData.append('location', document.getElementById('location')?.value || '');
    formData.append('client', document.getElementById('client')?.value || '');
    formData.append('date', document.getElementById('date')?.value || '');
    formData.append('status', document.getElementById('status')?.value || '');
    formData.append('materials_needed', document.getElementById('materials_needed')?.value || '');
    formData.append('accomplishment_percentage', document.getElementById('accomplishment_percentage')?.value || '');
    formData.append('target_completion', document.getElementById('target_completion')?.value || '');
    formData.append('manpower', document.getElementById('manpower')?.value || '');
    formData.append('file_name', document.getElementById('file_name')?.value || '');
    formData.append('lost_reason', document.getElementById('lost_reason')?.value || '');
    const newFileInput = document.getElementById('newEntryFileInput');
    if (newFileInput?.files?.[0]) {
        formData.append('documents_file', newFileInput.files[0]);
    }

    try {
        const res = await fetch('/api/engineering', { method: 'POST', body: formData });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || res.statusText || 'Save failed');

        const modalEl = document.getElementById('newEntryModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        resetEngineeringNewEntry();
        showToast('New engineering entry saved.', 'success');
        await loadEngineeringRows();
    } catch (err) {
        showToast('Save failed: ' + (err.message || err), 'danger');
    }
}

async function submitEngineeringEdit() {
    if (window.location.protocol === 'file:') {
        showToast('This page must be opened through the Flask server. Start backEnd.py and open it using http://127.0.0.1:5000/engineering.html', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'edit');
    formData.append('id', document.getElementById('edit_id')?.value || '');
    formData.append('project_name', document.getElementById('edit_project_name')?.value || '');
    formData.append('location', document.getElementById('edit_location')?.value || '');
    formData.append('client', document.getElementById('edit_client')?.value || '');
    formData.append('date', document.getElementById('edit_date')?.value || '');
    formData.append('status', document.getElementById('edit_status')?.value || '');
    formData.append('materials_needed', document.getElementById('edit_materials_needed')?.value || '');
    formData.append('accomplishment_percentage', document.getElementById('edit_accomplishment_percentage')?.value || '');
    formData.append('target_completion', document.getElementById('edit_target_completion')?.value || '');
    formData.append('manpower', document.getElementById('edit_manpower')?.value || '');
    formData.append('file_name', document.getElementById('edit_file_name')?.value || '');
    formData.append('lost_reason', document.getElementById('edit_lost_reason')?.value || '');
    const editFileInput = document.getElementById('editEntryFileInput');
    const existingDocumentPath = document.getElementById('edit_document_path')?.value || '';
    if (editFileInput?.files?.[0]) {
        formData.append('documents_file', editFileInput.files[0]);
    } else if (existingDocumentPath) {
        formData.append('documents', existingDocumentPath);
    }

    try {
        const res = await fetch('/api/engineering', { method: 'POST', body: formData });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || res.statusText || 'Save failed');

        const modalEl = document.getElementById('editModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        showToast('Engineering entry updated.', 'success');
        await loadEngineeringRows();
    } catch (err) {
        showToast('Save failed: ' + (err.message || err), 'danger');
    }
}

function populateEditModal(entry) {
    document.getElementById('edit_id').value = entry.id || '';
    document.getElementById('edit_project_name').value = entry.project_name || '';
    document.getElementById('edit_location').value = entry.location || '';
    document.getElementById('edit_client').value = entry.client || '';
    document.getElementById('edit_date').value = normalizeDateInputValue(entry.date || '');
    document.getElementById('edit_status').value = entry.status || '';
    document.getElementById('edit_materials_needed').value = entry.materials_needed || '';
    document.getElementById('edit_accomplishment_percentage').value = entry.accomplishment_percentage || '';
    document.getElementById('edit_target_completion').value = normalizeDateInputValue(entry.target_completion || '');
    document.getElementById('edit_manpower').value = entry.manpower || '';
    document.getElementById('edit_file_name').value = entry.file_name || '';
    document.getElementById('edit_document_path').value = entry.document_path || '';
    document.getElementById('editEntrySelectedFileName').textContent = entry.file_name || 'No file chosen';
    document.getElementById('edit_lost_reason').value = entry.lost_reason || '';
}

let deletePendingId = null;
const deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
let deleteConfirmModal = null;

function initDeleteConfirmation() {
    if (!deleteConfirmModalEl || !window.bootstrap?.Modal?.getOrCreateInstance) return;
    deleteConfirmModal = bootstrap.Modal.getOrCreateInstance(deleteConfirmModalEl);
    deleteConfirmBtn?.addEventListener('click', async () => {
        if (!deletePendingId) return;
        deleteConfirmBtn.disabled = true;
        try {
            await deleteEngineeringEntry(deletePendingId);
        } finally {
            deleteConfirmBtn.disabled = false;
            deletePendingId = null;
            deleteConfirmModal.hide();
        }
    });
}

function showDeleteConfirmation(entryId) {
    if (!deleteConfirmModal) {
        return;
    }
    deletePendingId = entryId;
    deleteConfirmMessage.textContent = 'Delete this engineering entry? This action cannot be undone.';
    deleteConfirmModal.show();
}

async function deleteEngineeringEntry(entryId) {
    const trimmedId = String(entryId || '').trim();
    if (!trimmedId) return;
    const numericId = Number(trimmedId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
        showToast('Unable to delete entry: invalid ID.', 'danger');
        return;
    }
    try {
        const res = await fetch(`/api/engineering/${numericId}`, { method: 'DELETE' });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || result.statusText || 'Delete failed');
        showToast('Engineering entry deleted.', 'danger');
        await loadEngineeringRows();
    } catch (err) {
        showToast('Delete failed: ' + (err.message || err), 'danger');
    }
}

document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const editButton = target.closest('.edit-entry-btn');
    if (editButton instanceof HTMLElement) {
        const entry = JSON.parse(editButton.dataset.entry || '{}');
        entry.id = editButton.getAttribute('data-id') || entry.id;
        entry.document_path = entry.file_name || '';
        if (!Object.keys(entry).length) return;
        populateEditModal(entry);
        return;
    }

    const deleteButton = target.closest('.delete-entry-btn');
    if (deleteButton instanceof HTMLElement) {
        const entryId = deleteButton.getAttribute('data-id');
        if (entryId) {
            showDeleteConfirmation(entryId);
        }
    }
});

if (document.getElementById('editEntryUploadBtn') && document.getElementById('editEntryFileInput')) {
    document.getElementById('editEntryUploadBtn').addEventListener('click', () => document.getElementById('editEntryFileInput').click());
    document.getElementById('editEntryFileInput').addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        document.getElementById('editEntrySelectedFileName').textContent = file ? file.name : 'No file chosen';
        document.getElementById('edit_file_name').value = file ? file.name : '';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initDeleteConfirmation();
    loadEngineeringRows();
});

function setupTableChart(config) {
    const { buttonId, modalId, canvasId, getRows, labelKey } = config;
    const button = document.getElementById(buttonId);
    const modal = document.getElementById(modalId);
    const canvas = document.getElementById(canvasId);
    if (!button || !modal || !canvas) return;
    let chart = null;

    button.addEventListener('click', () => {
        new bootstrap.Modal(modal).show();
        setTimeout(() => {
            chart?.destroy();
            const labels = [];
            getRows().forEach((row) => {
                const label = String(row[labelKey] || 'Unknown').trim() || 'Unknown';
                const index = labels.indexOf(label);
                if (index < 0) labels.push(label);
            });
            chart = new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: { labels: labels.length ? labels : ['No data'], datasets: [{ data: labels.length ? labels.map(() => 1) : [1], backgroundColor: labels.length ? ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#198754', '#20c997', '#0dcaf0', '#ffc107', '#dc3545', '#6c757d'] : ['#e9ecef'], borderColor: '#fff', borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1400, easing: 'easeOutCubic', animateRotate: true, animateScale: true }, plugins: { legend: { position: 'bottom' } } }
            });
            chart.reset();
            chart.update();
        }, 100);
    });
}

const saveNewEntryBtn = document.getElementById('saveNewEntryBtn');
setupTableChart({ buttonId: 'chartToggleBtn', modalId: 'engineeringChartModal', canvasId: 'engineeringChart', getRows: () => engineeringRows, labelKey: 'status', valueKey: 'status', countOnly: true });
const saveEditBtn = document.getElementById('saveEditBtn');
saveNewEntryBtn?.addEventListener('click', submitEngineeringEntry);
saveEditBtn?.addEventListener('click', submitEngineeringEdit);

document.getElementById('newEntryModal')?.addEventListener('hidden.bs.modal', () => resetEngineeringNewEntry());

//Validate and import spreadsheet rows.
function setupSpreadsheetImport(config) {
    const invalidFileMessage = 'Invalid File: The file does not match.';
    const validationMessage = document.getElementById('importValidationMessage');
    if (validationMessage) new MutationObserver(() => { if (validationMessage.textContent === 'The file headers do not match this table.') { validationMessage.className = 'alert alert-danger'; validationMessage.textContent = invalidFileMessage; showToast(invalidFileMessage, 'danger'); } }).observe(validationMessage, { childList: true, characterData: true, subtree: true });
    const renderRows = (target, rows, includeReason = false) => { const head = document.getElementById(target + 'Head'); const body = document.getElementById(target + 'Body'); if (!head || !body) return; head.innerHTML = `<tr>${config.fields.map((field) => `<th>${field.replace(/_/g, ' ')}</th>`).join('')}${includeReason ? '<th>Reason</th>' : ''}</tr>`; body.innerHTML = rows.length ? rows.map(({ data, reason }) => `<tr>${config.fields.map((field) => `<td>${escapeHtml(data[field])}</td>`).join('')}${includeReason ? `<td>${escapeHtml(reason)}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${config.fields.length + (includeReason ? 1 : 0)}" class="text-center text-muted py-3">No data</td></tr>`; };
    const input = document.getElementById(config.fileId); const button = document.getElementById(config.buttonId); const message = document.getElementById('importValidationMessage'); let rows = [];
    const resetImport = () => { rows = []; input.value = ''; button.disabled = true;['importValidTableHead', 'importValidTableBody', 'importInvalidTableHead', 'importInvalidTableBody'].forEach((id) => { const element = document.getElementById(id); if (element) element.innerHTML = ''; }); if (message) { message.className = 'alert d-none'; message.textContent = ''; } if (selectedFileName) selectedFileName.textContent = 'No file chosen'; };
    if (!input || !button || typeof XLSX === 'undefined') return;
    input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; try { const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, raw: false }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const parsed = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }); const headers = (parsed.shift() || []).map((value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')); const indexes = Object.fromEntries(config.fields.map((field) => [field, headers.indexOf(field.replace(/_/g, ''))])); if (!config.fields.some((field) => indexes[field] >= 0)) throw new Error('The file headers do not match this table.'); rows = parsed.filter((cells) => cells.some((cell) => String(cell).trim())).map((cells) => Object.fromEntries(config.fields.map((field) => [field, indexes[field] >= 0 ? cells[indexes[field]] || '' : '']))); renderRows('importValidTable', rows.map((data) => ({ data }))); renderRows('importInvalidTable', [], true); if (message) { message.className = `alert ${rows.length ? 'alert-success' : 'alert-warning'} mt-3`; message.textContent = `${rows.length} row(s) ready to import.`; } button.disabled = !rows.length; } catch (error) { showToast(error.message || 'Unable to read file.', 'danger'); resetImport(); } });
    button.addEventListener('click', async () => { button.disabled = true; try { for (const row of rows) { const body = new FormData(); body.append('kind', config.kind); body.append('action', 'create'); Object.entries(row).forEach(([key, value]) => body.append(key, value)); const response = await fetch(config.endpoint, { method: 'POST', body }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Import failed'); } bootstrap.Modal.getInstance(document.getElementById('importFileModal'))?.hide(); showToast(`${rows.length} row(s) imported successfully.`, 'success'); resetImport(); await config.reload(); } catch (error) { showToast('Import failed: ' + (error.message || error), 'danger'); resetImport(); } });
}
setupSpreadsheetImport({ fileId: 'fileInput', buttonId: 'confirmImportBtn', fields: ['project_name', 'location', 'client', 'date', 'status', 'materials_needed', 'accomplishment_percentage', 'target_completion', 'manpower', 'file_name', 'lost_reason'], endpoint: '/api/engineering', kind: 'engineering', reload: loadEngineeringRows, multipart: true });

const userNameTargets = document.querySelectorAll('[data-user-display]');
fetch('/api/current-user')
    .then((response) => response.ok ? response.json() : null)
    .then((user) => {
        const name = user?.name || 'User';
        const firstName = name.split(' ')[0] || 'User';
        userNameTargets.forEach((element) => {
            element.textContent = firstName;
        });
    })
    .catch(() => {
        userNameTargets.forEach((element) => {
            element.textContent = 'User';
        });
    });


    const chartSummaryConfigs = {
    engineering: { endpoint: '/api/engineering', items: [['Projects', (rows) => rows.length], ['Avg. progress', (rows) => { const average = rows.length ? rows.reduce((total, row) => total + (Number(row.accomplishment_percentage) || 0), 0) / rows.length : 0; return `${average.toFixed(1)}%`; }], ['Statuses', (rows) => uniqueChartValues(rows, 'status')]] }
};

function sumChartValues(rows, key) { return rows.reduce((total, row) => total + (Number.parseFloat(String(row[key] ?? '').replace(/[^\d.-]/g, '')) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function uniqueChartValues(rows, key) { return new Set(rows.map((row) => String(row[key] || '').trim()).filter(Boolean)).size; }

async function loadChartSummary(type, target) {
    const config = chartSummaryConfigs[type];
    if (!config || !target) return;
    try {
        const response = await fetch(config.endpoint, { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error('Unable to load chart summary.');
        const rows = Array.isArray(result.data) ? result.data : [];
        target.innerHTML = config.items.map(([label, getValue]) => `<div class="dashboard-summary-item"><span class="dashboard-summary-value">${getValue(rows)}</span><span class="dashboard-summary-label">${label}</span></div>`).join('');
    } catch { target.innerHTML = ''; }
}

document.querySelectorAll('[data-chart-summary]').forEach((target) => {
    target.closest('.modal')?.addEventListener('shown.bs.modal', () => loadChartSummary(target.dataset.chartSummary, target));
});
