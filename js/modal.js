// js/modal.js
export class CustomModal {
    static init() {
        if (document.getElementById('custom-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.className = 'custom-modal-overlay';

        overlay.innerHTML = `
            <div class="custom-modal" id="custom-modal">
                <div class="custom-modal-title" id="custom-modal-title">Notification</div>
                <div class="custom-modal-message" id="custom-modal-message"></div>
                <input type="text" class="custom-modal-input" id="custom-modal-input" style="display: none;">
                <div class="custom-modal-actions">
                    <button class="custom-modal-btn custom-modal-btn-cancel" id="custom-modal-cancel" style="display: none;">Hủy</button>
                    <button class="custom-modal-btn custom-modal-btn-confirm" id="custom-modal-confirm">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        // Setup CSS if not included
        if (!document.querySelector('link[href*="modal.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/modal.css';
            document.head.appendChild(link);
        }
    }

    static show({ title = 'Thông báo', message = '', type = 'alert', defaultValue = '' }) {
        this.init();

        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-modal-overlay');
            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const inputEl = document.getElementById('custom-modal-input');
            const btnCancel = document.getElementById('custom-modal-cancel');
            const btnConfirm = document.getElementById('custom-modal-confirm');

            titleEl.textContent = title;
            messageEl.textContent = message;

            // Reset event listeners by replacing the buttons
            const newBtnCancel = btnCancel.cloneNode(true);
            const newBtnConfirm = btnConfirm.cloneNode(true);
            btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
            btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

            const close = (value) => {
                overlay.classList.remove('active');
                setTimeout(() => resolve(value), 300); // Wait for transition
            };

            if (type === 'prompt') {
                inputEl.style.display = 'block';
                inputEl.value = defaultValue;
                newBtnCancel.style.display = 'block';
                
                // Focus on input after transition
                setTimeout(() => inputEl.focus(), 50);

                inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') close(inputEl.value);
                    if (e.key === 'Escape') close(null);
                });

                newBtnCancel.addEventListener('click', () => close(null));
                newBtnConfirm.addEventListener('click', () => close(inputEl.value));
            } else {
                inputEl.style.display = 'none';
                newBtnCancel.style.display = 'none';

                newBtnConfirm.addEventListener('click', () => close(true));
            }

            overlay.classList.add('active');
        });
    }

    static alert(message, title = 'Thông báo') {
        return this.show({ title, message, type: 'alert' });
    }

    static prompt(message, defaultValue = '', title = 'Nhập thông tin') {
        return this.show({ title, message, type: 'prompt', defaultValue });
    }
}

// Ensure it's globally available for non-module scripts
window.CustomModal = CustomModal;
