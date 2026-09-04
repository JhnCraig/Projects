const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const selectedFileName = document.getElementById("selectedFileName");
const confirmImportBtn = document.getElementById("confirmImportBtn");
const saveAccountingBtn = document.getElementById("saveAccountingBtn");
const saveEditedAccountingBtn = document.getElementById("saveEditedAccountingBtn");
const chartToggleBtn = document.getElementById("chartToggleBtn");
const accountingChartModal = document.getElementById("accountingChartModal");
let accountingRows = [];
let accountingChart = null;
let pendingImportRows = [];
let pendingInvalidImportRows = [];

function resetAccountingImport() {
    pendingImportRows = [];
    pendingInvalidImportRows = [];
    if (fileInput) fileInput.value = '';
    if (selectedFileName) selectedFileName.textContent = 'No file chosen';
    if (confirmImportBtn) confirmImportBtn.disabled = true;
    ['importValidTableHead', 'importValidTableBody', 'importInvalidTableHead', 'importInvalidTableBody'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    const validationMessage = document.getElementById('importValidationMessage');
    if (validationMessage) {
        validationMessage.className = 'alert d-none';
        validationMessage.textContent = '';
    }
}

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
    if (value === null || value === undefined || value === '') return 0;

    const cleaned = String(value)
        .replace(/[₱PpHh$\s,]/g, '')
        .replace(/[^\d.-]/g, '')
        .trim();

    if (!cleaned || cleaned === '-' || cleaned === '.') return 0;

    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getAccountingChartValue(row) {
    const financialFields = ['amount', 'net_of_vat', 'vat_exempt', 'non_vat', 'vat_12', 'wtax'];

    for (const field of financialFields) {
        const value = parseChartNumber(row[field]);
        if (value > 0) return value;
    }

    return 0;
}

function showToast(message, type = 'success', persistent = false) {
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
    if (!persistent) {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(24px)';
            setTimeout(() => notification.remove(), 180);
        }, 3200);
    }
}

