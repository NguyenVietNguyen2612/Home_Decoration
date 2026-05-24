import * as THREE from 'three';
import { createModel } from './modelLoader.js';
import { createRoomGeometry } from './roomGeometry.js';
import { updateWallHoles } from './doorManager.js';

export function setupDragDrop(scene, camera2D, renderer2D, camera3D, renderer3D, interactionManager, registerPhysicsObject, groundPlane, collisionManager) {
    // 1. Gắn sự kiện lấy thông tin khi người dùng bắt đầu Drag từ thanh Sidebar
    const items = document.querySelectorAll('.object-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('objectType', item.getAttribute('data-type'));
        });
    });

    // 2. Cho phép khung 2D nhận thao tác Drop
    const container2D = document.getElementById('view-2d');
    
    container2D.addEventListener('dragover', (e) => {
        e.preventDefault(); // Phải có preventDefault thì mới kích hoạt drop được
    });

    container2D.addEventListener('drop', async (e) => {
        e.preventDefault();
        const objectType = e.dataTransfer.getData('objectType');
        if (!objectType) return;

        // Tính tọa độ điểm drop của chuột trên màn hình 2D
        const rect = container2D.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Dùng Plane vô hình (Mặt sàn tọa độ Y = 0) để Raycast và lấy vị trí 3D chính xác thả xuống
        const raycaster = new THREE.Raycaster();
        const mouseVector = new THREE.Vector2(mouseX, mouseY);
        raycaster.setFromCamera(mouseVector, camera2D);

        const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        
        // Toán học điểm chạm của tia ray từ camera 2D với mặt phẳng sàn
        raycaster.ray.intersectPlane(raycastPlane, intersectPoint);

        if (intersectPoint) {
            // Snap tọa độ lưới 0.1 để đảm bảo khít khi kéo
            intersectPoint.x = Math.round(intersectPoint.x * 10) / 10;
            intersectPoint.z = Math.round(intersectPoint.z * 10) / 10;

            // -- XỬ LÝ NỀN --
            if (objectType.startsWith('ground_')) {
                const textureType = objectType.split('_')[1];
                const textureLoader = new THREE.TextureLoader();
                const texture = textureLoader.load(`grounds/${textureType}.png`);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                const currentGridSize = parseInt(document.getElementById('grid-size').value) || 100;
                texture.repeat.set(currentGridSize / 10, currentGridSize / 10);
                texture.colorSpace = THREE.SRGBColorSpace;
                
                groundPlane.material.map = texture;
                groundPlane.material.color.set(0xffffff); // Đặt lại màu gốc để không bị lấn át texture
                let roughness = 0.8;
                switch(textureType) {
                    case 'tile':
                    case 'marble':
                        roughness = 0.1; // Smooth, shiny
                        break;
                    case 'wood':
                    case 'concrete':
                        roughness = 0.6; // Slightly reflective
                        break;
                    case 'grass':
                    case 'sand':
                    case 'brick':
                    case 'stone':
                        roughness = 0.95; // Rough, no reflection
                        break;
                }
                groundPlane.material.roughness = roughness;
                groundPlane.material.needsUpdate = true;
                return;
            }

            // -- XỬ LÝ TƯỜNG (WALLPAPER) --
            if (objectType.startsWith('wall_')) {
                const intersects = raycaster.intersectObjects(scene.children, true);
                if (intersects.length > 0) {
                    const firstHit = intersects[0].object;
                    if (firstHit.userData && firstHit.userData.isWall) {
                        const textureType = objectType.replace('wall_', '');
                        const textureLoader = new THREE.TextureLoader();
                        const texture = textureLoader.load(`rooms/${textureType}.png`);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(4, 2); // Kích thước lặp lại cho tường
                        texture.colorSpace = THREE.SRGBColorSpace;
                        
                        // Áp dụng vật liệu mới thay vì chỉnh sửa để không dính các tường khác
                        const newMat = firstHit.material.clone();
                        newMat.map = texture;
                        newMat.color.set(0xffffff);
                        newMat.needsUpdate = true;
                        firstHit.material = newMat;
                    }
                }
                return;
            }

            // -- XỬ LÝ HÌNH DẠNG PHÒNG --
            if (objectType.startsWith('room_')) {
                const { roomGroup, walls } = createRoomGeometry(objectType);
                roomGroup.position.set(intersectPoint.x, 0, intersectPoint.z);
                scene.add(roomGroup);
                interactionManager.registerInteractableObject(roomGroup, false);
                if (collisionManager) {
                    walls.forEach(w => collisionManager.register(w));
                }
                return;
            }

            // -- XỬ LÝ NỘI THẤT --
            const newObject = await createModel(objectType);
            newObject.position.set(intersectPoint.x, newObject.position.y + 5, intersectPoint.z);
            scene.add(newObject);
            interactionManager.registerInteractableObject(newObject);
            if (typeof registerPhysicsObject === 'function') registerPhysicsObject(newObject);
            updateWallHoles(scene);
        }
    });

    // 3. Cho phép khung 3D nhận thao tác Drop
    const container3D = document.getElementById('view-3d');
    
    container3D.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    container3D.addEventListener('drop', async (e) => {
        e.preventDefault();
        const objectType = e.dataTransfer.getData('objectType');
        if (!objectType) return;

        const rect = container3D.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        const mouseVector = new THREE.Vector2(mouseX, mouseY);
        raycaster.setFromCamera(mouseVector, camera3D);

        const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        
        raycaster.ray.intersectPlane(raycastPlane, intersectPoint);

        if (intersectPoint) {
            // Snap tọa độ lưới 0.1 để đảm bảo khít khi kéo
            intersectPoint.x = Math.round(intersectPoint.x * 10) / 10;
            intersectPoint.z = Math.round(intersectPoint.z * 10) / 10;

            // -- XỬ LÝ NỀN --
            if (objectType.startsWith('ground_')) {
                const textureType = objectType.split('_')[1];
                const textureLoader = new THREE.TextureLoader();
                const texture = textureLoader.load(`grounds/${textureType}.png`);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                const currentGridSize = parseInt(document.getElementById('grid-size').value) || 100;
                texture.repeat.set(currentGridSize / 10, currentGridSize / 10);
                texture.colorSpace = THREE.SRGBColorSpace;
                
                groundPlane.material.map = texture;
                groundPlane.material.color.set(0xffffff);
                let roughness = 0.8;
                switch(textureType) {
                    case 'tile':
                    case 'marble':
                        roughness = 0.1; // Smooth, shiny
                        break;
                    case 'wood':
                    case 'concrete':
                        roughness = 0.6; // Slightly reflective
                        break;
                    case 'grass':
                    case 'sand':
                    case 'brick':
                    case 'stone':
                        roughness = 0.95; // Rough, no reflection
                        break;
                }
                groundPlane.material.roughness = roughness;
                groundPlane.material.needsUpdate = true;
                return;
            }

            // -- XỬ LÝ TƯỜNG (WALLPAPER) --
            if (objectType.startsWith('wall_')) {
                const intersects = raycaster.intersectObjects(scene.children, true);
                if (intersects.length > 0) {
                    const firstHit = intersects[0].object;
                    if (firstHit.userData && firstHit.userData.isWall) {
                        const textureType = objectType.replace('wall_', '');
                        const textureLoader = new THREE.TextureLoader();
                        const texture = textureLoader.load(`rooms/${textureType}.png`);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(4, 2);
                        texture.colorSpace = THREE.SRGBColorSpace;
                        
                        const newMat = firstHit.material.clone();
                        newMat.map = texture;
                        newMat.color.set(0xffffff);
                        newMat.needsUpdate = true;
                        firstHit.material = newMat;
                    }
                }
                return;
            }

            // -- XỬ LÝ HÌNH DẠNG PHÒNG --
            if (objectType.startsWith('room_')) {
                const { roomGroup, walls } = createRoomGeometry(objectType);
                roomGroup.position.set(intersectPoint.x, 0, intersectPoint.z);
                scene.add(roomGroup);
                interactionManager.registerInteractableObject(roomGroup, false);
                if (collisionManager) {
                    walls.forEach(w => collisionManager.register(w));
                }
                return;
            }

            // -- XỬ LÝ NỘI THẤT --
            const newObject = await createModel(objectType);
            newObject.position.set(intersectPoint.x, newObject.position.y + 5, intersectPoint.z);
            scene.add(newObject);
            interactionManager.registerInteractableObject(newObject);
            if (typeof registerPhysicsObject === 'function') registerPhysicsObject(newObject);
            updateWallHoles(scene);
        }
    });
}