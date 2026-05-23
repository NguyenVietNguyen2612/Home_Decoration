import * as THREE from 'three';

/**
 * CollisionManager
 * - Bounding box ẩn theo mặc định
 * - Chỉ hiển thị màu đỏ khi va chạm xảy ra trong lúc kéo
 * - Tự ẩn lại khi kéo kết thúc hoặc không còn va chạm
 */
export class CollisionManager {
    constructor(scene) {
        this.scene    = scene;
        this._objects = [];        // tất cả object đã đăng ký
        this._helpers = new Map(); // object → Box3Helper

        this.COLOR_COLLIDE = 0xff2222; // đỏ – đang va chạm
    }

    // --------------------------------------------------
    // Đăng ký / Hủy đăng ký
    // --------------------------------------------------

    register(obj) {
        if (this._helpers.has(obj)) return;
        this._objects.push(obj);

        const box    = new THREE.Box3().setFromObject(obj);
        const helper = new THREE.Box3Helper(box, this.COLOR_COLLIDE);
        helper.material.transparent = true;
        helper.material.opacity     = 0.85;
        helper.visible = false; // ẩn theo mặc định
        this.scene.add(helper);
        this._helpers.set(obj, helper);
    }

    unregister(obj) {
        // Đảm bảo gỡ cả các object con (như các bức tường của phòng)
        obj.traverse((child) => {
            const idx = this._objects.indexOf(child);
            if (idx > -1) {
                this._objects.splice(idx, 1);
                const helper = this._helpers.get(child);
                if (helper) {
                    this.scene.remove(helper);
                    this._helpers.delete(child);
                }
            }
        });

        const idx = this._objects.indexOf(obj);
        if (idx > -1) this._objects.splice(idx, 1);

        const helper = this._helpers.get(obj);
        if (helper) {
            this.scene.remove(helper);
            this._helpers.delete(obj);
        }
    }

    // --------------------------------------------------
    // Kiểm tra va chạm – trả về danh sách object bị chạm
    // --------------------------------------------------

    /**
     * @param {THREE.Object3D}   movingObj
     * @param {THREE.Object3D[]} [exclude]
     * @param {THREE.Vector3}    [oldPos]
     * @returns {{ collides: boolean, collidingWith: THREE.Object3D[] }}
     */
    checkCollision(movingObj, exclude = [], oldPos = null) {
        const newBox = new THREE.Box3().setFromObject(movingObj);
        let oldBox = null;
        let sweptBox = null;

        if (oldPos) {
            const delta = movingObj.position.clone().sub(oldPos);
            oldBox = newBox.clone().translate(delta.negate());
            sweptBox = newBox.clone().union(oldBox);
        } else {
            sweptBox = newBox;
        }

        const collidingWith = [];

        for (const obj of this._objects) {
            if (obj === movingObj || exclude.includes(obj)) continue;
            
            // Nếu object nằm trong chính cái đang di chuyển (vd: movingObj là phòng, obj là tường)
            let isDescendant = false;
            obj.traverseAncestors((ancestor) => {
                if (ancestor === movingObj) isDescendant = true;
            });
            if (isDescendant) continue;
            
            // Nếu vật di chuyển là PHÒNG, nó chỉ nên bị chặn bởi các TƯỜNG khác (của phòng khác)
            // Không nên bị chặn bởi nội thất, nếu không sẽ không thể di chuyển phòng
            if (movingObj.name === 'room' && !obj.userData.isWall) {
                continue;
            }
            
            const otherBox = new THREE.Box3().setFromObject(obj);
            
            // Thu nhỏ 1mm để chống dính mép khi trượt
            otherBox.expandByScalar(-0.001);
            
            let isColliding = false;
            if (oldBox && oldBox.intersectsBox(otherBox)) {
                // Đã chạm hoặc kẹt từ trước
                const dir = movingObj.position.clone().sub(oldPos);
                
                const cA = new THREE.Vector3();
                const cB = new THREE.Vector3();
                oldBox.getCenter(cA);
                otherBox.getCenter(cB);
                
                // Vector từ A trỏ tới B
                const toB = cB.sub(cA);
                
                // dot > 0.001 nghĩa là đang di chuyển ĐÂM VÀO hoặc XUYÊN QUA tâm B
                if (dir.dot(toB) > 0.001) {
                    isColliding = sweptBox.intersectsBox(otherBox);
                } else {
                    // Đang trượt ngang (dot ~ 0) hoặc lùi ra xa (dot < 0) -> Cho phép!
                    isColliding = false;
                }
            } else {
                // Chưa chạm -> check quét để chống bay xuyên tường
                isColliding = sweptBox.intersectsBox(otherBox);
            }

            if (isColliding) {
                collidingWith.push(obj);
            }
        }

        return { collides: collidingWith.length > 0, collidingWith };
    }

    // --------------------------------------------------
    // Hiển thị / Ẩn bounding box
    // --------------------------------------------------

    /**
     * Hiện bounding box đỏ cho những object đang va chạm.
     * Các object khác vẫn ẩn.
     * @param {THREE.Object3D[]} showList – object cần hiển thị box đỏ
     */
    showColliding(showList) {
        for (const [obj, helper] of this._helpers) {
            const box = new THREE.Box3().setFromObject(obj);
            helper.box.copy(box);

            if (showList.includes(obj)) {
                helper.visible = true;
            } else {
                helper.visible = false;
            }
        }
    }

    /** Ẩn tất cả bounding box */
    hideAll() {
        for (const helper of this._helpers.values()) {
            helper.visible = false;
        }
    }

    /**
     * Gọi mỗi frame để đồng bộ box với vị trí object.
     * (Chỉ cần sync các box đang visible để tiết kiệm CPU)
     */
    update() {
        for (const [obj, helper] of this._helpers) {
            if (!helper.visible) continue;
            const box = new THREE.Box3().setFromObject(obj);
            helper.box.copy(box);
        }
    }

    get objects() { return this._objects; }
}