function showDeleteConfirmation(entryId) {
    const btn = document.getElementById('confirmDeleteBtn');
    if (!btn) return;
    btn.dataset.entryId = entryId;
    const modalEl = document.getElementById('deleteConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
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

function setupTableChart(config) {
    const { buttonId, modalId, canvasId, getRows, labelKey, valueKey } = config;
    const button = document.getElementById(buttonId);
    const modal = document.getElementById(modalId);
    const canvas = document.getElementById(canvasId);

    if (!button || !modal || !canvas) return;

    button.addEventListener('click', () => {
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        setTimeout(() => {
            if (accountingChart) accountingChart.destroy();

            const rows = getRows();
            const labels = [];
            const data = [];

            rows.forEach((row) => {
                const label = String(row[labelKey] || row.account_name || row.payee || 'Unknown').trim() || 'Unknown';
                const value = getAccountingChartValue(row);
                if (value <= 0) return;
                const existingIndex = labels.indexOf(label);

                if (existingIndex > -1) {
                    data[existingIndex] += value;
                } else {
                    labels.push(label);
                    data.push(value);
                }
            });

            const finalLabels = labels.length ? labels : ['No Data'];
            const finalData = labels.length ? data : [1];

            const ctx = canvas.getContext('2d');

            accountingChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: finalLabels,
                    datasets: [{
                        data: finalData,
                        backgroundColor: labels.length ? ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#198754', '#20c997', '#0dcaf0', '#ffc107', '#dc3545', '#6c757d'] : ['#e9ecef'],
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
                            display: labels.length > 0,
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: { size: 14, weight: '500' }
                            }
                        },
                        tooltip: {
                            enabled: labels.length > 0,
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((sum, value) => sum + value, 0) || 1;
                                    const value = Number(context.parsed) || 0;
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            accountingChart.reset();
            accountingChart.update();
        }, 120);
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
            tbody.innerHTML = '<tr><td colspan="19" class="text-center text-muted py-4"> </td></tr>';
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
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="20" class="text-center text-danger py-4">${escapeHtml(error.message || "Unable to load accounting records")}</td></tr>`;
    }
}

document.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".edit-entry-btn");
    if (editButton) {
        const row = editButton.closest("tr");
        const entry = JSON.parse(editButton.dataset.entry || row?.getAttribute("data-entry")?.replace(/&quot;/g, '"') || "{}");
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

const importHeaders = accountingFields.map(({ key }) => key);
const importHeaderAliases = {
    cvno: 'cv_no', date: 'date', transactiondate: 'date', payee: 'payee', transactiondetails: 'transaction_details',
    suppliersname: 'supplier_name', suppliername: 'supplier_name', tin: 'tin', address: 'address', amount: 'amount',
    vat12: 'vat_12', netofvat: 'net_of_vat', vatexempt: 'vat_exempt', vatexemot: 'vat_exempt', nonvat: 'non_vat', wtax: 'wtax',
    sino: 'si_no', sidate: 'si_date', acctcode: 'account_code', accountcode: 'account_code',
    acctname: 'account_name', accountname: 'account_name', project: 'project', remark: 'remarks', remarks: 'remarks'
};
const importNumericFields = new Set(['amount', 'vat_12', 'net_of_vat', 'vat_exempt', 'non_vat', 'wtax']);

function normalizeImportHeader(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeImportDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number' && typeof XLSX !== 'undefined') {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
            return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
    }

    const text = String(value || '').trim();
    if (!text) return '';
    const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        const nextCharacter = text[index + 1];
        if (character === '"' && quoted && nextCharacter === '"') {
            value += '"';
            index += 1;
        } else if (character === '"') {
            quoted = !quoted;
        } else if (character === ',' && !quoted) {
            row.push(value.trim());
            value = '';
        } else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && nextCharacter === '\n') index += 1;
            row.push(value.trim());
            if (row.some((cell) => cell !== '')) rows.push(row);
            row = [];
            value = '';
        } else {
            value += character;
        }
    }
    row.push(value.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
    return rows;
}

function formatImportCell(value) {
    return escapeHtml(value || '');
}

function renderImportTable(headId, bodyId, rows, includeReason = false) {
    const head = document.getElementById(headId);
    const body = document.getElementById(bodyId);
    if (!head || !body) return;
    head.innerHTML = `<tr>${importHeaders.map((key) => `<th>${formatImportCell(key.replace(/_/g, ' '))}</th>`).join('')}${includeReason ? '<th>Reason</th>' : ''}</tr>`;
    body.innerHTML = rows.length
        ? rows.map(({ data, reason }) => `<tr class="${includeReason ? 'import-invalid-row' : ''}">${importHeaders.map((key) => `<td>${formatImportCell(data[key])}</td>`).join('')}${includeReason ? `<td>${formatImportCell(reason)}</td>` : ''}</tr>`).join('')
        : `<tr><td colspan="${importHeaders.length + (includeReason ? 1 : 0)}" class="text-center text-muted py-3">No data</td></tr>`;
}

function showPersistentImportError(message) {
    showToast(message, 'danger', true);
}

const invalidFileMessage = 'Invalid File: The file does not match.';

async function reviewImportFile(file) {
    let parsedRows;
    try {
        if (typeof XLSX === 'undefined') throw new Error('Excel reader is unavailable');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, raw: false });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) throw new Error('The workbook has no worksheet');
        parsedRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false });
    } catch (error) {
        throw new Error(`The file is not a readable Excel workbook: ${error.message}`);
    }

    const headerRow = parsedRows.shift() || [];
    const headerMap = {};
    headerRow.forEach((header, index) => {
        const field = importHeaderAliases[normalizeImportHeader(header)];
        if (field) headerMap[field] = index;
    });

    const missingHeaders = importHeaders.filter((field) => headerMap[field] === undefined && !(field === 'date' && headerMap.date !== undefined));
    if (missingHeaders.length) {
        pendingImportRows = [];
        pendingInvalidImportRows = [];
        renderImportTable('importValidTableHead', 'importValidTableBody', []);
        renderImportTable('importInvalidTableHead', 'importInvalidTableBody', []);
        const validationMessage = document.getElementById('importValidationMessage');
        validationMessage.className = 'alert alert-danger';
        validationMessage.textContent = invalidFileMessage;
        if (confirmImportBtn) confirmImportBtn.disabled = true;
        showPersistentImportError(invalidFileMessage);
        return;
    }

    const validRows = [];
    const invalidRows = [];
    parsedRows.forEach((cells, rowIndex) => {
        const data = {};
        importHeaders.forEach((field) => {
            const index = headerMap[field];
            data[field] = index === undefined ? '' : cells[index] || '';
        });
        data.date = normalizeImportDate(data.date);
        data.si_date = normalizeImportDate(data.si_date);
        const reasons = [];
        if (cells.length !== headerRow.length) reasons.push('Column count does not match the header');
        importNumericFields.forEach((field) => {
            if (data[field] !== '' && !Number.isFinite(Number(String(data[field]).replace(/,/g, '')))) reasons.push(`${field} must be numeric`);
        });
        if (data.date && Number.isNaN(Date.parse(data.date))) reasons.push('date is invalid');
        if (data.si_date && Number.isNaN(Date.parse(data.si_date))) reasons.push('si_date is invalid');
        if (!Object.values(data).some((value) => value !== '')) reasons.push('Row is empty');
        if (reasons.length) invalidRows.push({ data, reason: `Row ${rowIndex + 2}: ${reasons.join('; ')}` });
        else validRows.push({ data });
    });

    pendingImportRows = validRows.map(({ data }) => data);
    pendingInvalidImportRows = invalidRows;
    renderImportTable('importValidTableHead', 'importValidTableBody', validRows);
    renderImportTable('importInvalidTableHead', 'importInvalidTableBody', invalidRows, true);
    document.getElementById('importValidationMessage').className = `alert ${invalidRows.length ? 'alert-warning' : 'alert-success'}`;
    document.getElementById('importValidationMessage').textContent = `${validRows.length} row(s) ready to save. ${invalidRows.length} row(s) cannot be saved.`;
    confirmImportBtn.disabled = validRows.length === 0;
}

if (fileInput) {
    fileInput.removeAttribute('accept');
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        if (selectedFileName) selectedFileName.textContent = file.name;
        const importModal = new bootstrap.Modal(document.getElementById("importFileModal"));
        importModal.show();
        try {
            await reviewImportFile(file);
        } catch (error) {
            const validationMessage = document.getElementById('importValidationMessage');
            validationMessage.className = 'alert alert-danger';
            validationMessage.textContent = invalidFileMessage;
            showPersistentImportError(invalidFileMessage);
            resetAccountingImport();
        }
    });
}

confirmImportBtn?.addEventListener('click', async () => {
    confirmImportBtn.disabled = true;
    let saved = 0;
    const failedRows = [];
    for (const row of pendingImportRows) {
        try {
            const response = await fetch('/submit-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind: 'accounting', action: 'create', ...row })
            });
            if (!response.ok) throw new Error('Save failed');
            saved += 1;
        } catch (error) {
            failedRows.push({ data: row, reason: `Database error: ${error.message || 'data could not be saved'}` });
            showPersistentImportError(`Data could not be saved: ${error.message || 'database error'}`);
        }
    }
    pendingInvalidImportRows = [...pendingInvalidImportRows, ...failedRows];
    if (failedRows.length) {
        renderImportTable('importInvalidTableHead', 'importInvalidTableBody', pendingInvalidImportRows, true);
        const validationMessage = document.getElementById('importValidationMessage');
        validationMessage.className = 'alert alert-danger';
        validationMessage.textContent = `${saved} row(s) saved. ${failedRows.length} row(s) could not be saved to the database.`;
        showToast(`${failedRows.length} row(s) could not be saved to the database.`, 'danger', true);
        confirmImportBtn.disabled = true;
        pendingImportRows = [];
        loadAccountingRows();
        resetAccountingImport();
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById('importFileModal'))?.hide();
    resetAccountingImport();
    showToast(`${saved} imported row(s) saved successfully.`);
    loadAccountingRows();
});

if (saveAccountingBtn) {
    saveAccountingBtn.addEventListener("click", () => submitAccountingModal("create"));
}

if (saveEditedAccountingBtn) {
    saveEditedAccountingBtn.addEventListener("click", () => submitAccountingModal("edit"));
}

setupTableChart({
    buttonId: 'chartToggleBtn',
    modalId: 'accountingChartModal',
    canvasId: 'accountingChart',
    getRows: () => accountingRows,
    labelKey: 'project',
    valueKey: 'amount'
});

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

document.addEventListener("DOMContentLoaded", loadAccountingRows);

document.getElementById('newEntryModal')?.addEventListener('hidden.bs.modal', (event) => {
    event.currentTarget.querySelectorAll('input, select, textarea').forEach((field) => {
        if (field.type === 'file') field.value = '';
        else if (field.type !== 'hidden' && field.type !== 'button' && field.type !== 'submit') field.value = '';
    });
});


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
