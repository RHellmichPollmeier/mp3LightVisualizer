// ============================================
// src/hooks/useThreeJS.js - ERWEITERTE BELEUCHTUNG MIT SPEKTAKULÄRER LICHTBRECHUNG
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

        // Szene Setup mit dunklerem Hintergrund für bessere Lichtbrechung
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020308); // Noch dunkler für dramatischere Effekte

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
        renderer.toneMappingExposure = 2.0; // Erhöht für bessere Lichteffekte
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Environment Map und CubeCamera
        const envMapSize = 256;

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(envMapSize, {
            format: THREE.RGBFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
            magFilter: THREE.LinearFilter
        });

        const envMapCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);

        // Environment-Szene mit verbessertem Gradienten-Hintergrund
        const envScene = new THREE.Scene();

        const gradientGeometry = new THREE.SphereGeometry(50, 32, 32);
        const gradientMaterial = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                topColor: { value: new THREE.Color(0x1a237e) },    // Dunkelblau
                bottomColor: { value: new THREE.Color(0x000051) }, // Sehr dunkelblau
                offset: { value: 33 },
                exponent: { value: 0.8 }
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

        envMapCamera.position.set(0, 0, 0);
        const envMap = cubeRenderTarget.texture;

        // Reduzierte Umgebungsbeleuchtung für dramatischere Lichtbrechung
        const keyLight = new THREE.DirectionalLight(0xfff8dc, 0.8); // Reduziert
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

        // Sanfteres Fill Light
        const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3); // Reduziert
        fillLight.position.set(-15, 15, 10);
        scene.add(fillLight);

        // Rim Light
        const rimLight = new THREE.DirectionalLight(0xffa726, 0.4); // Reduziert
        rimLight.position.set(-25, 5, -20);
        scene.add(rimLight);

        // Minimale Ambiente Beleuchtung
        const ambientLight = new THREE.AmbientLight(0x404080, 0.05); // Sehr reduziert
        scene.add(ambientLight);

        // Weniger intensive Point Lights für subtilere Umgebung
        const pointLights = [
            { color: 0xffffff, intensity: 0.4, position: [15, 20, 10] },
            { color: 0x64b5f6, intensity: 0.3, position: [-10, 15, 15] },
            { color: 0xffa726, intensity: 0.3, position: [5, -10, 20] },
        ];

        pointLights.forEach(lightConfig => {
            const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 100);
            light.position.set(...lightConfig.position);
            scene.add(light);
            environmentLightsRef.current.push(light);
        });

        // Environment Map initial rendern
        envMapCamera.update(renderer, envScene);

        // Reflektierender Boden für dramatische Reflexionen
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0f,
            metalness: 0.8,
            roughness: 0.1,
            transparent: true,
            opacity: 0.6,
            envMap: envMap
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -15;
        ground.receiveShadow = true;
        scene.add(ground);

        // Weniger Hintergrund-Objekte für klarere Sicht auf Brechungseffekte
        const bgSphereGeometry = new THREE.SphereGeometry(2, 32, 32);
        const bgSphereMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x3f51b5,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.2,
            envMap: envMap
        });

        const bgPositions = [
            [-25, 8, -20],
            [30, 12, -15]
        ];

        bgPositions.forEach(pos => {
            const sphere = new THREE.Mesh(bgSphereGeometry, bgSphereMaterial);
            sphere.position.set(...pos);
            scene.add(sphere);
        });

        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;

        // Animation Loop mit verbesserter Lichtanimation
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const time = Date.now() * 0.001;

            // Vase Rotation
            if (meshRef.current) {
                meshRef.current.rotation.y += 0.008;
                meshRef.current.position.y = Math.sin(time * 0.5) * 0.3; // Langsamere Bewegung
            }

            // Subtilere Umgebungslicht-Animation
            environmentLightsRef.current.forEach((light, index) => {
                const offset = index * Math.PI * 0.6;
                light.intensity = 0.2 + Math.sin(time * 1.5 + offset) * 0.15;
            });

            // Erweiterte Animation für Innenlicht-Gruppe
            if (innerLightRef.current) {
                // Haupt-Bodenlicht animieren
                const mainLight = innerLightRef.current.children[0];
                if (mainLight) {
                    mainLight.intensity = 3.5 + Math.sin(time * 2) * 1.0;
                }

                // Farbige Lichter rotieren lassen
                innerLightRef.current.children.forEach((light, index) => {
                    if (index > 0 && index < 5) { // Nur die farbigen Point Lights
                        const angle = time * 0.8 + index * Math.PI * 0.5;
                        const radius = 4;
                        const originalY = light.position.y;
                        light.position.x = Math.sin(angle) * radius;
                        light.position.z = Math.cos(angle) * radius;

                        // Intensität pulsieren lassen
                        light.intensity = 1.5 + Math.sin(time * 3 + index) * 0.8;
                    }
                });

                // Spot Light leicht bewegen
                const spotLight = innerLightRef.current.children[5];
                if (spotLight) {
                    spotLight.intensity = 2.5 + Math.sin(time * 1.5) * 0.8;
                    spotLight.angle = Math.PI * 0.3 + Math.sin(time) * 0.1;
                }
            }

            // Sanfte Key Light Bewegung
            keyLight.position.x = 20 + Math.sin(time * 0.3) * 3;
            keyLight.position.z = 15 + Math.cos(time * 0.3) * 3;

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

            // Bodenlicht-Gruppe hinzufügen (automatisch an Vasenhöhe angepasst)
            const vaseHeight = 20; // Standard-Vasenhöhe, könnte aus settings kommen
            const innerLightGroup = createInnerLight(vaseHeight);
            sceneRef.current.add(innerLightGroup);
            innerLightRef.current = innerLightGroup;
        }
    };

    return {
        scene: sceneRef.current,
        renderer: rendererRef.current,
        camera: cameraRef.current,
        updateMesh
    };
};

