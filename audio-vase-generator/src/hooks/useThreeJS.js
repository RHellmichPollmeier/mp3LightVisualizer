import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const useThreeJS = (canvasRef) => {
    const sceneRef = useRef();
    const rendererRef = useRef();
    const cameraRef = useRef();
    const meshRef = useRef();
    const animationIdRef = useRef();

    useEffect(() => {
        if (!canvasRef.current) return;

        // Szene Setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f1a);

        const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
        camera.position.set(0, 10, 30);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true
        });
        renderer.setSize(800, 600);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Beleuchtung
        const ambientLight = new THREE.AmbientLight(0x4a90e2, 0.3);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0x87ceeb, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0x64b5f6, 0.6, 100);
        pointLight.position.set(-10, 10, 10);
        scene.add(pointLight);

        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;

        // Animation Loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            if (meshRef.current) {
                meshRef.current.rotation.y += 0.005;
            }

            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [canvasRef]);

    const updateMesh = (geometry, material) => {
        if (!sceneRef.current) return;

        // Altes Mesh entfernen
        if (meshRef.current) {
            sceneRef.current.remove(meshRef.current);
        }

        if (geometry && material) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = 0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            sceneRef.current.add(mesh);
            meshRef.current = mesh;
        }
    };

    return {
        scene: sceneRef.current,
        renderer: rendererRef.current,
        camera: cameraRef.current,
        updateMesh
    };
};