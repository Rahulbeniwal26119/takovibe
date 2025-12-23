import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.PUBLIC_API_URL;
const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

interface User {
    name: string;
    image: string;
    email: string;
    username?: string;
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("UserAuth Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <div className="text-red-500 text-xs">Auth Error</div>;
        }

        return this.props.children;
    }
}

const UserAuthContent: React.FC = () => {
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
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser && typeof parsedUser === 'object') {
                        // Ensure name exists
                        if (!parsedUser.name) {
                            parsedUser.name = 'User';
                        }
                        setUser(parsedUser);
                    } else {
                        localStorage.removeItem('user');
                    }
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

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // ... existing loading check ...

    if (loading) {
        return (
            <div className="flex items-center gap-2 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div className="hidden md:block w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    return (
        <div className="auth-container flex items-center gap-4 relative" ref={dropdownRef}>
            {user ? (
                <>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 focus:outline-none group"
                    >
                        <img
                            src={user.image || getInitialsAvatar(user.name)}
                            alt={user.name}
                            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = getInitialsAvatar(user.name);
                            }}
                        />
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {(user.name || 'User').split(' ')[0]}
                            </p>
                        </div>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>

                            <a
                                href="/dashboard"
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            >
                                Dashboard
                            </a>

                            <a
                                href="/post/new"
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            >
                                New Post
                            </a>

                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>

                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </>
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

const UserAuth = () => (
    <ErrorBoundary>
        <UserAuthContent />
    </ErrorBoundary>
);

export default UserAuth;
