import React, { useRef, useEffect } from 'react';
import { useThreeJS } from '../hooks/useThreeJS.js';

const VasePreview = ({ geometry, material, lightingSettings, isRefractionMode = false, baseGeometry, vaseSettings, basePlacementPosition = { x: 0, z: 0 } }) => {
    const canvasRef = useRef();
    const { updateMesh, updateBase } = useThreeJS(canvasRef, isRefractionMode);

    useEffect(() => {
        if (geometry && material) {
            updateMesh(geometry, material, basePlacementPosition);
        }
    }, [geometry, material, updateMesh, basePlacementPosition]);

    useEffect(() => {
        if (baseGeometry && vaseSettings) {
            updateBase(baseGeometry, vaseSettings, basePlacementPosition);
        }
    }, [baseGeometry, vaseSettings, updateBase, basePlacementPosition]);

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                {isRefractionMode ? '🌈' : '🔆'} 3D Vorschau {isRefractionMode ? 'mit Lichtbrechung' : '(Hell-Modus)'}
                {baseGeometry && <span className="text-sm text-green-400">+ STL-Sockel</span>}
            </h2>
            <div className={`rounded-lg overflow-hidden ${isRefractionMode
                ? 'bg-slate-900 border border-purple-500/30'
                : 'bg-sky-100 border border-blue-300/50'
                }`}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-auto"
                    style={{ aspectRatio: '4/3' }}
                />
            </div>
            <div className="mt-4 space-y-2">
                <div className="text-sm text-blue-200">
                    ✨ Die Vase rotiert automatisch {isRefractionMode ? 'mit spektakulären Lichtbrechungseffekten' : 'in optimaler Beleuchtung'}
                </div>

                {isRefractionMode ? (
                    <div className="space-y-2">
                        <div className="text-xs text-purple-300 bg-purple-900/20 rounded p-2">
                            🌈 <strong>Lichtbrechungs-Modus:</strong> Mehrfarbige Lichtquellen am Vasenboden erzeugen
                            realistische Brechungseffekte durch das transparente Glasmaterial
                        </div>
                        <div className="text-xs text-pink-300 bg-pink-900/20 rounded p-2">
                            ⭐ <strong>Animierte Beleuchtung:</strong> Die Lichtquellen bewegen sich dynamisch
                            für lebendige Reflexionen und Brechungen
                        </div>
                        <div className="text-xs text-cyan-300 bg-cyan-900/20 rounded p-2">
                            🧱 <strong>Materialstärke:</strong> Anpassbare Glasdicke für verschiedene Brechungseffekte
                        </div>
                        <div className="text-xs text-emerald-300 bg-emerald-900/20 rounded p-2">
                            🌀 <strong>Wellenmuster:</strong> Spiralförmige Oberflächenrillen verstärken die Lichtbrechung
                        </div>
                        {baseGeometry && (
                            <div className="text-xs text-yellow-300 bg-yellow-900/20 rounded p-2">
                                🏺 <strong>STL-Sockel:</strong> Automatisch angepasst - Vase sitzt stabil auf dem Sockel
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-xs text-blue-300 bg-blue-900/20 rounded p-2">
                            🔆 <strong>Hell-Modus:</strong> Optimale Beleuchtung zum Betrachten der Vasenform
                            und Anpassen der Parameter
                        </div>
                        <div className="text-xs text-green-300 bg-green-900/20 rounded p-2">
                            🎨 <strong>Materialvorschau:</strong> Perfekte Sicht auf Farben, Texturen
                            und die durch Audio generierte Form
                        </div>
                        <div className="text-xs text-yellow-300 bg-yellow-900/20 rounded p-2">
                            🧱 <strong>Materialstärke:</strong> Echtzeit-Vorschau der Glasdicke von 0.5-8mm
                        </div>
                        <div className="text-xs text-purple-300 bg-purple-900/20 rounded p-2">
                            🌀 <strong>Oberflächenstrukturen:</strong> 4 verschiedene Wellenmuster für einzigartige Designs
                        </div>
                        {baseGeometry && (
                            <div className="text-xs text-orange-300 bg-orange-900/20 rounded p-2">
                                🏺 <strong>STL-Sockel:</strong> Sockel steht stabil auf dem Boden, Vase sitzt perfekt darauf
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VasePreview;