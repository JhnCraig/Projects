const saveEntryBtn = document.getElementById('saveEntryBtn');
const fileInput = document.getElementById('newEntryFileInput');
const selectedFileName = document.getElementById('selectedFileName');
const newEntryUploadBtn = document.getElementById('newEntryUploadBtn');
const newBtn = document.getElementById('newBtn');
const entryModalLabel = document.getElementById('newEntryModalLabel');
const deleteConfirmBtn = document.getElementById('confirmDeleteBtn');
const entriesTableBody = document.getElementById('accountingTableBody');
const actionTableBody = document.getElementById('actionTableBody');
const accountingTableWrapper = document.getElementById('accountingTableWrapper');
const actionPanel = document.getElementById('actionPanel');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const imagePreview = document.getElementById('imagePreview');
let editingEntryId = null;
let pendingDeleteId = null;
let loadedEntries = [];
let syncingTableScroll = false;

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const notification = document.createElement('div');
    const background = type === 'danger' ? '#dc3545' : '#28a745';
    notification.style.cssText = `
        min-width: 280px;
        max-width: 360px;
        padding: 14px 18px;
        border-radius: 14px;
        color: white;
        background: ${background};
        box-shadow: 0 18px 40px rgba(0,0,0,.22);
        font-size: 14px;
        font-weight: 600;
        opacity: 0;
        transform: translateX(24px);
        transition: all 180ms ease;
    `;
    notification.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(24px)';
        setTimeout(() => notification.remove(), 180);
    }, 2800);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function resetForm() {
    const fields = ['source', 'project_name', 'location', 'scope_of_work', 'description', 'file_name'];
    fields.forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });

    if (fileInput) fileInput.value = '';
    if (selectedFileName) selectedFileName.textContent = 'No files chosen';
    const statusField = document.getElementById('status');
    if (statusField) statusField.value = '';
}

function getFieldValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function setEntryModalMode(mode) {
    const isEdit = mode === 'edit';
    editingEntryId = isEdit ? editingEntryId : null;
    if (entryModalLabel) entryModalLabel.textContent = isEdit ? 'Edit Entry' : 'New Entry';
    if (saveEntryBtn) saveEntryBtn.textContent = isEdit ? 'Update' : 'Save';
}

function openEditModal(entry) {
    editingEntryId = entry.id;
    const sourceField = document.getElementById('source');
    const projectNameField = document.getElementById('project_name');
    const locationField = document.getElementById('location');
    const statusField = document.getElementById('status');
    const descriptionField = document.getElementById('description');
    const scopeOfWorkField = document.getElementById('scope_of_work');
    const fileNameField = document.getElementById('file_name');
    if (sourceField) sourceField.value = entry.source || '';
    if (projectNameField) projectNameField.value = entry.project_name || '';
    if (locationField) locationField.value = entry.location || '';
    if (statusField) statusField.value = entry.status || 'Pending';
    if (descriptionField) descriptionField.value = entry.description || '';
    if (scopeOfWorkField) scopeOfWorkField.value = entry.scope_of_work || '';
    if (fileNameField) fileNameField.value = entry.file_name || '';
    if (fileInput) fileInput.value = '';
    if (selectedFileName) selectedFileName.textContent = entry.image_path || 'Current image will be kept';
    setEntryModalMode('edit');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('newEntryModal')).show();
}

function openDeleteModal(entryId) {
    pendingDeleteId = entryId;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteConfirmModal')).show();
}

