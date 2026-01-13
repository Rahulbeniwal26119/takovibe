import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, WelcomeScreen, MainMenu, getSceneVersion, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { ArrowLeft, Save, Loader2, Cloud, CloudOff, Lock, Unlock, Wand2, X, Play, Code, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
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
    const [isPublic, setIsPublic] = useState(false);

    // Mermaid Modal State
    // Mermaid Modal State
    const [isMermaidModalOpen, setIsMermaidModalOpen] = useState(false);
    const [mermaidCode, setMermaidCode] = useState("graph TD\n    A[Start] --> B{Is it working?}\n    B -->|Yes| C[Great!]\n    B -->|No| D[Debug]");
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletingNote, setIsDeletingNote] = useState(false);

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

                const url = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${noteId}/`;
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
                        owner: data.owner
                    });

                    setIsPublic(data.is_public);

                    lastSavedVersionRef.current = getSceneVersion(elements || []);
                    if (data.id) drawingIdRef.current = data.id;

                    // Determine ReadOnly if logged in but not owner
                    if (!token) setIsReadOnly(true);

                } else {
                    if (res.status === 401 || res.status === 403) {
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
                is_public: isPublic
            };

            let url = `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/`;
            let method = 'POST';

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
                // success
                setHasUnsavedChanges(false);
                setIsAutoSavePaused(false);
                lastSavedVersionRef.current = getSceneVersion(elements);

                // Only update ID if this was a new create
                if (!activeId && saved.id) {
                    drawingIdRef.current = saved.id;
                    window.history.replaceState(null, '', `/notes/${saved.id}`);
                    // Update internal ID tracking without blowing up the whole Excalidraw state
                    setDrawingData(prev => prev ? { ...prev, id: saved.id } : null);
                }
            } else {
                if (res.status === 403) {
                    setIsReadOnly(true);
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
    }, [isAutoSavePaused, isReadOnly, isPublic]);

    const handleManualSave = () => {
        if (!isReadOnly && excalidrawAPI) {
            executeSave(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState());
        }
    };

    const togglePublic = async () => {
        if (!noteId) {
            const newState = !isPublic;
            setIsPublic(newState);
            if (excalidrawAPI) {
                setHasUnsavedChanges(true);
            }
            return;
        }

        try {
            const response = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${noteId}/toggle_public/`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setIsPublic(data.is_public);
                showToast(data.is_public ? "Note is now Public" : "Note is now Private", 'success');
                setDrawingData((prev: any) => prev ? { ...prev, is_public: data.is_public } : null);
            } else {
                showToast("Failed to toggle public status", 'error');
            }
        } catch (error) {
            console.error("Failed to toggle public status:", error);
            showToast("Failed to toggle public status", 'error');
        }
    };
    const handleMermaidInsert = async () => {
        try {
            const { elements } = await parseMermaidToExcalidraw(mermaidCode);
            if (excalidrawAPI) {
                const currentAppState = excalidrawAPI.getAppState();
                const bgColor = currentAppState.viewBackgroundColor || '#ffffff';
                const isDarkCanvas = bgColor.toLowerCase() === '#000000' || bgColor.toLowerCase() === '#121212' || (bgColor.match(/^#([0-9a-f]{3}){1,2}$/i) && parseInt(bgColor.replace('#', ''), 16) < 0x888888);
                const contrastColor = isDarkCanvas ? '#ffffff' : '#000000';
                const groupId = Date.now().toString();

                // 1. Text Wrapper Helper
                const wrapperText = (text: string, maxChars: number) => {
                    if (!text) return "";
                    const words = String(text).split(' ');
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

                // 2. Normalize and Split Elements (Shape + Text)
                // This logic includes a ROBUST fallback for missing arrows.
                const normalized = elements.flatMap((el: any) => {
                    const id = el.id || Math.random().toString(36).substr(2, 9);
                    const existingGroups = el.groupIds || [];
                    const baseEl = {
                        ...el,
                        id,
                        groupIds: [...existingGroups, groupId],
                        strokeColor: contrastColor,
                        opacity: 100
                    };

                    // Handle Arrows
                    if (el.type === "arrow") {
                        let startX = el.start?.x;
                        let startY = el.start?.y;
                        let endX = el.end?.x;
                        let endY = el.end?.y;

                        // Fallback: If parser failed to calculate start/end, try to derive from bindings
                        if ((!startX || !endX) && el.startBinding && el.endBinding) {
                            const startEl = elements.find((e: any) => e.id === el.startBinding.elementId);
                            const endEl = elements.find((e: any) => e.id === el.endBinding.elementId);

                            if (startEl && endEl) {
                                startX = startEl.x + (startEl.width / 2);
                                startY = startEl.y + (startEl.height / 2);
                                endX = endEl.x + (endEl.width / 2);
                                endY = endEl.y + (endEl.height / 2);
                            }
                        }

                        // Use derived coordinates if we have them
                        if (startX !== undefined && endX !== undefined) {
                            return [{
                                ...baseEl,
                                x: startX,
                                y: startY,
                                points: [[0, 0], [endX - startX, endY - startY]]
                            }];
                        }
                    }

                    // Handle Shapes with Labels (Split them!)
                    if ((el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") && typeof el.label === 'string') {
                        const textId = Math.random().toString(36).substr(2, 9);
                        const fontSize = 16;
                        // Center text: simple approximation
                        const textY = el.y + (el.height / 2) - 10;

                        const textEl = {
                            type: "text",
                            id: textId,
                            x: el.x,
                            y: textY,
                            width: el.width,
                            height: el.height,
                            text: wrapperText(el.label, 20),
                            fontSize: fontSize,
                            fontFamily: 1, // Hand-drawn
                            textAlign: "center",
                            verticalAlign: "middle",
                            containerId: id,
                            strokeColor: contrastColor,
                            groupIds: [...existingGroups, groupId]
                        };

                        const shapeEl = {
                            ...baseEl,
                            backgroundColor: 'transparent',
                            boundElements: [{ id: textId, type: "text" }],
                            label: undefined, // Remove label to avoid confusion
                            fillStyle: 'hachure'
                        };
                        return [shapeEl, textEl];
                    }

                    // Handle standalone Text or other shapes
                    return [{
                        ...baseEl,
                        backgroundColor: 'transparent',
                        fontFamily: el.type === 'text' ? 1 : undefined
                    }];
                }).sort((a, b) => (a.type === 'arrow' ? 1 : -1));

                // 3. Calculate Offsets to Center the Diagram
                const st = currentAppState;
                const zoom = st.zoom.value;
                const cx = -st.scrollX + (st.width / 2) / zoom;
                const cy = -st.scrollY + (st.height / 2) / zoom;

                const xs = normalized.map(el => el.x || 0);
                const ys = normalized.map(el => el.y || 0);
                const minX = Math.min(...xs);
                const minY = Math.min(...ys);
                const width = Math.max(...normalized.map(el => (el.x || 0) + (el.width || 0))) - minX || 100;
                const height = Math.max(...normalized.map(el => (el.y || 0) + (el.height || 0))) - minY || 100;

                const offsetX = (cx - width / 2) - minX;
                const offsetY = (cy - height / 2) - minY;

                // 4. Convert and Offset
                const newElements = convertToExcalidrawElements(normalized.map((el: any) => ({
                    ...el,
                    x: (el.x || 0) + offsetX,
                    y: (el.y || 0) + offsetY
                })));

                excalidrawAPI.updateScene({
                    elements: [
                        ...excalidrawAPI.getSceneElements(),
                        ...newElements
                    ],
                    commitToHistory: true
                });

                // Auto-scroll
                setTimeout(() => {
                    excalidrawAPI.scrollToContent(newElements, {
                        fitToContent: true,
                        animate: true
                    });
                }, 100);

                setHasUnsavedChanges(true);
                setIsMermaidModalOpen(false);
                showToast("Diagram generated successfully", "success");
            }
        } catch (e) {
            console.error("Mermaid Error:", e);
            showToast("Failed to generate diagram. Check syntax.", "error");
        }
    };

    const handleDeleteNote = async () => {
        if (!noteId) return;
        setIsDeletingNote(true);
        try {
            const res = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${noteId}/`, {
                method: 'DELETE',
            });

            if (res.ok) {
                showToast("Note deleted successfully", 'success');
                window.location.href = '/notes';
            } else {
                showToast("Failed to delete note", 'error');
                setIsDeletingNote(false);
            }
        } catch (e) {
            console.error("Error deleting note:", e);
            showToast("Error deleting note", 'error');
            setIsDeletingNote(false);
        }
    };


    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingAI(true);
        try {
            const res = await fetch('/api/ai/diagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });

            if (!res.ok) throw new Error("Failed to generate");

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let result = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    result += chunk;
                    // Live update the code block
                    setMermaidCode(result);
                }
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to generate diagram", "error");
        } finally {
            setIsGeneratingAI(false);
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
                    <button
                        onClick={() => {
                            if (!isAuthenticated) {
                                window.location.href = `/login?next=${window.location.pathname}`;
                                return;
                            }
                            if (isReadOnly) {
                                showToast("You cannot edit this note.", "error");
                                return;
                            }
                            setIsMermaidModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                        title="Text to Diagram"
                    >
                        <Wand2 className="w-4 h-4" />
                        <span className="hidden sm:inline">AI Diagram</span>
                    </button>
                    {!isReadOnly && (
                        <>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="p-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                title="Delete Note"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={togglePublic}
                                className={`p-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${isPublic ? 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                                title={isPublic ? "Make Private" : "Make Public"}
                            >
                                {isPublic ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                <span className="hidden sm:inline">{isPublic ? "Public" : "Private"}</span>
                            </button>
                        </>
                    )}
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

            {/* Mermaid Input Modal */}
            {isMermaidModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    Text to Diagram
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Turn Mermaid syntax into editable diagrams instantly.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsMermaidModalOpen(false)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">

                            {/* AI Section */}
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                <label className="block text-sm font-bold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    Describe your diagram
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
                                        placeholder="e.g. 'Login flow with 2FA' or 'Sequence diagram for payment processing'"
                                        className="flex-1 px-4 py-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleAIGenerate}
                                        disabled={isGeneratingAI || !aiPrompt.trim()}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                        <span className="hidden sm:inline">Magic</span>
                                    </button>
                                </div>
                            </div>

                            {/* Manual Code Section */}
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                    <Code className="w-3 h-3" /> Mermaid Code
                                </label>
                                <textarea
                                    value={mermaidCode}
                                    onChange={(e) => setMermaidCode(e.target.value)}
                                    placeholder="Enter Mermaid syntax here..."
                                    className="flex-1 min-h-[200px] p-4 font-mono text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-gray-900 dark:text-gray-100"
                                />

                                <div className="flex items-center justify-between text-xs text-gray-400">
                                    <p>Supports Flowcharts, Sequence Diagrams, Class Diagrams, etc.</p>
                                    <a href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer" className="hover:text-purple-500 underline">
                                        Mermaid Syntax Guide
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                            <button
                                onClick={() => setIsMermaidModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMermaidInsert}
                                className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Generate Diagram
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in text-left">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl max-w-sm w-full border border-red-200 dark:border-red-900/30 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Delete Note?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                    This action cannot be undone. This note will be permanently removed.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteNote}
                                    disabled={isDeletingNote}
                                    className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                                >
                                    {isDeletingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
