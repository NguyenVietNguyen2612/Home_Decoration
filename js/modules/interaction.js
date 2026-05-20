import * as THREE from 'three';

export function setupInteraction(camera, interactableObjects) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const doorAnimations = [];

    // Xử lý sự kiện Click chuột
    window.addEventListener('pointerdown', (event) => {
        // Tính tọa độ chuột chuẩn hóa (từ -1 đến +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Kiểm tra đối tượng bị click
        const intersects = raycaster.intersectObjects(interactableObjects, false);

        if (intersects.length > 0) {
            const object = intersects[0].object;

            if (object.userData.isDoor) {
                const targetDoor = object.userData.parentGroup;
                const isOpen = object.userData.isOpen;
                
                // Toggle trạng thái mở đóng
                object.userData.isOpen = !isOpen;

                // Chuẩn bị thực hiện animation xoay 90 độ (PI/2 radian) quanh trục Y
                const targetAngle = isOpen ? 0 : Math.PI / 2;
                
                doorAnimations.push({
                    target: targetDoor,
                    targetRotation: targetAngle,
                    speed: 0.05
                });
            }
        }
    });

    // Hàm cập nhật chạy mỗi frame để làm mượt animation xoay cánh cửa
    function updateAnimations() {
        for (let i = doorAnimations.length - 1; i >= 0; i--) {
            const anim = doorAnimations[i];
            const currentRotation = anim.target.rotation.y;
            
            // Nội suy (Lerp) góc xoay để mượt
            const diff = anim.targetRotation - currentRotation;
            if (Math.abs(diff) < 0.01) {
                anim.target.rotation.y = anim.targetRotation; // Gắn thẳng
                doorAnimations.splice(i, 1); // Đã xoay xong, xóa khỏi queue
            } else {
                anim.target.rotation.y += diff * anim.speed;
            }
        }
    }

    return { updateAnimations };
}