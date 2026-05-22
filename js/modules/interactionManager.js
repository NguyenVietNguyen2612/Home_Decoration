import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function setupInteractionManager(scene, camera2D, renderer2D, orbitControls2D, camera3D, renderer3D, orbitControls3D) {
    let selectedObjects = [];
    const selectionGroup = new THREE.Group();
    scene.add(selectionGroup);
    let currentTool = 'none'; // Trạng thái công cụ hiện tại: 'none', 'translate', 'rotate', 'scale'
    const interactableObjects = [];

    // Các nút bấm toolbar
    const btnTranslate = document.getElementById('btn-translate');
    const btnRotate = document.getElementById('btn-rotate');
    const btnScale = document.getElementById('btn-scale');
    const btnDelete = document.getElementById('btn-delete');

    function updateToolbarUI() {
        const buttons = { 'translate': btnTranslate, 'rotate': btnRotate, 'scale': btnScale };
        for (const [key, btn] of Object.entries(buttons)) {
            if (btn) {
                if (key === currentTool) {
                    btn.style.backgroundColor = '#b8daff';
                    btn.style.borderColor = '#0056b3';
                    btn.style.color = '#004085';
                    btn.style.fontWeight = 'bold';
                } else {
                    btn.style.backgroundColor = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                    btn.style.fontWeight = 'normal';
                }
            }
        }
    }

    function applySelectionHighlight(object, highlight) {
        if (!object || !object.material) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
            if (!material) return;
            if (highlight) {
                if (!material.userData.originalEmissive) {
                    material.userData.originalEmissive = material.emissive ? material.emissive.clone() : new THREE.Color(0x000000);
                }
                material.emissive = material.emissive || new THREE.Color(0x000000);
                material.emissive.setHex(0xff0000);
                material.emissiveIntensity = 0.4;
            } else if (material.userData && material.userData.originalEmissive) {
                material.emissive.copy(material.userData.originalEmissive);
                delete material.userData.originalEmissive;
            }
        });
        object.userData.isSelected = !!highlight;
    }

    function setTool(tool) {
        currentTool = tool;
        updateToolbarUI();
        
        if (tool !== 'none' && selectedObjects.length > 0) {
            transformControl3D.setMode(tool);
            transformControl2D.setMode(tool);
            const target = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
            transformControl3D.attach(target);
            transformControl2D.attach(target);
        } else {
            transformControl3D.detach();
            transformControl2D.detach();
        }
    }

    // ==========================================
    // 1. TRANSFORM CONTROLS (GIZMO NGUYÊN THỦY)
    // ==========================================
    const transformControl3D = new TransformControls(camera3D, renderer3D.domElement);
    transformControl3D.addEventListener('dragging-changed', function (event) {
        orbitControls3D.enabled = !event.value;
    });
    scene.add(transformControl3D);

    const transformControl2D = new TransformControls(camera2D, renderer2D.domElement);
    transformControl2D.addEventListener('dragging-changed', function (event) {
        orbitControls2D.enabled = !event.value;
    });
    transformControl2D.showY = false; 
    scene.add(transformControl2D);

    const box = new THREE.Box3();
    const center = new THREE.Vector3();

    function updateSelectionGroup() {
        // Trả các object về scene
        while(selectionGroup.children.length > 0) {
            scene.attach(selectionGroup.children[0]);
        }

        if (selectedObjects.length > 1) {
            box.makeEmpty();
            selectedObjects.forEach(obj => box.expandByObject(obj));
            box.getCenter(center);
            
            selectionGroup.position.copy(center);
            selectionGroup.rotation.set(0,0,0);
            selectionGroup.scale.set(1,1,1);
            selectionGroup.updateMatrixWorld();

            selectedObjects.forEach(obj => selectionGroup.attach(obj));
        }
    }

    function selectObject(obj, isMultiSelect) {
        if (!obj) {
            selectedObjects.forEach(o => applySelectionHighlight(o, false));
            selectedObjects = [];
        } else {
            if (isMultiSelect) {
                const index = selectedObjects.indexOf(obj);
                if (index > -1) {
                    applySelectionHighlight(obj, false);
                    selectedObjects.splice(index, 1);
                } else {
                    selectedObjects.push(obj);
                    applySelectionHighlight(obj, true);
                }
            } else {
                if (selectedObjects.length === 1 && selectedObjects[0] === obj) return;
                selectedObjects.forEach(o => applySelectionHighlight(o, false));
                selectedObjects = [obj];
                applySelectionHighlight(obj, true);
            }
        }

        updateSelectionGroup();

        if (selectedObjects.length > 0) {
            const target = selectedObjects.length > 1 ? selectionGroup : selectedObjects[0];
            transformControl3D.attach(target);
            transformControl2D.attach(target);
        } else {
            transformControl3D.detach();
            transformControl2D.detach();
        }
    }

    // ==========================================
    // 2. RAYCASTER (CHỌN TỨC THÌ LÚC BẤM CHUỘT XUỐNG)
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function setupStandardSelection(renderer, camera, transformCtrl) {
        renderer.domElement.style.touchAction = 'none';
        renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return; // Chỉ bắt chuột trái

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(interactableObjects, true);

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && !interactableObjects.includes(obj)) {
                    obj = obj.parent;
                    if (!obj || obj === scene) break;
                }

                if (obj && interactableObjects.includes(obj)) {
                    const isMultiSelect = e.ctrlKey || e.metaKey;
                    selectObject(obj, isMultiSelect);
                    if (selectedObjects.length === 0) {
                        setTool('none');
                    } else if (currentTool === 'none') {
                        setTool('translate');
                    } else {
                        setTool(currentTool);
                    }
                }
            } else {
                selectObject(null, false);
                setTool('none');
            }
        });
    }

    setupStandardSelection(renderer3D, camera3D, transformControl3D);
    setupStandardSelection(renderer2D, camera2D, transformControl2D);

    // ==========================================
    // 3. EVENT PHÍM TẮT & GIAO DIỆN
    // ==========================================
    window.addEventListener('keydown', (event) => {
        switch (event.key.toLowerCase()) {
            case 'w':
                if (selectedObjects.length > 0) setTool('translate');
                break;
            case 'e':
                if (selectedObjects.length > 0) setTool('rotate');
                break;
            case 'r':
                if (selectedObjects.length > 0) setTool('scale');
                break;
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
                    targets.forEach(target => {
                        if(target.parent) target.parent.remove(target);
                        const index = interactableObjects.indexOf(target);
                        if (index > -1) interactableObjects.splice(index, 1);
                    });
                }
                break;
        }
    });

    if(btnTranslate) btnTranslate.addEventListener('click', () => { if(selectedObjects.length > 0) setTool('translate'); else setTool('none'); });
    if(btnRotate) btnRotate.addEventListener('click', () => { if(selectedObjects.length > 0) setTool('rotate'); else setTool('none'); });
    if(btnScale) btnScale.addEventListener('click', () => { if(selectedObjects.length > 0) setTool('scale'); else setTool('none'); });
    if(btnDelete) btnDelete.addEventListener('click', () => {
        if (selectedObjects.length > 0) {
            const targets = [...selectedObjects];
            selectObject(null, false);
            setTool('none');
            targets.forEach(target => {
                if(target.parent) target.parent.remove(target);
                const index = interactableObjects.indexOf(target);
                if (index > -1) interactableObjects.splice(index, 1);
            });
        }
    });

    // Khởi tạo giao diện tool mặc định
    setTool('none');

    function registerInteractableObject(mesh) {
        interactableObjects.push(mesh);
        selectObject(mesh, false);
        setTool('translate'); // Vừa thả vào là tự động nhảy sang Move
    }

    return { registerInteractableObject, interactableObjects };
}
