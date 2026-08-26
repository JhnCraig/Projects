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
async function loadPurchasingRows() {
    const tbody = document.getElementById('purchasingTableBody'); if (!tbody) return; try {
        const res = await fetch('/api/purchasing'); const result = await res.json().catch(() => ({})); if (!res.ok) throw new Error(result.error || 'Failed to load purchasing records'); const rows = Array.isArray(result.data) ? result.data : [];
        if (!rows.length) { tbody.innerHTML = '<tr><td colspan="20" class="text-center text-muted py-4">No purchasing records found.</td></tr>'; return; }
        tbody.innerHTML = rows.map((entry) => `
                    <tr data-entry="${JSON.stringify(entry).replace(/"/g, '&quot;')}">
                        <td>${escapeHtml(entry.po_no || '')}</td><td><div class="d-inline-block" style="white-space: nowrap;">${escapeHtml(formatDate(entry.purchase_date || entry.date))}</div></td><td>${escapeHtml(entry.supplier_name || '')}</td><td>${escapeHtml(entry.tin || '')}</td><td>${escapeHtml(entry.address || '')}</td><td>${escapeHtml(entry.item_code || '')}</td><td>${escapeHtml(entry.item_name || '')}</td><td>${escapeHtml(entry.description || '')}</td><td>${escapeHtml(entry.quantity || '')}</td><td>${escapeHtml(entry.unit || '')}</td><td>${formatCurrency(entry.unit_price)}</td><td>${formatCurrency(entry.discount)}</td><td>${formatCurrency(entry.vat)}</td><td>${formatCurrency(entry.total_amount)}</td><td>${escapeHtml(entry.requested_by || '')}</td><td>${escapeHtml(entry.approved_by || '')}</td><td><div class="d-inline-block" style="white-space: nowrap;">${escapeHtml(formatDate(entry.date_approved))}</div></td><td style="max-width: 220px;"><div class="d-inline-block w-100">${renderDocumentCell(entry.documents)}</div></td><td>${escapeHtml(entry.remarks || '')}</td><td><div class="d-flex gap-2"><button class="btn btn-outline-subtle edit-entry-btn" type="button" data-id="${entry.id}" data-bs-toggle="modal" data-bs-target="#editModal">Edit</button><button class="btn btn-outline-subtle delete-entry-btn" type="button" data-id="${entry.id}">Delete</button></div></td>
                    </tr>
                `).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="20" class="text-center text-danger py-4">${escapeHtml(err.message || 'Unable to load purchasing records')}</td></tr>`; }
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
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
        const entry = JSON.parse(row?.getAttribute('data-entry')?.replace(/&quot;/g, '"') || '{}');
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

async function submitPurchasingModal(mode) {
    const button = mode === 'edit' ? saveEditedPurchasingBtn : null;
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

document.getElementById('savePurchasingBtn')?.addEventListener('click', () => submitPurchasingModal('create'));
saveEditedPurchasingBtn?.addEventListener('click', () => submitPurchasingModal('edit'));
