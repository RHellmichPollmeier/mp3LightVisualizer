// ============================================
// src/mesh/vaseGeometry.js - ORGANISCHE KONTUR durch 2D-SPLINE-GLÄTTUNG
// ============================================
import * as THREE from 'three';
import { PerlinNoise } from '../utils/perlinNoise.js';
import { smoothAudioData } from '../utils/audioAnalysis.js';

// ============================================
// LAMELLEN-STRUKTUR auf fertiger Oberfläche
// ============================================
// ============================================
// VERTIKALE LAMELLEN-STRUKTUR (IMMER AKTIV)
// ============================================
// ============================================
// HORIZONTALE LAMELLEN-STRUKTUR (nur nach außen) - wie im Bild 2
// ============================================
const applyLamellen = (positions, segments, heightSegments, lamellenSettings) => {
    if (!lamellenSettings.enabled || lamellenSettings.type !== 'lamellen') return;

    const { frequency: lamellenCount, amplitude: lamellenDepth, lamellenDepth: depthMultiplier } = lamellenSettings;
    const actualDepth = (lamellenDepth || 0.4) * (depthMultiplier || 0.6) * 0.5; // Erhöhte Tiefe für bessere Sichtbarkeit

    console.log(`🏺 Anwenden von ${lamellenCount} HORIZONTALEN Lamellen (nur nach außen) mit Tiefe ${actualDepth}...`);

    // Vase-Höhe ermitteln
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < positions.length; i += 3) {
        minY = Math.min(minY, positions[i]);
        maxY = Math.max(maxY, positions[i]);
    }
    const vaseHeight = maxY - minY;

    // Für jeden Vertex
    for (let h = 0; h < heightSegments + 1; h++) {
        for (let s = 0; s <= segments; s++) {
            const vertexIndex = h * (segments + 1) + s;
            const i3 = vertexIndex * 3;

            if (i3 + 2 >= positions.length) continue;

            const x = positions[i3];
            const y = positions[i3 + 1];
            const z = positions[i3 + 2];
            const currentRadius = Math.sqrt(x * x + z * z);

            if (currentRadius > 0) {
                // HORIZONTALE Lamellen: Position basierend auf Y-Höhe
                const normalizedY = (y - minY) / vaseHeight; // 0 bis 1
                const lamellenPhase = normalizedY * lamellenCount * Math.PI * 2;
                const lamellenIntensity = Math.sin(lamellenPhase);

                // NUR POSITIVE Offsets (nur nach außen!) - Stärkerer Effekt
                const lamellenOffset = Math.max(0, lamellenIntensity) * actualDepth;

                // Normale zur Oberfläche (radial nach außen)
                const normalX = x / currentRadius;
                const normalZ = z / currentRadius;

                // Horizontale Lamellen nur nach außen anwenden
                positions[i3] += normalX * lamellenOffset;
                positions[i3 + 2] += normalZ * lamellenOffset;
            }
        }
    }

    console.log(`✅ Horizontale Lamellen-Struktur angewendet: ${lamellenCount} horizontale Rillen nur nach außen`);
};

