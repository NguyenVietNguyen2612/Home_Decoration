import * as THREE from 'three';

export function setupPropertiesPanel(context) {
    const { selectedObjects, saveHistoryState, scene, updateWallHoles } = context;

    const panel = document.getElementById('properties-panel');
    const inputs = {
        posX: document.getElementById('prop-pos-x'),
        posY: document.getElementById('prop-pos-y'),
        posZ: document.getElementById('prop-pos-z'),
        rotX: document.getElementById('prop-rot-x'),
        rotY: document.getElementById('prop-rot-y'),
        rotZ: document.getElementById('prop-rot-z'),
        scaleX: document.getElementById('prop-scale-x'),
        scaleY: document.getElementById('prop-scale-y'),
        scaleZ: document.getElementById('prop-scale-z')
    };

    const propContent = document.getElementById('prop-content');
    const toggleBtn = document.getElementById('btn-toggle-props');
    // roomAppSection được khai báo sau; dùng lazy getter qua hàm để tránh null lúc init
    if (toggleBtn && propContent) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = propContent.style.display === 'none';
            propContent.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '▼' : '▲';

            // Ẩn/hiện Room Appearance section theo cùng trạng thái
            const roomSec = document.getElementById('room-appearance-section');
            if (roomSec && roomSec.dataset.active === 'true') {
                roomSec.style.display = isHidden ? 'block' : 'none';
            }
        });
    }

    if (!panel) return { updatePropertiesPanel: () => {} };

    // ─── Room Appearance controls ──────────────────────────────────────────
    const roomAppSection   = document.getElementById('room-appearance-section');
    const roomWallColor    = document.getElementById('room-wall-color');
    const roomWallRough    = document.getElementById('room-wall-roughness');
    const roomFloorColor   = document.getElementById('room-floor-color');
    const roomFloorRough   = document.getElementById('room-floor-roughness');
    const roomWallMetal    = document.getElementById('room-wall-metalness');
    const roomWallMetalVal = document.getElementById('room-wall-metalness-val');

    /** Lấy Color Hex từ THREE.Color → "#rrggbb" */
    function threeColorToHex(color) {
        if (!color) return '#ffffff';
        const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
        const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
        const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    /** Đọc state hiện tại của phòng và đồng bộ lên UI */
    function syncRoomAppearanceUI(roomGroup) {
        if (!roomAppSection) return;

        let wallMat = null;
        let floorMat = null;

        roomGroup.traverse(child => {
            if (!child.isMesh) return;
            if (child.name === 'roomFloor') {
                floorMat = child.material;
            } else if (child.userData.isWall && !wallMat) {
                wallMat = child.material;
            }
        });

        if (wallMat) {
            if (roomWallColor) roomWallColor.value = threeColorToHex(wallMat.color);
            if (roomWallRough) roomWallRough.value = wallMat.roughness ?? 0.8;
            if (roomWallMetal) {
                roomWallMetal.value = wallMat.metalness ?? 0;
                if (roomWallMetalVal) roomWallMetalVal.textContent = (wallMat.metalness ?? 0).toFixed(2);
            }
        }
        if (floorMat) {
            if (roomFloorColor) roomFloorColor.value = threeColorToHex(floorMat.color);
            if (roomFloorRough) roomFloorRough.value = floorMat.roughness ?? 0.8;
        }
    }

    /** Áp dụng màu tường cho toàn bộ tường trong roomGroup */
    function applyWallColor(roomGroup) {
        const hexColor = roomWallColor ? roomWallColor.value : '#efefef';
        const roughness = roomWallRough ? parseFloat(roomWallRough.value) : 0.8;
        const metalness = roomWallMetal ? parseFloat(roomWallMetal.value) : 0;

        roomGroup.traverse(child => {
            if (!child.isMesh) return;
            if (!child.userData.isWall) return;
            const mat = child.material;
            if (!mat || mat.isMeshBasicMaterial) return;
            mat.color.set(hexColor);
            mat.roughness = roughness;
            mat.metalness = metalness;
            mat.needsUpdate = true;
        });
    }

    /** Áp dụng màu sàn */
    function applyFloorColor(roomGroup) {
        const hexColor = roomFloorColor ? roomFloorColor.value : '#e0e0e0';
        const roughness = roomFloorRough ? parseFloat(roomFloorRough.value) : 0.8;

        roomGroup.traverse(child => {
            if (!child.isMesh) return;
            if (child.name !== 'roomFloor') return;
            const mat = child.material;
            if (!mat || mat.isMeshBasicMaterial) return;
            // Giữ texture (nếu có đặt wallpaper/floor texture), chỉ đổi tint màu
            mat.color.set(hexColor);
            mat.roughness = roughness;
            mat.needsUpdate = true;
        });
    }

    // ─── Attach listeners cho Room Appearance ─────────────────────────────
    function getRoomGroup() {
        return selectedObjects.find(o => o.name === 'room' || o.userData.isRoom) || null;
    }

    if (roomWallColor) {
        roomWallColor.addEventListener('input', () => {
            const rg = getRoomGroup(); if (rg) applyWallColor(rg);
        });
        roomWallColor.addEventListener('change', () => {
            if (saveHistoryState) saveHistoryState();
        });
    }
    if (roomWallRough) {
        roomWallRough.addEventListener('input', () => {
            const rg = getRoomGroup(); if (rg) applyWallColor(rg);
        });
        roomWallRough.addEventListener('change', () => {
            if (saveHistoryState) saveHistoryState();
        });
    }
    if (roomFloorColor) {
        roomFloorColor.addEventListener('input', () => {
            const rg = getRoomGroup(); if (rg) applyFloorColor(rg);
        });
        roomFloorColor.addEventListener('change', () => {
            if (saveHistoryState) saveHistoryState();
        });
    }
    if (roomFloorRough) {
        roomFloorRough.addEventListener('input', () => {
            const rg = getRoomGroup(); if (rg) applyFloorColor(rg);
        });
        roomFloorRough.addEventListener('change', () => {
            if (saveHistoryState) saveHistoryState();
        });
    }
    if (roomWallMetal) {
        roomWallMetal.addEventListener('input', () => {
            if (roomWallMetalVal) roomWallMetalVal.textContent = parseFloat(roomWallMetal.value).toFixed(2);
            const rg = getRoomGroup(); if (rg) applyWallColor(rg);
        });
        roomWallMetal.addEventListener('change', () => {
            if (saveHistoryState) saveHistoryState();
        });
    }

    // ─── Transform inputs ─────────────────────────────────────────────────
    let isUpdating = false;

    function getMixedValue(objects, extractFn) {
        if (objects.length === 0) return null;
        let firstValue = extractFn(objects[0]);
        for (let i = 1; i < objects.length; i++) {
            if (Math.abs(extractFn(objects[i]) - firstValue) > 0.01) return null;
        }
        return firstValue;
    }

    function setInputUI(input, val, isRot = false) {
        if (!input) return;
        if (val === null) {
            input.value = '';
            input.placeholder = '-';
        } else {
            const v = isRot ? THREE.MathUtils.radToDeg(val) : val;
            input.value = isRot ? v.toFixed(1) : v.toFixed(2);
            input.placeholder = '';
        }
    }

    function updatePropertiesPanel() {
        // Không cập nhật nếu người dùng đang nhập liệu (focus vào input)
        if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.id.startsWith('prop-')) {
            return;
        }

        if (selectedObjects.length >= 1) {
            panel.classList.remove('hidden');

            isUpdating = true;

            setInputUI(inputs.posX, getMixedValue(selectedObjects, o => o.position.x));
            setInputUI(inputs.posY, getMixedValue(selectedObjects, o => o.position.y));
            setInputUI(inputs.posZ, getMixedValue(selectedObjects, o => o.position.z));

            setInputUI(inputs.rotX, getMixedValue(selectedObjects, o => o.rotation.x), true);
            setInputUI(inputs.rotY, getMixedValue(selectedObjects, o => o.rotation.y), true);
            setInputUI(inputs.rotZ, getMixedValue(selectedObjects, o => o.rotation.z), true);

            setInputUI(inputs.scaleX, getMixedValue(selectedObjects, o => o.scale.x));
            setInputUI(inputs.scaleY, getMixedValue(selectedObjects, o => o.scale.y));
            setInputUI(inputs.scaleZ, getMixedValue(selectedObjects, o => o.scale.z));

            isUpdating = false;

            // ── Hiển thị / ẩn Room Appearance section ──────────────────
            const roomGroup = getRoomGroup();
            if (roomAppSection) {
                if (roomGroup) {
                    // Chỉ hiện nếu prop-content đang visible (theo trạng thái toggle)
                    const isCollapsed = propContent && propContent.style.display === 'none';
                    roomAppSection.style.display = isCollapsed ? 'none' : 'block';
                    roomAppSection.dataset.active = 'true';  // đánh dấu để toggle nhận biết
                    // Đồng bộ UI lần đầu khi mới chọn phòng (chỉ khi không đang focus vào input màu)
                    const activeEl = document.activeElement;
                    const isRoomInput = activeEl && (
                        activeEl === roomWallColor || activeEl === roomFloorColor ||
                        activeEl === roomWallRough || activeEl === roomFloorRough ||
                        activeEl === roomWallMetal
                    );
                    if (!isRoomInput) syncRoomAppearanceUI(roomGroup);
                } else {
                    roomAppSection.style.display = 'none';
                    roomAppSection.dataset.active = 'false';
                }
            }
        } else {
            panel.classList.add('hidden');
            if (roomAppSection) {
                roomAppSection.style.display = 'none';
                roomAppSection.dataset.active = 'false';
            }
        }
    }

    function applyProperties() {
        if (isUpdating || selectedObjects.length === 0) return;

        const hasPx = inputs.posX && inputs.posX.value !== '';
        const hasPy = inputs.posY && inputs.posY.value !== '';
        const hasPz = inputs.posZ && inputs.posZ.value !== '';
        const hasRx = inputs.rotX && inputs.rotX.value !== '';
        const hasRy = inputs.rotY && inputs.rotY.value !== '';
        const hasRz = inputs.rotZ && inputs.rotZ.value !== '';
        let hasSx = inputs.scaleX && inputs.scaleX.value !== '';
        let hasSy = inputs.scaleY && inputs.scaleY.value !== '';
        let hasSz = inputs.scaleZ && inputs.scaleZ.value !== '';

        const pX = hasPx ? parseFloat(inputs.posX.value) || 0 : 0;
        const pY = hasPy ? parseFloat(inputs.posY.value) || 0 : 0;
        const pZ = hasPz ? parseFloat(inputs.posZ.value) || 0 : 0;

        const rX = hasRx ? THREE.MathUtils.degToRad(parseFloat(inputs.rotX.value) || 0) : 0;
        const rY = hasRy ? THREE.MathUtils.degToRad(parseFloat(inputs.rotY.value) || 0) : 0;
        const rZ = hasRz ? THREE.MathUtils.degToRad(parseFloat(inputs.rotZ.value) || 0) : 0;

        let sX = hasSx ? parseFloat(inputs.scaleX.value) || 1 : 1;
        let sY = hasSy ? parseFloat(inputs.scaleY.value) || 1 : 1;
        let sZ = hasSz ? parseFloat(inputs.scaleZ.value) || 1 : 1;
        if (sX <= 0) sX = 0.01;
        if (sY <= 0) sY = 0.01;
        if (sZ <= 0) sZ = 0.01;

        selectedObjects.forEach(obj => {
            if (hasPx) obj.position.x = pX;
            if (hasPy) obj.position.y = pY;
            if (hasPz) obj.position.z = pZ;
            if (hasRx) obj.rotation.x = rX;
            if (hasRy) obj.rotation.y = rY;
            if (hasRz) obj.rotation.z = rZ;
            if (hasSx) obj.scale.x = sX;
            if (hasSy) obj.scale.y = sY;
            if (hasSz) obj.scale.z = sZ;
            obj.updateMatrixWorld(true);
        });

        if (updateWallHoles) updateWallHoles(scene);
        if (context.onPropertyChange) context.onPropertyChange();
    }

    // Attach transform input listeners
    Object.values(inputs).forEach(input => {
        if (!input) return;
        input.addEventListener('change', () => {
            applyProperties();
            if (saveHistoryState) saveHistoryState();
        });
        input.addEventListener('input', () => {
            applyProperties();
        });
    });

    return { updatePropertiesPanel };
}
