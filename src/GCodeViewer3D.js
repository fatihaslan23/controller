// src/GCodeViewer3D.js
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const GCodeViewer3D = ({ gcodeContent, isActive }) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const animationRef = useRef(null);

    // 1. Sahneyi Başlat
    useEffect(() => {
        if (!containerRef.current) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e1e1e);
        sceneRef.current = scene;

        // Camera
        const width = containerRef.current.clientWidth || 100; // 0 gelirse 100 varsay
        const height = containerRef.current.clientHeight || 100;
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        camera.position.set(200, 200, 200); 
        camera.up.set(0, 0, 1); 
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // Helpers
        const gridHelper = new THREE.GridHelper(300, 30, 0x444444, 0x333333);
        gridHelper.rotation.x = Math.PI / 2;
        scene.add(gridHelper);
        const axesHelper = new THREE.AxesHelper(50);
        scene.add(axesHelper);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(10, 10, 50);
        scene.add(dirLight);

        // Animation Loop
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        // Cleanup
        return () => {
            cancelAnimationFrame(animationRef.current);
            if (rendererRef.current && containerRef.current) {
                // containerRef.current null olabilir, kontrol et
                if(containerRef.current.contains(rendererRef.current.domElement)){
                    containerRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            if(rendererRef.current) rendererRef.current.dispose();
        };
    }, []); // Sadece bir kere çalışsın

    // 2. Tab Değiştiğinde Boyutlandır
    useEffect(() => {
        if (isActive && containerRef.current && rendererRef.current && cameraRef.current) {
            // Kısa bir gecikme verelim ki CSS display:block tam otursun
            setTimeout(() => {
                const w = containerRef.current.clientWidth;
                const h = containerRef.current.clientHeight;
                if (w > 0 && h > 0) {
                    cameraRef.current.aspect = w / h;
                    cameraRef.current.updateProjectionMatrix();
                    rendererRef.current.setSize(w, h);
                }
            }, 50);
        }
    }, [isActive]); // isActive değiştiğinde çalışır

    // 3. G-Code'u Çiz
    useEffect(() => {
        if (!gcodeContent || !sceneRef.current) return;

        const scene = sceneRef.current;
        const prevObj = scene.getObjectByName('gcodeGroup');
        if (prevObj) {
            scene.remove(prevObj);
            prevObj.children.forEach(c => {
                if(c.geometry) c.geometry.dispose();
                if(c.material) c.material.dispose();
            });
        }

        const group = new THREE.Group();
        group.name = 'gcodeGroup';

        const lines = gcodeContent.split('\n');
        const positionsExtrude = []; 
        const positionsTravel = []; 

        let x = 0, y = 0, z = 0;
        let lastX = 0, lastY = 0, lastZ = 0;
        let isAbsolute = true; 

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        lines.forEach(line => {
            line = line.trim().toUpperCase();
            if (line.length === 0 || line.startsWith(';')) return;

            if (line.startsWith('G90')) isAbsolute = true;
            if (line.startsWith('G91')) isAbsolute = false;

            if (line.startsWith('G0') || line.startsWith('G1')) {
                const matchX = /X([0-9.-]+)/.exec(line);
                const matchY = /Y([0-9.-]+)/.exec(line);
                const matchZ = /Z([0-9.-]+)/.exec(line);
                const matchE = /E([0-9.-]+)/.exec(line);

                let hasMove = false;
                
                if (matchX) { const val = parseFloat(matchX[1]); x = isAbsolute ? val : x + val; hasMove = true; }
                if (matchY) { const val = parseFloat(matchY[1]); y = isAbsolute ? val : y + val; hasMove = true; }
                if (matchZ) { const val = parseFloat(matchZ[1]); z = isAbsolute ? val : z + val; hasMove = true; }

                if (hasMove) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

                    const isExtruding = matchE && parseFloat(matchE[1]) > 0;

                    if (isExtruding) {
                        positionsExtrude.push(lastX, lastY, lastZ);
                        positionsExtrude.push(x, y, z);
                    } else {
                        positionsTravel.push(lastX, lastY, lastZ);
                        positionsTravel.push(x, y, z);
                    }
                    lastX = x; lastY = y; lastZ = z;
                }
            }
        });

        if (positionsExtrude.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsExtrude, 3));
            const material = new THREE.LineBasicMaterial({ color: 0x34c759 });
            group.add(new THREE.LineSegments(geometry, material));
        }

        if (positionsTravel.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsTravel, 3));
            const material = new THREE.LineBasicMaterial({ color: 0x007aff, opacity: 0.3, transparent: true });
            group.add(new THREE.LineSegments(geometry, material));
        }

        if (maxX > -Infinity) {
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const centerZ = (minZ + maxZ) / 2;
            
            if (controlsRef.current) controlsRef.current.target.set(centerX, centerY, centerZ);
            
            const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
            if (cameraRef.current) cameraRef.current.position.set(centerX + size, centerY + size, centerZ + size);
        }

        scene.add(group);

    }, [gcodeContent]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }} />
    );
};

export default GCodeViewer3D;