import * as THREE from 'three';

// ============================================
// STL EXPORT - OHNE NACHTRÄGLICHE OPTIMIERUNG
// Die Geometrie ist bereits von Anfang an druckfreundlich!
// ============================================

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
// MATERIALSTÄRKE FÜR 3D-DRUCK
// ============================================
export const createThickGeometry = (originalGeometry, wallThickness = 2.0) => {
    console.log(`🏗️ Erstelle dicke Geometrie mit ${wallThickness}mm Wandstärke...`);

    const positions = originalGeometry.attributes.position.array;
    const originalIndices = originalGeometry.index ? originalGeometry.index.array : null;

    if (!originalIndices) {
        console.error('❌ Geometrie benötigt Indices für Thick-Geometrie');
        return originalGeometry;
    }

    // Einheiten-Konvertierung mm zu cm
    const wallThicknessCm = wallThickness / 10;
    console.log(`📏 Konvertiert: ${wallThickness}mm = ${wallThicknessCm}cm für Vase-Koordinaten`);

    // Normalen für jeden Vertex berechnen
    const vertexNormals = calculateVertexNormals(positions, originalIndices);
    const vertexCount = positions.length / 3;

    const thickPositions = [];
    const thickIndices = [];
    const halfThickness = wallThicknessCm / 2;

    // ===== AUSSENWAND ===== (Original nach außen verschoben)
    for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const normal = vertexNormals[i];

        thickPositions.push(
            positions[i3] + normal.x * halfThickness,
            positions[i3 + 1] + normal.y * halfThickness,
            positions[i3 + 2] + normal.z * halfThickness
        );
    }

    // ===== INNENWAND ===== (Original nach innen verschoben)
    for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const normal = vertexNormals[i];

        thickPositions.push(
            positions[i3] - normal.x * halfThickness,
            positions[i3 + 1] - normal.y * halfThickness,
            positions[i3 + 2] - normal.z * halfThickness
        );
    }

    // ===== AUSSENWAND INDICES =====
    for (let i = 0; i < originalIndices.length; i += 3) {
        thickIndices.push(
            originalIndices[i],
            originalIndices[i + 1],
            originalIndices[i + 2]
        );
    }

    // ===== INNENWAND INDICES ===== (umgekehrte Reihenfolge)
    for (let i = 0; i < originalIndices.length; i += 3) {
        thickIndices.push(
            originalIndices[i + 2] + vertexCount,
            originalIndices[i + 1] + vertexCount,
            originalIndices[i] + vertexCount
        );
    }

    // ===== SEITENWÄNDE VERBINDEN =====
    const { topEdges, bottomEdges } = findEdgeVertices(originalGeometry);

    // Oberer Rand verbinden
    for (let i = 0; i < topEdges.length; i++) {
        const current = topEdges[i];
        const next = topEdges[(i + 1) % topEdges.length];

        const outerCurrent = current;
        const outerNext = next;
        const innerCurrent = current + vertexCount;
        const innerNext = next + vertexCount;

        thickIndices.push(outerCurrent, outerNext, innerCurrent);
        thickIndices.push(outerNext, innerNext, innerCurrent);
    }

    // Unterer Rand verbinden
    for (let i = 0; i < bottomEdges.length; i++) {
        const current = bottomEdges[i];
        const next = bottomEdges[(i + 1) % bottomEdges.length];

        const outerCurrent = current;
        const outerNext = next;
        const innerCurrent = current + vertexCount;
        const innerNext = next + vertexCount;

        thickIndices.push(outerCurrent, innerCurrent, outerNext);
        thickIndices.push(outerNext, innerCurrent, innerNext);
    }

    // ===== GEOMETRIE ZUSAMMENBAUEN =====
    const thickGeometry = new THREE.BufferGeometry();
    thickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(thickPositions, 3));
    thickGeometry.setIndex(thickIndices);
    thickGeometry.computeVertexNormals();

    console.log(`✅ Druckfreundige Vase mit dicken Wänden erstellt:`);
    console.log(`   Original Vertices: ${vertexCount}`);
    console.log(`   Dicke Vertices: ${thickPositions.length / 3}`);
    console.log(`   Faces: ${thickIndices.length / 3}`);
    console.log(`   Wandstärke: ${wallThickness}mm (${wallThicknessCm}cm)`);
    console.log(`   🔓 Oberseite/Unterseite: OFFEN für echte Vase`);
    console.log(`   🔒 Seitenwände: GESCHLOSSEN und vernetzt`);

    return thickGeometry;
};

