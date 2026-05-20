import * as THREE from 'three';
import { loadTextures } from './textureLoader.js';

export function createRoomGeometry(scene) {
    // Lấy các chất liệu (textures) đã load
    const textures = loadTextures();
    const interactableObjects = [];

    // --- 1. SÀN NHÀ ---
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        map: textures.floorMap,       // Gán vân gỗ/gạch
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Xoay ngang
    floor.receiveShadow = true;      // Nhận bóng đổ từ các vật khác
    scene.add(floor);

    // --- 2. TƯỜNG ---
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xefefef, 
        map: textures.wallMap
    });
    
    // Tường sau
    const backWallGeom = new THREE.BoxGeometry(10, 5, 0.2);
    const backWall = new THREE.Mesh(backWallGeom, wallMaterial);
    backWall.position.set(0, 2.5, -5.1);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Tường trái
    const leftWallGeom = new THREE.BoxGeometry(0.2, 5, 10);
    const leftWall = new THREE.Mesh(leftWallGeom, wallMaterial);
    leftWall.position.set(-5.1, 2.5, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Tường phải (Có lỗ hở để nhìn vào hoặc để lắp cửa sổ tùy ý)
    const rightWallGeom = new THREE.BoxGeometry(0.2, 5, 10);
    const rightWall = new THREE.Mesh(rightWallGeom, wallMaterial);
    rightWall.position.set(5.1, 2.5, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // --- 3. CÁNH CỬA (Có thiết lập tâm xoay) ---
    // Để cánh cửa quay quanh bản lề thay vì tâm hình học, ta dùng Group
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-2, 0, -5); // Đặt tại vị trí trên tường sau
    scene.add(doorGroup);

    const doorGeometry = new THREE.BoxGeometry(2, 4, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Màu gỗ
    const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
    
    // Dịch lưới hình 1 nửa chiều rộng so với bản lề (group parent)
    doorMesh.position.set(1, 2, 0); 
    doorMesh.castShadow = true;
    doorMesh.receiveShadow = true;
    doorGroup.add(doorMesh);

    // Thêm userData để xách định thông tin Tương tác
    doorMesh.userData = {
        isDoor: true,
        parentGroup: doorGroup,
        isOpen: false
    };

    // Đưa lưới cửa vào mảng các đối tượng có thể click
    interactableObjects.push(doorMesh);

    return { floor, doorGroup, interactableObjects };
}