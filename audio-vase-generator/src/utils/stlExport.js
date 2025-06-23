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