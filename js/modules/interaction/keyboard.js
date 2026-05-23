export function setupKeyboardControls(context) {
    const { 
        renderer3D, renderer2D, orbitControls3D, camera2D, orbitControls2D, 
        selectedObjects, interactableObjects, collisionManager,
        setTool, selectObject, undo, redo, saveHistoryState
    } = context;

    let hoveredView = '3D'; // Lưu trạng thái chuột đang ở view nào
    renderer3D.domElement.addEventListener('mouseenter', () => hoveredView = '3D');
    renderer2D.domElement.addEventListener('mouseenter', () => hoveredView = '2D');

    // Theo dõi trạng thái phím
    const keys = { w: false, a: false, s: false, d: false };

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const key = e.key.toLowerCase();

        // Xử lý Undo/Redo shortcuts
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                if (redo) redo();
            } else {
                if (undo) undo();
            }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && key === 'y') {
            e.preventDefault();
            if (redo) redo();
            return;
        }

        if (keys.hasOwnProperty(key)) keys[key] = true;

        // Các phím tắt công cụ không cần smooth
        switch (key) {
            case 't': if (selectedObjects.length > 0) setTool('translate'); break;
            case 'e': if (selectedObjects.length > 0) setTool('rotate'); break;
            case 'r': if (selectedObjects.length > 0) setTool('scale'); break;
            case 'q':
                selectObject(null, false);
                setTool('none');
                break;
            case 'delete':
            case 'backspace':
                if (selectedObjects.length > 0) {
                    const targets = [...selectedObjects];
                    selectObject(null, false);
                    setTool('none');
                    targets.forEach(t => {
                        if (t.parent) t.parent.remove(t);
                        const i = interactableObjects.indexOf(t);
                        if (i > -1) interactableObjects.splice(i, 1);
                        if (collisionManager) collisionManager.unregister(t);
                    });
                    if (saveHistoryState) saveHistoryState();
                }
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keys.hasOwnProperty(key)) keys[key] = false;
    });

    // Vòng lặp cập nhật di chuyển mượt mà
    function updateCameraMovement() {
        requestAnimationFrame(updateCameraMovement);

        if (hoveredView === '3D') {
            if (keys.w && orbitControls3D.zoom) orbitControls3D.zoom(0.15);
            if (keys.s && orbitControls3D.zoom) orbitControls3D.zoom(-0.15);
            if (keys.a && orbitControls3D.pan) orbitControls3D.pan(-0.15, 0);
            if (keys.d && orbitControls3D.pan) orbitControls3D.pan(0.15, 0);
        } else if (hoveredView === '2D') {
            const panAmount = 0.4 / camera2D.zoom;
            if (keys.w) {
                camera2D.position.z -= panAmount;
                if (orbitControls2D.target) orbitControls2D.target.z -= panAmount;
                camera2D.updateProjectionMatrix();
            }
            if (keys.s) {
                camera2D.position.z += panAmount;
                if (orbitControls2D.target) orbitControls2D.target.z += panAmount;
                camera2D.updateProjectionMatrix();
            }
            if (keys.a) {
                camera2D.position.x -= panAmount;
                if (orbitControls2D.target) orbitControls2D.target.x -= panAmount;
                camera2D.updateProjectionMatrix();
            }
            if (keys.d) {
                camera2D.position.x += panAmount;
                if (orbitControls2D.target) orbitControls2D.target.x += panAmount;
                camera2D.updateProjectionMatrix();
            }
        }
    }
    updateCameraMovement();
}
