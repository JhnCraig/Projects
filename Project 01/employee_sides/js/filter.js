(() => {
    const defaultOrders = new WeakMap();
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const aliases = {
        transactiondate: ['date'],
        accountcode: ['acctcode'],
        accountname: ['acctname']
    };

    const getColumnIndex = (table, field) => {
        const normalizedField = normalize(field);
        const targets = [normalizedField, ...(aliases[normalizedField] || [])];
        return Array.from(table.tHead?.rows[0]?.cells || []).findIndex((cell) => {
            const header = normalize(cell.textContent);
            return targets.some((target) => header === target || header.includes(target) || target.includes(header));
        });
    };

    const getTable = (menu) => {
        const scope = menu.closest('main, .content, .container-fluid, body');
        return Array.from(scope?.querySelectorAll('table.table-premium:not(.action-table)') || [])
            .find((candidate) => !candidate.classList.contains('import-review-table') && candidate.querySelector('tbody[id$="TableBody"]'));
    };

    const filterTable = (menu, searchValue) => {
        const table = getTable(menu);
        if (!table) return;
        const needle = normalize(searchValue);
        const rows = Array.from(table.tBodies[0]?.rows || []);
        rows.forEach((row) => {
            row.hidden = needle !== '' && !normalize(row.textContent).includes(needle);
        });

        const actionPanel = table.closest('.table-with-actions')?.querySelector('.action-table tbody');
        if (actionPanel) {
            Array.from(actionPanel.rows).forEach((row, index) => {
                row.hidden = Boolean(rows[index]?.hidden);
            });
        }
    };

    const restoreDefaultOrder = (menu) => {
        const table = getTable(menu);
        if (!table) return;
        const body = table.tBodies[0];
        const actionBody = table.closest('.table-with-actions')?.querySelector('.action-table tbody');
        let pairs = defaultOrders.get(table);
        if (!pairs) {
            const actionRows = Array.from(actionBody?.rows || []);
            pairs = Array.from(body?.rows || []).map((row, index) => ({ row, action: actionRows[index] }));
            defaultOrders.set(table, pairs);
        }
        pairs.forEach(({ row, action }) => {
            body.appendChild(row);
            if (actionBody && action) actionBody.appendChild(action);
            row.hidden = false;
            if (action) action.hidden = false;
        });
    };

    const sortTable = (menu, field, direction) => {
        const table = getTable(menu);
        if (!table) return;
        const columnIndex = getColumnIndex(table, field);
        if (columnIndex < 0) return;
        const body = table.tBodies[0];
        const actionBody = table.closest('.table-with-actions')?.querySelector('.action-table tbody');
        const rows = Array.from(body?.rows || []);
        const actionRows = Array.from(actionBody?.rows || []);
        if (!defaultOrders.has(table)) {
            defaultOrders.set(table, rows.map((row, index) => ({ row, action: actionRows[index] })));
        }
        const pairs = rows.map((row, index) => ({ row, action: actionRows[index], value: normalize(row.cells[columnIndex]?.textContent) }));
        pairs.sort((left, right) => direction === 'desc' ? right.value.localeCompare(left.value, undefined, { numeric: true }) : left.value.localeCompare(right.value, undefined, { numeric: true }));
        pairs.forEach(({ row, action }) => {
            body.appendChild(row);
            if (actionBody && action) actionBody.appendChild(action);
        });
    };

    const showInlineSortOptions = (menu, option, field) => {
        menu.querySelector('.table-sort-options')?.remove();
        const options = document.createElement('li');
        options.className = 'table-sort-options px-3 py-2';
        options.innerHTML = '<small class="d-block text-muted mb-2">Sort direction</small><div class="form-check"><input class="form-check-input" type="checkbox" id="sortAscendingOption" data-direction="asc" checked><label class="form-check-label" for="sortAscendingOption">Ascending</label></div><div class="form-check"><input class="form-check-input" type="checkbox" id="sortDescendingOption" data-direction="desc"><label class="form-check-label" for="sortDescendingOption">Descending</label></div>';
        option.parentElement.after(options);
        options.querySelectorAll('[data-direction]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                if (!button.checked) {
                    button.checked = true;
                    return;
                }
                options.querySelectorAll('[data-direction]').forEach((item) => {
                    if (item !== button) item.checked = false;
                });
                sortTable(menu, field, button.dataset.direction);
            });
        });
        sortTable(menu, field, 'asc');
    };

    document.querySelectorAll('.dropdown-menu[id$="FilterMenu"]').forEach((menu) => {
        const dropdown = menu.closest('.dropdown');
        if (!dropdown || dropdown.dataset.filterReady) return;
        dropdown.dataset.filterReady = 'true';

        menu.querySelectorAll('[data-filter]').forEach((option) => {
            option.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const selectedField = option.dataset.filter || 'all';
                menu.querySelectorAll('[data-filter]').forEach((item) => item.classList.remove('active'));
                option.classList.add('active');
                if (selectedField === 'all') {
                    menu.querySelector('.table-sort-options')?.remove();
                    restoreDefaultOrder(menu);
                    filterTable(menu, '');
                    return;
                }
                showInlineSortOptions(menu, option, selectedField);
            });
        });

    });
})();