// ===== HILFSFUNKTIONEN =====

const calculateVertexNormals = (positions, indices) => {
    const vertexCount = positions.length / 3;
    const normals = new Array(vertexCount).fill(null).map(() => new THREE.Vector3());

    for (let i = 0; i < indices.length; i += 3) {
        const i1 = indices[i] * 3;
        const i2 = indices[i + 1] * 3;
        const i3 = indices[i + 2] * 3;

        const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
        const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
        const v3 = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

        const edge1 = v2.clone().sub(v1);
        const edge2 = v3.clone().sub(v1);
        const faceNormal = edge1.cross(edge2).normalize();

        normals[indices[i]].add(faceNormal);
        normals[indices[i + 1]].add(faceNormal);
        normals[indices[i + 2]].add(faceNormal);
    }

    return normals.map(normal => normal.normalize());
};

const findEdgeVertices = (geometry) => {
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

    const sortByAngle = (edges) => {
        return edges.sort((a, b) => {
            const angleA = Math.atan2(positions[a * 3 + 2], positions[a * 3]);
            const angleB = Math.atan2(positions[b * 3 + 2], positions[b * 3]);
            return angleA - angleB;
        });
    };

    return {
        topEdges: sortByAngle(topEdges),
        bottomEdges: sortByAngle(bottomEdges)
    };
};

// ===== GEOMETRIE-KOMBINATIONEN =====

export const combineGeometriesThick = (vaseGeometry, baseGeometry, vaseSettings, wallThickness = 2.0) => {
    const thickVaseGeometry = createThickGeometry(vaseGeometry, wallThickness);
    return combineGeometries(thickVaseGeometry, baseGeometry, vaseSettings);
};

export const combineGeometries = (vaseGeometry, baseGeometry, vaseSettings) => {
    const vaseGeo = vaseGeometry.clone();
    const baseGeo = baseGeometry.clone();

    // Automatische Größenanpassung des Sockels
    const targetRadius = vaseSettings.baseRadius * 1.1;

    baseGeo.computeBoundingBox();
    const originalBox = baseGeo.boundingBox;
    const currentRadius = Math.max(originalBox.max.x - originalBox.min.x, originalBox.max.z - originalBox.min.z) / 2;

    const scale = targetRadius / currentRadius;
    baseGeo.scale(scale, scale, scale);

    baseGeo.computeBoundingBox();
    const scaledBox = baseGeo.boundingBox;
    baseGeo.translate(0, -scaledBox.min.y, 0);

    const sockelHoehe = scaledBox.max.y - scaledBox.min.y;
    const vaseHalbeHoehe = 10;
    const vaseYPosition = sockelHoehe - vaseHalbeHoehe;
    vaseGeo.translate(0, vaseYPosition, 0);

    // Geometrien zusammenführen
    const mergedGeometry = new THREE.BufferGeometry();

    const vasePositions = vaseGeo.attributes.position.array;
    const vaseNormals = vaseGeo.attributes.normal.array;
    const basePositions = baseGeo.attributes.position.array;
    const baseNormals = baseGeo.attributes.normal.array;

    const combinedPositions = new Float32Array(vasePositions.length + basePositions.length);
    const combinedNormals = new Float32Array(vaseNormals.length + baseNormals.length);

    combinedPositions.set(vasePositions, 0);
    combinedPositions.set(basePositions, vasePositions.length);

    combinedNormals.set(vaseNormals, 0);
    combinedNormals.set(baseNormals, vaseNormals.length);

    let combinedIndices = [];

    if (vaseGeo.index) {
        combinedIndices.push(...vaseGeo.index.array);
    } else {
        for (let i = 0; i < vasePositions.length / 3; i++) {
            combinedIndices.push(i);
        }
    }

    const vaseVertexCount = vasePositions.length / 3;
    if (baseGeo.index) {
        for (let i = 0; i < baseGeo.index.array.length; i++) {
            combinedIndices.push(baseGeo.index.array[i] + vaseVertexCount);
        }
    } else {
        for (let i = 0; i < basePositions.length / 3; i++) {
            combinedIndices.push(i + vaseVertexCount);
        }
    }

    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(combinedNormals, 3));
    mergedGeometry.setIndex(combinedIndices);
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

    console.log(`📥 STL erfolgreich exportiert: ${filename}`);
    console.log(`✅ Geometrie ist bereits 3D-druck-optimiert!`);
};