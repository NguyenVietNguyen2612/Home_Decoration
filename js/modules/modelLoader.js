import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

export function loadGLTFModel(url, targetSize = 3.0) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
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
                // Ta sẽ scale nó lại sao cho chiều dài nhất của model là khoảng targetSize
                const maxSize = Math.max(initialSize.x, initialSize.y, initialSize.z);
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
                
                // Đặt model nổi lên trên mặt sàn cộng thêm 0.02 để cách mặt đất
                group.position.y = (size.y / 2) + 0.02;
                
                group.userData.isInteractable = true;
                    // Lưu baseY cho hàm updatePhysics
                    group.userData.baseY = (size.y / 2) + 0.02;
                    group.userData.velocity = new THREE.Vector3();

                    // Cấu hình đặc biệt nếu là cửa
                    if (url.includes('door')) {
                        group.userData.isDoor = true;
                        group.userData.isOpen = false;
                        group.userData.isCollidable = false; // Ngăn collision manager làm kẹt cửa với tường khi đục lỗ
                    }

                    resolve(group);
                },
                undefined,
                (error) => {
                    console.error(`Lỗi khi tải ${url}:`, error);
                    reject(error);
                }
            );
        });
    }

// Hàm tạo các vật thể cơ bản lúc kéo thả (Sau này bạn có thể thay bằng GLTFLoader)
export async function createModel(type) {
    let geometry, material;
    let yOffset = 0; // Độ cao để đưa vật thể nổi hẳn lên trên lưới tọa độ

    // Xử lý động cho bất kỳ model nào nằm trong thư mục doors, things, decorations
    if (type.startsWith('doors/') || type.startsWith('things/') || type.startsWith('decorations/')) {
        let targetSize = 2.0; // Mặc định cao 2m
        
        if (type.startsWith('decorations/')) targetSize = 0.6;
        else if (type.startsWith('things/bed')) targetSize = 3.0;
        else if (type.startsWith('things/')) targetSize = 2.5;
        
        return loadGLTFModel(`furnitures/${type}.glb`, targetSize);
    }

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
            return loadGLTFModel('furnitures/sofa_single.glb', 3.0);
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
    mesh.position.y = yOffset + 0.02; // Thêm 0.02 để cao hơn nền 1 lớp
    
    // Đánh dấu đây là vật thể người dùng có thể tương tác/chỉnh sửa
    mesh.userData.isInteractable = true;
    mesh.userData.baseY = yOffset + 0.02;
    mesh.userData.velocity = new THREE.Vector3();

    return mesh;
}