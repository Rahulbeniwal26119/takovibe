import React, { useState, useEffect } from 'react';
import { LogIn, X } from 'lucide-react';

export default function LoginPromptModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [nextUrl, setNextUrl] = useState('');
    const [featureName, setFeatureName] = useState('this feature');

    useEffect(() => {
        const handleShow = (e: CustomEvent) => {
            setFeatureName(e.detail?.feature || 'this feature');
            // If nextUrl is provided in detail, use it. Otherwise default to current page.
            // Actually, we usually want to return to current page.
            setNextUrl(e.detail?.next || window.location.pathname + window.location.search);
            setIsOpen(true);
        };

        window.addEventListener('show-login-prompt', handleShow as EventListener);
        return () => window.removeEventListener('show-login-prompt', handleShow as EventListener);
    }, []);

    const handleLogin = () => {
        window.location.href = `/login?next=${encodeURIComponent(nextUrl)}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 transform scale-100 transition-all">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Login Required
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        You need to be logged in to use {featureName}.
                        Please login to continue.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleLogin}
                            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-5 h-5" />
                            Login Now
                        </button>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
