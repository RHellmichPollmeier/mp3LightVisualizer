// ============================================
// src/mesh/vaseGeometry.js - KORRIGIERT: Lamellen als FINALE Schicht
// ============================================
import * as THREE from 'three';
import { PerlinNoise } from '../utils/perlinNoise.js';
import { smoothAudioData } from '../utils/audioAnalysis.js';

export const createVaseGeometry = (audioData, settings, perlinNoise) => {
    if (!audioData || audioData.length === 0) return null;

    console.log('🎵 Hybrid Audio-Verarbeitung gestartet...');

    // Pipeline ausführen
    const frequencyWaves = audioToFrequencyWaves(audioData, settings);
    const controlPoints = extractControlPointsFromWaves(frequencyWaves, settings.controlPoints || 12);
    const organicPoints = addOrganicVariationsToControlPoints(controlPoints, settings, perlinNoise);
    const splinePoints = createSmoothSplineFromOrganicPoints(organicPoints, settings.heightSegments);

    // Geometrie erstellen
    const geometry = new THREE.CylinderGeometry(
        settings.topRadius, settings.baseRadius, settings.height,
        settings.segments, settings.heightSegments, true
    );

    const positions = geometry.attributes.position.array;

    // Spline auf Geometrie anwenden
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const normalizedY = (y + settings.height / 2) / settings.height;
        const splineIndex = Math.floor(normalizedY * (splinePoints.length - 1));
        const splinePoint = splinePoints[Math.min(splineIndex, splinePoints.length - 1)];

        const currentRadius = Math.sqrt(x * x + z * z);
        const newRadius = Math.max(currentRadius * 0.3, currentRadius + splinePoint.radiusOffset);

        if (currentRadius > 0) {
            const scale = newRadius / currentRadius;
            positions[i] = x * scale;
            positions[i + 2] = z * scale;
        }
    }

    // Finale Lamellen anwenden (falls aktiviert)
    if (settings.lamellen && settings.lamellen.enabled) {
        applyLamellenFinal(geometry, settings.lamellen);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    console.log('✅ Hybrid Audio-Lampenschirm erstellt!');
    return geometry;
};

// ============================================
// HYBRID-PIPELINE FUNKTIONEN
// ============================================

const audioToFrequencyWaves = (audioData, settings) => {
    const waves = [];

    for (let i = 0; i < audioData.length; i++) {
        const audio = audioData[i];
        const t = i / (audioData.length - 1);

        let amplitudeWave = audio.amplitude * (settings.amplification || 3);

        const frequencyDetail = Math.sin(t * Math.PI * audio.frequency * 10) *
            audio.frequency * 0.3;

        const harmonic1 = Math.sin(t * Math.PI * 4) * audio.amplitude * 0.2;
        const harmonic2 = Math.sin(t * Math.PI * 8 + audio.frequency * 2) *
            audio.amplitude * 0.1;

        waves.push({
            y: t,
            amplitude: amplitudeWave + frequencyDetail + harmonic1 + harmonic2,
            frequency: audio.frequency,
            originalAmplitude: audio.amplitude,
            time: audio.time
        });
    }

    return waves;
};

const extractControlPointsFromWaves = (waves, numPoints) => {
    const controlPoints = [];
    const sectionSize = waves.length / numPoints;

    for (let i = 0; i < numPoints; i++) {
        const sectionStart = Math.floor(i * sectionSize);
        const sectionEnd = Math.floor((i + 1) * sectionSize);
        const section = waves.slice(sectionStart, sectionEnd);

        let bestPoint = section[0];
        let bestScore = 0;

        for (let point of section) {
            const amplitudeScore = Math.abs(point.amplitude) * 2;
            const frequencyScore = point.frequency * 0.5;
            const positionWeight = 1 + Math.sin(point.y * Math.PI) * 0.3;

            const score = (amplitudeScore + frequencyScore) * positionWeight;

            if (score > bestScore) {
                bestScore = score;
                bestPoint = point;
            }
        }

        controlPoints.push({
            y: bestPoint.y,
            radiusOffset: bestPoint.amplitude,
            frequency: bestPoint.frequency,
            originalAmplitude: bestPoint.originalAmplitude,
            sectionIndex: i,
            score: bestScore
        });
    }

    return controlPoints;
};

