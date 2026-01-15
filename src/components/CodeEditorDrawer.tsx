import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Minimize2, LayoutTemplate, Monitor, Lock, Unlock, PenTool, Code2 } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { showToast } from '../utils/toast';
import { CodePlayground } from './editor/CodePlayground';

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
    const titleRef = useRef("Untitled Snippet");

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
                        z-index: 30000 !important;
                        position: fixed !important;
                        top: 1rem !important;
                        left: 1rem !important;
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
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-transparent border-none focus:outline-none w-32 sm:w-48 transition-colors truncate focus:text-purple-600"
                            placeholder="Untitled Snippet"
                        />
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
                            <Monitor className="w-4 h-4" />
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

                {/* EDITOR CONTENT */}
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0d1117] relative">
                    <div className="h-full p-4">
                        <CodePlayground
                            initialHtml={language === 'html' ? code : ''}
                            initialCss={language === 'css' ? code : ''}
                            initialJs={language === 'javascript' ? code : ''}
                            initialCode={code}
                            initialLanguage={language}
                            isEditable={true}
                            title={title}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default CodeEditorDrawer;
