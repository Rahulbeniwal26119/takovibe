import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
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
                            onClick={onConfirm}
                            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                        >
                            Proceed
                        </button>

                        <button
                            onClick={onCancel}
                            className="w-full py-3 px-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors border border-transparent dark:border-white/5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
