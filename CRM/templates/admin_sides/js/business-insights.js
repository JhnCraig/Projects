/* Mirrors the live dashboard metrics in the compact insights panel. */
document.addEventListener('DOMContentLoaded', () => {
    const copy = (from, to) => {
        const source = document.getElementById(from);
        const target = document.getElementById(to);
        if (source && target) target.textContent = source.textContent;
    };
    const updateInsights = () => {
        copy('totalRevenue', 'insightRevenue');
        copy('overallProgress', 'insightProgress');
        copy('conversionRate', 'insightConversion');
        copy('totalClients', 'insightClients');
    };
    setTimeout(updateInsights, 400);
    setInterval(updateInsights, 30000);
});
