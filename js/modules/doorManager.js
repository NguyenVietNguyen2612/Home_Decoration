import * as THREE from 'three';

export function updateWallHoles(scene) {
    const walls = [];
    const doors = [];
    
    scene.traverse(child => {
        if (child.userData && child.userData.isWall) walls.push(child);
        if (child.userData && child.userData.isDoor) doors.push(child);
    });

    walls.forEach(wall => {
        // Khởi tạo lưu trữ thông số gốc của tường nếu chưa có
        if (!wall.userData.originalParams) {
            wall.geometry.computeBoundingBox();
            const bb = wall.geometry.boundingBox;
            wall.userData.originalParams = {
                w: bb.max.x - bb.min.x,
                h: bb.max.y - bb.min.y,
                d: bb.max.z - bb.min.z
            };
        }
        
        const { w, h, d } = wall.userData.originalParams;
        wall.updateMatrixWorld();
        
        const intersectingHoles = [];
        const wallWorldBox = new THREE.Box3().setFromObject(wall);
        wallWorldBox.expandByScalar(0.1); // Mở rộng một chút để dễ bắt va chạm
        
        doors.forEach(door => {
            door.updateMatrixWorld();
            const doorBox = new THREE.Box3().setFromObject(door);
            
            // Nếu cửa có chạm vào tường
            if (wallWorldBox.intersectsBox(doorBox)) {
                const min = doorBox.min;
                const max = doorBox.max;
                // Lấy 8 đỉnh của bounding box cửa
                const corners = [
                    new THREE.Vector3(min.x, min.y, min.z),
                    new THREE.Vector3(min.x, min.y, max.z),
                    new THREE.Vector3(min.x, max.y, min.z),
                    new THREE.Vector3(min.x, max.y, max.z),
                    new THREE.Vector3(max.x, min.y, min.z),
                    new THREE.Vector3(max.x, min.y, max.z),
                    new THREE.Vector3(max.x, max.y, min.z),
                    new THREE.Vector3(max.x, max.y, max.z)
                ];
                
                let localMinX = Infinity, localMaxX = -Infinity;
                let localMinY = Infinity, localMaxY = -Infinity;
                let localMinZ = Infinity, localMaxZ = -Infinity;
                
                // Chuyển 8 đỉnh sang tọa độ local của tường
                corners.forEach(c => {
                    const localC = wall.worldToLocal(c);
                    if (localC.x < localMinX) localMinX = localC.x;
                    if (localC.x > localMaxX) localMaxX = localC.x;
                    if (localC.y < localMinY) localMinY = localC.y;
                    if (localC.y > localMaxY) localMaxY = localC.y;
                    if (localC.z < localMinZ) localMinZ = localC.z;
                    if (localC.z > localMaxZ) localMaxZ = localC.z;
                });
                
                // Đảm bảo cửa thực sự đâm xuyên qua tường (trục Z của tường)
                if (localMinZ < d/2 && localMaxZ > -d/2) {
                    // Clamp kích thước lỗ nằm gọn trong bức tường (thêm sai số nhỏ để tránh lỗi Earcut khi đục lỗ sát mép)
                    const eps = 0.001;
                    localMinX = Math.max(-w/2 + eps, localMinX);
                    localMaxX = Math.min(w/2 - eps, localMaxX);
                    localMinY = Math.max(-h/2 + eps, localMinY);
                    localMaxY = Math.min(h/2 - eps, localMaxY);
                    
                    if (localMinX < localMaxX && localMinY < localMaxY) {
                        intersectingHoles.push({ minX: localMinX, maxX: localMaxX, minY: localMinY, maxY: localMaxY });
                    }
                }
            }
        });

        // Nếu không có cửa nào xuyên qua, trả tường về BoxGeometry mặc định
        if (intersectingHoles.length === 0) {
            if (wall.userData.hasHole) {
                wall.geometry.dispose();
                wall.geometry = new THREE.BoxGeometry(w, h, d);
                wall.userData.hasHole = false;
            }
        } else {
            // Nếu có lỗ, tạo Shape có holes
            const shape = new THREE.Shape();
            // Chu vi ngoài của bức tường
            shape.moveTo(-w/2, -h/2);
            shape.lineTo(w/2, -h/2);
            shape.lineTo(w/2, h/2);
            shape.lineTo(-w/2, h/2);
            shape.lineTo(-w/2, -h/2);

            // Khoét lỗ cho từng cái cửa
            intersectingHoles.forEach(hole => {
                const holePath = new THREE.Path();
                holePath.moveTo(hole.minX, hole.minY);
                holePath.lineTo(hole.maxX, hole.minY);
                holePath.lineTo(hole.maxX, hole.maxY);
                holePath.lineTo(hole.minX, hole.maxY);
                holePath.lineTo(hole.minX, hole.minY);
                shape.holes.push(holePath);
            });

            // Extrude thành 3D
            const extrudeSettings = { depth: d, bevelEnabled: false };
            let geo;
            try {
                geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                if (!geo.attributes.position || geo.attributes.position.count === 0) {
                    throw new Error("Invalid geometry generated");
                }
            } catch (e) {
                console.error("Failed to generate wall holes:", e);
                return;
            }
            
            // Dịch chuyển lùi lại để khớp với tâm của BoxGeometry cũ
            geo.translate(0, 0, -d/2);
            
            // Sửa lại UV mapping để hình nền tường không bị hỏng
            const posAttr = geo.attributes.position;
            const uvAttr = geo.attributes.uv;
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const z = posAttr.getZ(i);
                
                // Mặt trước và mặt sau của tường
                if (Math.abs(z - d/2) < 0.01 || Math.abs(z + d/2) < 0.01) {
                    uvAttr.setXY(i, (x + w/2) / w, (y + h/2) / h);
                }
            }
            geo.attributes.uv.needsUpdate = true;
            
            wall.geometry.dispose();
            wall.geometry = geo;
            wall.userData.hasHole = true;
        }
    });
}

// Bắt sự kiện double-click để mở cửa
export function setupDoorInteractions(renderer3D, camera3D, scene) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer3D.domElement.addEventListener('dblclick', (e) => {
        const rect = renderer3D.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera3D);

        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            let hit = intersects[0].object;
            // Đi ngược lên tìm parent nào là Door
            let doorObj = null;
            hit.traverseAncestors(ancestor => {
                if (ancestor.userData && ancestor.userData.isDoor) {
                    doorObj = ancestor;
                }
            });

            if (doorObj) {
                // Toggle mở cửa
                doorObj.userData.isOpen = !doorObj.userData.isOpen;
                
                // Hiệu ứng mở cửa mượt mà đơn giản
                const targetRotation = doorObj.userData.isOpen ? Math.PI / 2 : 0;
                
                // Cố gắng xoay cánh cửa con bên trong (nếu model có cấu trúc phân tách khung và cửa)
                // Giả sử cánh cửa là con đầu tiên hoặc chứa chữ 'door'
                let hinge = doorObj; 
                doorObj.traverse(child => {
                    if (child.name.toLowerCase().includes('door') && !child.name.toLowerCase().includes('frame')) {
                        hinge = child; // Xoay riêng cánh cửa nếu tìm thấy
                    }
                });

                // Animation thô sơ (có thể nâng cấp bằng TWEEN)
                const animateDoor = () => {
                    const diff = targetRotation - hinge.rotation.y;
                    if (Math.abs(diff) > 0.05) {
                        hinge.rotation.y += diff * 0.2;
                        requestAnimationFrame(animateDoor);
                    } else {
                        hinge.rotation.y = targetRotation;
                    }
                };
                animateDoor();
            }
        }
    });
}
