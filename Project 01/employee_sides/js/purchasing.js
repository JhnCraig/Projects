//Employee purchasing table and entry actions
//Loads, renders, filters, saves, edits, and deletes purchasing records.

//Keep the data table and action panel aligned.
function syncEmployeeTableScroll(mainWrapper, actionPanel) {
    if (mainWrapper.dataset.scrollSyncAttached) return;
    let isSyncing = false;
    const syncScroll = (source, target) => {
        if (isSyncing) return;
        isSyncing = true;
        target.scrollTop = source.scrollTop;
        requestAnimationFrame(() => isSyncing = false);
    };
    mainWrapper.addEventListener('scroll', () => syncScroll(mainWrapper, actionPanel));
    actionPanel.addEventListener('scroll', () => syncScroll(actionPanel, mainWrapper));
    mainWrapper.dataset.scrollSyncAttached = 'true';
}

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

function setupActionPanel(table) {
    const wrapper = table.closest('.main-table-wrapper'); const header = Array.from(table.querySelectorAll('thead th')).find((cell) => /actions?/i.test(cell.textContent.trim()));
    if (!wrapper || !header || wrapper.dataset.actionPanelReady) return; wrapper.dataset.actionPanelReady = 'true'; const actionIndex = header.cellIndex;
    const layout = wrapper.parentNode.classList.contains('table-with-actions') ? wrapper.parentNode : document.createElement('div'); if (layout !== wrapper.parentNode) { layout.className = 'table-with-actions'; wrapper.parentNode.insertBefore(layout, wrapper); layout.appendChild(wrapper); }
    const panel = document.createElement('div'); panel.className = 'user-action-panel'; panel.innerHTML = '<table class="table table-premium action-table align-middle"><thead><tr><th>Action</th></tr></thead><tbody></tbody></table>'; layout.appendChild(panel); header.style.display = 'none';
    const render = () => { const body = panel.querySelector('tbody'); body.innerHTML = ''; Array.from(table.tBodies[0]?.rows || []).forEach((row) => { row.__actionButtons = row.__actionButtons || Array.from(row.querySelectorAll('.edit-entry-btn, .delete-entry-btn')); if (row.cells[actionIndex]) row.cells[actionIndex].style.display = 'none'; const actionRow = document.createElement('tr'); const cell = document.createElement('td'); const buttons = document.createElement('div'); buttons.className = 'action-buttons'; row.__actionButtons.forEach((button) => { const clone = button.cloneNode(true); clone.addEventListener('click', () => button.click()); buttons.appendChild(clone); }); cell.appendChild(buttons); actionRow.appendChild(cell); body.appendChild(actionRow); }); syncTableRowHeights(table, panel.querySelector('.action-table')); };
    const observer = new MutationObserver(render); if (table.tBodies[0]) observer.observe(table.tBodies[0], { childList: true }); render(); syncTableRowHeights(table, panel.querySelector('.action-table')); syncEmployeeTableScroll(wrapper, panel);
}
document.addEventListener('click', (event) => { const editButton = event.target.closest('.edit-entry-btn'); if (!editButton || editButton.dataset.entry) return; const source = document.querySelector(`tr [data-id="${editButton.dataset.id}"]`); if (source?.closest('tr')?.dataset.entry) editButton.dataset.entry = source.closest('tr').dataset.entry; }, true);
document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('table.table-premium').forEach(setupActionPanel));

const importFileBtn = document.getElementById("importFileBtn");
const importFileInput = document.getElementById("importFileInput");
const selectedFileName = document.getElementById("selectedFileName");

if (importFileBtn && importFileInput) {
    importFileBtn.addEventListener("click", () => importFileInput.click());
}

if (importFileInput) {
    importFileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (selectedFileName) {
            selectedFileName.textContent = file ? file.name : "No file chosen";
        }

        const importModal = new bootstrap.Modal(document.getElementById("importFileModal"));
        importModal.show();
    });
}

const newEntryUploadBtn = document.getElementById("newEntryUploadBtn");
const newEntryFileInput = document.getElementById("newEntryFileInput");
const selectedPurchaseFileName = document.getElementById("selectedPurchaseFileName");
const purchaseDocumentsInput = document.getElementById("documents");
const editUploadBtn = document.getElementById("editUploadBtn");
const editFileInput = document.getElementById("editFileInput");
const selectedEditFileName = document.getElementById("selectedEditFileName");
const editDocumentsInput = document.getElementById("edit_documents");

if (newEntryUploadBtn && newEntryFileInput) {
    newEntryUploadBtn.addEventListener("click", () => newEntryFileInput.click());
}

