import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen, getSceneVersion, convertToExcalidrawElements } from "@excalidraw/excalidraw";
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
    initialRequest?: any;
}

interface DrawingData {
    elements: any[];
    appState: any;
    is_public: boolean;
    id?: string;
}

type ViewMode = 'hidden' | 'minimized' | 'split' | 'maximize';

const ExcalidrawDrawer: React.FC<ExcalidrawDrawerProps> = ({ articleSlug, initialRequest }) => {
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
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

    // Helper for wrapping text
    const wrapperText = (text: string, maxChars: number) => {
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            if (currentLine.length + 1 + words[i].length <= maxChars) {
                currentLine += ' ' + words[i];
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);
        return lines.join('\n');
    };

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

    // Check for existing drawings on load
    useEffect(() => {
        const checkDrawing = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                // Component might be rendered but hidden, so we won't force redirect immediately unless it's open?
                // But original logic forced redirect. We'll keep it safe.
                // Ideally authentication is handled upstream or by the Modal now. 
                // But let's keep this check for data fetching.
                return;
            }

            try {
                const response = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/my_drawings/?blog_slug=${articleSlug}`);
                if (response.ok) {
                    const data = await response.json();
                    const results = data.results || (Array.isArray(data) ? data : []);
                    if (Array.isArray(results)) {
                        const drawing = results.find((d: any) => d.blog_slug === articleSlug);
                        if (drawing) {
                            const detailRes = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/${drawing.id}/`);
                            if (detailRes.ok) {
                                const fullDrawing = await detailRes.json();
                                const elements = typeof fullDrawing.elements === 'string' ? JSON.parse(fullDrawing.elements) : fullDrawing.elements || [];
                                const appState = typeof fullDrawing.app_state === 'string' ? JSON.parse(fullDrawing.app_state) : fullDrawing.app_state || {};

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

    // Handle Events (Open, Close, Add to Sketch)
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

        const handleAddToSketch = (e: CustomEvent | { detail: any }) => {
            const { text, elements: importedElements } = e.detail;

            // Check if closed/minimized BEFORE changing state
            const isClosed = viewMode === 'hidden' || viewMode === 'minimized';

            // 1. Open Drawer if closed
            const mobile = window.innerWidth < 1024;
            if (mobile) setShowMobileWarning(true);

            setViewMode(prev => {
                if (prev === 'hidden' || prev === 'minimized') {
                    return mobile ? 'maximize' : 'split';
                }
                return prev;
            });

            // 2. Define Add Logic
            const addNote = async () => {
                if (!excalidrawAPI) return;

                const st = excalidrawAPI.getAppState();
                const zoom = st.zoom.value;
                const cx = -st.scrollX + (st.width / 2) / zoom;
                const cy = -st.scrollY + (st.height / 2) / zoom;

                let newElements = [];

                if (importedElements && Array.isArray(importedElements) && importedElements.length > 0) {
                    // Normalize AI elements
                    const normalized = importedElements.flatMap((el: any) => {
                        // Ensure ID exists
                        if (!el.id) el.id = Math.random().toString(36).substr(2, 9);

                        // 1. Handle Arrays
                        if (el.type === "arrow" && el.start && el.end) {
                            return [{
                                ...el,
                                x: el.start.x,
                                y: el.start.y,
                                points: [[0, 0], [el.end.x - el.start.x, el.end.y - el.start.y]]
                            }];
                        }

                        // 2. Handle Shapes with Labels (Rectangle, Ellipse, Diamond)
                        if ((el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") && el.label) {
                            const textId = Math.random().toString(36).substr(2, 9);

                            // Create Text Element
                            // Note: We don't need exact centering here because Excalidraw's container logic handles layout
                            // BUT for raw elements, explicit positioning helps.
                            const fontSize = 20;
                            const textY = el.y + (el.height / 2) - 10; // Approximate center

                            const textEl = {
                                type: "text",
                                id: textId,
                                x: el.x, // Container x
                                y: textY,
                                width: el.width,
                                height: el.height, // Bound to container
                                text: wrapperText(el.label, 30), // Wrap text
                                fontSize: fontSize,
                                fontFamily: 1,
                                textAlign: "center",
                                verticalAlign: "middle",
                                containerId: el.id
                            };

                            // Update Shape to bind text
                            const shapeEl = {
                                ...el,
                                boundElements: [{ id: textId, type: "text" }],
                                label: undefined // Remove non-standard prop
                            };

                            return [shapeEl, textEl];
                        }

                        return [el];
                    });

                    // AI Diagram Logic
                    // Calculate center offset safely
                    const xs = normalized.map(el => el.x || 0);
                    const ys = normalized.map(el => el.y || 0);
                    const rights = normalized.map(el => (el.x || 0) + (el.width || 0));
                    const bottoms = normalized.map(el => (el.y || 0) + (el.height || 0));

                    const minX = Math.min(...xs);
                    const minY = Math.min(...ys);
                    const maxX = Math.max(...rights);
                    const maxY = Math.max(...bottoms);

                    const width = maxX - minX;
                    const height = maxY - minY;

                    // Fallback if width/height is 0 (single point)
                    const safeWidth = width || 100;
                    const safeHeight = height || 100;

                    const offsetX = (cx - safeWidth / 2) - minX;
                    const offsetY = (cy - safeHeight / 2) - minY;

                    newElements = convertToExcalidrawElements(normalized.map((el: any) => ({
                        ...el,
                        x: (el.x || 0) + offsetX,
                        y: (el.y || 0) + offsetY,
                    })));

                    // ANIMATED DRAWING LOOP
                    let currentElements = excalidrawAPI.getSceneElements();
                    let accumElements = [...currentElements];

                    for (const el of newElements) {
                        accumElements.push(el);
                        // Update scene with current batch
                        excalidrawAPI.updateScene({ elements: accumElements });

                        // Pan to show the new element (animated)
                        if (newElements.length > 1) { // Only animate diagrams
                            try {
                                excalidrawAPI.scrollToContent([el], { fitToContent: false, animate: true });
                            } catch (e) { console.warn("Scroll error:", e); }
                            // Wait for user to see it (500ms)
                            await new Promise(r => setTimeout(r, 500));
                        }
                    }

                    // Final Commit
                    excalidrawAPI.updateScene({
                        elements: accumElements,
                        commitToHistory: true,
                        appState: {
                            selectedElementIds: newElements.reduce((acc: any, el: any) => ({ ...acc, [el.id]: true }), {})
                        }
                    });

                    return; // Done

                } else if (text) {
                    // Text Note Logic
                    newElements = convertToExcalidrawElements([{
                        type: "text",
                        text: wrapperText(text, 40),
                        x: cx - 100,
                        y: cy,
                        fontSize: 20,
                        fontFamily: 1,
                        strokeColor: "#9333ea",
                        link: window.location.href,
                    }]);
                }

                if (newElements.length > 0) {
                    const currentElements = excalidrawAPI.getSceneElements();
                    excalidrawAPI.updateScene({
                        elements: [...currentElements, ...newElements],
                        commitToHistory: true,
                        appState: {
                            selectedElementIds: newElements.reduce((acc: any, el: any) => ({ ...acc, [el.id]: true }), {})
                        }
                    });
                }
            };

            // 3. Execute with delay if opening
            if (isClosed) {
                setTimeout(addNote, 400);
            } else {
                addNote();
            }
        };

        window.addEventListener('toggle-excalidraw', handleToggle);
        window.addEventListener('open-excalidraw', handleOpen);
        window.addEventListener('request-add-to-sketch', handleAddToSketch as EventListener);

        // Handle Initial Request (if provided and API is ready)
        // @ts-ignore
        if (typeof initialRequest !== 'undefined' && initialRequest && excalidrawAPI) {
            // We use a small timeout to let the editor fully init if it just mounted
            // Use a flagging mechanism to avoid double draw if the parent passes it down again?
            // Since this component is lazy loaded, it likely mounts fresh.
            // We can check if we already have elements? No.
            // We rely on the parent logic to only pass it once.
            // Better: check if we have done it.
            if (!(window as any).__INITIAL_REQUEST_PROCESSED) {
                (window as any).__INITIAL_REQUEST_PROCESSED = true;
                handleAddToSketch({ detail: initialRequest });
            }
        }

        return () => {
            window.removeEventListener('toggle-excalidraw', handleToggle);
            window.removeEventListener('open-excalidraw', handleOpen);
            window.removeEventListener('request-add-to-sketch', handleAddToSketch as EventListener);
        };
    }, [excalidrawAPI, initialRequest]);

    // Save Data Logic
    const saveData = useCallback(async (elements: any, appState: any, isPublicState: boolean) => {
        const currentVersion = getSceneVersion(elements);
        if (currentVersion === lastSavedVersionRef.current) {
            setHasUnsavedChanges(false);
            return;
        }

        const updatedAppState = { ...appState, name: title };
        const token = localStorage.getItem('access_token');
        if (!token) return;

        setIsSaving(true);
        try {
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
    }, [articleSlug, drawingData?.id, title]);

    const handleChange = useCallback((elements: any, appState: any) => {
        const currentVersion = getSceneVersion(elements);
        if (currentVersion === lastSavedVersionRef.current) return;

        setHasUnsavedChanges(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveData(elements, appState, isPublic);
        }, 2000);
    }, [isPublic, saveData]);

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

    // Width & Layout Effects
    const [drawerWidth, setDrawerWidth] = useState(0);

    useEffect(() => {
        const updateWidth = () => {
            setDrawerWidth(Math.max(400, window.innerWidth * 0.45));
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    useEffect(() => {
        const mainElement = document.querySelector('main');
        const header = document.getElementById('site-header');

        const updateLayout = () => {
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
        };
        updateLayout();

        return () => {
            if (mainElement) mainElement.style.paddingRight = '0px';
            if (header) header.style.display = '';
            document.body.style.removeProperty('--excalidraw-drawer-width');
            document.body.classList.remove('excalidraw-split-active');
            document.body.classList.remove('excalidraw-fullscreen-active');
        };
    }, [viewMode, drawerWidth]);

    useEffect(() => {
        if (!excalidrawAPI) return;
        const timer = setTimeout(() => excalidrawAPI.refresh(), 350);
        return () => clearTimeout(timer);
    }, [viewMode, drawerWidth, excalidrawAPI]);

    const getContainerStyles = () => {
        const baseStyles = "bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out flex flex-col overflow-visible";
        switch (viewMode) {
            case 'maximize': return `${baseStyles} fixed inset-0 z-[10000] h-full`;
            case 'split': return `${baseStyles} fixed top-[64px] bottom-0 z-[40] border-l border-gray-200 dark:border-gray-800 shadow-2xl`;
            default: return `${baseStyles} fixed top-[64px] bottom-0 z-[40] border-l border-gray-200 dark:border-gray-800 shadow-2xl pointer-events-none`;
        }
    };

    return (
        <>
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

            <div
                className={getContainerStyles()}
                style={{
                    width: viewMode === 'maximize' ? '100%' : `${drawerWidth}px`,
                    right: (viewMode === 'hidden' || viewMode === 'minimized') ? `-${drawerWidth}px` : '0px'
                }}
            >
                <div className="flex items-center justify-between p-2 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm relative z-[70]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                            <span className="text-xs text-gray-400 font-medium">
                                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setTitle(v);
                                    titleRef.current = v;
                                    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
                                }}
                                onBlur={() => {
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

                <div className="flex-1 relative w-full bg-gray-50 dark:bg-gray-900 overflow-visible">
                    <div style={{ width: "100%", height: "100%" }}>
                        <style>{`
                        .excalidraw, .excalidraw-container { overflow: visible !important; }
                        .excalidraw .dropdown-menu { z-index: 9999 !important; position: absolute !important; }
                        .excalidraw .Island { z-index: 50 !important; overflow: visible !important; }
                        .excalidraw .layer-ui__wrapper { overflow: visible !important; }
                        .excalidraw .layer-ui__library { border-radius: 0; }
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
