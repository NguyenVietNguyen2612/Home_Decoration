import { setupDualScene } from './modules/sceneSetup.js';
import { setupLighting, updateTimeOfDay, toggleLightIsolation, updateDynamicWindowLighting, isLightIsolated } from './modules/lighting.js';
import { createRoomGeometry } from './modules/roomGeometry.js';
import { setupInteractionManager } from './modules/interactionManager.js';
import { setupDragDrop } from './modules/dragDrop.js';
import { setupUIManager } from './modules/uiManager.js';
import { createModel } from './modules/modelLoader.js';
import { buildFurnitureMenu } from './modules/menuBuilder.js';
import { CollisionManager } from './modules/collisionManager.js';
import { setupDoorInteractions } from './modules/doorManager.js';
import { generateThumbnails } from './modules/thumbnailGenerator.js';

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyBackground } from './modules/dragDrop.js';
import { CustomModal } from './modal.js';

// --- KHỞI TẠO UI ---
setupUIManager();

// --- KHỞI TẠO DUAL SCENE ---
let { scene, groundPlane, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D } = setupDualScene();

// --- XỬ LÝ SỰ KIỆN TÙY CHỈNH NỀN (MẶT PHẲNG) ---
const inputGridSize = document.getElementById('grid-size');
const inputGridColor = document.getElementById('grid-color');

function updateGrid() {
    const size = parseInt(inputGridSize.value) || 100;
    const color = inputGridColor.value;

    // Cập nhật kích thước
    groundPlane.geometry.dispose(); // Xóa hình học cũ
    groundPlane.geometry = new THREE.PlaneGeometry(size, size);

    // Cập nhật độ lặp lại của texture (tránh kéo căng)
    if (groundPlane.material.map) {
        groundPlane.material.map.repeat.set(size / 10, size / 10);
        groundPlane.material.map.needsUpdate = true;
    }

    // Cập nhật màu sắc
    groundPlane.material.color.set(color);
}

if (inputGridSize && inputGridColor) {
    inputGridSize.addEventListener('change', updateGrid);
    inputGridColor.addEventListener('input', updateGrid);
}

// --- ÁNH SÁNG & BÓNG ĐỔ ---
setupLighting(scene);
const timeSlider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');
if (timeSlider && timeDisplay) {
    timeSlider.value = 12;
    updateTimeOfDay(scene, 12);
    timeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        updateTimeOfDay(scene, val);
        // Tính toán hiển thị (VD: 12.5 -> 12:30)
        const hours = Math.floor(val);
        const minutes = Math.floor((val - hours) * 60);
        timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    });
}
const btnIsolateLight = document.getElementById('btn-isolate-light');
if (btnIsolateLight) {
    btnIsolateLight.addEventListener('click', () => {
        const isolated = toggleLightIsolation(scene);
        btnIsolateLight.style.background = isolated ? '#6366f1' : '';
        btnIsolateLight.style.color = isolated ? '#fff' : '';
        btnIsolateLight.style.borderColor = isolated ? '#6366f1' : '';
        btnIsolateLight.title = isolated ? 'Disable Light Isolation' : 'Isolate Light';
    });
}

const btnToggleCollision = document.getElementById('btn-toggle-collision');
if (btnToggleCollision) {
    btnToggleCollision.addEventListener('click', () => {
        const active = btnToggleCollision.classList.toggle('active');
        btnToggleCollision.title = active ? 'Kiểm soát va chạm: Đang bật' : 'Kiểm soát va chạm: Đang tắt (Cho phép chồng/xuyên nhau)';
    });
}

// --- VẼ PHÒNG ---
const { roomGroup, walls } = createRoomGeometry('room_basic');
scene.userData.roomType = 'room_basic'; // Ghi nhớ loại phòng hiện tại
scene.add(roomGroup);

// --- COLLISION MANAGER (bounding box + kiểm tra va chạm) ---
const collisionManager = new CollisionManager(scene);

// Đăng ký các bức tường vào CollisionManager để cản các vật thể khác
walls.forEach(wall => collisionManager.register(wall));

// --- KIỂM SOÁT TƯƠNG TÁC ---
const interactionManager = setupInteractionManager(
    scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D,
    collisionManager   // truyền vào để kích hoạt bounding box + collision detection
);

// --- ĐĂNG KÝ PHÒNG LÀ OBJECT TƯƠNG TÁC ---
// Phòng có thể chọn/di chuyển nhưng không tham gia collision detection
// (bbox phòng bao trùm toàn bộ nội thất → luôn "va chạm" với mọi vật thể)
interactionManager.registerInteractableObject(roomGroup, false, false);

