import { setupDualScene } from './modules/sceneSetup.js';
import { setupLighting } from './modules/lighting.js';
import { createRoomGeometry } from './modules/roomGeometry.js';
import { setupInteractionManager } from './modules/interactionManager.js';
import { setupDragDrop } from './modules/dragDrop.js';
import { setupUIManager } from './modules/uiManager.js';
import { createModel } from './modules/modelLoader.js';
import { CollisionManager } from './modules/collisionManager.js';
import { setupDoorInteractions } from './modules/doorManager.js';
import { generateThumbnails } from './modules/thumbnailGenerator.js';

import * as THREE from 'three';

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

// --- NÚT LƯU BẢN THIẾT KẾ ---
const btnSave = document.getElementById('btn-save');
if (btnSave) {
    btnSave.addEventListener('click', () => {
        const designName = prompt('Nhập tên cho bản thiết kế này (ví dụ: Phòng ngủ của tôi):', 'My Dream Room');
        if (!designName) return;

        const designData = {
            id: Date.now().toString(),
            name: designName,
            date: new Date().toISOString(),
            backgroundType: scene.userData.backgroundType || 'bg_solid',
            furnitures: []
        };

        // Thu thập thông tin các nội thất đang có trên scene
        interactionManager.interactableObjects.forEach(obj => {
            if (obj.name !== 'room' && obj.userData && obj.userData.type) {
                designData.furnitures.push({
                    type: obj.userData.type,
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                    scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
                });
            }
        });

        // Lưu vào localStorage
        let savedDesigns = [];
        try {
            const saved = localStorage.getItem('home_decoration_designs');
            if (saved) savedDesigns = JSON.parse(saved);
        } catch (e) {}

        savedDesigns.push(designData);
        localStorage.setItem('home_decoration_designs', JSON.stringify(savedDesigns));

        alert(`Đã lưu bản thiết kế "${designName}" thành công! \n(Dữ liệu được lưu trong LocalStorage để dùng cho trang chủ sau này)`);
    });
}
// --- TƯƠNG TÁC ĐẶC BIỆT CỦA CỬA ---
setupDoorInteractions(renderer3D, camera3D, scene);

// --- TẠO ẢNH PREVIEW TỰ ĐỘNG CHO SIDEBAR ---
generateThumbnails(renderer3D);

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