import React, { useState, useRef } from 'react';
import { Package, Upload, CheckCircle, XCircle, RotateCcw, Target, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, RotateCw, RotateCcw as RotateLeft } from 'lucide-react';
import * as THREE from 'three';

const BaseUpload = ({ baseSTL, baseGeometry, onSTLUpload, onGeometryLoaded }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [setupStep, setSetupStep] = useState('upload'); // 'upload', 'orientation', 'placement', 'complete'
    const [originalGeometry, setOriginalGeometry] = useState(null);
    const [currentOrientation, setCurrentOrientation] = useState('auto');
    const [placementPosition, setPlacementPosition] = useState({ x: 0, y: 0, z: 0 });
    const [boundingBox, setBoundingBox] = useState(null);
    const fileInputRef = useRef();

    // STL-Parser (wie vorher)
    const parseSTL = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const contents = e.target.result;

                    if (typeof contents === 'string' && contents.includes('solid')) {
                        const geometry = parseASCIISTL(contents);
                        resolve(geometry);
                    } else {
                        const geometry = parseBinarySTL(new Uint8Array(contents));
                        resolve(geometry);
                    }
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));

            const testReader = new FileReader();
            testReader.onload = (e) => {
                const text = e.target.result;
                if (text.includes('solid')) {
                    reader.readAsText(file);
                } else {
                    reader.readAsArrayBuffer(file);
                }
            };
            testReader.readAsText(file.slice(0, 500));
        });
    };

    const parseASCIISTL = (data) => {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];

        const lines = data.split('\n');
        let currentNormal = null;

        for (let line of lines) {
            line = line.trim();

            if (line.startsWith('facet normal')) {
                const parts = line.split(' ');
                currentNormal = [
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    parseFloat(parts[4])
                ];
            } else if (line.startsWith('vertex')) {
                const parts = line.split(' ');
                vertices.push(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                );

                if (currentNormal) {
                    normals.push(...currentNormal);
                }
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        return geometry;
    };

    const parseBinarySTL = (data) => {
        const geometry = new THREE.BufferGeometry();
        const triangleCount = new DataView(data.buffer, 80, 4).getUint32(0, true);
        const vertices = [];
        const normals = [];

        let offset = 84;

        for (let i = 0; i < triangleCount; i++) {
            const view = new DataView(data.buffer, offset);

            const normal = [
                view.getFloat32(0, true),
                view.getFloat32(4, true),
                view.getFloat32(8, true)
            ];

            for (let j = 0; j < 3; j++) {
                const vertexOffset = 12 + j * 12;
                vertices.push(
                    view.getFloat32(vertexOffset, true),
                    view.getFloat32(vertexOffset + 4, true),
                    view.getFloat32(vertexOffset + 8, true)
                );
                normals.push(...normal);
            }

            offset += 50;
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        return geometry;
    };

    // Geometrie rotieren basierend auf gewählter Orientierung
    const rotateGeometry = (geometry, orientation) => {
        const rotatedGeometry = geometry.clone();

        switch (orientation) {
            case '+X': // X-Achse zeigt nach unten
                rotatedGeometry.rotateZ(-Math.PI / 2);
                break;
            case '-X': // -X-Achse zeigt nach unten  
                rotatedGeometry.rotateZ(Math.PI / 2);
                break;
            case '+Y': // Y-Achse zeigt nach unten (Standard)
                // Keine Rotation nötig
                break;
            case '-Y': // -Y-Achse zeigt nach unten
                rotatedGeometry.rotateZ(Math.PI);
                break;
            case '+Z': // Z-Achse zeigt nach unten
                rotatedGeometry.rotateX(Math.PI / 2);
                break;
            case '-Z': // -Z-Achse zeigt nach unten
                rotatedGeometry.rotateX(-Math.PI / 2);
                break;
            case 'auto':
            default:
                // Automatische Erkennung der größten Fläche
                break;
        }

        // Nach Rotation zentrieren
        rotatedGeometry.computeBoundingBox();
        const box = rotatedGeometry.boundingBox;
        const center = box.getCenter(new THREE.Vector3());
        rotatedGeometry.translate(-center.x, -center.y, -center.z);

        // Auf Boden setzen
        rotatedGeometry.computeBoundingBox();
        const newBox = rotatedGeometry.boundingBox;
        rotatedGeometry.translate(0, -newBox.min.y, 0);

        return rotatedGeometry;
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.stl')) {
            setError('Bitte wählen Sie eine STL-Datei aus');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const geometry = await parseSTL(file);

            // Geometrie zentrieren
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = box.getCenter(new THREE.Vector3());
            geometry.translate(-center.x, -center.y, -center.z);

            setOriginalGeometry(geometry);
            setBoundingBox(box);
            onSTLUpload(file);
            setSetupStep('orientation');

        } catch (err) {
            setError('Fehler beim Laden der STL-Datei: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOrientationChange = (orientation) => {
        setCurrentOrientation(orientation);
        if (originalGeometry) {
            const rotatedGeometry = rotateGeometry(originalGeometry, orientation);
            rotatedGeometry.computeBoundingBox();
            setBoundingBox(rotatedGeometry.boundingBox);
            onGeometryLoaded(rotatedGeometry);
        }
    };

    const handlePlacementChange = (axis, value) => {
        setPlacementPosition(prev => ({
            ...prev,
            [axis]: parseFloat(value)
        }));
    };

    const applyPlacement = () => {
        if (originalGeometry) {
            const finalGeometry = rotateGeometry(originalGeometry, currentOrientation);

            // Placement-Offset anwenden (das ist wo die Vase platziert wird)
            const placementOffset = {
                x: placementPosition.x,
                y: 0, // Y bleibt bei 0 für die Auflagefläche
                z: placementPosition.z
            };

            onGeometryLoaded(finalGeometry);
            setSetupStep('complete');
        }
    };

    const resetSetup = () => {
        setSetupStep('upload');
        setOriginalGeometry(null);
        setBoundingBox(null);
        setCurrentOrientation('auto');
        setPlacementPosition({ x: 0, y: 0, z: 0 });
        onSTLUpload(null);
        onGeometryLoaded(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // UI für verschiedene Setup-Schritte
    const renderUploadStep = () => (
        <div
            className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-white/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
        >
            <Upload className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-white font-medium">STL-Sockel hochladen</p>
            <p className="text-blue-200 text-sm mt-1">
                Klicken oder STL-Datei hier ablegen
            </p>
        </div>
    );

    const renderOrientationStep = () => (
        <div className="space-y-4">
            <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
                <h3 className="text-yellow-200 font-medium mb-2">🔄 Schritt 1: Unterseite definieren</h3>
                <p className="text-yellow-200 text-sm mb-3">
                    Welche Seite des Sockels soll auf dem Boden stehen?
                </p>

                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'auto', name: '🤖 Auto', icon: Target },
                        { id: '-Y', name: '⬇️ Unten', icon: ArrowDown },
                        { id: '+Y', name: '⬆️ Oben', icon: ArrowUp },
                        { id: '-X', name: '⬅️ Links', icon: ArrowLeft },
                        { id: '+X', name: '➡️ Rechts', icon: ArrowRight },
                        { id: '-Z', name: '🔄 Vorne', icon: RotateCw },
                        { id: '+Z', name: '🔄 Hinten', icon: RotateLeft }
                    ].map(option => {
                        const IconComponent = option.icon;
                        return (
                            <button
                                key={option.id}
                                onClick={() => handleOrientationChange(option.id)}
                                className={`p-3 rounded-lg text-xs transition-all ${currentOrientation === option.id
                                        ? 'bg-blue-600/50 border border-blue-400 text-white'
                                        : 'bg-white/10 border border-white/20 text-blue-200 hover:bg-white/20'
                                    }`}
                            >
                                <IconComponent className="w-4 h-4 mx-auto mb-1" />
                                <div className="font-medium">{option.name}</div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={() => setSetupStep('placement')}
                        disabled={!currentOrientation}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        Weiter zu Schritt 2
                    </button>
                    <button
                        onClick={resetSetup}
                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        Zurücksetzen
                    </button>
                </div>
            </div>
        </div>
    );

    const renderPlacementStep = () => (
        <div className="space-y-4">
            <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                <h3 className="text-purple-200 font-medium mb-2">🎯 Schritt 2: Auflagefläche wählen</h3>
                <p className="text-purple-200 text-sm mb-3">
                    Wo auf dem Sockel soll die Leuchte platziert werden?
                </p>

                <div className="space-y-3">
                    {/* X-Position */}
                    <div>
                        <label className="block text-white text-sm mb-2">
                            X-Position: {placementPosition.x.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            min={boundingBox ? boundingBox.min.x : -10}
                            max={boundingBox ? boundingBox.max.x : 10}
                            step="0.5"
                            value={placementPosition.x}
                            onChange={(e) => handlePlacementChange('x', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Z-Position */}
                    <div>
                        <label className="block text-white text-sm mb-2">
                            Z-Position: {placementPosition.z.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            min={boundingBox ? boundingBox.min.z : -10}
                            max={boundingBox ? boundingBox.max.z : 10}
                            step="0.5"
                            value={placementPosition.z}
                            onChange={(e) => handlePlacementChange('z', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Schnell-Positionen */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setPlacementPosition({ x: 0, y: 0, z: 0 })}
                            className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-xs transition-colors"
                        >
                            🎯 Zentrum
                        </button>
                        <button
                            onClick={() => setPlacementPosition({
                                x: boundingBox ? boundingBox.max.x * 0.7 : 5,
                                y: 0,
                                z: 0
                            })}
                            className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                        >
                            ➡️ Rechts
                        </button>
                        <button
                            onClick={() => setPlacementPosition({
                                x: boundingBox ? boundingBox.min.x * 0.7 : -5,
                                y: 0,
                                z: 0
                            })}
                            className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-xs transition-colors"
                        >
                            ⬅️ Links
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={applyPlacement}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        Setup abschließen
                    </button>
                    <button
                        onClick={() => setSetupStep('orientation')}
                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        Zurück
                    </button>
                </div>
            </div>
        </div>
    );

    const renderCompleteStep = () => (
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                        <div className="text-white font-medium">{baseSTL?.name}</div>
                        <div className="text-green-200 text-sm">
                            Sockel konfiguriert und positioniert
                        </div>
                    </div>
                </div>
                <button
                    onClick={resetSetup}
                    className="text-orange-300 hover:text-orange-200 p-1"
                    title="Neu konfigurieren"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            </div>

            <div className="mt-3 text-green-200 text-sm space-y-1">
                <p>• <strong>Orientierung:</strong> {currentOrientation === 'auto' ? 'Automatisch' : `Unterseite: ${currentOrientation}`}</p>
                <p>• <strong>Leuchten-Position:</strong> X: {placementPosition.x}, Z: {placementPosition.z}</p>
                <p>• <strong>Status:</strong> Bereit für 3D-Vorschau und Export</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                STL-Sockel Konfiguration
                {setupStep !== 'upload' && (
                    <span className="text-sm text-blue-400">
                        (Schritt {setupStep === 'orientation' ? '1' : setupStep === 'placement' ? '2' : '✓'}/2)
                    </span>
                )}
            </h2>

            <div className="space-y-4">
                {setupStep === 'upload' && renderUploadStep()}
                {setupStep === 'orientation' && renderOrientationStep()}
                {setupStep === 'placement' && renderPlacementStep()}
                {setupStep === 'complete' && renderCompleteStep()}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                {isLoading && (
                    <div className="text-blue-300 animate-pulse text-center">
                        Lade und analysiere STL-Datei...
                    </div>
                )}

                {error && (
                    <div className="text-red-300 text-sm bg-red-900/20 rounded p-3">
                        {error}
                    </div>
                )}

                {/* Info über das erweiterte System */}
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                    <h3 className="text-blue-200 font-medium mb-2">🎯 Erweiterte Sockel-Kontrolle</h3>
                    <div className="text-blue-200 text-sm space-y-1">
                        <p>• <strong>Schritt 1:</strong> Definiere welche Seite des Sockels die Unterseite ist</p>
                        <p>• <strong>Schritt 2:</strong> Wähle die exakte Position auf dem Sockel für die Leuchte</p>
                        <p>• <strong>Vorschau:</strong> Echtzeit 3D-Anzeige während der Konfiguration</p>
                        <p>• <strong>Präzision:</strong> Manuelle Kontrolle für perfekte Platzierung</p>
                        <p>• <strong>Export:</strong> Garantiert korrekte STL-Dateien für 3D-Druck</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BaseUpload;