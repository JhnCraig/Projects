const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const selectedFileName = document.getElementById("selectedFileName");

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

const saveEditedSalesBtn = document.getElementById('saveEditedSalesBtn');
let pendingSaveMode = null;

function showSaveConfirmation(mode) {
    pendingSaveMode = mode;
    const modalEl = document.getElementById('saveConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

const salesFields = [
    { key: 'month', id: 'month' },
    { key: 'client_name', id: 'client_name' },
    { key: 'project_code', id: 'project_code' },
    { key: 'tin', id: 'tin' },
    { key: 'address', id: 'address' },
    { key: 'po_amount', id: 'po_amount' },
    { key: 'si_no', id: 'si_no' },
    { key: 'si_date', id: 'si_date' },
    { key: 'inv_amount', id: 'inv_amount' },
    { key: 'vat', id: 'vat' },
    { key: 'net_of_vat', id: 'net_of_vat' },
    { key: 'wtax_2', id: 'wtax_2' },
    { key: 'net_amount', id: 'net_amount' },
    { key: 'cash_in_bank', id: 'cash_in_bank' },
    { key: 'transaction_date', id: 'transaction_date' },
    { key: 'bank', id: 'bank' },
    { key: 'remarks', id: 'remarks' },
    { key: 'po_no', id: 'po_no' },
    { key: 'description', id: 'description' }
];

function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? input.value : '';
}

function normalizeDateInputValue(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const raw = String(value).trim();
    if (!raw) {
        return '';
    }

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }

    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return raw;
}

function collectSalesPayload(mode) {
    const payload = { kind: 'sales', action: mode === 'edit' ? 'edit' : 'create' };
    salesFields.forEach(({ key, id }) => {
        const inputId = mode === 'edit' ? `edit_${id}` : id;
        payload[key] = getInputValue(inputId);
    });
    if (mode === 'edit') {
        payload.id = getInputValue('edit_sales_id');
        payload.original_month = getInputValue('edit_month');
    }
    return payload;
}

async function submitSalesModal(mode) {
    const payload = collectSalesPayload(mode);
    const button = mode === 'edit' ? saveEditedSalesBtn : null;
    if (button) button.disabled = true;
    try {
        const res = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || res.statusText || 'Save failed');
        const modalEl = document.getElementById(mode === 'edit' ? 'editModal' : 'newEntryModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        showToast(mode === 'edit' ? 'Entry updated.' : 'Sales entry saved.', 'success');
        loadSalesRows();
    } catch (err) {
        showToast('Save failed: ' + (err.message || err), 'danger');
    } finally {
        if (button) button.disabled = false;
    }
}

document.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.edit-entry-btn');
    if (editButton) {
        const row = editButton.closest('tr');
        if (!row) return;
        const entry = JSON.parse(row.getAttribute('data-entry')?.replace(/&quot;/g, '"') || '{}');
        document.getElementById('edit_sales_id').value = editButton.dataset.id || entry.id || '';
        const map = [
            ['edit_month', entry.month || ''],
            ['edit_client_name', entry.client_name || ''],
            ['edit_project_code', entry.project_code || ''],
            ['edit_tin', entry.tin || ''],
            ['edit_address', entry.address || ''],
            ['edit_po_amount', entry.po_amount || ''],
            ['edit_si_no', entry.si_no || ''],
            ['edit_si_date', normalizeDateInputValue(entry.si_date)],
            ['edit_inv_amount', entry.inv_amount || ''],
            ['edit_vat', entry.vat || ''],
            ['edit_net_of_vat', entry.net_of_vat || ''],
            ['edit_wtax_2', entry.wtax_2 || ''],
            ['edit_net_amount', entry.net_amount || ''],
            ['edit_cash_in_bank', entry.cash_in_bank || ''],
            ['edit_transaction_date', normalizeDateInputValue(entry.transaction_date)],
            ['edit_bank', entry.bank || ''],
            ['edit_remarks', entry.remarks || ''],
            ['edit_po_no', entry.po_no || ''],
            ['edit_description', entry.description || '']
        ];
        map.forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input) input.value = value;
        });
        return;
    }

    const deleteButton = event.target.closest('.delete-entry-btn');
    if (!deleteButton) return;
    const id = deleteButton.dataset.id;
    if (!id) return;
    showDeleteConfirmation(id);
});

