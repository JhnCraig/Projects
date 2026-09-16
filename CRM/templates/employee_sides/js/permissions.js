// Employee action permissions
// Hide mutation controls for accounts without a department assignment.
(() => {
    const body = document.body;
    const department = body.dataset.department;
    if (!department) return;

    const normalizedDepartments = {
        accounting: 'Accounting',
        sales: 'Sales',
        marketing: 'Sales / Marketing',
        purchasing: 'Purchasing',
        engineering: 'Engineering'
    };
    const expectedDepartment = normalizedDepartments[department.toLowerCase()];
    if (!expectedDepartment) return;

    const restrictedSelectors = [
        '#newBtn',
        '#uploadBtn',
        '#importFileBtn',
        '#newEntryUploadBtn',
        '#editUploadBtn',
        '#editEntryUploadBtn',
        '#confirmImportBtn',
        '[id^="exportEmployee"]',
        'input[type="file"]',
        '.edit-entry-btn',
        '.edit-sales-btn',
        '.edit-marketing-btn',
        '.edit-purchasing-btn',
        '.edit-engineering-btn',
        '.delete-entry-btn',
        '.delete-sales-btn',
        '.delete-marketing-btn',
        '.delete-purchasing-btn',
        '.delete-engineering-btn'
    ];

    const setRestrictedControlsVisibility = (isRestricted) => {
        body.classList.toggle('no-department', isRestricted);
        document.querySelectorAll(restrictedSelectors.join(',')).forEach((control) => {
            control.hidden = isRestricted;
            control.disabled = isRestricted;
        });
    };

    fetch('/api/current-user')
        .then((response) => response.ok ? response.json() : null)
        .then((user) => setRestrictedControlsVisibility(!(user?.departments || []).includes(expectedDepartment)))
        .catch(() => setRestrictedControlsVisibility(true))
        .finally(() => body.classList.remove('permissions-pending'));

    const observer = new MutationObserver(() => {
        if (body.classList.contains('no-department')) setRestrictedControlsVisibility(true);
    });
    observer.observe(body, { childList: true, subtree: true });
})();