// --- CƠ CHẾ KÉO THẢ TỪ SIDEBAR ---
await buildFurnitureMenu();
setupDragDrop(scene, camera2D, renderer2D, camera3D, renderer3D, interactionManager, registerPhysicsObject, groundPlane, collisionManager);

// --- NÚT TẠO LẠI PHÒNG (NẾU LỠ XÓA) ---
const btnNewRoom = document.getElementById('btn-new-room');
if (btnNewRoom) {
    btnNewRoom.addEventListener('click', () => {
        let existingRoom = scene.getObjectByName('room');
        if (existingRoom) {
            CustomModal.alert('Căn phòng vẫn đang tồn tại. Bạn chỉ cần tạo mới khi lỡ tay xóa mất phòng thôi nhé!');
            return;
        }

        const { roomGroup, walls } = createRoomGeometry('room_basic');
        scene.add(roomGroup);
        walls.forEach(wall => collisionManager.register(wall));
        interactionManager.registerInteractableObject(roomGroup, false, false);
    });
}

// ===========================================================================
// HỆ THỐNG LƯU / TẢI DỰ ÁN (JSON)
// ===========================================================================

// --- HÀM LƯU DỰ ÁN ---
async function saveProject(designName) {
    // 1. Thu thập metadata phòng
    const projectData = {
        version: 2,
        name: designName,
        date: new Date().toLocaleString('vi-VN'),
        room: {
            type: scene.userData.roomType || 'room_basic',
            // Lưu transform của room group để giữ scale/vị trí được chỉnh bằng gizmo
            transform: (function() {
                const roomObj = scene.getObjectByName('room');
                if (!roomObj) return null;
                return {
                    position: { x: roomObj.position.x, y: roomObj.position.y, z: roomObj.position.z },
                    rotation: { x: roomObj.rotation.x, y: roomObj.rotation.y, z: roomObj.rotation.z, order: roomObj.rotation.order },
                    scale:    { x: roomObj.scale.x,    y: roomObj.scale.y,    z: roomObj.scale.z }
                };
            })()
        },
        lighting: {
            timeOfDay: parseFloat(document.getElementById('time-slider')?.value ?? 12),
            isIsolated: isLightIsolated,
            backgroundType: scene.userData.backgroundType || 'bg_solid'
        },
        surfaces: {},
        objects: []
    };

    // 2. Lưu texture sàn
    const roomFloor = scene.getObjectByName('roomFloor');
    if (roomFloor?.material?.map?.image?.src) {
        const src = roomFloor.material.map.image.src;
        const match = src.match(/grounds\/([^?#]+\.png)/);
        if (match) projectData.surfaces.floor = { textureFile: match[1] };
    }
    if (roomFloor?.material?.color) {
        projectData.surfaces.floorColor = '#' + roomFloor.material.color.getHexString();
        projectData.surfaces.floorRoughness = roomFloor.material.roughness ?? 0.8;
    }

    // 3. Lưu texture tường (per-wall)
    const wallTextures = [];
    scene.traverse(node => {
        if (node.userData?.isWall && node.material) {
            const entry = { uuid: node.uuid };
            if (node.material.map?.image?.src) {
                const src = node.material.map.image.src;
                const match = src.match(/rooms\/([^?#]+\.png)/);
                if (match) entry.textureFile = match[1];
            }
            entry.color = '#' + node.material.color.getHexString();
            entry.roughness = node.material.roughness ?? 0.8;
            wallTextures.push(entry);
        }
    });
    projectData.surfaces.walls = wallTextures;

    // 4. Lưu từng đồ vật nội thất
    interactionManager.interactableObjects.forEach(obj => {
        if (obj.name === 'room') return; // bỏ qua phòng
        if (!obj.userData?.type) return;  // bỏ qua nếu không có type (không phải furniture)

        projectData.objects.push({
            type: obj.userData.type,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z, order: obj.rotation.order },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            userData: {
                baseY: obj.userData.baseY,
                isDoor: obj.userData.isDoor || false,
                isOpen: obj.userData.isOpen || false,
                isLightFixture: obj.userData.isLightFixture || false
            }
        });
    });

    return projectData;
}

// --- HÀM TẢI DỰ ÁN TỪ JSON ---
async function loadProject(projectData) {
    // BUỚC 1: Xóa toàn bộ state hiện tại
    const targets = [...interactionManager.interactableObjects];
    targets.forEach(t => {
        if (t.parent) t.parent.remove(t);
        const i = interactionManager.interactableObjects.indexOf(t);
        if (i > -1) interactionManager.interactableObjects.splice(i, 1);
        if (collisionManager) collisionManager.unregister(t);
    });
    const oldRoom = scene.getObjectByName('room');
    if (oldRoom) scene.remove(oldRoom);

    // BUỚC 2: Tái tạo phòng
    const roomType = projectData.room?.type || 'room_basic';
    scene.userData.roomType = roomType;
    const { roomGroup: newRoom, walls: newWalls } = createRoomGeometry(roomType);
    scene.add(newRoom);
    newWalls.forEach(wall => collisionManager.register(wall));
    interactionManager.registerInteractableObject(newRoom, false, false);

    // Khôi phục transform của room (scale, vị trí) nếu đã được chỉnh
    const rt = projectData.room?.transform;
    if (rt) {
        newRoom.position.set(rt.position.x, rt.position.y, rt.position.z);
        newRoom.rotation.set(rt.rotation.x, rt.rotation.y, rt.rotation.z, rt.rotation.order || 'YXZ');
        newRoom.scale.set(rt.scale.x, rt.scale.y, rt.scale.z);
        newRoom.updateMatrixWorld(true);
    }

    // BUỚC 3: Khôi phục lighting
    const lighting = projectData.lighting || {};
    const timeVal = lighting.timeOfDay ?? 12;
    const timeSliderEl = document.getElementById('time-slider');
    const timeDisplayEl = document.getElementById('time-display');
    if (timeSliderEl) timeSliderEl.value = timeVal;
    if (timeDisplayEl) {
        const h = Math.floor(timeVal);
        const m = Math.floor((timeVal - h) * 60);
        timeDisplayEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
    updateTimeOfDay(scene, timeVal);

    if (lighting.backgroundType && lighting.backgroundType !== 'dynamic_sky') {
        applyBackground(scene, lighting.backgroundType);
    }

    // Khôi phục light isolation
    const btnIsolateLightEl = document.getElementById('btn-isolate-light');
    if (lighting.isIsolated) {
        toggleLightIsolation(scene);
        if (btnIsolateLightEl) {
            btnIsolateLightEl.style.background = '#6366f1';
            btnIsolateLightEl.style.color = '#fff';
            btnIsolateLightEl.style.borderColor = '#6366f1';
        }
    } else {
        if (btnIsolateLightEl) {
            btnIsolateLightEl.style.background = '';
            btnIsolateLightEl.style.color = '';
            btnIsolateLightEl.style.borderColor = '';
        }
    }

    // BUỚC 4: Khôi phục texture sàn
    const surfaces = projectData.surfaces || {};
    if (surfaces.floor?.textureFile) {
        const textureLoader = new THREE.TextureLoader();
        const tex = textureLoader.load(`grounds/${surfaces.floor.textureFile}`);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        tex.colorSpace = THREE.SRGBColorSpace;
        const roomFloor = scene.getObjectByName('roomFloor');
        if (roomFloor) {
            const mat = roomFloor.material.clone();
            mat.map = tex;
            mat.color.set(surfaces.floorColor || '#ffffff');
            mat.roughness = surfaces.floorRoughness ?? 0.8;
            mat.needsUpdate = true;
            roomFloor.material = mat;
        }
    } else if (surfaces.floorColor) {
        const roomFloor = scene.getObjectByName('roomFloor');
        if (roomFloor) {
            roomFloor.material.color.set(surfaces.floorColor);
            roomFloor.material.roughness = surfaces.floorRoughness ?? 0.8;
        }
    }

    // BUỚC 5: Khôi phục texture tường
    // Map UUID tường gốc → tường mới (tường có cùng thứ tự thêm vào)
    if (surfaces.walls?.length) {
        const wallNodes = [];
        newRoom.traverse(node => { if (node.userData?.isWall) wallNodes.push(node); });
        surfaces.walls.forEach((wallData, idx) => {
            const wallNode = wallNodes[idx];
            if (!wallNode) return;
            const textureLoader = new THREE.TextureLoader();
            const mat = wallNode.material.clone();
            if (wallData.textureFile) {
                const tex = textureLoader.load(`rooms/${wallData.textureFile}`);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(4, 2);
                tex.colorSpace = THREE.SRGBColorSpace;
                mat.map = tex;
                mat.color.set(0xffffff);
            } else if (wallData.color) {
                mat.color.set(wallData.color);
            }
            mat.roughness = wallData.roughness ?? 0.8;
            mat.needsUpdate = true;
            wallNode.material = mat;
        });
    }

    // BUỚC 6: Tải lại từng đồ vật nội thất (async, tuần tự để giữ đúng thứ tự)
    const objects = projectData.objects || [];
    for (const objData of objects) {
        try {
            const newObj = await createModel(objData.type);
            newObj.position.set(objData.position.x, objData.position.y, objData.position.z);
            newObj.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z, objData.rotation.order || 'YXZ');
            newObj.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);

            // Khôi phục userData đặc biệt
            newObj.userData.type = objData.type;
            if (objData.userData) {
                if (objData.userData.baseY !== undefined) newObj.userData.baseY = objData.userData.baseY;
                if (objData.userData.isDoor) newObj.userData.isDoor = true;
                if (objData.userData.isOpen !== undefined) newObj.userData.isOpen = objData.userData.isOpen;
                if (objData.userData.isLightFixture) newObj.userData.isLightFixture = true;
            }

            scene.add(newObj);
            interactionManager.registerInteractableObject(newObj, newObj.userData.isCollidable !== false, false);
        } catch (err) {
            console.warn(`Không thể tải object: ${objData.type}`, err);
        }
    }

    // Cập nhật lại tường đục lỗ (cửa/cửa sổ)
    const { updateWallHoles } = await import('./modules/doorManager.js');
    updateWallHoles(scene);

    scene.updateMatrixWorld(true);
}

// ===========================================================================
// NÚT LƯU DỰ ÁN (Chọn định dạng)
// ===========================================================================
const btnSave = document.getElementById('btn-save');
const saveDropdown = document.getElementById('save-dropdown');

// Hiện/ẩn dropdown khi bấm Save
if (btnSave) {
    btnSave.addEventListener('click', (e) => {
        e.stopPropagation();
        if (saveDropdown) {
            saveDropdown.classList.toggle('hidden');
        }
    });
}

// Ẩn dropdown khi click ra ngoài
document.addEventListener('click', () => {
    if (saveDropdown) saveDropdown.classList.add('hidden');
});

// --- LƯU JSON (Toàn bộ dự án, khiến phục hồi hoàn toàn) ---
const btnSaveJson = document.getElementById('btn-save-json');
if (btnSaveJson) {
    btnSaveJson.addEventListener('click', async () => {
        if (saveDropdown) saveDropdown.classList.add('hidden');
        const designName = await CustomModal.prompt('Enter file name (saves as .json - full room and lighting):', 'My_Dream_Room');
        if (!designName) return;

        const projectData = await saveProject(designName);
        const json = JSON.stringify(projectData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = designName + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Lưu vào Recent Projects & IndexedDB
        const projectId = 'proj_' + Date.now();
        let recentProjects = JSON.parse(localStorage.getItem('recentProjects') || '[]');
        recentProjects.unshift({ id: projectId, name: designName, date: new Date().toLocaleString('vi-VN') });
        if (recentProjects.length > 5) recentProjects.pop();
        localStorage.setItem('recentProjects', JSON.stringify(recentProjects));
        const req = indexedDB.open('RoomDecoDB', 1);
        req.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains('files')) e.target.result.createObjectStore('files'); };
        req.onsuccess = e => { const tx = e.target.result.transaction('files', 'readwrite'); const s = tx.objectStore('files'); s.put(blob, projectId); s.put('json', projectId + '_type'); s.put(blob, 'projectGLB'); s.put('json', 'projectFileType'); };
    });
}

// --- LƯU GLB (Chỉ lưu geometry/model, tương thích phần mềm ngoài) ---
const btnSaveGlb = document.getElementById('btn-save-glb');
if (btnSaveGlb) {
    btnSaveGlb.addEventListener('click', async () => {
        if (saveDropdown) saveDropdown.classList.add('hidden');
        const designName = await CustomModal.prompt('Enter file name (saves as .glb - geometry only):', 'My_Dream_Room');
        if (!designName) return;

        const exporter = new GLTFExporter();
        const exportGroup = new THREE.Group();
        exportGroup.name = 'export_scene';
        exportGroup.userData.backgroundType = scene.userData.backgroundType || 'bg_solid';
        exportGroup.userData.roomType = scene.userData.roomType || 'room_basic';

        interactionManager.interactableObjects.forEach(obj => {
            if (obj.name === 'room') return;
            const clone = obj.clone(true);
            clone.userData = JSON.parse(JSON.stringify(obj.userData));
            exportGroup.add(clone);
        });

        exporter.parse(
            exportGroup,
            function (gltf) {
                const blob = new Blob([gltf], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.style.display = 'none';
                link.href = url;
                link.download = designName + '.glb';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                const projectId = 'proj_' + Date.now();
                let recentProjects = JSON.parse(localStorage.getItem('recentProjects') || '[]');
                recentProjects.unshift({ id: projectId, name: designName, date: new Date().toLocaleString('vi-VN') });
                if (recentProjects.length > 5) recentProjects.pop();
                localStorage.setItem('recentProjects', JSON.stringify(recentProjects));
                const req = indexedDB.open('RoomDecoDB', 1);
                req.onupgradeneeded = e => { if (!e.target.result.objectStoreNames.contains('files')) e.target.result.createObjectStore('files'); };
                req.onsuccess = e => { const tx = e.target.result.transaction('files', 'readwrite'); const s = tx.objectStore('files'); s.put(blob, projectId); s.put('glb', projectId + '_type'); s.put(blob, 'projectGLB'); s.put('glb', 'projectFileType'); };
            },
            function (error) {
                console.error('Lỗi khi xuất GLTF:', error);
                CustomModal.alert('An error occurred while saving the file!');
            },
            { binary: true }
        );
    });
}

// --- XỬ LÝ TẢI FILE (.GLB) ---
function processGLBFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const contents = e.target.result;
        const loader = new GLTFLoader();
        loader.parse(contents, '', function (gltf) {
            const loadedGroup = gltf.scene.children[0] || gltf.scene;

            // --- BƯỚC 1: Xóa toàn bộ state hiện tại ---
            const targets = [...interactionManager.interactableObjects];
            targets.forEach(t => {
                if (t.parent) t.parent.remove(t);
                const i = interactionManager.interactableObjects.indexOf(t);
                if (i > -1) interactionManager.interactableObjects.splice(i, 1);
                if (collisionManager) collisionManager.unregister(t);
            });

            // Xóa phòng cũ khỏi scene (nếu còn tồn tại)
            const oldRoom = scene.getObjectByName('room');
            if (oldRoom) scene.remove(oldRoom);

            // --- BƯỚC 2: Tái tạo phòng từ code (đảm bảo lightBlocker đúng material) ---
            const roomType = (loadedGroup.userData && loadedGroup.userData.roomType) || 'room_basic';
            const { roomGroup: newRoomGroup, walls: newWalls } = createRoomGeometry(roomType);
            scene.add(newRoomGroup);
            newWalls.forEach(wall => collisionManager.register(wall));
            interactionManager.registerInteractableObject(newRoomGroup, false, false);

            // --- BƯỚC 3: Phục hồi background nếu có ---
            if (loadedGroup.userData && loadedGroup.userData.backgroundType) {
                applyBackground(scene, loadedGroup.userData.backgroundType);
            }

            // --- BƯỚC 4: Restore đồ vật (không có phòng) ---
            const children = [...loadedGroup.children];
            children.forEach(child => {
                // Bỏ qua nếu có node phòng trong file GLB cũ (backward compatibility)
                if (child.name === 'room') return;

                scene.add(child);

                // Khôi phục lại kiểu dữ liệu THREE.Vector3 cho velocity (bị mất khi JSON serialize)
                function restoreVelocity(node) {
                    if (node.userData && node.userData.velocity) {
                        node.userData.velocity = new THREE.Vector3(
                            node.userData.velocity.x || 0,
                            node.userData.velocity.y || 0,
                            node.userData.velocity.z || 0
                        );
                    }
                    node.children.forEach(restoreVelocity);
                }
                restoreVelocity(child);

                // Đăng ký tương tác nhưng không tự động focus
                // KHÔNG gọi registerPhysicsObject: vật đã ở đúng vị trí từ file
                // Nếu gọi lại, engine vật lý sẽ khiến chúng rơi xuống vị trí baseY làm lech vị trí
                interactionManager.registerInteractableObject(child, child.userData.isCollidable !== false, false);
            });

            // Cập nhật ma trận toàn cục để Engine Vật lý không tính sai Bounding Box ở frame đầu tiên
            scene.updateMatrixWorld(true);
        }, function (error) {
            console.error('Lỗi khi parse file .glb:', error);
            CustomModal.alert('File không hợp lệ hoặc bị lỗi!');
        });
    };
    reader.readAsArrayBuffer(file);
}

const fileLoaderInput = document.getElementById('file-loader');
if (fileLoaderInput) {
    fileLoaderInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        fileLoaderInput.value = ''; // Reset ngay

        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'json') {
            // — TẢI FILE JSON (dự án đầy đủ) —
            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const projectData = JSON.parse(e.target.result);
                    await loadProject(projectData);
                } catch (err) {
                    console.error('Lỗi khi đọc file JSON:', err);
                    CustomModal.alert('File JSON không hợp lệ hoặc bị lỗi!');
                }
            };
            reader.readAsText(file);
        } else {
            // — TẢI FILE GLB (cũ / chỉ geometry) —
            processGLBFile(file);
        }
    });
}

