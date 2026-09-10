//Employee dashboard summary cards
//Calculates and refreshes department summary-card values from API data.

//Select the department data source and update summary metrics.
(() => {
    const summaryByPath = {
        sales: { endpoint: '/api/sales', amountKey: 'inv_amount', dateKey: 'transaction_date', projectKey: 'project_code', metricKey: 'cash_in_bank', metricType: 'amount', label: 'Sales records' },
        marketing: { endpoint: '/api/sales_marketing', amountKey: 'project_value', dateKey: 'date_received', projectKey: 'project_name', metricKey: 'status', metricType: 'won', label: 'Campaign records' },
        purchasing: { endpoint: '/api/purchasing', amountKey: 'total_amount', dateKey: 'purchase_date', projectKey: 'item_name', metricKey: 'item_name', metricType: 'unique', label: 'Purchasing records' },
        engineering: { endpoint: '/api/engineering', amountKey: null, dateKey: 'date', projectKey: 'project_name', metricKey: 'status', metricType: 'statuses', label: 'Engineering records' }
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

    const pageName = document.body.dataset.department || window.location.pathname
        .replace(/\/$/, '')
        .split('/')
        .pop()
        ?.replace(/\.html$/, '');
    const summary = summaryByPath[pageName];
    if (!summary) return;
    document.querySelector('[data-summary="entries"]')?.closest('.accounting-summary-card')?.querySelector('small')?.replaceChildren(summary.label);
    const refreshSummary = () => fetch(summary.endpoint)
        .then((response) => response.ok ? response.json() : null)
        .then((result) => {
            const rows = Array.isArray(result?.data) ? result.data : [];
            const total = summary.amountKey
                ? rows.reduce((sum, row) => sum + parseNumber(row[summary.amountKey]), 0)
                : 0;
            const now = new Date();
            const monthTotal = rows.reduce((sum, row) => {
                const date = new Date(row[summary.dateKey]);
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                    ? sum + parseNumber(row[summary.amountKey])
                    : sum;
            }, 0);
            const projects = new Set(rows.map((row) => String(row[summary.projectKey] || '').trim()).filter(Boolean));
            const currency = (value) => `₱ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.querySelector('[data-summary="entries"]')?.replaceChildren(String(rows.length));
            const amountValue = summary.metricType === 'statuses'
                ? rows.length ? `${(rows.reduce((sum, row) => sum + (Number(row.accomplishment_percentage) || 0), 0) / rows.length).toFixed(1)}%` : '0.0%'
                : currency(total);
            document.querySelector('[data-summary="amount"]')?.replaceChildren(amountValue);
            const metricValue = summary.metricType === 'unique' || summary.metricType === 'statuses'
                ? new Set(rows.map((row) => String(row[summary.metricKey] || '').trim()).filter(Boolean)).size
                : summary.metricType === 'won'
                    ? rows.filter((row) => String(row[summary.metricKey] || '').toLowerCase() === 'won').length
                    : summary.metricType === 'amount'
                        ? currency(rows.reduce((sum, row) => sum + parseNumber(row[summary.metricKey]), 0))
                : currency(monthTotal);
            document.querySelector('[data-summary="month"]')?.replaceChildren(String(metricValue));
            document.querySelector('[data-summary="projects"]')?.replaceChildren(String(projects.size));
        })
        .catch(() => {});
    refreshSummary();
    if (body) {
        let refreshTimer;
        new MutationObserver(() => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(refreshSummary, 100);
        }).observe(body, { childList: true });
    }
})();
