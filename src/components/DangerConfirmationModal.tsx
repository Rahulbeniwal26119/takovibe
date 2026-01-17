import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DangerConfirmationModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

    useEffect(() => {
        const handleShow = (e: CustomEvent) => {
            setTitle(e.detail?.title || 'Warning');
            setMessage(e.detail?.message || 'Are you sure?');
            // We can't pass functions through custom events easily across boundaries if serialized,
            // but within React app it's fine. 
            // However, the SelectionPopover is Astro/Vanilla JS. 
            // So we need a mechanism to signal back.
            // We will define a temporary global callback function.
            if (e.detail?.confirmCallbackName) {
                // @ts-ignore
                setOnConfirm(() => () => window[e.detail.confirmCallbackName]());
            }
            setIsOpen(true);
        };

        window.addEventListener('show-danger-confirmation', handleShow as EventListener);
        return () => window.removeEventListener('show-danger-confirmation', handleShow as EventListener);
    }, []);

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl max-w-sm w-full border border-red-200 dark:border-red-900/30 transform scale-100 transition-all overflow-hidden">
                <div className="p-6">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {title}
                        </h3>

                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                            {message}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleConfirm}
                            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                        >
                            Proceed
                        </button>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3 px-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors border border-transparent dark:border-white/5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
