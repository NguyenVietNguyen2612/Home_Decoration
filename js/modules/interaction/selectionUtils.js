import * as THREE from 'three';

export function setupSelectionUtils(context) {
    const { scene, selectedObjects } = context;

    const selectionGroup = new THREE.Group();
    selectionGroup.name = '__selectionGroup__';
    selectionGroup.rotation.order = 'YXZ';
    scene.add(selectionGroup);

    const _box = new THREE.Box3();
    const _center = new THREE.Vector3();

    function dissolveGroup() {
        while (selectionGroup.children.length > 0) {
            scene.attach(selectionGroup.children[0]);
        }
    }

    function buildGroup() {
        dissolveGroup();
        if (selectedObjects.length < 2) return;

        _box.makeEmpty();
        selectedObjects.forEach(o => _box.expandByObject(o));
        _box.getCenter(_center);

        selectionGroup.position.copy(_center);
        selectionGroup.rotation.set(0, 0, 0);
        selectionGroup.scale.set(1, 1, 1);
        selectionGroup.updateMatrixWorld(true);

        selectedObjects.forEach(o => selectionGroup.attach(o));
    }

    function applySelectionHighlight(object, highlight) {
        if (!object) return;
        object.traverse(node => {
            if (!node.isMesh) return;
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach(mat => {
                if (!mat) return;
                if (highlight) {
                    if (!mat.userData.origEmissive) {
                        mat.userData.origEmissive = mat.emissive
                            ? mat.emissive.clone()
                            : new THREE.Color(0x000000);
                    }
                    if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
                    mat.emissive.setHex(0xff8800);
                    mat.emissiveIntensity = 0.4;
                } else {
                    if (mat.userData.origEmissive) {
                        mat.emissive.copy(mat.userData.origEmissive);
                        delete mat.userData.origEmissive;
                    }
                }
            });
        });
    }

    return { selectionGroup, buildGroup, dissolveGroup, applySelectionHighlight };
}
