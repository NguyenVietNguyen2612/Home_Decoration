import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function setupInteractionManager(scene, camera2D, renderer2D, orbitControls2D, camera3D, renderer3D, orbitControls3D) {

    let selectedObjects = [];
    let currentTool     = 'none';
    const interactableObjects = [];

    // ==========================================
    // 1. SELECTION GROUP (dùng khi chọn nhiều object)
    // ==========================================
    const selectionGroup = new THREE.Group();
    selectionGroup.name  = '__selectionGroup__';
    scene.add(selectionGroup);

    const _box    = new THREE.Box3();
    const _center = new THREE.Vector3();

    /** Trả tất cả children của selectionGroup về scene */
    function dissolveGroup() {
        while (selectionGroup.children.length > 0) {
            scene.attach(selectionGroup.children[0]);
        }
    }

    /** Nhóm selectedObjects lại, đặt tâm selectionGroup ở giữa bounding box */
    function buildGroup() {
        dissolveGroup();
        if (selectedObjects.length < 2) return;

        _box.makeEmpty();
        selectedObjects.forEach(o => _box.expandByObject(o));
        _box.getCenter(_center);

        selectionGroup.position.copy(_center);
        selectionGroup.rotation.set(0, 0, 0);
        selectionGroup.scale.set(1, 1, 1);
        selectionGroup.updateMatrixWorld(true);

        selectedObjects.forEach(o => selectionGroup.attach(o));
    }

    // ==========================================
    // 2. TRANSFORM CONTROLS (GIZMO)
    // ==========================================
    const transformControl3D = new TransformControls(camera3D, renderer3D.domElement);
    transformControl3D.addEventListener('dragging-changed', (e) => {
        // Khoá camera controller khi đang kéo gizmo để không xung đột
        if (orbitControls3D && 'enabled' in orbitControls3D) {
            orbitControls3D.enabled = !e.value;
        }
    });
    scene.add(transformControl3D);

    const transformControl2D = new TransformControls(camera2D, renderer2D.domElement);
    transformControl2D.addEventListener('dragging-changed', (e) => {
        if (orbitControls2D && 'enabled' in orbitControls2D) {
            orbitControls2D.enabled = !e.value;
        }
    });
    transformControl2D.showY = false; // 2D top-down: chỉ trục X và Z
    scene.add(transformControl2D);

    // ==========================================
    // 3. TOOLBAR UI
    // ==========================================
    const btnTranslate = document.getElementById('btn-translate');
    const btnRotate    = document.getElementById('btn-rotate');
    const btnScale     = document.getElementById('btn-scale');
    const btnDelete    = document.getElementById('btn-delete');

    function updateToolbarUI() {
        const map = { translate: btnTranslate, rotate: btnRotate, scale: btnScale };
        for (const [key, btn] of Object.entries(map)) {
            if (!btn) continue;
            const active = key === currentTool;
            btn.style.backgroundColor = active ? '#b8daff' : '';
            btn.style.borderColor     = active ? '#0056b3' : '';
            btn.style.color           = active ? '#004085' : '';
            btn.style.fontWeight      = active ? 'bold'    : 'normal';
        }
    }

    // ==========================================
    // 4. HIGHLIGHT
    // ==========================================
    function applySelectionHighlight(object, highlight) {
        if (!object) return;
        object.traverse(node => {
            if (!node.isMesh) return;
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach(mat => {
                if (!mat) return;
                if (highlight) {
                    if (!mat.userData.origEmissive) {
                        mat.userData.origEmissive = mat.emissive
                            ? mat.emissive.clone()
                            : new THREE.Color(0x000000);
                    }
                    if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
                    mat.emissive.setHex(0xff8800);
                    mat.emissiveIntensity = 0.4;
                } else {
                    if (mat.userData.origEmissive) {
                        mat.emissive.copy(mat.userData.origEmissive);
                        delete mat.userData.origEmissive;
                    }
                }
            });
        });
    }

    // ==========================================
    // 5. GIZMO ATTACH / DETACH
    // ==========================================
    function attachGizmo() {
        if (selectedObjects.length === 0 || currentTool === 'none') {
            transformControl3D.detach();
            transformControl2D.detach();
            return;
        }
        const target = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];

        // Nếu target là Group (ví dụ: căn phòng) và đang ở chế độ Move,
        // khoá trục Y để phòng chỉ trượt trên mặt phẳng lưới (XZ)
        const isGroup = target.isGroup;
        if (currentTool === 'translate' && isGroup) {
            transformControl3D.showY = false;
        } else {
            transformControl3D.showY = true;
        }

        transformControl3D.setMode(currentTool);
        transformControl3D.attach(target);
        transformControl2D.setMode(currentTool);
        transformControl2D.attach(target);
    }


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
            selectedObjects = [];
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
            selectedObjects = [obj];
            applySelectionHighlight(obj, true);
        }

        buildGroup();
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
    const raycaster   = new THREE.Raycaster();
    const _mouse      = new THREE.Vector2();
    const CLICK_THRESHOLD = 5; // pixels

    function setupViewSelection(renderer, camera) {
        let downX = 0, downY = 0;

        renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            downX = e.clientX;
            downY = e.clientY;
        });

        renderer.domElement.addEventListener('pointerup', (e) => {
            if (e.button !== 0) return;

            // Nếu chuột đã di chuyển quá ngưỡng → người dùng đang kéo, không phải click
            const dx = e.clientX - downX;
            const dy = e.clientY - downY;
            if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) return;

            const rect = renderer.domElement.getBoundingClientRect();
            _mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
            _mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

            raycaster.setFromCamera(_mouse, camera);
            const intersects = raycaster.intersectObjects(interactableObjects, true);

            if (intersects.length > 0) {
                // Tìm root interactable (leo cây parent)
                let hit = intersects[0].object;
                while (hit && !interactableObjects.includes(hit)) {
                    hit = hit.parent;
                    if (!hit || hit === scene) { hit = null; break; }
                }

                if (hit) {
                    const isMulti = e.ctrlKey || e.metaKey;
                    selectObject(hit, isMulti);
                    // Nếu chưa có tool thì tự bật Move
                    if (selectedObjects.length > 0 && currentTool === 'none') {
                        setTool('translate');
                    }
                }
            } else {
                // Click vào khoảng trống → bỏ chọn tất cả
                selectObject(null, false);
                setTool('none');
            }
        });
    }

    setupViewSelection(renderer3D, camera3D);
    setupViewSelection(renderer2D, camera2D);

    // ==========================================
    // 9. PHÍM TẮT
    // ==========================================
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'w': case 'W':
                if (selectedObjects.length > 0) setTool('translate');
                break;
            case 'e': case 'E':
                if (selectedObjects.length > 0) setTool('rotate');
                break;
            case 'r': case 'R':
                if (selectedObjects.length > 0) setTool('scale');
                break;
            case 'q': case 'Q':
                selectObject(null, false);
                setTool('none');
                break;
            case 'Delete':
            case 'Backspace':
                if (selectedObjects.length > 0) {
                    const targets = [...selectedObjects];
                    selectObject(null, false);
                    setTool('none');
                    targets.forEach(t => {
                        if (t.parent) t.parent.remove(t);
                        const i = interactableObjects.indexOf(t);
                        if (i > -1) interactableObjects.splice(i, 1);
                    });
                }
                break;
        }
    });

    // ==========================================
    // 10. TOOLBAR BUTTONS
    // ==========================================
    if (btnTranslate) btnTranslate.addEventListener('click', () => {
        if (selectedObjects.length > 0) setTool('translate');
    });
    if (btnRotate) btnRotate.addEventListener('click', () => {
        if (selectedObjects.length > 0) setTool('rotate');
    });
    if (btnScale) btnScale.addEventListener('click', () => {
        if (selectedObjects.length > 0) setTool('scale');
    });
    if (btnDelete) btnDelete.addEventListener('click', () => {
        if (selectedObjects.length > 0) {
            const targets = [...selectedObjects];
            selectObject(null, false);
            setTool('none');
            targets.forEach(t => {
                if (t.parent) t.parent.remove(t);
                const i = interactableObjects.indexOf(t);
                if (i > -1) interactableObjects.splice(i, 1);
            });
        }
    });

    // ==========================================
    // 11. ĐĂNG KÝ OBJECT MỚI (từ drag-drop hoặc sample)
    // ==========================================
    function registerInteractableObject(mesh) {
        interactableObjects.push(mesh);
        selectObject(mesh, false);   // auto-chọn
        setTool('translate');         // auto bật Move
    }

    return { registerInteractableObject, interactableObjects };
}
