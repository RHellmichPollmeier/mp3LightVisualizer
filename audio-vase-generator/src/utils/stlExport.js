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

// NEUE FUNKTION: Geometrien kombinieren (Vase + Sockel)
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