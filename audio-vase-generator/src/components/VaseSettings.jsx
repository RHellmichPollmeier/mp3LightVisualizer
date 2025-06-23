import React from 'react';
import { Settings } from 'lucide-react';

const VaseSettings = ({ settings, onChange }) => {
    const handleChange = (key, value) => {
        onChange(prev => ({ ...prev, [key]: value }));
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