// Kiểm tra xem có cần tự động tải file từ IndexedDB không (từ trang upload chuyển sang)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('action') === 'loadFromDB') {
    const request = indexedDB.open('RoomDecoDB', 1);
    request.onsuccess = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) return;
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');

        // Đọc cả file lẫn loại file (json/glb) được lưu bởi upload.html
        const getFile = store.get('projectGLB');
        const getType = store.get('projectFileType');

        getFile.onsuccess = function () {
            getType.onsuccess = async function () {
                const file = getFile.result;
                const fileType = getType.result || 'glb'; // mặc định glb cho file cũ

                if (!file) return;

                window.history.replaceState({}, document.title, window.location.pathname);

                if (fileType === 'json') {
                    // Tải dự án JSON đầy đủ
                    try {
                        const text = await file.text();
                        const projectData = JSON.parse(text);
                        await loadProject(projectData);
                    } catch (err) {
                        console.error('Lỗi khi đọc project JSON từ DB:', err);
                        CustomModal.alert('Không thể đọc file dự án. File có thể bị lỗi.');
                    }
                } else {
                    // Tải file GLB (cũ hoặc geometry-only)
                    processGLBFile(file);
                }
            };
        };
    };
    request.onerror = function () {
        console.error('Không thể truy cập IndexedDB');

    };
}
// --- TƯƠNG TÁC ĐẶC BIỆT CỦA CỬA ---
setupDoorInteractions(renderer3D, camera3D, scene);

