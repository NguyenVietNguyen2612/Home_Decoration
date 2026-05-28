import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function setupGizmos(context) {
    const { 
        camera3D, renderer3D, orbitControls3D, 
        camera2D, renderer2D, orbitControls2D, 
        selectedObjects, selectionGroup, collisionManager
    } = context;

    const gizmoScene3D = new THREE.Scene();
    const gizmoScene2D = new THREE.Scene();

    function removeNegativeGizmoArrows(transformControl) {
        const elementsToRemove = [];
        const center = new THREE.Vector3();

        transformControl.traverse(child => {
            if (child.isMesh && child.geometry) {
                child.geometry.computeBoundingBox();
                child.geometry.boundingBox.getCenter(center);
                if (center.x < -0.1 || center.y < -0.1 || center.z < -0.1) {
                    elementsToRemove.push(child);
                }
            }
        });

        elementsToRemove.forEach(el => {
            if (el.parent) el.parent.remove(el);
        });
    }

    function makeConstantWorldSize(transformControl) {
        const gizmo = transformControl._gizmo;
        if (!gizmo) return;

        const originalUpdate = gizmo.updateMatrixWorld;
        gizmo.updateMatrixWorld = function (force) {
            originalUpdate.call(this, force);

            const mode = this.mode;
            if (!this.gizmo || !this.gizmo[mode]) return;

            // CHỈ scale visual handles (gizmo + helper) – KHÔNG scale pickers (hit-area ẩn).
            // Nếu scale cả pickers, khi chọn object lớn (roomGroup), vùng hit-area
            // sẽ che phủ toàn bộ viewport → transformControl.axis !== null mọi lúc
            // → block toàn bộ pointer events → đơ hoàn toàn.
            const visualHandles = [
                ...(this.gizmo[mode] ? this.gizmo[mode].children : []),
                ...(this.helper[mode] ? this.helper[mode].children : []),
            ];

            for (let i = 0; i < visualHandles.length; i++) {
                const handle = visualHandles[i];
                if (handle.name === 'DELTA') continue;
                if (handle.scale.x > 0.0005) {
                    handle.scale.set(2.5, 2.5, 2.5);
                    handle.updateMatrixWorld(true);
                }
            }
        };
    }

    const _sv = {
        pos: new THREE.Vector3(),
        rot: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
        valid: false
    };

    function _saveState(obj) {
        if (!obj) {
            _sv.valid = false;
            return;
        }
        _sv.pos.copy(obj.position);
        _sv.rot.copy(obj.rotation);
        _sv.scale.copy(obj.scale);
        _sv.valid = true;
    }
    
    function _restoreState(obj) {
        if (!_sv.valid) return;
        obj.position.copy(_sv.pos);
        obj.rotation.copy(_sv.rot);
        obj.scale.copy(_sv.scale);
        obj.updateMatrixWorld(true);
    }

    function _onGizmoDown() {
        const t = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
        if (t) _saveState(t);
    }

    function _onGizmoChange() {
        if (!transformControl3D.dragging && !transformControl2D.dragging) return;

        const t = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
        if (!t) return;

        // Bỏ qua roomGroup – không áp dụng floor-clamp hay collision check cho phòng.
        // Box3 của roomGroup có min.y = 0 → điều kiện < 0.02 luôn đúng → phòng bị đẩy lên liên tục.
        if (t.name === 'room' || t.userData.isRoom) {
            if (context.onChange) context.onChange();
            return;
        }

        const objBox = new THREE.Box3().setFromObject(t);
        if (objBox.min.y < 0.02) {
            t.position.y += (0.02 - objBox.min.y);
            t.updateMatrixWorld(true);
        }

        if (!collisionManager) {
            _saveState(t);
            return;
        }


        const { collides, collidingWith } = collisionManager.checkCollision(t, selectedObjects, _sv.pos);

        if (collides) {
            collisionManager.showColliding([...collidingWith]);
            _restoreState(t);
        } else {
            collisionManager.hideAll();
            _saveState(t);
        }
        
        if (context.onChange) context.onChange();
    }

    let _isGizmoDragging = false;
    function _onDragChange(e) {
        _isGizmoDragging = e.value;
        if (e.value) {
            _onGizmoDown();
        } else {
            if (collisionManager) collisionManager.hideAll();
        }
        
        // Cập nhật lại callback bên ngoài nếu cần thiết
        if (context.onDragChange) context.onDragChange(e.value);
    }

    const transformControl3D = new TransformControls(camera3D, renderer3D.domElement);
    transformControl3D.addEventListener('dragging-changed', (e) => {
        if (orbitControls3D && 'enabled' in orbitControls3D) orbitControls3D.enabled = !e.value;
        _onDragChange(e);
    });
    removeNegativeGizmoArrows(transformControl3D);
    makeConstantWorldSize(transformControl3D);
    transformControl3D.setTranslationSnap(0.1); // Bắt dính lưới 0.1 để các object khít nhau
    gizmoScene3D.add(transformControl3D);

    const transformControl2D = new TransformControls(camera2D, renderer2D.domElement);
    transformControl2D.addEventListener('dragging-changed', (e) => {
        if (orbitControls2D && 'enabled' in orbitControls2D) orbitControls2D.enabled = !e.value;
        _onDragChange(e);
    });
    transformControl2D.showY = false;
    removeNegativeGizmoArrows(transformControl2D);
    makeConstantWorldSize(transformControl2D);
    transformControl2D.setTranslationSnap(0.1); // Bắt dính lưới 0.1
    gizmoScene2D.add(transformControl2D);

    transformControl3D.addEventListener('change', _onGizmoChange);
    transformControl2D.addEventListener('change', _onGizmoChange);

    function attachGizmo(currentTool) {
        if (selectedObjects.length === 0 || currentTool === 'none') {
            transformControl3D.detach();
            transformControl2D.detach();
            return;
        }
        const target = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];

        transformControl3D.showY = true;
        transformControl3D.setMode(currentTool);
        transformControl3D.attach(target);
        
        transformControl2D.setMode(currentTool);
        transformControl2D.attach(target);
    }

    return {
        gizmoScene3D,
        gizmoScene2D,
        transformControl3D,
        transformControl2D,
        attachGizmo,
        isGizmoDragging: () => _isGizmoDragging,
        saveState: () => {
            const t = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
            _saveState(t);
        }
    };
}
