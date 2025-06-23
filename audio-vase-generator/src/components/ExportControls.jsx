import React, { useState } from 'react';
import { Download, RotateCcw, Package, Layers } from 'lucide-react';
import { exportSTL, combineGeometries } from '../utils/stlExport.js';

const ExportControls = ({ audioData, geometry, baseGeometry, vaseSettings, onGenerate }) => {
    const [exportMode, setExportMode] = useState('vase'); // 'vase', 'base', 'combined'

    const handleExport = () => {
        if (!geometry) return;

        switch (exportMode) {
            case 'vase':
                exportSTL(geometry, 'audio-vase.stl');
                break;
            case 'base':
                if (baseGeometry) {
                    exportSTL(baseGeometry, 'vase-base.stl');
                }
                break;
            case 'combined':
                if (baseGeometry && vaseSettings) {
                    const combinedGeometry = combineGeometries(geometry, baseGeometry, vaseSettings);
                    exportSTL(combinedGeometry, 'audio-vase-complete.stl');
                } else {
                    exportSTL(geometry, 'audio-vase.stl');
                }
                break;
        }
    };

    const canExportBase = baseGeometry !== null;
    const canExportCombined = geometry && baseGeometry && vaseSettings;

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            {/* Export-Modus Auswahl */}
            <div className="mb-4">
                <h3 className="text-white font-medium mb-3">Export-Modus</h3>
                <div className="grid grid-cols-1 gap-2">
                    <button
                        onClick={() => setExportMode('vase')}
                        className={`p-3 rounded-lg text-left transition-all ${exportMode === 'vase'
                            ? 'bg-blue-600/50 border border-blue-400 text-white'
                            : 'bg-white/10 border border-white/20 text-blue-200 hover:bg-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span className="font-medium">Nur Vase</span>
                        </div>
                        <div className="text-xs opacity-80 mt-1">Audio-generierte Vase ohne Sockel</div>
                    </button>

                    <button
                        onClick={() => setExportMode('base')}
                        disabled={!canExportBase}
                        className={`p-3 rounded-lg text-left transition-all ${!canExportBase
                            ? 'bg-gray-600/30 border border-gray-500/30 text-gray-400 cursor-not-allowed'
                            : exportMode === 'base'
                                ? 'bg-green-600/50 border border-green-400 text-white'
                                : 'bg-white/10 border border-white/20 text-blue-200 hover:bg-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            <span className="font-medium">Nur Sockel</span>
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                            {canExportBase ? 'STL-Sockel separat' : 'Kein STL-Sockel geladen'}
                        </div>
                    </button>

                    <button
                        onClick={() => setExportMode('combined')}
                        disabled={!canExportCombined}
                        className={`p-3 rounded-lg text-left transition-all ${!canExportCombined
                            ? 'bg-gray-600/30 border border-gray-500/30 text-gray-400 cursor-not-allowed'
                            : exportMode === 'combined'
                                ? 'bg-purple-600/50 border border-purple-400 text-white'
                                : 'bg-white/10 border border-white/20 text-blue-200 hover:bg-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            <span className="font-medium">Vase + Sockel</span>
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                            {canExportCombined
                                ? 'Kombinierte STL mit perfekter Positionierung'
                                : 'Benötigt Vase und STL-Sockel'
                            }
                        </div>
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                <button
                    onClick={onGenerate}
                    disabled={!audioData}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-4 h-4" />
                    Vase Generieren
                </button>

                <button
                    onClick={handleExport}
                    disabled={!geometry || (exportMode === 'base' && !canExportBase)}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    STL Exportieren ({exportMode === 'vase' ? 'Vase' : exportMode === 'base' ? 'Sockel' : 'Komplett'})
                </button>
            </div>

            {/* Anleitung */}
            <div className="mt-4 text-sm text-blue-200">
                <p className="mb-2 font-medium">3D-Druck Workflow:</p>
                <div className="space-y-1">
                    <p>1. 🎵 MP3-Datei hochladen</p>
                    <p>2. 🏺 STL-Sockel hochladen (optional)</p>
                    <p>3. ⚙️ Einstellungen anpassen</p>
                    <p>4. 🔄 Vase generieren</p>
                    <p>5. 📥 STL für 3D-Druck exportieren</p>
                </div>

                {canExportCombined && (
                    <div className="mt-3 p-3 bg-green-900/20 rounded border border-green-500/30">
                        <p className="text-green-200 text-xs">
                            ✅ <strong>Perfekte Positionierung:</strong> Der Sockel steht stabil auf dem Boden
                            und die Vase sitzt exakt auf der Sockel-Oberseite.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportControls;