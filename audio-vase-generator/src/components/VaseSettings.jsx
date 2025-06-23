import React from 'react';
import { Settings, Waves } from 'lucide-react';

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

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Vase Einstellungen
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
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

                {/* NEUE WELLENMUSTER SEKTION */}
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
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <button
                                        onClick={() => handleWaveChange('enabled', true) || onChange(prev => ({
                                            ...prev,
                                            wavePattern: {
                                                enabled: true,
                                                type: 'spiral',
                                                amplitude: 0.4,
                                                frequency: 12,
                                                spiralTurns: 3,
                                                phase: 0
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
                                                type: 'spiral',
                                                amplitude: 0.6,
                                                frequency: 16,
                                                spiralTurns: 5,
                                                phase: 45
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