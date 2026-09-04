/* =========================================
   PASSWORD MASKING
   ========================================= */
function maskPassword(value) {
    if (!value) return '';
    return '•'.repeat(value.length);
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `min-width: 320px; max-width: 360px; padding: 16px 20px; border-radius: 12px; color: #fff; background: ${type === 'danger' ? '#dc3545' : type === 'warning' ? '#f59e0b' : '#28a745'}; box-shadow: 0 18px 40px rgba(0,0,0,0.26); font-size: 15px; font-weight: 600; opacity: 0; transform: translateX(24px); transition: opacity 0.2s ease, transform 0.2s ease; pointer-events:auto;`;
    toastContainer.appendChild(notification);
    requestAnimationFrame(() => { notification.style.opacity = '1'; notification.style.transform = 'translateX(0)'; });
    setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateX(24px)'; setTimeout(() => notification.remove(), 220); }, 3500);
}

let pendingDeleteUserId = null;

async function deleteUser(userId) {
    const confirmButton = document.getElementById('confirmDeleteUserBtn');
    if (confirmButton) confirmButton.disabled = true;
    try {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.error || 'Unable to delete user');
        bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'))?.hide();
        showToast('User deleted successfully.', 'danger');
        await loadUsers();
    } catch (error) {
        showToast(error.message || 'Failed to delete user.', 'danger');
    } finally {
        pendingDeleteUserId = null;
        if (confirmButton) confirmButton.disabled = false;
    }
}

document.getElementById('confirmDeleteUserBtn')?.addEventListener('click', () => {
    if (pendingDeleteUserId) deleteUser(pendingDeleteUserId);
});

/* =========================================
   RENDER EDIT / DELETE BUTTONS
   OUTSIDE THE TABLE
   ========================================= */
