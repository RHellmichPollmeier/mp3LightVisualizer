// ============================================
// src/hooks/useThreeJS.js - VOLUMETRISCHE BELEUCHTUNG & CAUSTICS
// ============================================
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createInnerLight, createVolumetricLighting, createCausticEffect, createLightParticles } from '../mesh/vaseGeometry.js';

export const useThreeJS = (canvasRef, isRefractionMode = false) => {
    const sceneRef = useRef();
    const rendererRef = useRef();
    const cameraRef = useRef();
    const meshRef = useRef();
    const baseMeshRef = useRef();  // NEUER REF für STL-Sockel
    const innerLightRef = useRef();
    const volumetricLightRef = useRef(); // NEUE REFS für volumetrische Effekte
    const causticEffectRef = useRef();
    const lightParticlesRef = useRef();
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
        renderer.toneMappingExposure = isRefractionMode ? 2.2 : 1.2; // Ausgewogene Belichtung
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

        // BELEUCHTUNG - VERSTÄRKT für Lampenschirm-Effekt
        let keyLight, fillLight, rimLight, ambientLight;

        if (isRefractionMode) {
            // LICHTBRECHUNGS-MODUS: Verstärkte Beleuchtung für Lampenschirm
            keyLight = new THREE.DirectionalLight(0xfff8dc, 2.0);   // HELLER!
            fillLight = new THREE.DirectionalLight(0x87ceeb, 1.2);  // HELLER!
            rimLight = new THREE.DirectionalLight(0xffa726, 1.0);   // HELLER!
            ambientLight = new THREE.AmbientLight(0x404080, 0.4);   // HELLER!
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

        // Point Lights - VERSTÄRKT für beide Modi
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
            // Point Lights für Lichtbrechungs-Modus
            const pointLights = [
                { color: 0xffffff, intensity: 0.8, position: [15, 20, 10] },
                { color: 0x64b5f6, intensity: 0.6, position: [-10, 15, 15] },
                { color: 0xffa726, intensity: 0.6, position: [5, -10, 20] },
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

        // ===== VOLUMETRISCHE BELEUCHTUNGS-EFFEKTE - Nur im Lichtbrechungs-Modus =====
        if (isRefractionMode) {
            // Volumetrische Lichtstrahlen
            const volumetricLighting = createVolumetricLighting(20);
            scene.add(volumetricLighting);
            volumetricLightRef.current = volumetricLighting;

            // Caustic-Effekte am Boden
            const causticEffect = createCausticEffect();
            scene.add(causticEffect);
            causticEffectRef.current = causticEffect;

            // Schwebende Lichtpartikel
            const lightParticles = createLightParticles();
            scene.add(lightParticles);
            lightParticlesRef.current = lightParticles;

            console.log('🌟 Volumetrische Effekte aktiviert:');
            console.log('✨ Caustics am Boden für Lichtbrechungsmuster');
            console.log('💫 Schwebende Lichtpartikel für Atmosphäre');
            console.log('🌟 Volumetrische Lichtkegel durch die Vase');
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

                // Basis-Position der Vase ermitteln (inklusive Placement-Position)
                let vaseBaseY = 0; // Standard: auf dem Boden
                let vaseBaseX = 0; // X-Offset von Placement
                let vaseBaseZ = 0; // Z-Offset von Placement

                // Placement-Position aus der aktuellen Mesh-Position lesen
                vaseBaseX = meshRef.current.position.x;
                vaseBaseZ = meshRef.current.position.z;

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

                // Sanfte Animation um die Basis-Position (mit Placement-Offset)
                const animationOffset = isRefractionMode
                    ? Math.sin(time * 0.5) * 0.3
                    : Math.sin(time) * 0.5;

                meshRef.current.position.set(
                    vaseBaseX,
                    vaseBaseY + animationOffset,
                    vaseBaseZ
                );
            }

            // Sockel leichte Rotation (langsamer als Vase)
            if (baseMeshRef.current) {
                baseMeshRef.current.rotation.y += 0.003;
            }

            // Lichtanimation - Nur wenn es Lichter gibt
            if (environmentLightsRef.current.length > 0) {
                environmentLightsRef.current.forEach((light, index) => {
                    const offset = index * Math.PI * 0.4;
                    const baseIntensity = isRefractionMode ? 0.6 : 0.5;
                    const variation = isRefractionMode ? 0.3 : 0.3;
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

            // ===== LAMPENSCHIRM-ANIMATION für Lichtbrechungs-Modus =====
            if (innerLightRef.current && isRefractionMode) {
                // Vase-Position ermitteln
                let vaseBaseY = 0;
                let vaseBaseX = 0;
                let vaseBaseZ = 0;

                if (meshRef.current) {
                    vaseBaseX = meshRef.current.position.x;
                    vaseBaseZ = meshRef.current.position.z;
                    vaseBaseY = meshRef.current.position.y; // Aktuelle Vase-Position
                }

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

                const animationOffset = Math.sin(time * 0.5) * 0.3;

                // Lichter-Gruppe mit der Vase mitbewegen
                innerLightRef.current.position.set(
                    vaseBaseX,
                    vaseBaseY + animationOffset,
                    vaseBaseZ
                );

                // ===== HAUPTLAMPE IM INNEREN Animation (Index 0) =====
                const mainInnerLight = innerLightRef.current.children[0];
                if (mainInnerLight) {
                    // Sanftes Pulsieren der Hauptlampe
                    mainInnerLight.intensity = 18.0 + Math.sin(time * 1.5) * 4.0;

                    // Die Position bleibt relativ zur Gruppe (ist schon bei 1/3 der Höhe)
                    // Kleine Schwankung für lebendigen Effekt
                    const vaseHeight = 20;
                    const oneThirdHeight = -vaseHeight / 2 + (vaseHeight / 3);
                    mainInnerLight.position.y = oneThirdHeight + Math.sin(time * 2) * 0.2;
                }

                // ===== INNERE RING-LICHTER Animation (Index 1-10) =====
                for (let i = 1; i <= 10; i++) {
                    const light = innerLightRef.current.children[i];
                    if (light) {
                        const baseIntensity = i <= 2 ? 12.0 : 8.0; // Höhere für zentrale Lichter
                        light.intensity = baseIntensity + Math.sin(time * 1.2 + i * 0.3) * 2.0;

                        // Sanfte Rotation für Ring-Lichter (Index 3-6)
                        if (i >= 3 && i <= 6) {
                            const angle = time * 0.2 + i * Math.PI * 0.5;
                            const radius = 2; // Kleine Bewegung im Inneren
                            light.position.x = Math.sin(angle) * radius;
                            light.position.z = Math.cos(angle) * radius;
                        }

                        // Vertikale Schwankung für diagonale Lichter (Index 7-10)
                        if (i >= 7 && i <= 10) {
                            const vaseHeight = 20;
                            const oneThirdHeight = -vaseHeight / 2 + (vaseHeight / 3);
                            const baseY = i % 2 === 0 ? oneThirdHeight + 1 : oneThirdHeight - 1;
                            light.position.y = baseY + Math.sin(time * 1.8 + i) * 0.3;
                        }
                    }
                }

                // ===== FARBIGE AKZENT-LICHTER Animation (Index 11-14) =====
                for (let i = 11; i <= 14; i++) {
                    const light = innerLightRef.current.children[i];
                    if (light) {
                        light.intensity = 4.0 + Math.sin(time * 2.5 + i * 0.7) * 1.5;

                        // Kleine kreisförmige Bewegung
                        const angle = time * 0.4 + i * Math.PI * 0.25;
                        const radius = 0.5;
                        const currentX = light.position.x;
                        const currentZ = light.position.z;
                        light.position.x = currentX + Math.sin(angle) * radius * 0.1;
                        light.position.z = currentZ + Math.cos(angle) * radius * 0.1;
                    }
                }

                // ===== SUPPORT-LICHTER (Bodenlichter) Animation (Index 15-19) =====
                for (let i = 15; i <= 19; i++) {
                    const light = innerLightRef.current.children[i];
                    if (light) {
                        light.intensity = 2.0 + Math.sin(time * 1.8 + i * 0.4) * 1.0;
                    }
                }

                // ===== TOP SPOT LIGHT Animation =====
                const topSpot = innerLightRef.current.children[20]; // Spot Light
                if (topSpot) {
                    topSpot.intensity = 6.0 + Math.sin(time * 1.0) * 2.0;

                    // Leichte Bewegung des Spot Lights
                    topSpot.position.x = Math.sin(time * 0.3) * 2;
                    topSpot.position.z = Math.cos(time * 0.3) * 2;
                }
            }

            // ===== VOLUMETRISCHE EFFEKTE Animation =====
            if (isRefractionMode) {
                // Volumetrische Lichtstrahlen animieren
                if (volumetricLightRef.current) {
                    volumetricLightRef.current.children.forEach((lightCone, index) => {
                        if (lightCone.material && lightCone.material.uniforms) {
                            lightCone.material.uniforms.time.value = time;

                            // Verschiedene Animationsgeschwindigkeiten für jeden Kegel
                            const speed = 1.0 + index * 0.3;
                            lightCone.material.uniforms.intensity.value =
                                (0.3 + Math.sin(time * speed) * 0.2) * (index === 0 ? 1.5 : 1.0);

                            // Leichte Position-Animation für mehr Dynamik
                            const originalY = [-8, -6, -6, -6, -6][index] || -6;
                            lightCone.position.y = originalY + Math.sin(time * 0.8 + index) * 0.5;
                        }
                    });
                }

                // Caustic-Effekte animieren
                if (causticEffectRef.current) {
                    const causticMesh = causticEffectRef.current.children[0]; // Erstes Kind ist das Caustic-Pattern
                    if (causticMesh && causticMesh.material && causticMesh.material.uniforms) {
                        causticMesh.material.uniforms.time.value = time;
                        causticMesh.material.uniforms.intensity.value = 0.4 + Math.sin(time * 1.2) * 0.2;
                        causticMesh.material.uniforms.speed.value = 1.0 + Math.sin(time * 0.5) * 0.3;
                    }

                    // Punkt-Projektionen animieren (ab Index 1)
                    for (let i = 1; i < causticEffectRef.current.children.length; i++) {
                        const spot = causticEffectRef.current.children[i];
                        if (spot.material) {
                            spot.material.opacity = 0.2 + Math.sin(time * 1.5 + i * 0.5) * 0.15;

                            // Leichte Größenveränderung
                            const baseScale = [1.0, 0.6, 0.6, 0.5, 0.5][i - 1] || 0.5;
                            const scaleVariation = 1.0 + Math.sin(time * 2.0 + i) * 0.1;
                            spot.scale.setScalar(baseScale * scaleVariation);
                        }
                    }
                }

                // Lichtpartikel animieren
                if (lightParticlesRef.current) {
                    const particleSystem = lightParticlesRef.current.children[0];
                    if (particleSystem && particleSystem.material && particleSystem.material.uniforms) {
                        particleSystem.material.uniforms.time.value = time;
                        particleSystem.material.uniforms.intensity.value = 0.6 + Math.sin(time * 0.8) * 0.3;

                        // Partikel-Position Updates sind im Vertex Shader implementiert
                        particleSystem.geometry.attributes.position.needsUpdate = true;
                    }
                }
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

            // Cleanup volumetrische Effekte
            if (volumetricLightRef.current) {
                volumetricLightRef.current.children.forEach(child => {
                    if (child.material) child.material.dispose();
                    if (child.geometry) child.geometry.dispose();
                });
            }
            if (causticEffectRef.current) {
                causticEffectRef.current.children.forEach(child => {
                    if (child.material) child.material.dispose();
                    if (child.geometry) child.geometry.dispose();
                });
            }
            if (lightParticlesRef.current) {
                lightParticlesRef.current.children.forEach(child => {
                    if (child.material) child.material.dispose();
                    if (child.geometry) child.geometry.dispose();
                });
            }
        };
    }, [canvasRef, isRefractionMode]); // isRefractionMode als Dependency

    const updateMesh = (geometry, material, placementPosition = { x: 0, z: 0 }) => {
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
            let vaseXPosition = placementPosition.x || 0;
            let vaseZPosition = placementPosition.z || 0;

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

            mesh.position.set(vaseXPosition, vaseYPosition, vaseZPosition);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            sceneRef.current.add(mesh);
            meshRef.current = mesh;

            // Lampenschirm-Beleuchtung nur im Lichtbrechungs-Modus hinzufügen
            if (lightModeRef.current) {
                const vaseHeight = 20;
                const innerLightGroup = createInnerLight(vaseHeight);
                innerLightGroup.position.set(vaseXPosition, vaseYPosition, vaseZPosition); // Lichter auf gleicher Position wie Vase
                sceneRef.current.add(innerLightGroup);
                innerLightRef.current = innerLightGroup;

                // Debug-Info
                console.log('🏮 Lampenschirm-Setup:');
                console.log(`💡 Hauptlicht INNEN bei y = ${(-20 / 2) + (20 / 3)} (relativ zur Vase)`);
                console.log(`🎯 Vase-Position: x=${vaseXPosition}, y=${vaseYPosition}, z=${vaseZPosition}`);
                console.log(`⚡ Lichter-Gruppe wird mit Vase mitbewegt`);
                console.log(`🌟 Erwarteter Effekt: Licht scheint von INNEN durch Glaswände`);
            }
        }
    };

    // NEUE FUNKTION: STL-Sockel aktualisieren
    const updateBase = (baseGeometry, vaseSettings, placementPosition = { x: 0, z: 0 }) => {
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

            // Vase-Position: DIREKT auf der Oberseite des Sockels + Placement-Offset
            const sockelOberseite = -scaledMinY + scaledHeight;
            const vaseHalbeHoehe = 10; // Halbe Vasenhöhe
            const vaseBodenPosition = sockelOberseite - vaseHalbeHoehe;

            // Vase neu positionieren falls sie existiert (mit Placement-Offset)
            if (meshRef.current) {
                meshRef.current.position.set(
                    placementPosition.x || 0,
                    vaseBodenPosition,
                    placementPosition.z || 0
                );
            }
            if (innerLightRef.current) {
                innerLightRef.current.position.set(
                    placementPosition.x || 0,
                    vaseBodenPosition,
                    placementPosition.z || 0
                ); // Lichter auf gleicher Position wie Vase
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

// ============================================
// LAMPENSCHIRM-MATERIALIEN - Optimiert für Innenlicht
// ============================================

export const createWarmLampshade = (isRefractionMode = false, customThickness = null) => {
    const thickness = customThickness || (isRefractionMode ? 1.8 : 1.2);

    if (isRefractionMode) {
        // LAMPENSCHIRM-MATERIAL: Optimiert für Licht von innen
        return new THREE.MeshPhysicalMaterial({
            color: 0xfff8e1,
            metalness: 0.0,
            roughness: 0.02,
            transmission: 0.82,     // Optimiert für Innenlicht
            transparent: true,
            opacity: 0.35,
            thickness: thickness,
            ior: 1.52,
            emissive: 0xfff3e0,
            emissiveIntensity: 0.08,
            envMapIntensity: 2.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            sheen: 0.9,
            sheenRoughness: 0.04,
            sheenColor: 0xffecb3,
            reflectivity: 0.9,

            // WICHTIG für Lampenschirm:
            side: THREE.DoubleSide,
            attenuationDistance: 0.8,
            attenuationColor: new THREE.Color(0xfff8e1).multiplyScalar(0.95)
        });
    } else {
        // Hell-Modus Material (unverändert)
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
    const thickness = customThickness || (isRefractionMode ? 1.5 : 1.2);

    if (isRefractionMode) {
        return new THREE.MeshPhysicalMaterial({
            color: 0xe3f2fd,
            metalness: 0.0,
            roughness: 0.02,
            transmission: 0.85,
            transparent: true,
            opacity: 0.32,
            thickness: thickness,
            ior: 1.54,
            emissive: 0xe1f5fe,
            emissiveIntensity: 0.07,
            envMapIntensity: 2.4,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            sheen: 0.8,
            sheenRoughness: 0.03,
            sheenColor: 0xe3f2fd,
            reflectivity: 0.92,

            side: THREE.DoubleSide,
            attenuationDistance: 0.7,
            attenuationColor: new THREE.Color(0xe3f2fd).multiplyScalar(0.96)
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
    const thickness = customThickness || (isRefractionMode ? 2.0 : 1.8);

    if (isRefractionMode) {
        return new THREE.MeshPhysicalMaterial({
            color: 0xffc107,
            metalness: 0.0,
            roughness: 0.03,
            transmission: 0.78,
            transparent: true,
            opacity: 0.42,
            thickness: thickness,
            ior: 1.58,
            emissive: 0xffb300,
            emissiveIntensity: 0.15, // Stärkeres Eigenleuchten für Amber
            envMapIntensity: 2.0,
            clearcoat: 0.95,
            clearcoatRoughness: 0.04,
            sheen: 1.0,
            sheenRoughness: 0.08,
            sheenColor: 0xffd54f,
            reflectivity: 0.88,

            side: THREE.DoubleSide,
            attenuationDistance: 1.2,
            attenuationColor: new THREE.Color(0xffc107).multiplyScalar(0.9)
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
    const thickness = customThickness || (isRefractionMode ? 2.5 : 2.0);

    if (isRefractionMode) {
        return new THREE.MeshPhysicalMaterial({
            color: 0x795548,
            metalness: 0.0,
            roughness: 0.05,
            transmission: 0.72,
            transparent: true,
            opacity: 0.48,
            thickness: thickness,
            ior: 1.56,
            emissive: 0x8d6e63,
            emissiveIntensity: 0.06,
            envMapIntensity: 1.8,
            clearcoat: 0.9,
            clearcoatRoughness: 0.08,
            sheen: 0.6,
            sheenRoughness: 0.12,
            sheenColor: 0xa1887f,
            reflectivity: 0.82,

            side: THREE.DoubleSide,
            attenuationDistance: 1.5,
            attenuationColor: new THREE.Color(0x795548).multiplyScalar(0.85)
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