// --- TẠO ẢNH PREVIEW TỰ ĐỘNG CHO SIDEBAR ---
generateThumbnails(renderer3D);

// --- CHẾ ĐỘ XEM TRƯỚC (PREVIEW MODE FULLSCREEN) ---
const cinematicOverlay = document.getElementById('cinematic-overlay');
const btnClosePreview = document.getElementById('btn-close-preview');
const cinematicContainer = document.getElementById('cinematic-container');
window.isPreviewing = false;

// Bỏ cinematicRenderer riêng biệt để tránh tạo context WebGL thứ hai gây lag.
// Ta sẽ tái sử dụng renderer3D đã có, chuyển nó sang chế độ toàn màn hình khi xem.
const cinematicCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);

// ===========================================================================
// PREVIEW CAMERA — 3 PHA: Bay vào → Xoay trong phòng → Bay ra → Tự dừng
// ===========================================================================

// Phạm vi phòng basic 10x10, giới hạn thoát = kẻ lại khi ra ngoài bound
const ROOM_HALF = 6;   // Nửa cạnh phòng (có buffer nhỏ)
const EYE_HEIGHT = 1.7; // Chiều cao mắt người đứng

// === ĐI VÀO: Góc chéo ngoài phòng (cao) → tâm phòng (thấp) ===
// Xuất phát từ góc chéo, trên cao — lùi xa để thấy toàn bộ phòng
const POS_OUTSIDE = new THREE.Vector3(20, 15, 20);   // Ngoài góc phòng, xa và cao
const POS_MID_IN  = new THREE.Vector3(6,  4,  6);    // Qua ngưỡng cửa, hạ dần
const POS_ENTRY   = new THREE.Vector3(2,  EYE_HEIGHT, 2); // Vừa vào trong, tầm mắt
// Tâm phòng — đứng ở đây xoay 360°
const POS_CENTER  = new THREE.Vector3(0, EYE_HEIGHT, 0);

// Đường cong bay vào (CatmullRom) — arc từ ngoài xuống trong
const enterCurve = new THREE.CatmullRomCurve3([
    POS_OUTSIDE, POS_MID_IN, POS_ENTRY, POS_CENTER
]);

// Tốc độ (pha tham khảo theo giây)
const SPEED_ENTER  = 5.0;  // giây bay vào (arc chéo từ cao xuống)
const SPEED_ROTATE = 8.0;  // giây xoay 360° trong phòng
const SPEED_EXIT   = 5.0;  // giây bay ra (cùng đường, ngược lại)

let previewPhase = 'idle';  // 'enter' | 'rotate' | 'exit' | 'idle'
let previewT     = 0;       // thước đo tiến trình trong pha hiện tại [0..1]
let previewLastTime = 0;

function startPreview() {
    window.isPreviewing = true;
    previewPhase = 'enter';
    previewT     = 0;
    previewLastTime = performance.now();

    // Di chuyển renderer3D sang fullscreen container
    if (cinematicContainer) {
        cinematicContainer.appendChild(renderer3D.domElement);
        renderer3D.shadowMap.type = THREE.PCFSoftShadowMap; // Bóng mềm mịn hơn cho preview
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    cinematicCamera.aspect = w / h;
    cinematicCamera.updateProjectionMatrix();
    renderer3D.setSize(w, h);

    // Đặt camera ngoài góc phòng, trên cao, nhìn vào tâm
    cinematicCamera.position.copy(POS_OUTSIDE);
    cinematicCamera.lookAt(POS_CENTER);
}

function stopPreview() {
    window.isPreviewing = false;
    previewPhase = 'idle';
    cinematicOverlay.classList.add('hidden');
    cinematicOverlay.style.display = 'none';

    // Trả renderer3D về lại container của editor
    const container3D = document.getElementById('view-3d');
    if (container3D) {
        container3D.appendChild(renderer3D.domElement);
        const w = container3D.clientWidth;
        const h = container3D.clientHeight;
        if (w > 0 && h > 0) {
            camera3D.aspect = w / h;
            camera3D.updateProjectionMatrix();
            renderer3D.setSize(w, h);
        }
    }
}

function updatePreviewCamera() {
    if (!window.isPreviewing) return;

    const now = performance.now();
    const dt  = Math.min((now - previewLastTime) / 1000, 0.05); // giây, tối đa 50ms
    previewLastTime = now;

    if (previewPhase === 'enter') {
        // Bay theo arc chéo từ cao xuống (CatmullRom curve)
        previewT += dt / SPEED_ENTER;
        const t = Math.min(previewT, 1);
        const et = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // easeInOut

        const camPos = enterCurve.getPointAt(et);
        cinematicCamera.position.copy(camPos);
        cinematicCamera.lookAt(POS_CENTER);

        if (previewT >= 1) { previewPhase = 'rotate'; previewT = 0; }

    } else if (previewPhase === 'rotate') {
        // Đứng tại POS_CENTER, xoay 360° theo trục Y (radius nhỏ — xoay tại chỗ)
        previewT += dt / SPEED_ROTATE;
        const angle = previewT * Math.PI * 2; // 0 → 2PI
        const radius = 1.0; // xoay tại chỗ nhỏ

        cinematicCamera.position.set(
            POS_CENTER.x + Math.sin(angle) * radius,
            EYE_HEIGHT,
            POS_CENTER.z + Math.cos(angle) * radius
        );
        // Nhìn vào điểm đối diện (tạo cảm giác nhìn phòng)
        cinematicCamera.lookAt(
            POS_CENTER.x - Math.sin(angle) * 3,
            EYE_HEIGHT + 0.3,
            POS_CENTER.z - Math.cos(angle) * 3
        );

        if (previewT >= 1) { previewPhase = 'exit'; previewT = 0; }

    } else if (previewPhase === 'exit') {
        // Đi lùi theo cùng đường chéo vào — từ tâm phòng ngược lên góc cao ban đầu
        previewT += dt / SPEED_EXIT;
        const t = Math.min(previewT, 1);
        const et = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // easeInOut

        // Đọc ngược đường cong vào (1 - et) → đi lùi đúng lộ trình
        const camPos = enterCurve.getPointAt(1 - et);
        cinematicCamera.position.copy(camPos);

        // Luôn nhìn về tâm phòng — như đang đi lùi mà mắt vẫn nhìn vào căn phòng
        cinematicCamera.lookAt(POS_CENTER);

        // Khi kết thúc pha đi lùi, chuyển sang trạng thái chờ (hold)
        // Không gọi stopPreview() để người dùng tự ngắm nhìn toàn cảnh
        if (previewT >= 1) {
            previewPhase = 'hold';
        }
    } else if (previewPhase === 'hold') {
        // Giữ nguyên vị trí ở góc nhìn xa toàn cảnh, không làm gì thêm
    }

    renderer3D.render(scene, cinematicCamera);
}

window.addEventListener('resize', () => {
    if (window.isPreviewing && cinematicContainer) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        cinematicCamera.aspect = w / h;
        cinematicCamera.updateProjectionMatrix();
        renderer3D.setSize(w, h);
    }
});

