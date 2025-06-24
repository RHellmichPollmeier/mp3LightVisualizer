// ============================================
// src/mesh/vaseGeometry.js - VERBESSERTE BELEUCHTUNG + VOLUMETRISCHE EFFEKTE
// ============================================
import * as THREE from 'three';
import { PerlinNoise } from '../utils/perlinNoise.js';
import { smoothAudioData } from '../utils/audioAnalysis.js';

export const createVaseGeometry = (audioData, settings, perlinNoise) => {
    if (!audioData || audioData.length === 0) return null;

    const {
        height, baseRadius, topRadius, segments, heightSegments,
        amplification, noiseIntensity, smoothing, wavePattern
    } = settings;

    const geometry = new THREE.CylinderGeometry(topRadius, baseRadius, height, segments, heightSegments, true);
    const positions = geometry.attributes.position.array;

    // Audio-Daten mehrfach glätten für organischere Übergänge
    let smoothedAudio = smoothAudioData(audioData, smoothing);
    smoothedAudio = smoothAudioData(smoothedAudio, smoothing * 0.5); // Zweite Glättung

    // Normalisierung der Audio-Daten für bessere Kontrolle
    const maxAmplitude = Math.max(...smoothedAudio.map(d => d.amplitude));
    const normalizedAudio = smoothedAudio.map(d => ({
        ...d,
        amplitude: d.amplitude / (maxAmplitude || 1),
        frequency: d.frequency / 22050 // Normalisiert auf 0-1
    }));

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Normalisierte Höhe (0 bis 1)
        const normalizedY = (y + height / 2) / height;

        // Bessere Audio-Interpolation mit cubic interpolation
        const audioValue = interpolateAudioData(normalizedAudio, normalizedY);
        const amplitude = audioValue.amplitude;
        const frequency = audioValue.frequency;

        // Winkel und Radius
        const angle = Math.atan2(z, x);
        const radius = Math.sqrt(x * x + z * z);

        // Multi-Oktaven Perlin Noise für organischere Formen
        const noise1 = perlinNoise.noise(
            angle * 3 + frequency * 5,
            normalizedY * 8 + amplitude * 3,
            amplitude * 15
        ) * 0.6;

        const noise2 = perlinNoise.noise(
            angle * 8 + frequency * 12,
            normalizedY * 15 + amplitude * 6,
            amplitude * 25
        ) * 0.3;

        const noise3 = perlinNoise.noise(
            angle * 16 + frequency * 20,
            normalizedY * 25 + amplitude * 10,
            amplitude * 40
        ) * 0.1;

        const combinedNoise = noise1 + noise2 + noise3;

        // Amplitude-basierte Verzerrung mit nicht-linearer Verstärkung
        const amplitudeEffect = Math.pow(amplitude, 1.5) * amplification * (1 + frequency * 0.5);

        // Frequency-basierte Welligkeit
        const frequencyWave = Math.sin(angle * frequency * 20 + normalizedY * Math.PI * 4) * frequency * 0.3;

        // Organische Noise-Effekte
        const noiseEffect = combinedNoise * noiseIntensity * (0.5 + amplitude * 1.5);

        // Vertikale Verzerrung für fließende Formen
        const verticalDistortion = perlinNoise.noise(
            angle * 2,
            normalizedY * 6,
            amplitude * 8
        ) * amplitude * 0.8;

        // NEUE WELLENMUSTER-EFFEKTE
        let waveEffect = 0;
        if (wavePattern && wavePattern.enabled) {
            waveEffect = calculateWavePattern(
                angle, normalizedY, wavePattern, amplitude, frequency
            );
        }

        // Neuer Radius mit allen Effekten (inkl. Wellenmuster)
        const radiusModification = amplitudeEffect + noiseEffect + frequencyWave + waveEffect;
        const newRadius = Math.max(radius * 0.3, radius + radiusModification);

        // Neue Position berechnen
        positions[i] = (x / radius) * newRadius;
        positions[i + 1] = y + verticalDistortion; // Vertikale Verzerrung hinzufügen
        positions[i + 2] = (z / radius) * newRadius;
    }

    // Geometrie smoothing für organischere Oberfläche
    smoothGeometry(positions, segments, heightSegments);

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
};

