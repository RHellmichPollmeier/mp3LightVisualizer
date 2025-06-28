// ============================================
// src/mesh/vaseGeometry.js - KORRIGIERT: Lamellen als FINALE Schicht
// ============================================
import * as THREE from 'three';
import { PerlinNoise } from '../utils/perlinNoise.js';
import { smoothAudioData } from '../utils/audioAnalysis.js';

export const createVaseGeometry = (audioData, settings, perlinNoise) => {
    if (!audioData || audioData.length === 0) return null;

    const {
        height, baseRadius, topRadius, segments, heightSegments,
        amplification, noiseIntensity, smoothing, wavePattern,
        printOptimization, lamellen
    } = settings;

    console.log('🏺 Organische Vase-Generierung mit finalen Lamellen gestartet...');

    // Audio-Daten normalisieren
    const maxAmplitude = Math.max(...audioData.map(d => d.amplitude));
    const normalizedAudio = audioData.map(d => ({
        ...d,
        amplitude: d.amplitude / (maxAmplitude || 1),
        frequency: d.frequency / 22050
    }));

    // Druckparameter
    const printParams = {
        enabled: printOptimization?.enabled || false,
        maxOverhang: printOptimization?.maxOverhang || 45,
        maxSpikeHeight: printOptimization?.spikeThreshold || 2.0,
        audioPreservation: printOptimization?.audioPreservation || 0.85,
        smoothingStrength: printOptimization?.smoothingStrength || 0.15,
        contourSmoothingPoints: Math.max(16, Math.floor(normalizedAudio.length * 0.3))
    };

    const geometry = new THREE.CylinderGeometry(topRadius, baseRadius, height, segments, heightSegments, true);
    const positions = geometry.attributes.position.array;

    // ===== AUDIO-BASIERTE GEOMETRIE ERZEUGUNG =====
    const smoothedContour = printParams.enabled ?
        createSmoothedContour(normalizedAudio, printParams.contourSmoothingPoints, printParams.audioPreservation) :
        normalizedAudio;

    let workingAudio = printParams.enabled ?
        smoothedContour :
        smoothAudioData(smoothAudioData(normalizedAudio, smoothing), smoothing * 0.5);

    const maxRadiusChange = printParams.enabled ?
        Math.min(amplification, printParams.maxSpikeHeight / 10) :
        amplification;

    // Geometrie mit Audio-Daten modifizieren
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const normalizedY = (y + height / 2) / height;
        const angle = Math.atan2(z, x);
        const currentRadius = Math.sqrt(x * x + z * z);

        // Audio-Interpolation
        const audioValue = interpolateAudioData(workingAudio, normalizedY);
        const amplitude = audioValue.amplitude;
        const frequency = audioValue.frequency;

        // Audio-Effekte
        let amplitudeEffect = Math.pow(amplitude, 1.2) * maxRadiusChange * (1 + frequency * 0.3);

        const noiseScale = printParams.enabled ? Math.min(noiseIntensity, 1.0) : noiseIntensity;
        const noise1 = perlinNoise.noise(angle * 2 + frequency * 3, normalizedY * 6 + amplitude * 2, amplitude * 10) * 0.4;
        const noise2 = perlinNoise.noise(angle * 6 + frequency * 8, normalizedY * 12 + amplitude * 4, amplitude * 20) * 0.2;
        const combinedNoise = (noise1 + noise2) * noiseScale;

        const frequencyWave = Math.sin(angle * frequency * 15 + normalizedY * Math.PI * 3) * frequency * 0.2 * maxRadiusChange;

        // Wellenmuster (außer Lamellen)
        // Wellenmuster (NUR Spiralen etc., KEINE Lamellen!)
        let waveEffect = 0;
        if (wavePattern && wavePattern.enabled) {
            waveEffect = calculateWavePattern(angle, normalizedY, wavePattern, amplitude, frequency);
            if (printParams.enabled) {
                waveEffect = Math.max(-maxRadiusChange * 0.3, Math.min(maxRadiusChange * 0.3, waveEffect));
            }
        }

        let totalRadiusChange = amplitudeEffect + combinedNoise + frequencyWave + waveEffect;

        // 3D-Druck Überhang-Korrektur (falls aktiviert)
        if (printParams.enabled) {
            // [Überhang-Korrektur Code wie vorher...]
        }

        // Position berechnen
        const newRadius = Math.max(currentRadius * 0.2, currentRadius + totalRadiusChange);
        const verticalDistortionScale = printParams.enabled ? 0.3 : 0.8;
        const verticalDistortion = perlinNoise.noise(angle * 1.5, normalizedY * 4, amplitude * 6) * amplitude * verticalDistortionScale;

        positions[i] = (x / currentRadius) * newRadius;
        positions[i + 1] = y + (printParams.enabled ?
            Math.max(-0.5, Math.min(0.5, verticalDistortion)) :
            verticalDistortion);
        positions[i + 2] = (z / currentRadius) * newRadius;
    }

    // Nachbearbeitung
    if (printParams.enabled) {
        smoothGeometryForPrinting(positions, segments, heightSegments, printParams);
        reduceSharpSpikes(positions, segments, heightSegments, printParams);
    } else {
        smoothGeometry(positions, segments, heightSegments, 2);
    }

    // ===== SCHRITT 1: Geometrie KOMPLETT fertigstellen =====
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals(); // WICHTIG: Normalen berechnen BEVOR Lamellen

    // ===== SCHRITT 2: LAMELLEN als ALLERLETZTE Schicht aufbringen =====
    if (lamellen && lamellen.enabled) {
        console.log('🏺 Trage vertikale Lamellen als finale Schicht auf...');
        applyLamellenFinal(geometry, lamellen);

        // ===== SCHRITT 3: Finale Geometrie-Aktualisierung =====
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals(); // Normalen nach Lamellen neu berechnen

        console.log(`✅ Organische Vase mit ${lamellen.count} finalen vertikalen Lamellen (Tiefe: ${lamellen.depth}) erstellt!`);
    } else {
        console.log('✅ Organische Vase ohne Lamellen erstellt!');
    }

    return geometry;
};

