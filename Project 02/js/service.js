(() => {
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const categoryForEntry = (entry) => {
        const category = normalize(`${entry.source || ''} ${entry.direction || ''}`);

        if (category.includes('architectural') || category.includes('engineering')) {
            return 'architectural';
        }
        if (category.includes('construction') || category.includes('generalconstruction')) {
            return 'construction';
        }
        if (category.includes('electro') || category.includes('mechanical') || category.includes('electrical')) {
            return 'electro-Mechanical';
        }

        return null;
    };

    const apiUrl = () => {
        if (window.SBDC_API_URL) return `${window.SBDC_API_URL}/api/entries`;
        if (window.location.protocol === 'file:') return 'http://127.0.0.1:5000/api/entries';
        return `${window.location.protocol}//${window.location.hostname}:5000/api/entries`;
    };

    const addDatabaseImages = async () => {
        try {
            const response = await fetch(apiUrl());
            if (!response.ok) throw new Error('Unable to load service images');

            const result = await response.json();
            const entries = Array.isArray(result.data) ? result.data : [];

            entries.forEach((entry) => {
                if (!entry.image_path) return;

                const category = categoryForEntry(entry);
                const categoryElement = category ? document.getElementById(category) : null;
                const gallery = categoryElement?.querySelector('.gallery-grid');
                if (!gallery) return;

                const image = document.createElement('img');
                image.src = `${new URL(apiUrl()).origin}/img/${encodeURIComponent(entry.image_path)}`;
                image.alt = entry.project_name || entry.direction || 'Service image';
                image.loading = 'lazy';
                image.className = 'gallery-image database-service-image';
                gallery.prepend(image);
            });
        } catch (error) {
            console.warn('Service images could not be loaded:', error.message);
        }
    };

    document.addEventListener('DOMContentLoaded', addDatabaseImages);
})();
