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
                        top: 0.75rem !important;
                        left: 0.75rem !important;
                        right: auto !important;
                        width: calc(${splitRatio}% - 1.5rem) !important;
                        max-width: calc(${splitRatio}% - 1.5rem) !important;
                        padding: 0 !important;
                        transform: none !important;
                        pointer-events: auto !important;
                    }
                    #zen-nav > div {
                        width: 100% !important;
                        max-width: none !important;
                        height: 3.75rem !important;
                        border-color: rgba(64, 64, 64, 0.9) !important;
                        background: rgba(23, 23, 23, 0.92) !important;
                        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22) !important;
                    }
                    #article-nav-links {
                        display: none !important;
                    }
                    #article-nav-actions a {
                        padding: 0.5rem 0.75rem !important;
                        border-radius: 0.5rem !important;
                        background: #ea580c !important;
                        color: #fff !important;
                    }
                    /* Ensure trigger button is visible and high contrast */
                    #zen-nav #zen-menu-trigger {
                        display: grid !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                        background: rgba(255, 255, 255, 0.08) !important;
                        color: white !important;
                        border-color: rgba(255, 255, 255, 0.12) !important;
                        box-shadow: none !important;
                        backdrop-filter: blur(12px) !important;
                    }
                    html.dark #zen-nav #zen-menu-trigger {
                        background: rgba(255, 255, 255, 0.08) !important;
                        border: 1px solid rgba(255, 255, 255, 0.12) !important;
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
                        padding: 5.25rem 2rem 8rem !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        z-index: 50 !important;
                        background: var(--zen-bg, #fafaf9);
                        border-right: 1px solid #262626;
                    }
                    html.dark #immersive-article-container {
                         background: var(--zen-bg, #0a0a0a);
                         border-right: 1px solid #262626;
                    }

                    /* Hide Sidebars in Article when in split mode to save space */
                    aside { display: none !important; }
                    
                    #immersive-article-container > div {
                         max-width: 800px !important;
                         margin: 0 auto !important;
                         display: block !important;
                    }
                    #article {
                         max-width: 100% !important;
                    }
                    #article header {
                         padding-top: 2rem !important;
                         padding-bottom: 2rem !important;
                         margin-bottom: 2rem !important;
                    }
                    #article h1 {
                         font-size: clamp(2rem, 3.2vw, 3.25rem) !important;
                         line-height: 1.08 !important;
                         max-width: 100% !important;
                    }
                    #article header p {
                         max-width: 40rem !important;
                         font-size: 1rem !important;
                         line-height: 1.7 !important;
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
