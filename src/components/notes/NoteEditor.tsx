import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, WelcomeScreen, MainMenu, getSceneVersion } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { ArrowLeft, Save, Loader2, Cloud, CloudOff, Lock, Unlock } from 'lucide-react';
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
    const [isAutoSavePaused, setIsAutoSavePaused] = useState(false);

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false); // Default false, set to true if guest or not owner

    const titleRef = useRef(title);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedVersionRef = useRef(0);
    const drawingIdRef = useRef(noteId);

    useEffect(() => { if (drawingData?.id) drawingIdRef.current = drawingData.id; }, [drawingData?.id]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        setIsAuthenticated(!!token);
        if (!token) {
            setIsReadOnly(true); // Guests are always Read Only
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
                // Manually handle fetch to avoid auto-redirect from fetchWithAuth if 401
                const token = localStorage.getItem('access_token');
                const headers: any = {};
                if (token) headers['Authorization'] = `Token ${token}`;

                const url = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/chat/user-drawings/${noteId}/`;
                const res = await fetch(url, { headers });

                if (res.ok) {
                    const data = await res.json();

                    const elements = typeof data.elements === 'string' ? JSON.parse(data.elements) : data.elements || [];
                    const appState = typeof data.app_state === 'string' ? JSON.parse(data.app_state) : data.app_state || {};
                    if (appState.collaborators) delete appState.collaborators;

                    const loadedTitle = data.title || appState.name || "Untitled Note";

                    setTitle(loadedTitle);
                    titleRef.current = loadedTitle;
                    setDrawingData({
                        elements,
                        appState,
                        is_public: data.is_public,
                        id: data.id,
                        owner: data.owner // Assuming backend returns owner ID?
                    });

                    lastSavedVersionRef.current = getSceneVersion(elements || []);
                    if (data.id) drawingIdRef.current = data.id;

                    // Determine ReadOnly if logged in but not owner
                    // Since we don't have current User ID easily here, we assume Edit unless 403 on Save.
                    // Or if backend provides `can_edit` flag?
                    // For now, only enforce ReadOnly strictly for guests.
                    if (!token) setIsReadOnly(true);

                } else {
                    if (res.status === 401 || res.status === 403) {
                        // Private note and not auth? Or Public but restricted?
                        // If 403, it might mean "Private".
                        console.error("Access Denied");
                        showToast("You don't have permission to view this note.", 'error');
                        setIsReadOnly(true);
                    } else if (res.status === 404) {
                        showToast("Note not found", 'error');
                    }
                }
            } catch (e) {
                console.error(e);
                showToast("Failed to load note", 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchNote();
    }, [noteId]);

    const getErrorMessage = (err: any) => {
        if (typeof err === 'string') return err;
        if (err.non_field_errors) return err.non_field_errors.join(', ');
        if (err.detail) return err.detail;
        return Object.values(err).flat().join(', ');
    };

    const isSavingRef = useRef(false);
    const pendingSaveRef = useRef(false);

    const executeSave = async (elements: any, appState: any) => {
        if (isReadOnly || isSavingRef.current) return;

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

            const activeId = drawingIdRef.current;
            if (activeId) {
                url = `${url}${activeId}/`;
                method = 'PUT';
            }

            // Using fetchWithAuth here is fine as we expect to be logged in for SAVING
            const res = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const saved = await res.json();
                setDrawingData(prev => ({ ...prev, ...saved }));
                setHasUnsavedChanges(false);
                setIsAutoSavePaused(false);
                lastSavedVersionRef.current = getSceneVersion(elements);
                if (!activeId && saved.id) {
                    drawingIdRef.current = saved.id;
                    window.history.replaceState(null, '', `/notes/${saved.id}`);
                }
            } else {
                if (res.status === 403) {
                    setIsReadOnly(true); // Flip to ReadOnly if permission denied
                    showToast("Read Only: You cannot edit this note.", 'error');
                } else {
                    const err = await res.json();
                    showToast(`Save failed: ${getErrorMessage(err)}`, 'error');
                }
                setIsAutoSavePaused(true);
            }
        } catch (e) {
            console.error(e);
            setIsAutoSavePaused(true);
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
            if (pendingSaveRef.current && !isReadOnly && excalidrawAPI) {
                executeSave(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState());
            }
        }
    };

    const handleChange = useCallback((elements: any, appState: any) => {
        if (isReadOnly || isAutoSavePaused) return;
        const version = getSceneVersion(elements);
        if (version === lastSavedVersionRef.current) return;

        setHasUnsavedChanges(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            executeSave(elements, appState);
        }, 2000);
    }, [isAutoSavePaused, isReadOnly]);

    const handleManualSave = () => {
        if (!isReadOnly && excalidrawAPI) {
            executeSave(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState());
        }
    };

    return (
        <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-gray-50 dark:bg-gray-900 z-10 transition-colors">
                <div className="flex items-center gap-4">
                    <a href={isAuthenticated ? "/notes#private" : "/notes#public"} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </a>
                    <input
                        type="text"
                        value={title}
                        disabled={isReadOnly}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            titleRef.current = e.target.value;
                            if (!isReadOnly) setHasUnsavedChanges(true);
                        }}
                        onBlur={() => handleManualSave()}
                        className={`bg-transparent text-gray-900 dark:text-white font-semibold text-lg focus:outline-none border-b border-transparent transition-colors ${isReadOnly ? 'opacity-80 cursor-default' : 'hover:border-gray-300 focus:border-purple-500'}`}
                    />
                    {isReadOnly && (
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Read Only
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {!isReadOnly && (
                        <>
                            {isAutoSavePaused && (
                                <button onClick={handleManualSave} className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full animate-pulse">
                                    Retry Save
                                </button>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {isSaving ? (
                                    <><Loader2 className="w-3 h-3 animate-spin" /><span>Saving...</span></>
                                ) : hasUnsavedChanges ? (
                                    <><CloudOff className="w-3 h-3" /><span>Unsaved</span></>
                                ) : (
                                    <><Cloud className="w-3 h-3" /><span>Saved</span></>
                                )}
                            </div>
                        </>
                    )}
                    {!isAuthenticated && (
                        <a href={`/login?next=/notes/${noteId || ''}`} className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700">
                            Log In to Edit
                        </a>
                    )}
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
                        viewModeEnabled={isReadOnly}
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
                        {!noteId && !isReadOnly && (
                            <WelcomeScreen>
                                <WelcomeScreen.Hints.MenuHint />
                                <WelcomeScreen.Hints.ToolbarHint />
                                <WelcomeScreen.Center>
                                    <WelcomeScreen.Center.Heading>Sketch Your Ideas</WelcomeScreen.Center.Heading>
                                </WelcomeScreen.Center>
                            </WelcomeScreen>
                        )}
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