if (newEntryFileInput) {
    newEntryFileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (selectedPurchaseFileName) {
            selectedPurchaseFileName.textContent = file ? file.name : "No file chosen";
        }
        if (file && purchaseDocumentsInput) {
            purchaseDocumentsInput.value = file.name;
        }
    });
}

if (editUploadBtn && editFileInput) {
    editUploadBtn.addEventListener("click", () => editFileInput.click());
}

if (editFileInput) {
    editFileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (selectedEditFileName) {
            selectedEditFileName.textContent = file ? file.name : "No file chosen";
        }
        if (file && editDocumentsInput) {
            editDocumentsInput.value = file.name;
        }
    });
}

function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function normalizeDateInputValue(value) { if (!value) return ''; const raw = String(value).trim(); const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/); if (match) return `${match[1]}-${match[2]}-${match[3]}`; const date = new Date(raw); if (!Number.isNaN(date.getTime())) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; return raw; }
function formatDate(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); }
function formatCurrency(value) { const num = Number(value); return Number.isNaN(num) ? '' : num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function renderDocumentCell(value) {
    const safeValue = String(value ?? '').trim();
    if (!safeValue) return '';
    const label = safeValue.replace(/-[a-f0-9]{32}(?=\.)/, '') || safeValue;
    const encoded = encodeURIComponent(safeValue);
    return `<a href="/uploads/${encoded}" target="_blank" rel="noopener noreferrer" class="d-inline-block text-truncate" style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(label)}</a>`;
}
//Load purchasing records and render table rows.
async function loadPurchasingRows() {
    const tbody = document.getElementById('purchasingTableBody'); if (!tbody) return; try {
        const res = await fetch('/api/purchasing'); const result = await res.json().catch(() => ({})); if (!res.ok) throw new Error(result.error || 'Failed to load purchasing records'); const rows = Array.isArray(result.data) ? result.data : [];
        const tableWrapper = tbody.closest('.main-table-wrapper'); tableWrapper?.classList.toggle('is-empty', !rows.length); tableWrapper?.parentElement.querySelector('.user-action-panel')?.classList.toggle('is-empty', !rows.length);
        if (!rows.length) { tbody.innerHTML = '<tr><td colspan="20" class="text-center text-muted py-4"></td></tr>'; return; }
        tbody.innerHTML = rows.map((entry) => `
                    <tr data-entry="${JSON.stringify(entry).replace(/"/g, '&quot;')}">
                        <td>${escapeHtml(entry.po_no || '')}</td><td><div class="d-inline-block" style="white-space: nowrap;">${escapeHtml(formatDate(entry.purchase_date || entry.date))}</div></td><td>${escapeHtml(entry.supplier_name || '')}</td><td>${escapeHtml(entry.tin || '')}</td><td>${escapeHtml(entry.address || '')}</td><td>${escapeHtml(entry.item_code || '')}</td><td>${escapeHtml(entry.item_name || '')}</td><td>${escapeHtml(entry.description || '')}</td><td>${escapeHtml(entry.quantity || '')}</td><td>${escapeHtml(entry.unit || '')}</td><td>${formatCurrency(entry.unit_price)}</td><td>${formatCurrency(entry.discount)}</td><td>${formatCurrency(entry.vat)}</td><td>${formatCurrency(entry.total_amount)}</td><td>${escapeHtml(entry.requested_by || '')}</td><td>${escapeHtml(entry.approved_by || '')}</td><td><div class="d-inline-block" style="white-space: nowrap;">${escapeHtml(formatDate(entry.date_approved))}</div></td><td style="max-width: 220px;"><div class="d-inline-block w-100">${renderDocumentCell(entry.documents)}</div></td><td>${escapeHtml(entry.remarks || '')}</td><td><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-subtle edit-entry-btn" type="button" data-id="${entry.id}" data-bs-toggle="modal" data-bs-target="#editModal" title="Edit entry" aria-label="Edit entry"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger delete-entry-btn" type="button" data-id="${entry.id}" title="Delete entry" aria-label="Delete entry"><i class="bi bi-trash3"></i></button></div></td>
                    </tr>
                `).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="20" class="text-center text-danger py-4">${escapeHtml(err.message || 'Unable to load purchasing records')}</td></tr>`; }
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-bg-${type} border-0`;
    toast.role = 'alert';
    toast.ariaLive = 'assertive';
    toast.ariaAtomic = 'true';
    toast.style.pointerEvents = 'auto';
    toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
                </div>
            `;
    const closeButton = toast.querySelector('.btn-close');
    closeButton?.addEventListener('click', () => toast.remove());
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showDeleteConfirmation(entryId, kind) {
    const btn = document.getElementById('confirmDeleteBtn');
    if (!btn) return;
    btn.dataset.entryId = entryId;
    btn.dataset.kind = kind;
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!target || target.id !== 'confirmDeleteBtn') return;
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
        loadPurchasingRows();
    } catch (err) {
        modal.hide();
        showToast('Delete failed: ' + (err.message || err), 'danger');
    }
});

document.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.edit-entry-btn');
    if (editButton) {
        const row = editButton.closest('tr');
        const entry = JSON.parse(editButton.dataset.entry || row?.getAttribute('data-entry')?.replace(/&quot;/g, '"') || '{}');
        document.getElementById('edit_po_no').value = entry.po_no || '';
        document.getElementById('edit_date').value = normalizeDateInputValue(entry.purchase_date || entry.date);
        document.getElementById('edit_supplier_name').value = entry.supplier_name || '';
        document.getElementById('edit_tin').value = entry.tin || '';
        document.getElementById('edit_address').value = entry.address || '';
        document.getElementById('edit_item_code').value = entry.item_code || '';
        document.getElementById('edit_item_name').value = entry.item_name || '';
        document.getElementById('edit_description').value = entry.description || '';
        document.getElementById('edit_quantity').value = entry.quantity || '';
        document.getElementById('edit_unit').value = entry.unit || '';
        document.getElementById('edit_unit_price').value = entry.unit_price || '';
        document.getElementById('edit_discount').value = entry.discount || '';
        document.getElementById('edit_vat').value = entry.vat || '';
        document.getElementById('edit_total_amount').value = entry.total_amount || '';
        document.getElementById('edit_requested_by').value = entry.requested_by || '';
        document.getElementById('edit_approved_by').value = entry.approved_by || '';
        document.getElementById('edit_date_approved').value = normalizeDateInputValue(entry.date_approved);
        document.getElementById('edit_documents').value = entry.documents || '';
        document.getElementById('edit_remarks').value = entry.remarks || '';
        document.getElementById('edit_id').value = entry.id || '';
        return;
    }
    const deleteButton = event.target.closest('.delete-entry-btn');
    if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id) return;
        showDeleteConfirmation(id, 'purchasing');
    }
});
document.addEventListener('DOMContentLoaded', loadPurchasingRows);
const savePurchasingBtn = document.getElementById('savePurchasingBtn');
const saveEditedPurchasingBtn = document.getElementById('saveEditedPurchasingBtn');

const purchasingFields = [
    { key: 'po_no', id: 'po_no' },
    { key: 'purchase_date', id: 'purchase_date' },
    { key: 'supplier_name', id: 'supplier_name' },
    { key: 'tin', id: 'tin' },
    { key: 'address', id: 'address' },
    { key: 'item_code', id: 'item_code' },
    { key: 'item_name', id: 'item_name' },
    { key: 'description', id: 'description' },
    { key: 'quantity', id: 'quantity' },
    { key: 'unit', id: 'unit' },
    { key: 'unit_price', id: 'unit_price' },
    { key: 'discount', id: 'discount' },
    { key: 'vat', id: 'vat' },
    { key: 'total_amount', id: 'total_amount' },
    { key: 'requested_by', id: 'requested_by' },
    { key: 'approved_by', id: 'approved_by' },
    { key: 'date_approved', id: 'date_approved' },
    { key: 'transaction_details', id: 'transaction_details' },
    { key: 'remarks', id: 'remarks' }
];

function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? input.value : '';
}

function collectPurchasingPayload(mode) {
    const payload = { kind: 'purchasing', action: mode === 'edit' ? 'edit' : 'create' };
    if (mode === 'edit') {
        payload.id = getInputValue('edit_id');
    }
    purchasingFields.forEach(({ key, id }) => {
        const inputId = mode === 'edit' ? `edit_${id === 'purchase_date' ? 'date' : id}` : id;
        payload[key] = getInputValue(inputId);
    });
    payload.documents = getInputValue(mode === 'edit' ? 'edit_documents' : 'documents');
    if (mode === 'edit') payload.original_po_no = getInputValue('edit_po_no');
    return payload;
}

//Save new and edited purchasing records.
async function submitPurchasingModal(mode) {
    const button = mode === 'edit' ? saveEditedPurchasingBtn : savePurchasingBtn;
    if (button) button.disabled = true;
    try {
        const formData = new FormData();
        const payload = collectPurchasingPayload(mode);
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value));

        const fileInput = document.getElementById(mode === 'edit' ? 'editFileInput' : 'newEntryFileInput');
        if (fileInput?.files?.[0]) {
            formData.append('documents_file', fileInput.files[0]);
        }

        const res = await fetch('/api/purchasing', { method: 'POST', body: formData });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || res.statusText || 'Save failed');
        const modalEl = document.getElementById(mode === 'edit' ? 'editModal' : 'newEntryModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        showToast(mode === 'edit' ? 'Entry updated.' : 'Entry saved.', 'success');
        loadPurchasingRows();
    } catch (err) {
        showToast('Save failed: ' + (err.message || err), 'danger');
    } finally {
        if (button) button.disabled = false;
    }
}

savePurchasingBtn?.addEventListener('click', () => submitPurchasingModal('create'));
saveEditedPurchasingBtn?.addEventListener('click', () => submitPurchasingModal('edit'));

document.getElementById('newEntryModal')?.addEventListener('hidden.bs.modal', (event) => {
    event.currentTarget.querySelectorAll('input, select, textarea').forEach((field) => {
        if (field.type === 'file') field.value = '';
        else if (field.type !== 'hidden' && field.type !== 'button' && field.type !== 'submit') field.value = '';
    });
});

//Validate and import spreadsheet rows.
function setupSpreadsheetImport(config) {
    const invalidFileMessage = 'Invalid File: The file does not match.';
    const validationMessage = document.getElementById('importValidationMessage');
    if (validationMessage) new MutationObserver(() => { if (validationMessage.textContent === 'The file headers do not match this table.') { validationMessage.className = 'alert alert-danger'; validationMessage.textContent = invalidFileMessage; showToast(invalidFileMessage, 'danger'); } }).observe(validationMessage, { childList: true, characterData: true, subtree: true });
    const renderRows = (target, rows, includeReason = false) => { const head = document.getElementById(target + 'Head'); const body = document.getElementById(target + 'Body'); if (!head || !body) return; head.innerHTML = `<tr>${config.fields.map((field) => `<th>${field.replace(/_/g, ' ')}</th>`).join('')}${includeReason ? '<th>Reason</th>' : ''}</tr>`; body.innerHTML = rows.length ? rows.map(({ data, reason }) => `<tr>${config.fields.map((field) => `<td>${escapeHtml(data[field])}</td>`).join('')}${includeReason ? `<td>${escapeHtml(reason)}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${config.fields.length + (includeReason ? 1 : 0)}" class="text-center text-muted py-3">No data</td></tr>`; };
    const input = document.getElementById(config.fileId); const button = document.getElementById(config.buttonId); const message = document.getElementById('importValidationMessage'); let rows = [];
    if (!input || !button || typeof XLSX === 'undefined') return;
    input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; try { const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, raw: false }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const parsed = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }); const headers = (parsed.shift() || []).map((value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')); const indexes = Object.fromEntries(config.fields.map((field) => [field, headers.indexOf(field.replace(/_/g, ''))])); if (!config.fields.some((field) => indexes[field] >= 0)) throw new Error('The file headers do not match this table.'); rows = parsed.filter((cells) => cells.some((cell) => String(cell).trim())).map((cells) => Object.fromEntries(config.fields.map((field) => [field, indexes[field] >= 0 ? cells[indexes[field]] || '' : '']))); renderRows('importValidTable', rows.map((data) => ({ data }))); renderRows('importInvalidTable', [], true); if (message) { message.className = `alert ${rows.length ? 'alert-success' : 'alert-warning'} mt-3`; message.textContent = `${rows.length} row(s) ready to import.`; } button.disabled = !rows.length; } catch (error) { rows = []; button.disabled = true; if (message) { message.className = 'alert alert-danger mt-3'; message.textContent = error.message || 'Unable to read file.'; } } });
    button.addEventListener('click', async () => { button.disabled = true; try { for (const row of rows) { const body = new FormData(); body.append('kind', config.kind); body.append('action', 'create'); Object.entries(row).forEach(([key, value]) => body.append(key, value)); const response = await fetch(config.endpoint, { method: 'POST', body }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Import failed'); } bootstrap.Modal.getInstance(document.getElementById('importFileModal'))?.hide(); showToast(`${rows.length} row(s) imported successfully.`, 'success'); input.value = ''; rows = []; await config.reload(); } catch (error) { showToast('Import failed: ' + (error.message || error), 'danger'); button.disabled = false; } });
}
setupSpreadsheetImport({ fileId: 'importFileInput', buttonId: 'confirmImportBtn', fields: purchasingFields.map(({ key }) => key), endpoint: '/api/purchasing', kind: 'purchasing', reload: loadPurchasingRows, multipart: true });


const chartSummaryConfigs = {
    purchasing: { endpoint: '/api/purchasing', items: [['Orders', (rows) => rows.length], ['Total spend', (rows) => sumChartValues(rows, 'total_amount')], ['Items', (rows) => uniqueChartValues(rows, 'item_name')]] },
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
