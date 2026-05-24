import * as THREE from 'three';
import { loadTextures } from './textureLoader.js';

export function createRoomGeometry(type = 'room_basic') {
    const textures = loadTextures();
    const roomGroup = new THREE.Group();
    roomGroup.name = 'room';
    roomGroup.userData.isInteractable = true;

    const walls = [];
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, map: textures.floorMap, roughness: 0.8
    });
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xefefef, map: textures.wallMap
    });

    if (type === 'room_basic') {
        // --- 1. SÀN NHÀ 10x10 ---
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        roomGroup.add(floor);

        // --- 2. TƯỜNG ---
        // Tường sau
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.2), wallMaterial.clone());
        backWall.position.set(0, 2.5, -5.1);
        backWall.receiveShadow = true;
        backWall.userData.isWall = true;
        roomGroup.add(backWall);
        walls.push(backWall);

        // Tường trái
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.2), wallMaterial.clone());
        leftWall.position.set(-5.1, 2.5, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        leftWall.userData.isWall = true;
        roomGroup.add(leftWall);
        walls.push(leftWall);

        // Tường phải
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.2), wallMaterial.clone());
        rightWall.position.set(5.1, 2.5, 0);
        rightWall.rotation.y = Math.PI / 2;
        rightWall.receiveShadow = true;
        rightWall.userData.isWall = true;
        roomGroup.add(rightWall);
        walls.push(rightWall);

    } else if (type === 'room_l_shape') {
        // --- 1. SÀN NHÀ L-SHAPE (2 phần) ---
        const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMaterial);
        floor1.rotation.x = -Math.PI / 2;
        floor1.receiveShadow = true;
        roomGroup.add(floor1);

        const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), floorMaterial);
        floor2.rotation.x = -Math.PI / 2;
        floor2.position.set(7.5, 0, 2.5); // Nằm ở góc dưới bên phải
        floor2.receiveShadow = true;
        roomGroup.add(floor2);

        // --- 2. TƯỜNG (5 bức tạo hình L, mở mặt trước) ---
        // Tường sau (trên cùng)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.2), wallMaterial.clone());
        backWall.position.set(0, 2.5, -5.1);
        backWall.receiveShadow = true;
        backWall.userData.isWall = true;
        roomGroup.add(backWall);
        walls.push(backWall);

        // Tường trái
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.2), wallMaterial.clone());
        leftWall.position.set(-5.1, 2.5, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        leftWall.userData.isWall = true;
        roomGroup.add(leftWall);
        walls.push(leftWall);

        // Tường phải (đoạn ngắn)
        const rightWall1 = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 0.2), wallMaterial.clone());
        rightWall1.position.set(5.1, 2.5, -2.5);
        rightWall1.rotation.y = Math.PI / 2;
        rightWall1.receiveShadow = true;
        rightWall1.userData.isWall = true;
        roomGroup.add(rightWall1);
        walls.push(rightWall1);

        // Tường góc trong (quay mặt ra trước)
        const innerWall = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 0.2), wallMaterial.clone());
        innerWall.position.set(7.5, 2.5, -0.1);
        innerWall.receiveShadow = true;
        innerWall.userData.isWall = true;
        roomGroup.add(innerWall);
        walls.push(innerWall);

        // Tường phải xa (đoạn nối dài)
        const rightWall2 = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 0.2), wallMaterial.clone());
        rightWall2.position.set(10.1, 2.5, 2.5);
        rightWall2.rotation.y = Math.PI / 2;
        rightWall2.receiveShadow = true;
        rightWall2.userData.isWall = true;
        roomGroup.add(rightWall2);
        walls.push(rightWall2);
    }

    roomGroup.traverse(child => {
        if (child.isMesh) {
            child.frustumCulled = false;
        }
    });

    return { roomGroup, walls };
}