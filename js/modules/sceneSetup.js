import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
// FREE CAMERA CONTROLLER cho View 3D
// - Chuột phải kéo  : xoay camera tự do (pitch + yaw)
// - Scroll           : di chuyển tiến / lùi theo hướng nhìn
// - Chuột giữa kéo  : di chuyển ngang (pan / strafe)
// - Không bị khoá vào tâm lưới – camera hoàn toàn tự do
// ============================================================
class FreeCameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.enabled = true;   // interactionManager có thể tắt khi kéo gizmo

        this.rotateSpeed = 0.005;
        this.panSpeed = 0.02;
        this.moveSpeed = 0.5;   // tốc độ tiến/lùi khi scroll

        // Đảm bảo rotation order là YXZ để pitch + yaw hoạt động độc lập
        this.camera.rotation.order = 'YXZ';
        this._yaw = this.camera.rotation.y;
        this._pitch = this.camera.rotation.x;

        this._isDown = false;
        this._button = -1;
        this._lastX = 0;
        this._lastY = 0;

        // Bind
        this._onDown = this._onDown.bind(this);
        this._onMove = this._onMove.bind(this);
        this._onUp = this._onUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onCtxMenu = (e) => e.preventDefault();

        domElement.addEventListener('pointerdown', this._onDown);
        domElement.addEventListener('pointermove', this._onMove);
        domElement.addEventListener('pointerup', this._onUp);
        domElement.addEventListener('wheel', this._onWheel, { passive: false });
        domElement.addEventListener('contextmenu', this._onCtxMenu);
    }

    _onDown(e) {
        if (!this.enabled) return;
        if (e.button === 0) return; // Trái dành cho selection
        this._isDown = true;
        this._button = e.button;
        this._lastX = e.clientX;
        this._lastY = e.clientY;
        this.domElement.setPointerCapture(e.pointerId);
    }

    _onMove(e) {
        if (!this._isDown || !this.enabled) return;
        const dx = e.clientX - this._lastX;
        const dy = e.clientY - this._lastY;
        this._lastX = e.clientX;
        this._lastY = e.clientY;

        if (this._button === 2) {
            // Chuột phải: xoay camera tự do
            this._yaw -= dx * this.rotateSpeed;
            this._pitch -= dy * this.rotateSpeed;
            // Giới hạn góc ngẩng để không lật ngược
            this._pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this._pitch));
            this.camera.rotation.y = this._yaw;
            this.camera.rotation.x = this._pitch;

        } else if (this._button === 1) {
            // Chuột giữa: pan (strafe ngang + lên-xuống)
            const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
            const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
            this.camera.position.addScaledVector(right, -dx * this.panSpeed);
            this.camera.position.addScaledVector(up, dy * this.panSpeed);
        }
    }

    _onUp(e) {
        if (this._button === e.button) {
            this._isDown = false;
            this._button = -1;
        }
    }

    _onWheel(e) {
        if (!this.enabled) return;
        e.preventDefault();
        // Tiến / lùi theo hướng nhìn của camera
        const forward = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 2).negate();
        this.camera.position.addScaledVector(forward, -e.deltaY * this.moveSpeed * 0.02);
    }

    /** Đồng bộ lại yaw/pitch nếu camera bị di chuyển bên ngoài (ví dụ: reset) */
    syncFromCamera() {
        this._yaw = this.camera.rotation.y;
        this._pitch = this.camera.rotation.x;
    }

    zoom(direction) {
        if (!this.enabled) return;
        const forward = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 2).negate();
        this.camera.position.addScaledVector(forward, direction * this.moveSpeed * 2);
    }

    pan(deltaX, deltaY) {
        if (!this.enabled) return;
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        if (deltaX !== 0) this.camera.position.addScaledVector(right, deltaX * this.moveSpeed * 2);
        if (deltaY !== 0) this.camera.position.addScaledVector(up, deltaY * this.moveSpeed * 2);
    }

    update() { /* no-op – tương thích với animation loop */ }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this._onDown);
        this.domElement.removeEventListener('pointermove', this._onMove);
        this.domElement.removeEventListener('pointerup', this._onUp);
        this.domElement.removeEventListener('wheel', this._onWheel);
        this.domElement.removeEventListener('contextmenu', this._onCtxMenu);
    }
}

export function setupDualScene() {
    // SCENE CHUNG
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Màu xanh bầu trời

    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        roughness: 1, 
        metalness: 0 
    });
    const groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.01;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // ======================================
    // 1. VIEW 2D (nhìn từ trên xuống – OrbitControls)
    // ======================================
    const container2D = document.getElementById('view-2d');
    const aspect = container2D.clientWidth / container2D.clientHeight;
    const frustumSize = 25;

    const camera2D = new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2,
        frustumSize / 2, frustumSize / -2,
        0.1, 100
    );
    camera2D.position.set(0, 20, 0);
    camera2D.lookAt(0, 0, 0);

    const renderer2D = new THREE.WebGLRenderer({ antialias: true });
    renderer2D.setSize(container2D.clientWidth, container2D.clientHeight);
    container2D.appendChild(renderer2D.domElement);

    const controls2D = new OrbitControls(camera2D, renderer2D.domElement);
    controls2D.enableRotate = false;
    controls2D.enableDamping = true;
    controls2D.mouseButtons = {
        LEFT: null,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN
    };

    // ======================================
    // 2. VIEW 3D (Free Camera)
    // ======================================
    const container3D = document.getElementById('view-3d');
    const camera3D = new THREE.PerspectiveCamera(
        45,
        container3D.clientWidth / container3D.clientHeight,
        0.01, 200
    );

    // Đặt camera nhìn vào phòng từ góc chéo + đồng bộ rotation order trước lookAt
    camera3D.rotation.order = 'YXZ';
    camera3D.position.set(10, 8, 10);
    camera3D.lookAt(0, 0, 0);

    const renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3D.setSize(container3D.clientWidth, container3D.clientHeight);
    renderer3D.shadowMap.enabled = true;
    container3D.appendChild(renderer3D.domElement);

    // Free camera controller cho 3D view
    const controls3D = new FreeCameraController(camera3D, renderer3D.domElement);

    // ======================================
    // 3. RESIZE – dùng ResizeObserver thay vì window resize
    //    Để tránh nhấp nháy, update renderer ngay khi container thay đổi kích thước
    //    không quá window event dispatch (không bị delay 1 frame)
    // ======================================
    const resizeObserver = new ResizeObserver(() => {
        // Update 2D
        const w2 = container2D.clientWidth;
        const h2 = container2D.clientHeight;
        if (w2 > 0 && h2 > 0) {
            const aspect2D = w2 / h2;
            camera2D.left   = -frustumSize * aspect2D / 2;
            camera2D.right  =  frustumSize * aspect2D / 2;
            camera2D.top    =  frustumSize / 2;
            camera2D.bottom = -frustumSize / 2;
            camera2D.updateProjectionMatrix();
            renderer2D.setSize(w2, h2);
        }

        // Update 3D
        const w3 = container3D.clientWidth;
        const h3 = container3D.clientHeight;
        if (w3 > 0 && h3 > 0) {
            camera3D.aspect = w3 / h3;
            camera3D.updateProjectionMatrix();
            renderer3D.setSize(w3, h3);
        }
    });

    resizeObserver.observe(container2D);
    resizeObserver.observe(container3D);

    return { scene, groundPlane, camera2D, renderer2D, controls2D, camera3D, renderer3D, controls3D };
}