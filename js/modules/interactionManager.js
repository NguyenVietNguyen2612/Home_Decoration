import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { setupViewSelection } from './interaction/selection.js';
import { setupKeyboardControls } from './interaction/keyboard.js';
import { setupGizmos } from './interaction/gizmo.js';
import { setupToolbarUI } from './interaction/toolbar.js';
import { setupSelectionUtils } from './interaction/selectionUtils.js';
import { setupHistoryManager } from './interaction/history.js';
import { updateWallHoles } from './doorManager.js';

export function setupInteractionManager(scene, camera2D, renderer2D, orbitControls2D, camera3D, renderer3D, orbitControls3D, collisionManager = null) {

    let selectedObjects = [];
    let currentTool = 'none';
    const interactableObjects = [];

    // ==========================================
    // 1. SELECTION GROUP & HIGHLIGHT (Tách ra module riêng)
    // ==========================================
    const { selectionGroup, buildGroup, dissolveGroup, applySelectionHighlight } = setupSelectionUtils({
        scene, selectedObjects
    });

    // ==========================================
    // 1.5 HISTORY MANAGER (Undo/Redo)
    // ==========================================
    const { saveHistoryState, undo, redo } = setupHistoryManager({
        scene, interactableObjects, collisionManager, selectObject, setTool
    });

    // ==========================================
    // 2. TRANSFORM CONTROLS (GIZMO) (Tách ra module riêng)
    // ==========================================
    const {
        gizmoScene3D,
        gizmoScene2D,
        transformControl3D,
        transformControl2D,
        attachGizmo: _attachGizmo,
        isGizmoDragging,
        saveState
    } = setupGizmos({
        camera3D, renderer3D, orbitControls3D,
        camera2D, renderer2D, orbitControls2D,
        selectedObjects, selectionGroup, collisionManager,
        onDragChange: (isDragging) => {
            if (!isDragging) {
                updateWallHoles(scene);
                saveHistoryState();
            }
        }
    });

    function attachGizmo() {
        _attachGizmo(currentTool);
    }

    // ==========================================
    // 3. TOOLBAR UI (Tách ra module riêng)
    // ==========================================
    const { updateToolbarUI } = setupToolbarUI({
        scene, selectedObjects, interactableObjects, collisionManager, setTool, selectObject,
        undo, redo, saveHistoryState
    });

    // ==========================================
    // 4. HIGHLIGHT
    // (Đã được chuyển vào module selectionUtils.js)
    // ==========================================




    // ==========================================
    // 6. SET TOOL
    // ==========================================
    function setTool(tool) {
        currentTool = tool;
        updateToolbarUI();
        attachGizmo();
    }

    // ==========================================
    // 7. SELECT OBJECT
    // ==========================================
    function selectObject(obj, isMultiSelect) {
        if (!obj) {
            selectedObjects.forEach(o => applySelectionHighlight(o, false));
            selectedObjects.length = 0;
        } else if (isMultiSelect) {
            const idx = selectedObjects.indexOf(obj);
            if (idx > -1) {
                applySelectionHighlight(obj, false);
                selectedObjects.splice(idx, 1);
            } else {
                selectedObjects.push(obj);
                applySelectionHighlight(obj, true);
            }
        } else {
            // Chọn đơn
            selectedObjects.forEach(o => applySelectionHighlight(o, false));
            selectedObjects.length = 0;
            selectedObjects.push(obj);
            applySelectionHighlight(obj, true);
        }

        buildGroup();

        // Cập nhật ngay trạng thái vị trí để tránh dính tọa độ object cũ
        saveState();

        attachGizmo();
    }

    // ==========================================
    // 8. RAYCASTER – CHỌN OBJECT KHI CLICK
    //
    // QUAN TRỌNG: Dùng pointerup thay vì pointerdown.
    // TransformControls xử lý kéo-gizmo trên pointerdown → pointerup → pointermove.
    // Nếu dùng pointerdown để chọn, khi người dùng nhấp vào trục gizmo,
    // raycaster không tìm thấy object nào → gọi selectObject(null) → detach gizmo
    // → TransformControls mất target trước khi kéo kịp bắt đầu.
    //
    // Với pointerup + kiểm tra độ dịch chuyển chuột:
    //   - Nếu chuột KHÔNG di chuyển nhiều  → là click → thực hiện chọn
    //   - Nếu chuột DI CHUYỂN nhiều        → là kéo gizmo → bỏ qua
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const _mouse = new THREE.Vector2();
    const CLICK_THRESHOLD = 5; // pixels

    // ==========================================
    // 8. RAYCASTER & BOX SELECTION (Tách ra module riêng)
    // ==========================================
    setupViewSelection({
        renderer3D, camera3D, renderer2D, camera2D,
        interactableObjects, selectedObjects,
        transformControl3D, transformControl2D,
        applySelectionHighlight, buildGroup,
        _saveState: saveState,
        attachGizmo, setTool, getCurrentTool: () => currentTool, selectObject,
        scene
    });

    // ==========================================
    // 9. PHÍM TẮT & CHUỘT (SMOOTH MOVEMENT - Tách ra module riêng)
    // ==========================================
    setupKeyboardControls({
        scene, renderer3D, renderer2D, orbitControls3D, camera2D, orbitControls2D, 
        selectedObjects, interactableObjects, collisionManager,
        setTool, selectObject, undo, redo, saveHistoryState
    });

    // ==========================================
    // 10. TOOLBAR BUTTONS
    // (Đã được chuyển vào module toolbar.js)
    // ==========================================

    // ==========================================
    // 11. ĐĂNG KÝ OBJECT MỚI (từ drag-drop hoặc sample)
    // ==========================================
    function registerInteractableObject(mesh, collidable = true, autoSelect = true) {
        if (!mesh.userData) mesh.userData = {};
        mesh.userData.isCollidable = collidable;

        interactableObjects.push(mesh);
        if (collisionManager && collidable) collisionManager.register(mesh);
        if (autoSelect) {
            selectObject(mesh, false);
            setTool('translate');
        }
        saveHistoryState();
    }

    return {
        registerInteractableObject,
        interactableObjects,
        getSelectedObjects: () => selectedObjects,
        isGizmoDragging,
        gizmoScene3D,
        gizmoScene2D
    };
}
