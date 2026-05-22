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
     * @returns {{ collides: boolean, collidingWith: THREE.Object3D[] }}
     */
    checkCollision(movingObj, exclude = []) {
        const movingBox     = new THREE.Box3().setFromObject(movingObj);
        const collidingWith = [];

        for (const obj of this._objects) {
            if (obj === movingObj || exclude.includes(obj)) continue;
            const otherBox = new THREE.Box3().setFromObject(obj);
            if (movingBox.intersectsBox(otherBox)) {
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
