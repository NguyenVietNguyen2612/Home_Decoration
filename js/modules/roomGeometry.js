import * as THREE from 'three';
import { loadTextures } from './textureLoader.js';

export function createRoomGeometry(type = 'room_basic') {
    const textures = loadTextures();
    const roomGroup = new THREE.Group();
    roomGroup.name = 'room';
    roomGroup.userData.isInteractable = true;

    const walls = [];
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0, roughness: 0.8
    });
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xefefef
    });

    if (type === 'room_basic') {
        // --- 1. SÀN NHÀ 10x10 ---
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMaterial);
        floor.name = 'roomFloor';
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        roomGroup.add(floor);

        // --- 2. TƯỜNG ---
        // Tường sau
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 7.5, 0.2), wallMaterial.clone());
        backWall.position.set(0, 3.75, -5.1);
        backWall.receiveShadow = true;
        backWall.userData.isWall = true;
        roomGroup.add(backWall);
        walls.push(backWall);

        // Tường trái
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(10, 7.5, 0.2), wallMaterial.clone());
        leftWall.position.set(-5.1, 3.75, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        leftWall.castShadow = true;
        leftWall.userData.isWall = true;
        roomGroup.add(leftWall);
        walls.push(leftWall);

        backWall.castShadow = true;

        // --- LIGHT BLOCKERS (Invisible walls & ceiling to block light) ---
        const blockerMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
        
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 10.4), blockerMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 7.5, 0);
        ceiling.name = 'lightBlocker';
        roomGroup.add(ceiling);

        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(10.4, 7.5, 0.2), blockerMat);
        frontWall.position.set(0, 3.75, 5.1);
        frontWall.name = 'lightBlocker';
        roomGroup.add(frontWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(10.4, 7.5, 0.2), blockerMat);
        rightWall.position.set(5.1, 3.75, 0);
        rightWall.rotation.y = Math.PI / 2;
        rightWall.name = 'lightBlocker';
        roomGroup.add(rightWall);

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
        rightWall2.castShadow = true;
        rightWall2.userData.isWall = true;
        roomGroup.add(rightWall2);
        walls.push(rightWall2);
        
        backWall.castShadow = true;
        leftWall.castShadow = true;
        rightWall1.castShadow = true;
        innerWall.castShadow = true;
        
        // Light Blockers cho L-shape
        const blockerMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
        
        const ceiling1 = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 10.4), blockerMat);
        ceiling1.rotation.x = Math.PI / 2;
        ceiling1.position.set(0, 5, 0);
        ceiling1.name = 'lightBlocker';
        roomGroup.add(ceiling1);
        
        const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), blockerMat);
        ceiling2.rotation.x = Math.PI / 2;
        ceiling2.position.set(7.5, 5, 2.5);
        ceiling2.name = 'lightBlocker';
        roomGroup.add(ceiling2);
        
        const frontWall1 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5, 0.2), blockerMat);
        frontWall1.position.set(-2.5, 2.5, 5.1);
        frontWall1.name = 'lightBlocker';
        roomGroup.add(frontWall1);
        
        const frontWall2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5, 0.2), blockerMat);
        frontWall2.position.set(7.5, 2.5, 5.1);
        frontWall2.name = 'lightBlocker';
        roomGroup.add(frontWall2);
        
        const rightBlocker = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5, 0.2), blockerMat);
        rightBlocker.position.set(5.1, 2.5, 2.5);
        rightBlocker.rotation.y = Math.PI / 2;
        rightBlocker.name = 'lightBlocker';
        roomGroup.add(rightBlocker);
    }

    roomGroup.traverse(child => {
        if (child.isMesh) {
            child.frustumCulled = false;
        }
    });

    return { roomGroup, walls };
}