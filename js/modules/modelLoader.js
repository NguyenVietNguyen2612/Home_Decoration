import * as THREE from 'three';

// Hàm tạo các vật thể cơ bản lúc kéo thả (Sau này bạn có thể thay bằng GLTFLoader)
export function createModel(type) {
    let geometry, material;
    let yOffset = 0; // Độ cao để đưa vật thể nổi hẳn lên trên lưới tọa độ

    switch (type) {
        case 'table':
            geometry = new THREE.BoxGeometry(3, 1.5, 2);
            material = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Màu gỗ
            yOffset = 0.75;
            break;
        case 'chair':
            geometry = new THREE.BoxGeometry(1, 1.5, 1);
            material = new THREE.MeshStandardMaterial({ color: 0x444444 }); // Màu xám
            yOffset = 0.75;
            break;
        case 'plant':
            geometry = new THREE.CylinderGeometry(0.5, 0.3, 1.5);
            material = new THREE.MeshStandardMaterial({ color: 0x2e8b57 }); // Màu xanh
            yOffset = 0.75;
            break;
        case 'bed':
            geometry = new THREE.BoxGeometry(3, 0.8, 4);
            material = new THREE.MeshStandardMaterial({ color: 0x4682b4 }); // Màu xanh biển
            yOffset = 0.4;
            break;
        case 'sofa':
            geometry = new THREE.BoxGeometry(4, 1.2, 2);
            material = new THREE.MeshStandardMaterial({ color: 0xd2b48c }); // Màu nâu nhạt
            yOffset = 0.6;
            break;
        case 'tv':
            geometry = new THREE.BoxGeometry(2.5, 1.5, 0.2);
            material = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Đen
            yOffset = 1.5;
            break;
        case 'cabinet':
            geometry = new THREE.BoxGeometry(2, 3, 1.5);
            material = new THREE.MeshStandardMaterial({ color: 0xcd853f }); // Màu gỗ Peru
            yOffset = 1.5;
            break;
        case 'lamp':
            geometry = new THREE.ConeGeometry(0.5, 2, 8);
            material = new THREE.MeshStandardMaterial({ color: 0xffd700 }); // Màu vàng
            yOffset = 1.0;
            break;
        default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
            material = new THREE.MeshStandardMaterial({ color: 0xffffff });
            yOffset = 0.5;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = yOffset;
    
    // Đánh dấu đây là vật thể người dùng có thể tương tác/chỉnh sửa
    mesh.userData.isInteractable = true;

    return mesh;
}