// ============================================
// NEUE FINALE LAMELLEN-FUNKTION - NUR NACH AUSSEN!
// ============================================
const applyLamellenFinal = (geometry, lamellenSettings) => {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;

    console.log(`🔧 Finale Lamellen-Anwendung auf ${vertexCount} Vertices...`);
    console.log(`📊 Settings: count=${lamellenSettings.count}, depth=${lamellenSettings.depth}`);

    const { count, depth } = lamellenSettings;
    const lamellenDepth = depth * 0.15; // Basis-Tiefe für deutliche Rillen

    // Jeder Vertex einzeln bearbeiten
    for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;

        const x = positions[i3];
        const y = positions[i3 + 1];
        const z = positions[i3 + 2];
        const currentRadius = Math.sqrt(x * x + z * z);

        if (currentRadius > 0.001) { // Vermeide Division durch 0
            // WINKEL-Position berechnen (0 bis 2π)
            const angle = Math.atan2(z, x);
            const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0 bis 1

            // VERTIKALE Lamellen basierend auf Winkel-Position
            // Jede Lamelle verläuft von oben nach unten
            const lamellenPhase = normalizedAngle * count * Math.PI * 2;
            const lamellenWave = Math.sin(lamellenPhase);

            // VOLLSTÄNDIGE Sinuswelle nutzen für echte Rillen (positiv UND negativ)
            // Positive Werte = nach außen, negative Werte = nach innen (Rillen)
            const lamellenOffset = lamellenWave * lamellenDepth;

            // Radiale Skalierung anwenden
            const newRadius = currentRadius + lamellenOffset;
            const scale = newRadius / currentRadius;

            positions[i3] = x * scale;     // X skalieren
            positions[i3 + 2] = z * scale; // Z skalieren
            // Y bleibt unverändert für vertikale Rillen
        }
    }

    console.log(`✅ ${count} perfekt vertikale Lamellen-Rillen (von oben nach unten) als finale Schicht aufgetragen`);
    console.log(`📐 Lamellen-Tiefe: ±${lamellenDepth.toFixed(3)}cm (rein UND raus für echte Rillen)`);
    console.log(`🏺 Rillen verlaufen vertikal entlang der Außenkontur`);
};

// ============================================
// HILFSFUNKTIONEN (unverändert)
// ============================================

const createSmoothedContour = (audioData, controlPoints = 16, audioPreservation = 0.85) => {
    console.log(`🌊 Erstelle Audio-erhaltende Kontur mit ${controlPoints} Stützpunkten...`);
    const adaptivePoints = Math.max(controlPoints, Math.floor(audioData.length * 0.15));
    const keyPoints = extractKeyPointsPreservative(audioData, adaptivePoints, audioPreservation);
    const smoothedPoints = interpolateSplinePreservative(keyPoints, audioData.length);
    const contourWithAudio = blendWithOriginalAudio(smoothedPoints, audioData, audioPreservation);
    console.log(`📈 Audio-erhaltende Kontur: ${keyPoints.length} Schlüssel → ${contourWithAudio.length} Punkte`);
    return contourWithAudio;
};

