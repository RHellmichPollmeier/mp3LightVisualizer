import React, { useRef, useEffect } from 'react';
import { useThreeJS } from '../hooks/useThreeJS.js';

const VasePreview = ({ geometry, material }) => {
    const canvasRef = useRef();
    const { updateMesh } = useThreeJS(canvasRef);

    useEffect(() => {
        if (geometry && material) {
            updateMesh(geometry, material);
        }
    }, [geometry, material, updateMesh]);

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">3D Vorschau</h2>
            <div className="bg-slate-800 rounded-lg overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-auto"
                    style={{ aspectRatio: '4/3' }}
                />
            </div>
            <div className="mt-4 text-sm text-blue-200">
                Die Vase rotiert automatisch. Verwenden Sie die Einstellungen links, um die Form anzupassen.
            </div>
        </div>
    );
};

export default VasePreview;