export const createVaseGeometry = (audioData, settings, perlinNoise) => {
    if (!audioData || audioData.length === 0) return null;

    const {
        height, baseRadius, topRadius, segments, heightSegments,
        amplification, noiseIntensity, smoothing, wavePattern,
        printOptimization // 3D-DRUCK PARAMETER
    } = settings;

    console.log('🏺 Organische Vase-Generierung mit 2D-Spline-Glättung gestartet...');

    // Audio-Daten normalisieren
    const maxAmplitude = Math.max(...audioData.map(d => d.amplitude));
    const normalizedAudio = audioData.map(d => ({
        ...d,
        amplitude: d.amplitude / (maxAmplitude || 1),
        frequency: d.frequency / 22050
    }));

    // Druckparameter extrahieren oder Defaults setzen - AUDIO-FREUNDLICH
    const printParams = {
        enabled: printOptimization?.enabled || false,
        maxOverhang: printOptimization?.maxOverhang || 45,
        maxSpikeHeight: printOptimization?.spikeThreshold || 2.0,
        audioPreservation: printOptimization?.audioPreservation || 0.85, // HÖHER: mehr Audio-Details erhalten
        smoothingStrength: printOptimization?.smoothingStrength || 0.15, // NIEDRIGER: weniger Glättung
        contourSmoothingPoints: Math.max(16, Math.floor(normalizedAudio.length * 0.3)) // MEHR PUNKTE basierend auf Audio-Länge
    };

    if (printParams.enabled) {
        console.log('🛡️ 3D-Druck-Modus mit organischer Konturglättung aktiviert:');
        console.log(`   Max Überhang: ${printParams.maxOverhang}°`);
        console.log(`   Kontur-Stützpunkte: ${printParams.contourSmoothingPoints}`);
        console.log(`   Audio-Erhaltung: ${Math.round(printParams.audioPreservation * 100)}%`);
    }

    const geometry = new THREE.CylinderGeometry(topRadius, baseRadius, height, segments, heightSegments, true);
    const positions = geometry.attributes.position.array;

    // ===== NEUE 2D-KONTUR-GLÄTTUNG - AUDIO-ERHALTEND =====
    const smoothedContour = printParams.enabled ?
        createSmoothedContour(normalizedAudio, printParams.contourSmoothingPoints, printParams.audioPreservation) :
        normalizedAudio;

    // Audio-Daten nur minimal glätten für organische Übergänge - AUCH bei 3D-Druck
    let workingAudio = printParams.enabled ?
        smoothedContour : // Bereits intelligent geglättet
        smoothAudioData(smoothAudioData(normalizedAudio, smoothing), smoothing * 0.5); // Original-Glättung

    console.log(`📈 Kontur: ${normalizedAudio.length} → ${workingAudio.length} Punkte (${printParams.enabled ? 'Smart geglättet' : 'Original'})`);
    console.log(`🎵 Audio-Erhaltung: ${Math.round(printParams.audioPreservation * 100)}%`);

    const maxRadiusChange = printParams.enabled ?
        Math.min(amplification, printParams.maxSpikeHeight / 10) : // Begrenzt auf Spike-Schwellwert
        amplification;

    console.log(`📏 Max Radius-Änderung: ${maxRadiusChange.toFixed(2)} (Original: ${amplification})`);

    // ===== ÜBERHANG-BEWUSSTE GEOMETRIE-ERZEUGUNG =====
    const maxOverhangRad = (printParams.maxOverhang * Math.PI) / 180;
    let overhangWarnings = 0;

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const normalizedY = (y + height / 2) / height;
        const angle = Math.atan2(z, x);
        const currentRadius = Math.sqrt(x * x + z * z);

        // ===== ORGANISCHE AUDIO-INTERPOLATION =====
        const audioValue = interpolateAudioData(workingAudio, normalizedY);
        const amplitude = audioValue.amplitude;
        const frequency = audioValue.frequency;

        // ===== DRUCKFREUNDLICHE EFFEKTE =====

        // 1. BEGRENZTE AMPLITUDE-EFFEKTE
        let amplitudeEffect = Math.pow(amplitude, 1.2) * maxRadiusChange * (1 + frequency * 0.3);

        // 2. SANFTE PERLIN-NOISE (weniger aggressiv)
        const noiseScale = printParams.enabled ?
            Math.min(noiseIntensity, 1.0) :
            noiseIntensity;

        const noise1 = perlinNoise.noise(
            angle * 2 + frequency * 3,
            normalizedY * 6 + amplitude * 2,
            amplitude * 10
        ) * 0.4;

        const noise2 = perlinNoise.noise(
            angle * 6 + frequency * 8,
            normalizedY * 12 + amplitude * 4,
            amplitude * 20
        ) * 0.2;

        const combinedNoise = (noise1 + noise2) * noiseScale;

        // 3. SANFTE FREQUENZ-WELLEN
        const frequencyWave = Math.sin(angle * frequency * 15 + normalizedY * Math.PI * 3) *
            frequency * 0.2 * maxRadiusChange;

        // 4. WELLENMUSTER-EFFEKTE (falls aktiviert)
        let waveEffect = 0;
        if (wavePattern && wavePattern.enabled) {
            waveEffect = calculateWavePattern(
                angle, normalizedY, wavePattern, amplitude, frequency
            );

            // Bei 3D-Druck: Wellenmuster begrenzen
            if (printParams.enabled) {
                waveEffect = Math.max(-maxRadiusChange * 0.3,
                    Math.min(maxRadiusChange * 0.3, waveEffect));
            }
        }

        // 5. GESAMTE RADIUS-MODIFIKATION BERECHNEN
        let totalRadiusChange = amplitudeEffect + combinedNoise + frequencyWave + waveEffect;

        // ===== 3D-DRUCK ÜBERHANG-PRÜFUNG UND -KORREKTUR - AUDIO-SCHONEND =====
        if (printParams.enabled) {
            // Benachbarte Y-Levels für Überhang-Berechnung
            const prevY = normalizedY - (1 / heightSegments);

            if (prevY >= 0) {
                const prevAudioValue = interpolateAudioData(workingAudio, prevY);
                const prevAmplitudeEffect = Math.pow(prevAudioValue.amplitude, 1.2) * maxRadiusChange;

                // Radius-Änderung zwischen Levels berechnen
                const radiusGradient = totalRadiusChange - prevAmplitudeEffect;
                const heightStep = height / heightSegments;

                // Überhang-Winkel berechnen
                const overhangAngle = Math.atan(Math.abs(radiusGradient) / heightStep);

                if (overhangAngle > maxOverhangRad) {
                    // NUR bei extremen Überhängen korrigieren - Audio-Charakteristik erhalten
                    const severity = overhangAngle / maxOverhangRad; // 1.0 = kritisch, höher = sehr kritisch

                    if (severity > 1.3) { // Nur bei wirklich kritischen Überhängen (>30% über Limit)
                        const maxAllowedRadiusChange = Math.tan(maxOverhangRad) * heightStep;
                        const sign = radiusGradient >= 0 ? 1 : -1;

                        // Sanfte Korrektur: Audio-Wert teilweise erhalten
                        const correctionStrength = Math.min(0.6, (severity - 1.3) / 1.0); // Max 60% Korrektur
                        const correctedChange = prevAmplitudeEffect + (maxAllowedRadiusChange * sign * 0.9);

                        totalRadiusChange = totalRadiusChange * (1 - correctionStrength) +
                            correctedChange * correctionStrength;
                        overhangWarnings++;
                    }
                }
            }
        }

        // ===== FINALE POSITION BERECHNEN =====
        const newRadius = Math.max(currentRadius * 0.2, currentRadius + totalRadiusChange);

        // Sanfte vertikale Verzerrung (reduziert bei 3D-Druck)
        const verticalDistortionScale = printParams.enabled ? 0.3 : 0.8;
        const verticalDistortion = perlinNoise.noise(
            angle * 1.5,
            normalizedY * 4,
            amplitude * 6
        ) * amplitude * verticalDistortionScale;

        // Position aktualisieren
        positions[i] = (x / currentRadius) * newRadius;
        positions[i + 1] = y + (printParams.enabled ?
            Math.max(-0.5, Math.min(0.5, verticalDistortion)) : // Begrenzt
            verticalDistortion); // Unbegrenzt
        positions[i + 2] = (z / currentRadius) * newRadius;
    }

    // ===== DRUCKFREUNDLICHE NACHBEARBEITUNG - AUDIO-SCHONEND =====
    if (printParams.enabled) {
        console.log(`⚠️ Überhang-Korrekturen: ${overhangWarnings} (nur extreme Fälle)`);

        // NUR MINIMALE GLÄTTUNG für bessere Druckbarkeit
        smoothGeometryForPrinting(positions, segments, heightSegments, printParams);

        // NUR EXTREME SPIKE-REDUCTION 
        reduceSharpSpikes(positions, segments, heightSegments, printParams);

        console.log(`🎵 Audio-Charakteristik: ${Math.round(printParams.audioPreservation * 100)}% erhalten`);
    } else {
        // Standard-Glättung für organische Oberfläche
        smoothGeometry(positions, segments, heightSegments, 2);
    }

    applyLamellen(positions, segments, heightSegments);
    // Geometrie aktualisieren
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    console.log('✅ Organische Vase mit geglätteter Kontur erfolgreich generiert!');
    return geometry;
};