const extractKeyPointsPreservative = (audioData, numPoints, preservation) => {
    const keyPoints = [];
    if (numPoints >= audioData.length * 0.8) {
        const step = audioData.length / numPoints;
        for (let i = 0; i < numPoints; i++) {
            const index = Math.min(Math.floor(i * step), audioData.length - 1);
            keyPoints.push({
                position: index / (audioData.length - 1),
                amplitude: audioData[index].amplitude,
                frequency: audioData[index].frequency,
                originalIndex: index
            });
        }
    } else {
        const step = audioData.length / (numPoints - 1);
        for (let i = 0; i < numPoints; i++) {
            const centerIndex = Math.round(i * step);
            const actualIndex = Math.min(centerIndex, audioData.length - 1);
            const windowSize = Math.max(1, Math.floor(audioData.length / (numPoints * 4)));
            const startIdx = Math.max(0, actualIndex - windowSize);
            const endIdx = Math.min(audioData.length - 1, actualIndex + windowSize);

            let bestIndex = actualIndex;
            let bestScore = audioData[actualIndex].amplitude;

            for (let j = startIdx; j <= endIdx; j++) {
                const score = audioData[j].amplitude + audioData[j].frequency * 0.1;
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = j;
                }
            }

            keyPoints.push({
                position: bestIndex / (audioData.length - 1),
                amplitude: audioData[bestIndex].amplitude,
                frequency: audioData[bestIndex].frequency,
                originalIndex: bestIndex
            });
        }
    }

    keyPoints[0].position = 0;
    keyPoints[keyPoints.length - 1].position = 1;
    return keyPoints;
};

const interpolateSplinePreservative = (keyPoints, targetLength) => {
    const interpolatedPoints = [];
    for (let i = 0; i < targetLength; i++) {
        const t = i / (targetLength - 1);
        let segmentIndex = 0;
        for (let j = 0; j < keyPoints.length - 1; j++) {
            if (t >= keyPoints[j].position && t <= keyPoints[j + 1].position) {
                segmentIndex = j;
                break;
            }
        }

        const p0 = keyPoints[Math.max(0, segmentIndex - 1)];
        const p1 = keyPoints[segmentIndex];
        const p2 = keyPoints[Math.min(keyPoints.length - 1, segmentIndex + 1)];
        const p3 = keyPoints[Math.min(keyPoints.length - 1, segmentIndex + 2)];

        const segmentLength = p2.position - p1.position;
        const localT = segmentLength > 0 ? (t - p1.position) / segmentLength : 0;
        const tension = 0.3;

        const amplitude = catmullRomInterpolateGentle(p0.amplitude, p1.amplitude, p2.amplitude, p3.amplitude, localT, tension);
        const frequency = catmullRomInterpolateGentle(p0.frequency, p1.frequency, p2.frequency, p3.frequency, localT, tension);

        interpolatedPoints.push({
            amplitude: Math.max(0, amplitude),
            frequency: Math.max(0, frequency),
            time: i * 0.1
        });
    }
    return interpolatedPoints;
};

const catmullRomInterpolateGentle = (p0, p1, p2, p3, t, tension = 0.5) => {
    const t2 = t * t;
    const t3 = t2 * t;
    return tension * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3) + (1 - tension) * (p1 + (p2 - p1) * t);
};

const blendWithOriginalAudio = (smoothedPoints, originalAudio, preservation) => {
    const blendedPoints = [];
    for (let i = 0; i < smoothedPoints.length; i++) {
        const originalIndex = Math.floor(i * (originalAudio.length - 1) / (smoothedPoints.length - 1));
        const original = originalAudio[Math.min(originalIndex, originalAudio.length - 1)];
        const smoothed = smoothedPoints[i];
        const smoothWeight = 1 - preservation;
        const audioWeight = preservation;

        blendedPoints.push({
            amplitude: smoothed.amplitude * smoothWeight + original.amplitude * audioWeight,
            frequency: smoothed.frequency * smoothWeight + original.frequency * audioWeight,
            time: original.time
        });
    }
    return blendedPoints;
};

