import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: Props) {
    const [scannerInit, setScannerInit] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // html5-qrcode requires a DOM element to be present.
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 150 }, rememberLastUsedCamera: true },
            /* verbose= */ false
        );

        scanner.render((decodedText) => {
            onScan(decodedText);
            scanner.clear();
            onClose();
        }, () => {
            // Ignorer les erreurs frame par frame
        });

        setScannerInit(true);

        return () => {
            if (scannerInit) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isOpen, onScan, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Scanner un Code-barres</h3>
                    <button
                        onClick={() => {
                            onClose();
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <div id="reader" className="w-full mx-auto" style={{ minHeight: '300px' }}></div>
                    <p className="text-sm text-gray-500 text-center mt-6">Placez le code-barres de l'article devant la caméra, la lecture est automatique.</p>
                </div>
            </div>
        </div>
    );
}