function renderActionPanel(rows) {
    const actionTableBody = document.getElementById('actionTableBody');
    if (!actionTableBody) return;

    if (!rows.length) {
        actionTableBody.innerHTML = '<tr><td class="text-center text-muted py-4">-</td></tr>';
        return;
    }

    actionTableBody.innerHTML = rows.map((row) => `
        <tr>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline-subtle edit-entry-btn" type="button" data-entry-id="${row.id}" aria-label="Edit entry" title="Edit entry">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-outline-subtle delete-entry-btn" type="button" data-entry-id="${row.id}" aria-label="Delete entry" title="Delete entry">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function syncTableRowHeights() {
    const recordsRows = Array.from(document.querySelectorAll('#accountingTableBody tr'));
    const actionRows = Array.from(document.querySelectorAll('#actionTableBody tr'));

    recordsRows.forEach((row, index) => {
        const actionRow = actionRows[index];
        if (!actionRow) return;

        row.style.height = '';
        actionRow.style.height = '';
        const rowHeight = Math.max(row.getBoundingClientRect().height, actionRow.getBoundingClientRect().height);
        row.style.height = `${rowHeight}px`;
        actionRow.style.height = `${rowHeight}px`;
        row.querySelectorAll('td').forEach((cell) => {
            cell.style.height = `${rowHeight}px`;
        });
        actionRow.querySelectorAll('td').forEach((cell) => {
            cell.style.height = `${rowHeight}px`;
        });
    });
}

function syncTableScroll(source, target) {
    if (syncingTableScroll || !source || !target) return;

    syncingTableScroll = true;
    const sourceMaxScroll = source.scrollHeight - source.clientHeight;
    const targetMaxScroll = target.scrollHeight - target.clientHeight;
    const scrollRatio = sourceMaxScroll > 0 ? source.scrollTop / sourceMaxScroll : 0;
    target.scrollTop = scrollRatio * Math.max(targetMaxScroll, 0);
    requestAnimationFrame(() => {
        syncingTableScroll = false;
    });
}

function refreshTableLayout() {
    syncTableRowHeights();
    if (accountingTableWrapper && actionPanel) {
        syncTableScroll(accountingTableWrapper, actionPanel);
    }
}

async function loadEntries() {
    const tbody = document.getElementById('accountingTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading records...</td></tr>';

    try {
        const response = await fetch('/api/entries');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load entries');

        const rows = Array.isArray(result.data) ? result.data : [];
        loadedEntries = rows;
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No records found.</td></tr>';
            renderActionPanel([]);
            return;
        }

        tbody.innerHTML = rows.map((row) => {
            const imagePreview = row.image_path
                ? `<img class="entry-image-preview" src="/uploads/${encodeURIComponent(row.image_path)}" alt="${escapeHtml(row.project_name || 'Entry image')}" data-full-image="/uploads/${encodeURIComponent(row.image_path)}">`
                : '<span class="text-muted">No image</span>';

            return `
                <tr>
                    <td>${imagePreview}</td>
                    <td>${escapeHtml(row.source || '')}</td>
                    <td>${escapeHtml(formatDate(row.created_at))}</td>
                    <td>${escapeHtml(row.project_name || '')}</td>
                    <td>${escapeHtml(row.location || '')}</td>
                    <td>${escapeHtml(row.status || 'Pending')}</td>
                    <td>${escapeHtml(row.scope_of_work || '')}</td>
                    <td>${escapeHtml(row.description || '')}</td>
                </tr>
            `;
        }).join('');

        renderActionPanel(rows);
        requestAnimationFrame(refreshTableLayout);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${escapeHtml(error.message || 'Unable to load records')}</td></tr>`;
        renderActionPanel([]);
    }
}

