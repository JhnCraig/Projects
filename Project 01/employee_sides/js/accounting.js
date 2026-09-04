const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const selectedFileName = document.getElementById("selectedFileName");
const saveAccountingBtn = document.getElementById("saveAccountingBtn");
const saveEditedAccountingBtn = document.getElementById("saveEditedAccountingBtn");
const chartToggleBtn = document.getElementById("chartToggleBtn");
const accountingChartModal = document.getElementById("accountingChartModal");
const confirmImportBtn = document.getElementById("confirmImportBtn");
const accountingTableWrapper = document.getElementById("accountingTableWrapper");
let accountingRows = [];
let accountingChart = null;

const accountingFields = [
    { key: "cv_no", id: "cv_no" },
    { key: "date", id: "date" },
    { key: "payee", id: "payee" },
    { key: "supplier_name", id: "supplier_name" },
    { key: "tin", id: "tin" },
    { key: "address", id: "address" },
    { key: "transaction_details", id: "transaction_details" },
    { key: "amount", id: "amount" },
    { key: "vat_12", id: "vat_12" },
    { key: "net_of_vat", id: "net_of_vat" },
    { key: "vat_exempt", id: "vat_exempt" },
    { key: "non_vat", id: "non_vat" },
    { key: "wtax", id: "wtax" },
    { key: "account_code", id: "account_code" },
    { key: "account_name", id: "account_name" },
    { key: "project", id: "project" },
    { key: "si_no", id: "si_no" },
    { key: "si_date", id: "si_date" },
    { key: "remarks", id: "remarks" }
];

