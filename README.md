# Room Decoration - Mini 3D Interior Design Application

A web-based 3D interior design tool that allows users to drag and drop furniture objects into both 2D top-down and 3D perspective views. Built with Three.js for rendering and featuring intuitive object manipulation controls.

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
- [Technologies Used](#technologies-used)
- [Acknowledgements](#acknowledgements)

## 🖼️ Overview

Room Decoration is a mini 3D interior design application that enables users to:
- Browse 3D furniture models in a sidebar library
- Drag and drop objects into either 2D or 3D views
- Manipulate objects (move, rotate, scale) using transform controls or a precise Properties Panel
- Experience realistic lighting, shadows, physics (gravity and collisions), and audio
- View designs simultaneously in both 2D top-down and 3D perspective views
- Take a cinematic tour of the finalized room design

## ✨ Features

### Core Functionality
- **Dual View System**: Synchronized 2D orthographic and 3D perspective views
- **Drag & Drop**: Add furniture objects from sidebar to canvas
- **Object Manipulation**: Move, rotate, and scale objects using transform controls or the dynamic **Properties Panel**
- **Physics & Collisions**: Realistic object placement with gravity and collision detection preventing overlapping
- **Cinematic Tour Mode**: Smooth 60FPS automated camera tour around the decorated room
- **Project Persistence**: Saves and loads recent projects using local storage

### Technical Implementation
- **Three.js Integration**: Modern ES6 modules with import maps
- **Advanced Lighting**: Physically accurate indoor lighting, light isolation, and window light scattering
- **Model & Texture Loading**: Dynamic loading of complex 3D `.glb` furniture models and PBR textures
- **Audio Integration**: Soft classical background music and UI sound effects

### User Interface
- **Left Sidebar**: Furniture library with search capability and project management
- **Properties Panel**: Dynamic inputs for position, rotation, scale, and room appearance editing
- **Views**: 2D (left) and 3D (right) display panels
- **Bottom Toolbar**: Transform control buttons, collision toggle, and tour mode activation
- **Visual Feedback**: Hover states, selection outlines, and interactive cursor changes

## 📁 Project Structure

```text
Home_Decoration/
├── index.html                    # Homepage (Project selection/creation)
├── editor.html                   # Main 3D interior design editor
├── tutorial.html                 # Tutorial and documentation page
├── upload.html                   # Interface for uploading new models
├── menu-manifest.json            # Manifest file indexing all 3D assets
├── assets/                       # UI icons and image assets
├── background/                   # Background music and audio sound effects
├── css/
│   ├── style.css                 # Main styling for the editor
│   ├── home.css                  # Styling for homepage
│   ├── modal.css                 # Styling for dialog modals
│   └── tutorial.css              # Styling for the tutorial page
├── furnitures/                   # Categorized 3D models (.glb files)
├── scripts/
│   └── generate_menu_manifest.py # Python script to auto-generate the manifest.json
└── js/
    ├── main.js                   # Main editor application logic
    ├── audio.js                  # Audio playback and SFX management
    ├── modal.js                  # Reusable modal UI logic
    ├── settings.js               # Application settings
    ├── tutorial.js               # Logic for tutorial page
    └── modules/                  # Feature-specific modules
        ├── sceneSetup.js         # Three.js setup, dual-camera handling
        ├── lighting.js           # Lighting setup, shadows, light isolation
        ├── modelLoader.js        # Dynamic loading of GLB/GLTF models
        ├── textureLoader.js      # PBR Texture loading
        ├── roomGeometry.js       # Generation of floor, walls, and ceiling
        ├── dragDrop.js           # Handles drag and drop from sidebar to canvas
        ├── uiManager.js          # Core UI layout and interaction
        ├── menuBuilder.js        # Renders the sidebar furniture library
        ├── collisionManager.js   # Collision detection and physics
        ├── doorManager.js        # Interactive door handling
        ├── interactionManager.js # Coordinates high-level user interactions
        └── interaction/          # Sub-modules for complex interactions
            ├── selection.js      # Raycasting and object selection
            ├── propertiesPanel.js# Dynamic properties panel UI
            ├── gizmo.js          # Transform controls wrapper
            ├── toolbar.js        # Interaction toolbar logic
            ├── keyboard.js       # Keyboard shortcuts
            └── history.js        # Undo/Redo logic
```

## 🚀 How to Run

Because the application loads local 3D models (`.glb`/`.gltf`) and uses ES6 modules, simply opening `index.html` directly in your browser will cause **CORS (Cross-Origin Resource Sharing) errors**, preventing models from loading. To run the project correctly, you must use a local web server. We highly recommend using **Live Server** in Visual Studio Code.

### Using VS Code Live Server (Recommended)
1. **Install [Visual Studio Code](https://code.visualstudio.com/)** if you haven't already.
2. **Install the Live Server extension**:
   - Open VS Code and go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
   - Search for **"Live Server"** (by Ritwick Dey) and click **Install**.
3. **Open the Project**:
   - Open the `Home_Decoration` folder in VS Code (`File` > `Open Folder...`).
4. **Run the Application**:
   - Locate `index.html` in the Explorer pane.
   - **Right-click** on `index.html` and select **"Open with Live Server"** (or use the "Go Live" button on the bottom right status bar).
   - A new browser window will automatically open (usually at `http://127.0.0.1:5500/index.html`) running the application correctly.

> If you add new furniture `.glb` files under `furnitures/`, run the manifest generator to update the sidebar automatically:
>
> ```bash
> python scripts/generate_menu_manifest.py
> ```
>
>*Note: The application uses Three.js from unpkg CDN, so an internet connection is required for initial load.*

## 💻 Technologies Used

- **Three.js** (r152): Core 3D rendering library
- **HTML5/CSS3**: Markup and styling
- **JavaScript ES6 Modules**: Modern module system with import maps
- **Unpkg CDN**: Dependency delivery for Three.js
- **Responsive Design**: Flexible layout adapting to viewport size

## 🔧 Implementation Details

### Scene Setup (`sceneSetup.js`)
- Creates a shared Three.js scene for both views
- Configures orthographic camera (2D) and perspective camera (3D)
- Sets up WebGL renderers with anti-aliasing
- Implements synchronized resize handling
- Adds grid helper for spatial reference

### Lighting (`lighting.js`)
- Ambient light for base illumination
- Directional light simulating window sunlight with shadow casting
- Point light simulating ceiling lamp
- Configures shadow maps for realistic shadows

### Object Interaction (`interactionManager.js`)
- Integrates Three.js TransformControls for object manipulation
- Implements raycasting for object selection
- Manages selected object state and UI feedback
- Provides registration system for drag-dropped objects

### Drag and Drop (`dragDrop.js`)
- Handles drag events from sidebar items
- Converts 2D mouse coordinates to 3D world coordinates using raycasting against ground plane
- Loads `.glb` objects via model loader and places them at drop position
- Registers new objects with interaction manager for manipulation and physics

### UI Management (`uiManager.js`)
- Connects toolbar buttons to interaction manager actions
- Handles dynamic Properties Panel synchronization and room appearance toggles
- Manages visual states of UI elements and modal popups

## 📝 Notes & Future Improvements

- Multi-object selection and grouping features could be added
- Undo/redo history system
- Exporting room layouts to standard 3D formats
- Further performance optimization for very large imported models

## 👥 Acknowledgements

- Three.js team for the excellent 3D library
- The open-source community for various techniques and patterns used
- Created as part of a Graphics course project at UIT

---

*Developed with ❤️ using Three.js and modern web technologies*