// ============================================
// ORGANISCHE 2D-KONTUR-GLÄTTUNG durch SPLINE-INTERPOLATION
// ============================================

/**
 * Erstellt eine minimal geglättete Kontur die Audio-Charakteristiken erhält
 */
const createSmoothedContour = (audioData, controlPoints = 16, audioPreservation = 0.85) => {
    console.log(`🌊 Erstelle Audio-erhaltende Kontur mit ${controlPoints} Stützpunkten...`);

    // Weniger aggressiv: Verwende mehr Schlüsselpunkte
    const adaptivePoints = Math.max(controlPoints, Math.floor(audioData.length * 0.15)); // Min 15% der Original-Punkte

    // ===== SCHRITT 1: Intelligente Schlüsselpunkte aus Audio-Daten extrahieren =====
    const keyPoints = extractKeyPointsPreservative(audioData, adaptivePoints, audioPreservation);

    // ===== SCHRITT 2: Sanfte Spline-Interpolation zwischen Schlüsselpunkten =====
    const smoothedPoints = interpolateSplinePreservative(keyPoints, audioData.length);

    // ===== SCHRITT 3: Audio-Charakteristiken STARK erhalten =====
    const contourWithAudio = blendWithOriginalAudio(smoothedPoints, audioData, audioPreservation);

    console.log(`📈 Audio-erhaltende Kontur: ${keyPoints.length} Schlüssel → ${contourWithAudio.length} Punkte`);
    console.log(`🎵 Audio-Treue: ${Math.round(audioPreservation * 100)}% (sehr hoch)`);
    return contourWithAudio;
};