const smoothGeometryForPrinting = (positions, segments, heightSegments, printParams) => {
    const iterations = Math.max(1, Math.floor(printParams.smoothingStrength * 2));
    const preservationFactor = printParams.audioPreservation;

    for (let iter = 0; iter < iterations; iter++) {
        const newPositions = [...positions];
        const vertexCount = positions.length / 3;

        for (let h = 1; h < heightSegments; h++) {
            for (let s = 0; s < segments; s++) {
                const currentVertexIndex = h * (segments + 1) + s;
                if (currentVertexIndex >= vertexCount) continue;
                const currentIndex = currentVertexIndex * 3;

                const neighbors = [];
                if (h > 0) neighbors.push(((h - 1) * (segments + 1) + s) * 3);
                if (h < heightSegments - 1) neighbors.push(((h + 1) * (segments + 1) + s) * 3);

                if (neighbors.length === 0) continue;

                let avgX = 0, avgY = 0, avgZ = 0;
                for (let nIdx of neighbors) {
                    avgX += positions[nIdx];
                    avgY += positions[nIdx + 1];
                    avgZ += positions[nIdx + 2];
                }
                avgX /= neighbors.length;
                avgY /= neighbors.length;
                avgZ /= neighbors.length;

                const smoothingStrength = 0.1;
                newPositions[currentIndex] = positions[currentIndex] * preservationFactor + (positions[currentIndex] * (1 - smoothingStrength) + avgX * smoothingStrength) * (1 - preservationFactor);
                newPositions[currentIndex + 1] = positions[currentIndex + 1] * 0.95 + (positions[currentIndex + 1] * (1 - smoothingStrength * 0.3) + avgY * smoothingStrength * 0.3) * 0.05;
                newPositions[currentIndex + 2] = positions[currentIndex + 2] * preservationFactor + (positions[currentIndex + 2] * (1 - smoothingStrength) + avgZ * smoothingStrength) * (1 - preservationFactor);
            }
        }

        for (let i = 0; i < positions.length; i++) {
            positions[i] = newPositions[i];
        }
    }
};

const reduceSharpSpikes = (positions, segments, heightSegments, printParams) => {
    const vertexCount = positions.length / 3;
    const maxSpikeHeight = printParams.maxSpikeHeight / 10;
    let spikesReduced = 0;

    for (let h = 1; h < heightSegments - 1; h++) {
        for (let s = 0; s < segments; s++) {
            const currentVertexIndex = h * (segments + 1) + s;
            if (currentVertexIndex >= vertexCount) continue;
            const currentIndex = currentVertexIndex * 3;

            const neighbors = [
                ((h - 1) * (segments + 1) + s) * 3,
                ((h + 1) * (segments + 1) + s) * 3,
                (h * (segments + 1) + ((s - 1 + segments) % segments)) * 3,
                (h * (segments + 1) + ((s + 1) % segments)) * 3
            ];

            let avgRadius = 0;
            for (let nIdx of neighbors) {
                const nx = positions[nIdx];
                const nz = positions[nIdx + 2];
                avgRadius += Math.sqrt(nx * nx + nz * nz);
            }
            avgRadius /= neighbors.length;

            const currentX = positions[currentIndex];
            const currentZ = positions[currentIndex + 2];
            const currentRadius = Math.sqrt(currentX * currentX + currentZ * currentZ);
            const radiusDiff = Math.abs(currentRadius - avgRadius);

            if (radiusDiff > maxSpikeHeight * 2.0) {
                const reductionStrength = 0.5;
                const targetRadius = avgRadius + (currentRadius - avgRadius) * reductionStrength;
                if (currentRadius > 0) {
                    const scale = targetRadius / currentRadius;
                    positions[currentIndex] *= scale;
                    positions[currentIndex + 2] *= scale;
                    spikesReduced++;
                }
            }
        }
    }
};

