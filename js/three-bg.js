// Three.js 3D 背景动画：浮动粒子 + 半透明几何体 + 鼠标视差
// 设计目标：低能耗（粒子数自适应）、不抢内容焦点、主题色自适应
(function() {
    if (typeof THREE === 'undefined') {
        console.warn('three.min.js 未加载，跳过 3D 背景');
        return;
    }

    let scene, camera, renderer, particles, shapes = [];
    let mouseX = 0, mouseY = 0;
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;
    let animationId = null;
    let isVisible = true;

    // 读取当前主题色（CSS 变量）
    function getAccentColor() {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        return v || '#00B4D8';
    }

    // 解析十六进制颜色为 0xRRGGBB
    function parseHex(s) {
        s = s.replace('#', '');
        if (s.length === 3) s = s.split('').map(c => c + c).join('');
        return parseInt(s, 16);
    }

    function init() {
        const canvas = document.getElementById('three-bg-canvas');
        if (!canvas) return;

        const accent = parseHex(getAccentColor());

        // 场景
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xf0f8ff, 0.0008);

        // 相机
        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
        camera.position.z = 800;

        // 渲染器（透明背景，与页面叠加）
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        // ============ 粒子云 ============
        const particleCount = window.innerWidth < 768 ? 400 : 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const baseColor = new THREE.Color(accent);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;

            // 主色调微变化
            const c = baseColor.clone();
            c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.3);
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        particles = new THREE.Points(geometry, material);
        scene.add(particles);

        // ============ 漂浮几何体（线框）============
        const geoFactories = [
            () => new THREE.IcosahedronGeometry(60, 0),
            () => new THREE.OctahedronGeometry(70, 0),
            () => new THREE.TorusGeometry(70, 18, 12, 24),
            () => new THREE.TetrahedronGeometry(80, 0),
        ];

        for (let i = 0; i < 5; i++) {
            const geo = geoFactories[i % geoFactories.length]();
            const mat = new THREE.MeshBasicMaterial({
                color: accent,
                wireframe: true,
                transparent: true,
                opacity: 0.25
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 1400,
                (Math.random() - 0.5) * 900,
                (Math.random() - 0.5) * 800 - 200
            );
            mesh.userData.rotSpeed = {
                x: (Math.random() - 0.5) * 0.004,
                y: (Math.random() - 0.5) * 0.004,
                z: (Math.random() - 0.5) * 0.002
            };
            mesh.userData.floatPhase = Math.random() * Math.PI * 2;
            mesh.userData.basePos = mesh.position.clone();
            shapes.push(mesh);
            scene.add(mesh);
        }

        // 事件监听
        document.addEventListener('mousemove', onMouseMove);
        window.addEventListener('resize', onResize);
        document.addEventListener('visibilitychange', () => {
            isVisible = !document.hidden;
            if (isVisible && !animationId) animate();
        });

        // 主题切换监听：localStorage 变化时刷新颜色
        window.addEventListener('storage', updateColors);
        // 自定义事件，theme.js 可触发
        window.addEventListener('theme-changed', updateColors);

        animate();
    }

    function updateColors() {
        const accent = parseHex(getAccentColor());
        const c = new THREE.Color(accent);
        // 更新几何体
        shapes.forEach(s => s.material.color.set(accent));
        // 更新粒子颜色
        if (particles) {
            const colorAttr = particles.geometry.getAttribute('color');
            const base = new THREE.Color(accent);
            for (let i = 0; i < colorAttr.count; i++) {
                const cc = base.clone();
                cc.offsetHSL(0, 0, (Math.random() - 0.5) * 0.3);
                colorAttr.setXYZ(i, cc.r, cc.g, cc.b);
            }
            colorAttr.needsUpdate = true;
        }
    }

    function onMouseMove(e) {
        mouseX = (e.clientX - windowHalfX) * 0.5;
        mouseY = (e.clientY - windowHalfY) * 0.5;
    }

    function onResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        if (!isVisible) {
            animationId = null;
            return;
        }
        animationId = requestAnimationFrame(animate);

        const t = Date.now() * 0.001;

        // 相机视差跟随鼠标（缓动）
        camera.position.x += (mouseX * 0.3 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 0.3 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        // 粒子缓慢旋转
        if (particles) {
            particles.rotation.y = t * 0.03;
            particles.rotation.x = t * 0.01;
        }

        // 几何体自转 + 浮动
        shapes.forEach(s => {
            s.rotation.x += s.userData.rotSpeed.x;
            s.rotation.y += s.userData.rotSpeed.y;
            s.rotation.z += s.userData.rotSpeed.z;
            s.position.y = s.userData.basePos.y + Math.sin(t + s.userData.floatPhase) * 15;
        });

        renderer.render(scene, camera);
    }

    // 暴露刷新接口给 theme.js
    window.refreshThreeBg = updateColors;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
