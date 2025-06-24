import * as THREE from 'three';

// ============================================
// 3D-DRUCK OPTIMIERUNG - "MAKE PRINTABLE"
// ============================================

export const makePrintable = (geometry, options = {}) => {
    const {
        maxOverhang = 45,           // Max Überhang-Winkel in Grad
        minWallThickness = 0.4,     // Min Wandstärke in mm (wird zu cm konvertiert)
        smoothingIterations = 3,     // Anzahl Glättungs-Durchgänge
        preserveAudioDetail = 0.7,   // 0-1: Wie viel Audio-Detail erhalten bleibt
        spikeThreshold = 2.0,        // Schwellwert für Spike-Detection
        printDirection = 'Z'         // Druck-Richtung (Z = vertikal)
    } = options;

    console.log('🔧 Make Printable gestartet mit Parametern:');
    console.log(`   Max Überhang: ${maxOverhang}°`);
    console.log(`   Min Wandstärke: ${minWallThickness}mm`);
    console.log(`   Audio-Erhaltung: ${(preserveAudioDetail * 100).toFixed(0)}%`);
    console.log(`   Glättungs-Iterationen: ${smoothingIterations}`);

    const positions = geometry.attributes.position.array;
    const indices = geometry.index ? geometry.index.array : null;

    if (!indices) {
        console.error('❌ Geometrie benötigt Indices für Printability-Analyse');
        return geometry;
    }

    // ===== SCHRITT 1: PROBLEMBEREICHE ANALYSIEREN =====
    const problemAreas = analyzePrintability(positions, indices, maxOverhang, spikeThreshold);

    console.log(`🔍 Printability-Analyse abgeschlossen:`);
    console.log(`   Überhang-Probleme: ${problemAreas.overhangs.length}`);
    console.log(`   Spike-Probleme: ${problemAreas.spikes.length}`);
    console.log(`   Dünne Bereiche: ${problemAreas.thinAreas.length}`);

    // ===== SCHRITT 2: AUDIO-ERHALTENDE GLÄTTUNG =====
    const smoothedPositions = audioPreservingSmoothing(
        positions,
        indices,
        problemAreas,
        smoothingIterations,
        preserveAudioDetail
    );

    // ===== SCHRITT 3: ÜBERHANG-KORREKTUR =====
    const overhangCorrectedPositions = correctOverhangs(
        smoothedPositions,
        indices,
        maxOverhang,
        printDirection
    );

    // ===== SCHRITT 4: NEUE GEOMETRIE ERSTELLEN =====
    const printableGeometry = geometry.clone();
    printableGeometry.setAttribute('position', new THREE.Float32BufferAttribute(overhangCorrectedPositions, 3));
    printableGeometry.computeVertexNormals();

    // ===== SCHRITT 5: VALIDIERUNG =====
    const finalValidation = analyzePrintability(overhangCorrectedPositions, indices, maxOverhang, spikeThreshold);
    const improvementScore = calculateImprovementScore(problemAreas, finalValidation);

    console.log('✅ Make Printable abgeschlossen:');
    console.log(`   Verbesserung: ${(improvementScore * 100).toFixed(1)}%`);
    console.log(`   Verbleibende Überhänge: ${finalValidation.overhangs.length}`);
    console.log(`   Verbleibende Spitzen: ${finalValidation.spikes.length}`);
    console.log(`   🏆 Druckbarkeits-Score: ${calculatePrintabilityScore(finalValidation)}/100`);

    return printableGeometry;
};

