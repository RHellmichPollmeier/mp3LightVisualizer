// ============================================
// src/hooks/useThreeJS.js - ERWEITERTE BELEUCHTUNG MIT LICHTBRECHUNG
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
    const environmentLightsRef = useRef([]);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Szene Setup mit dunklerem Hintergrund für Lampenschirm-Effekt
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050810);

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
        renderer.toneMappingExposure = 1.5;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Environment Map für Reflexionen und Refraktionen erstellen
        const envMapSize = 256;
        const envMapCamera = new THREE.CubeCamera(0.1, 100, envMapSize);

        // Environment-Szene mit Gradienten-Hintergrund erstellen
        const envScene = new THREE.Scene();

        // Gradient-Hintergrund für Environment Map
        const gradientGeometry = new THREE.SphereGeometry(50, 32, 32);
        const gradientMaterial = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                topColor: { value: new THREE.Color(0x87ceeb) },    // Himmelblau
                bottomColor: { value: new THREE.Color(0x1e3a8a) }, // Dunkelblau
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `
        });

        const gradientSphere = new THREE.Mesh(gradientGeometry, gradientMaterial);
        envScene.add(gradientSphere);

        // Environment Map generieren
        envMapCamera.position.set(0, 0, 0);
        const envMap = envMapCamera.renderTarget.texture;
        envMapCamera.update(renderer, envScene);

        // Hauptbeleuchtung - Key Light
        const keyLight = new THREE.DirectionalLight(0xfff8dc, 1.2);
        keyLight.position.set(20, 25, 15);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 4096;
        keyLight.shadow.mapSize.height = 4096;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -25;
        keyLight.shadow.camera.right = 25;
        keyLight.shadow.camera.top = 25;
        keyLight.shadow.camera.bottom = -25;
        keyLight.shadow.bias = -0.0001;
        scene.add(keyLight);

        // Fill Light - weicheres Fülllicht
        const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.6);
        fillLight.position.set(-15, 15, 10);
        scene.add(fillLight);

        // Rim Light für dramatische Silhouette
        const rimLight = new THREE.DirectionalLight(0xffa726, 0.8);
        rimLight.position.set(-25, 5, -20);
        scene.add(rimLight);

        // Ambiente Beleuchtung - sehr sanft
        const ambientLight = new THREE.AmbientLight(0x404080, 0.15);
        scene.add(ambientLight);

        // Mehrere Point Lights für komplexe Lichtbrechung
        const pointLights = [
            { color: 0xffffff, intensity: 0.8, position: [15, 20, 10] },
            { color: 0x64b5f6, intensity: 0.6, position: [-10, 15, 15] },
            { color: 0xffa726, intensity: 0.7, position: [5, -10, 20] },
            { color: 0xff6b9d, intensity: 0.5, position: [-20, 8, -10] },
            { color: 0x81c784, intensity: 0.4, position: [12, -15, -8] }
        ];

        pointLights.forEach(lightConfig => {
            const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 100);
            light.position.set(...lightConfig.position);
            scene.add(light);
            environmentLightsRef.current.push(light);
        });

        // Spot Light für fokussierte Beleuchtung
        const spotLight = new THREE.SpotLight(0xffffff, 1.5, 50, Math.PI * 0.1, 0.2, 1);
        spotLight.position.set(0, 30, 0);
        spotLight.target.position.set(0, 0, 0);
        spotLight.castShadow = true;
        scene.add(spotLight);
        scene.add(spotLight.target);

        // Boden mit reflektierenden Eigenschaften
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.4,
            envMap: envMap
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -12;
        ground.receiveShadow = true;
        scene.add(ground);

        // Hintergrund-Objekte für Lichtbrechung
        const bgSphereGeometry = new THREE.SphereGeometry(3, 32, 32);
        const bgSphereMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87ceeb,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3,
            envMap: envMap
        });

        // Mehrere Hintergrund-Kugeln für interessante Brechungseffekte
        const bgPositions = [
            [-30, 10, -20],
            [25, -5, -25],
            [-20, -8, 30],
            [35, 15, -10]
        ];

        bgPositions.forEach(pos => {
            const sphere = new THREE.Mesh(bgSphereGeometry, bgSphereMaterial);
            sphere.position.set(...pos);
            scene.add(sphere);
        });

        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;

        // Animation Loop mit dynamischer Beleuchtung
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const time = Date.now() * 0.001;

            // Vase Rotation
            if (meshRef.current) {
                meshRef.current.rotation.y += 0.008;
                meshRef.current.position.y = Math.sin(time) * 0.5;
            }

            // Dynamische Lichtanimation
            environmentLightsRef.current.forEach((light, index) => {
                const offset = index * Math.PI * 0.4;
                light.intensity = 0.5 + Math.sin(time * 2 + offset) * 0.3;

                // Sanfte Lichtbewegung
                const radius = 20;
                const speed = 0.3;
                light.position.x = Math.sin(time * speed + offset) * radius;
                light.position.z = Math.cos(time * speed + offset) * radius;
            });

            // Innenbeleuchtung animieren
            if (innerLightRef.current) {
                innerLightRef.current.intensity = 2.5 + Math.sin(time * 3) * 0.5;

                // Farbwechsel für dramatische Effekte
                const hue = (time * 0.1) % 1;
                innerLightRef.current.color.setHSL(hue * 0.1 + 0.1, 0.3, 0.7);
            }

            // Key Light Bewegung
            keyLight.position.x = 20 + Math.sin(time * 0.5) * 5;
            keyLight.position.z = 15 + Math.cos(time * 0.5) * 5;

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

// Verbesserte Lampenschirm-Materialien mit besserem Environment-Mapping
export const createWarmLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xfff8e1,
        metalness: 0.0,
        roughness: 0.05,
        transmission: 0.95,
        transparent: true,
        opacity: 0.12,
        thickness: 1.5,
        ior: 1.45,
        emissive: 0xfff3e0,
        emissiveIntensity: 0.08,
        envMapIntensity: 2.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        sheen: 0.8,
        sheenRoughness: 0.1,
        sheenColor: 0xffecb3,
        reflectivity: 0.9
    });
};

export const createCoolLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xe3f2fd,
        metalness: 0.0,
        roughness: 0.03,
        transmission: 0.96,
        transparent: true,
        opacity: 0.1,
        thickness: 1.2,
        ior: 1.5,
        emissive: 0xe1f5fe,
        emissiveIntensity: 0.05,
        envMapIntensity: 2.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        sheen: 0.6,
        sheenRoughness: 0.08,
        sheenColor: 0xe3f2fd,
        reflectivity: 0.95
    });
};

export const createAmberLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffc107,
        metalness: 0.0,
        roughness: 0.08,
        transmission: 0.88,
        transparent: true,
        opacity: 0.2,
        thickness: 2.0,
        ior: 1.55,
        emissive: 0xffb300,
        emissiveIntensity: 0.12,
        envMapIntensity: 1.8,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        sheen: 1.0,
        sheenRoughness: 0.15,
        sheenColor: 0xffd54f,
        reflectivity: 0.85
    });
};

export const createSmokedLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0x795548,
        metalness: 0.0,
        roughness: 0.12,
        transmission: 0.75,
        transparent: true,
        opacity: 0.35,
        thickness: 2.5,
        ior: 1.52,
        emissive: 0x3e2723,
        emissiveIntensity: 0.04,
        envMapIntensity: 1.5,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        sheen: 0.4,
        sheenRoughness: 0.2,
        sheenColor: 0x8d6e63,
        reflectivity: 0.7
    });
};