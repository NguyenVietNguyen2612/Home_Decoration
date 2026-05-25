export async function buildFurnitureMenu() {
    const container = document.getElementById('furnitures-categories');
    if (!container) {
        console.warn('[menuBuilder] No #furnitures-categories container found.');
        return;
    }

    try {
        const response = await fetch('menu-manifest.json');
        if (!response.ok) {
            throw new Error(`Failed to load menu-manifest.json: ${response.status}`);
        }

        const manifest = await response.json();
        const categories = manifest.categories || [];

        if (!categories.length) {
            container.textContent = 'No furniture items available.';
            return;
        }

        container.innerHTML = '';

        for (const category of categories) {
            const details = document.createElement('details');
            details.className = 'category-details';
            if (category.open !== false) details.open = true;

            const summary = document.createElement('summary');
            summary.className = 'category-header';
            summary.textContent = `${category.icon || '📦'} ${category.label}`;
            details.appendChild(summary);

            const grid = document.createElement('div');
            grid.className = 'object-grid';

            for (const item of category.items) {
                const itemEl = document.createElement('div');
                itemEl.className = 'object-item';
                itemEl.setAttribute('draggable', 'true');
                itemEl.dataset.type = item.type;

                const img = document.createElement('img');
                img.src = createPlaceholderImage(item.label);
                img.alt = item.label;
                img.draggable = false;
                itemEl.appendChild(img);

                const label = document.createElement('span');
                label.textContent = item.label;
                itemEl.appendChild(label);

                grid.appendChild(itemEl);
            }

            details.appendChild(grid);
            container.appendChild(details);
        }
    } catch (error) {
        console.error('[menuBuilder] Could not build furniture menu:', error);
        container.textContent = 'Unable to load furniture items.';
    }
}

function createPlaceholderImage(label) {
    const text = escapeXml(label.slice(0, 12));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="100%" height="100%" fill="#cccccc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#333">${text}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
    return value.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
        }
    });
}