const addOrganicVariationsToControlPoints = (controlPoints, settings, perlinNoise) => {
    const organicPoints = [];
    const organicIntensity = settings.organicIntensity || 1.2;

    for (let i = 0; i < controlPoints.length; i++) {
        const point = controlPoints[i];

        const noiseX = point.y * 6;
        const noiseY = point.frequency * 4;
        const noiseZ = point.originalAmplitude * 8;

        const organicVariation1 = perlinNoise.noise(noiseX, noiseY, noiseZ) * organicIntensity * 0.4;
        const organicVariation2 = perlinNoise.noise(noiseX * 2.3, noiseY * 1.7, noiseZ * 0.8) * organicIntensity * 0.2;
        const organicVariation3 = perlinNoise.noise(noiseX * 0.7, noiseY * 3.1, noiseZ * 1.5) * organicIntensity * 0.1;

        const totalOrganicVariation = organicVariation1 + organicVariation2 + organicVariation3;

        organicPoints.push({
            y: point.y,
            radiusOffset: point.radiusOffset + totalOrganicVariation,
            frequency: point.frequency,
            originalAmplitude: point.originalAmplitude,
            organicContribution: totalOrganicVariation,
            audioContribution: point.radiusOffset
        });
    }

    return organicPoints;
};

const createSmoothSplineFromOrganicPoints = (organicPoints, resolution) => {
    const splinePoints = [];

    const extendedPoints = [
        { y: -0.1, radiusOffset: organicPoints[0].radiusOffset },
        ...organicPoints,
        { y: 1.1, radiusOffset: organicPoints[organicPoints.length - 1].radiusOffset }
    ];

    for (let i = 0; i < resolution; i++) {
        const t = i / (resolution - 1);

        let segmentIndex = 0;
        for (let j = 0; j < organicPoints.length - 1; j++) {
            if (t >= organicPoints[j].y && t <= organicPoints[j + 1].y) {
                segmentIndex = j + 1;
                break;
            }
        }

        const p0 = extendedPoints[Math.max(0, segmentIndex - 1)];
        const p1 = extendedPoints[segmentIndex];
        const p2 = extendedPoints[Math.min(extendedPoints.length - 1, segmentIndex + 1)];
        const p3 = extendedPoints[Math.min(extendedPoints.length - 1, segmentIndex + 2)];

        const segmentLength = p2.y - p1.y;
        const localT = segmentLength > 0 ? (t - p1.y) / segmentLength : 0;

        const radiusOffset = catmullRomInterpolateGentle(
            p0.radiusOffset, p1.radiusOffset,
            p2.radiusOffset, p3.radiusOffset,
            localT, 0.5
        );

        splinePoints.push({
            y: t,
            radiusOffset: radiusOffset
        });
    }

    return splinePoints;
};

// ============================================
// NEUE FINALE LAMELLEN-FUNKTION - NUR NACH AUSSEN!
// ============================================
// ============================================
// NEUE FINALE LAMELLEN-FUNKTION - MIT EINSTELLBARER BREITE!
// ============================================
// ============================================
// NEUE FINALE LAMELLEN-FUNKTION - MIT EINSTELLBARER BREITE!
// ============================================
const applyLamellenFinal = (geometry, lamellenSettings) => {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;

    console.log(`🔧 Finale Lamellen-Anwendung auf ${vertexCount} Vertices...`);
    console.log(`📊 Settings: count=${lamellenSettings.count}, depth=${lamellenSettings.depth}, width=${lamellenSettings.width || 0.5}`);

    const { count, depth, width = 0.5 } = lamellenSettings;
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

            // ===== NEUE RECHTECK-WELLENFORM mit einstellbarer Breite =====
            const lamellenPhase = normalizedAngle * count; // Anzahl Zyklen
            const cyclePosition = (lamellenPhase % 1); // 0 bis 1 innerhalb eines Zyklus

            let lamellenWave;

            // Rechteck-Welle mit einstellbarer Rille-zu-Erhebung Verhältnis
            if (cyclePosition < width) {
                // RILLE (nach innen) - Breite wird durch 'width' gesteuert
                lamellenWave = -1.0; // Vollständig nach innen
            } else {
                // ERHEBUNG (nach außen) - Rest des Zyklus
                lamellenWave = 1.0; // Vollständig nach außen
            }

            // Glättung der Kanten für bessere Druckbarkeit
            const edgeSmoothing = 0.1; // 10% der Zykluslänge für weiche Übergänge

            if (cyclePosition < edgeSmoothing) {
                // Weicher Übergang am Beginn der Rille
                const t = cyclePosition / edgeSmoothing;
                lamellenWave = Math.cos(t * Math.PI) * 0.5 + 0.5; // 1 → -1
                lamellenWave = 1.0 - 2.0 * lamellenWave; // Invertieren für Rille
            } else if (cyclePosition > width - edgeSmoothing && cyclePosition < width) {
                // Weicher Übergang am Ende der Rille
                const t = (cyclePosition - (width - edgeSmoothing)) / edgeSmoothing;
                lamellenWave = Math.cos((1 - t) * Math.PI) * 0.5 + 0.5; // -1 → 1
                lamellenWave = 1.0 - 2.0 * lamellenWave; // Invertieren für Rille
            } else if (cyclePosition > width && cyclePosition < width + edgeSmoothing) {
                // Weicher Übergang am Beginn der Erhebung
                const t = (cyclePosition - width) / edgeSmoothing;
                lamellenWave = Math.cos(t * Math.PI) * 0.5 + 0.5; // -1 → 1
                lamellenWave = 2.0 * lamellenWave - 1.0;
            } else if (cyclePosition > 1.0 - edgeSmoothing) {
                // Weicher Übergang am Ende der Erhebung
                const t = (cyclePosition - (1.0 - edgeSmoothing)) / edgeSmoothing;
                lamellenWave = Math.cos((1 - t) * Math.PI) * 0.5 + 0.5; // 1 → -1
                lamellenWave = 2.0 * lamellenWave - 1.0;
            }

            // Radiale Offset-Berechnung
            const lamellenOffset = lamellenWave * lamellenDepth;

            // Radiale Skalierung anwenden
            const newRadius = currentRadius + lamellenOffset;
            const scale = newRadius / currentRadius;

            positions[i3] = x * scale;     // X skalieren
            positions[i3 + 2] = z * scale; // Z skalieren
            // Y bleibt unverändert für vertikale Rillen
        }
    }

    console.log(`✅ ${count} perfekt vertikale Lamellen-Rillen mit ${Math.round(width * 100)}% Rillen-Breite erstellt`);
    console.log(`📐 Lamellen-Tiefe: ±${lamellenDepth.toFixed(3)}cm (rein UND raus für echte Rillen)`);
    console.log(`📏 Rillen-Breite: ${Math.round(width * 100)}% (${width < 0.3 ? 'schmale Linien' : width < 0.7 ? 'ausgewogene Rillen' : 'breite Rillen'})`);
    console.log(`🏺 Rillen verlaufen vertikal entlang der Außenkontur mit weichen Übergängen`);
};

// ============================================
// HILFSFUNKTIONEN (unverändert)
// ============================================

const catmullRomInterpolateGentle = (p0, p1, p2, p3, t, tension = 0.5) => {
    const t2 = t * t;
    const t3 = t2 * t;
    return tension * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3) + (1 - tension) * (p1 + (p2 - p1) * t);
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