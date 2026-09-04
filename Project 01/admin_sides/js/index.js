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

    
/* =================================
        For dashboard charts
================================= */
const dashboardCharts = {};

const dashboardChartConfigs = [
    {
        id: 'accounting',
        endpoint: '/api/accounting',
        canvasId: 'accountingDashboardChart',
        labelKey: 'project',
        fallbackLabelKey: 'account_name',
        valueKeys: ['amount', 'net_of_vat', 'vat_exempt', 'non_vat', 'vat_12', 'wtax']
    },
    {
        id: 'sales',
        endpoint: '/api/sales',
        canvasId: 'salesDashboardChart',
        labelKey: 'project_code',
        valueKeys: ['inv_amount']
    },
    {
        id: 'marketing',
        endpoint: '/api/sales_marketing',
        canvasId: 'marketingDashboardChart',
        labelKey: 'source',
        valueKeys: ['project_value']
    },
    {
        id: 'purchasing',
        endpoint: '/api/purchasing',
        canvasId: 'purchasingDashboardChart',
        labelKey: 'item_name',
        valueKeys: ['total_amount']
    },
    {
        id: 'engineering',
        endpoint: '/api/engineering',
        canvasId: 'engineeringDashboardChart',
        labelKey: 'status',
        countOnly: true
    }
];

const chartColors = ['#4e73df', '#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc', '#858796', '#fd7e14', '#6f42c1'];

function formatAmount(value) {
    return Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getTotal(rows, keys) {
    return rows.reduce((total, entry) => total + getEntryValue(entry, keys), 0);
}

function renderDashboardSummary(config, rows) {
    const summary = document.getElementById(`${config.id}DashboardSummary`);
    if (!summary) return;

    let items;
    if (config.id === 'accounting') {
        items = [
            ['Entries', rows.length],
            ['Total amount', formatAmount(getTotal(rows, ['amount']))],
            ['Projects', Object.keys(getChartGroups(rows, config)).length]
        ];
    } else if (config.id === 'sales') {
        items = [
            ['Records', rows.length],
            ['Invoice total', formatAmount(getTotal(rows, ['inv_amount']))],
            ['Cash in bank', formatAmount(getTotal(rows, ['cash_in_bank']))]
        ];
    } else if (config.id === 'marketing') {
        const won = rows.filter((entry) => String(entry.status || '').toLowerCase() === 'won').length;
        items = [
            ['Opportunities', rows.length],
            ['Pipeline value', formatAmount(getTotal(rows, ['project_value']))],
            ['Won', won]
        ];
    } else if (config.id === 'purchasing') {
        items = [
            ['Orders', rows.length],
            ['Total spend', formatAmount(getTotal(rows, ['total_amount']))],
            ['Items', Object.keys(getChartGroups(rows, config)).length]
        ];
    } else {
        const averageProgress = rows.length
            ? rows.reduce((total, entry) => total + (Number(entry.accomplishment_percentage) || 0), 0) / rows.length
            : 0;
        items = [
            ['Projects', rows.length],
            ['Avg. progress', `${averageProgress.toFixed(1)}%`],
            ['Statuses', Object.keys(getChartGroups(rows, config)).length]
        ];
    }

    summary.innerHTML = items.map(([label, value]) => `
        <div class="dashboard-summary-item">
            <span class="dashboard-summary-value">${value}</span>
            <span class="dashboard-summary-label">${label}</span>
        </div>
    `).join('');
}

function getEntryValue(entry, keys) {
    let fallbackValue = 0;

    for (const key of keys) {
        const cleaned = String(entry[key] ?? '')
            .replace(/[₱PpHh$\s,]/g, '')
            .replace(/[^\d.-]/g, '')
            .trim();
        const value = Number.parseFloat(cleaned);

        if (!Number.isFinite(value)) continue;
        if (value !== 0) return value;
        fallbackValue = value;
    }

    return fallbackValue;
}

function getChartGroups(rows, config) {
    const groups = {};

    rows.forEach((entry) => {
        const rawLabel = entry[config.labelKey] || entry[config.fallbackLabelKey] || 'Unassigned';
        const label = String(rawLabel).trim() || 'Unassigned';
        const value = config.countOnly ? 1 : getEntryValue(entry, config.valueKeys);
        groups[label] = (groups[label] || 0) + value;
    });

    return groups;
}

function renderDashboardChart(config, rows) {
    const canvas = document.getElementById(config.canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const groups = getChartGroups(rows, config);
    const labels = Object.keys(groups);
    const values = Object.values(groups);

    dashboardCharts[config.id]?.destroy();
    dashboardCharts[config.id] = new Chart(canvas, {
        type: config.countOnly ? 'doughnut' : 'pie',
        data: {
            labels: labels.length ? labels : ['No data'],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: labels.length
                    ? labels.map((_, index) => chartColors[index % chartColors.length])
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
                    position: 'bottom',
                    labels: { boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const value = Number(context.parsed || 0);
                            return config.countOnly
                                ? `${context.label}: ${value}`
                                : `${context.label}: ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                    }
                }
            }
        }
    });
    dashboardCharts[config.id].reset();
    dashboardCharts[config.id].update();
}

async function loadDashboardChart(config) {
    try {
        const response = await fetch(config.endpoint);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to load records');
        const rows = Array.isArray(result.data) ? result.data : [];
        renderDashboardSummary(config, rows);
        renderDashboardChart(config, rows);
    } catch (error) {
        renderDashboardSummary(config, []);
        renderDashboardChart(config, []);
        console.error(`Unable to load ${config.id} dashboard chart:`, error);
    }
}

dashboardChartConfigs.forEach(loadDashboardChart);
