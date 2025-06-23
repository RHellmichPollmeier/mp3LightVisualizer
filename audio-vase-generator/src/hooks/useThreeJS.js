// ============================================
// src/hooks/useThreeJS.js - VERBESSERTE BELEUCHTUNG
// ============================================
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createInnerLight } from '../mesh/vaseGeometry.js';

export const useThreeJS = (canvasRef) => {
    const sceneRef = useRef();
    const rendererRef = useRef();
    const cameraRef = useRef();
    const meshRef = useRef();
    const innerLightRef = useRef();
    const animationIdRef = useRef();

    useEffect(() => {
        if (!canvasRef.current) return;

        // Szene Setup mit dunklerem Hintergrund für Lampenschirm-Effekt
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050810); // Dunkler für besseren Kontrast

        const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
        camera.position.set(0, 10, 30);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true
        });
        renderer.setSize(800, 600);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // Ambiente Beleuchtung - gedämpft
        const ambientLight = new THREE.AmbientLight(0x404080, 0.2);
        scene.add(ambientLight);

        // Haupt-Beleuchtung - sanfter
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
        mainLight.position.set(15, 15, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        scene.add(mainLight);

        // Rim Light für Silhouette
        const rimLight = new THREE.DirectionalLight(0x87ceeb, 0.4);
        rimLight.position.set(-10, 5, -10);
        scene.add(rimLight);

        // Warmes Akzentlicht
        const accentLight = new THREE.PointLight(0xffa726, 0.8, 100);
        accentLight.position.set(5, -5, 15);
        scene.add(accentLight);

        // Boden für Reflexionen
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.1,
            roughness: 0.8,
            transparent: true,
            opacity: 0.3
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -12;
        ground.receiveShadow = true;
        scene.add(ground);

        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;

        // Animation Loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            if (meshRef.current) {
                meshRef.current.rotation.y += 0.008; // Etwas langsamer für bessere Betrachtung

                // Sanfte Auf-und-Ab Bewegung für dynamischen Effekt
                meshRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.5;
            }

            // Innenbeleuchtung animieren (optional)
            if (innerLightRef.current) {
                innerLightRef.current.intensity = 2 + Math.sin(Date.now() * 0.003) * 0.3;
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

        // Altes Mesh und Licht entfernen
        if (meshRef.current) {
            sceneRef.current.remove(meshRef.current);
        }
        if (innerLightRef.current) {
            sceneRef.current.remove(innerLightRef.current);
        }

        if (geometry && material) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = 0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            sceneRef.current.add(mesh);
            meshRef.current = mesh;

            // Innenbeleuchtung hinzufügen
            const innerLight = createInnerLight();
            sceneRef.current.add(innerLight);
            innerLightRef.current = innerLight;
        }
    };

    return {
        scene: sceneRef.current,
        renderer: rendererRef.current,
        camera: cameraRef.current,
        updateMesh
    };
};

// ============================================
// Alternative Materialen für verschiedene Lampenschirm-Stile
// ============================================

// Warmer Lampenschirm (Standard)
export const createWarmLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xfff8e1,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.95,
        transparent: true,
        opacity: 0.15,
        thickness: 1.2,
        ior: 1.45,
        emissive: 0xfff3e0,
        emissiveIntensity: 0.05
    });
};

// Kühler, moderner Lampenschirm
export const createCoolLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xe3f2fd,
        metalness: 0.0,
        roughness: 0.08,
        transmission: 0.92,
        transparent: true,
        opacity: 0.12,
        thickness: 1.0,
        ior: 1.5,
        emissive: 0xe1f5fe,
        emissiveIntensity: 0.03
    });
};

// Bernstein/Amber Lampenschirm
export const createAmberLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffc107,
        metalness: 0.0,
        roughness: 0.12,
        transmission: 0.88,
        transparent: true,
        opacity: 0.25,
        thickness: 1.5,
        ior: 1.55,
        emissive: 0xffb300,
        emissiveIntensity: 0.08
    });
};

// Rauchglas Lampenschirm
export const createSmokedLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0x795548,
        metalness: 0.0,
        roughness: 0.15,
        transmission: 0.7,
        transparent: true,
        opacity: 0.4,
        thickness: 2.0,
        ior: 1.52,
        emissive: 0x3e2723,
        emissiveIntensity: 0.02
    });
};