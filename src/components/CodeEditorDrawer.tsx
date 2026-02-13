import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Minimize2, LayoutTemplate, Monitor, Lock, Unlock, PenTool, Code2 } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { showToast } from '../utils/toast';
import { CodeStudio } from './editor/CodeStudio';

interface CodeEditorDrawerProps {
    articleSlug: string;
    initialRequest?: any;
}

type ViewMode = 'hidden' | 'minimized' | 'split' | 'maximize';

const CodeEditorDrawer: React.FC<CodeEditorDrawerProps> = ({ articleSlug, initialRequest }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('hidden');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Editor State
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [title, setTitle] = useState("Untitled Snippet");

    // Split View State
    const [splitRatio, setSplitRatio] = useState(50); // Percentage
    const isDraggingRef = useRef(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileWarning, setShowMobileWarning] = useState(false);

    // Initial Load & Event Listeners
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setShowMobileWarning(false);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const handleOpen = (e: CustomEvent) => {
            // Check authentication
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.dispatchEvent(new CustomEvent('show-login-prompt', {
                    detail: {
                        feature: 'Code Studio'
                    }
                }));
                return;
            }

            const { code: newCode, language: newLang } = e.detail;
            setCode(newCode || "");
            setLanguage(newLang || "javascript");

            const mobile = window.innerWidth < 1024;
            if (mobile) setShowMobileWarning(true);
            setViewMode(mobile ? 'maximize' : 'split');
        };

        window.addEventListener('open-code-studio', handleOpen as EventListener);
        window.addEventListener('open-excalidraw', () => setViewMode('hidden')); // Close when Excalidraw opens
        window.addEventListener('toggle-excalidraw', () => setViewMode('hidden'));
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('open-code-studio', handleOpen as EventListener);
        };
    }, []);

    // Check for auto-open query param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('open_playground') === 'true') {
            const mobile = window.innerWidth < 1024;
            if (mobile) setShowMobileWarning(true);

            const token = localStorage.getItem('access_token');
            if (token) {
                setViewMode(mobile ? 'maximize' : 'split');
            } else {
                // Optionally prompt login if not authenticated
                window.dispatchEvent(new CustomEvent('show-login-prompt', {
                    detail: { feature: 'Code Studio' }
                }));
            }

            // Clean URL
            const url = new URL(window.location.href);
            url.searchParams.delete('open_playground');
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    // --- IMMERSIVE SPLIT LOGIC (Shared with ExcalidrawDrawer) ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            e.preventDefault();
            const newPercentage = (e.clientX / window.innerWidth) * 100;
            if (newPercentage > 20 && newPercentage < 80) {
                setSplitRatio(newPercentage);
            }
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        if (viewMode === 'split') {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [viewMode]);

    // Force UI adjustments for split mode
    useEffect(() => {
        if (viewMode === 'split') {
            document.body.classList.add('split-view-active');
        } else {
            document.body.classList.remove('split-view-active');
        }
        return () => document.body.classList.remove('split-view-active');
    }, [viewMode]);

    const getContainerStyles = () => {
        const baseStyles = "bg-white dark:bg-gray-900 transition-none duration-0 ease-linear flex flex-col overflow-hidden";
        switch (viewMode) {
            case 'maximize': return `${baseStyles} fixed inset-0 z-[10000]`;
            case 'split': return `${baseStyles} fixed top-0 bottom-0 right-0 z-[10000] shadow-2xl border-l border-gray-200 dark:border-gray-800`;
            default: return `${baseStyles} fixed top-0 bottom-0 right-0 w-0 z-[40] pointer-events-none opacity-0`;
        }
    };

    if (viewMode === 'hidden') return null;

    return (
        <>
            {/* INJECTED STYLES FOR IMMERSIVE SPLIT */}
            {viewMode === 'split' && (
                <style>{`
                    body { overflow: hidden !important; }
                    #site-header, footer, .reading-progress { display: none !important; }
                    
                    /* Restore Zen Nav */
                    #zen-nav {
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        z-index: 9999999 !important; /* Max z-index */
                        position: fixed !important;
                        top: 1rem !important;
                        left: 1rem !important;
                        transform: none !important;
                        pointer-events: auto !important;
                    }
                    /* Ensure trigger button is visible and high contrast */
                    #zen-nav #zen-menu-trigger {
                        opacity: 1 !important;
                        visibility: visible !important;
                        background: rgba(0, 0, 0, 0.8) !important; /* Dark background for contrast */
                        color: white !important;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                        backdrop-filter: blur(12px) !important;
                    }
                    html.dark #zen-nav #zen-menu-trigger {
                        background: rgba(255, 255, 255, 0.2) !important;
                        border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    }

                    /* Transform Article Container */
                    #immersive-article-container {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        width: ${splitRatio}% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 5rem 2rem 8rem !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        z-index: 50 !important;
                        background: var(--zen-bg, #ffffff);
                        border-right: 1px solid #e5e7eb;
                    }
                    html.dark #immersive-article-container {
                         background: var(--zen-bg, #0f1117);
                         border-right: 1px solid #1f2937;
                    }

                    /* Hide Sidebars in Article when in split mode to save space */
                    aside { display: none !important; }
                    
                    #immersive-article-container > div {
                         max-width: 800px !important;
                         margin: 0 auto !important;
                         display: block !important;
                    }
                `}</style>
            )}

            {/* DRAG HANDLE (Only in split) */}
            {viewMode === 'split' && (
                <div
                    className="split-drag-handle fixed top-0 bottom-0 w-[6px] z-[10001] cursor-col-resize transition-colors duration-150 bg-gray-200 dark:bg-gray-800 hover:bg-purple-500 flex items-center justify-center group"
                    style={{ left: `calc(${splitRatio}% - 3px)` }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        isDraggingRef.current = true;
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }}
                >
                    <div className="w-1 h-8 rounded-full bg-gray-400 group-hover:bg-white/90"></div>
                </div>
            )}

            {/* MAIN DRAWER CONTAINER */}
            <div
                className={getContainerStyles()}
                style={{
                    width: viewMode === 'maximize' ? '100%' : viewMode === 'split' ? `${100 - splitRatio}%` : '0px',
                }}
            >
                {/* TOOLBAR */}
                <div className="flex items-center justify-between p-2 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm relative z-[70]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-semibold">
                            <Code2 className="w-5 h-5 text-purple-600" />
                            <span>Code Studio</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {!isMobile && (
                            <button
                                onClick={() => setViewMode('split')}
                                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'split' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                title="Split View"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('maximize')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'maximize' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            title="Full Screen"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('hidden')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors ml-2 shadow-sm"
                            title="Close Code Studio"
                        >
                            <X className="w-3 h-3" />
                            Close
                        </button>
                    </div>
                </div>

                {/* EDITOR CONTENT */}
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0d1117] relative">
                    <CodeStudio
                        code={code}
                        language={language}
                        title={title}
                        hideHeader={true}
                    />
                </div>
            </div>
        </>
    );
};

export default CodeEditorDrawer;
