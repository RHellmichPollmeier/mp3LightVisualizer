import * as THREE from 'three';
import { PerlinNoise } from '../utils/perlinNoise.js';
import { smoothAudioData } from '../utils/audioAnalysis.js';

export const createVaseGeometry = (audioData, settings, perlinNoise) => {
    if (!audioData || audioData.length === 0) return null;

    const {
        height, baseRadius, topRadius, segments, heightSegments,
        amplification, noiseIntensity, smoothing, noiseScale
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

        // Neuer Radius mit allen Effekten
        const radiusModification = amplitudeEffect + noiseEffect + frequencyWave;
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

// Neue Funktion für warme Innenbeleuchtung
export const createInnerLight = () => {
    const light = new THREE.PointLight(0xffcc80, 2, 50); // Warmes Orange
    light.position.set(0, 0, 0);
    light.castShadow = false;
    return light;
};