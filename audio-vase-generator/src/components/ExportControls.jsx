import React, { useState } from 'react';
import { Download, RotateCcw, Package, Layers, Ruler, Target, Zap } from 'lucide-react';
import { exportSTL, combineGeometries, createThickGeometry, combineGeometriesThick, makePrintable } from '../utils/stlExport.js';

const ExportControls = ({ audioData, geometry, baseGeometry, vaseSettings, onGenerate }) => {
    const [exportMode, setExportMode] = useState('vase'); // 'vase', 'base', 'combined'
    const [exportWallThickness, setExportWallThickness] = useState(2.0); // Separate Export-Materialstärke
    const [useThickGeometry, setUseThickGeometry] = useState(true); // Toggle für dicke Geometrie
    
    // ===== NEUE MAKE PRINTABLE STATE VARIABLES =====
    const [makePrintableEnabled, setMakePrintableEnabled] = useState(true); // Auto-aktiviert für bessere UX
    const [printabilitySettings, setPrintabilitySettings] = useState({
        maxOverhang: 45,           // 30-60° einstellbar (Standard: 45°)
        audioDetailPreservation: 70, // 30-90% konfigurierbar (Standard: 70%)
        smoothingIntensity: 3,     // 1-8 Iterationen (Standard: 3)
        spikeThreshold: 2.0        // 1.0-4.0 Schwellwert (Standard: 2.0)
    });

    // Helper-Funktion für Printability-Settings Updates
    const updatePrintabilitySetting = (key, value) => {
        setPrintabilitySettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Smart Presets für Make Printable
    const applyPrintablePreset = (presetName) => {
        switch (presetName) {
            case 'perfect':
                // "Perfekt Druckbar": 30° / Glatt für höchste Druckqualität
                setPrintabilitySettings({
                    maxOverhang: 30,
                    audioDetailPreservation: 30,
                    smoothingIntensity: 6,
                    spikeThreshold: 1.5
                });
                break;
            case 'audio':
                // "Audio-Priorität": 50° / Detailliert für maximalen Audio-Charakter
                setPrintabilitySettings({
                    maxOverhang: 50,
                    audioDetailPreservation: 90,
                    smoothingIntensity: 2,
                    spikeThreshold: 3.0
                });
                break;
            default:
                // Standard-Einstellungen
                setPrintabilitySettings({
                    maxOverhang: 45,
                    audioDetailPreservation: 70,
                    smoothingIntensity: 3,
                    spikeThreshold: 2.0
                });
        }
    };

    const handleExport = () => {
        if (!geometry) return;

        let geometryToExport = geometry;
        let filename = 'audio-vase.stl';

        // ===== MAKE PRINTABLE ANWENDEN =====
        if (makePrintableEnabled) {
            console.log('🔧 Make Printable wird angewendet...');
            
            const printableOptions = {
                maxOverhang: printabilitySettings.maxOverhang,
                minWallThickness: exportWallThickness, // Nutze Export-Wandstärke
                smoothingIterations: printabilitySettings.smoothingIntensity,
                preserveAudioDetail: printabilitySettings.audioDetailPreservation / 100, // 0-1 Range
                spikeThreshold: printabilitySettings.spikeThreshold,
                printDirection: 'Z'
            };

            geometryToExport = makePrintable(geometry, printableOptions);
            console.log('✅ Make Printable abgeschlossen!');
        }

        switch (exportMode) {
            case 'vase':
                if (useThickGeometry) {
                    geometryToExport = createThickGeometry(geometryToExport, exportWallThickness);
                    filename = makePrintableEnabled 
                        ? `audio-vase-printable-${exportWallThickness}mm.stl`
                        : `audio-vase-${exportWallThickness}mm.stl`;
                } else {
                    filename = makePrintableEnabled 
                        ? 'audio-vase-printable-thin.stl'
                        : 'audio-vase-thin.stl';
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
                        geometryToExport = combineGeometriesThick(geometryToExport, baseGeometry, vaseSettings, exportWallThickness);
                        filename = makePrintableEnabled 
                            ? `audio-vase-complete-printable-${exportWallThickness}mm.stl`
                            : `audio-vase-complete-${exportWallThickness}mm.stl`;
                    } else {
                        geometryToExport = combineGeometries(geometryToExport, baseGeometry, vaseSettings);
                        filename = makePrintableEnabled 
                            ? 'audio-vase-complete-printable-thin.stl'
                            : 'audio-vase-complete-thin.stl';
                    }
                } else {
                    if (useThickGeometry) {
                        geometryToExport = createThickGeometry(geometryToExport, exportWallThickness);
                        filename = makePrintableEnabled 
                            ? `audio-vase-printable-${exportWallThickness}mm.stl`
                            : `audio-vase-${exportWallThickness}mm.stl`;
                    } else {
                        filename = makePrintableEnabled 
                            ? 'audio-vase-printable.stl'
                            : 'audio-vase.stl';
                    }
                }
                break;
        }

        exportSTL(geometryToExport, filename);

        // ===== ERFOLGS-FEEDBACK MIT MAKE PRINTABLE INFO =====
        console.log(`🎯 STL Export erfolgreich:`);
        console.log(`   Modus: ${exportMode}`);
        console.log(`   Make Printable: ${makePrintableEnabled ? 'AKTIVIERT' : 'Deaktiviert'}`);
        if (makePrintableEnabled) {
            console.log(`   Max Überhang: ${printabilitySettings.maxOverhang}°`);
            console.log(`   Audio-Erhaltung: ${printabilitySettings.audioDetailPreservation}%`);
            console.log(`   Glättungs-Intensität: ${printabilitySettings.smoothingIntensity}`);
            console.log(`   Spitzen-Schwellwert: ${printabilitySettings.spikeThreshold}`);
        }
        console.log(`   Materialstärke: ${useThickGeometry ? exportWallThickness + 'mm' : 'dünn'}`);
        console.log(`   Datei: ${filename}`);
    };

    const canExportBase = baseGeometry !== null;
    const canExportCombined = geometry && baseGeometry && vaseSettings;

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5" />
                3D-Druck Export mit intelligenter Optimierung
            </h2>

            {/* ===== MAKE PRINTABLE SEKTION ===== */}
            <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <h3 className="text-blue-200 font-medium mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Make Printable - Intelligente Audio-Vase Optimierung
                </h3>

                {/* Make Printable Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
                    <div>
                        <div className="text-white font-medium">Make Printable aktiviert</div>
                        <div className="text-blue-200 text-sm">
                            {makePrintableEnabled 
                                ? 'Audio-Charakter wird erhalten, Spitzen werden geglättet' 
                                : 'Keine Optimierung - Originale Audio-Form'}
                        </div>
                    </div>
                    <button
                        onClick={() => setMakePrintableEnabled(!makePrintableEnabled)}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${makePrintableEnabled
                            ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                            : 'bg-gray-600'
                            }`}
                    >
                        <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${makePrintableEnabled ? 'transform translate-x-7' : ''
                                }`}
                        />
                    </button>
                </div>

                {makePrintableEnabled && (
                    <>
                        {/* Printability Parameter Controls */}
                        <div className="space-y-4 mb-4">
                            {/* Max Überhang */}
                            <div>
                                <label className="block text-white text-sm mb-2">
                                    Max Überhang: {printabilitySettings.maxOverhang}° 
                                    <span className="text-xs text-blue-300 ml-2">
                                        ({printabilitySettings.maxOverhang <= 35 ? 'Support-frei' : 
                                          printabilitySettings.maxOverhang <= 50 ? 'Wenig Support' : 'Mehr Support'})
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="30"
                                    max="60"
                                    step="5"
                                    value={printabilitySettings.maxOverhang}
                                    onChange={(e) => updatePrintabilitySetting('maxOverhang', Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Audio-Detail Erhaltung */}
                            <div>
                                <label className="block text-white text-sm mb-2">
                                    Audio-Detail Erhaltung: {printabilitySettings.audioDetailPreservation}%
                                    <span className="text-xs text-blue-300 ml-2">
                                        ({printabilitySettings.audioDetailPreservation >= 80 ? 'Audio-Priorität' : 
                                          printabilitySettings.audioDetailPreservation >= 50 ? 'Ausgewogen' : 'Druck-Priorität'})
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="30"
                                    max="90"
                                    step="10"
                                    value={printabilitySettings.audioDetailPreservation}
                                    onChange={(e) => updatePrintabilitySetting('audioDetailPreservation', Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Glättungs-Intensität */}
                            <div>
                                <label className="block text-white text-sm mb-2">
                                    Glättungs-Intensität: {printabilitySettings.smoothingIntensity} Iterationen
                                    <span className="text-xs text-blue-300 ml-2">
                                        ({printabilitySettings.smoothingIntensity <= 2 ? 'Sanft' : 
                                          printabilitySettings.smoothingIntensity <= 5 ? 'Mittel' : 'Stark'})
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="8"
                                    step="1"
                                    value={printabilitySettings.smoothingIntensity}
                                    onChange={(e) => updatePrintabilitySetting('smoothingIntensity', Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Spitzen-Empfindlichkeit */}
                            <div>
                                <label className="block text-white text-sm mb-2">
                                    Spitzen-Empfindlichkeit: {printabilitySettings.spikeThreshold}
                                    <span className="text-xs text-blue-300 ml-2">
                                        ({printabilitySettings.spikeThreshold <= 1.5 ? 'Sehr empfindlich' : 
                                          printabilitySettings.spikeThreshold <= 2.5 ? 'Normal' : 'Tolerant'})
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1.0"
                                    max="4.0"
                                    step="0.5"
                                    value={printabilitySettings.spikeThreshold}
                                    onChange={(e) => updatePrintabilitySetting('spikeThreshold', Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Smart Presets für Make Printable */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <button
                                onClick={() => applyPrintablePreset('perfect')}
                                className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-xs transition-colors"
                            >
                                🎯 Perfekt Druckbar<br />
                                <span className="text-xs opacity-80">30° / Glatt</span>
                            </button>
                            <button
                                onClick={() => applyPrintablePreset('audio')}
                                className="p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded text-white text-xs transition-colors"
                            >
                                🎵 Audio-Priorität<br />
                                <span className="text-xs opacity-80">50° / Detailliert</span>
                            </button>
                            <button
                                onClick={() => applyPrintablePreset('default')}
                                className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                            >
                                ⚖️ Ausgewogen<br />
                                <span className="text-xs opacity-80">45° / Standard</span>
                            </button>
                        </div>

                        {/* Make Printable Info */}
                        <div className="text-xs text-blue-200 bg-blue-900/20 rounded p-2">
                            <p><strong>🧠 Intelligente Optimierung:</strong></p>
                            <p>• <strong>Überhang-Detection:</strong> Erkennt Winkel {`>`}{printabilitySettings.maxOverhang}° automatisch</p>
                            <p>• <strong>Spike-Glättung:</strong> Entfernt scharfe Spitzen über Curvature-Analyse</p>
                            <p>• <strong>Audio-Erhaltung:</strong> Behält {printabilitySettings.audioDetailPreservation}% der Original-Form</p>
                            <p>• <strong>Selective Smoothing:</strong> Nur Problemstellen werden korrigiert</p>
                            <p>• <strong>Printability-Score:</strong> Echte Bewertung 0-100 in der Konsole</p>
                        </div>
                    </>
                )}
            </div>

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
                            {makePrintableEnabled && <span className="text-xs bg-blue-600/50 px-2 py-1 rounded">PRINTABLE</span>}
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                            {makePrintableEnabled 
                                ? `Optimierte Audio-Vase - keine Spitzen, ${printabilitySettings.maxOverhang}° Überhang-Limit`
                                : useThickGeometry
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
                            {makePrintableEnabled && <span className="text-xs bg-blue-600/50 px-2 py-1 rounded">PRINTABLE</span>}
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                            {canExportCombined
                                ? makePrintableEnabled
                                    ? `Kombinierte STL - optimiert für 3D-Druck mit ${exportWallThickness}mm Vase-Wandstärke`
                                    : useThickGeometry
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
                    {makePrintableEnabled && <span className="bg-blue-800 px-2 py-1 rounded text-xs">PRINTABLE</span>}
                    {useThickGeometry && exportMode !== 'base' && (
                        <span className="bg-green-800 px-2 py-1 rounded text-xs">
                            {exportWallThickness}mm
                        </span>
                    )}
                </button>
            </div>

            {/* Erweiterte Anleitung mit Make Printable */}
            <div className="mt-4 text-sm text-blue-200">
                <p className="mb-2 font-medium">🎯 3D-Druck Workflow mit intelligenter Optimierung:</p>
                <div className="space-y-1">
                    <p>1. 🎵 MP3-Datei hochladen und Vase generieren</p>
                    <p>2. 🏺 STL-Sockel hochladen (optional)</p>
                    <p>3. 🧠 Make Printable aktivieren für automatische Optimierung</p>
                    <p>4. 📏 Export-Wandstärke in mm für 3D-Druck wählen</p>
                    <p>5. 🛡️ "Dicke Wände" aktivieren für stabilen Druck</p>
                    <p>6. 🔓 Vase bleibt oben/unten offen (echte Vase!)</p>
                    <p>7. 📥 STL mit vernetzten Seitenwänden exportieren</p>
                </div>

                {makePrintableEnabled && (
                    <div className="mt-3 p-3 bg-blue-900/20 rounded border border-blue-500/30">
                        <p className="text-blue-200 text-xs">
                            🧠 <strong>Make Printable aktiviert:</strong> Audio-Charakter wird zu {printabilitySettings.audioDetailPreservation}% erhalten,
                            Überhänge {`>`}{printabilitySettings.maxOverhang}° werden korrigiert, scharfe Spitzen geglättet.
                        </p>
                        <p className="text-blue-200 text-xs mt-1">
                            🎯 <strong>Intelligente Dateinamen:</strong> Exportierte STL erhält "printable-" Prefix.
                        </p>
                    </div>
                )}

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