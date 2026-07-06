import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';

interface StoredUser {
    name?: string;
    email?: string;
    username?: string;
}

interface ReaderAccountControlsProps {
    compact?: boolean;
}

function currentPath(): string {
    if (typeof window === 'undefined') return '/reader';
    return `${window.location.pathname}${window.location.search}`;
}

function readUser(): StoredUser | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const raw = localStorage.getItem('user');
    if (!raw) return {};
    try {
        return JSON.parse(raw) || {};
    } catch {
        return {};
    }
}

export default function ReaderAccountControls({ compact = false }: ReaderAccountControlsProps) {
    const [user, setUser] = useState<StoredUser | null>(() => readUser());

    useEffect(() => {
        const sync = () => setUser(readUser());
        window.addEventListener('storage', sync);
        window.addEventListener('vellora-auth-changed', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('vellora-auth-changed', sync);
        };
    }, []);

    const login = () => {
        window.location.href = `/login?next=${encodeURIComponent(currentPath())}`;
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('token_expiry');
        window.dispatchEvent(new Event('vellora-auth-changed'));
        setUser(null);
    };

    if (!user) {
        return (
            <button
                onClick={login}
                className={`inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white/75 text-xs font-bold text-amber-800 transition-colors hover:border-amber-300 hover:bg-white dark:border-amber-900/60 dark:bg-white/5 dark:text-amber-200 dark:hover:bg-white/10 ${
                    compact ? 'px-2 py-2' : 'px-3 py-2'
                }`}
                aria-label="Sign in to Vellora"
                title="Sign in to sync Vellora"
            >
                <LogIn className="h-4 w-4" />
                <span className={compact ? 'sr-only' : ''}>Sign in</span>
            </button>
        );
    }

    const label = user.name || user.username || user.email || 'Signed in';

    if (compact) {
        return (
            <button
                onClick={logout}
                className="inline-flex items-center rounded-lg border border-stone-200 bg-white/75 px-2 py-2 text-xs font-bold text-stone-600 transition-colors hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:border-red-900/60 dark:hover:text-red-300"
                aria-label="Sign out of Vellora"
                title={`Sign out${label ? ` (${label})` : ''}`}
            >
                <LogOut className="h-4 w-4" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span
                className="hidden max-w-36 items-center gap-2 truncate rounded-lg border border-stone-200 bg-white/60 px-3 py-2 text-xs font-semibold text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 sm:inline-flex"
                title={label}
            >
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
            </span>
            <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white/75 px-3 py-2 text-xs font-bold text-stone-600 transition-colors hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:border-red-900/60 dark:hover:text-red-300"
            >
                <LogOut className="h-4 w-4" />
                Sign out
            </button>
        </div>
    );
}
