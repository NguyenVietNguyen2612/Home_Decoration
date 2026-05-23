import * as THREE from 'three';

export function setupViewSelection(context) {
    const {
        renderer3D, camera3D, renderer2D, camera2D,
        interactableObjects, selectedObjects,
        transformControl3D, transformControl2D,
        applySelectionHighlight, buildGroup,
        _saveState, attachGizmo, setTool, getCurrentTool, selectObject,
        CLICK_THRESHOLD = 5
    } = context;

    const raycaster = new THREE.Raycaster();
    const _mouse = new THREE.Vector2();

    function setupForView(renderer, camera) {
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
                            selectedObjects.length = 0;
                        }

                        selected.forEach(obj => {
                            if (!selectedObjects.includes(obj)) {
                                selectedObjects.push(obj);
                                applySelectionHighlight(obj, true);
                            }
                        });

                        buildGroup();
                        _saveState();
                        attachGizmo();

                        if (getCurrentTool() === 'none') setTool('translate');
                    } else if (!isMulti) {
                        // Nếu quét khoảng trống và không giữ phím Ctrl -> Bỏ chọn tất cả
                        selectObject(null, false);
                        setTool('none');
                    }
                    return; // Quét xong thì dừng, không xử lý như click đơn
                }
            }

            // Xử lý Click thông thường
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
                    if (!hit || hit === context.scene) { hit = null; break; }
                }

                if (hit) {
                    const isMulti = e.ctrlKey || e.metaKey;
                    selectObject(hit, isMulti);
                    if (selectedObjects.length > 0 && getCurrentTool() === 'none') {
                        setTool('translate');
                    }
                }
            } else {
                selectObject(null, false);
                setTool('none');
            }
        });
    }

    setupForView(renderer3D, camera3D);
    setupForView(renderer2D, camera2D);
}
