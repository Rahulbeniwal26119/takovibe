

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen, getSceneVersion } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { X, PenTool, Lock, Unlock, Minimize2, Maximize2, LayoutTemplate, Monitor } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import drwnioLib from '../data/libraries/drwnio.json';
import systemDesignLib from '../data/libraries/system-design.json';

// Combine library items
const initialLibraryItems = [
    ...(drwnioLib.library || []),
    ...(systemDesignLib.library || [])
];

interface ExcalidrawDrawerProps {
    articleSlug: string;
}

interface DrawingData {
    elements: any[];
    appState: any;
    is_public: boolean;
    id?: string;
}

type ViewMode = 'hidden' | 'minimized' | 'split' | 'maximize';

const ExcalidrawDrawer: React.FC<ExcalidrawDrawerProps> = ({ articleSlug }) => {
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        // Default to open (split or maximize based on device) because this component
        // is only lazily mounted when the user explicitly triggers it.
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1024 ? 'maximize' : 'split';
        }
        return 'split';
    });
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [drawingData, setDrawingData] = useState<DrawingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showMobileWarning, setShowMobileWarning] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [title, setTitle] = useState("Untitled");
    const titleRef = useRef("Untitled");
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedVersionRef = useRef(0);

    // Detect Mobile
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setShowMobileWarning(false);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Check for existing drawings on load (API Only)
    useEffect(() => {
        const checkDrawing = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                return;
            }

            try {
                // Updated API Endpoint: Use my_drawings to get USER'S drawings
                const response = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/my_drawings/?blog_slug=${articleSlug}`);

                if (response.ok) {
                    const data = await response.json();
                    // Handle paginated response or list
                    const results = data.results || (Array.isArray(data) ? data : []);

                    if (Array.isArray(results)) {
                        // Find drawing matching the current article (client-side filter ensures safety)
                        const drawing = results.find((d: any) => d.blog_slug === articleSlug);

                        if (drawing) {
                            // Fetch full details using ID (List view excludes elements/app_state)
                            const detailRes = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/${drawing.id}/`);
                            if (detailRes.ok) {
                                const fullDrawing = await detailRes.json();

                                // Backend sends JSON objects now, not strings
                                const elements = typeof fullDrawing.elements === 'string'
                                    ? JSON.parse(fullDrawing.elements)
                                    : fullDrawing.elements || [];

                                const appState = typeof fullDrawing.app_state === 'string'
                                    ? JSON.parse(fullDrawing.app_state)
                                    : fullDrawing.app_state || {};

                                // Set Title from dedicated field, fallback to appState.name or Untitled
                                const loadedTitle = fullDrawing.title || appState.name || "Untitled";
                                setTitle(loadedTitle);
                                titleRef.current = loadedTitle;

                                setDrawingData({
                                    elements: elements,
                                    appState: appState,
                                    is_public: fullDrawing.is_public,
                                    id: fullDrawing.id
                                });
                                setIsPublic(fullDrawing.is_public);
                                lastSavedVersionRef.current = getSceneVersion(elements || []);
                                setHasUnsavedChanges(false);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch drawings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkDrawing();
    }, [articleSlug]);

    // Handle Open/Close Events
    useEffect(() => {
        const handleToggle = () => {
            setViewMode(prev => {
                if (prev !== 'hidden') return 'hidden';
                const mobile = window.innerWidth < 1024;
                if (mobile) setShowMobileWarning(true);
                return mobile ? 'maximize' : 'split';
            });
        };
        const handleOpen = () => {
            const mobile = window.innerWidth < 1024;
            if (mobile) setShowMobileWarning(true);
            setViewMode(mobile ? 'maximize' : 'split');
        };

        window.addEventListener('toggle-excalidraw', handleToggle);
        window.addEventListener('open-excalidraw', handleOpen);

        return () => {
            window.removeEventListener('toggle-excalidraw', handleToggle);
            window.removeEventListener('open-excalidraw', handleOpen);
        };
    }, []);

    const saveData = useCallback(async (elements: any, appState: any, isPublicState: boolean) => {
        // Version check to prevent loops
        const currentVersion = getSceneVersion(elements);
        if (currentVersion === lastSavedVersionRef.current) {
            setHasUnsavedChanges(false);
            return;
        }

        // Update AppState with Title
        const updatedAppState = { ...appState, name: title };

        const token = localStorage.getItem('access_token');
        if (!token) return;

        setIsSaving(true);
        try {
            // Updated Payload structure
            const payload = {
                blog_slug: articleSlug,
                elements: [...elements],
                app_state: updatedAppState,
                is_public: isPublicState,
                title: titleRef.current
            };

            const method = drawingData?.id ? 'PUT' : 'POST';
            const url = drawingData?.id
                ? `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/${drawingData.id}/`
                : `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/`;

            const response = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const saved = await response.json();
                setDrawingData(prev => ({ ...prev, ...saved }));
                lastSavedVersionRef.current = currentVersion;
                setHasUnsavedChanges(false);
            }
        } catch (error) {
            console.error("Failed to save drawing:", error);
        } finally {
            setIsSaving(false);
        }
    }, [articleSlug, drawingData?.id]);

    const handleChange = useCallback((elements: any, appState: any) => {
        // Prevent updates if nothing really changed (Excalidraw fires frequently)
        const currentVersion = getSceneVersion(elements);
        if (currentVersion === lastSavedVersionRef.current) {
            return;
        }

        setHasUnsavedChanges(prev => {
            if (prev) return prev;
            return true;
        });

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            saveData(elements, appState, isPublic);
        }, 2000);
    }, [isPublic, saveData, title]);

    const togglePublic = async () => {
        if (!drawingData?.id) {
            const newState = !isPublic;
            setIsPublic(newState);
            if (excalidrawAPI) {
                saveData(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState(), newState);
            }
            return;
        }

        try {
            const response = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/${drawingData.id}/toggle_public/`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setIsPublic(data.is_public);
                setDrawingData(prev => prev ? { ...prev, is_public: data.is_public } : null);
            }
        } catch (error) {
            console.error("Failed to toggle public status:", error);
        }
    };

    const [drawerWidth, setDrawerWidth] = useState(0);
    const isResizing = useRef(false);

    // Initialize width on mount
    useEffect(() => {
        const updateWidth = () => {
            setDrawerWidth(Math.max(400, window.innerWidth * 0.45));
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Effect to push content when in split mode and hide header in maximize mode
    useEffect(() => {
        const mainElement = document.querySelector('main');
        const header = document.getElementById('site-header');

        if (viewMode === 'split') {
            if (mainElement) {
                mainElement.style.transition = 'padding-right 0.3s ease-out';
                mainElement.style.paddingRight = `${drawerWidth}px`;
            }
            if (header) header.style.display = '';
            document.body.style.setProperty('--excalidraw-drawer-width', `${drawerWidth}px`);
            document.body.classList.add('excalidraw-split-active');
            document.body.classList.remove('excalidraw-fullscreen-active');
        } else if (viewMode === 'maximize') {
            if (mainElement) mainElement.style.paddingRight = '0px';
            if (header) header.style.display = 'none';
            document.body.style.removeProperty('--excalidraw-drawer-width');
            document.body.classList.remove('excalidraw-split-active');
            document.body.classList.add('excalidraw-fullscreen-active');
        } else {
            if (mainElement) mainElement.style.paddingRight = '0px';
            if (header) header.style.display = '';
            document.body.style.removeProperty('--excalidraw-drawer-width');
            document.body.classList.remove('excalidraw-split-active');
            document.body.classList.remove('excalidraw-fullscreen-active');
        }

        return () => {
            if (mainElement) mainElement.style.paddingRight = '0px';
            if (header) header.style.display = '';
            document.body.style.removeProperty('--excalidraw-drawer-width');
            document.body.classList.remove('excalidraw-split-active');
            document.body.classList.remove('excalidraw-fullscreen-active');
        };
    }, [viewMode, drawerWidth]);

    // Refresh Excalidraw dimension compensation after transitions
    useEffect(() => {
        if (!excalidrawAPI) return;
        // Refresh after transition (300ms + buffer)
        const timer = setTimeout(() => {
            excalidrawAPI.refresh();
        }, 350);
        return () => clearTimeout(timer);
    }, [viewMode, drawerWidth, excalidrawAPI]);

    // View Styles
    const getContainerStyles = () => {
        // Enforce overflow-visible to prevent clipping of popups/menus
        const baseStyles = "bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out flex flex-col overflow-visible";

        switch (viewMode) {
            case 'maximize':
                return `${baseStyles} fixed inset-0 z-[10000] h-full`;
            case 'split':
                return `${baseStyles} fixed top-[64px] bottom-0 z-[40] border-l border-gray-200 dark:border-gray-800 shadow-2xl`;
            case 'hidden':
            case 'minimized':
            default:
                return `${baseStyles} fixed top-[64px] bottom-0 z-[40] border-l border-gray-200 dark:border-gray-800 shadow-2xl pointer-events-none`;
        }
    };

    return (
        <>
            {/* Minimized Trigger Button */}
            <div className={`fixed bottom-24 right-6 z-[60] transition-all duration-300 ${viewMode === 'minimized' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                <button
                    onClick={() => setViewMode('split')}
                    className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
                    title="Open Notes"
                >
                    <PenTool className="w-6 h-6" />
                    {hasUnsavedChanges && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </button>
            </div>

            {/* Main Drawer Container */}
            <div
                className={getContainerStyles()}
                style={{
                    width: viewMode === 'maximize' ? '100%' : `${drawerWidth}px`,
                    right: (viewMode === 'hidden' || viewMode === 'minimized') ? `-${drawerWidth}px` : '0px'
                }}
            >


                {/* Header Toolbar - Standard Fixed Block */}
                <div className="flex items-center justify-between p-2 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm relative z-[70]">
                    <div className="flex items-center gap-3">
                        {/* Status Indicator */}
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                            <span className="text-xs text-gray-400 font-medium">
                                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                            </span>
                        </div>
                        {/* Title Input */}
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setTitle(v);
                                    titleRef.current = v;
                                    if (!hasUnsavedChanges) setHasUnsavedChanges(true); // Trigger save on title change eventually
                                }}
                                onBlur={() => {
                                    // Trigger immediate save on blur if changed
                                    if (excalidrawAPI) {
                                        const els = excalidrawAPI.getSceneElements();
                                        const st = excalidrawAPI.getAppState();
                                        saveData(els, st, isPublic);
                                    }
                                }}
                                className="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none w-32 sm:w-48 transition-colors truncate"
                                placeholder="Untitled Note"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Privacy Toggle */}
                        <button
                            onClick={togglePublic}
                            className={`p-1.5 rounded-lg transition-colors ${isPublic
                                ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            title={isPublic ? "Public Note" : "Private Note"}
                        >
                            {isPublic ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>

                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* View Controls */}
                        {!isMobile && (
                            <button
                                onClick={() => setViewMode('split')}
                                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'split' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                title="Side View"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('maximize')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'maximize' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            title="Full Screen"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('minimized')}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="Minimize"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('hidden')}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Mobile Warning Banner */}
                {showMobileWarning && isMobile && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-2 flex items-center justify-between text-xs sm:text-sm text-blue-800 dark:text-blue-200 px-4">
                        <span>For the best experience, please use a laptop or larger screen.</span>
                        <button
                            onClick={() => setShowMobileWarning(false)}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full ml-2"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}



                {/* Canvas Area */}
                <div className="flex-1 relative w-full bg-gray-50 dark:bg-gray-900 overflow-visible">
                    {/* Debug Info Overlay (Hidden) */}
                    {/* <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, padding: 4, fontSize: 10, opacity: 0.5, pointerEvents: 'none' }}>
                   View: {viewMode} | API: {excalidrawAPI ? 'Yes' : 'No'} | Data: {drawingData ? 'Loaded' : 'None'}
                </div> */}

                    <div
                        style={{ width: "100%", height: "100%" }}
                    >
                        {/* Fix for Clipped UI/Library */}
                        <style>{`
                        /* Base container overrides */
                        .excalidraw, .excalidraw-container { overflow: visible !important; }

                        /* Dropdowns and Popups */
                        .excalidraw .dropdown-menu { z-index: 9999 !important; position: absolute !important; }
                        .excalidraw .Island { z-index: 50 !important; overflow: visible !important; }
                        
                        /* Library Sidebar specific */
                        .excalidraw .layer-ui__wrapper { overflow: visible !important; }
                        .excalidraw .layer-ui__library { border-radius: 0; }
                        
                        /* Hide browse button if needed, but ensure library itself is visible */
                        .excalidraw .library-menu-browse-button { display: none !important; }
                    `}</style>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                            </div>
                        ) : (
                            <Excalidraw
                                initialData={
                                    drawingData ? {
                                        elements: drawingData.elements,
                                        appState: {
                                            ...drawingData.appState,
                                            collaborators: new Map(),
                                            viewBackgroundColor: "#ffffff"
                                        },
                                        libraryItems: initialLibraryItems as any,
                                        scrollToContent: true
                                    } : {
                                        libraryItems: initialLibraryItems as any
                                    }
                                }
                                onChange={(elements, appState) => {
                                    handleChange(elements, appState)
                                }}
                                excalidrawAPI={(api) => {
                                    setExcalidrawAPI(api);
                                }}
                                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                                UIOptions={{
                                    tools: { image: false },
                                    canvasActions: {
                                        changeViewBackgroundColor: true,
                                        clearCanvas: true,
                                        export: { saveFileToDisk: true },
                                        loadScene: false,
                                        saveToActiveFile: false,
                                        toggleTheme: true,
                                        saveAsImage: true
                                    }
                                }}
                            >
                                <WelcomeScreen>
                                    <WelcomeScreen.Hints.MenuHint />
                                    <WelcomeScreen.Hints.ToolbarHint />
                                    <WelcomeScreen.Center>
                                        <WelcomeScreen.Center.Heading>
                                            Sketch Your Ideas
                                        </WelcomeScreen.Center.Heading>
                                    </WelcomeScreen.Center>
                                </WelcomeScreen>
                                <MainMenu>
                                    <MainMenu.DefaultItems.Export />
                                    <MainMenu.DefaultItems.SaveAsImage />
                                    <MainMenu.DefaultItems.ClearCanvas />
                                    <MainMenu.DefaultItems.ChangeCanvasBackground />
                                </MainMenu>
                            </Excalidraw>
                        )}
                    </div>
                </div>
            </div >
        </>
    );
};

export default ExcalidrawDrawer;

