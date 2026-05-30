import React, { useState, useEffect } from 'react';
import { LogIn } from 'lucide-react';

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
        <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm transform overflow-hidden rounded-2xl border border-neutral-200 bg-stone-50 shadow-2xl shadow-black/20 transition-all dark:border-neutral-800 dark:bg-neutral-950">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/70 dark:bg-orange-950/30">
                        <LogIn className="h-7 w-7 text-orange-600 dark:text-orange-300" />
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-neutral-950 dark:text-white">
                        Login Required
                    </h3>

                    <p className="mb-6 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        You need to be logged in to use {featureName}.
                        Please login to continue.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleLogin}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-500"
                        >
                            <LogIn className="w-5 h-5" />
                            Login Now
                        </button>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
