function initDataExport({ buttonId, endpoint, dateKey, title, filenamePrefix, columns }) {
    const button = document.getElementById(buttonId);
    if (!button || typeof XLSX === 'undefined') return;

    const modalId = `${buttonId}Modal`;
    const modalMarkup = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${modalId}Label">Export ${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label" for="${modalId}Start">From date</label>
                        <input id="${modalId}Start" class="form-control mb-3" type="date">
                        <label class="form-label" for="${modalId}End">To date</label>
                        <input id="${modalId}End" class="form-control mb-3" type="date">
                        <label class="form-label" for="${modalId}Filename">File name</label>
                        <div class="input-group">
                            <input id="${modalId}Filename" class="form-control" type="text" value="${filenamePrefix}-export">
                            <span class="input-group-text">.xlsx</span>
                        </div>
                        <div id="${modalId}Message" class="alert alert-danger d-none mt-3 mb-0" role="alert"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-subtle" data-bs-dismiss="modal">Cancel</button>
                        <button id="${modalId}Confirm" type="button" class="btn btn-brand-action"><i class="bi bi-download me-1"></i>Export</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalMarkup);

    const modalElement = document.getElementById(modalId);
    const startInput = document.getElementById(`${modalId}Start`);
    const endInput = document.getElementById(`${modalId}End`);
    const filenameInput = document.getElementById(`${modalId}Filename`);
    const message = document.getElementById(`${modalId}Message`);
    const confirmButton = document.getElementById(`${modalId}Confirm`);
    const showMessage = (text) => { message.textContent = text; message.classList.remove('d-none'); };
    const showToastMessage = (text, type = 'success') => {
        if (typeof showToast === 'function') showToast(text, type);
    };
    const normalizeDate = (value) => {
        const text = String(value || '').trim();
        const isoDate = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (isoDate) return `${isoDate[1]}-${String(isoDate[2]).padStart(2, '0')}-${String(isoDate[3]).padStart(2, '0')}`;
        const databaseDate = text.match(/\b\d{1,2}\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
        if (databaseDate) {
            const parsedDatabaseDate = new Date(`${databaseDate[1]} ${databaseDate[2]} ${databaseDate[3]} UTC`);
            if (!Number.isNaN(parsedDatabaseDate.getTime())) return `${parsedDatabaseDate.getUTCFullYear()}-${String(parsedDatabaseDate.getUTCMonth() + 1).padStart(2, '0')}-${String(parsedDatabaseDate.getUTCDate()).padStart(2, '0')}`;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    };

    const getRowDate = (row) => normalizeDate(row[dateKey] || row.transaction_date || row.date_received || row.purchase_date || row.order_date || row.date);

    button.addEventListener('click', () => {
        message.classList.add('d-none');
        bootstrap.Modal.getOrCreateInstance(modalElement).show();
    });

    confirmButton.addEventListener('click', async () => {
        const filename = filenameInput.value.trim().replace(/[\\/:*?"<>|]/g, '');
        if (!filename) { showMessage('Please enter a file name.'); filenameInput.focus(); return; }
        if (startInput.value && endInput.value && startInput.value > endInput.value) { showMessage('The start date cannot be after the end date.'); return; }

        confirmButton.disabled = true;
        try {
            const response = await fetch(endpoint, { cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || `Unable to load ${title.toLowerCase()} data.`);
            const rows = (Array.isArray(result.data) ? result.data : []).filter((row) => {
                const value = getRowDate(row);
                return (!startInput.value || value >= startInput.value) && (!endInput.value || value <= endInput.value);
            });
            if (!rows.length) {
                const range = startInput.value && endInput.value ? ` from ${startInput.value} to ${endInput.value}` : '';
                const noDataMessage = `No ${title.toLowerCase()} data was found${range}.`;
                showMessage(noDataMessage);
                showToastMessage(noDataMessage, 'warning');
                return;
            }

            const exportRows = rows.map((row) => Object.fromEntries(columns.map(([label, key]) => [label, row[key] ?? ''])));
            const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: columns.map(([label]) => label) });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
            XLSX.writeFile(workbook, `${filename}.xlsx`);
            bootstrap.Modal.getInstance(modalElement)?.hide();
            showToastMessage(`${rows.length} ${title.toLowerCase()} record(s) exported successfully.`, 'success');
        } catch (error) {
            const errorMessage = error.message || 'Unable to export data.';
            showMessage(errorMessage);
            showToastMessage(errorMessage, 'danger');
        } finally {
            confirmButton.disabled = false;
        }
    });
}

[
    ['exportEmployeeAccountingBtn', '/api/accounting', 'transaction_date', 'Accounting', 'accounting', [['CV No.', 'cv_no'], ['Date', 'transaction_date'], ['Payee', 'payee'], ['Transaction Details', 'transaction_details'], ['Suppliers Name', 'supplier_name'], ['TIN', 'tin'], ['Address', 'address'], ['Amount', 'amount'], ['VAT 12%', 'vat_12'], ['Net of VAT', 'net_of_vat'], ['VAT Exemot', 'vat_exempt'], ['Non-vat', 'non_vat'], ['WTax', 'wtax'], ['SI No.', 'si_no'], ['SI Date', 'si_date'], ['Acct. Code', 'account_code'], ['Acct. Name', 'account_name'], ['Project', 'project'], ['Remark', 'remark']]],
    ['exportEmployeeSalesBtn', '/api/sales', 'transaction_date', 'Sales', 'sales', [['Month', 'month'], ['Client Name', 'client_name'], ['Proj Code', 'project_code'], ['TIN', 'tin'], ['Address', 'address'], ['Po Amount', 'po_amount'], ['SI No.', 'si_no'], ['SI Date', 'si_date'], ['Inv Amount', 'inv_amount'], ['VAT', 'vat'], ['Net of VAT', 'net_of_vat'], ['2% WTax', 'wtax_2'], ['Net Amount', 'net_amount'], ['Cash in Bank', 'cash_in_bank'], ['Date', 'transaction_date'], ['Bank', 'bank'], ['Remarks', 'remarks'], ['PO No.', 'po_no'], ['Description', 'description']]],
    ['exportEmployeeMarketingBtn', '/api/sales_marketing', 'date_received', 'Marketing', 'marketing', [['Date Received', 'date_received'], ["Client's Name/Company", 'client_name'], ['Projects Name', 'project_name'], ['Source', 'source'], ['Project Value', 'project_value'], ['Project Type', 'project_type'], ['Deadline of Submission', 'deadline_submission'], ['Days of Deadlines', 'days_deadline'], ['Status', 'status'], ['Date Submitted', 'date_submitted'], ['Response Time(Days)', 'response_time'], ['Follow-up Date', 'follow_up_date'], ['Days to Follow-up', 'days_follow_up'], ['File', 'file_name'], ['Lost Reason', 'lost_reason']]],
    ['exportEmployeePurchasingBtn', '/api/purchasing', 'purchase_date', 'Purchasing', 'purchasing', [['Purchase Order No.', 'po_no'], ['Date', 'purchase_date'], ['Supplier Name', 'supplier_name'], ['TIN', 'tin'], ['Address', 'address'], ['Item Code', 'item_code'], ['Item Name', 'item_name'], ['Description', 'description'], ['Quantity', 'quantity'], ['Unit', 'unit'], ['Unit Price', 'unit_price'], ['Discount', 'discount'], ['VAT', 'vat'], ['Total Amount', 'total_amount'], ['Requested By', 'requested_by'], ['Approved By', 'approved_by'], ['Date Approved', 'date_approved'], ['Documents', 'documents'], ['Remarks', 'remarks']]],
    ['exportEmployeeEngineeringBtn', '/api/engineering', 'date', 'Engineering', 'engineering', [['Project Name', 'project_name'], ['Project Location', 'location'], ['Client', 'client'], ['Date', 'date'], ['Status', 'status'], ['Materials Needed', 'materials_needed'], ['Accomplishment Percentage', 'accomplishment_percentage'], ['Target Completion', 'target_completion'], ['Manpower', 'manpower'], ['Document', 'file_name'], ['Remarks', 'lost_reason']]]
].forEach(([buttonId, endpoint, dateKey, title, filenamePrefix, columns]) => initDataExport({ buttonId, endpoint, dateKey, title, filenamePrefix, columns }));
