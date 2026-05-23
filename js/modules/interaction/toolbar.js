export function setupToolbarUI(context) {
    const { selectedObjects, interactableObjects, collisionManager, setTool, selectObject, undo, redo, saveHistoryState } = context;

    const btnTranslate = document.getElementById('btn-translate');
    const btnRotate = document.getElementById('btn-rotate');
    const btnScale = document.getElementById('btn-scale');
    const btnDelete = document.getElementById('btn-delete');
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    function updateToolbarUI(currentTool) {
        const map = { translate: btnTranslate, rotate: btnRotate, scale: btnScale };
        for (const [key, btn] of Object.entries(map)) {
            if (!btn) continue;
            const active = key === currentTool;
            btn.style.backgroundColor = active ? '#b8daff' : '';
            btn.style.borderColor = active ? '#0056b3' : '';
            btn.style.color = active ? '#004085' : '';
            btn.style.fontWeight = active ? 'bold' : 'normal';
        }
    }

    if (btnTranslate) btnTranslate.addEventListener('click', () => {
        if (selectedObjects.length > 0) setTool('translate');
    });
    if (btnRotate) btnRotate.addEventListener('click', () => {
        if (selectedObjects.length > 0) setTool('rotate');
    });
    if (btnScale) btnScale.addEventListener('click', () => {
        if (selectedObjects.length > 0) setTool('scale');
    });
    if (btnDelete) btnDelete.addEventListener('click', () => {
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
    });

    if (btnUndo && undo) btnUndo.addEventListener('click', undo);
    if (btnRedo && redo) btnRedo.addEventListener('click', redo);

    return { updateToolbarUI };
}