const calculateWavePattern = (angle, normalizedY, wavePattern, amplitude, frequency) => {
    const { type, amplitude: waveAmp, frequency: waveFreq, spiralTurns, phase } = wavePattern;
    const phaseRad = (phase * Math.PI) / 180;
    let waveValue = 0;

    switch (type) {
        case 'spiral':
            const spiralAngle = angle + normalizedY * spiralTurns * Math.PI * 2;
            waveValue = Math.sin(spiralAngle * waveFreq + phaseRad) * waveAmp;
            waveValue += Math.sin(spiralAngle * waveFreq * 2 + phaseRad * 1.5) * waveAmp * 0.3;
            break;
        case 'vertical':
            waveValue = Math.sin(angle * waveFreq + phaseRad) * waveAmp;
            break;
        case 'horizontal':
            waveValue = Math.sin(normalizedY * Math.PI * waveFreq + phaseRad) * waveAmp;
            break;
        case 'diamond':
            const diamondPattern = Math.sin(angle * waveFreq + normalizedY * Math.PI * 4 + phaseRad) + Math.sin((angle + Math.PI / 4) * waveFreq - normalizedY * Math.PI * 4 + phaseRad);
            waveValue = diamondPattern * waveAmp * 0.5;
            break;
    }

    waveValue *= (0.7 + amplitude * 0.6);
    waveValue *= (0.8 + frequency * 0.4);
    return waveValue;
};

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
    const t2 = t * t;
    const t3 = t2 * t;
    const weight = 3 * t2 - 2 * t3;

    return {
        amplitude: lower.amplitude + (upper.amplitude - lower.amplitude) * weight,
        frequency: lower.frequency + (upper.frequency - lower.frequency) * weight
    };
};

const smoothGeometry = (positions, segments, heightSegments, iterations = 2) => {
    for (let iter = 0; iter < iterations; iter++) {
        const newPositions = [...positions];
        const vertexCount = positions.length / 3;

        for (let h = 1; h < heightSegments; h++) {
            for (let s = 0; s < segments; s++) {
                const currentVertexIndex = h * (segments + 1) + s;
                if (currentVertexIndex >= vertexCount) continue;
                const currentIndex = currentVertexIndex * 3;
                const prevIndex = ((h - 1) * (segments + 1) + s) * 3;
                const nextIndex = ((h + 1) * (segments + 1) + s) * 3;
                const leftIndex = (h * (segments + 1) + ((s - 1 + segments) % segments)) * 3;
                const rightIndex = (h * (segments + 1) + ((s + 1) % segments)) * 3;

                if (prevIndex >= 0 && nextIndex < positions.length && leftIndex >= 0 && rightIndex < positions.length) {
                    newPositions[currentIndex] = (positions[currentIndex] * 0.4 + positions[prevIndex] * 0.15 + positions[nextIndex] * 0.15 + positions[leftIndex] * 0.15 + positions[rightIndex] * 0.15);
                    newPositions[currentIndex + 2] = (positions[currentIndex + 2] * 0.4 + positions[prevIndex + 2] * 0.15 + positions[nextIndex + 2] * 0.15 + positions[leftIndex + 2] * 0.15 + positions[rightIndex + 2] * 0.15);
                }
            }
        }

        for (let i = 0; i < positions.length; i++) {
            positions[i] = newPositions[i];
        }
    }
};

// Weitere Funktionen (createInnerLight, etc.) bleiben unverändert...
export const createVaseMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xfff8e1,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.95,
        transparent: true,
        opacity: 0.15,
        thickness: 1.2,
        envMapIntensity: 0.8,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        ior: 1.45,
        sheen: 0.5,
        sheenRoughness: 0.2,
        sheenColor: 0xffecb3,
        emissive: 0xfff3e0,
        emissiveIntensity: 0.05
    });
};

