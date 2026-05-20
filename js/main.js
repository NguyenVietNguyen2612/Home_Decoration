import { setupDualScene } from './modules/sceneSetup.js';
import { setupLighting } from './modules/lighting.js';
import { createRoomGeometry } from './modules/roomGeometry.js'; // Thêm lại import này
import { setupInteractionManager } from './modules/interactionManager.js';
import { setupDragDrop } from './modules/dragDrop.js';
import { setupUIManager } from './modules/uiManager.js';

// --- KHỞI TẠO UI ---
setupUIManager();

// --- KHỞI TẠO DUAL SCENE NỀN TẢNG ---
const { scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D } = setupDualScene();

// --- ÁNH SÁNG & BÓNG ĐỔ ---
setupLighting(scene);

// --- VẼ PHÒNG (SÀN, TƯỜNG) ---
createRoomGeometry(scene); // Gọi hàm để hiện sàn và tường

// --- KIỂM SOÁT TƯƠNG TÁC (TransformControls, Raycast click) ---
// Gắn công cụ biến đổi (Kéo, Xoay, Scale) vào View 3D và 2D
const interactionManager = setupInteractionManager(scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D);

// --- CƠ CHẾ KÉO THẢ TỪ SIDEBAR ---
setupDragDrop(scene, camera2D, renderer2D, camera3D, renderer3D, interactionManager);

// --- VÒNG LẶP RENDER ---
function animate() {
    requestAnimationFrame(animate);

    // Cập nhật Controls
    controls2D.update();
    controls3D.update();

    // Render cả 2 Views bằng cùng 1 Scene
    renderer2D.render(scene, camera2D);
    renderer3D.render(scene, camera3D);
}

animate();