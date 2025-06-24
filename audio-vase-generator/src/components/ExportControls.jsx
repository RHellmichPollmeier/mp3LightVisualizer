import React, { useState } from 'react';
import { Download, RotateCcw, Package, Layers, Ruler } from 'lucide-react';
import { exportSTL, combineGeometries, createThickGeometry, combineGeometriesThick } from '../utils/stlExport.js';

const ExportControls = ({ audioData, geometry, baseGeometry, vaseSettings, onGenerate }) => {
    const [exportMode, setExportMode] = useState('vase'); // 'vase', 'base', 'combined'
    const [exportWallThickness, setExportWallThickness] = useState(2.0); // Separate Export-Materialstärke
    const [useThickGeometry, setUseThickGeometry] = useState(true); // Toggle für dicke Geometrie

    const handleExport = () => {
        if (!geometry) return;

        let geometryToExport = geometry;
        let filename = 'audio-vase.stl';

        switch (exportMode) {
            case 'vase':
                if (useThickGeometry) {
                    geometryToExport = createThickGeometry(geometry, exportWallThickness);
                    filename = `audio-vase-${exportWallThickness}mm.stl`;
                } else {
                    geometryToExport = geometry;
                    filename = 'audio-vase-thin.stl';
                }
                break;

            case 'base':
                if (baseGeometry) {
                    geometryToExport = baseGeometry;
                    filename = 'vase-base.stl';
                }
                break;

            case 'combined':
                if (baseGeometry && vaseSettings) {
                    if (useThickGeometry) {
                        geometryToExport = combineGeometriesThick(geometry, baseGeometry, vaseSettings, exportWallThickness);
                        filename = `audio-vase-complete-${exportWallThickness}mm.stl`;
                    } else {
                        geometryToExport = combineGeometries(geometry, baseGeometry, vaseSettings);
                        filename = 'audio-vase-complete-thin.stl';
                    }
                } else {
                    if (useThickGeometry) {
                        geometryToExport = createThickGeometry(geometry, exportWallThickness);
                        filename = `audio-vase-${exportWallThickness}mm.stl`;
                    } else {
                        geometryToExport = geometry;
                        filename = 'audio-vase.stl';
                    }
                }
                break;
        }

        exportSTL(geometryToExport, filename);

        // Erfolgs-Feedback
        console.log(`🎯 STL Export erfolgreich:`);
        console.log(`   Modus: ${exportMode}`);
        console.log(`   Materialstärke: ${useThickGeometry ? exportWallThickness + 'mm' : 'dünn'}`);
        console.log(`   Datei: ${filename}`);
    };

    const canExportBase = baseGeometry !== null;
    const canExportCombined = geometry && baseGeometry && vaseSettings;

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5" />
                3D-Druck Export mit Wandstärke
            </h2>

            {/* ===== MATERIALSTÄRKE FÜR EXPORT ===== */}
            <div className="mb-6 p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                <h3 className="text-green-200 font-medium mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Export-Materialstärke
                </h3>

                {/* Dicke Geometrie Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
                    <div>
                        <div className="text-white font-medium">Dicke Seitenwände für 3D-Druck</div>
                        <div className="text-green-200 text-sm">
                            {useThickGeometry ? 'Echte Wandstärke - stabil druckbar' : 'Dünne Oberfläche - nur für Anzeige'}
                        </div>
                    </div>
                    <button
                        onClick={() => setUseThickGeometry(!useThickGeometry)}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${useThickGeometry
                            ? 'bg-green-600 shadow-lg shadow-green-500/50'
                            : 'bg-gray-600'
                            }`}
                    >
                        <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${useThickGeometry ? 'transform translate-x-7' : ''
                                }`}
                        />
                    </button>
                </div>

                {useThickGeometry && (
                    <>
                        {/* Materialstärke Slider */}
                        <div className="mb-4">
                            <label className="block text-white text-sm mb-2">
                                Wandstärke: {exportWallThickness}mm
                            </label>
                            <input
                                type="range"
                                min="0.8"
                                max="10.0"
                                step="0.2"
                                value={exportWallThickness}
                                onChange={(e) => setExportWallThickness(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Materialstärke Presets */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <button
                                onClick={() => setExportWallThickness(1.2)}
                                className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                            >
                                💨 Dünn<br />1.2mm
                            </button>
                            <button
                                onClick={() => setExportWallThickness(2.0)}
                                className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-xs transition-colors"
                            >
                                ⚖️ Standard<br />2.0mm
                            </button>
                            <button
                                onClick={() => setExportWallThickness(3.5)}
                                className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-xs transition-colors"
                            >
                                🛡️ Robust<br />3.5mm
                            </button>
                            <button
                                onClick={() => setExportWallThickness(6.0)}
                                className="p-2 bg-red-600/30 hover:bg-red-600/50 rounded text-white text-xs transition-colors"
                            >
                                🏰 Extra Dick<br />6.0mm
                            </button>
                        </div>

                        {/* Info zu Materialstärke */}
                        <div className="text-xs text-green-200 bg-green-900/20 rounded p-2">
                            <p><strong>💡 Materialstärke-Guide für 3D-Druck:</strong></p>
                            <p>• <strong>0.8-1.5mm:</strong> Sehr dünn, nur für kleine Vasen oder flexible Materialien</p>
                            <p>• <strong>1.5-2.5mm:</strong> Standard für PLA/PETG, gute Balance aus Stabilität und Materialverbrauch</p>
                            <p>• <strong>2.5-4.0mm:</strong> Robust für große Vasen oder mechanische Belastung</p>
                            <p>• <strong>4.0+mm:</strong> Sehr dick, für dekorative massive Objekte</p>
                            <p>📏 <strong>Einheiten:</strong> Vase in cm, Wandstärke in mm (wird automatisch konvertiert)</p>
                            <p>🔓 <strong>Offene Vase:</strong> Oben und unten offen, nur Seitenwände haben Dicke</p>
                        </div>
                    </>
                )}
            </div>

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
                            {useThickGeometry && <span className="text-xs bg-green-600/50 px-2 py-1 rounded">{exportWallThickness}mm</span>}
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                            {useThickGeometry
                                ? `Audio-Vase mit ${exportWallThickness}mm Wandstärke für stabilen 3D-Druck`
                                : 'Audio-Vase als dünne Oberfläche (nur für Visualisierung)'
                            }
                        </div>
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
                            {canExportBase ? 'STL-Sockel separat (originale Dicke)' : 'Kein STL-Sockel geladen'}
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
                            {useThickGeometry && <span className="text-xs bg-green-600/50 px-2 py-1 rounded">{exportWallThickness}mm</span>}
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                            {canExportCombined
                                ? useThickGeometry
                                    ? `Kombinierte STL mit ${exportWallThickness}mm Vase-Wandstärke`
                                    : 'Kombinierte STL mit dünner Vase'
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
                    STL Exportieren
                    {useThickGeometry && exportMode !== 'base' && (
                        <span className="bg-green-800 px-2 py-1 rounded text-xs">
                            {exportWallThickness}mm
                        </span>
                    )}
                </button>
            </div>

            {/* Erweiterte Anleitung */}
            <div className="mt-4 text-sm text-blue-200">
                <p className="mb-2 font-medium">🎯 3D-Druck Workflow mit korrekter Materialstärke:</p>
                <div className="space-y-1">
                    <p>1. 🎵 MP3-Datei hochladen und Vase generieren</p>
                    <p>2. 🏺 STL-Sockel hochladen (optional)</p>
                    <p>3. 📏 Export-Wandstärke in mm für 3D-Druck wählen</p>
                    <p>4. 🛡️ "Dicke Wände" aktivieren für stabilen Druck</p>
                    <p>5. 🔓 Vase bleibt oben/unten offen (echte Vase!)</p>
                    <p>6. 📥 STL mit vernetzten Seitenwänden exportieren</p>
                </div>

                {useThickGeometry && (
                    <div className="mt-3 p-3 bg-green-900/20 rounded border border-green-500/30">
                        <p className="text-green-200 text-xs">
                            ✅ <strong>3D-Druck bereit:</strong> Die STL hat echte {exportWallThickness}mm Seitenwände.
                            Außen- und Innenwand sind korrekt vernetzt. Oben/unten offen für echte Vase.
                        </p>
                        <p className="text-green-200 text-xs mt-1">
                            📏 <strong>Einheiten korrekt:</strong> {exportWallThickness}mm Wandstärke bei cm-basierter Vase.
                        </p>
                    </div>
                )}

                {!useThickGeometry && (
                    <div className="mt-3 p-3 bg-yellow-900/20 rounded border border-yellow-500/30">
                        <p className="text-yellow-200 text-xs">
                            ⚠️ <strong>Nur Oberfläche:</strong> Diese STL ist extrem dünn und nur für Visualisierung geeignet.
                            Aktiviere "Dicke Seitenwände" für druckbare Vasen.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportControls;