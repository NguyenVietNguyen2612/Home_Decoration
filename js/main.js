import { setupDualScene } from './modules/sceneSetup.js';
import { setupLighting, updateTimeOfDay } from './modules/lighting.js';
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

// --- VẼ PHÒNG ---
const { roomGroup, walls } = createRoomGeometry('room_basic');
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
            alert('Căn phòng vẫn đang tồn tại. Bạn chỉ cần tạo mới khi lỡ tay xóa mất phòng thôi nhé!');
            return;
        }

        const { roomGroup, walls } = createRoomGeometry('room_basic');
        scene.add(roomGroup);
        walls.forEach(wall => collisionManager.register(wall));
        interactionManager.registerInteractableObject(roomGroup, false, false);
    });
}

// --- NÚT LƯU BẢN THIẾT KẾ (.GLB) ---
const btnSave = document.getElementById('btn-save');
if (btnSave) {
    btnSave.addEventListener('click', () => {
        const designName = prompt('Nhập tên cho file thiết kế (không cần đuôi .glb):', 'My_Dream_Room');
        if (!designName) return;

        const exporter = new GLTFExporter();
        
        // Nhóm tất cả các object vào một group để xuất khẩu
        const exportGroup = new THREE.Group();
        exportGroup.name = "export_scene";
        exportGroup.userData.backgroundType = scene.userData.backgroundType || 'bg_solid';

        interactionManager.interactableObjects.forEach(obj => {
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
            },
            function (error) {
                console.error('Lỗi khi xuất GLTF:', error);
                alert('Có lỗi xảy ra khi lưu file!');
            },
            { binary: true }
        );
    });
}

// --- XỬ LÝ TẢI FILE (.GLB) ---
function processGLBFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const contents = e.target.result;
        const loader = new GLTFLoader();
        loader.parse(contents, '', function(gltf) {
            const loadedGroup = gltf.scene.children[0] || gltf.scene;

            // Xóa các object hiện tại
            const targets = [...interactionManager.interactableObjects];
            targets.forEach(t => {
                if (t.parent) t.parent.remove(t);
                const i = interactionManager.interactableObjects.indexOf(t);
                if (i > -1) interactionManager.interactableObjects.splice(i, 1);
                if (collisionManager) collisionManager.unregister(t);
            });

            // Phục hồi background nếu có
            if (loadedGroup.userData && loadedGroup.userData.backgroundType) {
                applyBackground(scene, loadedGroup.userData.backgroundType);
            }

            // Load object mới
            const children = [...loadedGroup.children];
            children.forEach(child => {
                scene.add(child);
                // Đăng ký tương tác nhưng không tự động focus
                interactionManager.registerInteractableObject(child, child.userData.isCollidable !== false, false);
                if (typeof registerPhysicsObject === 'function') registerPhysicsObject(child);
            });
        }, function (error) {
            console.error('Lỗi khi parse file .glb:', error);
            alert('File không hợp lệ hoặc bị lỗi!');
        });
    };
    reader.readAsArrayBuffer(file);
}

const fileLoaderInput = document.getElementById('file-loader');
if (fileLoaderInput) {
    fileLoaderInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        processGLBFile(file);
        fileLoaderInput.value = ''; // Reset
    });
}

// Kiểm tra xem có cần tự động tải file từ IndexedDB không (từ trang upload chuyển sang)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('action') === 'loadFromDB') {
    const request = indexedDB.open('RoomDecoDB', 1);
    request.onsuccess = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) return;
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const getReq = store.get('projectGLB');
        
        getReq.onsuccess = function() {
            if (getReq.result) {
                processGLBFile(getReq.result);
                // Dọn URL để tránh reload lại tự parse tiếp
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };
    };
    request.onerror = function() {
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
let isPreviewing = false;
let previewProgress = 0;

// Setup Renderer & Camera riêng để không ảnh hưởng editor
const cinematicRenderer = new THREE.WebGLRenderer({ antialias: true });
cinematicRenderer.shadowMap.enabled = true;
cinematicRenderer.setPixelRatio(window.devicePixelRatio);
const cinematicCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
if (cinematicContainer) {
    cinematicContainer.appendChild(cinematicRenderer.domElement);
}

// Đường dẫn camera (Nhiều vị trí)
const cameraPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 25, 15,  25), // Góc cao
    new THREE.Vector3(-20,  5,  20), // Góc thấp
    new THREE.Vector3(-25, 10, -25), // Góc vừa
    new THREE.Vector3( 20,  5, -20), // Góc thấp đối diện
    new THREE.Vector3( 28,  2,  28), // Góc siêu thấp từ sát vách tường
    new THREE.Vector3(  0, 25,   0), // Từ trên trần nhìn xuống
    new THREE.Vector3( 25, 15,  25)  // Vòng lặp
]);
cameraPath.closed = true;

// Đường dẫn mục tiêu nhìn
const lookAtPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 0,  3,  0),
    new THREE.Vector3( 5,  3, -5),
    new THREE.Vector3( 0,  1,  0),
    new THREE.Vector3(-5,  3,  5),
    new THREE.Vector3(-5,  5, -5), // Nhìn chéo xuyên phòng
    new THREE.Vector3( 0,  1,  0),
    new THREE.Vector3( 0,  3,  0)
]);
lookAtPath.closed = true;

window.addEventListener('resize', () => {
    if (isPreviewing && cinematicContainer) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        cinematicCamera.aspect = w / h;
        cinematicCamera.updateProjectionMatrix();
        cinematicRenderer.setSize(w, h);
    }
});

const btnPreview = document.getElementById('btn-preview');
if (btnPreview) {
    btnPreview.addEventListener('click', () => {
        isPreviewing = true;
        cinematicOverlay.classList.remove('hidden');
        cinematicOverlay.style.display = 'block';
        
        const w = window.innerWidth;
        const h = window.innerHeight;
        cinematicCamera.aspect = w / h;
        cinematicCamera.updateProjectionMatrix();
        cinematicRenderer.setSize(w, h);
        
        previewProgress = 0;
    });
}

if (btnClosePreview) {
    btnClosePreview.addEventListener('click', () => {
        isPreviewing = false;
        cinematicOverlay.classList.add('hidden');
        cinematicOverlay.style.display = 'none';
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

    if (isPreviewing) {
        previewProgress += 0.0015; // Tốc độ di chuyển dọc curve
        if (previewProgress > 1) previewProgress -= 1;
        
        const camPos = cameraPath.getPointAt(previewProgress);
        const lookPos = lookAtPath.getPointAt(previewProgress);
        
        cinematicCamera.position.copy(camPos);
        cinematicCamera.lookAt(lookPos);
        
        cinematicRenderer.render(scene, cinematicCamera);
    }

    updatePhysics();

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