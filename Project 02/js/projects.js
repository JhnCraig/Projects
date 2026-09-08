(() => {
    // API connection and shared URL helpers.
    const apiUrl = () => {
        if (window.SBDC_API_URL) return `${window.SBDC_API_URL}/api/entries`;
        if (window.location.protocol === 'file:') return 'http://127.0.0.1:5000/api/entries';
        return `${window.location.protocol}//${window.location.hostname}:5000/api/entries`;
    };

    const apiOrigin = () => new URL(apiUrl()).origin;

    // Escape API values before inserting them into project markup.
    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Build a project section and its image cards.
    const createProjectSection = (entries) => {
        const entry = entries[0];
        const title = entry.project_name || entry.file_name || 'Untitled Project';
        const category = entry.source || 'Uncategorized';
        const location = entry.location || '';
        const status = entry.status || 'Pending';
        const description = entry.description || '';
        const scopeOfWork = entry.scope_of_work || '';
        const cards = entries.map((projectEntry) => {
            const imageUrl = `${apiOrigin()}/uploads/${encodeURIComponent(projectEntry.image_path)}`;

            return `
                <div class="col-md-4">
                    <div class="project-card" data-bs-target="#projectModal" data-bs-toggle="modal"
                        data-category="${escapeHtml(category)}"
                        data-description="${escapeHtml(description)}"
                        data-image="${escapeHtml(imageUrl)}"
                        data-location="${escapeHtml(location)}"
                        data-scope="${escapeHtml(scopeOfWork)}"
                        data-status="${escapeHtml(status)}"
                        data-title="${escapeHtml(title)}">
                        <img alt="${escapeHtml(title)}" class="img-fluid" src="${escapeHtml(imageUrl)}" loading="lazy">
                    </div>
                </div>
            `;
        }).join('');

        return `
            <section class="project-section database-project" data-featured="true"
                data-project="${escapeHtml(`${title} ${location} ${category} ${status} ${scopeOfWork} ${description}`)}">
                <h3 class="project-title">${escapeHtml(title)}</h3>
                <p class="project-description">${escapeHtml(description)}</p>
                <div class="row g-4 project-gallery">${cards}</div>
                <div class="project-details">
                    <p><strong>Location:</strong> ${escapeHtml(location)}</p>
                    <p><strong>Category:</strong> ${escapeHtml(category)}</p>
                    <p><strong>Status:</strong> ${escapeHtml(status)}</p>
                    <p><strong>Scope of Work:</strong> ${escapeHtml(scopeOfWork)}</p>
                </div>
            </section>
            <hr class="project-divider database-project">
        `;
    };

    // Fetch, group, and render projects from the database.
    const loadDatabaseProjects = async () => {
        try {
            const response = await fetch(apiUrl());
            if (!response.ok) throw new Error('Unable to load database projects');

            const result = await response.json();
            const entries = Array.isArray(result.data)
                ? result.data.filter((entry) => entry.image_path)
                : [];
            if (!entries.length) return;

            const projectsContainer = document.getElementById('databaseProjects');
            if (!projectsContainer) throw new Error('Database project container was not found');
            const groupedEntries = new Map();
            entries.forEach((entry) => {
                const groupKey = [entry.project_name, entry.location, entry.source, entry.status,
                    entry.scope_of_work, entry.description]
                    .map((value) => String(value || '').trim().toLowerCase())
                    .join('|');
                const group = groupedEntries.get(groupKey) || [];
                group.push(entry);
                groupedEntries.set(groupKey, group);
            });

            Array.from(groupedEntries.values()).reverse().forEach((group) => {
                projectsContainer.insertAdjacentHTML('beforeend', createProjectSection(group));
            });
            document.dispatchEvent(new CustomEvent('database-projects:updated'));
        } catch (error) {
            console.warn('Database projects could not be loaded:', error.message);
        }
    };

    document.addEventListener('DOMContentLoaded', loadDatabaseProjects);
})();
