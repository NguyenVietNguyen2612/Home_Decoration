import * as THREE from 'three';

// Hàm load texture để dán bề mặt (sàn gạch, vân gỗ, ...)
export function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    
    // Lưu ý: Do bạn chưa cung cấp ảnh thực tế nên tôi đang dùng hàm tạo ảnh màu/pattern tạm 
    // Trong thực tế, bạn sẽ thay thế link bằng đường dẫn file ảnh thật (vd: 'assets/wood.jpg')
    
    // Giả lập ván sàn
    const floorMap = textureLoader.load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
    floorMap.wrapS = THREE.RepeatWrapping;
    floorMap.wrapT = THREE.RepeatWrapping;
    floorMap.repeat.set(4, 4); // Lặp texture để tránh hình bị kéo giãn

    // Giả lập vân tường (hoặc giấy dán tường)
    const wallMap = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
    wallMap.wrapS = THREE.RepeatWrapping;
    wallMap.wrapT = THREE.RepeatWrapping;
    wallMap.repeat.set(3, 1.5);

    return { floorMap, wallMap };
}