/**
 * Extrahiert wichtige Wendepunkte aus den Audio-Daten - AUDIO-ERHALTEND
 */
const extractKeyPointsPreservative = (audioData, numPoints, preservation) => {
    const keyPoints = [];

    if (numPoints >= audioData.length * 0.8) {
        // Fast alle Punkte beibehalten - nur minimale Glättung
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
        // Intelligente Auswahl: Peaks und wichtige Wendepunkte bevorzugen
        const step = audioData.length / (numPoints - 1);

        for (let i = 0; i < numPoints; i++) {
            const centerIndex = Math.round(i * step);
            const actualIndex = Math.min(centerIndex, audioData.length - 1);

            // Kleineres Fenster für bessere Audio-Erhaltung
            const windowSize = Math.max(1, Math.floor(audioData.length / (numPoints * 4))); // Kleineres Fenster
            const startIdx = Math.max(0, actualIndex - windowSize);
            const endIdx = Math.min(audioData.length - 1, actualIndex + windowSize);

            // Suche nach lokalem Maximum in diesem Bereich (Audio-Peaks bevorzugen)
            let bestIndex = actualIndex;
            let bestScore = audioData[actualIndex].amplitude;

            for (let j = startIdx; j <= endIdx; j++) {
                const score = audioData[j].amplitude + audioData[j].frequency * 0.1; // Peaks bevorzugen
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

    // Erste und letzte Punkte fest setzen für saubere Enden
    keyPoints[0].position = 0;
    keyPoints[keyPoints.length - 1].position = 1;

    console.log(`🎯 ${keyPoints.length} Audio-getreue Schlüsselpunkte extrahiert`);
    return keyPoints;
};

/**
 * Sanfte Catmull-Rom Spline Interpolation für Audio-erhaltende Kurven
 */
const interpolateSplinePreservative = (keyPoints, targetLength) => {
    const interpolatedPoints = [];

    for (let i = 0; i < targetLength; i++) {
        const t = i / (targetLength - 1); // 0-1 normalisiert

        // Finde umgebende Kontrollpunkte
        let segmentIndex = 0;
        for (let j = 0; j < keyPoints.length - 1; j++) {
            if (t >= keyPoints[j].position && t <= keyPoints[j + 1].position) {
                segmentIndex = j;
                break;
            }
        }

        // Catmull-Rom benötigt 4 Punkte: P0, P1, P2, P3
        const p0 = keyPoints[Math.max(0, segmentIndex - 1)];
        const p1 = keyPoints[segmentIndex];
        const p2 = keyPoints[Math.min(keyPoints.length - 1, segmentIndex + 1)];
        const p3 = keyPoints[Math.min(keyPoints.length - 1, segmentIndex + 2)];

        // Lokaler Parameter t zwischen p1 und p2
        const segmentLength = p2.position - p1.position;
        const localT = segmentLength > 0 ? (t - p1.position) / segmentLength : 0;

        // Sanfte Catmull-Rom Interpolation - weniger aggressiv
        const tension = 0.3; // Reduzierte Spannung für sanftere Kurven

        const amplitude = catmullRomInterpolateGentle(
            p0.amplitude, p1.amplitude, p2.amplitude, p3.amplitude, localT, tension
        );

        const frequency = catmullRomInterpolateGentle(
            p0.frequency, p1.frequency, p2.frequency, p3.frequency, localT, tension
        );

        interpolatedPoints.push({
            amplitude: Math.max(0, amplitude), // Keine negativen Amplituden
            frequency: Math.max(0, frequency),
            time: i * 0.1 // Dummy-Zeit
        });
    }

    console.log(`🌊 Sanfte Spline-Interpolation abgeschlossen: ${interpolatedPoints.length} Punkte`);
    return interpolatedPoints;
};

/**
 * Sanfte Catmull-Rom Spline Interpolation zwischen 4 Punkten
 */
const catmullRomInterpolateGentle = (p0, p1, p2, p3, t, tension = 0.5) => {
    const t2 = t * t;
    const t3 = t2 * t;

    // Reduzierte Tension für sanftere Kurven
    return tension * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    ) + (1 - tension) * (p1 + (p2 - p1) * t); // Linear blend für Sanftheit
};

/**
 * Catmull-Rom Spline Interpolation zwischen 4 Punkten - Original
 */
const catmullRomInterpolate = (p0, p1, p2, p3, t) => {
    const t2 = t * t;
    const t3 = t2 * t;

    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
};

/**
 * Mischt die geglättete Kontur mit den Original-Audio-Daten
 */
const blendWithOriginalAudio = (smoothedPoints, originalAudio, preservation) => {
    const blendedPoints = [];

    for (let i = 0; i < smoothedPoints.length; i++) {
        const originalIndex = Math.floor(i * (originalAudio.length - 1) / (smoothedPoints.length - 1));
        const original = originalAudio[Math.min(originalIndex, originalAudio.length - 1)];
        const smoothed = smoothedPoints[i];

        // Gewichtete Mischung: mehr Glättung = weniger Original-Audio
        const smoothWeight = 1 - preservation;
        const audioWeight = preservation;

        blendedPoints.push({
            amplitude: smoothed.amplitude * smoothWeight + original.amplitude * audioWeight,
            frequency: smoothed.frequency * smoothWeight + original.frequency * audioWeight,
            time: original.time
        });
    }

    console.log(`🎨 Audio-Charakteristiken erhalten: ${Math.round(preservation * 100)}% Original, ${Math.round((1 - preservation) * 100)}% Glättung`);
    return blendedPoints;
};

// ===== DRUCKFREUNDLICHE GLÄTTUNGS-FUNKTIONEN =====

const smoothGeometryForPrinting = (positions, segments, heightSegments, printParams) => {
    console.log('🔧 Anwenden der minimalen druckfreundlichen Glättung...');

    // DEUTLICH weniger Iterationen
    const iterations = Math.max(1, Math.floor(printParams.smoothingStrength * 2)); // Max 2 statt 5
    const preservationFactor = printParams.audioPreservation;

    for (let iter = 0; iter < iterations; iter++) {
        const newPositions = [...positions];
        const vertexCount = positions.length / 3;

        for (let h = 1; h < heightSegments; h++) {
            for (let s = 0; s < segments; s++) {
                const currentVertexIndex = h * (segments + 1) + s;

                if (currentVertexIndex >= vertexCount) continue;

                const currentIndex = currentVertexIndex * 3;

                // Nachbar-Indices sammeln
                const neighbors = [];

                // Nur direkte Nachbarn (weniger aggressiv)
                if (h > 0) neighbors.push(((h - 1) * (segments + 1) + s) * 3);
                if (h < heightSegments - 1) neighbors.push(((h + 1) * (segments + 1) + s) * 3);

                if (neighbors.length === 0) continue;

                // Durchschnitts-Position berechnen (nur vertikal)
                let avgX = 0, avgY = 0, avgZ = 0;
                for (let nIdx of neighbors) {
                    avgX += positions[nIdx];
                    avgY += positions[nIdx + 1];
                    avgZ += positions[nIdx + 2];
                }
                avgX /= neighbors.length;
                avgY /= neighbors.length;
                avgZ /= neighbors.length;

                // SEHR sanfte Glättung - Audio stark erhalten
                const smoothingStrength = 0.1; // Sehr sanft

                newPositions[currentIndex] =
                    positions[currentIndex] * preservationFactor +
                    (positions[currentIndex] * (1 - smoothingStrength) + avgX * smoothingStrength) * (1 - preservationFactor);

                // Y noch weniger glätten um Vasenhöhe zu erhalten
                newPositions[currentIndex + 1] =
                    positions[currentIndex + 1] * 0.95 +
                    (positions[currentIndex + 1] * (1 - smoothingStrength * 0.3) + avgY * smoothingStrength * 0.3) * 0.05;

                newPositions[currentIndex + 2] =
                    positions[currentIndex + 2] * preservationFactor +
                    (positions[currentIndex + 2] * (1 - smoothingStrength) + avgZ * smoothingStrength) * (1 - preservationFactor);
            }
        }

        // Neue Positionen übernehmen
        for (let i = 0; i < positions.length; i++) {
            positions[i] = newPositions[i];
        }
    }
};

const reduceSharpSpikes = (positions, segments, heightSegments, printParams) => {
    console.log('✂️ Reduzierung nur extremer Spitzen...');

    const vertexCount = positions.length / 3;
    const maxSpikeHeight = printParams.maxSpikeHeight / 10; // mm zu cm
    let spikesReduced = 0;

    for (let h = 1; h < heightSegments - 1; h++) {
        for (let s = 0; s < segments; s++) {
            const currentVertexIndex = h * (segments + 1) + s;

            if (currentVertexIndex >= vertexCount) continue;

            const currentIndex = currentVertexIndex * 3;

            // Nachbarn für Spike-Detection
            const neighbors = [
                ((h - 1) * (segments + 1) + s) * 3, // oben
                ((h + 1) * (segments + 1) + s) * 3, // unten
                (h * (segments + 1) + ((s - 1 + segments) % segments)) * 3, // links
                (h * (segments + 1) + ((s + 1) % segments)) * 3  // rechts
            ];

            // Durchschnitts-Radius der Nachbarn
            let avgRadius = 0;
            for (let nIdx of neighbors) {
                const nx = positions[nIdx];
                const nz = positions[nIdx + 2];
                avgRadius += Math.sqrt(nx * nx + nz * nz);
            }
            avgRadius /= neighbors.length;

            // Aktueller Radius
            const currentX = positions[currentIndex];
            const currentZ = positions[currentIndex + 2];
            const currentRadius = Math.sqrt(currentX * currentX + currentZ * currentZ);

            // Spike-Detection: Radius-Abweichung
            const radiusDiff = Math.abs(currentRadius - avgRadius);

            // NUR extreme Spitzen korrigieren (doppelte Schwelle)
            if (radiusDiff > maxSpikeHeight * 2.0) {
                // Sanfte Spike-Reduktion - Audio teilweise erhalten
                const reductionStrength = 0.5; // Nur 50% Reduktion
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

    console.log(`✂️ ${spikesReduced} extreme Spitzen reduziert (Audio-Details erhalten)`);
};

// ===== HILFSFUNKTIONEN (unverändert) =====

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
            const diamondPattern = Math.sin(angle * waveFreq + normalizedY * Math.PI * 4 + phaseRad) +
                Math.sin((angle + Math.PI / 4) * waveFreq - normalizedY * Math.PI * 4 + phaseRad);
            waveValue = diamondPattern * waveAmp * 0.5;
            break;

        case 'lamellen':
            // Keine Wave-Berechnung - wird separat angewendet
            waveValue = 0;
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
// VOLUMETRISCHE BELEUCHTUNGS-FUNKTIONEN (unverändert)
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

export const createInnerLight = (vaseHeight = 20, innerLightY = 0.33) => {
    const lightGroup = new THREE.Group();

    // ===== HAUPTLAMPE IM INNEREN der Vase bei konfigurierbarer Y-Position ===== 
    const calculatedHeight = -vaseHeight / 2 + (vaseHeight * innerLightY); // Y-Position basierend auf Parameter
    const innerMainLight = new THREE.PointLight(0xffffff, 18.0, 60); // SEHR HELL für Durchleuchtung
    innerMainLight.position.set(0, calculatedHeight, 0); // IM INNEREN bei konfigurierbarer Höhe!
    innerMainLight.castShadow = false;
    lightGroup.add(innerMainLight);

    // ===== ZUSÄTZLICHE INNENLICHTER für gleichmäßige Ausleuchtung =====
    const innerLights = [
        // Zentrale Lichter auf verschiedenen Höhen im Inneren
        { color: 0xffffff, position: [0, calculatedHeight + 3, 0], intensity: 12.0 },    // Etwas höher
        { color: 0xffffff, position: [0, calculatedHeight - 2, 0], intensity: 12.0 },    // Etwas tiefer

        // Ring von Lichtern um die Hauptlampe (im Inneren)
        { color: 0xffffff, position: [2, calculatedHeight, 0], intensity: 8.0 },         // Rechts innen
        { color: 0xffffff, position: [-2, calculatedHeight, 0], intensity: 8.0 },        // Links innen
        { color: 0xffffff, position: [0, calculatedHeight, 2], intensity: 8.0 },         // Vorne innen
        { color: 0xffffff, position: [0, calculatedHeight, -2], intensity: 8.0 },        // Hinten innen

        // Diagonale Lichter für bessere Verteilung
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

    // ===== FARBIGE AKZENT-LICHTER im Inneren für schöne Effekte =====
    const accentLights = [
        { color: 0xfff3e0, position: [1, calculatedHeight + 2, 0], intensity: 4.0 },     // Warm oben
        { color: 0xe3f2fd, position: [-1, calculatedHeight + 2, 0], intensity: 4.0 },    // Kühl oben
        { color: 0xffecb3, position: [0, calculatedHeight + 1, 1], intensity: 4.0 },     // Gelblich
        { color: 0xf3e5f5, position: [0, calculatedHeight + 1, -1], intensity: 4.0 },    // Lila
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
    topSpot.target.position.set(0, calculatedHeight, 0); // Zielt auf die Innenlampe
    topSpot.castShadow = false;
    lightGroup.add(topSpot);
    lightGroup.add(topSpot.target);

    // ===== HEMISPHERE für sanfte Umgebungsbeleuchtung =====
    const hemiLight = new THREE.HemisphereLight(0xfff8e1, 0x87ceeb, 0.8);
    lightGroup.add(hemiLight);

    console.log(`🏮 Lampenschirm-Beleuchtung erstellt: ${lightGroup.children.length} Lichter!`);
    console.log(`💡 Hauptlampe INNEN bei y = ${calculatedHeight.toFixed(2)} (${Math.round(innerLightY * 100)}% der Höhe)`);
    console.log(`🔥 Hauptlampe Intensität: ${innerMainLight.intensity}`);
    console.log(`📐 Vase Höhe: ${vaseHeight}, Boden: ${-vaseHeight / 2}, Top: ${vaseHeight / 2}`);

    return lightGroup;
};