// NEUE FUNKTION: Wellenmuster berechnen
const calculateWavePattern = (angle, normalizedY, wavePattern, amplitude, frequency) => {
    const { type, amplitude: waveAmp, frequency: waveFreq, spiralTurns, phase } = wavePattern;
    const phaseRad = (phase * Math.PI) / 180; // Grad zu Radiant

    let waveValue = 0;

    switch (type) {
        case 'spiral':
            // Spiralförmige Wellen - wie im Bild!
            const spiralAngle = angle + normalizedY * spiralTurns * Math.PI * 2;
            waveValue = Math.sin(spiralAngle * waveFreq + phaseRad) * waveAmp;

            // Zusätzliche Detailwellen für realistischeren Effekt
            waveValue += Math.sin(spiralAngle * waveFreq * 2 + phaseRad * 1.5) * waveAmp * 0.3;
            break;

        case 'vertical':
            // Vertikale Rillen
            waveValue = Math.sin(angle * waveFreq + phaseRad) * waveAmp;
            break;

        case 'horizontal':
            // Horizontale Ringe
            waveValue = Math.sin(normalizedY * Math.PI * waveFreq + phaseRad) * waveAmp;
            break;

        case 'diamond':
            // Rautenmuster
            const diamondPattern = Math.sin(angle * waveFreq + normalizedY * Math.PI * 4 + phaseRad) +
                Math.sin((angle + Math.PI / 4) * waveFreq - normalizedY * Math.PI * 4 + phaseRad);
            waveValue = diamondPattern * waveAmp * 0.5;
            break;
    }

    // Wellenstärke an Audio-Amplitude anpassen
    waveValue *= (0.7 + amplitude * 0.6); // Basis + Audio-Einfluss

    // Frequenz-basierte Modulation für dynamische Effekte
    waveValue *= (0.8 + frequency * 0.4);

    return waveValue;
};

// Kubische Interpolation für Audio-Daten
const interpolateAudioData = (audioData, normalizedY) => {
    const index = normalizedY * (audioData.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const t = index - lowerIndex;

    if (lowerIndex >= audioData.length - 1) {
        return audioData[audioData.length - 1];
    }

    const lower = audioData[lowerIndex];
    const upper = audioData[upperIndex];

    // Kubische Interpolation für sanftere Übergänge
    const t2 = t * t;
    const t3 = t2 * t;
    const weight = 3 * t2 - 2 * t3;

    return {
        amplitude: lower.amplitude + (upper.amplitude - lower.amplitude) * weight,
        frequency: lower.frequency + (upper.frequency - lower.frequency) * weight
    };
};

// Geometrie-Glättung für organischere Oberflächen
const smoothGeometry = (positions, segments, heightSegments, iterations = 2) => {
    for (let iter = 0; iter < iterations; iter++) {
        const newPositions = [...positions];

        for (let h = 1; h < heightSegments; h++) {
            for (let s = 0; s < segments; s++) {
                const currentIndex = (h * (segments + 1) + s) * 3;
                const prevIndex = ((h - 1) * (segments + 1) + s) * 3;
                const nextIndex = ((h + 1) * (segments + 1) + s) * 3;
                const leftIndex = (h * (segments + 1) + ((s - 1 + segments) % segments)) * 3;
                const rightIndex = (h * (segments + 1) + ((s + 1) % segments)) * 3;

                // Nur X und Z glätten (nicht Y, um die Höhe zu bewahren)
                if (prevIndex >= 0 && nextIndex < positions.length &&
                    leftIndex >= 0 && rightIndex < positions.length) {

                    newPositions[currentIndex] = (
                        positions[currentIndex] * 0.4 +
                        positions[prevIndex] * 0.15 +
                        positions[nextIndex] * 0.15 +
                        positions[leftIndex] * 0.15 +
                        positions[rightIndex] * 0.15
                    );

                    newPositions[currentIndex + 2] = (
                        positions[currentIndex + 2] * 0.4 +
                        positions[prevIndex + 2] * 0.15 +
                        positions[nextIndex + 2] * 0.15 +
                        positions[leftIndex + 2] * 0.15 +
                        positions[rightIndex + 2] * 0.15
                    );
                }
            }
        }

        // Neue Positionen übernehmen
        for (let i = 0; i < positions.length; i++) {
            positions[i] = newPositions[i];
        }
    }
};

export const createVaseMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xfff8e1,           // Warmes Elfenbein/Cremeweiß
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.95,        // Sehr durchsichtig
        transparent: true,
        opacity: 0.15,             // Sehr durchsichtig für Lampenschirm-Effekt
        thickness: 1.2,
        envMapIntensity: 0.8,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        ior: 1.45,                 // Glas IOR
        sheen: 0.5,                // Sanfter Glanz
        sheenRoughness: 0.2,
        sheenColor: 0xffecb3,      // Warmer Schimmer
        emissive: 0xfff3e0,        // Sanftes warmes Leuchten
        emissiveIntensity: 0.05    // Subtiles Eigenleuchten
    });
};

