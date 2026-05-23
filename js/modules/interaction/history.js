export function setupHistoryManager(context) {
    const { scene, interactableObjects, collisionManager, selectObject, setTool } = context;

    let undoStack = [];
    let redoStack = [];
    const MAX_HISTORY = 30;

    function captureState() {
        return interactableObjects.map(mesh => ({
            mesh: mesh,
            position: mesh.position.clone(),
            rotation: mesh.rotation.clone(),
            scale: mesh.scale.clone()
        }));
    }

    function saveHistoryState() {
        undoStack.push(captureState());
        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift();
        }
        redoStack = []; // Clear redo stack on new action
    }

    function applyState(state) {
        // Deselect current objects
        selectObject(null, false);
        setTool('none');

        // Determine objects to remove
        const stateMeshes = state.map(item => item.mesh);
        const toRemove = interactableObjects.filter(mesh => !stateMeshes.includes(mesh));

        toRemove.forEach(mesh => {
            if (mesh.parent) mesh.parent.remove(mesh);
            const idx = interactableObjects.indexOf(mesh);
            if (idx > -1) interactableObjects.splice(idx, 1);
            if (collisionManager && mesh.userData.isCollidable) {
                collisionManager.unregister(mesh);
            }
        });

        // Determine objects to add and apply transforms
        state.forEach(item => {
            const mesh = item.mesh;
            mesh.position.copy(item.position);
            mesh.rotation.copy(item.rotation);
            mesh.scale.copy(item.scale);
            mesh.updateMatrixWorld(true);

            if (!interactableObjects.includes(mesh)) {
                scene.add(mesh);
                interactableObjects.push(mesh);
                if (collisionManager && mesh.userData.isCollidable !== false) {
                    collisionManager.register(mesh);
                }
            }
        });

        if (collisionManager) collisionManager.update();
    }

    function undo() {
        if (undoStack.length === 0) return;
        // Save current state to redo stack
        redoStack.push(captureState());
        
        // Pop and apply undo state
        const prevState = undoStack.pop();
        applyState(prevState);
    }

    function redo() {
        if (redoStack.length === 0) return;
        // Save current state to undo stack
        undoStack.push(captureState());

        // Pop and apply redo state
        const nextState = redoStack.pop();
        applyState(nextState);
    }

    // Capture initial state
    setTimeout(saveHistoryState, 500);

    return {
        saveHistoryState,
        undo,
        redo
    };
}