if (saveEditedSalesBtn) saveEditedSalesBtn.addEventListener('click', () => showSaveConfirmation('edit'));

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return '';
    return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });
}

async function loadSalesRows() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/sales');
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Failed to load sales records');

        const rows = Array.isArray(result.data) ? result.data : [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="20" class="text-center text-muted py-4">No sales records found.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map((entry) => {
            const entryJson = JSON.stringify(entry).replace(/"/g, '&quot;');
            return `
                        <tr data-entry="${entryJson}">
                            <td>${escapeHtml(entry.month || '')}</td>
                            <td>${escapeHtml(entry.client_name || '')}</td>
                            <td>${escapeHtml(entry.project_code || '')}</td>
                            <td>${escapeHtml(entry.tin || '')}</td>
                            <td>${escapeHtml(entry.address || '')}</td>
                            <td>${formatCurrency(entry.po_amount)}</td>
                            <td>${escapeHtml(entry.si_no || '')}</td>
                            <td>${escapeHtml(formatDate(entry.si_date))}</td>
                            <td>${formatCurrency(entry.inv_amount)}</td>
                            <td>${formatCurrency(entry.vat)}</td>
                            <td>${formatCurrency(entry.net_of_vat)}</td>
                            <td>${formatCurrency(entry.wtax_2)}</td>
                            <td>${formatCurrency(entry.net_amount)}</td>
                            <td>${formatCurrency(entry.cash_in_bank)}</td>
                            <td>${escapeHtml(formatDate(entry.transaction_date))}</td>
                            <td>${escapeHtml(entry.bank || '')}</td>
                            <td>${escapeHtml(entry.remarks || '')}</td>
                            <td>${escapeHtml(entry.po_no || '')}</td>
                            <td>${escapeHtml(entry.description || '')}</td>
                            <td>
                                <div class="d-flex gap-2">
                                    <button class="btn btn-outline-subtle edit-entry-btn" type="button" data-id="${entry.id}" data-bs-toggle="modal" data-bs-target="#editModal">Edit</button>
                                    <button class="btn btn-outline-subtle delete-entry-btn" type="button" data-id="${entry.id}">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="20" class="text-center text-danger py-4">${escapeHtml(err.message || 'Unable to load sales records')}</td></tr>`;
    }
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

function showDeleteConfirmation(entryId) {
    const btn = document.getElementById('confirmDeleteBtn');
    const message = document.getElementById('deleteConfirmMessage');
    if (!btn) return;
    btn.dataset.entryId = entryId;
    if (message) {
        message.textContent = 'Delete this sales entry? This action cannot be undone.';
    }
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirmDeleteBtn');
    const entryId = btn?.dataset.entryId;
    if (!entryId) return;
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    try {
        const res = await fetch(`/api/sales/${entryId}`, { method: 'DELETE' });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Delete failed');
        modal.hide();
        showToast('Entry deleted.', 'danger');
        loadSalesRows();
    } catch (err) {
        modal.hide();
        showToast('Delete failed: ' + (err.message || err), 'danger');
    }
});

document.addEventListener('DOMContentLoaded', loadSalesRows);

const saveSalesBtn = document.getElementById('saveSalesBtn');
if (saveSalesBtn) {
    saveSalesBtn.addEventListener('click', () => showSaveConfirmation('create'));
}

document.getElementById('confirmSaveBtn')?.addEventListener('click', async () => {
    const mode = pendingSaveMode || 'create';
    pendingSaveMode = null;
    const modalEl = document.getElementById('saveConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();
    await submitSalesModal(mode);
});