// Verbesserte Lampenschirm-Materialien für bessere Lichtbrechung
export const createWarmLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xfff8e1,
        metalness: 0.0,
        roughness: 0.02,          // Sehr glatt für klare Brechung
        transmission: 0.97,       // Sehr durchsichtig
        transparent: true,
        opacity: 0.08,            // Sehr transparent
        thickness: 1.8,
        ior: 1.52,                // Höherer Brechungsindex für stärkere Brechung
        emissive: 0xfff3e0,
        emissiveIntensity: 0.03,
        envMapIntensity: 2.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        sheen: 0.9,
        sheenRoughness: 0.05,
        sheenColor: 0xffecb3,
        reflectivity: 0.95
    });
};

export const createCoolLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xe3f2fd,
        metalness: 0.0,
        roughness: 0.01,
        transmission: 0.98,
        transparent: true,
        opacity: 0.06,
        thickness: 1.5,
        ior: 1.55,
        emissive: 0xe1f5fe,
        emissiveIntensity: 0.02,
        envMapIntensity: 2.8,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        sheen: 0.7,
        sheenRoughness: 0.04,
        sheenColor: 0xe3f2fd,
        reflectivity: 0.98
    });
};

export const createAmberLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffc107,
        metalness: 0.0,
        roughness: 0.04,
        transmission: 0.92,
        transparent: true,
        opacity: 0.15,
        thickness: 2.2,
        ior: 1.58,
        emissive: 0xffb300,
        emissiveIntensity: 0.08,
        envMapIntensity: 2.2,
        clearcoat: 0.95,
        clearcoatRoughness: 0.06,
        sheen: 1.0,
        sheenRoughness: 0.1,
        sheenColor: 0xffd54f,
        reflectivity: 0.9
    });
};

export const createSmokedLampshade = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0x795548,
        metalness: 0.0,
        roughness: 0.08,
        transmission: 0.85,
        transparent: true,
        opacity: 0.25,
        thickness: 2.8,
        ior: 1.56,
        emissive: 0x3e2723,
        emissiveIntensity: 0.02,
        envMapIntensity: 2.0,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        sheen: 0.5,
        sheenRoughness: 0.15,
        sheenColor: 0x8d6e63,
        reflectivity: 0.8
    });
};