// ===== PRINTABILITY ANALYSE =====
const analyzePrintability = (positions, indices, maxOverhang, spikeThreshold) => {
    const vertexCount = positions.length / 3;
    const problems = {
        overhangs: [],      // Überhang-Probleme
        spikes: [],         // Spitze Bereiche
        thinAreas: [],      // Dünne Bereiche
        unsupported: []     // Unsupportable Bereiche
    };

    // Vertex-Normalen berechnen für Überhang-Analyse
    const normals = calculateVertexNormals(positions, indices);

    // Z-Richtung für Druck-Analyse
    const upVector = new THREE.Vector3(0, 1, 0); // Y ist oben in unserer Vase
    const maxOverhangRad = (maxOverhang * Math.PI) / 180;

    for (let i = 0; i < vertexCount; i++) {
        const normal = normals[i];
        const vertexPos = new THREE.Vector3(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2]
        );

        // ===== ÜBERHANG-DETECTION =====
        const angle = normal.angleTo(upVector);
        const overhangAngle = Math.PI / 2 - angle; // Winkel zur Horizontalen

        if (overhangAngle > maxOverhangRad) {
            problems.overhangs.push({
                vertexIndex: i,
                angle: (overhangAngle * 180) / Math.PI,
                severity: overhangAngle / (Math.PI / 2), // 0-1
                position: vertexPos.clone()
            });
        }

        // ===== SPIKE-DETECTION =====
        const neighbors = findVertexNeighbors(i, indices);
        const curvature = calculateLocalCurvature(i, neighbors, positions);

        if (curvature > spikeThreshold) {
            problems.spikes.push({
                vertexIndex: i,
                curvature: curvature,
                severity: Math.min(curvature / (spikeThreshold * 3), 1), // 0-1
                position: vertexPos.clone()
            });
        }

        // ===== DÜNNE BEREICHE =====
        const localThickness = estimateLocalThickness(i, neighbors, positions, normals);
        if (localThickness < 0.04) { // < 0.4mm in cm
            problems.thinAreas.push({
                vertexIndex: i,
                thickness: localThickness * 10, // cm zu mm
                severity: (0.04 - localThickness) / 0.04, // 0-1
                position: vertexPos.clone()
            });
        }
    }

    return problems;
};

// ===== AUDIO-ERHALTENDE GLÄTTUNG =====
const audioPreservingSmoothing = (positions, indices, problemAreas, iterations, preservationFactor) => {
    let smoothedPositions = [...positions];
    const vertexCount = positions.length / 3;

    // Problem-Vertices identifizieren
    const problemVertices = new Set();
    problemAreas.overhangs.forEach(p => problemVertices.add(p.vertexIndex));
    problemAreas.spikes.forEach(p => problemVertices.add(p.vertexIndex));
    problemAreas.thinAreas.forEach(p => problemVertices.add(p.vertexIndex));

    for (let iter = 0; iter < iterations; iter++) {
        const newPositions = [...smoothedPositions];

        for (let i = 0; i < vertexCount; i++) {
            const neighbors = findVertexNeighbors(i, indices);

            if (neighbors.length === 0) continue;

            // Durchschnitts-Position der Nachbarn
            let avgX = 0, avgY = 0, avgZ = 0;
            for (let j = 0; j < neighbors.length; j++) {
                const nIdx = neighbors[j] * 3;
                avgX += smoothedPositions[nIdx];
                avgY += smoothedPositions[nIdx + 1];
                avgZ += smoothedPositions[nIdx + 2];
            }
            avgX /= neighbors.length;
            avgY /= neighbors.length;
            avgZ /= neighbors.length;

            const currentIdx = i * 3;
            const originalX = positions[currentIdx];
            const originalY = positions[currentIdx + 1];
            const originalZ = positions[currentIdx + 2];

            // Glättungsstärke basierend auf Problem-Schwere
            let smoothingStrength = 0.1; // Basis-Glättung

            if (problemVertices.has(i)) {
                // Stärkere Glättung für Problemstellen
                const spike = problemAreas.spikes.find(p => p.vertexIndex === i);
                const overhang = problemAreas.overhangs.find(p => p.vertexIndex === i);

                if (spike) {
                    smoothingStrength = 0.3 + (spike.severity * 0.4); // 0.3-0.7
                }
                if (overhang) {
                    smoothingStrength = Math.max(smoothingStrength, 0.2 + (overhang.severity * 0.3)); // 0.2-0.5
                }

                // Audio-Erhaltung reduziert Glättung
                smoothingStrength *= (1 - preservationFactor * 0.5); // Max 50% Reduktion
            }

            // Laplacian Smoothing mit Audio-Erhaltung
            newPositions[currentIdx] = originalX * preservationFactor +
                (originalX * (1 - smoothingStrength) + avgX * smoothingStrength) * (1 - preservationFactor);

            // Y-Komponente weniger glätten um Vasenhöhe zu erhalten
            newPositions[currentIdx + 1] = originalY * 0.9 +
                (originalY * (1 - smoothingStrength * 0.3) + avgY * smoothingStrength * 0.3) * 0.1;

            newPositions[currentIdx + 2] = originalZ * preservationFactor +
                (originalZ * (1 - smoothingStrength) + avgZ * smoothingStrength) * (1 - preservationFactor);
        }

        smoothedPositions = newPositions;
    }

    return smoothedPositions;
};

