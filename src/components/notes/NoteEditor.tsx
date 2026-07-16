import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, WelcomeScreen, MainMenu, getSceneVersion, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { ArrowLeft, Loader2, Cloud, CloudOff, Lock, Unlock, Wand2, X, Play, Code, Sparkles, Trash2, AlertTriangle, ListTodo, Image as ImageIcon, PanelRightOpen, Share2, Shapes, Maximize2, Minimize2, Command } from 'lucide-react';
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { fetchWithAuth } from '../../utils/api';
import { showToast } from '../../utils/toast';
import { createTask } from '../../lib/taskApi';
import drwnioLib from '../../data/libraries/drwnio.json';
import systemDesignLib from '../../data/libraries/system-design.json';
import { NoteEditorSidebar } from './NoteEditorSidebar';

const GlobalStyles = () => (
    <style>{`
        @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-15deg); }
            100% { transform: translateX(200%) skewX(-15deg); }
        }
    `}</style>
);

const initialLibraryItems = [
    ...(drwnioLib.library || []),
    ...(systemDesignLib.library || [])
];

interface NoteEditorProps {
    noteId?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ noteId }) => {
    return (
        <>
            <GlobalStyles />
            <NoteEditorInner noteId={noteId} />
        </>
    );
};

const NoteEditorInner: React.FC<NoteEditorProps> = ({ noteId }) => {
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
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDueAt, setTaskDueAt] = useState("");
    const [isImmersive, setIsImmersive] = useState(false);
    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        return localStorage.getItem('is_sidebar_open') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('is_sidebar_open', isSidebarOpen.toString());
    }, [isSidebarOpen]);

    const [sidebarWidth, setSidebarWidth] = useState(450);
    const [isResizing, setIsResizing] = useState(false);
    const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
    const [selectionCoords, setSelectionCoords] = useState<{ x: number, y: number } | null>(null);
    const [pendingKumiMessage, setPendingKumiMessage] = useState<string | null>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false); // Default false, set to true if guest or not owner

    const titleRef = useRef(title);
    const workspaceRef = useRef<HTMLDivElement | null>(null);
    const sidebarBeforeImmersiveRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedVersionRef = useRef(0);
    const drawingIdRef = useRef(noteId);

    // Resize Logic
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 300 && newWidth < 800) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    const setImmersiveMode = useCallback(async (enabled: boolean) => {
        setIsCommandMenuOpen(false);
        setIsImmersive(enabled);

        if (enabled) {
            sidebarBeforeImmersiveRef.current = isSidebarOpen;
            setIsSidebarOpen(false);
            try {
                if (!document.fullscreenElement && workspaceRef.current?.requestFullscreen) {
                    await workspaceRef.current.requestFullscreen();
                }
            } catch {
                // The distraction-free layout still works when browser fullscreen is blocked.
            }
            return;
        }

        setIsSidebarOpen(sidebarBeforeImmersiveRef.current);
        try {
            if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
        } catch {
            // Fullscreen state can already be changing through the browser's Escape handling.
        }
    }, [isSidebarOpen]);

    useEffect(() => {
        const onFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsImmersive(false);
                setIsSidebarOpen(sidebarBeforeImmersiveRef.current);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsCommandMenuOpen((open) => !open);
                return;
            }

            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                void setImmersiveMode(!isImmersive);
                return;
            }

            if (event.key === 'Escape' && !isTyping) {
                if (isCommandMenuOpen) setIsCommandMenuOpen(false);
                else if (isImmersive && !document.fullscreenElement) void setImmersiveMode(false);
            }
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isCommandMenuOpen, isImmersive, setImmersiveMode]);

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

                    const filesObj = typeof data.files === 'string' ? JSON.parse(data.files) : data.files || {};

                    const loadedTitle = data.title || appState.name || "Untitled Note";

                    setTitle(loadedTitle);
                    titleRef.current = loadedTitle;
                    setDrawingData({
                        elements,
                        appState,
                        files: filesObj,
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

    // When Excalidraw API becomes available and we have saved files (stored as IK URLs),
    // re-hydrate them as base64 so Excalidraw can actually render the images.
    useEffect(() => {
        if (!excalidrawAPI || !drawingData?.files) return;
        const savedFiles: Record<string, any> = drawingData.files;
        const httpFiles = Object.entries(savedFiles).filter(
            ([, f]) => f.dataURL && f.dataURL.startsWith('http')
        );
        if (httpFiles.length === 0) return;

        httpFiles.forEach(async ([fileId, fileData]) => {
            try {
                const res = await fetch(fileData.dataURL);
                const blob = await res.blob();
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                excalidrawAPI.addFiles([{ ...fileData, id: fileId, dataURL: base64 as any }]);
                // Also keep the IK URL in ref so future saves don't re-store base64
                ikUrlsRef.current[fileId] = fileData.dataURL;
            } catch (err) {
                console.error(`Failed to hydrate file ${fileId}:`, err);
            }
        });
    }, [excalidrawAPI, drawingData?.id]);

    const getErrorMessage = (err: any) => {
        if (typeof err === 'string') return err;
        if (err.non_field_errors) return err.non_field_errors.join(', ');
        if (err.detail) return err.detail;
        return Object.values(err).flat().join(', ');
    };

    const isSavingRef = useRef(false);
    const pendingSaveRef = useRef(false);
    // Maps excalidrawFileId -> ImageKit URL so we persist the CDN URL (not base64) in the DB
    const ikUrlsRef = useRef<Record<string, string>>({});

    const executeSave = async (elements: any, appState: any, files: any) => {
        if (isReadOnly || isSavingRef.current) return;

        // Skip if the scene hasn't changed since the last save
        const currentVersion = getSceneVersion(elements);
        if (drawingIdRef.current && currentVersion === lastSavedVersionRef.current && !hasUnsavedChanges) {
            setHasUnsavedChanges(false);
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        pendingSaveRef.current = false;

        try {
            const updatedAppState = { ...appState, name: titleRef.current };

            // Build the backend files payload:
            // 1. Always include everything from ikUrlsRef (files we uploaded this session)
            // 2. Supplement with any http URL files Excalidraw still has (loaded from DB)
            // This way Excalidraw clearing 'saved' files from memory doesn't lose URLs.
            const excFiles: Record<string, any> = files || {};
            const sanitizedFiles: Record<string, any> = {};

            // Primary source: known IK URLs
            for (const [id, ikUrl] of Object.entries(ikUrlsRef.current)) {
                sanitizedFiles[id] = { ...(excFiles[id] || {}), dataURL: ikUrl };
            }

            // Secondary: any http file Excalidraw still has that we missed
            for (const [id, fileData] of Object.entries<any>(excFiles)) {
                if (!sanitizedFiles[id] && fileData.dataURL && fileData.dataURL.startsWith('http')) {
                    sanitizedFiles[id] = fileData;
                }
            }

            const payload = {
                title: titleRef.current,
                elements: [...elements],
                app_state: updatedAppState,
                files: sanitizedFiles,
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
                executeSave(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState(), excalidrawAPI.getFiles());
            }
        }
    };

    const uploadingFilesRef = useRef(new Set<string>());

    const uploadImageToImageKit = async (fileData: any, fileId: string) => {
        try {
            const formData = new FormData();
            const res = await fetch(fileData.dataURL);
            const blob = await res.blob();
            formData.append("file", blob, `${fileId}.png`);
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (storedUser.email) formData.append("email", storedUser.email);

            const token = localStorage.getItem('access_token');
            const authPrefix = token ? 'Token' : 'JWT';

            const uploadRes = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Authorization': token ? `${authPrefix} ${token}` : '' },
                body: formData
            });

            if (uploadRes.ok) {
                const data = await uploadRes.json();
                return data.url;
            }
        } catch (err) {
            console.error("ImageKit Upload Error:", err);
        }
        return null;
    };

    const handleChange = useCallback((elements: any, appState: any, files: any) => {
        // Background ImageKit Uploader (for images inserted via Excalidraw's native path)
        if (files) {
            for (const [fileId, fileData] of Object.entries<any>(files)) {
                // Only process base64 images not yet queued for upload
                if (fileData.dataURL && fileData.dataURL.startsWith('data:image/') && fileData.dataURL.length > 1000) {
                    if (!uploadingFilesRef.current.has(fileId) && !ikUrlsRef.current[fileId]) {
                        uploadingFilesRef.current.add(fileId);
                        uploadImageToImageKit(fileData, fileId).then(url => {
                            if (url) {
                                // Store the IK URL so sanitizeFiles includes it in the next save
                                ikUrlsRef.current[fileId] = url;
                            }
                        });
                    }
                }
            }
        }
        // Handle selection for "Ask Kumi" - only update if actually changed
        const selectedIds = Object.keys(appState.selectedElementIds || {});
        if (selectedIds.length > 0) {
            const selectedElements = elements.filter((el: any) => appState.selectedElementIds[el.id]);
            const textElements = selectedElements.filter((el: any) => el.type === 'text' || (el.text && el.text.trim() !== ''));

            if (textElements.length > 0) {
                const combinedText = textElements.map((el: any) => el.text).join(' ');

                // Stick with the last known mouse position for better reliability
                const x = lastMousePos.current.x;
                const y = lastMousePos.current.y - 40; // Float slightly above cursor

                setSelectionMessage(prev => prev !== combinedText ? combinedText : prev);
                setSelectionCoords(prev => (prev?.x !== x || prev?.y !== y) ? { x, y } : prev);
            } else {
                setSelectionMessage(prev => prev !== null ? null : prev);
                setSelectionCoords(prev => prev !== null ? null : prev);
            }
        } else {
            setSelectionMessage(prev => prev !== null ? null : prev);
            setSelectionCoords(prev => prev !== null ? null : prev);
        }

        if (isReadOnly || isAutoSavePaused) return;
        const version = getSceneVersion(elements);
        if (version === lastSavedVersionRef.current) return;

        setHasUnsavedChanges(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            // Use live getFiles() so any images added via addFiles() after onChange
            // are included — never use the stale snapshot from the closure.
            if (excalidrawAPI) {
                executeSave(
                    excalidrawAPI.getSceneElements(),
                    excalidrawAPI.getAppState(),
                    excalidrawAPI.getFiles()
                );
            }
        }, 3000);
    }, [isAutoSavePaused, isReadOnly, isPublic, excalidrawAPI]);

    const handleManualSave = () => {
        if (!isReadOnly && excalidrawAPI) {
            executeSave(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState(), excalidrawAPI.getFiles());
        }
    };

    const waitForActiveSave = async () => {
        for (let attempt = 0; attempt < 30 && isSavingRef.current; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    };

    const toLocalDateTimeInputValue = (date: Date) => {
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const getDefaultTaskDueAt = () => {
        const now = new Date();
        const due = new Date();
        due.setHours(18, 0, 0, 0);
        if (due <= now) due.setTime(now.getTime() + 60 * 60 * 1000);
        return toLocalDateTimeInputValue(due);
    };

    const ensureSavedNoteForTask = async () => {
        await waitForActiveSave();

        if (!drawingIdRef.current || hasUnsavedChanges) {
            if (isReadOnly) return drawingIdRef.current;
            if (!excalidrawAPI) throw new Error("Sketch is still loading.");
            await executeSave(
                excalidrawAPI.getSceneElements(),
                excalidrawAPI.getAppState(),
                excalidrawAPI.getFiles()
            );
            await waitForActiveSave();
        }

        return drawingIdRef.current;
    };

    const openTaskComposer = () => {
        if (!isAuthenticated) {
            window.location.href = `/login?next=${window.location.pathname}`;
            return;
        }

        const noteTitle = titleRef.current.trim() || "Untitled Note";
        setTaskTitle(`Review ${noteTitle}`);
        setTaskDueAt(getDefaultTaskDueAt());
        setIsTaskModalOpen(true);
    };

    const handleCreateAttachedTask = async (event: React.FormEvent) => {
        event.preventDefault();
        const trimmedTitle = taskTitle.trim();
        if (!trimmedTitle || !taskDueAt) return;

        setIsCreatingTask(true);
        try {
            const activeDrawingId = await ensureSavedNoteForTask();
            if (!activeDrawingId) {
                throw new Error("Save this sketch before creating a task.");
            }

            const dueAt = new Date(taskDueAt).toISOString();
            await createTask({
                title: trimmedTitle,
                status: 'todo',
                due_at: dueAt,
                reminder_at: null,
                drawing_id: activeDrawingId,
                target_type: 'complete',
            });
            setIsTaskModalOpen(false);
            showToast("Sketch note task created", "success");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Task could not be created.", "error");
        } finally {
            setIsCreatingTask(false);
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

    const handleImageUpload = async (file: File) => {
        if (!file || !excalidrawAPI) return;

        try {
            // 1. Read file as base64 so Excalidraw can render it immediately
            const base64DataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const fileId = Math.random().toString(36).substr(2, 9);

            // 2. Upload to ImageKit in parallel (we have the base64 already, so Excalidraw won't freeze)
            const formData = new FormData();
            formData.append("file", file);
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (storedUser.email) formData.append("email", storedUser.email);

            const token = localStorage.getItem('access_token');
            const uploadRes = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Authorization': token ? `Token ${token}` : '' },
                body: formData
            });

            if (uploadRes.ok) {
                const data = await uploadRes.json();

                // 3. Register the IK URL for this fileId so sanitizeFiles picks it up
                ikUrlsRef.current[fileId] = data.url;

                // 4. addFiles with BASE64 — Excalidraw requires this to actually render the image
                excalidrawAPI.addFiles([{
                    id: fileId,
                    dataURL: base64DataURL as any,
                    mimeType: file.type,
                    created: Date.now(),
                    lastRetrieved: Date.now()
                }]);

                const appState = excalidrawAPI.getAppState();
                const cx = -appState.scrollX + (appState.width / 2) / appState.zoom.value;
                const cy = -appState.scrollY + (appState.height / 2) / appState.zoom.value;

                const imgElement = {
                    type: "image",
                    version: 1,
                    versionNonce: Math.floor(Math.random() * 1000000000),
                    isDeleted: false,
                    id: "img_" + fileId,
                    fillStyle: "hachure",
                    strokeWidth: 1,
                    strokeStyle: "solid",
                    roughness: 1,
                    opacity: 100,
                    angle: 0,
                    x: cx - 150,
                    y: cy - 150,
                    strokeColor: "transparent",
                    backgroundColor: "transparent",
                    width: 300,
                    height: 300,
                    seed: Math.floor(Math.random() * 1000000000),
                    groupIds: [],
                    strokeSharpness: "round",
                    boundElements: [],
                    updated: Date.now(),
                    link: null,
                    locked: false,
                    fileId: fileId,
                    status: "saved"
                };

                excalidrawAPI.updateScene({
                    elements: [...excalidrawAPI.getSceneElements(), imgElement],
                    commitToHistory: true
                });
                setHasUnsavedChanges(true);
            } else {
                showToast("Failed to upload image to server", "error");
            }
        } catch (err) {
            console.error("Custom Image Insert Failed:", err);
            showToast("Failed to upload image", "error");
        }
    };

    return (
        <div ref={workspaceRef} className="flex h-screen flex-col bg-[#efede9] text-stone-950 dark:bg-neutral-950 dark:text-neutral-50">
            {/* SaaS workspace header */}
            {!isImmersive && <header className="relative z-20 flex h-16 shrink-0 items-center gap-2 border-b border-stone-200 bg-[#fbfaf8]/95 px-2.5 shadow-[0_1px_2px_rgba(28,25,23,0.03)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95 sm:px-4">
                <div className="flex min-w-0 items-center gap-2 border-r border-stone-200 pr-2.5 dark:border-neutral-800 sm:gap-3 sm:pr-4">
                    <a href={isAuthenticated ? "/notes#private" : "/notes#community"} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-orange-900 dark:hover:bg-orange-950/40 dark:hover:text-orange-300" aria-label="Back to notes">
                        <ArrowLeft className="h-4 w-4" />
                    </a>
                    <a href="/notes" className="hidden items-center gap-2.5 lg:flex">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm shadow-orange-600/20"><Shapes className="h-4 w-4" /></span>
                        <div className="leading-tight">
                            <div className="text-xs font-black tracking-[-0.02em]">Tako Notes</div>
                            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-stone-400">Canvas</div>
                        </div>
                    </a>
                </div>

                <div className="min-w-0 flex-1 px-1 sm:px-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <input
                            type="text"
                            value={title}
                            disabled={isReadOnly}
                            aria-label="Note title"
                            onChange={(e) => {
                                setTitle(e.target.value);
                                titleRef.current = e.target.value;
                                if (!isReadOnly) setHasUnsavedChanges(true);
                            }}
                            onBlur={() => handleManualSave()}
                            className={`min-w-0 w-full max-w-[420px] truncate border-b border-transparent bg-transparent text-sm font-black tracking-[-0.01em] text-stone-950 outline-none transition sm:text-[15px] dark:text-white ${isReadOnly ? 'cursor-default opacity-80' : 'hover:border-stone-300 focus:border-orange-500 dark:hover:border-neutral-700'}`}
                        />
                        {isReadOnly && (
                            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500 dark:bg-neutral-800 dark:text-neutral-400 sm:inline-flex">
                                <Lock className="h-3 w-3" /> Read only
                            </span>
                        )}
                    </div>
                    <div className="mt-0.5 hidden items-center gap-1.5 text-[10px] font-medium text-stone-400 sm:flex">
                        <span>My workspace</span><span>/</span><span>{isPublic ? 'Shared note' : 'Private note'}</span>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                    <div className="mr-1 hidden items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 md:flex">
                        {isSaving ? (
                            <><Loader2 className="h-3 w-3 animate-spin text-orange-500" /><span>Saving</span></>
                        ) : hasUnsavedChanges ? (
                            <><CloudOff className="h-3 w-3 text-amber-500" /><span>Unsaved</span></>
                        ) : (
                            <><Cloud className="h-3 w-3 text-emerald-500" /><span>Saved</span></>
                        )}
                    </div>

                    <button
                        onClick={() => setIsCommandMenuOpen(true)}
                        className="hidden h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 text-[11px] font-bold text-stone-500 shadow-sm transition hover:border-stone-300 hover:text-stone-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white xl:inline-flex"
                        title="Open quick actions"
                    >
                        <Command className="h-3.5 w-3.5" />
                        <span>Actions</span>
                        <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[9px] text-stone-400 dark:border-neutral-700 dark:bg-neutral-800">⌘K</kbd>
                    </button>

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
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-stone-500 transition hover:bg-stone-100 hover:text-orange-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-orange-300 min-[1100px]:px-3"
                        title="Text to Diagram"
                    >
                        <Wand2 className="h-4 w-4" />
                        <span className="hidden min-[1100px]:inline">AI diagram</span>
                    </button>

                    <button
                        onClick={openTaskComposer}
                        disabled={isCreatingTask || isLoading}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-stone-500 transition hover:bg-stone-100 hover:text-orange-700 disabled:pointer-events-none disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-orange-300 min-[1100px]:px-3"
                        title="Create attached task"
                    >
                        {isCreatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListTodo className="h-4 w-4" />}
                        <span className="hidden min-[1100px]:inline">Task</span>
                    </button>

                    {!isReadOnly && (
                        <>
                            {/* Custom File Input for bypassing Excalidraw Image Tool */}
                            <input
                                type="file"
                                id="custom-image-upload-standalone"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        await handleImageUpload(file);
                                    }
                                    e.target.value = '';
                                }}
                            />

                            <button
                                onClick={() => document.getElementById('custom-image-upload-standalone')?.click()}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-stone-500 transition hover:bg-stone-100 hover:text-orange-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-orange-300 min-[1100px]:px-3"
                                title="Insert Custom Image"
                            >
                                <ImageIcon className="h-4 w-4" />
                                <span className="hidden min-[1100px]:inline">Image</span>
                            </button>

                            <button
                                onClick={() => {
                                    const becomingOpen = !isSidebarOpen;
                                    if (becomingOpen) {
                                        setSidebarWidth(Math.min(Math.max(window.innerWidth / 2, 380), 640));
                                    }
                                    setIsSidebarOpen(becomingOpen);
                                }}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition min-[1100px]:px-3 ${isSidebarOpen ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' : 'text-stone-500 hover:bg-stone-100 hover:text-orange-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-orange-300'}`}
                                title="Toggle Learning Tools"
                            >
                                <PanelRightOpen className="h-4 w-4" />
                                <span className="hidden min-[1100px]:inline">Tools</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => void setImmersiveMode(true)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-orange-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-orange-300"
                        title="Enter immersive mode (⌘⇧F)"
                        aria-label="Enter immersive mode"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </button>
                    {!isReadOnly && (
                        <>
                            {isAutoSavePaused && (
                                <button onClick={handleManualSave} className="animate-pulse rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                                    Retry Save
                                </button>
                            )}
                            {noteId && (
                                <button onClick={() => setIsDeleteModalOpen(true)} className="hidden h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-600 xl:inline-flex dark:hover:bg-red-950/40 dark:hover:text-red-400" title="Delete note"><Trash2 className="h-4 w-4" /></button>
                            )}
                            <span className="mx-0.5 hidden h-5 w-px bg-stone-200 sm:block dark:bg-neutral-800" />
                            <button
                                onClick={togglePublic}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold shadow-sm transition sm:px-3.5 ${isPublic ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200'}`}
                                title={isPublic ? 'Make private' : 'Share note'}
                            >
                                {isPublic ? <Unlock className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                                <span className="hidden xs:inline">{isPublic ? 'Public' : 'Share'}</span>
                            </button>
                        </>
                    )}
                    {!isAuthenticated && (
                        <a href={`/login?next=/notes/${noteId || ''}`} className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700">
                            Log in to edit
                        </a>
                    )}
                </div>
            </header>}

            {isImmersive && (
                <div className="pointer-events-none fixed bottom-4 left-1/2 z-[1000] -translate-x-1/2">
                    <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-stone-200/80 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl dark:border-neutral-700 dark:bg-neutral-900/90">
                        <div className="hidden items-center gap-1.5 px-2 text-[10px] font-bold text-stone-400 sm:flex">
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin text-orange-500" /> : <span className={`h-2 w-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500' : 'bg-emerald-500'}`} />}
                            {isSaving ? 'Saving' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                        </div>
                        <span className="hidden h-5 w-px bg-stone-200 sm:block dark:bg-neutral-700" />
                        <button
                            onClick={() => {
                                const becomingOpen = !isSidebarOpen;
                                if (becomingOpen) setSidebarWidth(Math.min(Math.max(window.innerWidth / 2, 380), 640));
                                setIsSidebarOpen(becomingOpen);
                            }}
                            className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${isSidebarOpen ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300' : 'text-stone-600 hover:bg-stone-100 hover:text-orange-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-orange-300'}`}
                            title="Toggle workspace tools"
                        >
                            <PanelRightOpen className="h-4 w-4" />
                            <span className="hidden sm:inline">Tools</span>
                        </button>
                        <button
                            onClick={() => setIsCommandMenuOpen(true)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-stone-600 transition hover:bg-stone-100 hover:text-orange-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-orange-300"
                            title="Open workspace actions"
                        >
                            <Command className="h-4 w-4" />
                            <span className="hidden sm:inline">Actions</span>
                        </button>
                        <span className="h-5 w-px bg-stone-200 dark:bg-neutral-700" />
                        <button
                            onClick={() => void setImmersiveMode(false)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-stone-900 px-3 text-xs font-bold text-white transition hover:bg-stone-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                            title="Exit immersive mode"
                        >
                            <Minimize2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Exit focus</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Editor */}
            <div className={`relative flex h-full w-full flex-1 overflow-hidden bg-[#efede9] dark:bg-neutral-950 ${isImmersive ? 'p-0' : 'p-1.5 sm:p-2'}`}>
                <div
                    className={`relative h-full flex-1 overflow-hidden bg-white dark:bg-neutral-950 ${isImmersive ? 'rounded-none border-0 shadow-none' : 'rounded-xl border border-stone-200 shadow-[0_2px_8px_rgba(28,25,23,0.05)] dark:border-neutral-800'}`}
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        lastMousePos.current = {
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top
                        };
                    }}
                >
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center bg-white dark:bg-neutral-950">
                            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                Loading note
                            </div>
                        </div>
                    ) : (
                        <Excalidraw
                            initialData={drawingData ? {
                                elements: drawingData.elements,
                                appState: { ...drawingData.appState, viewBackgroundColor: "#ffffff" },
                                files: drawingData.files,
                                scrollToContent: true,
                                libraryItems: initialLibraryItems as any
                            } : {
                                libraryItems: initialLibraryItems as any
                            }}
                            onChange={(elements, appState, files) => handleChange(elements, appState, files)}
                            excalidrawAPI={(api) => setExcalidrawAPI(api)}
                            theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                            viewModeEnabled={isReadOnly}
                            UIOptions={{
                                tools: { image: true },
                                canvasActions: {
                                    loadScene: false,
                                    saveToActiveFile: false,
                                    toggleTheme: true,
                                    saveAsImage: true,
                                    export: { saveFileToDisk: true }
                                }
                            }}
                            onPaste={(data, event) => {
                                // Intercept pasted image files
                                const items = event?.clipboardData?.items;
                                if (items && excalidrawAPI && !isReadOnly) {
                                    for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf('image/') !== -1) {
                                            const file = items[i].getAsFile();
                                            if (file) {
                                                handleImageUpload(file);
                                                return false;
                                            }
                                        }
                                    }
                                }
                                return true;
                            }}
                            generateIdForFile={async (file) => {
                                return Math.random().toString(36).substring(2) + Date.now().toString(36);
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

                    {/* Ask Kumi Floating Button */}
                    {selectionMessage && selectionCoords && (
                        <button
                            onClick={() => {
                                const message = `Explain this: "${selectionMessage}"`;
                                setPendingKumiMessage(message);
                                setSidebarWidth(window.innerWidth / 2);
                                setIsSidebarOpen(true);
                                // Fallback event for when it's already open
                                window.dispatchEvent(new CustomEvent('ask-kumi', {
                                    detail: { message }
                                }));
                                setSelectionMessage(null);
                            }}
                            style={{
                                left: `${selectionCoords.x}px`,
                                top: `${selectionCoords.y}px`
                            }}
                            className="fixed z-[999] flex items-center gap-2 whitespace-nowrap rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-2xl transition-all hover:bg-orange-700 active:scale-95 animate-in zoom-in-50 duration-200"
                        >
                            <Sparkles className="w-4 h-4" />
                            Analyze with AI
                        </button>
                    )}
                </div>
                {isSidebarOpen && (
                    <>
                        <div
                            onMouseDown={startResizing}
                            className={`ml-1.5 w-1 cursor-col-resize rounded-full bg-stone-300 transition-all hover:bg-orange-500/60 dark:bg-neutral-800 ${isResizing ? 'bg-orange-500/80' : ''}`}
                        />
                        <div
                            style={{ width: Math.min(sidebarWidth, window.innerWidth * 0.92) }}
                            className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_2px_8px_rgba(28,25,23,0.05)] transition-[width] duration-300 ease-out dark:border-neutral-800 dark:bg-neutral-950"
                        >
                            <NoteEditorSidebar
                                onClose={() => setIsSidebarOpen(false)}
                                initialChatMessage={pendingKumiMessage || undefined}
                                onMessageProcessed={() => setPendingKumiMessage(null)}
                                isAuthenticated={isAuthenticated}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Workspace command palette */}
            {isCommandMenuOpen && (
                <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-stone-950/30 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setIsCommandMenuOpen(false)}>
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Workspace actions">
                        <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3 dark:border-neutral-800">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"><Command className="h-4 w-4" /></span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm font-black text-stone-900 dark:text-white">Workspace actions</h2>
                                <p className="text-[11px] text-stone-400">Move quickly without leaving the canvas</p>
                            </div>
                            <button onClick={() => setIsCommandMenuOpen(false)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-neutral-900 dark:hover:text-white" aria-label="Close actions"><X className="h-4 w-4" /></button>
                        </div>

                        <div className="p-2">
                            <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">Canvas</p>
                            <button onClick={() => void setImmersiveMode(!isImmersive)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-neutral-900">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">{isImmersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</span>
                                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-neutral-100">{isImmersive ? 'Exit immersive canvas' : 'Enter immersive canvas'}</span><span className="block text-[11px] text-stone-400">{isImmersive ? 'Restore the workspace header' : 'Hide the header and use the full screen'}</span></span>
                                <kbd className="rounded-md border border-stone-200 px-2 py-1 font-mono text-[9px] text-stone-400 dark:border-neutral-700">⌘⇧F</kbd>
                            </button>
                            <button onClick={() => { setIsCommandMenuOpen(false); setIsMermaidModalOpen(true); }} disabled={isReadOnly} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-neutral-900">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-orange-400"><Wand2 className="h-4 w-4" /></span>
                                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-neutral-100">Generate a diagram</span><span className="block text-[11px] text-stone-400">Create editable shapes from a prompt</span></span>
                            </button>

                            <p className="px-2 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">Workflow</p>
                            <button onClick={() => { setIsCommandMenuOpen(false); openTaskComposer(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-neutral-900">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"><ListTodo className="h-4 w-4" /></span>
                                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-neutral-100">Create attached task</span><span className="block text-[11px] text-stone-400">Turn this sketch into a follow-up</span></span>
                            </button>
                            <button onClick={() => { setIsCommandMenuOpen(false); const becomingOpen = !isSidebarOpen; if (becomingOpen) setSidebarWidth(Math.min(Math.max(window.innerWidth / 2, 380), 640)); setIsSidebarOpen(becomingOpen); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-neutral-900">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"><PanelRightOpen className="h-4 w-4" /></span>
                                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-neutral-100">{isSidebarOpen ? 'Close learning tools' : 'Open learning tools'}</span><span className="block text-[11px] text-stone-400">Code Studio and Kumi beside the canvas</span></span>
                            </button>
                            <button onClick={() => { setIsCommandMenuOpen(false); void togglePublic(); }} disabled={isReadOnly} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-neutral-900">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">{isPublic ? <Lock className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}</span>
                                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-stone-800 dark:text-neutral-100">{isPublic ? 'Make note private' : 'Share with the community'}</span><span className="block text-[11px] text-stone-400">{isPublic ? 'Only you will be able to access it' : 'Publish this visual note for others'}</span></span>
                            </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-2.5 text-[10px] text-stone-400 dark:border-neutral-800 dark:bg-neutral-900/60">
                            <span>Quick actions are available anywhere in the editor</span>
                            <span><kbd className="font-mono">Esc</kbd> to close</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <form
                        onSubmit={handleCreateAttachedTask}
                        className="w-full max-w-md overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
                    >
                        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                                    <ListTodo className="h-4 w-4" />
                                </span>
                                <h3 className="text-base font-black text-neutral-950 dark:text-white">Create task</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(false)}
                                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                                aria-label="Close task form"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 px-5 py-5">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">What is the task?</span>
                                <input
                                    autoFocus
                                    type="text"
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="Review this diagram"
                                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none transition-colors focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">For what time?</span>
                                <input
                                    type="datetime-local"
                                    value={taskDueAt}
                                    onChange={(e) => setTaskDueAt(e.target.value)}
                                    min={toLocalDateTimeInputValue(new Date())}
                                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none transition-colors focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                                />
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(false)}
                                className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreatingTask || !taskTitle.trim() || !taskDueAt}
                                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:pointer-events-none disabled:opacity-50"
                            >
                                {isCreatingTask && <Loader2 className="h-4 w-4 animate-spin" />}
                                Create task
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Mermaid Input Modal */}
            {
                isMermaidModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl bg-white dark:bg-neutral-950 rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">

                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                                <div>
                                    <h3 className="text-lg font-black text-neutral-950 dark:text-white flex items-center gap-2">
                                        <Wand2 className="w-5 h-5 text-orange-500" />
                                        Text to Diagram
                                    </h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                        Turn Mermaid syntax into editable diagrams instantly.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsMermaidModalOpen(false)}
                                    className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-neutral-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">

                                {/* AI Section */}
                                <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-lg border border-orange-100 dark:border-orange-500/20">
                                    <label className="text-sm font-bold text-neutral-950 dark:text-white mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-orange-500" />
                                        Describe your diagram
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
                                            placeholder="e.g. 'Login flow with 2FA' or 'Sequence diagram for payment processing'"
                                            className="flex-1 px-4 py-2.5 rounded-lg border border-orange-200 dark:border-orange-500/30 bg-white dark:bg-neutral-950 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-neutral-950 dark:text-white"
                                        />
                                        <button
                                            onClick={handleAIGenerate}
                                            disabled={isGeneratingAI || !aiPrompt.trim()}
                                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                                        >
                                            {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            <span className="hidden sm:inline">Magic</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Manual Code Section */}
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                                        <Code className="w-3 h-3" /> Mermaid Code
                                    </label>
                                    <textarea
                                        value={mermaidCode}
                                        onChange={(e) => setMermaidCode(e.target.value)}
                                        placeholder="Enter Mermaid syntax here..."
                                        className="flex-1 min-h-[200px] p-4 font-mono text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none text-neutral-950 dark:text-neutral-100"
                                    />

                                    <div className="flex items-center justify-between text-xs text-neutral-400">
                                        <p>Supports Flowcharts, Sequence Diagrams, Class Diagrams, etc.</p>
                                        <a href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer" className="hover:text-orange-500 underline">
                                            Mermaid Syntax Guide
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsMermaidModalOpen(false)}
                                    className="px-5 py-2.5 rounded-lg font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMermaidInsert}
                                    className="px-5 py-2.5 rounded-lg font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all flex items-center gap-2"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Generate Diagram
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
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
                )
            }
        </div>
    );
};
