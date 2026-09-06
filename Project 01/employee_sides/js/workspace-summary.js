(() => {
    const endpointByPath = {
        '/employee/sales': '/api/sales',
        '/employee/marketing': '/api/sales_marketing',
        '/employee/purchasing': '/api/purchasing',
        '/employee/engineering': '/api/engineering'
    };
    const table = document.querySelector('.department-page .table-premium:not(.action-table):not(.import-review-table)');
    const body = table?.tBodies[0];
    const actionBody = document.querySelector('.department-page .action-table tbody');
    const search = document.getElementById('workspaceSearch');
    const parseNumber = (value) => Number.parseFloat(String(value ?? '').replace(/[^\d.-]/g, '')) || 0;
    const rowsForSearch = () => Array.from(body?.rows || []);

    search?.addEventListener('input', () => {
        const needle = search.value.trim().toLowerCase();
        rowsForSearch().forEach((row, index) => {
            const hidden = needle && !row.textContent.toLowerCase().includes(needle);
            row.hidden = Boolean(hidden);
            if (actionBody?.rows[index]) actionBody.rows[index].hidden = Boolean(hidden);
        });
    });

    const endpoint = endpointByPath[window.location.pathname];
    if (!endpoint) return;
    fetch(endpoint)
        .then((response) => response.ok ? response.json() : null)
        .then((result) => {
            const rows = Array.isArray(result?.data) ? result.data : [];
            const values = rows.flatMap((row) => [row.amount, row.total_amount, row.project_value, row.po_amount, row.inv_amount, row.unit_price]);
            const total = values.reduce((sum, value) => sum + parseNumber(value), 0);
            const now = new Date();
            const monthTotal = rows.reduce((sum, row) => {
                const date = new Date(row.date || row.transaction_date || row.date_received || row.target_completion);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() ? sum + parseNumber(row.amount || row.total_amount || row.project_value || row.po_amount || row.inv_amount) : sum;
            }, 0);
            const projects = new Set(rows.map((row) => String(row.project || row.project_name || row.project_code || row.proj_code || row.item_name || '').trim()).filter(Boolean));
            const currency = (value) => `₱ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.querySelector('[data-summary="entries"]')?.replaceChildren(String(rows.length));
            document.querySelector('[data-summary="amount"]')?.replaceChildren(currency(total));
            document.querySelector('[data-summary="month"]')?.replaceChildren(currency(monthTotal));
            document.querySelector('[data-summary="projects"]')?.replaceChildren(String(projects.size));
        })
        .catch(() => {});
})();
