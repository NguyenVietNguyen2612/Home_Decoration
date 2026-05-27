// js/settings.js
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme, true);
}

function applyTheme(theme, save = false) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    } else {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    }
    if (save) localStorage.setItem('theme', theme);
    
    // Update button if on index.html
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    if (themeIcon && themeText) {
        themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
        themeText.textContent = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
}

window.toggleTheme = toggleTheme;

// Apply theme immediately
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme, false);
})();
