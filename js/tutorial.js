// js/tutorial.js
const TutorialSteps = [
    {
        text: "Welcome to Room Decoration! 🌟<br><br>Let me show you around so you can start designing your dream room.",
        target: null,
        posClass: 'pos-center',
        layoutClass: 'mascot-right'
    },
    {
        text: "This is the <b>Object Library</b>.<br><br>You can search and drag objects directly into your scene.",
        target: "#left-sidebar",
        padding: 0,
        posClass: 'pos-center-right',
        layoutClass: 'mascot-right'
    },
    {
        text: "Inside the library, click on any category like <b>Wallpapers</b> or <b>Floors</b> to see the items inside.",
        target: "#sidebar-content",
        padding: 5,
        posClass: 'pos-center-right',
        layoutClass: 'mascot-right',
        onEnter: () => {
            const firstDetails = document.querySelector('#sidebar-content details:nth-child(2)');
            if (firstDetails) firstDetails.open = true;
        }
    },
    {
        text: "This is the <b>2D View</b>.<br><br>It's perfect for precisely placing furniture from a top-down perspective.",
        target: "#view-2d-container",
        padding: 5,
        posClass: 'pos-bottom-right',
        layoutClass: 'mascot-right'
    },
    {
        text: "Here is the <b>3D Preview</b>.<br><br>See your room in full 3D. Right-click and drag to rotate the camera!",
        target: "#view-3d-container",
        padding: 5,
        posClass: 'pos-bottom-left',
        layoutClass: 'mascot-left'
    },
    {
        text: "This is the <b>Transform Toolbar</b>.<br><br>Use these tools to Move, Rotate, or Scale the objects you've selected.",
        target: "#bottom-toolbar .tool-group:first-child",
        padding: 10,
        posClass: 'pos-top-right',
        layoutClass: 'mascot-right'
    },
    {
        text: "Made a mistake? No problem!<br><br>Use the <b>Undo</b> and <b>Redo</b> buttons to step backward or forward.",
        target: "#bottom-toolbar .tool-group:nth-child(3)",
        padding: 10,
        posClass: 'pos-top-right',
        layoutClass: 'mascot-right'
    },
    {
        text: "Adjust the <b>Time of Day</b> (lighting) and <b>Grid Settings</b> (snapping) here to customize your workspace.",
        target: "#bottom-toolbar .tool-group:nth-child(5)",
        padding: 10,
        posClass: 'pos-top-right',
        layoutClass: 'mascot-right'
    },
    {
        text: "Need to remove something?<br><br>Select it and hit the <b>Delete</b> button.",
        target: "#btn-delete",
        padding: 10,
        posClass: 'pos-top-left',
        layoutClass: 'mascot-left'
    },
    {
        text: "Need to start fresh?<br><br>Click <b>New Room</b> to clear the current design and begin a new project.",
        target: "#btn-new-room",
        padding: 5,
        posClass: 'pos-top-left',
        layoutClass: 'mascot-left'
    },
    {
        text: "Don't forget to <b>Save</b> your progress frequently! Your room will be downloaded to your computer.",
        target: "#btn-save",
        padding: 5,
        posClass: 'pos-top-left',
        layoutClass: 'mascot-left'
    },
    {
        text: "Want to see your masterpiece?<br><br>Enter <b>Preview Mode</b> for a full-screen, cinematic view of your room.",
        target: "#btn-preview",
        padding: 5,
        posClass: 'pos-top-left',
        layoutClass: 'mascot-left'
    },
    {
        text: "If you ever forget how to use the tools, click this <b>Help</b> button to open the user guide.",
        target: "#btn-help",
        padding: 5,
        posClass: 'pos-top-left',
        layoutClass: 'mascot-left'
    },
    {
        text: "When you select an object, its exact coordinates and rotation will appear in the <b>Properties Panel</b> here.",
        target: "#properties-panel",
        padding: 5,
        posClass: 'pos-bottom-left',
        layoutClass: 'mascot-left',
        onEnter: () => document.getElementById('properties-panel').classList.remove('hidden'),
        onLeave: () => document.getElementById('properties-panel').classList.add('hidden')
    },
    {
        text: "You're all set! 🎉<br><br>Click anywhere or press Skip to return to the Home page and start your own project.",
        target: null,
        posClass: 'pos-center',
        layoutClass: 'mascot-right'
    }
];

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.buildUI();
        
        // Wait a bit for main.js to load UI properly
        setTimeout(() => {
            this.showMascot();
            this.updateStep();
        }, 1000);
    }
    
    buildUI() {
        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.addEventListener('click', () => this.nextStep());
        document.body.appendChild(this.overlay);
        
        // Highlight Box
        this.highlight = document.createElement('div');
        this.highlight.className = 'tutorial-highlight';
        document.body.appendChild(this.highlight);
        
        // Skip Button
        this.skipBtn = document.createElement('button');
        this.skipBtn.className = 'tutorial-skip-btn';
        this.skipBtn.innerHTML = 'Skip Tutorial ⏭️';
        this.skipBtn.addEventListener('click', () => this.endTutorial());
        document.body.appendChild(this.skipBtn);
        
        // Mascot Container
        this.mascotContainer = document.createElement('div');
        this.mascotContainer.className = 'tutorial-mascot-container';
        
        // Speech Bubble
        this.speechBubble = document.createElement('div');
        this.speechBubble.className = 'tutorial-speech';
        this.speechText = document.createElement('div');
        this.speechBubble.appendChild(this.speechText);
        
        const clickHint = document.createElement('div');
        clickHint.className = 'tutorial-click-hint';
        clickHint.innerHTML = 'Click anywhere to continue 🖱️';
        this.speechBubble.appendChild(clickHint);
        
        // Mascot character
        const mascotChar = document.createElement('img');
        mascotChar.className = 'tutorial-mascot';
        mascotChar.src = 'mascot.png';
        mascotChar.alt = 'Owl Mascot';
        
        this.mascotContainer.appendChild(this.speechBubble);
        this.mascotContainer.appendChild(mascotChar);
        document.body.appendChild(this.mascotContainer);
        
        // Handle window resize
        window.addEventListener('resize', () => this.updateHighlightPosition());
    }
    
    showMascot() {
        this.mascotContainer.classList.add('show');
    }
    
    nextStep() {
        const step = TutorialSteps[this.currentStep];
        if (step && step.onLeave) step.onLeave();
        
        this.currentStep++;
        if (this.currentStep >= TutorialSteps.length) {
            this.endTutorial();
        } else {
            this.updateStep();
        }
    }
    
    updateStep() {
        const step = TutorialSteps[this.currentStep];
        
        if (step.onEnter) step.onEnter();
        
        this.speechText.innerHTML = step.text;
        
        // Update Mascot position
        this.mascotContainer.className = `tutorial-mascot-container show ${step.posClass} ${step.layoutClass}`;
        
        // Update highlight
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                this.currentTargetElement = el;
                this.currentPadding = step.padding || 0;
                this.highlight.classList.add('active');
                this.overlay.classList.remove('dimmed');
                
                // Force a reflow before setting position if it was display:none
                setTimeout(() => this.updateHighlightPosition(), 50);
            } else {
                this.highlight.classList.remove('active');
                this.overlay.classList.add('dimmed');
                this.currentTargetElement = null;
            }
        } else {
            this.highlight.classList.remove('active');
            this.overlay.classList.add('dimmed');
            this.currentTargetElement = null;
        }
    }
    
    updateHighlightPosition() {
        if (!this.currentTargetElement) return;
        
        const rect = this.currentTargetElement.getBoundingClientRect();
        const p = this.currentPadding;
        
        this.highlight.style.top = `${rect.top - p}px`;
        this.highlight.style.left = `${rect.left - p}px`;
        this.highlight.style.width = `${rect.width + p*2}px`;
        this.highlight.style.height = `${rect.height + p*2}px`;
    }
    
    endTutorial() {
        window.location.href = 'index.html';
    }
}

// Run after main.js has mostly initialized
window.addEventListener('load', () => {
    new TutorialManager();
});
