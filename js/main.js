import { setupDualScene } from './modules/sceneSetup.js';
import { setupLighting } from './modules/lighting.js';
import { createRoomGeometry } from './modules/roomGeometry.js';
import { setupInteractionManager } from './modules/interactionManager.js';
import { setupDragDrop } from './modules/dragDrop.js';
import { setupUIManager } from './modules/uiManager.js';
import { createModel } from './modules/modelLoader.js';
import { CollisionManager } from './modules/collisionManager.js';

// --- KHỞI TẠO UI ---
setupUIManager();

// --- KHỞI TẠO DUAL SCENE ---
const { scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D } = setupDualScene();

// --- ÁNH SÁNG & BÓNG ĐỔ ---
setupLighting(scene);

// --- VẼ PHÒNG ---
const { roomGroup } = createRoomGeometry(scene);

// --- COLLISION MANAGER (bounding box + kiểm tra va chạm) ---
const collisionManager = new CollisionManager(scene);

// --- KIỂM SOÁT TƯƠNG TÁC ---
const interactionManager = setupInteractionManager(
    scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D,
    collisionManager   // truyền vào để kích hoạt bounding box + collision detection
);

// --- ĐĂNG KÝ PHÒNG LÀ OBJECT TƯƠNG TÁC ---
// Phòng có thể chọn/di chuyển nhưng không tham gia collision detection
// (bbox phòng bao trùm toàn bộ nội thất → luôn "va chạm" với mọi vật thể)
interactionManager.registerInteractableObject(roomGroup, false);

// --- CƠ CHẾ KÉO THẢ TỪ SIDEBAR ---
setupDragDrop(scene, camera2D, renderer2D, camera3D, renderer3D, interactionManager, registerPhysicsObject);

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
            mesh.position.y += mesh.userData.velocity.y;
            if (mesh.position.y <= mesh.userData.baseY) {
                mesh.position.y = mesh.userData.baseY;
                mesh.userData.velocity.y = 0;
            }
        }
    }
}

// --- TẠO SƠ BỘ MỘT VÀI OBJECT MẪU ---
async function addSampleObjects(scene, interactionManager) {
    const samples = [
        { type: 'table',   x:  0,    z: -1   },
        { type: 'chair',   x: -2,    z: -1   },
        { type: 'chair',   x:  2,    z: -1   },
        { type: 'sofa',    x:  0,    z:  2   },
        { type: 'plant',   x: -3.5,  z:  3   },
        { type: 'tv',      x:  3.5,  z:  1.5 },
        { type: 'cabinet', x:  4,    z: -3   },
        { type: 'lamp',    x: -4,    z: -3   }
    ];

    for (const item of samples) {
        try {
            const mesh = await createModel(item.type);
            mesh.position.set(item.x, mesh.position.y, item.z);
            scene.add(mesh);
            interactionManager.registerInteractableObject(mesh);
            registerPhysicsObject(mesh);
        } catch (err) {
            console.error(`Không thể tải object mẫu ${item.type}:`, err);
        }
    }
}

addSampleObjects(scene, interactionManager);

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