const btnPreview = document.getElementById('btn-preview');
if (btnPreview) {
    btnPreview.addEventListener('click', () => {
        cinematicOverlay.classList.remove('hidden');
        cinematicOverlay.style.display = 'block';
        startPreview();
    });
}

if (btnClosePreview) {
    btnClosePreview.addEventListener('click', () => {
        stopPreview();
    });
}

// --- VẬT LÝ NHẸ (Trọng lực) ---
const physicsObjects = [];
const gravity = -0.02;

function registerPhysicsObject(mesh) {
    physicsObjects.push(mesh);
}

function updatePhysics() {
    const isDragging = interactionManager.isGizmoDragging();

    for (let i = physicsObjects.length - 1; i >= 0; i--) {
        const mesh = physicsObjects[i];
        if (!mesh.userData || mesh.userData.baseY === undefined) continue;

        // Nếu đang kéo gizmo → tạm dừng trọng lực, reset velocity để khi thả không bị "nảy"
        if (isDragging) {
            mesh.userData.velocity.y = 0;
            continue;
        }

        if (mesh.position.y > mesh.userData.baseY) {
            mesh.userData.velocity.y += gravity;

            const nextY = mesh.position.y + mesh.userData.velocity.y;

            // --- Va chạm dọc: tìm object cao nhất bên dưới ---
            // Lấy AABB của object đang rơi tại vị trí TIẾP THEO
            const meshBox = new THREE.Box3().setFromObject(mesh);
            const meshHeight = meshBox.max.y - meshBox.min.y;

            // Giả lập vị trí tiếp theo để tính box
            const futureMinY = nextY - meshHeight / 2;

            let landingY = mesh.userData.baseY; // Mặc định là mặt sàn

            for (const otherMesh of interactionManager.interactableObjects) {
                if (otherMesh === mesh) continue;
                // Bỏ qua chính các physicsObjects khác không liên quan
                // và bỏ qua phòng (room) vì phòng quá lớn
                if (otherMesh.name === 'room') continue;

                const otherBox = new THREE.Box3().setFromObject(otherMesh);

                // Kiểm tra XZ overlap (2 bounding box có chồng lên nhau theo mặt phẳng ngang không?)
                const meshBoxXZ = meshBox.clone();
                meshBoxXZ.min.y = -Infinity;
                meshBoxXZ.max.y = Infinity;
                const otherBoxXZ = otherBox.clone();
                otherBoxXZ.min.y = -Infinity;
                otherBoxXZ.max.y = Infinity;

                if (!meshBoxXZ.intersectsBox(otherBoxXZ)) continue; // Không chồng XZ → bỏ qua

                // Nếu chồng XZ, kiểm tra xem đỉnh của otherMesh có nằm TRONG đường rơi không
                const topOfOther = otherBox.max.y;

                // object đang rơi xuống, topOfOther phải cao hơn sàn và thấp hơn vị trí hiện tại
                if (topOfOther > mesh.userData.baseY && topOfOther < mesh.position.y) {
                    // Điểm đứng mới = đỉnh object kia + nửa chiều cao object đang rơi
                    const candidateY = topOfOther + meshHeight / 2;
                    if (candidateY > landingY) {
                        landingY = candidateY;
                    }
                }
            }

            // Thực sự áp dụng di chuyển
            mesh.position.y += mesh.userData.velocity.y;

            // Đồng bộ Properties Panel nếu vật thể đang rơi mà lại đang được select
            if (interactionManager && interactionManager.getSelectedObjects().includes(mesh)) {
                if (typeof interactionManager.updatePropertiesPanel === 'function') {
                    interactionManager.updatePropertiesPanel();
                }
            }

            // Đảm bảo landingY không bao giờ thấp hơn mặt sàn gốc
            landingY = Math.max(landingY, mesh.userData.baseY);

            if (mesh.position.y <= landingY) {
                mesh.position.y = landingY;
                mesh.userData.velocity.y = 0;

                physicsObjects.splice(i, 1); // Xóa khỏi danh sách vật lý khi đã nằm yên
                if (collisionManager) collisionManager.update();
                if (mesh.userData.isDoor) updateWallHoles(scene);
            }

            // Failsafe: nếu vì lý do nào đó object đã lọt xuống dưới sàn → kéo lên ngay
            if (mesh.position.y < mesh.userData.baseY) {
                mesh.position.y = mesh.userData.baseY;
                mesh.userData.velocity.y = 0;
            }
        } else {
            // Object không lơ lửng -> loại khỏi mảng vật lý
            physicsObjects.splice(i, 1);
            if (collisionManager) collisionManager.update();
            if (mesh.userData.isDoor) updateWallHoles(scene);
        }
    }
}