// ============================================
// NEUE VOLUMETRISCHE BELEUCHTUNGS-FUNKTIONEN
// ============================================

export const createVolumetricLighting = (vaseHeight = 20) => {
    const volumetricGroup = new THREE.Group();

    // ===== VOLUMETRISCHE LICHT-KEGEL =====
    const coneGeometry = new THREE.ConeGeometry(8, 25, 8, 1, true); // Großer, offener Kegel

    // Shader für volumetrische Beleuchtung
    const volumetricMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            time: { value: 0 },
            intensity: { value: 0.4 },
            color: { value: new THREE.Color(0xffffff) }
        },
        vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            void main() {
                vPosition = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float intensity;
            uniform vec3 color;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                // Entfernung vom Zentrum für radialen Gradient
                float dist = length(vPosition.xz) / 8.0;
                
                // Höhen-basierte Transparenz (oben transparent, unten sichtbarer)
                float heightFade = (vPosition.y + 12.5) / 25.0;
                heightFade = clamp(heightFade, 0.0, 1.0);
                
                // Bewegende "Staub"-Effekte
                float noise = sin(vPosition.x * 3.0 + time) * sin(vPosition.z * 3.0 + time * 0.7) * sin(vPosition.y * 2.0 + time * 0.5);
                noise = (noise + 1.0) * 0.5; // 0-1 range
                
                // Kombiniere Effekte
                float alpha = (1.0 - dist) * heightFade * noise * intensity;
                alpha = clamp(alpha, 0.0, 0.6);
                
                gl_FragColor = vec4(color, alpha);
            }
        `
    });

    // Mehrere Lichtkegel für verschiedene Lichtquellen
    const lightCones = [
        { position: [0, -8, 0], color: 0xffffff, intensity: 0.5 },
        { position: [3, -6, 0], color: 0xfff3e0, intensity: 0.3 },
        { position: [-3, -6, 0], color: 0xe3f2fd, intensity: 0.3 },
        { position: [0, -6, 3], color: 0xffecb3, intensity: 0.25 },
        { position: [0, -6, -3], color: 0xf3e5f5, intensity: 0.25 }
    ];

    lightCones.forEach((cone, index) => {
        const material = volumetricMaterial.clone();
        material.uniforms.color.value = new THREE.Color(cone.color);
        material.uniforms.intensity.value = cone.intensity;

        const mesh = new THREE.Mesh(coneGeometry, material);
        mesh.position.set(...cone.position);
        mesh.rotation.x = Math.PI; // Kegel nach unten
        volumetricGroup.add(mesh);
    });

    return volumetricGroup;
};

export const createCausticEffect = () => {
    const causticGroup = new THREE.Group();

    // ===== CAUSTIC PATTERN AM BODEN =====
    const groundPatternGeometry = new THREE.PlaneGeometry(40, 40, 32, 32);

    const causticMaterial = new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            time: { value: 0 },
            intensity: { value: 0.3 },
            speed: { value: 1.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float intensity;
            uniform float speed;
            varying vec2 vUv;
            
            // Caustic-ähnliche Welleninterferenz
            float causticPattern(vec2 uv, float t) {
                vec2 p = uv * 8.0;
                
                float wave1 = sin(length(p - vec2(sin(t * 0.3) * 2.0, cos(t * 0.4) * 2.0)) * 3.0 - t * speed);
                float wave2 = sin(length(p - vec2(cos(t * 0.5) * 2.0, sin(t * 0.6) * 2.0)) * 3.0 - t * speed * 1.3);
                float wave3 = sin(length(p - vec2(sin(t * 0.7) * 1.5, cos(t * 0.8) * 1.5)) * 4.0 - t * speed * 0.8);
                
                return (wave1 + wave2 + wave3) / 3.0;
            }
            
            void main() {
                vec2 centeredUv = vUv - 0.5;
                float dist = length(centeredUv);
                
                // Caustic-Muster berechnen
                float caustic = causticPattern(vUv, time);
                caustic = pow(max(caustic, 0.0), 2.0); // Verstärke helle Bereiche
                
                // Radiale Abschwächung vom Zentrum
                float radialFade = 1.0 - smoothstep(0.0, 0.4, dist);
                
                // Farbe basierend auf Position (regenbogenartig)
                vec3 color = vec3(
                    0.8 + 0.4 * sin(caustic * 3.0 + time * 0.5),
                    0.7 + 0.3 * sin(caustic * 3.0 + time * 0.7 + 2.0),
                    0.9 + 0.3 * sin(caustic * 3.0 + time * 0.3 + 4.0)
                );
                
                float alpha = caustic * radialFade * intensity;
                alpha = clamp(alpha, 0.0, 0.6);
                
                gl_FragColor = vec4(color, alpha);
            }
        `
    });

    const causticMesh = new THREE.Mesh(groundPatternGeometry, causticMaterial);
    causticMesh.rotation.x = -Math.PI / 2; // Horizontal am Boden
    causticMesh.position.y = -14.9; // Knapp über dem Boden
    causticGroup.add(causticMesh);

    // ===== PUNKT-LICHTPROJEKTIONEN =====
    const spotProjections = [
        { position: [0, -14.8, 0], color: 0xffffff, size: 6 },
        { position: [4, -14.8, 0], color: 0xfff3e0, size: 3 },
        { position: [-4, -14.8, 0], color: 0xe3f2fd, size: 3 },
        { position: [0, -14.8, 4], color: 0xffecb3, size: 2.5 },
        { position: [0, -14.8, -4], color: 0xf3e5f5, size: 2.5 }
    ];

    spotProjections.forEach((spot, index) => {
        const spotGeometry = new THREE.CircleGeometry(spot.size, 16);
        const spotMaterial = new THREE.MeshBasicMaterial({
            color: spot.color,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });

        const spotMesh = new THREE.Mesh(spotGeometry, spotMaterial);
        spotMesh.rotation.x = -Math.PI / 2;
        spotMesh.position.set(...spot.position);
        causticGroup.add(spotMesh);
    });

    return causticGroup;
};

