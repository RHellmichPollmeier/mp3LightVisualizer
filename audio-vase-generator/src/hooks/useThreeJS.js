// ============================================
// src/hooks/useThreeJS.js - DUALER BELEUCHTUNGSMODUS + STL-SOCKEL
// ============================================
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createInnerLight } from '../mesh/vaseGeometry.js';

export const useThreeJS = (canvasRef, isRefractionMode = false) => {
    const sceneRef = useRef();
    const rendererRef = useRef();
    const cameraRef = useRef();
    const meshRef = useRef();
    const baseMeshRef = useRef();  // NEUER REF für STL-Sockel
    const innerLightRef = useRef();
    const animationIdRef = useRef();
    const environmentLightsRef = useRef([]);
    const lightModeRef = useRef(isRefractionMode);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Szene Setup - Hintergrundfarbe basierend auf Modus
        const scene = new THREE.Scene();
        const backgroundColor = isRefractionMode ? 0x020308 : 0x87ceeb; // Dunkel vs. Himmelblau
        scene.background = new THREE.Color(backgroundColor);

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
        renderer.toneMappingExposure = isRefractionMode ? 2.0 : 1.2; // Unterschiedliche Belichtung
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

        // Environment-Szene - Angepasst an Modus
        const envScene = new THREE.Scene();
        const gradientGeometry = new THREE.SphereGeometry(50, 32, 32);

        let gradientMaterial;
        if (isRefractionMode) {
            // Dunkler Gradient für Lichtbrechungs-Modus
            gradientMaterial = new THREE.ShaderMaterial({
                side: THREE.BackSide,
                uniforms: {
                    topColor: { value: new THREE.Color(0x1a237e) },
                    bottomColor: { value: new THREE.Color(0x000051) },
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
        } else {
            // Heller Gradient für Hell-Modus
            gradientMaterial = new THREE.ShaderMaterial({
                side: THREE.BackSide,
                uniforms: {
                    topColor: { value: new THREE.Color(0x87ceeb) },    // Himmelblau
                    bottomColor: { value: new THREE.Color(0xe3f2fd) }, // Hellblau
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
        }

        const gradientSphere = new THREE.Mesh(gradientGeometry, gradientMaterial);
        envScene.add(gradientSphere);

        envMapCamera.position.set(0, 0, 0);
        const envMap = cubeRenderTarget.texture;

        // BELEUCHTUNG - Komplett unterschiedlich je nach Modus
        let keyLight, fillLight, rimLight, ambientLight;

        if (isRefractionMode) {
            // LICHTBRECHUNGS-MODUS: Reduzierte Umgebungsbeleuchtung
            keyLight = new THREE.DirectionalLight(0xfff8dc, 0.8);
            fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
            rimLight = new THREE.DirectionalLight(0xffa726, 0.4);
            ambientLight = new THREE.AmbientLight(0x404080, 0.05);
        } else {
            // HELL-MODUS: Normale, starke Beleuchtung
            keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
            fillLight = new THREE.DirectionalLight(0x87ceeb, 0.8);
            rimLight = new THREE.DirectionalLight(0xffa726, 0.6);
            ambientLight = new THREE.AmbientLight(0x404080, 0.3);
        }

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

        fillLight.position.set(-15, 15, 10);
        scene.add(fillLight);

        rimLight.position.set(-25, 5, -20);
        scene.add(rimLight);

        scene.add(ambientLight);

        // Point Lights - Nur im Hell-Modus aktiv
        if (!isRefractionMode) {
            const pointLights = [
                { color: 0xffffff, intensity: 0.6, position: [15, 20, 10] },
                { color: 0x64b5f6, intensity: 0.5, position: [-10, 15, 15] },
                { color: 0xffa726, intensity: 0.5, position: [5, -10, 20] },
                { color: 0xff6b9d, intensity: 0.4, position: [-20, 8, -10] },
                { color: 0x81c784, intensity: 0.3, position: [12, -15, -8] }
            ];

            pointLights.forEach(lightConfig => {
                const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 100);
                light.position.set(...lightConfig.position);
                scene.add(light);
                environmentLightsRef.current.push(light);
            });
        } else {
            // Reduzierte Point Lights für Lichtbrechungs-Modus
            const pointLights = [
                { color: 0xffffff, intensity: 0.3, position: [15, 20, 10] },
                { color: 0x64b5f6, intensity: 0.2, position: [-10, 15, 15] },
            ];

            pointLights.forEach(lightConfig => {
                const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 100);
                light.position.set(...lightConfig.position);
                scene.add(light);
                environmentLightsRef.current.push(light);
            });
        }

        // Environment Map initial rendern
        envMapCamera.update(renderer, envScene);

        // Boden - Angepasst an Modus
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        let groundMaterial;

        if (isRefractionMode) {
            // Reflektierender dunkler Boden
            groundMaterial = new THREE.MeshStandardMaterial({
                color: 0x0a0a0f,
                metalness: 0.8,
                roughness: 0.1,
                transparent: true,
                opacity: 0.6,
                envMap: envMap
            });
        } else {
            // Normaler heller Boden
            groundMaterial = new THREE.MeshStandardMaterial({
                color: 0xf5f5f5,
                metalness: 0.1,
                roughness: 0.8,
                transparent: true,
                opacity: 0.8,
                envMap: envMap
            });
        }

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -15;
        ground.receiveShadow = true;
        scene.add(ground);

        // Hintergrund-Objekte - Nur im Hell-Modus
        if (!isRefractionMode) {
            const bgSphereGeometry = new THREE.SphereGeometry(3, 32, 32);
            const bgSphereMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x87ceeb,
                metalness: 0.1,
                roughness: 0.1,
                transparent: true,
                opacity: 0.3,
                envMap: envMap
            });

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
        }

        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;
        lightModeRef.current = isRefractionMode;

        // Animation Loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const time = Date.now() * 0.001;

            // Vase Rotation
            if (meshRef.current) {
                meshRef.current.rotation.y += 0.008;

                // Basis-Position der Vase ermitteln
                let vaseBaseY = 0; // Standard: auf dem Boden

                if (baseMeshRef.current) {
                    // Sockel ist vorhanden: Basis-Position auf Sockel berechnen
                    baseMeshRef.current.geometry.computeBoundingBox();
                    const sockelBox = baseMeshRef.current.geometry.boundingBox;
                    const sockelScale = baseMeshRef.current.scale.x;

                    const sockelHoehe = (sockelBox.max.y - sockelBox.min.y) * sockelScale;
                    const sockelMinY = sockelBox.min.y * sockelScale;
                    const sockelOberseite = -sockelMinY + sockelHoehe;
                    const vaseHalbeHoehe = 10;
                    vaseBaseY = sockelOberseite - vaseHalbeHoehe;
                }

                // Sanfte Animation um die Basis-Position
                if (isRefractionMode) {
                    meshRef.current.position.y = vaseBaseY + Math.sin(time * 0.5) * 0.3;
                } else {
                    meshRef.current.position.y = vaseBaseY + Math.sin(time) * 0.5;
                }
            }

            // Sockel leichte Rotation (langsamer als Vase)
            if (baseMeshRef.current) {
                baseMeshRef.current.rotation.y += 0.003;
            }

            // Lichtanimation - Nur wenn es Lichter gibt
            if (environmentLightsRef.current.length > 0) {
                environmentLightsRef.current.forEach((light, index) => {
                    const offset = index * Math.PI * 0.4;
                    const baseIntensity = isRefractionMode ? 0.2 : 0.5;
                    const variation = isRefractionMode ? 0.1 : 0.3;
                    light.intensity = baseIntensity + Math.sin(time * 2 + offset) * variation;

                    if (!isRefractionMode) {
                        // Lichtbewegung nur im Hell-Modus
                        const radius = 20;
                        const speed = 0.3;
                        light.position.x = Math.sin(time * speed + offset) * radius;
                        light.position.z = Math.cos(time * speed + offset) * radius;
                    }
                });
            }

            // Spezielle Animation für Lichtbrechungs-Modus
            if (innerLightRef.current && isRefractionMode) {
                // Lichter mit der Vase synchronisieren
                let vaseBaseY = 0;
                if (baseMeshRef.current) {
                    baseMeshRef.current.geometry.computeBoundingBox();
                    const sockelBox = baseMeshRef.current.geometry.boundingBox;
                    const sockelScale = baseMeshRef.current.scale.x;

                    const sockelHoehe = (sockelBox.max.y - sockelBox.min.y) * sockelScale;
                    const sockelMinY = sockelBox.min.y * sockelScale;
                    const sockelOberseite = -sockelMinY + sockelHoehe;
                    const vaseHalbeHoehe = 10;
                    vaseBaseY = sockelOberseite - vaseHalbeHoehe;
                }

                innerLightRef.current.position.y = vaseBaseY + Math.sin(time * 0.5) * 0.3;

                const mainLight = innerLightRef.current.children[0];
                if (mainLight) {
                    mainLight.intensity = 3.5 + Math.sin(time * 2) * 1.0;
                }

                innerLightRef.current.children.forEach((light, index) => {
                    if (index > 0 && index < 5) {
                        const angle = time * 0.8 + index * Math.PI * 0.5;
                        const radius = 4;
                        light.position.x = Math.sin(angle) * radius;
                        light.position.z = Math.cos(angle) * radius;
                        light.intensity = 1.5 + Math.sin(time * 3 + index) * 0.8;
                    }
                });
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
    }, [canvasRef, isRefractionMode]); // isRefractionMode als Dependency

    const updateMesh = (geometry, material) => {
        if (!sceneRef.current) return;

        // Altes Mesh entfernen
        if (meshRef.current) {
            sceneRef.current.remove(meshRef.current);
        }
        if (innerLightRef.current) {
            sceneRef.current.remove(innerLightRef.current);
        }

        if (geometry && material) {
            const mesh = new THREE.Mesh(geometry, material);

            // Vase-Position berechnen
            let vaseYPosition = 0; // Standard: auf dem Boden

            if (baseMeshRef.current) {
                // Sockel ist vorhanden: Vase auf Sockel positionieren
                baseMeshRef.current.geometry.computeBoundingBox();
                const sockelBox = baseMeshRef.current.geometry.boundingBox;
                const sockelScale = baseMeshRef.current.scale.x;

                // Sockel-Oberseite berechnen
                const sockelHoehe = (sockelBox.max.y - sockelBox.min.y) * sockelScale;
                const sockelMinY = sockelBox.min.y * sockelScale;
                const sockelOberseite = -sockelMinY + sockelHoehe;

                // Vase-Unterseite auf Sockel-Oberseite setzen
                const vaseHalbeHoehe = 10; // Halbe Vasenhöhe
                vaseYPosition = sockelOberseite - vaseHalbeHoehe;
            }

            mesh.position.y = vaseYPosition;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            sceneRef.current.add(mesh);
            meshRef.current = mesh;

            // Bodenlicht nur im Lichtbrechungs-Modus hinzufügen
            if (lightModeRef.current) {
                const vaseHeight = 20;
                const innerLightGroup = createInnerLight(vaseHeight);
                innerLightGroup.position.y = vaseYPosition; // Lichter auf gleicher Höhe wie Vase
                sceneRef.current.add(innerLightGroup);
                innerLightRef.current = innerLightGroup;
            }
        }
    };

    // NEUE FUNKTION: STL-Sockel aktualisieren
    const updateBase = (baseGeometry, vaseSettings) => {
        if (!sceneRef.current) return;

        // Alten Sockel entfernen
        if (baseMeshRef.current) {
            sceneRef.current.remove(baseMeshRef.current);
        }

        if (baseGeometry && vaseSettings) {
            // Sockel-Material erstellen
            const baseMaterial = new THREE.MeshStandardMaterial({
                color: 0x8d6e63,        // Warmes Braun
                metalness: 0.1,
                roughness: 0.7,
                transparent: false,
                opacity: 1.0
            });

            const baseMesh = new THREE.Mesh(baseGeometry.clone(), baseMaterial);

            // Automatische Größenanpassung basierend auf Vasenfuß
            const targetRadius = vaseSettings.baseRadius * 1.1; // Etwas GRÖSSER als Vasenfuß für perfekte Auflagefläche

            // Sockel-Bounding Box berechnen BEVOR Skalierung
            baseGeometry.computeBoundingBox();
            const originalBox = baseGeometry.boundingBox;
            const currentRadius = Math.max(originalBox.max.x - originalBox.min.x, originalBox.max.z - originalBox.min.z) / 2;

            // Skalierung berechnen
            const scale = targetRadius / currentRadius;
            baseMesh.scale.setScalar(scale);

            // KORREKTE POSITIONIERUNG: Sockel-Unterseite auf Boden (y=0)
            // Nach Skalierung: neue Höhe berechnen
            const scaledHeight = (originalBox.max.y - originalBox.min.y) * scale;
            const scaledMinY = originalBox.min.y * scale;

            // Sockel so positionieren, dass seine Unterseite bei y=0 liegt
            baseMesh.position.set(0, -scaledMinY, 0);
            baseMesh.castShadow = true;
            baseMesh.receiveShadow = true;

            sceneRef.current.add(baseMesh);
            baseMeshRef.current = baseMesh;

            // Vase-Position: DIREKT auf der Oberseite des Sockels
            const sockelOberseite = -scaledMinY + scaledHeight;
            const vaseHalbeHoehe = 10; // Halbe Vasenhöhe
            const vaseBodenPosition = sockelOberseite - vaseHalbeHoehe;

            // Vase neu positionieren falls sie existiert
            if (meshRef.current) {
                meshRef.current.position.y = vaseBodenPosition;
            }
            if (innerLightRef.current) {
                innerLightRef.current.position.y = vaseBodenPosition; // Lichter auf gleicher Höhe
            }
        }
    };

    return {
        scene: sceneRef.current,
        renderer: rendererRef.current,
        camera: cameraRef.current,
        updateMesh,
        updateBase  // NEUE FUNKTION für STL-Sockel
    };
};

// Materialien - Angepasst an Modus UND Materialstärke
export const createWarmLampshade = (isRefractionMode = false, customThickness = null) => {
    // Basis-Thickness je nach Modus, kann aber überschrieben werden
    const baseThickness = isRefractionMode ? 1.8 : 1.2;
    const thickness = customThickness || baseThickness;

    if (isRefractionMode) {
        // Optimiert für Lichtbrechung
        return new THREE.MeshPhysicalMaterial({
            color: 0xfff8e1,
            metalness: 0.0,
            roughness: 0.02,
            transmission: 0.97,
            transparent: true,
            opacity: 0.08,
            thickness: thickness,
            ior: 1.52,
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
    } else {
        // Normales Material für Hell-Modus
        return new THREE.MeshPhysicalMaterial({
            color: 0xfff8e1,
            metalness: 0.0,
            roughness: 0.08,
            transmission: 0.85,
            transparent: true,
            opacity: 0.2,
            thickness: thickness,
            ior: 1.45,
            emissive: 0xfff3e0,
            emissiveIntensity: 0.05,
            envMapIntensity: 1.5,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            sheen: 0.6,
            sheenRoughness: 0.1,
            sheenColor: 0xffecb3,
            reflectivity: 0.85
        });
    }
};

export const createCoolLampshade = (isRefractionMode = false, customThickness = null) => {
    const baseThickness = isRefractionMode ? 1.5 : 1.2;
    const thickness = customThickness || baseThickness;

    if (isRefractionMode) {
        return new THREE.MeshPhysicalMaterial({
            color: 0xe3f2fd,
            metalness: 0.0,
            roughness: 0.01,
            transmission: 0.98,
            transparent: true,
            opacity: 0.06,
            thickness: thickness,
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
    } else {
        return new THREE.MeshPhysicalMaterial({
            color: 0xe3f2fd,
            metalness: 0.0,
            roughness: 0.06,
            transmission: 0.88,
            transparent: true,
            opacity: 0.15,
            thickness: thickness,
            ior: 1.5,
            emissive: 0xe1f5fe,
            emissiveIntensity: 0.03,
            envMapIntensity: 1.8,
            clearcoat: 0.9,
            clearcoatRoughness: 0.08,
            sheen: 0.5,
            sheenRoughness: 0.08,
            sheenColor: 0xe3f2fd,
            reflectivity: 0.9
        });
    }
};

export const createAmberLampshade = (isRefractionMode = false, customThickness = null) => {
    const baseThickness = isRefractionMode ? 2.2 : 1.8;
    const thickness = customThickness || baseThickness;

    if (isRefractionMode) {
        return new THREE.MeshPhysicalMaterial({
            color: 0xffc107,
            metalness: 0.0,
            roughness: 0.04,
            transmission: 0.92,
            transparent: true,
            opacity: 0.15,
            thickness: thickness,
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
    } else {
        return new THREE.MeshPhysicalMaterial({
            color: 0xffc107,
            metalness: 0.0,
            roughness: 0.1,
            transmission: 0.8,
            transparent: true,
            opacity: 0.25,
            thickness: thickness,
            ior: 1.55,
            emissive: 0xffb300,
            emissiveIntensity: 0.1,
            envMapIntensity: 1.8,
            clearcoat: 0.8,
            clearcoatRoughness: 0.12,
            sheen: 0.8,
            sheenRoughness: 0.12,
            sheenColor: 0xffd54f,
            reflectivity: 0.8
        });
    }
};

export const createSmokedLampshade = (isRefractionMode = false, customThickness = null) => {
    const baseThickness = isRefractionMode ? 2.8 : 2.0;
    const thickness = customThickness || baseThickness;

    if (isRefractionMode) {
        return new THREE.MeshPhysicalMaterial({
            color: 0x795548,
            metalness: 0.0,
            roughness: 0.08,
            transmission: 0.85,
            transparent: true,
            opacity: 0.25,
            thickness: thickness,
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
    } else {
        return new THREE.MeshPhysicalMaterial({
            color: 0x795548,
            metalness: 0.0,
            roughness: 0.15,
            transmission: 0.7,
            transparent: true,
            opacity: 0.4,
            thickness: thickness,
            ior: 1.52,
            emissive: 0x3e2723,
            emissiveIntensity: 0.05,
            envMapIntensity: 1.5,
            clearcoat: 0.7,
            clearcoatRoughness: 0.18,
            sheen: 0.4,
            sheenRoughness: 0.2,
            sheenColor: 0x8d6e63,
            reflectivity: 0.7
        });
    }
};