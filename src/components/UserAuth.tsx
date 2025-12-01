import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.PUBLIC_API_URL;
const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

interface User {
    name: string;
    image: string;
    email: string;
}

const getInitialsAvatar = (name: string) => {
    const safeName = name || 'User';
    const initials = safeName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const colors = [
        '#EF5350', '#EC407A', '#AB47BC', '#7E57C2', '#5C6BC0',
        '#42A5F5', '#29B6F6', '#26C6DA', '#26A69A', '#66BB6A',
        '#9CCC65', '#D4E157', '#FFEE58', '#FFCA28', '#FFA726',
        '#FF7043', '#8D6E63', '#BDBDBD', '#78909C'
    ];

    const charCode = safeName.charCodeAt(0) || 0;
    const color = colors[charCode % colors.length];

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="${color}" />
        <text x="50" y="50" dy=".35em" fill="white" font-family="Arial" font-size="40" text-anchor="middle">${initials}</text>
    </svg>
    `;

    // Use Base64 encoding to avoid issues with browser extensions and special characters
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
};

const UserAuth: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check auth status on mount
        const checkAuthStatus = () => {
            const token = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');
            const tokenExpiry = localStorage.getItem('token_expiry');

            if (token && storedUser) {
                // Check for expiration
                if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
                    console.log('Session expired');
                    handleLogout();
                    return;
                }

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
        localStorage.removeItem('token_expiry');
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
                        src={user.image || getInitialsAvatar(user.name)}
                        alt={user.name}
                        className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = getInitialsAvatar(user.name);
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
