import * as THREE from 'three';

export function setupLighting(scene) {
    // 1. Ánh sáng môi trường (Ambient Light)
    // Cung cấp ánh sáng nền nhẹ, tránh cho bóng đổ bị tối đen hoàn toàn
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
    ambientLight.name = 'ambientLight';
    scene.add(ambientLight);

    // 2. Ánh sáng định hướng (Directional Light) - Mô phỏng ánh sáng mặt trời qua cửa sổ
    const dirLight = new THREE.DirectionalLight(0xfffae6, 1.5);
    dirLight.name = 'dirLight';
    dirLight.position.set(10, 10, 5);
    dirLight.castShadow = true; // Bật đổ bóng
    
    // Thiết lập chất lượng bóng đổ (Shadow map settings)
    dirLight.shadow.mapSize.width = 2048; 
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    
    // Vùng ảnh hưởng của bóng đổ
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // 3. Ánh sáng điểm (Point Light) - Mô phỏng đèn trần trong phòng
    const pointLight = new THREE.PointLight(0xffd700, 1, 10);
    pointLight.name = 'pointLight';
    pointLight.position.set(0, 4, 0);
    pointLight.castShadow = true;
    pointLight.shadow.bias = -0.001;
    scene.add(pointLight);

    // 4. Star Dome (Bầu trời sao dùng cho ban đêm)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000'; // Đen hoàn toàn để dùng làm mask/opacity
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
        ctx.fill();
    }
    const starTex = new THREE.CanvasTexture(canvas);
    starTex.colorSpace = THREE.SRGBColorSpace;
    
    const starGeo = new THREE.SphereGeometry(150, 32, 32); 
    const starMat = new THREE.MeshBasicMaterial({
        map: starTex,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending, // Sáng cộng dồn lên nền
        opacity: 0,
        depthWrite: false // Không che khuất các vật khác
    });
    const starDome = new THREE.Mesh(starGeo, starMat);
    starDome.name = 'starDome';
    // Đảm bảo không bị raycast chọn trúng
    starDome.userData.isInteractable = false;
    scene.add(starDome);

    return { dirLight, pointLight, starDome };
}

function interpolateColor(t, gradient) {
    let start = gradient[0];
    let end = gradient[gradient.length - 1];
    for (let i = 0; i < gradient.length - 1; i++) {
        if (t >= gradient[i].t && t <= gradient[i + 1].t) {
            start = gradient[i];
            end = gradient[i + 1];
            break;
        }
    }
    if (start === end) return start.color.clone();
    const progress = (t - start.t) / (end.t - start.t);
    return start.color.clone().lerp(end.color, progress);
}

function interpolateValue(t, gradient) {
    let start = gradient[0];
    let end = gradient[gradient.length - 1];
    for (let i = 0; i < gradient.length - 1; i++) {
        if (t >= gradient[i].t && t <= gradient[i + 1].t) {
            start = gradient[i];
            end = gradient[i + 1];
            break;
        }
    }
    if (start === end) return start.v;
    const progress = (t - start.t) / (end.t - start.t);
    return start.v + (end.v - start.v) * progress;
}

