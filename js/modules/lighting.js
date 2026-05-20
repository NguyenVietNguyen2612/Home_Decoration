import * as THREE from 'three';

export function setupLighting(scene) {
    // 1. Ánh sáng môi trường (Ambient Light)
    // Cung cấp ánh sáng nền nhẹ, tránh cho bóng đổ bị tối đen hoàn toàn
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
    scene.add(ambientLight);

    // 2. Ánh sáng định hướng (Directional Light) - Mô phỏng ánh sáng mặt trời qua cửa sổ
    const dirLight = new THREE.DirectionalLight(0xfffae6, 1.5);
    dirLight.position.set(10, 10, 5);
    dirLight.castShadow = true; // Bật đổ bóng
    
    // Thiết lập chất lượng bóng đổ (Shadow map settings)
    dirLight.shadow.mapSize.width = 2048; 
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    
    // Vùng ảnh hưởng của bóng đổ
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // 3. Ánh sáng điểm (Point Light) - Mô phỏng đèn trần trong phòng
    const pointLight = new THREE.PointLight(0xffd700, 1, 10);
    pointLight.position.set(0, 4, 0);
    pointLight.castShadow = true;
    pointLight.shadow.bias = -0.001;
    scene.add(pointLight);

    // (Tùy chọn) Thêm Helpers để dễ hình dung vị trí đèn khi code
    /*
    const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 2);
    const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.5);
    scene.add(dirLightHelper, pointLightHelper);
    */

    return { dirLight, pointLight };
}