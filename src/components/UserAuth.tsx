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

    useEffect(() => {
        // Load Google Sign-In script if not logged in
        if (!user && !loading && GOOGLE_CLIENT_ID) {
            // Define the global callback
            (window as any).handleGoogleSignIn = async (response: any) => {
                try {
                    if (!response.credential) {
                        console.error('No credential received');
                        return;
                    }

                    const backendResponse = await fetch(`${API_URL}/api/users/google-login/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            token: response.credential
                        })
                    });

                    if (!backendResponse.ok) {
                        throw new Error(`Authentication failed: ${backendResponse.status}`);
                    }

                    let data = await backendResponse.json();
                    data = data.data;

                    // Store auth data
                    localStorage.setItem('access_token', data.access || data.token);
                    localStorage.setItem('refresh_token', data.refresh || data.refresh);
                    localStorage.setItem('user', JSON.stringify(data.user || data));

                    // Update state
                    setUser(data.user || data);

                    // Remove Google Sign-In script to clean up
                    const gisScript = document.querySelector('script[src*="gsi/client"]');
                    if (gisScript) {
                        gisScript.remove();
                    }

                } catch (error) {
                    console.error('Authentication error:', error);
                }
            };

            // Inject script
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                // Initialize Google Sign-In
                if ((window as any).google) {
                    (window as any).google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: (window as any).handleGoogleSignIn,
                        context: 'signin',
                        auto_select: false,
                        use_fedcm_for_prompt: false
                    });
                    (window as any).google.accounts.id.renderButton(
                        document.getElementById('google-signin-btn'),
                        {
                            type: 'icon',
                            shape: 'circle',
                            theme: 'filled_black',
                            size: 'large'
                        }
                    );
                }
            };
            document.head.appendChild(script);

            return () => {
                // Cleanup global function and script on unmount/change
                delete (window as any).handleGoogleSignIn;
                const scriptTag = document.querySelector('script[src*="gsi/client"]');
                if (scriptTag) scriptTag.remove();
            };
        }
    }, [user, loading]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.reload();
    };

    if (!GOOGLE_CLIENT_ID) {
        return <div className="text-gray-500 text-sm">Auth unavailable</div>;
    }

    if (loading) {
        return <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>;
    }

    return (
        <div className="auth-container">
            {user ? (
                <div className="flex items-center gap-3">
                    <a
                        href="/saved"
                        className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        aria-label="Saved Articles"
                    >
                        Saved
                    </a>
                    <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                    <img
                        src={user.image || ''}
                        alt={user.name}
                        className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
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
                <div id="google-signin-btn" className="h-[40px] min-w-[40px]"></div>
            )}
        </div>
    );
};

export default UserAuth;
