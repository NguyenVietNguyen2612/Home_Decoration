import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

// Hàm tạo các vật thể cơ bản lúc kéo thả (Sau này bạn có thể thay bằng GLTFLoader)
export async function createModel(type) {
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
            return new Promise((resolve, reject) => {
                gltfLoader.load(
                    'furnitures/sofa_single.glb',
                    (gltf) => {
                        const model = gltf.scene;
                        
                        // Bật bóng đổ cho tất cả các phần tử của model
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                child.frustumCulled = false; // Ngăn object biến mất khi zoom sát do sai số bounding box
                            }
                        });

                        // Tính Box ban đầu để lấy kích thước
                        const initialBox = new THREE.Box3().setFromObject(model);
                        const initialSize = initialBox.getSize(new THREE.Vector3());
                        
                        // Đa số model tải trên mạng dùng đơn vị cm, milimet hoặc tỉ lệ tuỳ ý.
                        // Ta sẽ scale nó lại sao cho chiều dài nhất của cái Sofa là khoảng 3.0 mét (3 đơn vị)
                        const maxSize = Math.max(initialSize.x, initialSize.y, initialSize.z);
                        const targetSize = 3.0; // Chiều dài tối đa 3 mét
                        const scaleFactor = targetSize / maxSize;
                        
                        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                        model.updateMatrixWorld(true); // Cập nhật lại ma trận sau khi scale

                        // Lấy lại kích thước và tâm MỚI sau khi đã scale
                        const box = new THREE.Box3().setFromObject(model);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());
                        
                        // Đẩy model về đúng tâm (0,0,0) của group
                        model.position.x += (model.position.x - center.x);
                        model.position.y += (model.position.y - center.y);
                        model.position.z += (model.position.z - center.z);
                        
                        const group = new THREE.Group();
                        group.add(model);
                        
                        // Đặt model nổi lên trên mặt sàn
                        group.position.y = size.y / 2;
                        
                        group.userData.isInteractable = true;
                        // Lưu baseY cho hàm updatePhysics
                        group.userData.baseY = size.y / 2;
                        group.userData.velocity = new THREE.Vector3();

                        resolve(group);
                    },
                    undefined,
                    (error) => {
                        console.error('Lỗi khi tải sofa_single.glb:', error);
                        reject(error);
                    }
                );
            });
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