const { gizmoScene3D, gizmoScene2D } = interactionManager;

// --- VÒNG LẶP RENDER ---
function animate() {
    requestAnimationFrame(animate);

    controls2D.update();
    controls3D.update();

    if (window.isPreviewing) {
        updatePreviewCamera(); // Đã bao gồm cinematicRenderer.render()
        return; // TRÁNH LAG: Ngừng render 2D và 3D bên dưới khi đang xem toàn màn hình
    }

    updatePhysics();

    // Cập nhật tia sáng tỏa ra từ cửa sổ (nếu có)
    updateDynamicWindowLighting(scene);

    // Chỉ sync box của những helper đang visible (khi va chạm)
    collisionManager.update();

    // Tắt tự động xoá màn hình để render chồng 2 scene lên nhau
    renderer2D.autoClear = false;
    renderer2D.clear();
    renderer2D.render(scene, camera2D);
    renderer2D.clearDepth(); // Cần xoá depth buffer để trục gizmo luôn đè lên trên vật thể
    renderer2D.render(gizmoScene2D, camera2D);

    renderer3D.autoClear = false;
    renderer3D.clear();
    renderer3D.render(scene, camera3D);
    renderer3D.clearDepth();
    renderer3D.render(gizmoScene3D, camera3D);
}

animate();