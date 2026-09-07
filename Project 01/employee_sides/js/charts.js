//Employee charts
//Opens department chart modals and groups API data for visual summaries.

//Fetch records, group chart values, and render the chart modal.
function setupEmployeeChart({ buttonId, modalId, canvasId, endpoint, labelKey, valueKey, countOnly = false }) {
    const button = document.getElementById(buttonId);
    const modal = document.getElementById(modalId);
    const canvas = document.getElementById(canvasId);
    if (!button || !modal || !canvas || typeof Chart === 'undefined') return;
    let chart = null;
    button.addEventListener('click', async () => {
        bootstrap.Modal.getOrCreateInstance(modal).show();
        setTimeout(async () => {
            chart?.destroy();
            try {
                const response = await fetch(endpoint, { cache: 'no-store' });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.error || 'Unable to load chart data.');
                const groups = {};
                (Array.isArray(result.data) ? result.data : []).forEach((row) => {
                    const label = String(row[labelKey] || 'Unknown').trim() || 'Unknown';
                    const value = countOnly ? 1 : Number.parseFloat(String(row[valueKey] ?? '').replace(/[^\d.-]/g, '')) || 0;
                    if (!countOnly && value <= 0) return;
                    groups[label] = (groups[label] || 0) + value;
                });
                const labels = Object.keys(groups);
                chart = new Chart(canvas, {
                    type: countOnly ? 'doughnut' : 'pie',
                    data: { labels: labels.length ? labels : ['No Data'], datasets: [{ data: labels.length ? Object.values(groups) : [1], backgroundColor: labels.length ? ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#198754', '#20c997', '#0dcaf0', '#ffc107', '#dc3545', '#6c7576'] : ['#e9ecef'], borderColor: '#fff', borderWidth: 2 }] },
                    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1400, easing: 'easeOutCubic', animateRotate: true, animateScale: true }, plugins: { legend: { position: 'bottom' }, tooltip: { enabled: labels.length > 0 } } }
                });
            } catch (error) {
                console.error(error);
            }
        }, 100);
    });
}

setupEmployeeChart({ buttonId: 'employeeSalesChartBtn', modalId: 'employeeSalesChartModal', canvasId: 'employeeSalesChart', endpoint: '/api/sales', labelKey: 'proj_code', valueKey: 'inv_amount' });
setupEmployeeChart({ buttonId: 'employeeMarketingChartBtn', modalId: 'employeeMarketingChartModal', canvasId: 'employeeMarketingChart', endpoint: '/api/sales_marketing', labelKey: 'source', valueKey: 'project_value' });
setupEmployeeChart({ buttonId: 'employeePurchasingChartBtn', modalId: 'employeePurchasingChartModal', canvasId: 'employeePurchasingChart', endpoint: '/api/purchasing', labelKey: 'item_name', valueKey: 'total_amount' });
setupEmployeeChart({ buttonId: 'employeeEngineeringChartBtn', modalId: 'employeeEngineeringChartModal', canvasId: 'employeeEngineeringChart', endpoint: '/api/engineering', labelKey: 'status', valueKey: 'status', countOnly: true });
