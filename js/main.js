import { setupDualScene } from './modules/sceneSetup.js';
import { setupLighting } from './modules/lighting.js';
import { createRoomGeometry } from './modules/roomGeometry.js';
import { setupInteractionManager } from './modules/interactionManager.js';
import { setupDragDrop } from './modules/dragDrop.js';
import { setupUIManager } from './modules/uiManager.js';
import { createModel } from './modules/modelLoader.js';

// --- KHỞI TẠO UI ---
setupUIManager();

// --- KHỞI TẠO DUAL SCENE NỀN TẢNG ---
const { scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D } = setupDualScene();

// --- ÁNH SÁNG & BÓNG ĐỔ ---
setupLighting(scene);

// --- VẼ PHÒNG (SÀN, TƯỜNG) ---
const { roomGroup } = createRoomGeometry(scene);

// --- KIỂM SOÁT TƯƠNG TÁC ---
const interactionManager = setupInteractionManager(
    scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D
);

// --- ĐĂNG KÝ PHÒNG LÀ OBJECT TƯƠNG TÁC ---
// Phòng có thể được chọn và di chuyển trên lưới như các vật thể nội thất
interactionManager.registerInteractableObject(roomGroup);

// --- CƠ CHẾ KÉO THẢ TỪ SIDEBAR ---
setupDragDrop(scene, camera2D, renderer2D, camera3D, renderer3D, interactionManager, registerPhysicsObject);

// --- VẬT LÝ NHẸ (Trọng lực) ---
const physicsObjects = [];
const gravity = -0.02;

function registerPhysicsObject(mesh) {
    physicsObjects.push(mesh);
}

function updatePhysics() {
    for (let i = physicsObjects.length - 1; i >= 0; i--) {
        const mesh = physicsObjects[i];
        if (!mesh.userData || mesh.userData.baseY === undefined) continue;

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
function addSampleObjects(scene, interactionManager) {
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

    samples.forEach(item => {
        const mesh = createModel(item.type);
        mesh.position.set(item.x, mesh.position.y, item.z);
        scene.add(mesh);
        interactionManager.registerInteractableObject(mesh);
        registerPhysicsObject(mesh);
    });
}

addSampleObjects(scene, interactionManager);

// --- VÒNG LẶP RENDER ---
function animate() {
    requestAnimationFrame(animate);

    controls2D.update();
    controls3D.update();

    updatePhysics();

    renderer2D.render(scene, camera2D);
    renderer3D.render(scene, camera3D);
}

animate();