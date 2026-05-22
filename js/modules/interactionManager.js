import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function setupInteractionManager(scene, camera2D, renderer2D, orbitControls2D, camera3D, renderer3D, orbitControls3D, collisionManager = null) {

    let selectedObjects = [];
    let currentTool = 'none';
    const interactableObjects = [];

    // ==========================================
    // 1. SELECTION GROUP (dùng khi chọn nhiều object)
    // ==========================================
    const selectionGroup = new THREE.Group();
    selectionGroup.name = '__selectionGroup__';
    scene.add(selectionGroup);

    const _box = new THREE.Box3();
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
    // Khởi tạo 2 scene riêng biệt chứa gizmo để render đè lên view tương ứng
    const gizmoScene3D = new THREE.Scene();
    const gizmoScene2D = new THREE.Scene();

    // Hàm tiện ích để xoá bỏ các mũi tên/cục scale hướng âm (negative axes)
    function removeNegativeGizmoArrows(transformControl) {
        const elementsToRemove = [];
        const center = new THREE.Vector3();

        transformControl.traverse(child => {
            if (child.isMesh && child.geometry) {
                child.geometry.computeBoundingBox();
                child.geometry.boundingBox.getCenter(center);

                // Nếu trọng tâm của mesh nằm lùi về hướng âm quá -0.1
                if (center.x < -0.1 || center.y < -0.1 || center.z < -0.1) {
                    elementsToRemove.push(child);
                }
            }
        });

        elementsToRemove.forEach(el => {
            if (el.parent) el.parent.remove(el);
        });
    }

    // Hàm vô hiệu hoá tính năng tự động scale theo màn hình của Gizmo (để trục có kích thước vật lý cố định)
    function makeConstantWorldSize(transformControl) {
        const gizmo = transformControl._gizmo;
        if (!gizmo) return;

        const originalUpdate = gizmo.updateMatrixWorld;
        gizmo.updateMatrixWorld = function (force) {
            originalUpdate.call(this, force); // Gọi logic gốc, nó sẽ tính toán và đè scale mới, sau đó updateMatrixWorld

            const mode = this.mode;
            if (!this.picker || !this.picker[mode]) return;

            const handles = [
                ...this.picker[mode].children,
                ...this.gizmo[mode].children,
                ...this.helper[mode].children
            ];

            for (let i = 0; i < handles.length; i++) {
                const handle = handles[i];
                if (handle.name === 'DELTA') continue; // Bỏ qua helper tính khoảng cách

                // Nếu handle không bị TransformControls ẩn đi (scale = 1e-10)
                if (handle.scale.x > 0.0005) {
                    // Cố định kích thước trục trong không gian 3D (0.75 units)
                    handle.scale.set(2.5, 2.5, 2.5);
                    // Ép Three.js cập nhật lại ma trận với scale mới này ngay lập tức!
                    handle.updateMatrixWorld(true);
                }
            }
        };
    }

    const transformControl3D = new TransformControls(camera3D, renderer3D.domElement);
    transformControl3D.addEventListener('dragging-changed', (e) => {
        if (orbitControls3D && 'enabled' in orbitControls3D) orbitControls3D.enabled = !e.value;
        _onDragChange(e);
    });
    removeNegativeGizmoArrows(transformControl3D);
    makeConstantWorldSize(transformControl3D);
    gizmoScene3D.add(transformControl3D);

    const transformControl2D = new TransformControls(camera2D, renderer2D.domElement);
    transformControl2D.addEventListener('dragging-changed', (e) => {
        if (orbitControls2D && 'enabled' in orbitControls2D) orbitControls2D.enabled = !e.value;
        _onDragChange(e);
    });
    transformControl2D.showY = false;
    removeNegativeGizmoArrows(transformControl2D);
    makeConstantWorldSize(transformControl2D);
    gizmoScene2D.add(transformControl2D);

    // ==========================================
    // COLLISION DETECTION trong khi kéo gizmo
    // Sử dụng chiến lược "revert to last valid position":
    //   - mouseDown: lưu vị trí hợp lệ hiện tại
    //   - change   : nếu va chạm → khôi phục; không va chạm → cập nhật last valid
    // ==========================================
    const _sv = {
        pos: new THREE.Vector3(),
        rot: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
        valid: false
    };

    function _saveState(obj) {
        _sv.pos.copy(obj.position);
        _sv.rot.copy(obj.rotation);
        _sv.scale.copy(obj.scale);
        _sv.valid = true;
    }
    function _restoreState(obj) {
        if (!_sv.valid) return;
        obj.position.copy(_sv.pos);
        obj.rotation.copy(_sv.rot);
        obj.scale.copy(_sv.scale);
        obj.updateMatrixWorld(true);
    }
    function _onGizmoDown() {
        const t = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
        if (t) _saveState(t);
    }
    function _onGizmoChange() {
        if (!collisionManager) return;

        // Chỉ xử lý va chạm khi thực sự đang kéo (tránh event 'change' khi mới attach gizmo)
        if (!transformControl3D.dragging && !transformControl2D.dragging) return;

        const t = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
        if (!t) return;

        // Bỏ qua check va chạm nếu object không tham gia collision (ví dụ: căn phòng)
        if (t.userData && t.userData.isCollidable === false) {
            _saveState(t);
            return;
        }

        const { collides, collidingWith } = collisionManager.checkCollision(t, selectedObjects, _sv.pos);

        if (collides) {
            collisionManager.showColliding([...collidingWith]);
            _restoreState(t);
        } else {
            collisionManager.hideAll();
            _saveState(t);
        }
    }

    // Lắng nghe dragging-changed thay vì mouseDown để đảm bảo luôn bắt được trạng thái bắt đầu kéo
    function _onDragChange(e) {
        if (e.value) {
            // Vừa bắt đầu kéo
            _onGizmoDown();
        } else {
            // Vừa thả chuột
            if (collisionManager) collisionManager.hideAll();
        }
    }

    transformControl3D.addEventListener('change', _onGizmoChange);
    transformControl2D.addEventListener('change', _onGizmoChange);

    // ==========================================
    // 3. TOOLBAR UI
    // ==========================================
    const btnTranslate = document.getElementById('btn-translate');
    const btnRotate = document.getElementById('btn-rotate');
    const btnScale = document.getElementById('btn-scale');
    const btnDelete = document.getElementById('btn-delete');

    function updateToolbarUI() {
        const map = { translate: btnTranslate, rotate: btnRotate, scale: btnScale };
        for (const [key, btn] of Object.entries(map)) {
            if (!btn) continue;
            const active = key === currentTool;
            btn.style.backgroundColor = active ? '#b8daff' : '';
            btn.style.borderColor = active ? '#0056b3' : '';
            btn.style.color = active ? '#004085' : '';
            btn.style.fontWeight = active ? 'bold' : 'normal';
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

        // Cập nhật ngay trạng thái vị trí để tránh dính tọa độ object cũ
        const t = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
        if (t) {
            _saveState(t);
        } else {
            _sv.valid = false;
        }

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

    function setupViewSelection(renderer, camera) {
        let downX = 0, downY = 0;
        let isDragging = false;
        
        // Tạo element cho Box Selection (Khung chữ nhật)
        const rectDiv = document.createElement('div');
        rectDiv.style.position = 'absolute';
        rectDiv.style.border = '1px solid rgba(0, 120, 255, 0.8)';
        rectDiv.style.backgroundColor = 'rgba(0, 120, 255, 0.2)';
        rectDiv.style.pointerEvents = 'none';
        rectDiv.style.display = 'none';
        rectDiv.style.zIndex = '100';
        renderer.domElement.parentElement.appendChild(rectDiv);

        renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            
            downX = e.clientX;
            downY = e.clientY;

            // 1. Nếu đang bấm vào trục Gizmo thì bỏ qua
            const transformControl = camera === camera3D ? transformControl3D : transformControl2D;
            if (transformControl.axis !== null) return;

            // 2. Kiểm tra xem có bấm trúng Object nào không
            const rect = renderer.domElement.getBoundingClientRect();
            _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(_mouse, camera);
            const intersects = raycaster.intersectObjects(interactableObjects, true);

            if (intersects.length === 0) {
                // Click vào background trống -> Bắt đầu vẽ Box Selection
                isDragging = true;
                rectDiv.style.display = 'block';
                rectDiv.style.left = `${downX - rect.left}px`;
                rectDiv.style.top = `${downY - rect.top}px`;
                rectDiv.style.width = '0px';
                rectDiv.style.height = '0px';
                renderer.domElement.setPointerCapture(e.pointerId);
            }
        });

        renderer.domElement.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const left = Math.min(downX, currentX);
            const top = Math.min(downY, currentY);
            const width = Math.abs(currentX - downX);
            const height = Math.abs(currentY - downY);
            
            const rect = renderer.domElement.getBoundingClientRect();
            rectDiv.style.left = `${left - rect.left}px`;
            rectDiv.style.top = `${top - rect.top}px`;
            rectDiv.style.width = `${width}px`;
            rectDiv.style.height = `${height}px`;
        });

        renderer.domElement.addEventListener('pointerup', (e) => {
            if (e.button !== 0) return;

            if (isDragging) {
                isDragging = false;
                rectDiv.style.display = 'none';
                renderer.domElement.releasePointerCapture(e.pointerId);
                
                const upX = e.clientX;
                const upY = e.clientY;
                const dx = upX - downX;
                const dy = upY - downY;
                
                // Nếu thực sự có quét thành hình chữ nhật (vượt ngưỡng click)
                if (Math.abs(dx) > CLICK_THRESHOLD || Math.abs(dy) > CLICK_THRESHOLD) {
                    const rect = renderer.domElement.getBoundingClientRect();
                    const minX = Math.min(downX, upX);
                    const maxX = Math.max(downX, upX);
                    const minY = Math.min(downY, upY);
                    const maxY = Math.max(downY, upY);
                    
                    // Chuyển Box Selection sang toạ độ chuẩn hoá NDC [-1, 1]
                    const ndcMinX = ((minX - rect.left) / rect.width) * 2 - 1;
                    const ndcMaxX = ((maxX - rect.left) / rect.width) * 2 - 1;
                    const ndcMaxY = -((minY - rect.top) / rect.height) * 2 + 1; // Y ngược
                    const ndcMinY = -((maxY - rect.top) / rect.height) * 2 + 1;
                    
                    const selected = [];
                    const box3 = new THREE.Box3();
                    
                    // Quét toàn bộ object và kiểm tra va chạm 2D AABB
                    interactableObjects.forEach(obj => {
                        box3.setFromObject(obj);
                        let objMinX = Infinity, objMaxX = -Infinity;
                        let objMinY = Infinity, objMaxY = -Infinity;
                        let isBehindCamera = false;
                        
                        const corners = [
                            new THREE.Vector3(box3.min.x, box3.min.y, box3.min.z),
                            new THREE.Vector3(box3.max.x, box3.min.y, box3.min.z),
                            new THREE.Vector3(box3.min.x, box3.max.y, box3.min.z),
                            new THREE.Vector3(box3.max.x, box3.max.y, box3.min.z),
                            new THREE.Vector3(box3.min.x, box3.min.y, box3.max.z),
                            new THREE.Vector3(box3.max.x, box3.min.y, box3.max.z),
                            new THREE.Vector3(box3.min.x, box3.max.y, box3.max.z),
                            new THREE.Vector3(box3.max.x, box3.max.y, box3.max.z),
                        ];
                        
                        corners.forEach(corner => {
                            corner.project(camera);
                            if (corner.z > 1) isBehindCamera = true;
                            objMinX = Math.min(objMinX, corner.x);
                            objMaxX = Math.max(objMaxX, corner.x);
                            objMinY = Math.min(objMinY, corner.y);
                            objMaxY = Math.max(objMaxY, corner.y);
                        });
                        
                        // Nếu box 2D của object đè lên box selection
                        if (!isBehindCamera &&
                            objMinX <= ndcMaxX && objMaxX >= ndcMinX &&
                            objMinY <= ndcMaxY && objMaxY >= ndcMinY) {
                            selected.push(obj);
                        }
                    });
                    
                    const isMulti = e.ctrlKey || e.metaKey;
                    if (selected.length > 0) {
                        // Nếu không giữ phím Ctrl -> Chọn mới hoàn toàn
                        if (!isMulti) {
                            selectedObjects.forEach(o => applySelectionHighlight(o, false));
                            selectedObjects = [];
                        }
                        
                        selected.forEach(obj => {
                            if (!selectedObjects.includes(obj)) {
                                selectedObjects.push(obj);
                                applySelectionHighlight(obj, true);
                            }
                        });
                        
                        buildGroup();
                        const t = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
                        if (t) _saveState(t);
                        attachGizmo();
                        
                        if (currentTool === 'none') setTool('translate');
                    } else if (!isMulti) {
                        // Nếu quét khoảng trống và không giữ phím Ctrl -> Bỏ chọn tất cả
                        selectObject(null, false);
                        setTool('none');
                    }
                    return; // Quét xong thì dừng, không xử lý như click đơn
                }
            }

            // Xử lý Click thông thường (như cũ)
            const dx = e.clientX - downX;
            const dy = e.clientY - downY;
            if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) return;

            const rect = renderer.domElement.getBoundingClientRect();
            _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(_mouse, camera);
            const intersects = raycaster.intersectObjects(interactableObjects, true);

            if (intersects.length > 0) {
                let hit = intersects[0].object;
                while (hit && !interactableObjects.includes(hit)) {
                    hit = hit.parent;
                    if (!hit || hit === scene) { hit = null; break; }
                }

                if (hit) {
                    const isMulti = e.ctrlKey || e.metaKey;
                    selectObject(hit, isMulti);
                    if (selectedObjects.length > 0 && currentTool === 'none') {
                        setTool('translate');
                    }
                }
            } else {
                selectObject(null, false);
                setTool('none');
            }
        });
    }

    setupViewSelection(renderer3D, camera3D);
    setupViewSelection(renderer2D, camera2D);

    // ==========================================
    // 9. PHÍM TẮT & TRẠNG THÁI HOVER CHUỘT
    // ==========================================
    let hoveredView = '3D'; // Lưu trạng thái chuột đang ở view nào
    renderer3D.domElement.addEventListener('mouseenter', () => hoveredView = '3D');
    renderer2D.domElement.addEventListener('mouseenter', () => hoveredView = '2D');

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'w': case 'W':
                // Zoom In
                if (hoveredView === '3D') {
                    if (orbitControls3D.zoom) orbitControls3D.zoom(0.5);
                } else if (hoveredView === '2D') {
                    camera2D.zoom *= 1.05;
                    camera2D.updateProjectionMatrix();
                }
                break;
            case 's': case 'S':
                // Zoom Out
                if (hoveredView === '3D') {
                    if (orbitControls3D.zoom) orbitControls3D.zoom(-0.5);
                } else if (hoveredView === '2D') {
                    camera2D.zoom /= 1.05;
                    camera2D.updateProjectionMatrix();
                }
                break;
            case 'a': case 'A':
                // Pan Left
                if (hoveredView === '3D') {
                    if (orbitControls3D.pan) orbitControls3D.pan(-0.5, 0);
                } else if (hoveredView === '2D') {
                    camera2D.position.x -= 0.5;
                    if (orbitControls2D.target) orbitControls2D.target.x -= 0.5;
                    camera2D.updateProjectionMatrix();
                }
                break;
            case 'd': case 'D':
                // Pan Right
                if (hoveredView === '3D') {
                    if (orbitControls3D.pan) orbitControls3D.pan(0.5, 0);
                } else if (hoveredView === '2D') {
                    camera2D.position.x += 0.5;
                    if (orbitControls2D.target) orbitControls2D.target.x += 0.5;
                    camera2D.updateProjectionMatrix();
                }
                break;
            case 't': case 'T':
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
                        if (collisionManager) collisionManager.unregister(t);
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
                if (collisionManager) collisionManager.unregister(t);
            });
        }
    });

    // ==========================================
    // 11. ĐĂNG KÝ OBJECT MỚI (từ drag-drop hoặc sample)
    // ==========================================
    function registerInteractableObject(mesh, collidable = true) {
        if (!mesh.userData) mesh.userData = {};
        mesh.userData.isCollidable = collidable;

        interactableObjects.push(mesh);
        if (collisionManager && collidable) collisionManager.register(mesh);
        selectObject(mesh, false);
        setTool('translate');
    }

    return {
        registerInteractableObject,
        interactableObjects,
        getSelectedObjects: () => selectedObjects,
        gizmoScene3D,
        gizmoScene2D
    };
}
