import * as THREE from 'three';

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