// ===== ÜBERHANG-KORREKTUR =====
const correctOverhangs = (positions, indices, maxOverhang, printDirection) => {
    const correctedPositions = [...positions];
    const vertexCount = positions.length / 3;
    const normals = calculateVertexNormals(positions, indices);

    const upVector = new THREE.Vector3(0, 1, 0);
    const maxOverhangRad = (maxOverhang * Math.PI) / 180;

    for (let i = 0; i < vertexCount; i++) {
        const normal = normals[i];
        const angle = normal.angleTo(upVector);
        const overhangAngle = Math.PI / 2 - angle;

        if (overhangAngle > maxOverhangRad) {
            // Korrigiere Überhang durch Radius-Reduktion
            const currentIdx = i * 3;
            const centerX = 0, centerZ = 0; // Vase-Zentrum

            const currentRadius = Math.sqrt(
                Math.pow(correctedPositions[currentIdx] - centerX, 2) +
                Math.pow(correctedPositions[currentIdx + 2] - centerZ, 2)
            );

            // Reduziere Radius proportional zur Überhang-Schwere
            const reductionFactor = 1 - ((overhangAngle - maxOverhangRad) / (Math.PI / 4)) * 0.3;
            const newRadius = currentRadius * Math.max(reductionFactor, 0.7); // Min 70% des Radius

            if (currentRadius > 0) {
                const radiusRatio = newRadius / currentRadius;
                correctedPositions[currentIdx] *= radiusRatio;
                correctedPositions[currentIdx + 2] *= radiusRatio;
            }
        }
    }

    return correctedPositions;
};

// ===== HILFSFUNKTIONEN =====

const findVertexNeighbors = (vertexIndex, indices) => {
    const neighbors = new Set();

    for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i];
        const v2 = indices[i + 1];
        const v3 = indices[i + 2];

        if (v1 === vertexIndex) {
            neighbors.add(v2);
            neighbors.add(v3);
        } else if (v2 === vertexIndex) {
            neighbors.add(v1);
            neighbors.add(v3);
        } else if (v3 === vertexIndex) {
            neighbors.add(v1);
            neighbors.add(v2);
        }
    }

    return Array.from(neighbors);
};

const calculateLocalCurvature = (vertexIndex, neighbors, positions) => {
    if (neighbors.length < 3) return 0;

    const centerPos = new THREE.Vector3(
        positions[vertexIndex * 3],
        positions[vertexIndex * 3 + 1],
        positions[vertexIndex * 3 + 2]
    );

    let totalCurvature = 0;
    for (let i = 0; i < neighbors.length; i++) {
        const neighborPos = new THREE.Vector3(
            positions[neighbors[i] * 3],
            positions[neighbors[i] * 3 + 1],
            positions[neighbors[i] * 3 + 2]
        );

        const distance = centerPos.distanceTo(neighborPos);
        if (distance > 0) {
            totalCurvature += 1 / distance; // Hohe Curvature = kurze Distanz zu Nachbarn
        }
    }

    return totalCurvature / neighbors.length;
};

const estimateLocalThickness = (vertexIndex, neighbors, positions, normals) => {
    // Vereinfachte Schätzung basierend auf Nachbarn-Abständen
    if (neighbors.length === 0) return 1.0;

    const centerPos = new THREE.Vector3(
        positions[vertexIndex * 3],
        positions[vertexIndex * 3 + 1],
        positions[vertexIndex * 3 + 2]
    );

    let minDistance = Infinity;
    for (let i = 0; i < neighbors.length; i++) {
        const neighborPos = new THREE.Vector3(
            positions[neighbors[i] * 3],
            positions[neighbors[i] * 3 + 1],
            positions[neighbors[i] * 3 + 2]
        );

        const distance = centerPos.distanceTo(neighborPos);
        minDistance = Math.min(minDistance, distance);
    }

    return minDistance * 2; // Geschätzte lokale Dicke
};

