import * as THREE from 'three';
import { PerlinNoise } from '../utils/perlinNoise.js';
import { smoothAudioData } from '../utils/audioAnalysis.js';

export const createVaseGeometry = (audioData, settings, perlinNoise) => {
    if (!audioData || audioData.length === 0) return null;

    const { height, baseRadius, topRadius, segments, heightSegments, amplification, noiseIntensity, smoothing } = settings;

    const geometry = new THREE.CylinderGeometry(topRadius, baseRadius, height, segments, heightSegments, true);
    const positions = geometry.attributes.position.array;

    // Audio-Daten glätten
    const smoothedAudio = smoothAudioData(audioData, smoothing);

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // Normalisierte Höhe (0 bis 1)
        const normalizedY = (y + height / 2) / height;

        // Audio-Daten basierend auf Höhe interpolieren
        const audioIndex = Math.floor(normalizedY * (smoothedAudio.length - 1));
        const amplitude = smoothedAudio[audioIndex]?.amplitude || 0;
        const frequency = smoothedAudio[audioIndex]?.frequency || 0;

        // Winkel für radiale Position
        const angle = Math.atan2(z, x);
        const radius = Math.sqrt(x * x + z * z);

        // Perlin Noise für organische Variation
        const noiseValue = perlinNoise.noise(
            angle * 2 + frequency * 0.001,
            normalizedY * 5,
            amplitude * 10
        );

        // Amplitude-basierte Radiusmodifikation
        const amplitudeEffect = amplitude * amplification;
        const noiseEffect = noiseValue * noiseIntensity;

        // Neuer Radius
        const newRadius = radius + amplitudeEffect + noiseEffect;

        // Neue Position berechnen
        positions[i] = (x / radius) * newRadius;
        positions[i + 2] = (z / radius) * newRadius;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
};

export const createVaseMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0x64b5f6,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.8,
        transparent: true,
        opacity: 0.8,
        thickness: 0.5,
        envMapIntensity: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
};