async function submitEntry() {
    const formData = new FormData();
    const source = getFieldValue('source');
    const projectName = getFieldValue('project_name');
    const fileName = getFieldValue('file_name');
    const location = getFieldValue('location');
    const status = getFieldValue('status');
    const description = getFieldValue('description');
    const scopeOfWork = getFieldValue('scope_of_work');

    if (fileInput && fileInput.files && fileInput.files.length) {
        Array.from(fileInput.files).forEach((file) => formData.append('image', file));
    }
    if (source) formData.append('source', source);
    if (projectName) formData.append('project_name', projectName);
    if (fileName) formData.append('file_name', fileName);
    if (location) formData.append('location', location);
    formData.append('status', status);
    if (description) formData.append('description', description);
    if (scopeOfWork) formData.append('scope_of_work', scopeOfWork);

    if (!source && !projectName && !location && !scopeOfWork && !description && !fileName && (!fileInput || !fileInput.files || !fileInput.files.length)) {
        showToast('Please fill in at least one field.', 'danger');
        return;
    }

    if (!status) {
        showToast('Please select a status.', 'danger');
        return;
    }

    if (editingEntryId) formData.append('id', editingEntryId);
    if (saveEntryBtn) saveEntryBtn.disabled = true;

    try {
        const response = await fetch('/api/entries', {
            method: editingEntryId ? 'PUT' : 'POST',
            body: formData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to save entry');

        const modal = bootstrap.Modal.getInstance(document.getElementById('newEntryModal')) || new bootstrap.Modal(document.getElementById('newEntryModal'));
        modal.hide();
        resetForm();
        showToast(result.message || 'Entry saved successfully.', 'success');
        editingEntryId = null;
        setEntryModalMode('new');
        await loadEntries();
    } catch (error) {
        showToast(error.message || 'Unable to save entry.', 'danger');
    } finally {
        if (saveEntryBtn) saveEntryBtn.disabled = false;
    }
}

async function deleteEntry() {
    if (!pendingDeleteId) return;

    if (deleteConfirmBtn) deleteConfirmBtn.disabled = true;
    try {
        const response = await fetch('/api/entries', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pendingDeleteId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to delete entry');

        bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
        showToast(result.message || 'Entry deleted successfully.', 'success');
        pendingDeleteId = null;
        await loadEntries();
    } catch (error) {
        showToast(error.message || 'Unable to delete entry.', 'danger');
    } finally {
        if (deleteConfirmBtn) deleteConfirmBtn.disabled = false;
    }
}

if (newEntryUploadBtn && fileInput) {
    newEntryUploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files || []);
        const file = files[0];
        if (selectedFileName) {
            selectedFileName.textContent = files.length ? `${files.length} file(s) selected` : 'No files chosen';
        }
        const fileNameInput = document.getElementById('file_name');
        if (fileNameInput) {
            fileNameInput.value = files.map((selectedFile) => selectedFile.name).join(', ');
            fileNameInput.title = fileNameInput.value;
        }
    });
}

if (saveEntryBtn) {
    saveEntryBtn.addEventListener('click', submitEntry);
}

if (newBtn) {
    newBtn.addEventListener('click', () => {
        resetForm();
        setEntryModalMode('new');
    });
}

if (entriesTableBody) {
    entriesTableBody.addEventListener('click', (event) => {
        const image = event.target.closest('.entry-image-preview');
        if (image && imagePreview && imagePreviewModal) {
            imagePreview.src = image.dataset.fullImage;
            imagePreview.alt = image.alt;
            bootstrap.Modal.getOrCreateInstance(imagePreviewModal).show();
            return;
        }
    });
}

document.addEventListener('click', (event) => {
    const button = event.target.closest('#actionTableBody button[data-entry-id]');
    if (!button) return;

    const entryId = Number(button.dataset.entryId);
    const entry = loadedEntries.find((item) => Number(item.id) === entryId);
    if (!entry) return;

    if (button.classList.contains('edit-entry-btn')) {
        openEditModal(entry);
    } else if (button.classList.contains('delete-entry-btn')) {
        openDeleteModal(entryId);
    }
});

if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', deleteEntry);
}

if (accountingTableWrapper && actionPanel) {
    accountingTableWrapper.addEventListener('scroll', () => syncTableScroll(accountingTableWrapper, actionPanel));
    actionPanel.addEventListener('scroll', () => syncTableScroll(actionPanel, accountingTableWrapper));
}

window.addEventListener('resize', refreshTableLayout);

document.addEventListener('DOMContentLoaded', loadEntries);