const calculateImprovementScore = (beforeProblems, afterProblems) => {
    const totalBefore = beforeProblems.overhangs.length + beforeProblems.spikes.length + beforeProblems.thinAreas.length;
    const totalAfter = afterProblems.overhangs.length + afterProblems.spikes.length + afterProblems.thinAreas.length;

    if (totalBefore === 0) return 1; // War schon perfekt
    return Math.max(0, (totalBefore - totalAfter) / totalBefore);
};

const calculatePrintabilityScore = (problems) => {
    const maxProblems = 100; // Angenommene max Probleme für Normalisierung
    const totalProblems = problems.overhangs.length + problems.spikes.length + problems.thinAreas.length;

    return Math.max(0, Math.min(100, 100 - (totalProblems / maxProblems) * 100));
};

const calculateVertexNormals = (positions, indices) => {
    const vertexCount = positions.length / 3;
    const normals = new Array(vertexCount).fill(null).map(() => new THREE.Vector3());

    // Für jedes Dreieck die Normale berechnen und zu Vertex-Normalen addieren
    for (let i = 0; i < indices.length; i += 3) {
        const i1 = indices[i] * 3;
        const i2 = indices[i + 1] * 3;
        const i3 = indices[i + 2] * 3;

        const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
        const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
        const v3 = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

        // Dreieck-Normale
        const edge1 = v2.clone().sub(v1);
        const edge2 = v3.clone().sub(v1);
        const faceNormal = edge1.cross(edge2).normalize();

        // Zu Vertex-Normalen addieren
        normals[indices[i]].add(faceNormal);
        normals[indices[i + 1]].add(faceNormal);
        normals[indices[i + 2]].add(faceNormal);
    }

    // Normalen normalisieren
    return normals.map(normal => normal.normalize());
};

export const generateSTLString = (geometry) => {
    const vertices = geometry.attributes.position.array;
    const indices = geometry.index ? geometry.index.array : null;

    let stl = 'solid AudioVase\n';

    if (indices) {
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] * 3;
            const i2 = indices[i + 1] * 3;
            const i3 = indices[i + 2] * 3;

            const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
            const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
            const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];

            // Normale berechnen
            const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
            const normal = [
                u[1] * v[2] - u[2] * v[1],
                u[2] * v[0] - u[0] * v[2],
                u[0] * v[1] - u[1] * v[0]
            ];

            stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
            stl += '    outer loop\n';
            stl += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
            stl += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
            stl += `      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
            stl += '    endloop\n';
            stl += '  endfacet\n';
        }
    }

    stl += 'endsolid AudioVase\n';
    return stl;
};

// ============================================
// NEUE FUNKTION: Echte Materialstärke für 3D-Druck
// ============================================
export const createThickGeometry = (originalGeometry, wallThickness = 2.0) => {
    console.log(`🏗️ Erstelle dicke Geometrie mit ${wallThickness}mm Wandstärke...`);

    const positions = originalGeometry.attributes.position.array;
    const originalIndices = originalGeometry.index ? originalGeometry.index.array : null;

    if (!originalIndices) {
        console.error('❌ Geometrie benötigt Indices für Thick-Geometrie');
        return originalGeometry;
    }

    // WICHTIG: Einheiten-Konvertierung mm zu cm!
    const wallThicknessCm = wallThickness / 10; // mm zu cm
    console.log(`📏 Konvertiert: ${wallThickness}mm = ${wallThicknessCm}cm für Vase-Koordinaten`);

    // Normalen für jeden Vertex berechnen
    const vertexNormals = calculateVertexNormals(positions, originalIndices);
    const vertexCount = positions.length / 3;

    // Neue Arrays für dicke Geometrie
    const thickPositions = [];
    const thickIndices = [];

    const halfThickness = wallThicknessCm / 2;

    // ===== AUSSENWAND ===== (Originale Geometrie nach außen verschoben)
    for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const normal = vertexNormals[i];

        // Außenvertex = Original + (Normal * halbe Dicke)
        thickPositions.push(
            positions[i3] + normal.x * halfThickness,
            positions[i3 + 1] + normal.y * halfThickness,
            positions[i3 + 2] + normal.z * halfThickness
        );
    }

    // ===== INNENWAND ===== (Originale Geometrie nach innen verschoben)
    for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const normal = vertexNormals[i];

        // Innenvertex = Original - (Normal * halbe Dicke)
        thickPositions.push(
            positions[i3] - normal.x * halfThickness,
            positions[i3 + 1] - normal.y * halfThickness,
            positions[i3 + 2] - normal.z * halfThickness
        );
    }

    // ===== AUSSENWAND INDICES ===== (Originale Reihenfolge)
    for (let i = 0; i < originalIndices.length; i += 3) {
        thickIndices.push(
            originalIndices[i],
            originalIndices[i + 1],
            originalIndices[i + 2]
        );
    }

    // ===== INNENWAND INDICES ===== (Umgekehrte Reihenfolge für korrekte Normalen)
    for (let i = 0; i < originalIndices.length; i += 3) {
        thickIndices.push(
            originalIndices[i + 2] + vertexCount,  // Umgekehrte Reihenfolge
            originalIndices[i + 1] + vertexCount,
            originalIndices[i] + vertexCount
        );
    }

    // ===== SEITENWÄNDE VERBINDEN ===== 
    // Nur die Seitenkontur zwischen Außen- und Innenwand verbinden
    // Oberseite und Unterseite bleiben offen (wie echte Vase)
    const { topEdges, bottomEdges } = findEdgeVertices(originalGeometry);

    // OBERER RAND - Seitenverbindung (NICHT schließen!)
    for (let i = 0; i < topEdges.length; i++) {
        const current = topEdges[i];
        const next = topEdges[(i + 1) % topEdges.length];

        // Außenwand oben
        const outerCurrent = current;
        const outerNext = next;

        // Innenwand oben  
        const innerCurrent = current + vertexCount;
        const innerNext = next + vertexCount;

        // Seitenwand zwischen außen und innen
        thickIndices.push(outerCurrent, outerNext, innerCurrent);
        thickIndices.push(outerNext, innerNext, innerCurrent);
    }

    // UNTERER RAND - Seitenverbindung (NICHT schließen!)
    for (let i = 0; i < bottomEdges.length; i++) {
        const current = bottomEdges[i];
        const next = bottomEdges[(i + 1) % bottomEdges.length];

        // Außenwand unten
        const outerCurrent = current;
        const outerNext = next;

        // Innenwand unten
        const innerCurrent = current + vertexCount;
        const innerNext = next + vertexCount;

        // Seitenwand zwischen außen und innen
        thickIndices.push(outerCurrent, innerCurrent, outerNext);
        thickIndices.push(outerNext, innerCurrent, innerNext);
    }

    // ===== GEOMETRIE ZUSAMMENBAUEN =====
    const thickGeometry = new THREE.BufferGeometry();
    thickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(thickPositions, 3));
    thickGeometry.setIndex(thickIndices);
    thickGeometry.computeVertexNormals();

    console.log(`✅ Vase-Geometrie mit dicken Wänden erstellt:`);
    console.log(`   Original Vertices: ${vertexCount}`);
    console.log(`   Dicke Vertices: ${thickPositions.length / 3}`);
    console.log(`   Faces: ${thickIndices.length / 3}`);
    console.log(`   Eingabe-Wandstärke: ${wallThickness}mm`);
    console.log(`   Vase-Wandstärke: ${wallThicknessCm}cm`);
    console.log(`   🔓 Oberseite: OFFEN für Befüllung (wie echte Vase)`);
    console.log(`   🔓 Unterseite: OFFEN für flexiblen 3D-Druck`);
    console.log(`   🔒 Seitenwände: GESCHLOSSEN und vernetzt für stabile Wandstärke`);
    console.log(`   📏 Einheiten: Korrekt konvertiert mm→cm`);

    return thickGeometry;
};

// ===== HILFSFUNKTIONEN =====

const findEdgeVertices = (geometry) => {
    // Vereinfachte Methode: Nimm oberste und unterste Vertices
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;

    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < vertexCount; i++) {
        const y = positions[i * 3 + 1];
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    const tolerance = 0.1;
    const topEdges = [];
    const bottomEdges = [];

    for (let i = 0; i < vertexCount; i++) {
        const y = positions[i * 3 + 1];

        if (Math.abs(y - maxY) < tolerance) {
            topEdges.push(i);
        }
        if (Math.abs(y - minY) < tolerance) {
            bottomEdges.push(i);
        }
    }

    // Sortiere nach Winkel für korrekte Reihenfolge
    const sortByAngle = (edges, y) => {
        return edges.sort((a, b) => {
            const angleA = Math.atan2(positions[a * 3 + 2], positions[a * 3]);
            const angleB = Math.atan2(positions[b * 3 + 2], positions[b * 3]);
            return angleA - angleB;
        });
    };

    return {
        topEdges: sortByAngle(topEdges, maxY),
        bottomEdges: sortByAngle(bottomEdges, minY)
    };
};

// NEUE FUNKTION: Geometrien kombinieren (Vase + Sockel) MIT Materialstärke
export const combineGeometriesThick = (vaseGeometry, baseGeometry, vaseSettings, wallThickness = 2.0) => {
    // Erst die Vase mit Materialstärke versehen
    const thickVaseGeometry = createThickGeometry(vaseGeometry, wallThickness);

    // Dann normale Kombination mit dem dicken Vase
    return combineGeometries(thickVaseGeometry, baseGeometry, vaseSettings);
};

// BESTEHENDE FUNKTION: Geometrien kombinieren (unverändert für Kompatibilität)
export const combineGeometries = (vaseGeometry, baseGeometry, vaseSettings) => {
    // Vase-Geometrie klonen und positionieren
    const vaseGeo = vaseGeometry.clone();
    const baseGeo = baseGeometry.clone();

    // Automatische Größenanpassung des Sockels
    const targetRadius = vaseSettings.baseRadius * 1.1; // Etwas größer als Vasenfuß

    // Sockel-Bounding Box berechnen
    baseGeo.computeBoundingBox();
    const originalBox = baseGeo.boundingBox;
    const currentRadius = Math.max(originalBox.max.x - originalBox.min.x, originalBox.max.z - originalBox.min.z) / 2;

    // Skalierung anwenden
    const scale = targetRadius / currentRadius;
    baseGeo.scale(scale, scale, scale);

    // Sockel korrekt positionieren: Unterseite auf y=0
    baseGeo.computeBoundingBox();
    const scaledBox = baseGeo.boundingBox;
    baseGeo.translate(0, -scaledBox.min.y, 0);

    // Vase auf der Oberseite des Sockels positionieren
    const sockelHoehe = scaledBox.max.y - scaledBox.min.y;
    const vaseHalbeHoehe = 10; // Halbe Vasenhöhe
    const vaseYPosition = sockelHoehe - vaseHalbeHoehe;
    vaseGeo.translate(0, vaseYPosition, 0);

    // Geometrien zusammenführen
    const mergedGeometry = new THREE.BufferGeometry();

    // Vertices und Normalen extrahieren
    const vasePositions = vaseGeo.attributes.position.array;
    const vaseNormals = vaseGeo.attributes.normal.array;
    const basePositions = baseGeo.attributes.position.array;
    const baseNormals = baseGeo.attributes.normal.array;

    // Arrays kombinieren
    const combinedPositions = new Float32Array(vasePositions.length + basePositions.length);
    const combinedNormals = new Float32Array(vaseNormals.length + baseNormals.length);

    combinedPositions.set(vasePositions, 0);
    combinedPositions.set(basePositions, vasePositions.length);

    combinedNormals.set(vaseNormals, 0);
    combinedNormals.set(baseNormals, vaseNormals.length);

    // Indices anpassen
    let combinedIndices = [];

    // Vase-Indices
    if (vaseGeo.index) {
        combinedIndices.push(...vaseGeo.index.array);
    } else {
        // Non-indexed geometry
        for (let i = 0; i < vasePositions.length / 3; i++) {
            combinedIndices.push(i);
        }
    }

    // Base-Indices (mit Offset)
    const vaseVertexCount = vasePositions.length / 3;
    if (baseGeo.index) {
        for (let i = 0; i < baseGeo.index.array.length; i++) {
            combinedIndices.push(baseGeo.index.array[i] + vaseVertexCount);
        }
    } else {
        // Non-indexed geometry
        for (let i = 0; i < basePositions.length / 3; i++) {
            combinedIndices.push(i + vaseVertexCount);
        }
    }

    // Attribute setzen
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(combinedNormals, 3));
    mergedGeometry.setIndex(combinedIndices);

    // Normalen neu berechnen für saubere Oberflächen
    mergedGeometry.computeVertexNormals();

    return mergedGeometry;
};

export const exportSTL = (geometry, filename = 'audio-vase.stl') => {
    const stlString = generateSTLString(geometry);
    const blob = new Blob([stlString], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
};