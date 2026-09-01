/* =========================================
   PASSWORD MASKING
   ========================================= */
function maskPassword(value) {
    if (!value) return '';
    return '•'.repeat(value.length);
}

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
            button.addEventListener('click', async () => {
                const userId = button.dataset.userId;
                const confirmed = window.confirm('Delete this user account?');

                if (!confirmed) return;

                try {
                    const response = await fetch(`/api/users/${userId}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json().catch(() => ({}));

                    if (!response.ok) {
                        throw new Error(result?.error || 'Unable to delete user');
                    }

                    await loadUsers();
                } catch (error) {
                    alert(error.message || 'Failed to delete user.');
                }
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
        alert(result.error || 'Unable to update user.');
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
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
        alert('Password saved successfully.');
        await loadUsers();

    } catch (error) {
        alert(error.message || 'Failed to save password.');
    }
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

/* =========================================
   LOAD USERS WHEN PAGE LOADS
   ========================================= */
document.addEventListener('DOMContentLoaded', loadUsers);