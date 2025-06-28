import React from 'react';
import { Settings, Waves, Target, Printer } from 'lucide-react';

const VaseSettings = ({ settings, onChange }) => {
    const handleChange = (key, value) => {
        onChange(prev => ({ ...prev, [key]: value }));
    };

    const handleWaveChange = (key, value) => {
        onChange(prev => ({
            ...prev,
            wavePattern: {
                ...prev.wavePattern,
                [key]: value
            }
        }));
    };

    const handlePrintOptimizationChange = (key, value) => {
        onChange(prev => ({
            ...prev,
            printOptimization: {
                ...prev.printOptimization,
                [key]: value
            }
        }));
    };

    // Smart Presets für 3D-Druck Optimierung
    const applyPrintOptimizationPreset = (presetName) => {
        switch (presetName) {
            case 'perfect':
                onChange(prev => ({
                    ...prev,
                    printOptimization: {
                        enabled: true,
                        maxOverhang: 30,
                        audioPreservation: 0.3,
                        smoothingStrength: 0.6,
                        spikeThreshold: 1.5,
                        contourPoints: 6  // SEHR ORGANISCH
                    }
                }));
                break;
            case 'audio':
                onChange(prev => ({
                    ...prev,
                    printOptimization: {
                        enabled: true,
                        maxOverhang: 50,
                        audioPreservation: 0.9,
                        smoothingStrength: 0.2,
                        spikeThreshold: 3.0,
                        contourPoints: 12  // AUDIO-DETAILLIERT
                    }
                }));
                break;
            default:
                onChange(prev => ({
                    ...prev,
                    printOptimization: {
                        enabled: true,
                        maxOverhang: 45,
                        audioPreservation: 0.7,
                        smoothingStrength: 0.3,
                        spikeThreshold: 2.0,
                        contourPoints: 8  // AUSGEWOGEN
                    }
                }));
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Leuchte Einstellungen
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* ===== NEUE 3D-DRUCK OPTIMIERUNG SEKTION ===== */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        3D-Druck Optimierung
                        <span className="text-xs bg-blue-600/30 px-2 py-1 rounded">Live</span>
                    </h3>

                    <div className="space-y-3">
                        {/* 3D-Druck Optimierung Ein/Aus */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                            <div>
                                <div className="text-white font-medium">3D-Druck Optimierung</div>
                                <div className="text-blue-200 text-sm">
                                    {settings.printOptimization?.enabled
                                        ? 'Live-Optimierung während Generierung'
                                        : 'Originale Audio-Form ohne Optimierung'
                                    }
                                </div>
                            </div>
                            <button
                                onClick={() => handlePrintOptimizationChange('enabled', !settings.printOptimization?.enabled)}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.printOptimization?.enabled
                                    ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                                    : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.printOptimization?.enabled ? 'transform translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>

                        {settings.printOptimization?.enabled && (
                            <>
                                {/* Max Überhang */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Max Überhang: {settings.printOptimization?.maxOverhang || 45}°
                                        <span className="text-xs text-blue-300 ml-2">
                                            ({(settings.printOptimization?.maxOverhang || 45) <= 35 ? 'Support-frei' :
                                                (settings.printOptimization?.maxOverhang || 45) <= 50 ? 'Wenig Support' : 'Mehr Support'})
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min="30"
                                        max="60"
                                        step="5"
                                        value={settings.printOptimization?.maxOverhang || 45}
                                        onChange={(e) => handlePrintOptimizationChange('maxOverhang', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Audio-Erhaltung */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Audio-Erhaltung: {Math.round((settings.printOptimization?.audioPreservation || 0.7) * 100)}%
                                        <span className="text-xs text-blue-300 ml-2">
                                            ({(settings.printOptimization?.audioPreservation || 0.7) >= 0.8 ? 'Audio-Priorität' :
                                                (settings.printOptimization?.audioPreservation || 0.7) >= 0.5 ? 'Ausgewogen' : 'Druck-Priorität'})
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.3"
                                        max="0.9"
                                        step="0.1"
                                        value={settings.printOptimization?.audioPreservation || 0.7}
                                        onChange={(e) => handlePrintOptimizationChange('audioPreservation', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Glättungs-Stärke */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Glättungs-Stärke: {Math.round((settings.printOptimization?.smoothingStrength || 0.3) * 100)}%
                                        <span className="text-xs text-blue-300 ml-2">
                                            ({(settings.printOptimization?.smoothingStrength || 0.3) <= 0.2 ? 'Sanft' :
                                                (settings.printOptimization?.smoothingStrength || 0.3) <= 0.5 ? 'Mittel' : 'Stark'})
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="0.8"
                                        step="0.1"
                                        value={settings.printOptimization?.smoothingStrength || 0.3}
                                        onChange={(e) => handlePrintOptimizationChange('smoothingStrength', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Spitzen-Empfindlichkeit */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Spitzen-Empfindlichkeit: {settings.printOptimization?.spikeThreshold || 2.0}
                                        <span className="text-xs text-blue-300 ml-2">
                                            ({(settings.printOptimization?.spikeThreshold || 2.0) <= 1.5 ? 'Sehr empfindlich' :
                                                (settings.printOptimization?.spikeThreshold || 2.0) <= 2.5 ? 'Normal' : 'Tolerant'})
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1.0"
                                        max="4.0"
                                        step="0.5"
                                        value={settings.printOptimization?.spikeThreshold || 2.0}
                                        onChange={(e) => handlePrintOptimizationChange('spikeThreshold', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* NEUER PARAMETER: Kontur-Stützpunkte */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Kontur-Stützpunkte: {settings.printOptimization?.contourPoints || 8}
                                        <span className="text-xs text-blue-300 ml-2">
                                            ({(settings.printOptimization?.contourPoints || 8) <= 6 ? 'Sehr organisch' :
                                                (settings.printOptimization?.contourPoints || 8) <= 10 ? 'Ausgewogen' : 'Audio-detailliert'})
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min="4"
                                        max="16"
                                        step="2"
                                        value={settings.printOptimization?.contourPoints || 8}
                                        onChange={(e) => handlePrintOptimizationChange('contourPoints', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Smart Presets */}
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <button
                                        onClick={() => applyPrintOptimizationPreset('perfect')}
                                        className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🎯 Perfekt<br />Druckbar
                                    </button>
                                    <button
                                        onClick={() => applyPrintOptimizationPreset('default')}
                                        className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        ⚖️ Aus-<br />gewogen
                                    </button>
                                    <button
                                        onClick={() => applyPrintOptimizationPreset('audio')}
                                        className="p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🎵 Audio<br />Priorität
                                    </button>
                                </div>

                                {/* Info zur Live-Optimierung */}
                                <div className="text-xs text-blue-200 bg-blue-900/20 rounded p-2">
                                    <p><strong>🌊 Organische Kontur-Glättung:</strong></p>
                                    <p>• <strong>4-6 Stützpunkte:</strong> Sehr organisch, keramikartig, perfekt druckbar</p>
                                    <p>• <strong>8-10 Stützpunkte:</strong> Ausgewogene Balance zwischen Form und Audio</p>
                                    <p>• <strong>12+ Stützpunkte:</strong> Audio-Details erhalten, musikalischer Charakter</p>
                                    <p>• <strong>Catmull-Rom Splines:</strong> Weiche Übergänge wie handwerklich gefertigt</p>
                                    <p>• <strong>Audio-Erhaltung:</strong> Musikalische Essenz bleibt erhalten</p>
                                    <p>• <strong>Echtzeit:</strong> Sofortige Sichtbarkeit in 3D-Vorschau</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Basis Geometrie */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3">Basis Geometrie</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Höhe: {settings.height}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="50"
                                value={settings.height}
                                onChange={(e) => handleChange('height', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Basis Radius: {settings.baseRadius}
                            </label>
                            <input
                                type="range"
                                min="4"
                                max="15"
                                step="0.5"
                                value={settings.baseRadius}
                                onChange={(e) => handleChange('baseRadius', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Top Radius: {settings.topRadius}
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="12"
                                step="0.5"
                                value={settings.topRadius}
                                onChange={(e) => handleChange('topRadius', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* WELLENMUSTER SEKTION */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Waves className="w-4 h-4" />
                        Oberflächenstruktur
                    </h3>

                    <div className="space-y-3">
                        {/* Wellenmuster Ein/Aus */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                            <div>
                                <div className="text-white font-medium">Wellenmuster</div>
                                <div className="text-blue-200 text-sm">Spiralförmige Oberflächenrillen</div>
                            </div>
                            <button
                                onClick={() => handleWaveChange('enabled', !settings.wavePattern.enabled)}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.wavePattern.enabled
                                    ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                                    : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.wavePattern.enabled ? 'transform translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>

                        {settings.wavePattern.enabled && (
                            <>
                                {/* Wellenmuster-Typ */}
                                <div>
                                    <label className="block text-white text-sm mb-2">Mustertyp</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'spiral', name: '🌀 Spiral', desc: 'Wie im Bild' },
                                            { id: 'vertical', name: '📏 Vertikal', desc: 'Gerade Linien' },
                                            { id: 'horizontal', name: '〰️ Horizontal', desc: 'Ringe' },
                                            { id: 'diamond', name: '💠 Diamant', desc: 'Rautenmuster' }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => handleWaveChange('type', type.id)}
                                                className={`p-2 rounded text-xs transition-all ${settings.wavePattern.type === type.id
                                                    ? 'bg-blue-600/50 border border-blue-400 text-white'
                                                    : 'bg-white/10 border border-white/20 text-blue-200 hover:bg-white/20'
                                                    }`}
                                            >
                                                <div className="font-medium">{type.name}</div>
                                                <div className="text-xs opacity-80">{type.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Wellenstärke */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Wellenstärke: {settings.wavePattern.amplitude.toFixed(2)}
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1.5"
                                        step="0.05"
                                        value={settings.wavePattern.amplitude}
                                        onChange={(e) => handleWaveChange('amplitude', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Wellenfrequenz */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Wellenfrequenz: {settings.wavePattern.frequency}
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="20"
                                        step="1"
                                        value={settings.wavePattern.frequency}
                                        onChange={(e) => handleWaveChange('frequency', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Spiral-spezifische Einstellungen */}
                                {settings.wavePattern.type === 'spiral' && (
                                    <div>
                                        <label className="block text-white text-sm mb-2">
                                            Spiral Windungen: {settings.wavePattern.spiralTurns}
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="8"
                                            step="0.5"
                                            value={settings.wavePattern.spiralTurns}
                                            onChange={(e) => handleWaveChange('spiralTurns', Number(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* Phasenverschiebung */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Phasenverschiebung: {settings.wavePattern.phase.toFixed(1)}°
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        step="10"
                                        value={settings.wavePattern.phase}
                                        onChange={(e) => handleWaveChange('phase', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Wellenmuster Presets */}
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <button
                                        onClick={() => handleWaveChange('enabled', true) || onChange(prev => ({
                                            ...prev,
                                            wavePattern: {
                                                enabled: true,
                                                type: 'spiral',
                                                amplitude: 0.4,
                                                frequency: 12,
                                                spiralTurns: 3,
                                                phase: 0,
                                                lamellenDepth: 0.6
                                            }
                                        }))}
                                        className="p-2 bg-yellow-600/30 hover:bg-yellow-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🏺 Klassisch
                                    </button>
                                    <button
                                        onClick={() => handleWaveChange('enabled', true) || onChange(prev => ({
                                            ...prev,
                                            wavePattern: {
                                                enabled: true,
                                                type: 'lamellen',
                                                amplitude: 0.4,
                                                frequency: 24,         // Mehr Rillen für feinere Struktur
                                                spiralTurns: 3,
                                                phase: 0,
                                                lamellenDepth: 0.8
                                            }
                                        }))}
                                        className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🏺 Lamellen
                                    </button>
                                    <button
                                        onClick={() => handleWaveChange('enabled', true) || onChange(prev => ({
                                            ...prev,
                                            wavePattern: {
                                                enabled: true,
                                                type: 'spiral',
                                                amplitude: 0.6,
                                                frequency: 16,
                                                spiralTurns: 5,
                                                phase: 45,
                                                lamellenDepth: 0.6
                                            }
                                        }))}
                                        className="p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        💫 Dynamisch
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Audio Einfluss */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3">Audio Einfluss</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Amplitude Verstärkung: {settings.amplification}
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="8"
                                step="0.2"
                                value={settings.amplification}
                                onChange={(e) => handleChange('amplification', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Frequenz Einfluss: {settings.frequencyInfluence || 1}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                step="0.1"
                                value={settings.frequencyInfluence || 1}
                                onChange={(e) => handleChange('frequencyInfluence', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Glättung: {settings.smoothing}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="0.5"
                                step="0.05"
                                value={settings.smoothing}
                                onChange={(e) => handleChange('smoothing', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Organische Formen */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3">Organische Formen</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Noise Intensität: {settings.noiseIntensity}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                step="0.1"
                                value={settings.noiseIntensity}
                                onChange={(e) => handleChange('noiseIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Organische Komplexität: {settings.organicComplexity || 1}
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={settings.organicComplexity || 1}
                                onChange={(e) => handleChange('organicComplexity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Vertikale Verzerrung: {settings.verticalDistortion || 0.5}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={settings.verticalDistortion || 0.5}
                                onChange={(e) => handleChange('verticalDistortion', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Qualität */}
                <div>
                    <h3 className="text-white font-medium mb-3">Qualität</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Segmente: {settings.segments}
                            </label>
                            <input
                                type="range"
                                min="16"
                                max="128"
                                step="8"
                                value={settings.segments}
                                onChange={(e) => handleChange('segments', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Höhen-Segmente: {settings.heightSegments}
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="200"
                                step="10"
                                value={settings.heightSegments}
                                onChange={(e) => handleChange('heightSegments', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VaseSettings;