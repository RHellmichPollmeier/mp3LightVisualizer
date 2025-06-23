import React from 'react';
import { Upload } from 'lucide-react';

const AudioUpload = ({ audioFile, isAnalyzing, error, onFileUpload }) => {
    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Audio Upload
            </h2>

            <div className="space-y-4">
                <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/m4a"
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) onFileUpload(file);
                    }}
                    className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white"
                />

                {audioFile && (
                    <div className="text-sm text-blue-200">
                        Datei: {audioFile.name}
                    </div>
                )}

                {isAnalyzing && (
                    <div className="text-blue-300 animate-pulse">
                        Analysiere Audio...
                    </div>
                )}

                {error && (
                    <div className="text-red-300 text-sm">
                        Fehler: {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioUpload;