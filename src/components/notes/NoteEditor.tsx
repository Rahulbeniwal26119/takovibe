import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, WelcomeScreen, MainMenu, getSceneVersion } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { ArrowLeft, Save, Loader2, Cloud, CloudOff } from 'lucide-react';
import { fetchWithAuth } from '../../utils/api';
import { showToast } from '../../utils/toast';
import drwnioLib from '../../data/libraries/drwnio.json';
import systemDesignLib from '../../data/libraries/system-design.json';

const initialLibraryItems = [
    ...(drwnioLib.library || []),
    ...(systemDesignLib.library || [])
];

interface NoteEditorProps {
    noteId?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ noteId }) => {
    const [title, setTitle] = useState("Untitled Note");
    const [isLoading, setIsLoading] = useState(!!noteId);
    const [isSaving, setIsSaving] = useState(false);
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [drawingData, setDrawingData] = useState<any>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isAutoSavePaused, setIsAutoSavePaused] = useState(false);

    const titleRef = useRef(title);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedVersionRef = useRef(0);

    const drawingIdRef = useRef(noteId);
    useEffect(() => { if (drawingData?.id) drawingIdRef.current = drawingData.id; }, [drawingData?.id]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        }
    }, []);

    // Initial Load
    useEffect(() => {
        if (!noteId) {
            setIsLoading(false);
            return;
        }

        const fetchNote = async () => {
            try {
                const res = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/${noteId}/`);
                if (res.ok) {
                    const data = await res.json();

                    const elements = typeof data.elements === 'string' ? JSON.parse(data.elements) : data.elements || [];
                    const appState = typeof data.app_state === 'string' ? JSON.parse(data.app_state) : data.app_state || {};
                    // Sanitize appState to prevent Excalidraw crash (collaborators typemismatch)
                    if (appState.collaborators) delete appState.collaborators;

                    const loadedTitle = data.title || appState.name || "Untitled Note";

                    setTitle(loadedTitle);
                    titleRef.current = loadedTitle;
                    setDrawingData({
                        elements,
                        appState,
                        is_public: data.is_public,
                        id: data.id
                    });
                    setLastSaved(new Date(data.updated_at));
                    lastSavedVersionRef.current = getSceneVersion(elements || []);
                    if (data.id) drawingIdRef.current = data.id;
                } else {
                    console.error("Failed to load note");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNote();
    }, [noteId]);

    // Save logic is handled by executeSave


    const getErrorMessage = (err: any) => {
        if (typeof err === 'string') return err;
        if (err.non_field_errors) return err.non_field_errors.join(', ');
        if (err.detail) return err.detail;
        if (err.blog_slug) return Array.isArray(err.blog_slug) ? err.blog_slug.join(', ') : err.blog_slug;
        // Fallback: join all values
        return Object.values(err).flat().join(', ');
    };

    const isSavingRef = useRef(false);
    const pendingSaveRef = useRef(false);

    const executeSave = async (elements: any, appState: any) => {
        if (isSavingRef.current) {
            pendingSaveRef.current = true;
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        pendingSaveRef.current = false;

        try {
            const updatedAppState = { ...appState, name: titleRef.current };
            const payload = {
                title: titleRef.current,
                elements: [...elements],
                app_state: updatedAppState,
                is_public: drawingData?.is_public || false
            };

            let url = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/`;
            let method = 'POST';

            // Determine ID
            const activeId = drawingIdRef.current;
            if (activeId) {
                url = `${url}${activeId}/`;
                method = 'PUT';
            }

            const res = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const saved = await res.json();
                setDrawingData(prev => ({ ...prev, ...saved }));
                setLastSaved(new Date());
                setHasUnsavedChanges(false);
                setIsAutoSavePaused(false); // Resume auto-save on success
                lastSavedVersionRef.current = getSceneVersion(elements);
                if (!activeId && saved.id) {
                    drawingIdRef.current = saved.id;
                    window.history.replaceState(null, '', `/notes/${saved.id}`);
                }
            } else {
                const err = await res.json();
                console.error("Save Error:", err);
                const msg = getErrorMessage(err);

                showToast(`Save failed: ${msg}`, 'error', 'bottom');

                // Stop auto-save loop
                setIsAutoSavePaused(true);
            }
        } catch (e) {
            console.error(e);
            showToast("Network/Save Error", 'error', 'bottom');
            setIsAutoSavePaused(true);
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);

            // If another save was requested while we were saving, run it now
            if (pendingSaveRef.current) {
                // Ensure we use the latest elements/appState if possible?
                // The args passed to executeSave are stale here?
                // Yes. But if we re-call executeSave we need fresh args.
                // How to get fresh args?
                // We can't easily. 
                // BUT, if we just trigger the next save, we should use the drawingData?
                // Or better, ExcalidrawAPI?
                // If we are in `executeSave`, we don't have access to API directly unless we stored it in state.
                if (excalidrawAPI) {
                    executeSave(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState());
                }
            }
        }
    };

    // Auto-save debouncer
    const handleChange = useCallback((elements: any, appState: any) => {
        if (isAutoSavePaused) return; // Stop loop

        const version = getSceneVersion(elements);
        if (version === lastSavedVersionRef.current) return;

        setHasUnsavedChanges(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            // We need to pass the LATEST state to saveData
            // But we can't easily access 'drawingData' state inside this stale closure if we don't depend on it.
            // Best to call a ref-based saver or pass everything explicitly?
            // Actually, for CREATE (POST), we need to handle the transition from ID=undefined to ID=set.
            // If save happens, drawingData updates.
            // Let's defer functionality slightly: 
            // We'll call a ref-based saver or pass everything explicitly.
            executeSave(elements, appState);
        }, 2000);
    }, [isAutoSavePaused]);

    const handleManualSave = () => {
        if (excalidrawAPI) {
            executeSave(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState());
        }
    };

    return (
        <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-4">
                    <a href="/notes" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </a>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            titleRef.current = e.target.value;
                            setHasUnsavedChanges(true); // Trigger save eventually
                        }}
                        onBlur={() => handleManualSave()}
                        className="bg-transparent text-gray-900 dark:text-white font-semibold text-lg focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-purple-500 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-4">
                    {isAutoSavePaused && (
                        <button
                            onClick={handleManualSave}
                            className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors animate-pulse"
                        >
                            Retry Save
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : hasUnsavedChanges ? (
                            <>
                                <CloudOff className="w-3 h-3" />
                                <span>Unsaved changes</span>
                            </>
                        ) : (
                            <>
                                <Cloud className="w-3 h-3" />
                                <span>Saved</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 w-full h-full relative overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : (
                    <Excalidraw
                        initialData={drawingData ? {
                            elements: drawingData.elements,
                            appState: { ...drawingData.appState, viewBackgroundColor: "#ffffff" },
                            scrollToContent: true,
                            libraryItems: initialLibraryItems as any
                        } : {
                            libraryItems: initialLibraryItems as any
                        }}
                        onChange={(elements, appState) => handleChange(elements, appState)}
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                        UIOptions={{
                            tools: { image: false },
                            canvasActions: {
                                loadScene: false,
                                saveToActiveFile: false,
                                toggleTheme: true,
                                saveAsImage: true,
                                export: { saveFileToDisk: true }
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
                            <MainMenu.DefaultItems.ClearCanvas />
                            <MainMenu.DefaultItems.SaveAsImage />
                            <MainMenu.DefaultItems.Export />
                            <MainMenu.DefaultItems.ChangeCanvasBackground />
                        </MainMenu>
                    </Excalidraw>
                )}
            </div>
        </div>
    );
};
