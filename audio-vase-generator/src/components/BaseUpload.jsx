import React, { useState, useRef } from 'react';
import { Package, Upload, CheckCircle, XCircle } from 'lucide-react';
import * as THREE from 'three';

const BaseUpload = ({ baseSTL, baseGeometry, onSTLUpload, onGeometryLoaded }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef();

    // STL-Parser (einfache ASCII STL-Unterstützung)
    const parseSTL = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const contents = e.target.result;

                    // Check if it's ASCII STL
                    if (typeof contents === 'string' && contents.includes('solid')) {
                        const geometry = parseASCIISTL(contents);
                        resolve(geometry);
                    } else {
                        // Binary STL
                        const geometry = parseBinarySTL(new Uint8Array(contents));
                        resolve(geometry);
                    }
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));

            // Try reading as text first for ASCII detection
            const testReader = new FileReader();
            testReader.onload = (e) => {
                const text = e.target.result;
                if (text.includes('solid')) {
                    reader.readAsText(file);
                } else {
                    reader.readAsArrayBuffer(file);
                }
            };
            testReader.readAsText(file.slice(0, 500)); // Read first 500 bytes to check
        });
    };

    // ASCII STL Parser
    const parseASCIISTL = (data) => {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];

        const lines = data.split('\n');
        let currentNormal = null;
        let vertexCount = 0;

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

                vertexCount++;
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

        return geometry;
    };

    // Binary STL Parser
    const parseBinarySTL = (data) => {
        const geometry = new THREE.BufferGeometry();

        // Skip header (80 bytes) and read triangle count
        const triangleCount = new DataView(data.buffer, 80, 4).getUint32(0, true);

        const vertices = [];
        const normals = [];

        let offset = 84; // Start after header and triangle count

        for (let i = 0; i < triangleCount; i++) {
            const view = new DataView(data.buffer, offset);

            // Normal vector (3 floats)
            const normal = [
                view.getFloat32(0, true),
                view.getFloat32(4, true),
                view.getFloat32(8, true)
            ];

            // Three vertices (9 floats)
            for (let j = 0; j < 3; j++) {
                const vertexOffset = 12 + j * 12;
                vertices.push(
                    view.getFloat32(vertexOffset, true),
                    view.getFloat32(vertexOffset + 4, true),
                    view.getFloat32(vertexOffset + 8, true)
                );
                normals.push(...normal);
            }

            offset += 50; // Each triangle is 50 bytes
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

        return geometry;
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

            // Geometrie zentrieren und skalieren
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = box.getCenter(new THREE.Vector3());

            // Zentrieren
            geometry.translate(-center.x, -center.y, -center.z);

            // Auf den Boden setzen
            geometry.computeBoundingBox();
            const newBox = geometry.boundingBox;
            geometry.translate(0, -newBox.min.y, 0);

            onSTLUpload(file);
            onGeometryLoaded(geometry);

        } catch (err) {
            setError('Fehler beim Laden der STL-Datei: ' + err.message);
            console.error('STL Parse Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const clearSTL = () => {
        onSTLUpload(null);
        onGeometryLoaded(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                STL-Sockel Upload
            </h2>

            <div className="space-y-4">
                {!baseSTL ? (
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
                ) : (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <div>
                                    <div className="text-white font-medium">{baseSTL.name}</div>
                                    <div className="text-green-200 text-sm">
                                        Sockel erfolgreich geladen
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={clearSTL}
                                className="text-red-300 hover:text-red-200 p-1"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                {isLoading && (
                    <div className="text-blue-300 animate-pulse text-center">
                        Lade STL-Datei...
                    </div>
                )}

                {error && (
                    <div className="text-red-300 text-sm bg-red-900/20 rounded p-3">
                        {error}
                    </div>
                )}

                {/* Info über STL-Sockel */}
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                    <h3 className="text-blue-200 font-medium mb-2">🏺 STL-Sockel System</h3>
                    <div className="text-blue-200 text-sm space-y-1">
                        <p>• <strong>Automatische Anpassung:</strong> Vasenfuß-Innenradius = Sockel-Nutdurchmesser</p>
                        <p>• <strong>Perfekte Passform:</strong> Vase sitzt exakt auf dem Sockel</p>
                        <p>• <strong>Unterstützte Formate:</strong> ASCII und Binary STL</p>
                        <p>• <strong>Echtzeit-Vorschau:</strong> Sofortige 3D-Anzeige mit Vase</p>
                    </div>
                </div>

                {/* Sockel-Material Info */}
                {baseGeometry && (
                    <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
                        <h3 className="text-green-200 font-medium mb-2">✅ Sockel geladen</h3>
                        <div className="text-green-200 text-sm space-y-1">
                            <p>• Material: Mattes Keramik/Holz-Finish</p>
                            <p>• Automatische Größenanpassung aktiv</p>
                            <p>• Position: Unter der Vase zentriert</p>
                            <p>• Bereit für STL-Export mit Vase</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaseUpload;