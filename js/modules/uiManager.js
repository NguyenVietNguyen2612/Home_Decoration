export function setupUIManager() {
    // ======================================================
    // 1. TÌM KIẾM OBJECT
    // ======================================================
    const searchInput = document.getElementById('search-input');
    const sidebarContent = document.getElementById('sidebar-content');
    const items = sidebarContent ? sidebarContent.querySelectorAll('.object-item') : [];

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            items.forEach(item => {
                const name = item.querySelector('span').innerText.toLowerCase();
                item.style.display = name.includes(searchTerm) ? 'block' : 'none';
            });
        });
    }

    // ======================================================
    // 2. TOOLBAR ACTIVE STATE
    // ======================================================
    const toolBtns  = document.querySelectorAll('.tool-btn');
    const btnHelp   = document.getElementById('btn-help');
    const helpPanel = document.getElementById('help-panel');
    const helpClose = document.getElementById('help-close-btn');

    function setActiveBtn(activeId) {
        toolBtns.forEach(btn => {
            if (btn.id !== 'btn-delete' && btn.id !== 'btn-help') {
                if (btn.id === activeId) {
                    btn.style.background = '#007bff';
                    btn.style.color = 'white';
                } else {
                    btn.style.background = '#f8f9fa';
                    btn.style.color = '#333';
                }
            }
        });
    }

    document.getElementById('btn-translate').addEventListener('click', () => setActiveBtn('btn-translate'));
    document.getElementById('btn-rotate').addEventListener('click', () => setActiveBtn('btn-rotate'));
    document.getElementById('btn-scale').addEventListener('click', () => setActiveBtn('btn-scale'));

    if (btnHelp)   btnHelp.addEventListener('click',  () => { if (helpPanel) helpPanel.style.display = 'flex'; });
    if (helpClose) helpClose.addEventListener('click', () => { if (helpPanel) helpPanel.style.display = 'none'; });

    setActiveBtn('');

    // ======================================================
    // 3. RESIZE HANDLES – kéo để thay đổi kích thước panels
    // ======================================================
    setupResizeHandles();
}

/**
 * Thiết lập logic kéo cho 2 thanh phân cách:
 *  - #rh-sidebar : giữa sidebar trái và vùng views
 *  - #rh-views   : giữa 2D view và 3D view
 */
function setupResizeHandles() {
    const appContainer = document.getElementById('app-container');
    const sidebar      = document.getElementById('left-sidebar');
    const mainViews    = document.getElementById('main-views');
    const view2d       = document.getElementById('view-2d-container');
    const view3d       = document.getElementById('view-3d-container');
    const rhSidebar    = document.getElementById('rh-sidebar');
    const rhViews      = document.getElementById('rh-views');

    const MIN_SIDEBAR  = 120;   // px – sidebar hẹp nhất
    const MAX_SIDEBAR  = 500;   // px – sidebar rộng nhất
    const MIN_VIEW     = 150;   // px – mỗi view hẹp nhất

    /** Kích hoạt resize event để Three.js re-size renderers */
    // Không cần nữa – ResizeObserver trong sceneSetup.js tự xử lý

    /**
     * Gắn logic kéo thả cho một thanh handle.
     * @param {HTMLElement} handle    – phần tử thanh kéo
     * @param {Function}    onDelta   – gọi với dx (pixels di chuyển theo trục X)
     */
    function bindHandle(handle, onDelta) {
        let active = false;
        let lastX  = 0;

        handle.addEventListener('pointerdown', (e) => {
            active = true;
            lastX  = e.clientX;
            handle.setPointerCapture(e.pointerId);
            handle.classList.add('dragging');
            document.body.style.cursor    = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        handle.addEventListener('pointermove', (e) => {
            if (!active) return;
            const dx = e.clientX - lastX;
            lastX = e.clientX;
            onDelta(dx);
            // ResizeObserver tự phát hiện thay đổi và update renderer
        });

        const stopDrag = () => {
            if (!active) return;
            active = false;
            handle.classList.remove('dragging');
            document.body.style.cursor    = '';
            document.body.style.userSelect = '';
        };

        handle.addEventListener('pointerup',    stopDrag);
        handle.addEventListener('pointercancel', stopDrag);
    }

    // --- Handle 1: sidebar ↔ main-views ---
    bindHandle(rhSidebar, (dx) => {
        const currentW = sidebar.getBoundingClientRect().width;
        const newW = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, currentW + dx));
        // CSS variable trên #app-container để grid-template-columns dùng lại
        appContainer.style.setProperty('--sidebar-w', `${newW}px`);
    });

    // --- Handle 2: 2D view ↔ 3D view ---
    bindHandle(rhViews, (dx) => {
        const totalW  = mainViews.getBoundingClientRect().width - 6; // trừ width của handle
        const cur2dW  = view2d.getBoundingClientRect().width;
        const new2dW  = Math.max(MIN_VIEW, Math.min(totalW - MIN_VIEW, cur2dW + dx));

        // Tắt flex:1 để có thể set width cứng
        view2d.style.flex  = 'none';
        view2d.style.width = `${new2dW}px`;
        view3d.style.flex  = '1';
        view3d.style.width = '';
    });
}