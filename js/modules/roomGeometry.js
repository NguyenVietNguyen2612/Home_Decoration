import * as THREE from 'three';
import { loadTextures } from './textureLoader.js';

export function createRoomGeometry(scene) {
    const textures = loadTextures();

    // ============================================================
    // Tất cả bộ phận phòng được gom vào 1 Group duy nhất
    // để có thể chọn và di chuyển cả phòng trên lưới
    // ============================================================
    const roomGroup = new THREE.Group();
    roomGroup.name = 'room';
    roomGroup.userData.isInteractable = true; // dùng trong interactionManager

    // --- 1. SÀN NHÀ ---
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.floorMap,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // --- 2. TƯỜNG ---
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xefefef,
        map: textures.wallMap
    });

    // Tường sau
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.2), wallMaterial);
    backWall.position.set(0, 2.5, -5.1);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Tường trái
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 10), wallMaterial);
    leftWall.position.set(-5.1, 2.5, 0);
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Tường phải
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 10), wallMaterial);
    rightWall.position.set(5.1, 2.5, 0);
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // --- 3. CÁNH CỬA ---
    // Dùng Group con để giữ tâm xoay bản lề
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-2, 0, -5);
    roomGroup.add(doorGroup);

    const doorGeometry = new THREE.BoxGeometry(2, 4, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
    doorMesh.position.set(1, 2, 0);
    doorMesh.castShadow = true;
    doorMesh.receiveShadow = true;
    doorMesh.userData = { isDoor: true, parentGroup: doorGroup, isOpen: false };
    doorGroup.add(doorMesh);

    // Thêm roomGroup vào scene
    scene.add(roomGroup);

    return { roomGroup, floor, doorGroup };
}