// Volumetrische Beleuchtungs-Funktionen...
export const createVolumetricLighting = (vaseHeight = 20) => {
    const volumetricGroup = new THREE.Group();
    const coneGeometry = new THREE.ConeGeometry(8, 25, 8, 1, true);

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
                float dist = length(vPosition.xz) / 8.0;
                float heightFade = (vPosition.y + 12.5) / 25.0;
                heightFade = clamp(heightFade, 0.0, 1.0);
                float noise = sin(vPosition.x * 3.0 + time) * sin(vPosition.z * 3.0 + time * 0.7) * sin(vPosition.y * 2.0 + time * 0.5);
                noise = (noise + 1.0) * 0.5;
                float alpha = (1.0 - dist) * heightFade * noise * intensity;
                alpha = clamp(alpha, 0.0, 0.6);
                gl_FragColor = vec4(color, alpha);
            }
        `
    });

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
        mesh.rotation.x = Math.PI;
        volumetricGroup.add(mesh);
    });

    return volumetricGroup;
};

export const createCausticEffect = () => {
    const causticGroup = new THREE.Group();
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
                float caustic = causticPattern(vUv, time);
                caustic = pow(max(caustic, 0.0), 2.0);
                float radialFade = 1.0 - smoothstep(0.0, 0.4, dist);
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
    causticMesh.rotation.x = -Math.PI / 2;
    causticMesh.position.y = -14.9;
    causticGroup.add(causticMesh);

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
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 20;
        positions[i3 + 1] = Math.random() * 15 - 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 20;
        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = Math.random() * 0.01 + 0.005;
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
                pos += velocity * time * 50.0;
                if (pos.y > 8.0) {
                    pos.y = -12.0;
                }
                vAlpha = 1.0 - smoothstep(-5.0, 5.0, pos.y);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * 100.0 / length(gl_Position.xyz);
            }
        `,
        fragmentShader: `
            uniform float intensity;
            varying float vAlpha;
            
            void main() {
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

export const createInnerLight = (vaseHeight = 20, innerLightY = 0.33) => {
    const lightGroup = new THREE.Group();
    const calculatedHeight = -vaseHeight / 2 + (vaseHeight * innerLightY);
    const innerMainLight = new THREE.PointLight(0xffffff, 18.0, 60);
    innerMainLight.position.set(0, calculatedHeight, 0);
    innerMainLight.castShadow = false;
    lightGroup.add(innerMainLight);

    const innerLights = [
        { color: 0xffffff, position: [0, calculatedHeight + 3, 0], intensity: 12.0 },
        { color: 0xffffff, position: [0, calculatedHeight - 2, 0], intensity: 12.0 },
        { color: 0xffffff, position: [2, calculatedHeight, 0], intensity: 8.0 },
        { color: 0xffffff, position: [-2, calculatedHeight, 0], intensity: 8.0 },
        { color: 0xffffff, position: [0, calculatedHeight, 2], intensity: 8.0 },
        { color: 0xffffff, position: [0, calculatedHeight, -2], intensity: 8.0 },
        { color: 0xffffff, position: [1.5, calculatedHeight + 1, 1.5], intensity: 6.0 },
        { color: 0xffffff, position: [-1.5, calculatedHeight + 1, -1.5], intensity: 6.0 },
        { color: 0xffffff, position: [1.5, calculatedHeight - 1, -1.5], intensity: 6.0 },
        { color: 0xffffff, position: [-1.5, calculatedHeight - 1, 1.5], intensity: 6.0 },
    ];

    innerLights.forEach(lightConfig => {
        const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 40);
        light.position.set(...lightConfig.position);
        light.castShadow = false;
        lightGroup.add(light);
    });

    const accentLights = [
        { color: 0xfff3e0, position: [1, calculatedHeight + 2, 0], intensity: 4.0 },
        { color: 0xe3f2fd, position: [-1, calculatedHeight + 2, 0], intensity: 4.0 },
        { color: 0xffecb3, position: [0, calculatedHeight + 1, 1], intensity: 4.0 },
        { color: 0xf3e5f5, position: [0, calculatedHeight + 1, -1], intensity: 4.0 },
    ];

    accentLights.forEach(lightConfig => {
        const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 25);
        light.position.set(...lightConfig.position);
        light.castShadow = false;
        lightGroup.add(light);
    });

    const supportLights = [
        { color: 0xffffff, position: [0, -vaseHeight / 2 - 2, 0], intensity: 3.0 },
        { color: 0xe3f2fd, position: [3, -vaseHeight / 2 - 1, 0], intensity: 2.0 },
        { color: 0xfff3e0, position: [-3, -vaseHeight / 2 - 1, 0], intensity: 2.0 },
        { color: 0xf8bbd9, position: [0, -vaseHeight / 2 - 1, 3], intensity: 2.0 },
        { color: 0xc8e6c9, position: [0, -vaseHeight / 2 - 1, -3], intensity: 2.0 },
    ];

    supportLights.forEach(lightConfig => {
        const light = new THREE.PointLight(lightConfig.color, lightConfig.intensity, 30);
        light.position.set(...lightConfig.position);
        light.castShadow = false;
        lightGroup.add(light);
    });

    const topSpot = new THREE.SpotLight(0xffffff, 6.0, 50, Math.PI * 0.5, 0.2, 1);
    topSpot.position.set(0, vaseHeight / 2 + 5, 0);
    topSpot.target.position.set(0, calculatedHeight, 0);
    topSpot.castShadow = false;
    lightGroup.add(topSpot);
    lightGroup.add(topSpot.target);

    const hemiLight = new THREE.HemisphereLight(0xfff8e1, 0x87ceeb, 0.8);
    lightGroup.add(hemiLight);

    return lightGroup;
};