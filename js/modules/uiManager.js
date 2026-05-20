export function setupUIManager() {
    // 1. Chức năng tìm kiếm
    const searchInput = document.getElementById('search-input');
    const objectGrid = document.getElementById('object-grid');
    const items = objectGrid.querySelectorAll('.object-item');

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('span').innerText.toLowerCase();
            if (name.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // 2. Hiệu ứng Active cho thanh công cụ
    const toolBtns = document.querySelectorAll('.tool-btn');
    const btnHelp = document.getElementById('btn-help');
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

    // Gắn event để đổi màu button 
    document.getElementById('btn-select').addEventListener('click', () => setActiveBtn('btn-select'));
    document.getElementById('btn-translate').addEventListener('click', () => setActiveBtn('btn-translate'));
    document.getElementById('btn-rotate').addEventListener('click', () => setActiveBtn('btn-rotate'));
    document.getElementById('btn-scale').addEventListener('click', () => setActiveBtn('btn-scale'));

    if (btnHelp) {
        btnHelp.addEventListener('click', () => {
            if (helpPanel) helpPanel.style.display = 'flex';
        });
    }

    if (helpClose) {
        helpClose.addEventListener('click', () => {
            if (helpPanel) helpPanel.style.display = 'none';
        });
    }

    // Mặc định chọn nút Select
    setActiveBtn('btn-select');
}