function renderUserActionPanel(users) {
    const panel = document.getElementById('userActionPanel');
    if (!panel) return;

    panel.innerHTML = `
        <table class="table table-premium action-table align-middle">
            <thead>
                <tr><th>Action</th></tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-outline-subtle edit-user-btn" type="button" data-user-id="${user.id}" data-user='${JSON.stringify(user).replace(/"/g, '&quot;')}' title="Edit user" aria-label="Edit user">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-user-btn" type="button" data-user-id="${user.id}" title="Delete user" aria-label="Delete user">
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

function syncUserTableScroll() {
    const mainWrapper = document.querySelector('.main-table-wrapper');
    const actionPanel = document.getElementById('userActionPanel');

    if (!mainWrapper || !actionPanel || mainWrapper.dataset.scrollSyncAttached) return;

    let isSyncing = false;
    const syncScroll = (source, target) => {
        if (isSyncing) return;

        isSyncing = true;
        target.scrollTop = source.scrollTop;
        requestAnimationFrame(() => {
            isSyncing = false;
        });
    };

    mainWrapper.addEventListener('scroll', () => syncScroll(mainWrapper, actionPanel));
    actionPanel.addEventListener('scroll', () => syncScroll(actionPanel, mainWrapper));
    mainWrapper.dataset.scrollSyncAttached = 'true';
}

/* =========================================
   LOAD USERS
   ========================================= */
async function loadUsers() {
    const tableBody = document.getElementById('userTableBody');
    const actionPanel = document.getElementById('userActionPanel');

    try {
        const response = await fetch('/api/users');
        const result = await response.json();

        if (!response.ok || !result || result.status !== 'success') {
            throw new Error(result && result.error ? result.error : 'Unable to load users');
        }

        const users = result.data || [];
        const tableWrapper = tableBody.closest('.main-table-wrapper');
        tableWrapper?.classList.toggle('is-empty', !users.length);
        actionPanel?.classList.toggle('is-empty', !users.length);

        if (!users.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No users registered yet.</td>
                </tr>
            `;
            if (actionPanel) actionPanel.innerHTML = '';
            return;
        }

        /* RENDER ACTIONS OUTSIDE TABLE */
        renderUserActionPanel(users);
        syncUserTableScroll();
        syncTableRowHeights(
            tableBody.closest('table'),
            actionPanel.querySelector('.action-table')
        );

        /* RENDER TABLE */
        tableBody.innerHTML = users.map(user => {
            const fullName = [user.fname, user.mname, user.lname].filter(Boolean).join(' ');
            const created = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
            const passwordValue = user.password || '';
            const maskedPassword = maskPassword(passwordValue);
            const displayPassword = passwordValue ? maskedPassword : 'No saved password';
            const status = user.status || 'Employee';

            return `
                <tr>
                    <td>${user.id}</td>
                    <td>${fullName || 'Unknown'}</td>
                    <td>${user.contact || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td><span class="badge-admin-status status-active">${status}</span></td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span class="user-password" data-password="${passwordValue}" data-masked="${maskedPassword}">${displayPassword}</span>
                            <button class="btn btn-sm btn-outline-secondary toggle-password-btn p-1" type="button" aria-label="Show password">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </td>
                    <td>${created}</td>
                </tr>
            `;
        }).join('');

        /* =========================================
           SHOW / HIDE PASSWORD
           ========================================= */
        document.querySelectorAll('.toggle-password-btn').forEach(button => {
            button.addEventListener('click', () => {
                const passwordText = button.previousElementSibling;
                const hiddenPassword = passwordText.dataset.password || '';
                const isVisible = button.dataset.visible === 'true';

                if (isVisible) {
                    passwordText.textContent = hiddenPassword ? (passwordText.dataset.masked || maskPassword(hiddenPassword)) : 'No saved password';
                    button.dataset.visible = 'false';
                    button.setAttribute('aria-label', 'Show password');
                    button.innerHTML = '<i class="bi bi-eye"></i>';
                } else {
                    passwordText.textContent = hiddenPassword || 'No saved password';
                    button.dataset.visible = 'true';
                    button.setAttribute('aria-label', 'Hide password');
                    button.innerHTML = '<i class="bi bi-eye-slash"></i>';
                }
            });
        });

        /* =========================================
           EDIT USER
           ========================================= */
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', () => {
                const user = JSON.parse(button.dataset.user || '{}');
                const userId = button.dataset.userId || user.id;

                document.getElementById('editUserId').value = userId || '';
                document.getElementById('editUserFname').value = user.fname || '';
                document.getElementById('editUserMname').value = user.mname || '';
                document.getElementById('editUserLname').value = user.lname || '';
                document.getElementById('editUserContact').value = user.contact || '';
                document.getElementById('editUserStatus').value = user.status || 'Employee';
                document.getElementById('setPasswordUserId').value = userId || '';

                const modalEl = document.getElementById('editModal');

                if (modalEl) {
                    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                    modal.show();
                }
            });
        });

        /* =========================================
           DELETE USER
           ========================================= */
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', () => {
                pendingDeleteUserId = button.dataset.userId;
                bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteUserModal')).show();
            });
        });

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">Failed to load users.</td>
            </tr>
        `;

        if (actionPanel) actionPanel.innerHTML = '';
        console.error(error);
    }
}

/* =========================================
   EDIT USER
   ========================================= */
document.getElementById('saveNewUserBtn')?.addEventListener('click', async () => {
    const payload = {
        fname: document.getElementById('newUserFname')?.value.trim() || '',
        mname: document.getElementById('newUserMname')?.value.trim() || '',
        lname: document.getElementById('newUserLname')?.value.trim() || '',
        contact: document.getElementById('newUserContact')?.value.trim() || '',
        email: document.getElementById('newUserEmail')?.value.trim() || '',
        password: document.getElementById('newUserPassword')?.value || '',
        status: document.getElementById('newUserStatus')?.value || 'Employee'
    };

    if (!payload.fname || !payload.lname || !payload.contact || !payload.email || !payload.password) {
        alert('First name, last name, contact, email, and password are required.');
        return;
    }

    const button = document.getElementById('saveNewUserBtn');
    button.disabled = true;
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to create user.');

        bootstrap.Modal.getInstance(document.getElementById('newEntryModal'))?.hide();
        showToast('User added successfully.');
        await loadUsers();
    } catch (error) {
        showToast(error.message || 'Unable to create user.', 'danger');
    } finally {
        button.disabled = false;
    }
});

document.getElementById('saveEditedUserBtn')?.addEventListener('click', async () => {
    const userId = document.getElementById('editUserId').value;
    const fname = document.getElementById('editUserFname').value.trim();
    const mname = document.getElementById('editUserMname').value.trim();
    const lname = document.getElementById('editUserLname').value.trim();
    const contact = document.getElementById('editUserContact').value.trim();
    const status = document.getElementById('editUserStatus').value;

    if (!userId || !fname || !lname || !contact) {
        alert('First name, last name, and contact are required.');
        return;
    }

    const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fname, mname, lname, contact, status })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        showToast(result.error || 'Unable to update user.', 'danger');
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
    showToast('User updated successfully.');
    await loadUsers();
});

/* =========================================
   OPEN SET PASSWORD MODAL
   ========================================= */
document.getElementById('openSetPasswordModalBtn')?.addEventListener('click', () => {
    bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('setPasswordModal')).show();
});

/* =========================================
   SAVE PASSWORD
   ========================================= */
document.getElementById('savePasswordBtn')?.addEventListener('click', async () => {
    const userId = document.getElementById('setPasswordUserId').value;
    const password = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;

    if (!userId) {
        alert('Select a user first.');
        return;
    }

    if (!password || password.length < 4) {
        alert('Password must be at least 4 characters long.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unable to save password');
        }

        bootstrap.Modal.getInstance(document.getElementById('setPasswordModal'))?.hide();
        showToast('Password saved successfully.');
        await loadUsers();

    } catch (error) {
        showToast(error.message || 'Failed to save password.', 'danger');
    }
});

const userNameTargets = document.querySelectorAll('[data-user-display]');

const newUserModal = document.getElementById('newEntryModal');
if (newUserModal) {
    const clearNewUserFields = () => {
        newUserModal.querySelectorAll('input, select, textarea').forEach((field) => {
            if (field.type !== 'hidden' && field.type !== 'button' && field.type !== 'submit') field.value = '';
        });
    };

    newUserModal.addEventListener('show.bs.modal', clearNewUserFields);
    newUserModal.addEventListener('hidden.bs.modal', clearNewUserFields);
}

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

/* =========================================
   LOAD USERS WHEN PAGE LOADS
   ========================================= */
document.addEventListener('DOMContentLoaded', loadUsers);