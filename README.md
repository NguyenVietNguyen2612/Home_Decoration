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
- Browse furniture objects in a sidebar library
- Drag and drop objects into either 2D or 3D views
- Manipulate objects (move, rotate, scale) using transform controls
- View designs simultaneously in both 2D top-down and 3D perspective views
- Experience realistic lighting and shadows

## ✨ Features

### Core Functionality
- **Dual View System**: Synchronized 2D orthographic and 3D perspective views
- **Drag & Drop**: Add furniture objects from sidebar to canvas
- **Object Manipulation**: Move, rotate, and scale objects using transform controls
- **Real-time Rendering**: Smooth 60fps rendering with requestAnimationFrame
- **Responsive Design**: Adapts to window resizing

### Technical Implementation
- **Three.js Integration**: Modern ES6 modules with import maps
- **OrbitControls**: Customized camera controls for both views
- **Raycasting**: Precise object placement using mouse coordinates
- **Shadow Mapping**: Realistic directional and point light shadows
- **Event Handling**: Comprehensive mouse and drag/drop event management

### User Interface
- **Left Sidebar**: Furniture library with search capability
- **Top Views**: 2D (left) and 3D (right) display panels
- **Bottom Toolbar**: Transform control buttons (Select, Move, Rotate, Scale, Delete)
- **Visual Feedback**: Hover states, selection outlines, and cursor changes

## 📁 Project Structure

```
Home_Decoration/
├── index.html              # Main HTML structure
├── css/
│   └── style.css           # Styling for all UI components
└── js/
    ├── main.js             # Application entry point and orchestrator
    └── modules/            # Feature-specific modules
        ├── sceneSetup.js     # Three.js scene, cameras, renderers, and controls
        ├── lighting.js       # Lighting setup (ambient, directional, point lights)
        ├── roomGeometry.js   # Creates floor and walls
        ├── interactionManager.js # Object selection and transform controls
        ├── dragDrop.js       # Drag and drop functionality from sidebar
        ├── uiManager.js      # UI event handling and button logic
        ├── modelLoader.js    # Dynamic 3D model loading (placeholder shapes)
        └── textureLoader.js  # Texture loading utilities
```

## 🚀 How to Run

1. **Clone or download** this repository to your local machine
2. **Navigate** to the Home_Decoration directory
3. **Open** `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
4. **No build steps or dependencies** required - runs entirely client-side via CDN

*Note: The application uses Three.js from unpkg CDN, so an internet connection is required for initial load.*

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
- Creates objects via model loader and places them at drop position
- Registers new objects with interaction manager for manipulation

### UI Management (`uiManager.js`)
- Connects toolbar buttons to interaction manager actions
- Handles search input filtering (placeholder for future enhancement)
- Manages visual states of UI elements

## 📝 Notes & Future Improvements

- Currently uses placeholder geometric shapes for furniture (to be replaced with actual 3D models)
- Includes a small initial sample layout of objects for testing, such as table, chairs, sofa, plant, TV, cabinet, and lamp
- Search functionality in sidebar is implemented but not connected to a filter system
- Object persistence (save/load) not implemented
- Material/texture system could be enhanced with PBR materials
- Multi-object selection and grouping features could be added
- Undo/redo history system

## 👥 Acknowledgements

- Three.js team for the excellent 3D library
- The open-source community for various techniques and patterns used
- Created as part of a Graphics course project at UIT

---

*Developed with ❤️ using Three.js and modern web technologies*