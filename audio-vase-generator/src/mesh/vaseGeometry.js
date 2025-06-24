// ============================================
// src/mesh/vaseGeometry.js - VERBESSERTE BELEUCHTUNG
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