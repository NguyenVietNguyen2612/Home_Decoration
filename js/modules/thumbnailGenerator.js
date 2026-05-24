import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function generateThumbnails(renderer) {
    const items = document.querySelectorAll('.object-item[data-type]');
    const gltfLoader = new GLTFLoader();
    
    // Tạo scene ẩn để render 3D
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5); // Màu nền nhạt để làm nổi bật model
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(3, 2, 3);
    camera.lookAt(0, 0, 0);

    const width = 128;
    const height = 128;
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat
    });

    for (const item of items) {
        const type = item.getAttribute('data-type');
        let path = '';
        
        if (type.startsWith('doors/')) path = `furnitures/doors/${type.replace('doors/', '')}.glb`;
        else if (type.startsWith('things/')) path = `furnitures/things/${type.replace('things/', '')}.glb`;
        else if (type.startsWith('decorations/')) path = `furnitures/decorations/${type.replace('decorations/', '')}.glb`;
        
        if (!path) continue; // Bỏ qua các object cơ bản

        const imgEl = item.querySelector('img');
        if (!imgEl) continue;

        // Ưu tiên load từ cache nếu đã có để tối ưu tốc độ (sử dụng version để ép làm mới nếu cần)
        const cacheKey = 'thumb_v2_' + type;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            imgEl.src = cached;
            continue;
        }

        try {
            // Tải GLB
            const gltf = await new Promise((resolve, reject) => gltfLoader.load(path, resolve, undefined, reject));
            const model = gltf.scene;
            
            // Tính toán Bounding Box chỉ dựa trên Meshes thực tế để tránh camera/light nodes
            const box = new THREE.Box3();
            model.updateMatrixWorld(true);
            model.traverse(child => {
                if (child.isMesh) {
                    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
                    const childBox = child.geometry.boundingBox.clone();
                    childBox.applyMatrix4(child.matrixWorld);
                    box.union(childBox);
                }
            });
            
            // Nếu model trống thì bỏ qua
            if (box.isEmpty()) continue;

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            
            // Bọc model vào Group để Scale không bị lệch tâm
            const group = new THREE.Group();
            group.add(model);
            
            // Đưa trọng tâm của model về (0,0,0) trong Group
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;
            
            // Scale Group để vừa vặn khung hình 2x2x2
            group.scale.setScalar(2.0 / maxDim); 
            
            scene.add(group);
            
            // Render khung hình vào renderTarget
            const oldTarget = renderer.getRenderTarget();
            renderer.setRenderTarget(renderTarget);
            renderer.render(scene, camera);
            renderer.setRenderTarget(oldTarget);
            
            // Trích xuất ảnh PNG từ WebGL buffer
            const buffer = new Uint8Array(width * height * 4);
            renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);
            
            // Flip hệ trục tọa độ Y (do WebGL lưu ảnh lộn ngược)
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(width, height);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const srcIdx = (y * width + x) * 4;
                    const dstIdx = ((height - 1 - y) * width + x) * 4;
                    imgData.data[dstIdx] = buffer[srcIdx];
                    imgData.data[dstIdx+1] = buffer[srcIdx+1];
                    imgData.data[dstIdx+2] = buffer[srcIdx+2];
                    imgData.data[dstIdx+3] = buffer[srcIdx+3];
                }
            }
            
            ctx.putImageData(imgData, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            
            // Lưu vào LocalStorage và cập nhật thẻ img
            try {
                localStorage.setItem(cacheKey, dataUrl);
            } catch(e) {
                console.warn("LocalStorage đầy, không thể lưu cache thumbnail");
            }
            imgEl.src = dataUrl;
            
            // Dọn dẹp bộ nhớ
            scene.remove(group);
        } catch (err) {
            console.error("Lỗi tạo ảnh preview cho:", type, err);
        }
    }
    
    renderTarget.dispose();
}
