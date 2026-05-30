import { updateWallHoles } from '../doorManager.js';

export function setupToolbarUI(context) {
    const { scene, selectedObjects, interactableObjects, collisionManager, setTool, selectObject, undo, redo, saveHistoryState } = context;

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
            btn.style.backgroundColor = active ? 'rgba(99, 102, 241, 0.2)' : '';
            btn.style.borderColor = active ? '#6366f1' : '';
            btn.style.color = active ? '#ffffff' : '';
            btn.style.fontWeight = active ? 'bold' : '';
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
            updateWallHoles(scene);
            if (saveHistoryState) saveHistoryState();
        }
    });

    if (btnUndo && undo) btnUndo.addEventListener('click', undo);
    if (btnRedo && redo) btnRedo.addEventListener('click', redo);

    return { updateToolbarUI };
}
