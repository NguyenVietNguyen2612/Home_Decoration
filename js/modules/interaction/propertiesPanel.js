import * as THREE from 'three';

export function setupPropertiesPanel(context) {
    const { selectedObjects, saveHistoryState, scene, updateWallHoles } = context;

    const panel = document.getElementById('properties-panel');
    const inputs = {
        posX: document.getElementById('prop-pos-x'),
        posY: document.getElementById('prop-pos-y'),
        posZ: document.getElementById('prop-pos-z'),
        rotX: document.getElementById('prop-rot-x'),
        rotY: document.getElementById('prop-rot-y'),
        rotZ: document.getElementById('prop-rot-z'),
        rotZ: document.getElementById('prop-rot-z'),
        scaleX: document.getElementById('prop-scale-x'),
        scaleY: document.getElementById('prop-scale-y'),
        scaleZ: document.getElementById('prop-scale-z')
    };
    
    const propContent = document.getElementById('prop-content');
    const toggleBtn = document.getElementById('btn-toggle-props');
    if (toggleBtn && propContent) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = propContent.style.display === 'none';
            propContent.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '▼' : '▲';
        });
    }

    if (!panel) return { updatePropertiesPanel: () => {} };

    let isUpdating = false;

    function getMixedValue(objects, extractFn) {
        if (objects.length === 0) return null;
        let firstValue = extractFn(objects[0]);
        for (let i = 1; i < objects.length; i++) {
            if (Math.abs(extractFn(objects[i]) - firstValue) > 0.01) {
                return null; // mixed
            }
        }
        return firstValue;
    }

    function setInputUI(input, val, isRot = false) {
        if (!input) return;
        if (val === null) {
            input.value = '';
            input.placeholder = '-';
        } else {
            let v = isRot ? THREE.MathUtils.radToDeg(val) : val;
            input.value = isRot ? v.toFixed(1) : v.toFixed(2);
            input.placeholder = '';
        }
    }

    function updatePropertiesPanel() {
        if (selectedObjects.length >= 1) {
            panel.classList.remove('hidden');
            
            isUpdating = true;
            
            const px = getMixedValue(selectedObjects, o => o.position.x);
            const py = getMixedValue(selectedObjects, o => o.position.y);
            const pz = getMixedValue(selectedObjects, o => o.position.z);
            
            const rx = getMixedValue(selectedObjects, o => o.rotation.x);
            const ry = getMixedValue(selectedObjects, o => o.rotation.y);
            const rz = getMixedValue(selectedObjects, o => o.rotation.z);
            
            const sx = getMixedValue(selectedObjects, o => o.scale.x);
            const sy = getMixedValue(selectedObjects, o => o.scale.y);
            const sz = getMixedValue(selectedObjects, o => o.scale.z);
            
            setInputUI(inputs.posX, px);
            setInputUI(inputs.posY, py);
            setInputUI(inputs.posZ, pz);
            
            setInputUI(inputs.rotX, rx, true);
            setInputUI(inputs.rotY, ry, true);
            setInputUI(inputs.rotZ, rz, true);
            
            setInputUI(inputs.scaleX, sx);
            setInputUI(inputs.scaleY, sy);
            setInputUI(inputs.scaleZ, sz);
            
            isUpdating = false;
        } else {
            panel.classList.add('hidden');
        }
    }

    function applyProperties() {
        if (isUpdating || selectedObjects.length === 0) return;

        const hasPx = inputs.posX && inputs.posX.value !== '';
        const hasPy = inputs.posY && inputs.posY.value !== '';
        const hasPz = inputs.posZ && inputs.posZ.value !== '';
        
        const hasRx = inputs.rotX && inputs.rotX.value !== '';
        const hasRy = inputs.rotY && inputs.rotY.value !== '';
        const hasRz = inputs.rotZ && inputs.rotZ.value !== '';
        
        const hasSx = inputs.scaleX && inputs.scaleX.value !== '';
        const hasSy = inputs.scaleY && inputs.scaleY.value !== '';
        const hasSz = inputs.scaleZ && inputs.scaleZ.value !== '';

        const pX = hasPx ? parseFloat(inputs.posX.value) || 0 : 0;
        const pY = hasPy ? parseFloat(inputs.posY.value) || 0 : 0;
        const pZ = hasPz ? parseFloat(inputs.posZ.value) || 0 : 0;
        
        const rX = hasRx ? THREE.MathUtils.degToRad(parseFloat(inputs.rotX.value) || 0) : 0;
        const rY = hasRy ? THREE.MathUtils.degToRad(parseFloat(inputs.rotY.value) || 0) : 0;
        const rZ = hasRz ? THREE.MathUtils.degToRad(parseFloat(inputs.rotZ.value) || 0) : 0;
        
        let sX = hasSx ? parseFloat(inputs.scaleX.value) || 1 : 1;
        let sY = hasSy ? parseFloat(inputs.scaleY.value) || 1 : 1;
        let sZ = hasSz ? parseFloat(inputs.scaleZ.value) || 1 : 1;
        
        if (sX <= 0) sX = 0.01;
        if (sY <= 0) sY = 0.01;
        if (sZ <= 0) sZ = 0.01;

        selectedObjects.forEach(obj => {
            if (hasPx) obj.position.x = pX;
            if (hasPy) obj.position.y = pY;
            if (hasPz) obj.position.z = pZ;
            
            if (hasRx) obj.rotation.x = rX;
            if (hasRy) obj.rotation.y = rY;
            if (hasRz) obj.rotation.z = rZ;
            
            if (hasSx) obj.scale.x = sX;
            if (hasSy) obj.scale.y = sY;
            if (hasSz) obj.scale.z = sZ;
            
            obj.updateMatrixWorld(true);
        });

        if (updateWallHoles) updateWallHoles(scene);
        
        // Cập nhật lại helpers (transform controls)
        if (context.onPropertyChange) context.onPropertyChange();
    }

    // Attach listeners
    Object.values(inputs).forEach(input => {
        if (!input) return;
        input.addEventListener('change', () => {
            applyProperties();
            if (saveHistoryState) saveHistoryState();
        });
        input.addEventListener('input', () => {
            applyProperties();
        });
    });

    return { updatePropertiesPanel };
}
