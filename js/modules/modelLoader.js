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
                const scaleFactor = targetSize / (maxSize || 1);
                
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
                group.rotation.order = 'YXZ'; // Trình tự xoay trực quan cho nội thất (Yaw -> Pitch -> Roll)
                group.add(model);
                
                // Đặt model nổi lên trên mặt sàn cộng thêm 0.02 để cách mặt đất
                group.position.y = (size.y / 2) + 0.02;
                
                group.userData.isInteractable = true;
                    // Lưu baseY cho hàm updatePhysics
                    group.userData.baseY = (size.y / 2) + 0.02;
                    group.userData.velocity = new THREE.Vector3();

                    // Cấu hình đặc biệt nếu là cửa
                    if (url.includes('door') || url.includes('window')) {
                        group.userData.isDoor = true;
                        group.userData.isOpen = false;
                        group.userData.isCollidable = false; // Ngăn collision manager làm kẹt cửa với tường khi đục lỗ
                        
                        // Để ánh sáng xuyên qua, ta tắt castShadow của toàn bộ cửa/cửa sổ
                        model.traverse(child => {
                            if (child.isMesh) {
                                // Tắt bóng đổ để ánh sáng chiếu xuyên qua cửa sổ/cửa chính
                                child.castShadow = false;
                                
                                // Có thể điều chỉnh material để kính trong suốt hơn nếu cần
                                if (child.material && child.material.name && child.material.name.toLowerCase().includes('glass')) {
                                    child.material.transparent = true;
                                    child.material.opacity = Math.min(child.material.opacity, 0.3);
                                }
                            }
                        });
                    }

                    // Tự động gắn đèn phát sáng nếu model nằm trong thư mục light hoặc tên có chữ lamp
                    if (url.includes('/light/') || url.includes('lamp')) {
                        const bulbLight = new THREE.PointLight(0xfff5e6, 1.5, 12);
                        // Đặt bóng đèn lơ lửng ngay phía trên tâm của vật thể một chút
                        bulbLight.position.set(0, size.y / 2 + 0.1, 0);
                        bulbLight.castShadow = true;
                        bulbLight.shadow.bias = -0.002;
                        group.add(bulbLight);
                        
                        // Lưu cờ để sau này có thể thêm tính năng tắt/bật đèn
                        group.userData.isLightFixture = true;
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
    // Helper: kiểm tra file tồn tại bằng fetch HEAD, fallback sang GET
    async function fileExists(url, timeout = 3000) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(id);
            return res.ok;
        } catch (e) {
            try {
                const controller2 = new AbortController();
                const id2 = setTimeout(() => controller2.abort(), timeout);
                const res2 = await fetch(url, { method: 'GET', signal: controller2.signal });
                clearTimeout(id2);
                return res2.ok;
            } catch (e2) {
                return false;
            }
        }
    }

    // Các loại vật thể đơn giản được tạo bằng geometry (giữ như trước)
    const primitives = new Set(['table', 'chair', 'plant', 'bed', 'tv', 'cabinet', 'lamp']);
    if (primitives.has(type)) {
        let geometry, material, yOffset = 0;

        switch (type) {
            case 'table':
                geometry = new THREE.BoxGeometry(3, 1.5, 2);
                material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
                yOffset = 0.75;
                break;
            case 'chair':
                geometry = new THREE.BoxGeometry(1, 1.5, 1);
                material = new THREE.MeshStandardMaterial({ color: 0x444444 });
                yOffset = 0.75;
                break;
            case 'plant':
                geometry = new THREE.CylinderGeometry(0.5, 0.3, 1.5);
                material = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
                yOffset = 0.75;
                break;
            case 'bed':
                geometry = new THREE.BoxGeometry(3, 0.8, 4);
                material = new THREE.MeshStandardMaterial({ color: 0x4682b4 });
                yOffset = 0.4;
                break;
            case 'tv':
                geometry = new THREE.BoxGeometry(2.5, 1.5, 0.2);
                material = new THREE.MeshStandardMaterial({ color: 0x111111 });
                yOffset = 1.5;
                break;
            case 'cabinet':
                geometry = new THREE.BoxGeometry(2, 3, 1.5);
                material = new THREE.MeshStandardMaterial({ color: 0xcd853f });
                yOffset = 1.5;
                break;
            case 'lamp':
                geometry = new THREE.ConeGeometry(0.5, 2, 8);
                material = new THREE.MeshStandardMaterial({ color: 0xffd700 });
                yOffset = 1.0;
                break;
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.y = yOffset + 0.02;

        mesh.userData.isInteractable = true;
        mesh.userData.baseY = yOffset + 0.02;
        mesh.userData.velocity = new THREE.Vector3();

        if (type === 'lamp') {
            const bulbLight = new THREE.PointLight(0xfff5e6, 1.5, 10);
            bulbLight.position.set(0, 1.0, 0);
            bulbLight.castShadow = true;
            bulbLight.shadow.bias = -0.002;
            mesh.add(bulbLight);
            mesh.userData.isLightFixture = true;
        }

        return mesh;
    }

    // Nếu không phải primitive, thử tìm file GLB tương ứng trong thư mục furnitures
    const normalizedType = type.trim().replace(/\\/g, '/');
    const parts = normalizedType.split('/').filter(Boolean);
    const baseName = parts[parts.length - 1] || normalizedType;
    const category = parts.length > 1 ? parts[0] : '';
    const candidates = [];

    function pushCandidate(path) {
        if (!path) return;
        candidates.push(path);
    }

    // Cố gắng tìm file chính xác theo cấu trúc folders
    if (category === 'doors' || category === 'things' || category === 'decorations' || category === 'light') {
        pushCandidate(`furnitures/${category}/${baseName}.glb`);
        pushCandidate(`furnitures/${category}/${baseName}_single.glb`);
        pushCandidate(`furnitures/${category}/${baseName}_1.glb`);
        pushCandidate(`furnitures/${normalizedType}.glb`);
    } else {
        pushCandidate(`furnitures/${normalizedType}.glb`);
        pushCandidate(`furnitures/${normalizedType}_single.glb`);
        pushCandidate(`furnitures/${normalizedType}_1.glb`);
        pushCandidate(`furnitures/${normalizedType}/${baseName}.glb`);
        pushCandidate(`furnitures/things/${normalizedType}.glb`);
        pushCandidate(`furnitures/decorations/${normalizedType}.glb`);
        pushCandidate(`furnitures/doors/${normalizedType}.glb`);
        pushCandidate(`furnitures/light/${normalizedType}.glb`);
    }

    const uniqueCandidates = [...new Set(candidates)];

    // Heuristics for targetSize – căn chỉnh kích thước phù hợp từng loại object
    let targetSize = 2.0;
    const nt = normalizedType.toLowerCase();

    if (nt.includes('decorat') || nt.startsWith('decorations')) {
        targetSize = 0.6;                          // Bình hoa, cây nhỏ
    }
    if (nt.includes('potted_tree'))   targetSize = 1.8; // Cây to hơn
    if (nt.includes('bed'))           targetSize = 3.5;
    if (nt.includes('sofa') || nt.includes('couch')) targetSize = 3.0;
    if (nt.includes('rug') || nt.includes('carpet') || nt.includes('bhadoi')) targetSize = 4.0; // Thảm trải sàn rộng
    if (nt.includes('bookshelf') || nt.includes('bookcase')) targetSize = 3.5;
    if (nt.includes('cabinet') || nt.includes('drawer')) targetSize = 2.5;
    if (nt.includes('desk') || nt.includes('table')) targetSize = 2.5;
    if (nt.includes('chair'))         targetSize = 1.5;
    if (nt.includes('lamp'))          targetSize = 1.2; // Đèn bàn không quá to
    if (nt.includes('titanic_lamp'))  targetSize = 2.0;
    if (nt.includes('fan'))           targetSize = 1.5;
    if (nt.includes('tv') || nt.includes('television')) targetSize = 2.0;
    if (nt.includes('gaming_desktop') || nt.includes('pc-9801')) targetSize = 1.2;
    if (nt.includes('speaker') || nt.includes('fnaf'))  targetSize = 1.0;
    // New objects
    if (nt.includes('gaming_chair'))   targetSize = 1.8;
    if (nt.includes('laptop'))         targetSize = 0.5;
    if (nt.includes('computer_mouse')) targetSize = 0.2;
    if (nt.includes('monitor'))        targetSize = 0.9;
    if (nt.includes('fridge') || nt.includes('samsung')) targetSize = 2.5;
    if (nt.includes('microwave'))      targetSize = 0.6;
    if (nt.includes('robot_vacuum'))   targetSize = 0.4;
    if (nt.includes('curtain'))        targetSize = 3.5;
    if (nt.includes('wall_clock'))     targetSize = 0.5;
    if (nt.includes('cat_ornament'))   targetSize = 0.4;
    if (nt.includes('oscillating') || nt.includes('pedestal')) targetSize = 1.8;
    if (nt.includes('glass_window'))   targetSize = 2.5;
    if (nt.includes('modern_furniture') || nt.includes('stylized_furniture')) targetSize = 2.5;
    if (nt.includes('desk_light'))     targetSize = 1.0;

    for (const url of uniqueCandidates) {
        if (await fileExists(encodeURI(url))) {
            return loadGLTFModel(encodeURI(url), targetSize);
        }
    }

    // Nếu không tìm thấy GLB, trả về mesh placeholder đơn giản
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const yOffset = 0.5;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = yOffset + 0.02;

    mesh.userData.isInteractable = true;
    mesh.userData.baseY = yOffset + 0.02;
    mesh.userData.velocity = new THREE.Vector3();

    return mesh;
}