export function updateTimeOfDay(scene, timeValue) {
    const dirLight = scene.getObjectByName('dirLight');
    const ambientLight = scene.getObjectByName('ambientLight');
    const starDome = scene.getObjectByName('starDome');
    if (!dirLight || !ambientLight) return;

    let t = parseFloat(timeValue);
    
    // --- KHAI BÁO CÁC GRADIENT MÀU SẮC SIÊU THỰC TẾ ---
    const skyGradient = [
        { t: 0, color: new THREE.Color(0x050510) },
        { t: 5, color: new THREE.Color(0x050510) },
        { t: 5.5, color: new THREE.Color(0x1a1a3a) }, // Chạng vạng sáng
        { t: 6, color: new THREE.Color(0xff8c42) },  // Bình minh (Cam)
        { t: 7, color: new THREE.Color(0x87ceeb) },  // Sáng sớm (Xanh dương nhạt)
        { t: 12, color: new THREE.Color(0x4facfe) }, // Trưa (Xanh biển đậm)
        { t: 16, color: new THREE.Color(0x87ceeb) }, // Chiều
        { t: 17.5, color: new THREE.Color(0xff9a44) },// Hoàng hôn
        { t: 18, color: new THREE.Color(0xd25b5b) }, // Chạng vạng đỏ
        { t: 18.5, color: new THREE.Color(0x1a1a3a) },
        { t: 19, color: new THREE.Color(0x050510) },
        { t: 24, color: new THREE.Color(0x050510) }
    ];

    const sunGradient = [
        { t: 0, color: new THREE.Color(0xaaaaee) },
        { t: 5.5, color: new THREE.Color(0xaaaaee) },
        { t: 6, color: new THREE.Color(0xff4500) }, // Nắng sớm cam đỏ
        { t: 7, color: new THREE.Color(0xffd59e) }, // Nắng ban mai vàng ấm
        { t: 12, color: new THREE.Color(0xffffff) },// Nắng gắt trắng
        { t: 17, color: new THREE.Color(0xffd59e) },
        { t: 18, color: new THREE.Color(0xff4500) },
        { t: 18.5, color: new THREE.Color(0xaaaaee) },
        { t: 24, color: new THREE.Color(0xaaaaee) }
    ];

    const ambientColorGradient = [
        { t: 0, color: new THREE.Color(0x88aaff) },
        { t: 5.5, color: new THREE.Color(0x88aaff) },
        { t: 6, color: new THREE.Color(0xffbda1) },
        { t: 7, color: new THREE.Color(0xffffff) },
        { t: 12, color: new THREE.Color(0xffffff) },
        { t: 17, color: new THREE.Color(0xffffff) },
        { t: 18, color: new THREE.Color(0xffbda1) },
        { t: 18.5, color: new THREE.Color(0x88aaff) },
        { t: 24, color: new THREE.Color(0x88aaff) }
    ];

    const intensityGradient = [
        { t: 0, v: 0.3 },
        { t: 5, v: 0.1 },
        { t: 5.8, v: 0.0 }, // Tắt trăng nhường chỗ cho mặt trời
        { t: 6, v: 0.4 },
        { t: 8, v: 1.2 },
        { t: 12, v: 1.6 },
        { t: 16, v: 1.2 },
        { t: 18, v: 0.4 },
        { t: 18.2, v: 0.0 }, // Tắt nắng nhường chỗ cho trăng
        { t: 19, v: 0.3 },
        { t: 24, v: 0.3 }
    ];

    const ambientIntensityGradient = [
        { t: 0, v: 0.15 },
        { t: 5.5, v: 0.15 },
        { t: 6, v: 0.35 },
        { t: 8, v: 0.6 },
        { t: 12, v: 0.8 },
        { t: 16, v: 0.6 },
        { t: 18, v: 0.35 },
        { t: 18.5, v: 0.15 },
        { t: 24, v: 0.15 }
    ];

    // Cập nhật màu sắc từ gradient
    scene.background = interpolateColor(t, skyGradient);
    dirLight.color = interpolateColor(t, sunGradient);
    ambientLight.color = interpolateColor(t, ambientColorGradient);
    
    dirLight.intensity = interpolateValue(t, intensityGradient);
    ambientLight.intensity = interpolateValue(t, ambientIntensityGradient);

    let starOpacity = 0;
    
    if (t >= 5.8 && t <= 18.2) {
        // --- BAN NGÀY & CHẠNG VẠNG (Quỹ đạo Mặt trời) ---
        // Giới hạn t trong khoảng 6->18 để tính góc chuẩn xác
        let sunT = Math.max(6, Math.min(18, t));
        const theta = ((sunT - 6) / 12) * Math.PI; // 0 đến PI
        const sunHeight = Math.sin(theta);
        
        dirLight.position.x = Math.cos(theta) * 30;
        dirLight.position.y = Math.max(0, sunHeight * 30);
        dirLight.position.z = Math.cos(theta) * 15;
        
        // Sao tắt dần khi trời sáng (từ 5.8 đến 7.0)
        if (t < 7) {
            starOpacity = 1.0 - (t - 5.8) / 1.2;
        } else if (t > 17) {
            starOpacity = (t - 17) / 1.2;
        }
    } else {
        // --- BAN ĐÊM (Quỹ đạo Mặt trăng) ---
        let nightT = t > 18.2 ? t - 18.2 : (t + 24 - 18.2); // Tính thời gian trôi qua từ 18:12 tối
        let totalNightDuration = 24 - 18.2 + 5.8; // Khoảng 11.6 tiếng
        const theta = (nightT / totalNightDuration) * Math.PI; // 0 đến PI
        const moonHeight = Math.sin(theta);
        
        dirLight.position.x = Math.cos(theta) * 30;
        dirLight.position.y = Math.max(2, moonHeight * 30); // Giữ trăng ở trên
        dirLight.position.z = Math.cos(theta) * 15;
        
        starOpacity = 1.0;
    }
    
    if (starDome) {
        starDome.material.opacity = Math.max(0, Math.min(1, starOpacity));
    }
    
    scene.userData.backgroundType = 'dynamic_sky';
}