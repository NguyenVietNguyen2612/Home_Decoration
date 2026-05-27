// js/audio.js

const BGM_PATH = 'assets/audio/bgm.wav';
const CLICK_PATH = 'assets/audio/click.wav';

// Create audio elements
const bgmAudio = new Audio(BGM_PATH);
bgmAudio.loop = true;
bgmAudio.volume = 0.7; // Soft volume

const clickAudio = new Audio(CLICK_PATH);
clickAudio.volume = 1;

let isBgmPlaying = false;

// Function to play click sound
function playClickSound() {
    // Clone node to allow rapid overlapping clicks
    const clickClone = clickAudio.cloneNode();
    clickClone.volume = clickAudio.volume;
    clickClone.play().catch(e => console.warn('Audio play failed:', e));
}

// Function to start BGM on first interaction
function startBgm() {
    if (!isBgmPlaying) {
        bgmAudio.play().then(() => {
            isBgmPlaying = true;
            // Remove the interaction listeners once BGM starts
            document.removeEventListener('click', startBgm);
            document.removeEventListener('keydown', startBgm);
        }).catch(e => {
            console.warn('BGM play failed, might need more interaction:', e);
        });
    }
}

// Add interaction listeners for BGM autoplay policy
document.addEventListener('click', startBgm, { once: true });
document.addEventListener('keydown', startBgm, { once: true });

// Add click sound to all buttons and interactable elements dynamically
document.addEventListener('DOMContentLoaded', () => {
    // We can use event delegation on the document body to catch button clicks
    document.body.addEventListener('click', (e) => {
        // Check if the clicked element or its parent is a button or has role="button" or is a link styled as a button
        const target = e.target.closest('button, .menu-btn, .tool-btn, .object-item, summary');
        if (target) {
            playClickSound();
        }
    });
});
