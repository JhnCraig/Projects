const chartSummaryConfigs = {
    accounting: { endpoint: '/api/accounting', items: [['Entries', (rows) => rows.length], ['Total amount', (rows) => sumChartValues(rows, 'amount')], ['Projects', (rows) => uniqueChartValues(rows, 'project')]] },
    sales: { endpoint: '/api/sales', items: [['Records', (rows) => rows.length], ['Invoice total', (rows) => sumChartValues(rows, 'inv_amount')], ['Cash in bank', (rows) => sumChartValues(rows, 'cash_in_bank')]] },
    marketing: { endpoint: '/api/sales_marketing', items: [['Opportunities', (rows) => rows.length], ['Pipeline value', (rows) => sumChartValues(rows, 'project_value')], ['Won', (rows) => rows.filter((row) => String(row.status || '').toLowerCase() === 'won').length]] },
    purchasing: { endpoint: '/api/purchasing', items: [['Orders', (rows) => rows.length], ['Total spend', (rows) => sumChartValues(rows, 'total_amount')], ['Items', (rows) => uniqueChartValues(rows, 'item_name')]] },
    engineering: { endpoint: '/api/engineering', items: [['Projects', (rows) => rows.length], ['Avg. progress', (rows) => { const average = rows.length ? rows.reduce((total, row) => total + (Number(row.accomplishment_percentage) || 0), 0) / rows.length : 0; return `${average.toFixed(1)}%`; }], ['Statuses', (rows) => uniqueChartValues(rows, 'status')]] }
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
