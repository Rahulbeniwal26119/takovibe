import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.PUBLIC_API_URL;
const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

interface User {
    name: string;
    image: string;
    email: string;
}

const UserAuth: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check auth status on mount
        const checkAuthStatus = () => {
            const token = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error('Failed to parse user data', e);
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };

        checkAuthStatus();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/';
    };

    if (loading) {
        return <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>;
    }

    return (
        <div className="auth-container flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-3">
                    <img
                        src={user.image || ''}
                        alt={user.name}
                        className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
                        onError={(e) => {
                            // Simple gray placeholder with user icon
                            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239CA3AF"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
                            (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
                            (e.target as HTMLImageElement).className = "w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-gray-800 p-1";
                        }}
                    />
                    <button
                        onClick={handleLogout}
                        className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                        aria-label="Logout"
                    >
                        Logout
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <a
                        href="/login"
                        className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                        Log in
                    </a>
                    <a
                        href="/signup"
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-full transition-colors shadow-sm shadow-purple-500/20"
                    >
                        Sign up
                    </a>
                </div>
            )}
        </div>
    );
};

export default UserAuth;
