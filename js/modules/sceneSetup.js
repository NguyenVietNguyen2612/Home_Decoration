import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupDualScene() {
    // SCENE CHUNG CHỨA CÁC ĐỐI TƯỢNG (DÙNG CHO CẢ 2 VIEW)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5); // Màu xám nhạt

    // Grid phụ trợ để căn chỉnh (Mặt phẳng nền 2D) - Mở rộng size lên 100 và tắt highlight đường tâm
    const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc);
    gridHelper.position.y = -0.01; // Đặt thấp hơn sàn một chút để không bị đè mất
    scene.add(gridHelper);

    // ======================================
    // 1. SETUP VIEW 2D (Chính giữa - Nhìn từ trên xuống)
    // ======================================
    const container2D = document.getElementById('view-2d');
    const aspect = container2D.clientWidth / container2D.clientHeight;
    const frustumSize = 25; // Mở rộng kích thước khung hình 2D mặc định

    const camera2D = new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2,
        frustumSize / 2, frustumSize / -2,
        0.1, 100
    );
    // Đặt camera 2D nhìn từ trên xuống thẳng trục Y
    camera2D.position.set(0, 20, 0);
    camera2D.lookAt(0, 0, 0);

    const renderer2D = new THREE.WebGLRenderer({ antialias: true });
    renderer2D.setSize(container2D.clientWidth, container2D.clientHeight);
    container2D.appendChild(renderer2D.domElement);

    // Controls cho 2D (Chỉ cho phép Pan và Zoom, khóa xoay)
    const controls2D = new OrbitControls(camera2D, renderer2D.domElement);
    controls2D.enableRotate = false; // Không xoay trong view 2D
    controls2D.enableDamping = true;
    controls2D.mouseButtons = {
        LEFT: null,                 // Tách biệt Left Click để Chọn (Select)
        MIDDLE: THREE.MOUSE.PAN,    // Middle click để Pan
        RIGHT: THREE.MOUSE.PAN      // Right click cũng để Pan trong 2D
    };

    // ======================================
    // 2. SETUP VIEW 3D (Bên phải - Perspective)
    // ======================================
    const container3D = document.getElementById('view-3d');
    const camera3D = new THREE.PerspectiveCamera(45, container3D.clientWidth / container3D.clientHeight, 0.1, 100);
    camera3D.position.set(10, 8, 10);

    const renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3D.setSize(container3D.clientWidth, container3D.clientHeight);
    renderer3D.shadowMap.enabled = true; // Đổ bóng trong 3D
    container3D.appendChild(renderer3D.domElement);

    const controls3D = new OrbitControls(camera3D, renderer3D.domElement);
    controls3D.enableDamping = true;
    // Unity Scene View: Chuột phải xoay, Chuột giữa Pan, Chuột trái không gán để dành cho Raycast Select
    controls3D.mouseButtons = {
        LEFT: null,                 
        MIDDLE: THREE.MOUSE.PAN,    
        RIGHT: THREE.MOUSE.ROTATE   
    };
    // Tắt zoom bằng chuột phải (nếu có) để không trùng với Orbit
    controls3D.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };

    // ======================================
    // 3. XỬ LÝ RESIZE
    // ======================================
    window.addEventListener('resize', () => {
        // Update 2D
        const aspect2D = container2D.clientWidth / container2D.clientHeight;
        camera2D.left = -frustumSize * aspect2D / 2;
        camera2D.right = frustumSize * aspect2D / 2;
        camera2D.top = frustumSize / 2;
        camera2D.bottom = -frustumSize / 2;
        camera2D.updateProjectionMatrix();
        renderer2D.setSize(container2D.clientWidth, container2D.clientHeight);

        // Update 3D
        camera3D.aspect = container3D.clientWidth / container3D.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer3D.setSize(container3D.clientWidth, container3D.clientHeight);
    });

    return { scene, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D };
}