import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen, getSceneVersion, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import "@excalidraw/excalidraw/index.css";
import { X, PenTool, Lock, Unlock, LayoutTemplate, Monitor } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { showToast } from '../utils/toast';
import { attachNoteThumbnail, renderNoteThumbnail, uploadNoteThumbnail } from '../lib/noteThumbnail';
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
    files?: any;
    is_public: boolean;
    id?: string;
    thumbnail_url?: string;
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

    // Split View State
    const [splitRatio, setSplitRatio] = useState(50); // Percentage
    const isDraggingRef = useRef(false);

    // Helper for wrapping text
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
            if (!token) return;

            try {
                const response = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/?my_drawings=true&blog_slug=${articleSlug}`);
                if (response.ok) {
                    const data = await response.json();
                    const results = data.results || (Array.isArray(data) ? data : []);
                    if (Array.isArray(results)) {
                        const drawing = results.find((d: any) => d.blog_slug === articleSlug);
                        if (drawing) {
                            const detailRes = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${drawing.id}/`);
                            if (detailRes.ok) {
                                const fullDrawing = await detailRes.json();
                                const elements = typeof fullDrawing.elements === 'string' ? JSON.parse(fullDrawing.elements) : fullDrawing.elements || [];
                                const appState = typeof fullDrawing.app_state === 'string' ? JSON.parse(fullDrawing.app_state) : fullDrawing.app_state || {};
                                const files = typeof fullDrawing.files === 'string' ? JSON.parse(fullDrawing.files) : fullDrawing.files || {};

                                const loadedTitle = fullDrawing.title || appState.name || "Untitled";
                                setTitle(loadedTitle);
                                titleRef.current = loadedTitle;

                                setDrawingData({
                                    elements: elements,
                                    appState: appState,
                                    files: files,
                                    is_public: fullDrawing.is_public,
                                    id: fullDrawing.id,
                                    thumbnail_url: fullDrawing.thumbnail_url || ''
                                });
                                setIsPublic(fullDrawing.is_public);
                                lastSavedVersionRef.current = getSceneVersion(elements || []);
                                if (fullDrawing.thumbnail_url) lastThumbnailAtRef.current = Date.now();
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

    // Re-hydrate saved ImageKit URLs as base64 so Excalidraw can render them on reload
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
                ikUrlsRef.current[fileId] = fileData.dataURL;
            } catch (err) {
                console.error(`Failed to hydrate file ${fileId}:`, err);
            }
        });
    }, [excalidrawAPI, drawingData?.id]);

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

        const handleAddToSketch = async (e: CustomEvent | { detail: any }) => {
            const { text, elements: rawElements, type } = e.detail;

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

                let importedElements = rawElements;
                let newElements: any[] = [];

                // Handle Mermaid Conversion
                if (type === 'mermaid') {
                    try {
                        const { elements } = await parseMermaidToExcalidraw(rawElements);
                        importedElements = elements;
                    } catch (err) {
                        console.error("Mermaid to Excalidraw failed:", err);
                        showToast("Failed to visualize. AI generated invalid syntax. Check console.", "error");
                        return;
                    }
                }

                if (importedElements && Array.isArray(importedElements) && importedElements.length > 0) {
                    const normalized = importedElements.flatMap((el: any) => {
                        if (!el.id) el.id = Math.random().toString(36).substr(2, 9);
                        const ghostColor = "#e0e0e0";
                        if (el.type === "arrow" && el.start && el.end) {
                            return [{
                                ...el,
                                strokeColor: ghostColor,
                                x: el.start.x,
                                y: el.start.y,
                                points: [[0, 0], [el.end.x - el.start.x, el.end.y - el.start.y]]
                            }];
                        }
                        if ((el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") && typeof el.label === 'string') {
                            const textId = Math.random().toString(36).substr(2, 9);
                            const fontSize = 20;
                            const textY = el.y + (el.height / 2) - 10;
                            const textEl = {
                                type: "text",
                                id: textId,
                                x: el.x, y: textY,
                                width: el.width, height: el.height,
                                text: wrapperText(el.label, 30),
                                fontSize: fontSize, fontFamily: 1,
                                textAlign: "center", verticalAlign: "middle",
                                containerId: el.id, strokeColor: ghostColor
                            };
                            const shapeEl = {
                                ...el, strokeColor: ghostColor,
                                boundElements: [{ id: textId, type: "text" }],
                                label: undefined
                            };
                            return [shapeEl, textEl];
                        }
                        return [{ ...el, strokeColor: el.strokeColor === '#000000' || !el.strokeColor ? ghostColor : el.strokeColor }];
                    }).sort((a, b) => (a.type === 'arrow' ? 1 : -1));

                    const xs = normalized.map(el => el.x || 0);
                    const ys = normalized.map(el => el.y || 0);
                    const minX = Math.min(...xs);
                    const minY = Math.min(...ys);
                    const width = Math.max(...normalized.map(el => (el.x || 0) + (el.width || 0))) - minX || 100;
                    const height = Math.max(...normalized.map(el => (el.y || 0) + (el.height || 0))) - minY || 100;
                    const offsetX = (cx - width / 2) - minX;
                    const offsetY = (cy - height / 2) - minY;

                    newElements = convertToExcalidrawElements(normalized.map((el: any) => ({
                        ...el, x: (el.x || 0) + offsetX, y: (el.y || 0) + offsetY
                    })));

                    let currentElements = excalidrawAPI.getSceneElements();
                    let accumElements = [...currentElements];
                    for (const el of newElements) {
                        accumElements.push(el);
                        excalidrawAPI.updateScene({ elements: accumElements });
                        if (newElements.length > 1) {
                            try { excalidrawAPI.scrollToContent([el], { fitToContent: false, animate: true }); } catch (e) { }
                            await new Promise(r => setTimeout(r, 500));
                        }
                    }
                    excalidrawAPI.updateScene({
                        elements: accumElements, commitToHistory: true, appState: { selectedElementIds: newElements.reduce((acc: any, el: any) => ({ ...acc, [el.id]: true }), {}) }
                    });
                    return;

                } else if (text) {
                    newElements = convertToExcalidrawElements([{
                        type: "text",
                        text: wrapperText(text, 40),
                        x: cx - 100,
                        y: cy,
                        fontSize: 20,
                        fontFamily: 1,
                        strokeColor: "#ea580c",
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
        window.addEventListener('open-code-studio', () => setViewMode('hidden')); // Close when Code Studio opens
        window.addEventListener('open-kumi-split', () => setViewMode('hidden')); // Close when Kumi enters split
        window.addEventListener('request-add-to-sketch', handleAddToSketch as EventListener);

        // @ts-ignore
        if (typeof initialRequest !== 'undefined' && initialRequest && excalidrawAPI) {
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

    // Card thumbnails for the notes hub. Same throttle as the standalone editor:
    // a canvas being edited continuously must not re-upload on every autosave.
    const lastThumbnailAtRef = useRef(0);
    const lastThumbnailVersionRef = useRef(0);
    const isRenderingThumbnailRef = useRef(false);
    const THUMBNAIL_MIN_INTERVAL_MS = 90_000;

    const refreshThumbnail = useCallback(async (
        noteId: string | number,
        elements: readonly any[],
        appState: any,
        options: { force?: boolean } = {},
    ) => {
        if (!excalidrawAPI || isRenderingThumbnailRef.current) return;

        const sceneVersion = getSceneVersion(elements as any);
        if (!options.force) {
            if (sceneVersion === lastThumbnailVersionRef.current) return;
            if (Date.now() - lastThumbnailAtRef.current < THUMBNAIL_MIN_INTERVAL_MS) return;
        }

        isRenderingThumbnailRef.current = true;
        try {
            // Files come from the live scene: they are hydrated to base64 there,
            // and a cross-origin URL would taint the export canvas.
            const blob = await renderNoteThumbnail(elements, excalidrawAPI.getFiles(), appState);
            if (!blob) {
                console.warn('Note thumbnail skipped: the canvas has nothing exportable on it.');
                return;
            }

            const uploadedUrl = await uploadNoteThumbnail(noteId, blob);
            await attachNoteThumbnail(noteId, uploadedUrl, fetchWithAuth);

            lastThumbnailAtRef.current = Date.now();
            lastThumbnailVersionRef.current = sceneVersion;
        } catch (error) {
            // A missing card image is never worth interrupting someone's drawing.
            console.error('Could not refresh the note thumbnail:', error);
        } finally {
            isRenderingThumbnailRef.current = false;
        }
    }, [excalidrawAPI]);

    // Save Data Logic
    const saveData = useCallback(async (elements: any, appState: any, files: any, isPublicState: boolean) => {
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
            // Build the backend files payload:
            // 1. Always include everything from ikUrlsRef (files uploaded this session)
            // 2. Supplement with any http URL files Excalidraw still has (loaded from DB)
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
                blog_slug: articleSlug,
                elements: [...elements],
                app_state: updatedAppState,
                files: sanitizedFiles,
                is_public: isPublicState,
                title: titleRef.current
            };

            const method = drawingData?.id ? 'PUT' : 'POST';
            const url = drawingData?.id
                ? `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${drawingData.id}/`
                : `${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/`;

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

                const persistedId = saved?.id || drawingData?.id;
                if (persistedId) void refreshThumbnail(persistedId, elements, updatedAppState);
            }
        } catch (error) {
            console.error("Failed to save drawing:", error);
        } finally {
            setIsSaving(false);
        }
    }, [articleSlug, drawingData?.id, title, refreshThumbnail]);

    // Notes drawn before thumbnails existed still show the placeholder card, so
    // render one the first time this sketch is opened.
    useEffect(() => {
        if (!excalidrawAPI || isLoading) return;
        if (!drawingData?.id || drawingData.thumbnail_url) return;

        const timer = setTimeout(() => {
            void refreshThumbnail(
                drawingData.id as string,
                excalidrawAPI.getSceneElements(),
                excalidrawAPI.getAppState(),
                { force: true },
            );
        }, 2500); // Let linked images finish hydrating before rendering the export.
        return () => clearTimeout(timer);
    }, [excalidrawAPI, isLoading, drawingData?.id, drawingData?.thumbnail_url, refreshThumbnail]);

    const uploadingFilesRef = useRef(new Set<string>());
    // Maps excalidrawFileId -> ImageKit URL so we persist the CDN URL (not base64) in DB
    const ikUrlsRef = useRef<Record<string, string>>({});

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
        const currentVersion = getSceneVersion(elements);

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

        if (currentVersion === lastSavedVersionRef.current) return;

        setHasUnsavedChanges(true);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            if (excalidrawAPI) {
                saveData(
                    excalidrawAPI.getSceneElements(),
                    excalidrawAPI.getAppState(),
                    excalidrawAPI.getFiles(),
                    isPublic
                );
            }
        }, 3000);
    }, [isPublic, saveData, excalidrawAPI]);

    const togglePublic = async () => {
        if (!drawingData?.id) {
            const newState = !isPublic;
            setIsPublic(newState);
            if (excalidrawAPI) {
                saveData(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState(), excalidrawAPI.getFiles(), newState);
            }
            return;
        }

        try {
            const response = await fetchWithAuth(`${import.meta.env.PUBLIC_API_URL || ''}/api/blogs/user-drawings/${drawingData.id}/toggle_public/`, {
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


    // --- IMMERSIVE SPLIT LOGIC ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            // Prevent selection
            e.preventDefault();

            const newPercentage = (e.clientX / window.innerWidth) * 100;
            // SAFETY: Constrain to 20-80
            if (newPercentage > 20 && newPercentage < 80) {
                setSplitRatio(newPercentage);
            }
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                // Rerender Excalidraw to fit new size
                if (excalidrawAPI) {
                    setTimeout(() => excalidrawAPI.refresh(), 50);
                }
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
    }, [viewMode, excalidrawAPI]);

    // Force Zen Nav visibility and fix toolbars in split mode
    useEffect(() => {
        if (viewMode !== 'split') return;

        const forceUIFixes = () => {
            // Force Zen Nav visible
            const zenNav = document.getElementById('zen-nav');
            if (zenNav) {
                zenNav.style.display = 'flex';
                zenNav.style.visibility = 'visible';
                zenNav.style.opacity = '1';
                zenNav.style.zIndex = '30000';
                zenNav.style.position = 'fixed';
                zenNav.style.top = '1rem';
                zenNav.style.left = '1rem';
                zenNav.style.pointerEvents = 'auto';
            }

            // Fix code playground toolbars - constrain to left pane
            const container = document.getElementById('immersive-article-container');
            if (container) {
                const toolbars = container.querySelectorAll('[class*="fixed"][class*="bottom"], .code-playground-toolbar');
                toolbars.forEach((toolbar) => {
                    const el = toolbar as HTMLElement;
                    el.style.maxWidth = `${splitRatio}vw`;
                    el.style.left = '0';
                    el.style.right = 'auto';
                });
            }
        };

        // Run immediately and after delays to catch dynamically loaded elements
        forceUIFixes();
        const timer1 = setTimeout(forceUIFixes, 100);
        const timer2 = setTimeout(forceUIFixes, 500);
        const timer3 = setTimeout(forceUIFixes, 1000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [viewMode, splitRatio]);

    // Add body class for split mode styling
    useEffect(() => {
        if (viewMode === 'split') {
            document.body.classList.add('split-view-active');
        } else {
            document.body.classList.remove('split-view-active');
        }

        return () => {
            document.body.classList.remove('split-view-active');
        };
    }, [viewMode]);


    const getContainerStyles = () => {
        const baseStyles = "bg-white dark:bg-neutral-950 transition-none duration-0 ease-linear flex flex-col overflow-visible";
        switch (viewMode) {
            case 'maximize': return `${baseStyles} fixed inset-x-0 bottom-0 h-[92vh] lg:h-full lg:inset-0 z-[10000] rounded-t-3xl lg:rounded-none shadow-2xl lg:shadow-none border-t lg:border-none border-neutral-200 dark:border-neutral-800`;
            // In split mode, Excalidraw is on the right, taking up the remaining space
            case 'split': return `${baseStyles} fixed top-0 bottom-0 right-0 z-[10000] shadow-2xl border-l border-neutral-200 dark:border-neutral-800`;
            default: return `${baseStyles} fixed top-[64px] bottom-0 right-0 w-0 z-[40] pointer-events-none opacity-0`;
        }
    };

    const handleImageUpload = async (file: File) => {
        if (!file || !excalidrawAPI) return;

        try {
            // 1. Read file as base64 first – Excalidraw needs base64 to render
            const base64DataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const fileId = Math.random().toString(36).substr(2, 9);

            // 2. Upload to ImageKit
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

                // 3. Store IK URL so sanitizeFiles can write the http URL to the backend
                ikUrlsRef.current[fileId] = data.url;

                // 4. addFiles with BASE64 — Excalidraw requires this to render (not http URL)
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
                    elements: [...excalidrawAPI.getSceneElements(), imgElement]
                });
            } else {
                console.error("Failed to upload image to ImageKit:", uploadRes.statusText);
            }
        } catch (err) {
            console.error("Custom Image Insert Failed:", err);
        }
    };

    return (
        <>
            {/* INJECTED STYLES FOR IMMERSIVE SPLIT */}
            {viewMode === 'split' && (
                <style>{`
                    body { overflow: hidden !important; }
                    /* Hide Standard Header & Footer */
                    #site-header, footer, .reading-progress { display: none !important; }

                    /* CRITICAL: Restore Zen Nav as a clean bar spanning the left pane (matches Code Studio / Kumi) */
                    #zen-nav {
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        z-index: 30000 !important; /* Above everything including Excalidraw */
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
                    #article-nav-links { display: none !important; }
                    #article-nav-actions a {
                        padding: 0.5rem 0.75rem !important;
                        border-radius: 0.5rem !important;
                        background: #ea580c !important;
                        color: #fff !important;
                    }
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

                    /* Restore & Fix Selection Popover */
                    #selection-popover {
                        z-index: 20003 !important;
                    }

                    /* Constrain fixed bottom elements to left pane */
                    #immersive-article-container .code-playground-toolbar,
                    #immersive-article-container [class*="fixed"][class*="bottom"],
                    .code-playground-toolbar {
                        max-width: ${splitRatio}vw !important;
                        left: 0 !important;
                        right: auto !important;
                    }

                    /* Custom Scrollbar for Article */
                    #immersive-article-container::-webkit-scrollbar {
                        width: 8px;
                    }
                    #immersive-article-container::-webkit-scrollbar-thumb {
                        background-color: rgba(156, 163, 175, 0.5);
                        border-radius: 4px;
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

                    /* Hide Sidebars in Article */
                    aside { display: none !important; }
                    
                    /* Ensure content fits */
                    #immersive-article-container > div {
                         max-width: 800px !important;
                         margin: 0 auto !important;
                         gap: 0 !important;
                         padding-bottom: 4rem !important;
                         display: block !important;
                    }

                    /* Fix code playground positioning */
                    #immersive-article-container .code-playground {
                        position: relative !important;
                    }
                    
                     /* Adjust drag handle hovering */
                    .split-drag-handle:hover {
                        background: #ea580c;
                    }
                `}</style>
            )}

            {/* FLOATING TRIGGER (Only when hidden/minimized) */}
            <div className={`fixed bottom-24 right-6 z-[60] transition-all duration-300 ${viewMode === 'minimized' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                <button
                    onClick={() => setViewMode('split')}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-white shadow-xl transition-transform hover:scale-105 hover:bg-orange-500"
                    title="Open Notes"
                >
                    <PenTool className="w-6 h-6" />
                </button>
            </div>

            {/* DRAG HANDLE (Only in split) */}
            {viewMode === 'split' && (
                <div
                    className="split-drag-handle group fixed bottom-0 top-0 z-[10001] flex w-[6px] cursor-col-resize items-center justify-center bg-neutral-200 transition-colors duration-150 hover:bg-orange-600 dark:bg-neutral-800"
                    style={{ left: `calc(${splitRatio}% - 3px)` }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        isDraggingRef.current = true;
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }}
                >
                    {/* Visual Grip */}
                    <div className="h-8 w-1 rounded-full bg-neutral-400 group-hover:bg-white/90"></div>
                </div>
            )}

            {/* MAIN DRAWER CONTAINER */}
            <div
                className={getContainerStyles()}
                style={{
                    width: viewMode === 'maximize' ? '100%' : viewMode === 'split' ? `${100 - splitRatio}%` : '0px',
                }}
            >
                {/* TOOLBAR HEADER */}
                <div className="relative z-[70] flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/95">
                    <div className="flex items-center gap-3">
                        {/* Title Input */}
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value; setHasUnsavedChanges(true); }}
                                onBlur={() => excalidrawAPI && saveData(excalidrawAPI.getSceneElements(), excalidrawAPI.getAppState(), excalidrawAPI.getFiles(), isPublic)}
                                className="w-32 truncate border-none bg-transparent text-sm font-semibold text-neutral-700 transition-colors focus:outline-none dark:text-neutral-200 sm:w-48"
                                placeholder="Untitled Note"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Custom File Input for bypassing Excalidraw Image Tool */}
                        <input
                            type="file"
                            id="custom-image-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) await handleImageUpload(file);
                                e.target.value = '';
                            }}
                        />

                        {/* VISIBLE UPLOAD IMAGE BUTTON */}
                        <button
                            onClick={() => document.getElementById('custom-image-upload')?.click()}
                            className="mr-2 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70"
                            title="Insert Custom Image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            Upload Image
                        </button>

                        <button
                            onClick={togglePublic}
                            className={`rounded-md p-1.5 transition-colors ${isPublic ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200'}`}
                            title={isPublic ? 'Public note' : 'Private note'}
                            aria-label={isPublic ? 'Make note private' : 'Make note public'}
                        >
                            {isPublic ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

                        {!isMobile && (
                            <button
                                onClick={() => setViewMode('split')}
                                className={`rounded-md p-1.5 transition-colors ${viewMode === 'split' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200'}`}
                                title="Split View"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('maximize')}
                            className={`rounded-md p-1.5 transition-colors ${viewMode === 'maximize' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200'}`}
                            title="Full Screen"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('hidden')}
                            className="ml-1 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {showMobileWarning && isMobile && (
                    <div className="flex items-center justify-between border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs text-orange-900 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-200 sm:text-sm">
                        <span>For the best experience, please use a laptop or larger screen.</span>
                        <button onClick={() => setShowMobileWarning(false)} className="ml-2 rounded-full p-1 hover:bg-orange-100 dark:hover:bg-orange-900/70">
                            <X className="X w-3 h-3" />
                        </button>
                    </div>
                )}

                <div className="relative flex-1 w-full overflow-visible bg-neutral-50 dark:bg-neutral-950">
                    <div style={{ width: "100%", height: "100%" }}>
                        <style>{`
                        .excalidraw {
                            --focus-highlight-color: #fb923c;
                            --select-highlight-color: #f97316;
                            --color-selection: #ea580c;
                            --color-primary: #ea580c;
                            --color-primary-darker: #c2410c;
                            --color-primary-darkest: #9a3412;
                            --color-primary-hover: #c2410c;
                            --color-primary-light: #ffedd5;
                            --color-primary-light-darker: #fed7aa;
                            --color-brand-hover: #c2410c;
                            --color-brand-active: #9a3412;
                            --color-on-primary-container: #7c2d12;
                            --color-surface-primary-container: #ffedd5;
                            --color-surface-high: #f5f5f4;
                            --color-surface-mid: #f5f5f4;
                            --color-surface-low: #fafaf9;
                            --color-slider-track: #fed7aa;
                        }
                        .excalidraw.theme--dark {
                            --focus-highlight-color: #fb923c;
                            --select-highlight-color: #f97316;
                            --color-selection: #ea580c;
                            --color-primary: #fb923c;
                            --color-primary-darker: #fdba74;
                            --color-primary-darkest: #fed7aa;
                            --color-primary-hover: #fdba74;
                            --color-primary-light: #431407;
                            --color-primary-light-darker: #7c2d12;
                            --color-brand-hover: #fdba74;
                            --color-brand-active: #fed7aa;
                            --color-on-primary-container: #fed7aa;
                            --color-surface-primary-container: #431407;
                            --color-surface-high: #292524;
                            --color-surface-mid: #1c1917;
                            --color-surface-low: #1c1917;
                            --color-surface-lowest: #0c0a09;
                            --island-bg-color: #1c1917;
                            --default-bg-color: #0c0a09;
                            --color-slider-track: #7c2d12;
                        }
                        .excalidraw, .excalidraw-container { overflow: visible !important; }
                        .excalidraw .dropdown-menu { z-index: 9999 !important; position: absolute !important; }
                        .excalidraw .Island { z-index: 50 !important; overflow: visible !important; }
                        .excalidraw .layer-ui__library { border-radius: 0; }
                    `}</style>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600"></div>
                            </div>
                        ) : (
                            <Excalidraw
                                initialData={
                                    drawingData ? {
                                        elements: drawingData.elements,
                                        appState: {
                                            ...drawingData.appState,
                                            collaborators: new Map(),
                                            viewBackgroundColor: "#ffffff",
                                            theme: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
                                        },
                                        files: drawingData.files,
                                        libraryItems: initialLibraryItems as any,
                                        scrollToContent: true
                                    } : { libraryItems: initialLibraryItems as any }
                                }
                                onChange={(elements, appState, files) => handleChange(elements, appState, files)}
                                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                                UIOptions={{
                                    tools: { image: true },
                                    canvasActions: {
                                        changeViewBackgroundColor: true,
                                        clearCanvas: true,
                                        export: false,
                                        loadScene: true,
                                        saveToActiveFile: false,
                                        toggleTheme: true,
                                        saveAsImage: true
                                    }
                                }}
                                onPaste={(data, event) => {
                                    // 1. Manually intercept pasted image files before Excalidraw throws "Images Disabled"
                                    const items = event?.clipboardData?.items;
                                    if (items && excalidrawAPI) {
                                        for (let i = 0; i < items.length; i++) {
                                            if (items[i].type.indexOf('image/') !== -1) {
                                                const file = items[i].getAsFile();
                                                if (file) {
                                                    // Immediately trigger our custom imagekit upload flow
                                                    handleImageUpload(file);
                                                    // Halt Excalidraw completely
                                                    return false;
                                                }
                                            }
                                        }
                                    }
                                    return true; // allow other text to paste normally
                                }}
                                generateIdForFile={async (file) => {
                                    return Math.random().toString(36).substring(2) + Date.now().toString(36);
                                }}
                            >
                                <WelcomeScreen>
                                    <WelcomeScreen.Center>
                                        <WelcomeScreen.Center.Heading>Sketch Your Ideas</WelcomeScreen.Center.Heading>
                                    </WelcomeScreen.Center>
                                </WelcomeScreen>
                                <MainMenu>
                                    <MainMenu.DefaultItems.LoadScene />
                                    <MainMenu.DefaultItems.SaveAsImage />
                                    <MainMenu.DefaultItems.ClearCanvas />
                                    <MainMenu.DefaultItems.ChangeCanvasBackground />
                                    <MainMenu.DefaultItems.ToggleTheme />
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
