(() => {
    const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const getTable = () => document.querySelector('.accounting-table');

    const applyFilter = (field, value) => {
        const table = getTable();
        if (!table) return;

        const headerCells = Array.from(table.tHead.rows[0].cells);
        const fieldIndex = field === 'all' ? -1 : headerCells.findIndex((cell) => normalize(cell.textContent) === normalize(field));
        const rows = Array.from(table.tBodies[0].rows);
        const query = normalize(value);

        rows.forEach((row) => {
            if (fieldIndex < 0 || !query) {
                row.hidden = false;
                return;
            }

            const cell = row.cells[fieldIndex];
            row.hidden = cell ? !normalize(cell.textContent).includes(query) : true;
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'form-control form-control-sm';
        search.placeholder = 'Search records';
        search.setAttribute('aria-label', 'Search records');

        const toolbarActions = document.querySelector('.toolbar-actions');
        if (toolbarActions) {
            toolbarActions.appendChild(search);
        }

        document.querySelectorAll('.accounting-filter-option').forEach((option) => {
            option.addEventListener('click', (event) => {
                event.preventDefault();
                const selectedField = option.dataset.filter || 'all';
                document.querySelectorAll('.accounting-filter-option').forEach((item) => item.classList.toggle('active', item === option));
                if (selectedField === 'all') {
                    search.value = '';
                    applyFilter('all', '');
                    return;
                }
                applyFilter(selectedField, search.value);
            });
        });

        search.addEventListener('input', () => {
            const active = document.querySelector('.accounting-filter-option.active');
            const field = active?.dataset.filter || 'all';
            applyFilter(field, search.value);
        });
    });
})();
