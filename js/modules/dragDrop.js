import * as THREE from 'three';
import { createModel } from './modelLoader.js';
import { createRoomGeometry } from './roomGeometry.js';
import { updateWallHoles } from './doorManager.js';

export function applyBackground(scene, type) {
    scene.userData.backgroundType = type;
    const ambientLight = scene.getObjectByName('ambientLight');
    const dirLight = scene.getObjectByName('dirLight');

    if (type === 'bg_solid') {
        if (ambientLight) {
            ambientLight.color.setHex(0xffffff);
            ambientLight.intensity = 0.4;
        }
        if (dirLight) {
            dirLight.color.setHex(0xfffae6);
            dirLight.intensity = 1.5;
        }
        scene.background = new THREE.Color(0xdddddd);
        scene.environment = null;
    } else if (type === 'bg_sky') {
        if (ambientLight) {
            ambientLight.color.setHex(0xffffff);
            ambientLight.intensity = 0.6; // Sáng hơn vào ban ngày (giảm nhẹ)
        }
        if (dirLight) {
            dirLight.color.setHex(0xffffff);
            dirLight.intensity = 1.75; // Nắng gắt hơn (giảm nhẹ)
        }
        const textureLoader = new THREE.TextureLoader();
        const skyTexture = textureLoader.load('assets/textures/sky_clouds_seamless.jpg');
        skyTexture.colorSpace = THREE.SRGBColorSpace;
        skyTexture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = skyTexture;
        scene.environment = skyTexture;
    } else if (type === 'bg_stars') {
        if (ambientLight) {
            ambientLight.color.setHex(0x88aaff); // Môi trường hơi xanh tối (đêm)
            ambientLight.intensity = 0.15;
        }
        if (dirLight) {
            dirLight.color.setHex(0xaaaaee); // Ánh trăng hắt vào
            dirLight.intensity = 0.3;
        }
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < 1500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 1.5;
            const intensity = Math.random();
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
    }
}

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

        // -- XỬ LÝ BACKGROUND -- (Không cần raycast điểm rơi)
        if (objectType.startsWith('bg_')) {
            applyBackground(scene, objectType);
            return;
        }

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

            // -- XỬ LÝ SÀN PHÒNG --
            if (objectType.startsWith('ground_')) {
                const textureType = objectType.split('_')[1];
                const textureLoader = new THREE.TextureLoader();
                const texture = textureLoader.load(`grounds/${textureType}.png`);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                
                // Kích thước sàn là 10x10, repeat 4x4 hoặc 5x5 sẽ vừa phải
                texture.repeat.set(4, 4);
                texture.colorSpace = THREE.SRGBColorSpace;
                
                const roomFloor = scene.getObjectByName('roomFloor');
                if (roomFloor) {
                    const newMat = roomFloor.material.clone();
                    newMat.map = texture;
                    newMat.color.set(0xffffff); // Đặt lại màu gốc để không bị lấn át texture
                    
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
                    newMat.roughness = roughness;
                    newMat.needsUpdate = true;
                    roomFloor.material = newMat;
                }
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



            // -- XỬ LÝ NỘI THẤT --
            const newObject = await createModel(objectType);
            newObject.position.set(intersectPoint.x, newObject.position.y + 5, intersectPoint.z);
            newObject.userData.type = objectType;
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

        // -- XỬ LÝ BACKGROUND -- (Không cần raycast điểm rơi)
        if (objectType.startsWith('bg_')) {
            applyBackground(scene, objectType);
            return;
        }

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

            // -- XỬ LÝ SÀN PHÒNG --
            if (objectType.startsWith('ground_')) {
                const textureType = objectType.split('_')[1];
                const textureLoader = new THREE.TextureLoader();
                const texture = textureLoader.load(`grounds/${textureType}.png`);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(4, 4);
                texture.colorSpace = THREE.SRGBColorSpace;
                
                const roomFloor = scene.getObjectByName('roomFloor');
                if (roomFloor) {
                    const newMat = roomFloor.material.clone();
                    newMat.map = texture;
                    newMat.color.set(0xffffff);
                    
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
                    newMat.roughness = roughness;
                    newMat.needsUpdate = true;
                    roomFloor.material = newMat;
                }
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



            // -- XỬ LÝ NỘI THẤT --
            const newObject = await createModel(objectType);
            newObject.position.set(intersectPoint.x, newObject.position.y + 5, intersectPoint.z);
            newObject.userData.type = objectType;
            scene.add(newObject);
            interactionManager.registerInteractableObject(newObject);
            if (typeof registerPhysicsObject === 'function') registerPhysicsObject(newObject);
            updateWallHoles(scene);
        }
    });
}