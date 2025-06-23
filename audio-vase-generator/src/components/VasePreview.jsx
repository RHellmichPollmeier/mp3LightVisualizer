import React, { useRef, useEffect } from 'react';
import { useThreeJS } from '../hooks/useThreeJS.js';

const VasePreview = ({ geometry, material, lightingSettings }) => {
    const canvasRef = useRef();
    const { updateMesh } = useThreeJS(canvasRef);

    useEffect(() => {
        if (geometry && material) {
            updateMesh(geometry, material);
        }
    }, [geometry, material, updateMesh]);

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                🔆 3D Vorschau mit Lichtbrechung
            </h2>
            <div className="bg-slate-900 rounded-lg overflow-hidden border border-blue-500/30">
                <canvas
                    ref={canvasRef}
                    className="w-full h-auto"
                    style={{ aspectRatio: '4/3' }}
                />
            </div>
            <div className="mt-4 space-y-2">
                <div className="text-sm text-blue-200">
                    ✨ Die Vase rotiert automatisch mit spektakulären Lichtbrechungseffekten
                </div>
                <div className="text-xs text-blue-300 bg-blue-900/20 rounded p-2">
                    💡 <strong>Lichtbrechung:</strong> Mehrfarbige Lichtquellen am Vasenboden erzeugen
                    realistische Brechungseffekte durch das transparente Glasmaterial
                </div>
                <div className="text-xs text-green-300 bg-green-900/20 rounded p-2">
                    🌈 <strong>Animierte Beleuchtung:</strong> Die Lichtquellen bewegen sich dynamisch
                    für lebendige Reflexionen und Brechungen
                </div>
            </div>
        </div>
    );
};

export default VasePreview;