function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function parseChartNumber(value) {
    const cleaned = String(value ?? '')
        .replace(/[₱PpHh$\s,]/g, '')
        .replace(/[^\d.-]/g, '')
        .trim();
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getAccountingChartValue(entry) {
    for (const field of ['amount', 'net_of_vat', 'vat_exempt', 'non_vat', 'vat_12', 'wtax']) {
        const value = parseChartNumber(entry[field]);
        if (value > 0) return value;
    }
    return 0;
}

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

function showDeleteConfirmation(entryId) {
    const btn = document.getElementById('confirmDeleteBtn');
    if (!btn) return;
    btn.dataset.entryId = entryId;
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

function resetNewEntryForm() {
    const modal = document.getElementById('newEntryModal');
    if (!modal) return;

    modal.querySelectorAll('input, textarea, select').forEach((field) => {
        if (field instanceof HTMLInputElement) {
            if (field.type === 'file' || field.type === 'hidden' || field.type === 'button' || field.type === 'submit' || field.type === 'reset') {
                if (field.type === 'file') field.value = '';
                return;
            }
            field.value = '';
        } else if (field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
            field.value = '';
        }
    });

    ['selectedFileName', 'selectedPurchaseFileName', 'newEntrySelectedFileName', 'file_name', 'documents', 'newEntryFileInput'].forEach((id) => {
        const el = document.getElementById(id);
        if (el instanceof HTMLInputElement) {
            el.value = '';
        } else if (el) {
            el.textContent = 'No file chosen';
        }
    });
}

const newEntryModal = document.getElementById('newEntryModal');
if (newEntryModal) {
    newEntryModal.addEventListener('hidden.bs.modal', resetNewEntryForm);
}

function renderActionPanel(rows) {
    const panel = document.getElementById('actionPanel');
    if (!panel) return;

    panel.innerHTML = `
        <table class="table table-premium action-table align-middle">
            <thead>
                <tr>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((entry) => `
                    <tr>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-outline-subtle edit-entry-btn" type="button" data-id="${entry.id}" data-entry="${JSON.stringify(entry).replace(/"/g, '&quot;')}" data-bs-toggle="modal" data-bs-target="#editModal" title="Edit entry" aria-label="Edit entry">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-entry-btn" type="button" data-id="${entry.id}" title="Delete entry" aria-label="Delete entry">
                                    <i class="bi bi-trash3"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

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

function syncAccountingRowHeights() {
    const mainRows = Array.from(document.querySelectorAll('#accountingTableBody tr'));
    const actionRows = Array.from(document.querySelectorAll('#actionPanel tbody tr'));

    mainRows.forEach((row) => row.style.height = 'auto');
    actionRows.forEach((row) => row.style.height = 'auto');

    mainRows.forEach((row, index) => {
        const actionRow = actionRows[index];
        if (!actionRow) return;

        const rowHeight = Math.max(row.offsetHeight, actionRow.offsetHeight);
        row.style.height = `${rowHeight}px`;
        actionRow.style.height = `${rowHeight}px`;
    });
}

window.addEventListener('resize', syncAccountingRowHeights);

function renderAccountingChart(rows) {
    const canvas = document.getElementById('accountingChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const totalsByProject = {};
    rows.forEach((entry) => {
        const projectName = (entry.project || entry.account_name || 'Unassigned').trim() || 'Unassigned';
        const numericValue = getAccountingChartValue(entry);
        if (numericValue <= 0) return;
        totalsByProject[projectName] = (totalsByProject[projectName] || 0) + numericValue;
    });

    const labels = Object.keys(totalsByProject);
    const data = Object.values(totalsByProject);

    if (accountingChart) {
        accountingChart.destroy();
    }

    accountingChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels.length ? labels : ['No data'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: labels.length
                    ? labels.map((_, index) => [
                        '#4e73df', '#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc', '#858796', '#fd7e14', '#6f42c1'
                    ][index % 8])
                    : ['#dfe3e8'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1400, easing: 'easeOutCubic', animateRotate: true, animateScale: true },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${Number(context.parsed || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                    }
                }
            }
        }
    });
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirmDeleteBtn');
    const entryId = btn?.dataset.entryId;
    if (!entryId) return;
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    try {
        const response = await fetch(`/api/accounting/${entryId}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Delete failed');
        modal.hide();
        showToast('Entry deleted.', 'danger');
        loadAccountingRows();
    } catch (error) {
        modal.hide();
        showToast('Delete failed: ' + (error.message || error), 'danger');
    }
});

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? input.value : "";
}

function collectAccountingPayload(mode) {
    const payload = { kind: "accounting", action: mode === "edit" ? "edit" : "create" };
    if (mode === "edit") {
        payload.id = getInputValue("edit_id");
    }
    accountingFields.forEach(({ key, id }) => {
        const inputId = mode === "edit" ? `edit_${id}` : id;
        payload[key] = getInputValue(inputId);
    });

    if (mode === "edit") {
        payload.original_cv_no = getInputValue("edit_cv_no");
    }

    return payload;
}

async function submitAccountingModal(mode) {
    const payload = collectAccountingPayload(mode);
    const button = mode === "edit" ? saveEditedAccountingBtn : saveAccountingBtn;
    if (button) {
        button.disabled = true;
    }

    try {
        const response = await fetch("/submit-entry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || "Unable to save entry");
        }

        const modalElement = document.getElementById(mode === "edit" ? "editModal" : "newEntryModal");
        const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        if (mode !== "edit") {
            resetNewEntryForm();
        }
        modal.hide();
        showToast(mode === "edit" ? "Entry updated successfully." : "Entry saved successfully.", 'success');
        loadAccountingRows();
    } catch (error) {
        showToast(error.message || "Unable to save the accounting entry.", 'danger');
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

async function loadAccountingRows() {
    const tbody = document.getElementById("accountingTableBody");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="20" class="text-center text-muted py-4">Loading accounting records...</td></tr>';

    try {
        const response = await fetch("/api/accounting");
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || "Failed to load accounting records");
        }

        const rows = Array.isArray(result.data) ? result.data : [];
        accountingRows = rows;
        renderActionPanel(rows);
        document.getElementById('accountingTableWrapper')?.classList.toggle('is-empty', !rows.length);
        document.getElementById('actionPanel')?.classList.toggle('is-empty', !rows.length);

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="20" class="text-center text-muted py-4"> </td></tr>';
            renderAccountingChart([]);
            return;
        }

        tbody.innerHTML = rows.map((entry) => `
                    <tr data-entry="${JSON.stringify(entry).replace(/\"/g, '&quot;')}">
                        <td>${escapeHtml(entry.cv_no || "")}</td>
                        <td class="date-column">${escapeHtml(formatDate(entry.transaction_date || entry.date))}</td>
                        <td>${escapeHtml(entry.payee || "")}</td>
                        <td class="accounting-text-column">${escapeHtml(entry.transaction_details || "")}</td>
                        <td>${escapeHtml(entry.supplier_name || "")}</td>
                        <td>${escapeHtml(entry.tin || "")}</td>
                        <td>${escapeHtml(entry.address || "")}</td>
                        <td>${escapeHtml(entry.amount ?? "")}</td>
                        <td>${escapeHtml(entry.vat_12 ?? "")}</td>
                        <td>${escapeHtml(entry.net_of_vat ?? "")}</td>
                        <td>${escapeHtml(entry.vat_exempt ?? "")}</td>
                        <td>${escapeHtml(entry.non_vat ?? "")}</td>
                        <td>${escapeHtml(entry.wtax ?? "")}</td>
                        <td>${escapeHtml(entry.si_no || "")}</td>
                        <td>${escapeHtml(formatDate(entry.si_date))}</td>
                        <td>${escapeHtml(entry.account_code || entry.acct_code || "")}</td>
                        <td>${escapeHtml(entry.account_name || entry.acct_name || "")}</td>
                        <td>${escapeHtml(entry.project || "")}</td>
                        <td class="accounting-text-column">${escapeHtml(entry.remark || entry.remarks || "")}</td>
                    </tr>
                `).join("");

        syncAccountingRowHeights();
        syncEmployeeTableScroll(accountingTableWrapper, document.getElementById('actionPanel'));
        renderAccountingChart(rows);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="20" class="text-center text-danger py-4">${escapeHtml(error.message || "Unable to load accounting records")}</td></tr>`;
        renderAccountingChart([]);
    }
}

document.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".edit-entry-btn");
    if (editButton) {
        const entry = JSON.parse(editButton.dataset.entry || "{}");
        document.getElementById("edit_cv_no").value = entry.cv_no || "";
        document.getElementById("edit_date").value = entry.transaction_date || entry.date ? new Date(entry.transaction_date || entry.date).toISOString().split("T")[0] : "";
        document.getElementById("edit_payee").value = entry.payee || "";
        document.getElementById("edit_supplier_name").value = entry.supplier_name || "";
        document.getElementById("edit_tin").value = entry.tin || "";
        document.getElementById("edit_address").value = entry.address || "";
        document.getElementById("edit_transaction_details").value = entry.transaction_details || "";
        document.getElementById("edit_amount").value = entry.amount ?? "";
        document.getElementById("edit_vat_12").value = entry.vat_12 ?? "";
        document.getElementById("edit_net_of_vat").value = entry.net_of_vat ?? "";
        document.getElementById("edit_vat_exempt").value = entry.vat_exempt ?? "";
        document.getElementById("edit_non_vat").value = entry.non_vat ?? "";
        document.getElementById("edit_wtax").value = entry.wtax ?? "";
        document.getElementById("edit_si_no").value = entry.si_no || "";
        document.getElementById("edit_si_date").value = entry.si_date ? new Date(entry.si_date).toISOString().split("T")[0] : "";
        document.getElementById("edit_account_code").value = entry.account_code || entry.acct_code || "";
        document.getElementById("edit_account_name").value = entry.account_name || entry.acct_name || "";
        document.getElementById("edit_project").value = entry.project || "";
        document.getElementById("edit_remarks").value = entry.remark || entry.remarks || "";
        document.getElementById("edit_id").value = editButton.dataset.id || entry.id || "";
        return;
    }

    const deleteButton = event.target.closest(".delete-entry-btn");
    if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (!id) return;
        showDeleteConfirmation(id);
    }
});