export const createLightParticles = () => {
    const particleGroup = new THREE.Group();

    // ===== SCHWEBENDE LICHT-PARTIKEL =====
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Partikel in Vase-Bereich verteilen
        positions[i3] = (Math.random() - 0.5) * 20;     // x
        positions[i3 + 1] = Math.random() * 15 - 10;    // y (-10 bis 5)
        positions[i3 + 2] = (Math.random() - 0.5) * 20; // z

        // Langsame, zufällige Bewegung
        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = Math.random() * 0.01 + 0.005; // Leicht nach oben
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

        sizes[i] = Math.random() * 0.5 + 0.1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            time: { value: 0 },
            intensity: { value: 0.8 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 velocity;
            uniform float time;
            varying float vAlpha;
            
            void main() {
                vec3 pos = position;
                
                // Partikel bewegen
                pos += velocity * time * 50.0;
                
                // Zurücksetzen wenn zu hoch
                if (pos.y > 8.0) {
                    pos.y = -12.0;
                }
                
                // Alpha basierend auf Höhe
                vAlpha = 1.0 - smoothstep(-5.0, 5.0, pos.y);
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * 100.0 / length(gl_Position.xyz);
            }
        `,
        fragmentShader: `
            uniform float intensity;
            varying float vAlpha;
            
            void main() {
                // Runde Partikel
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center);
                
                if (dist > 0.5) discard;
                
                float alpha = (1.0 - dist * 2.0) * vAlpha * intensity;
                
                gl_FragColor = vec4(1.0, 0.95, 0.8, alpha);
            }
        `
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleGroup.add(particleSystem);

    return particleGroup;
};

export const createInnerLight = (vaseHeight = 20) => {
    const lightGroup = new THREE.Group();

    // ===== HAUPTLAMPE IM INNEREN der Vase bei 1/3 der Höhe ===== 
    const innerMainLight = new THREE.PointLight(0xffffff, 18.0, 60); // SEHR HELL für Durchleuchtung
    const oneThirdHeight = -vaseHeight / 2 + (vaseHeight / 3); // 1/3 von unten
    innerMainLight.position.set(0, oneThirdHeight, 0); // IM INNEREN bei 1/3 Höhe!
    innerMainLight.castShadow = false;
    lightGroup.add(innerMainLight);

    // ===== ZUSÄTZLICHE INNENLICHTER für gleichmäßige Ausleuchtung =====
    const innerLights = [
        // Zentrale Lichter auf verschiedenen Höhen im Inneren
        { color: 0xffffff, position: [0, oneThirdHeight + 3, 0], intensity: 12.0 },    // Etwas höher
        { color: 0xffffff, position: [0, oneThirdHeight - 2, 0], intensity: 12.0 },    // Etwas tiefer

        // Ring von Lichtern um die Hauptlampe (im Inneren)
        { color: 0xffffff, position: [2, oneThirdHeight, 0], intensity: 8.0 },         // Rechts innen
        { color: 0xffffff, position: [-2, oneThirdHeight, 0], intensity: 8.0 },        // Links innen
        { color: 0xffffff, position: [0, oneThirdHeight, 2], intensity: 8.0 },         // Vorne innen
        { color: 0xffffff, position: [0, oneThirdHeight, -2], intensity: 8.0 },        // Hinten innen

        // Diagonale Lichter für bessere Verteilung
        { color: 0xffffff, position: [1.5, oneThirdHeight + 1, 1.5], intensity: 6.0 },
        { color: 0xffffff, position: [-1.5, oneThirdHeight + 1, -1.5], intensity: 6.0 },
        { color: 0xffffff, position: [1.5, oneThirdHeight - 1, -1.5], intensity: 6.0 },
        { color: 0xffffff, position: [-1.5, oneThirdHeight - 1, 1.5], intensity: 6.0 },
    ];

    innerLights.forEach(lightConfig => {
        const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 40);
        light.position.set(...lightConfig.position);
        light.castShadow = false;
        lightGroup.add(light);
    });

    // ===== FARBIGE AKZENT-LICHTER im Inneren für schöne Effekte =====
    const accentLights = [
        { color: 0xfff3e0, position: [1, oneThirdHeight + 2, 0], intensity: 4.0 },     // Warm oben
        { color: 0xe3f2fd, position: [-1, oneThirdHeight + 2, 0], intensity: 4.0 },    // Kühl oben
        { color: 0xffecb3, position: [0, oneThirdHeight + 1, 1], intensity: 4.0 },     // Gelblich
        { color: 0xf3e5f5, position: [0, oneThirdHeight + 1, -1], intensity: 4.0 },    // Lila
    ];

    accentLights.forEach(lightConfig => {
        const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 25);
        light.position.set(...lightConfig.position);
        light.castShadow = false;
        lightGroup.add(light);
    });

    // ===== KLEINE BODENLICHTER für subtile Unterstützung =====
    const supportLights = [
        { color: 0xffffff, position: [0, -vaseHeight / 2 - 2, 0], intensity: 3.0 },    // Direkt unter Vase
        { color: 0xe3f2fd, position: [3, -vaseHeight / 2 - 1, 0], intensity: 2.0 },    // Rechts unten
        { color: 0xfff3e0, position: [-3, -vaseHeight / 2 - 1, 0], intensity: 2.0 },   // Links unten
        { color: 0xf8bbd9, position: [0, -vaseHeight / 2 - 1, 3], intensity: 2.0 },    // Vorne unten
        { color: 0xc8e6c9, position: [0, -vaseHeight / 2 - 1, -3], intensity: 2.0 },   // Hinten unten
    ];

    supportLights.forEach(lightConfig => {
        const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 30);
        light.position.set(...lightConfig.position);
        light.castShadow = false;
        lightGroup.add(light);
    });

    // ===== SPOT LIGHT von oben für zusätzliche Dramatik =====
    const topSpot = new THREE.SpotLight(0xffffff, 6.0, 50, Math.PI * 0.5, 0.2, 1);
    topSpot.position.set(0, vaseHeight / 2 + 5, 0); // Über der Vase
    topSpot.target.position.set(0, oneThirdHeight, 0); // Zielt auf die Innenlampe
    topSpot.castShadow = false;
    lightGroup.add(topSpot);
    lightGroup.add(topSpot.target);

    // ===== HEMISPHERE für sanfte Umgebungsbeleuchtung =====
    const hemiLight = new THREE.HemisphereLight(0xfff8e1, 0x87ceeb, 0.8);
    lightGroup.add(hemiLight);

    console.log(`🏮 Lampenschirm-Beleuchtung erstellt: ${lightGroup.children.length} Lichter!`);
    console.log(`💡 Hauptlampe INNEN bei y = ${oneThirdHeight.toFixed(2)} (1/3 der Höhe)`);
    console.log(`🔥 Hauptlampe Intensität: ${innerMainLight.intensity}`);
    console.log(`📐 Vase Höhe: ${vaseHeight}, Boden: ${-vaseHeight / 2}, Top: ${vaseHeight / 2}`);

    return lightGroup;
};