if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", () => fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (selectedFileName) {
            selectedFileName.textContent = file ? file.name : "No file chosen";
        }

        const importModal = new bootstrap.Modal(document.getElementById("importFileModal"));
        importModal.show();
        if (!file || typeof XLSX === 'undefined') return;

        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, raw: false });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const parsedRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
            const headerRow = parsedRows.shift() || [];
            const headers = headerRow.map((value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
            const indexes = Object.fromEntries(accountingFields.map(({ key }) => [key, headers.indexOf(key.replace(/_/g, ''))]));
            const importedRows = parsedRows.filter((cells) => cells.some((cell) => String(cell).trim())).map((cells) => Object.fromEntries(accountingFields.map(({ key }) => [key, indexes[key] >= 0 ? cells[indexes[key]] || '' : ''])));
            const validationMessage = document.getElementById('importValidationMessage');
            const renderImportTable = (headId, bodyId, rows, includeReason = false) => {
                const head = document.getElementById(headId);
                const body = document.getElementById(bodyId);
                if (!head || !body) return;
                head.innerHTML = `<tr>${accountingFields.map(({ key }) => `<th>${key.replace(/_/g, ' ')}</th>`).join('')}${includeReason ? '<th>Reason</th>' : ''}</tr>`;
                body.innerHTML = rows.length ? rows.map(({ data, reason }) => `<tr>${accountingFields.map(({ key }) => `<td>${escapeHtml(data[key])}</td>`).join('')}${includeReason ? `<td>${escapeHtml(reason)}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${accountingFields.length + (includeReason ? 1 : 0)}" class="text-center text-muted py-3">No data</td></tr>`;
            };

            if (accountingFields.some(({ key }) => indexes[key] < 0)) {
                if (validationMessage) {
                    validationMessage.className = 'alert alert-danger';
                    validationMessage.textContent = 'Invalid File: The file does not match.';
                }
                if (confirmImportBtn) confirmImportBtn.disabled = true;
                showToast('Invalid File: The file does not match.', 'danger');
                return;
            }
            renderImportTable('importValidTableHead', 'importValidTableBody', importedRows.map((data) => ({ data })));
            renderImportTable('importInvalidTableHead', 'importInvalidTableBody', [], true);
            if (validationMessage) {
                validationMessage.className = `alert ${importedRows.length ? 'alert-success' : 'alert-warning'}`;
                validationMessage.textContent = `${importedRows.length} row(s) ready to save.`;
            }
            confirmImportBtn.disabled = importedRows.length === 0;
            confirmImportBtn.onclick = async () => {
                confirmImportBtn.disabled = true;
                try {
                    for (const row of importedRows) {
                        const response = await fetch('/submit-entry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'accounting', action: 'create', ...row }) });
                        const result = await response.json().catch(() => ({}));
                        if (!response.ok) throw new Error(result.error || 'Unable to save imported data');
                    }
                    bootstrap.Modal.getInstance(document.getElementById('importFileModal'))?.hide();
                    showToast(`${importedRows.length} imported row(s) saved successfully.`, 'success');
                    fileInput.value = '';
                    selectedFileName.textContent = 'No file chosen';
                    document.getElementById('importValidTableHead').innerHTML = '';
                    document.getElementById('importValidTableBody').innerHTML = '';
                    document.getElementById('importInvalidTableHead').innerHTML = '';
                    document.getElementById('importInvalidTableBody').innerHTML = '';
                    validationMessage.className = 'alert d-none';
                    validationMessage.textContent = '';
                    loadAccountingRows();
                } catch (error) {
                    showToast(error.message || 'Unable to save imported data.', 'danger');
                    confirmImportBtn.disabled = false;
                }
            };
        } catch (error) {
            const validationMessage = document.getElementById('importValidationMessage');
            if (validationMessage) {
                validationMessage.className = 'alert alert-danger';
                validationMessage.textContent = 'Invalid File: The file does not match.';
            }
            if (confirmImportBtn) confirmImportBtn.disabled = true;
            showToast('Invalid File: The file does not match.', 'danger');
        }
    });
}

if (saveAccountingBtn) {
    saveAccountingBtn.addEventListener("click", () => submitAccountingModal("create"));
}

if (saveEditedAccountingBtn) {
    saveEditedAccountingBtn.addEventListener("click", () => submitAccountingModal("edit"));
}

if (chartToggleBtn) {
    chartToggleBtn.addEventListener("click", () => {
        if (accountingChartModal) {
            const modal = bootstrap.Modal.getInstance(accountingChartModal) || new bootstrap.Modal(accountingChartModal);
            modal.show();
            setTimeout(() => renderAccountingChart(accountingRows), 120);
        }
    });
}

document.addEventListener("DOMContentLoaded", loadAccountingRows);

document.getElementById('newEntryModal')?.addEventListener('hidden.bs.modal', resetNewEntryForm);


const chartSummaryConfigs = {
    accounting: { endpoint: '/api/accounting', items: [['Entries', (rows) => rows.length], ['Total amount', (rows) => sumChartValues(rows, 'amount')], ['Projects', (rows) => uniqueChartValues(rows, 'project')]] },
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
