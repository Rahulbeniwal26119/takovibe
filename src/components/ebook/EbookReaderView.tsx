import React, { useEffect, useRef, useState } from 'react';
import ePub, { EpubCFI } from 'epubjs';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    List,
    Minus,
    Plus,
    Type,
    Loader2,
    X,
    Maximize,
    Minimize,
    Sparkles,
    Moon,
    Sun,
    Languages,
    Highlighter,
    NotebookPen,
    Save,
    Trash2,
} from 'lucide-react';
import { flushBookProgress, getBookFile, getBookMeta, saveProgress } from '../../lib/ebookLibrary';
import {
    createRemoteHighlight,
    deleteRemoteHighlight,
    hasReaderAccount,
    listRemoteHighlights,
    type RemoteEbookHighlight,
} from '../../lib/ebookApi';
import ReaderAssistant, { type AssistantSeed } from './ReaderAssistant';

interface Props {
    bookId: string;
    onClose: () => void;
}

type ThemeName = 'light' | 'sepia' | 'dark';
type PageTurnDirection = 'next' | 'prev';
type PageTurnPhase = 'idle' | 'out-next' | 'out-prev' | 'in-next' | 'in-prev';
type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

interface StoredHighlight {
    id?: string;
    cfiRange: string;
    color: HighlightColor;
    text: string;
    note: string;
    createdAt: number;
}

const THEMES: Record<ThemeName, { bg: string; color: string; link: string; label: string }> = {
    light: { bg: '#fafaf9', color: '#1c1917', link: '#ea580c', label: 'Light' },
    sepia: { bg: '#f4ecd8', color: '#4b3f2f', link: '#b45309', label: 'Sepia' },
    dark: { bg: '#0a0a0a', color: '#cfccc9', link: '#fb923c', label: 'Dark' },
};

const FONT_MIN = 80;
const FONT_MAX = 180;
const SWIPE_THRESHOLD = 45;
// Characters per generated location — smaller means finer-grained "pages".
const LOCATION_CHARS = 1024;
const HIGHLIGHT_COLORS: Record<HighlightColor, { label: string; value: string; button: string }> = {
    yellow: { label: 'Yellow', value: '#fde047', button: 'bg-yellow-300' },
    green: { label: 'Green', value: '#86efac', button: 'bg-green-300' },
    blue: { label: 'Blue', value: '#93c5fd', button: 'bg-blue-300' },
    pink: { label: 'Pink', value: '#f9a8d4', button: 'bg-pink-300' },
};
const TRANSLATION_LANGUAGE_KEY = 'reader_translation_language';
const TRANSLATION_LANGUAGES = [
    'Hindi',
    'Spanish',
    'French',
    'German',
    'Japanese',
    'Chinese (Simplified)',
    'Arabic',
    'Portuguese',
    'Italian',
    'Korean',
];

function applyTheme(rendition: any, theme: ThemeName, fontSize: number) {
    if (!rendition) return;
    const t = THEMES[theme];
    // Broad selectors so book CSS can't leave text unreadable on dark/sepia.
    rendition.themes.register('tako', {
        body: {
            background: `${t.bg} !important`,
            color: `${t.color} !important`,
            'line-height': '1.6 !important',
        },
        'p, li, span, div, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption': {
            color: `${t.color} !important`,
        },
        a: { color: `${t.link} !important` },
        '::selection': { background: 'rgba(234,88,12,0.25)' },
        img: { 'max-width': '100% !important' },
    });
    rendition.themes.select('tako');
    rendition.themes.fontSize(`${fontSize}%`);
}

function siteIsDark(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

// Collapse a range CFI to its start/end point CFIs so two ranges can be compared.
function cfiRangeEndpoints(cfiRange: string): { start: string; end: string } | null {
    try {
        const start = new EpubCFI(cfiRange);
        start.collapse(true);
        const end = new EpubCFI(cfiRange);
        end.collapse(false);
        return { start: start.toString(), end: end.toString() };
    } catch {
        return null;
    }
}

// Two highlights overlap when they share interior text (adjacency is allowed).
function cfiRangesOverlap(a: string, b: string): boolean {
    const ae = cfiRangeEndpoints(a);
    const be = cfiRangeEndpoints(b);
    if (!ae || !be) return false;
    const cfi = new EpubCFI();
    return cfi.compare(ae.start, be.end) < 0 && cfi.compare(be.start, ae.end) < 0;
}

export default function EbookReaderView({ bookId, onClose }: Props) {
    const rootRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<any>(null);
    const renditionRef = useRef<any>(null);
    const locationsReady = useRef(false);
    const initialSiteDarkRef = useRef<boolean | null>(null);
    const pageTurnBusyRef = useRef(false);
    const pageTurnTimersRef = useRef<number[]>([]);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const [title, setTitle] = useState('');
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [progress, setProgress] = useState(0);
    const [chapter, setChapter] = useState('');
    const [activeTocHref, setActiveTocHref] = useState('');
    const [page, setPage] = useState<{ current: number; total: number } | null>(null);
    const [locationsGenerated, setLocationsGenerated] = useState(false);
    const [toc, setToc] = useState<any[]>([]);
    const [tocOpen, setTocOpen] = useState(false);
    const [highlightsOpen, setHighlightsOpen] = useState(false);
    const [highlights, setHighlights] = useState<StoredHighlight[]>([]);
    const [highlightNoteDrafts, setHighlightNoteDrafts] = useState<Record<string, string>>({});
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [chromeVisible, setChromeVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [clock, setClock] = useState('');
    const [selectionText, setSelectionText] = useState<string | null>(null);
    const [selectionCfiRange, setSelectionCfiRange] = useState<string | null>(null);
    const [scrubLocation, setScrubLocation] = useState<number | null>(null);
    const selectionWinRef = useRef<Window | null>(null);
    const translationAbortRef = useRef<AbortController | null>(null);
    const [translationLanguage, setTranslationLanguage] = useState(() =>
        typeof localStorage !== 'undefined' ? localStorage.getItem(TRANSLATION_LANGUAGE_KEY) || 'Hindi' : 'Hindi',
    );
    const [translationResult, setTranslationResult] = useState('');
    const [translationLoading, setTranslationLoading] = useState(false);
    const [translationError, setTranslationError] = useState('');
    const [assistantOpen, setAssistantOpen] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    );
    const [assistantWidth, setAssistantWidth] = useState(380);
    const [isNarrow, setIsNarrow] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    );
    const [assistantSeed, setAssistantSeed] = useState<AssistantSeed | null>(null);
    const resizingAssistantRef = useRef(false);
    const [pageTurnPhase, setPageTurnPhase] = useState<PageTurnPhase>('idle');

    const [theme, setTheme] = useState<ThemeName>(() => {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('reader_theme') as ThemeName | null;
            if (saved) return saved;
        }
        return siteIsDark() ? 'dark' : 'light';
    });
    const [fontSize, setFontSize] = useState<number>(() => {
        const v = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('reader_font')) : 0;
        return v >= FONT_MIN && v <= FONT_MAX ? v : 110;
    });

    const themeRef = useRef(theme);
    const fontRef = useRef(fontSize);
    themeRef.current = theme;
    fontRef.current = fontSize;

    const clearPageTurnTimers = () => {
        pageTurnTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        pageTurnTimersRef.current = [];
    };

    const resizeRendition = () => {
        const rendition = renditionRef.current;
        if (!rendition?.manager) return;
        try {
            rendition.resize();
        } catch {
            /* The iframe manager may disappear during a reload. */
        }
    };

    const turnPage = (direction: PageTurnDirection, navigate: () => unknown) => {
        if (!renditionRef.current?.manager || pageTurnBusyRef.current) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            navigate();
            return;
        }

        pageTurnBusyRef.current = true;
        clearPageTurnTimers();
        setPageTurnPhase(direction === 'next' ? 'out-next' : 'out-prev');

        const outgoingTimer = window.setTimeout(() => {
            Promise.resolve(navigate()).finally(() => {
                setPageTurnPhase(direction === 'next' ? 'in-next' : 'in-prev');
                const incomingTimer = window.setTimeout(() => {
                    window.requestAnimationFrame(() => {
                        setPageTurnPhase('idle');
                        const settleTimer = window.setTimeout(() => {
                            pageTurnBusyRef.current = false;
                        }, 320);
                        pageTurnTimersRef.current.push(settleTimer);
                    });
                }, 90);
                pageTurnTimersRef.current.push(incomingTimer);
            });
        }, 230);
        pageTurnTimersRef.current.push(outgoingTimer);
    };

    const next = () => turnPage('next', () => renditionRef.current?.next());
    const prev = () => turnPage('prev', () => renditionRef.current?.prev());

    const loadHighlights = (): StoredHighlight[] => {
        try {
            const saved = localStorage.getItem(`reader_highlights_${bookId}`);
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed)
                ? parsed.map((highlight) => ({ ...highlight, note: highlight.note || '' }))
                : [];
        } catch {
            return [];
        }
    };

    const saveHighlights = (highlights: StoredHighlight[]) => {
        localStorage.setItem(`reader_highlights_${bookId}`, JSON.stringify(highlights));
        setHighlights(highlights);
    };

    const renderHighlight = (highlight: StoredHighlight) => {
        renditionRef.current?.annotations.highlight(
            highlight.cfiRange,
            { color: highlight.color },
            undefined,
            `tako-highlight-${highlight.color}`,
            {
                fill: HIGHLIGHT_COLORS[highlight.color].value,
                'fill-opacity': '0.48',
                'mix-blend-mode': 'multiply',
            },
        );
    };

    const remoteToStoredHighlight = (highlight: RemoteEbookHighlight): StoredHighlight => ({
        id: highlight.id,
        cfiRange: highlight.epub_cfi_range,
        color: highlight.color,
        text: highlight.selected_text,
        note: highlight.note || '',
        createdAt: Date.parse(highlight.created_at) || Date.now(),
    });

    const refreshHighlightsFromCloud = async (): Promise<StoredHighlight[]> => {
        const cached = loadHighlights();
        if (!hasReaderAccount()) return cached;

        try {
            let remote = await listRemoteHighlights(bookId);
            const remoteRanges = new Set(remote.map((highlight) => highlight.epub_cfi_range));
            const localOnly = cached.filter((highlight) => !highlight.id && !remoteRanges.has(highlight.cfiRange));
            if (localOnly.length) {
                await Promise.all(
                    localOnly.map((highlight) =>
                        createRemoteHighlight(bookId, {
                            epub_cfi_range: highlight.cfiRange,
                            color: highlight.color,
                            selected_text: highlight.text,
                            note: highlight.note,
                        }),
                    ),
                );
                remote = await listRemoteHighlights(bookId);
            }
            const synced = remote.map(remoteToStoredHighlight);
            saveHighlights(synced);
            return synced;
        } catch (error) {
            console.error('Failed to sync ebook highlights; using local cache.', error);
            return cached;
        }
    };

    const seekToProgress = (fraction: number) => {
        const rendition = renditionRef.current;
        const book = bookRef.current;
        if (!rendition) return;
        const clamped = Math.max(0, Math.min(1, fraction));
        let target: string | undefined;
        if (locationsReady.current && book?.locations?.length()) {
            // Precise whole-book seek once locations exist.
            target = book.locations.cfiFromPercentage(clamped);
        } else if (book?.spine?.length) {
            // Coarse seek before locations are ready: land on the nearest spine
            // item. display() needs an href, not a raw index, to navigate reliably.
            const spineIndex = Math.max(0, Math.min(book.spine.length - 1, Math.floor(clamped * book.spine.length)));
            target = book.spine.get(spineIndex)?.href;
        }
        if (!target) {
            setScrubLocation(null);
            return;
        }
        // Hold the dragged value on the thumb until the book has actually moved.
        // Clearing it before display() resolves snaps the controlled input back to
        // the previous position, which reads as "the slider reset itself".
        Promise.resolve(rendition.display(target))
            .catch((error) => console.error('Failed to seek to position', error))
            .finally(() => setScrubLocation(null));
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else rootRef.current?.requestFullscreen?.();
    };

    const resetTranslation = () => {
        translationAbortRef.current?.abort();
        translationAbortRef.current = null;
        setTranslationResult('');
        setTranslationLoading(false);
        setTranslationError('');
    };

    const clearSelection = () => {
        try {
            selectionWinRef.current?.getSelection()?.removeAllRanges();
        } catch {
            /* ignore */
        }
        resetTranslation();
        setSelectionText(null);
        setSelectionCfiRange(null);
    };

    const addHighlight = (color: HighlightColor) => {
        if (!selectionCfiRange || !selectionText) return;
        // Drop any existing highlight that overlaps the new one — overlaps aren't allowed.
        const kept: StoredHighlight[] = [];
        const removed: StoredHighlight[] = [];
        loadHighlights().forEach((item) => {
            if (item.cfiRange === selectionCfiRange || cfiRangesOverlap(item.cfiRange, selectionCfiRange)) {
                renditionRef.current?.annotations.remove(item.cfiRange, 'highlight');
                removed.push(item);
            } else {
                kept.push(item);
            }
        });
        const highlight = {
            cfiRange: selectionCfiRange,
            color,
            text: selectionText,
            note: '',
            createdAt: Date.now(),
        };
        kept.push(highlight);
        saveHighlights(kept);
        renderHighlight(highlight);
        clearSelection();

        if (!hasReaderAccount()) return;
        Promise.all(
            removed.filter((item) => item.id).map((item) => deleteRemoteHighlight(bookId, item.id!)),
        )
            .then(() =>
                createRemoteHighlight(bookId, {
                    epub_cfi_range: highlight.cfiRange,
                    color: highlight.color,
                    selected_text: highlight.text,
                    note: highlight.note,
                }),
            )
            .then((remote) => {
                const current = loadHighlights().filter((item) => item.cfiRange !== highlight.cfiRange);
                current.push(remoteToStoredHighlight(remote));
                saveHighlights(current);
            })
            .catch((error) => console.error('Failed to sync ebook highlight; keeping local copy.', error));
    };

    const goToHighlight = (highlight: StoredHighlight) => {
        renditionRef.current?.display(highlight.cfiRange);
        setHighlightsOpen(false);
    };

    const removeHighlight = (highlight: StoredHighlight) => {
        renditionRef.current?.annotations.remove(highlight.cfiRange, 'highlight');
        saveHighlights(loadHighlights().filter((item) => item.cfiRange !== highlight.cfiRange));
        if (highlight.id && hasReaderAccount()) {
            deleteRemoteHighlight(bookId, highlight.id).catch((error) =>
                console.error('Failed to delete synced ebook highlight.', error),
            );
        }
    };

    const saveHighlightNote = (highlight: StoredHighlight) => {
        const note = highlightNoteDrafts[highlight.cfiRange] ?? highlight.note;
        const updated = { ...highlight, note };
        saveHighlights(
            loadHighlights().map((item) => (item.cfiRange === highlight.cfiRange ? updated : item)),
        );
        if (!hasReaderAccount()) return;
        createRemoteHighlight(bookId, {
            epub_cfi_range: updated.cfiRange,
            color: updated.color,
            selected_text: updated.text,
            note: updated.note,
        })
            .then((remote) => {
                saveHighlights(
                    loadHighlights().map((item) =>
                        item.cfiRange === updated.cfiRange ? remoteToStoredHighlight(remote) : item,
                    ),
                );
            })
            .catch((error) => console.error('Failed to sync ebook highlight note; keeping local copy.', error));
    };

    const askKumiAboutSelection = () => {
        if (!selectionText) return;
        setAssistantSeed({ id: Date.now(), context: selectionText });
        setAssistantOpen(true);
        clearSelection();
    };

    const toggleAssistant = () => setAssistantOpen((open) => !open);

    const translateSelection = async () => {
        if (!selectionText || translationLoading) return;
        translationAbortRef.current?.abort();
        const controller = new AbortController();
        translationAbortRef.current = controller;
        setTranslationLoading(true);
        setTranslationResult('');
        setTranslationError('');

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: `Translate the following passage to ${translationLanguage}. Reply with only the translation:\n\n"${selectionText}"`,
                        },
                    ],
                    article_context: 'The user is translating a selected passage from an EPUB book.',
                }),
            });
            if (!response.ok || !response.body) throw new Error('request failed');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let translated = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                translated += decoder.decode(value, { stream: true });
                setTranslationResult(translated);
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                setTranslationError('Translation failed. Please try again.');
            }
        } finally {
            if (translationAbortRef.current === controller) {
                translationAbortRef.current = null;
                setTranslationLoading(false);
            }
        }
    };

    // Clock (Kindle-style), refreshed every 30s
    useEffect(() => {
        const tick = () =>
            setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        tick();
        const id = setInterval(tick, 30000);
        return () => clearInterval(id);
    }, []);

    // Keep the fullscreen button state in sync (incl. Esc-to-exit)
    useEffect(() => {
        const onFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFs);
        return () => document.removeEventListener('fullscreenchange', onFs);
    }, []);

    // Keep the entire immersive reader, including Kumi, aligned with the book theme.
    useEffect(() => {
        initialSiteDarkRef.current = document.documentElement.classList.contains('dark');
        return () => {
            document.documentElement.classList.toggle('dark', initialSiteDarkRef.current === true);
        };
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    useEffect(() => {
        localStorage.setItem(TRANSLATION_LANGUAGE_KEY, translationLanguage);
    }, [translationLanguage]);

    useEffect(() => {
        return () => {
            clearPageTurnTimers();
            translationAbortRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        const onResize = () => {
            setIsNarrow(window.innerWidth < 1024);
            setAssistantWidth((width) => Math.min(width, Math.max(320, window.innerWidth - 560)));
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!resizingAssistantRef.current) return;
            const maxWidth = Math.max(320, Math.min(560, window.innerWidth - 560));
            setAssistantWidth(Math.max(320, Math.min(maxWidth, window.innerWidth - e.clientX)));
        };
        const onUp = () => {
            if (!resizingAssistantRef.current) return;
            resizingAssistantRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    // Boot epub.js once per book
    useEffect(() => {
        let destroyed = false;
        (async () => {
            try {
                const [buf, meta] = await Promise.all([getBookFile(bookId), getBookMeta(bookId)]);
                if (destroyed || !viewerRef.current) return;
                if (!buf) throw new Error('The EPUB file is not available on this device.');
                setTitle(meta?.title || '');

                const book: any = ePub(buf);
                bookRef.current = book;
                const rendition = book.renderTo(viewerRef.current, {
                    width: '100%',
                    height: '100%',
                    flow: 'paginated',
                    spread: 'auto',
                    allowScriptedContent: false,
                });
                renditionRef.current = rendition;

                applyTheme(rendition, themeRef.current, fontRef.current);

                await rendition.display(meta?.location || undefined);
                if (destroyed) return;
                setReady(true);

                book.loaded.navigation.then((nav: any) => setToc(nav.toc || []));

                // Text selection inside the book -> offer reader actions.
                rendition.on('selected', (cfiRange: string, contents: any) => {
                    const text = contents?.window?.getSelection()?.toString()?.trim() || '';
                    selectionWinRef.current = contents?.window || null;
                    if (text.length > 1) {
                        resetTranslation();
                        setSelectionText(text);
                        setSelectionCfiRange(cfiRange);
                    }
                });

                // epub.js renders chapters in iframes, so mobile gestures need
                // to be bound inside each content document.
                const bindTouchNavigation = (contents: any) => {
                    const doc = contents?.document;
                    if (!doc || doc.documentElement.dataset.takoTouchNav === 'true') return;
                    doc.documentElement.dataset.takoTouchNav = 'true';
                    doc.addEventListener(
                        'touchstart',
                        (event: TouchEvent) => {
                            const touch = event.changedTouches[0];
                            if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                        },
                        { passive: true },
                    );
                    doc.addEventListener(
                        'touchend',
                        (event: TouchEvent) => {
                            const start = touchStartRef.current;
                            const touch = event.changedTouches[0];
                            touchStartRef.current = null;
                            if (!start || !touch || contents.window.getSelection()?.toString()?.trim()) return;
                            const dx = touch.clientX - start.x;
                            const dy = touch.clientY - start.y;
                            if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) {
                                if (dx < 0) next();
                                else prev();
                                return;
                            }
                            if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
                            const target = event.target as HTMLElement | null;
                            if (target?.closest('a, button, input, select, textarea')) return;
                            const ratio = touch.clientX / contents.window.innerWidth;
                            if (ratio < 0.24) prev();
                            else if (ratio > 0.76) next();
                            else setChromeVisible((visible) => !visible);
                        },
                        { passive: true },
                    );
                };
                rendition.hooks.content.register(bindTouchNavigation);
                rendition.getContents().forEach(bindTouchNavigation);

                const updateReaderPosition = (location: any) => {
                    const cfi = location?.start?.cfi;
                    if (!cfi) return;
                    let pct = 0;
                    if (locationsReady.current && book.locations?.length()) {
                        // Whole-book pagination: "page 42 of 980" across the entire book.
                        const total = book.locations.length();
                        const current = Math.min(total, (book.locations.locationFromCfi(cfi) || 0) + 1);
                        pct = total > 0 ? current / total : 0;
                        setPage({ current, total });
                    } else {
                        // Locations aren't generated yet. displayed.page/total is only the
                        // page count WITHIN the current section, so it must not be shown as a
                        // book total. Approximate whole-book progress from the spine position
                        // instead, and leave the page indicator empty until locations exist.
                        const spineIndex = location?.start?.index ?? 0;
                        const spineTotal = book.spine?.length || 1;
                        const displayed = location?.start?.displayed;
                        const within =
                            displayed?.total > 0 ? (displayed.page - 1) / displayed.total : 0;
                        pct = Math.min(1, (spineIndex + within) / spineTotal);
                        setPage(null);
                    }
                    setProgress(pct);
                    const href = location?.start?.href || '';
                    const match = (book.navigation?.toc || []).find(
                        (t: any) => href && t.href && href.indexOf(t.href.split('#')[0]) !== -1,
                    );
                    const chapterTitle = match?.label?.trim() || '';
                    if (match) {
                        setChapter(chapterTitle);
                        setActiveTocHref(match.href || '');
                    }
                    saveProgress(bookId, cfi, pct, href, chapterTitle);
                };

                rendition.on('relocated', (location: any) => {
                    resetTranslation();
                    setSelectionText(null);
                    setSelectionCfiRange(null);
                    setScrubLocation(null);
                    updateReaderPosition(location);
                });

                const initialLocation = rendition.currentLocation();
                if (initialLocation?.start?.cfi) updateReaderPosition(initialLocation);

                const locationsCacheKey = `reader_locations_${bookId}`;
                book.ready
                    .then(async () => {
                        if (destroyed) return;
                        const cached =
                            typeof localStorage !== 'undefined' ? localStorage.getItem(locationsCacheKey) : null;
                        if (cached) {
                            book.locations.load(cached);
                            return;
                        }
                        await book.locations.generate(LOCATION_CHARS);
                        if (destroyed) return;
                        try {
                            localStorage.setItem(locationsCacheKey, book.locations.save());
                        } catch {
                            /* Locations are large; a full localStorage is non-fatal. */
                        }
                    })
                    .then(() => {
                        if (destroyed || !book.locations?.length()) return;
                        locationsReady.current = true;
                        setLocationsGenerated(true);
                        const cachedHighlights = loadHighlights();
                        setHighlights(cachedHighlights);
                        cachedHighlights.forEach(renderHighlight);
                        refreshHighlightsFromCloud().then((syncedHighlights) => {
                            if (destroyed) return;
                            cachedHighlights.forEach((highlight) =>
                                rendition.annotations.remove(highlight.cfiRange, 'highlight'),
                            );
                            syncedHighlights.forEach(renderHighlight);
                        });
                        const cur = rendition.currentLocation();
                        if (cur?.start?.cfi) updateReaderPosition(cur);
                    })
                    .catch((error) => {
                        console.error('Failed to generate book locations', error);
                    });
            } catch (error) {
                if (!destroyed) {
                    console.error('Failed to open EPUB', error);
                    setLoadError(error instanceof Error ? error.message : 'The EPUB could not be opened.');
                }
            }
        })();

        return () => {
            destroyed = true;
            flushBookProgress(bookId);
            const rendition = renditionRef.current;
            const book = bookRef.current;
            renditionRef.current = null;
            bookRef.current = null;
            try {
                rendition?.destroy();
                book?.destroy();
            } catch {
                /* ignore */
            }
            locationsReady.current = false;
            setLocationsGenerated(false);
        };
    }, [bookId]);

    // Re-apply theme / font on change + persist
    useEffect(() => {
        applyTheme(renditionRef.current, theme, fontSize);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('reader_theme', theme);
            localStorage.setItem('reader_font', String(fontSize));
        }
    }, [theme, fontSize]);

    // Keyboard nav (when focus is outside the iframe) + resize
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement && e.target.type === 'range') return;
            if (e.key === 'ArrowRight') next();
            else if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'Escape') onClose();
        };
        const onResize = () => resizeRendition();
        window.addEventListener('keyup', onKey);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('keyup', onKey);
            window.removeEventListener('resize', onResize);
        };
    }, [onClose]);

    // The paginated view needs a recalculation when the available height changes
    useEffect(() => {
        const id = setTimeout(() => resizeRendition(), 320);
        return () => clearTimeout(id);
    }, [chromeVisible, assistantOpen, assistantWidth, isNarrow]);

    const goTo = (href: string) => {
        turnPage('next', () => renditionRef.current?.display(href));
        setTocOpen(false);
    };

    const pageBg = THEMES[theme].bg;
    const pct = Math.round(progress * 100);
    const pageTurnActive = pageTurnPhase !== 'idle';
    const pageTransform = {
        idle: 'translateX(0) scale(1)',
        'out-next': 'translateX(-16px) scale(0.995)',
        'out-prev': 'translateX(16px) scale(0.995)',
        'in-next': 'translateX(16px) scale(0.997)',
        'in-prev': 'translateX(-16px) scale(0.997)',
    }[pageTurnPhase];

    return (
        <div ref={rootRef} className="fixed inset-0 z-[10002]" style={{ background: pageBg }}>
            <div className="flex h-full min-w-0">
                <section className="relative flex min-w-0 flex-1 flex-col">
                    {/* Top bar */}
                    <header
                className={`absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-neutral-200/70 bg-white/90 px-3 backdrop-blur-xl transition-transform duration-300 dark:border-neutral-800/70 dark:bg-neutral-950/90 ${
                    chromeVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-orange-400"
                        aria-label="Back to library"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="truncate font-display text-sm font-bold text-neutral-900 dark:text-neutral-50">
                        {title}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        onClick={toggleAssistant}
                        className="mr-0.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
                        aria-label={assistantOpen ? 'Close reading companion' : 'Open reading companion'}
                        title={assistantOpen ? 'Close Kumi' : 'Open Kumi'}
                    >
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden sm:inline">Kumi</span>
                    </button>
                    <button
                        onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                        className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-orange-400"
                        aria-label={theme === 'dark' ? 'Switch reader to light mode' : 'Switch reader to dark mode'}
                        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => {
                                setSettingsOpen((s) => !s);
                                setTocOpen(false);
                            }}
                            className={`rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900 ${settingsOpen ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-600 dark:text-neutral-300'}`}
                            aria-label="Text settings"
                        >
                            <Type className="h-5 w-5" />
                        </button>
                        {settingsOpen && (
                            <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-neutral-200 bg-white p-3 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
                                <div className="mb-3">
                                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                        Font size
                                    </span>
                                    <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        <button
                                            onClick={() => setFontSize((f) => Math.max(FONT_MIN, f - 10))}
                                            className="flex h-9 w-12 items-center justify-center rounded-l-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{fontSize}%</span>
                                        <button
                                            onClick={() => setFontSize((f) => Math.min(FONT_MAX, f + 10))}
                                            className="flex h-9 w-12 items-center justify-center rounded-r-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                    Theme
                                </span>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(THEMES) as ThemeName[]).map((name) => (
                                        <button
                                            key={name}
                                            onClick={() => setTheme(name)}
                                            className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] font-semibold transition-all ${
                                                theme === name
                                                    ? 'border-orange-500 ring-1 ring-orange-500'
                                                    : 'border-neutral-200 dark:border-neutral-700'
                                            }`}
                                        >
                                            <span
                                                className="h-6 w-full rounded"
                                                style={{ background: THEMES[name].bg, border: '1px solid rgba(120,120,120,0.25)' }}
                                            />
                                            <span className="text-neutral-600 dark:text-neutral-300">{THEMES[name].label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                            onClick={() => {
                                setTocOpen((s) => !s);
                                setHighlightsOpen(false);
                                setSettingsOpen(false);
                            }}
                        className={`rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900 ${tocOpen ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-600 dark:text-neutral-300'}`}
                        aria-label="Table of contents"
                    >
                        <List className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => {
                            setHighlightsOpen((open) => !open);
                            setTocOpen(false);
                            setSettingsOpen(false);
                        }}
                        className={`relative rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900 ${highlightsOpen ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-600 dark:text-neutral-300'}`}
                        aria-label="Saved highlights and notes"
                        title="Highlights and notes"
                    >
                        <NotebookPen className="h-5 w-5" />
                        {highlights.length > 0 && (
                            <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-orange-600 px-0.5 text-[8px] font-bold text-white">
                                {highlights.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-orange-600 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-orange-400"
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        title={isFullscreen ? 'Exit fullscreen' : 'Immersive fullscreen'}
                    >
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>
                </div>
                    </header>

                    {/* Reading area - inset by the chrome height so the bars never cover the text */}
                    <div
                className={`relative flex-1 overflow-hidden transition-[padding] duration-300 ${
                    chromeVisible ? 'pt-14 pb-20 sm:pb-16' : ''
                }`}
            >
                {!ready && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: pageBg }}>
                        {loadError ? (
                            <div className="max-w-sm px-6 text-center">
                                <p className="text-sm text-red-600 dark:text-red-300">{loadError}</p>
                                <button
                                    onClick={onClose}
                                    className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
                                >
                                    Back to library
                                </button>
                            </div>
                        ) : (
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                        )}
                    </div>
                )}
                <div
                    className="mx-auto h-full w-full max-w-3xl transform-gpu transition-[transform,opacity,filter] duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none"
                    style={{
                        transform: pageTransform,
                        opacity: pageTurnActive ? 0.94 : 1,
                        filter: pageTurnActive ? 'brightness(0.98)' : 'brightness(1)',
                    }}
                >
                    <div ref={viewerRef} className="h-full w-full" />
                </div>

                {/* Persistent page-turn controls */}
                <button
                    onClick={prev}
                    className="absolute left-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/75 text-neutral-600 shadow-sm backdrop-blur transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900/75 dark:text-neutral-300 dark:hover:border-orange-900 dark:hover:bg-orange-950/60 dark:hover:text-orange-300 md:left-3 md:h-10 md:w-10"
                    aria-label="Previous page"
                    title="Previous page"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                    onClick={next}
                    className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/75 text-neutral-600 shadow-sm backdrop-blur transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900/75 dark:text-neutral-300 dark:hover:border-orange-900 dark:hover:bg-orange-950/60 dark:hover:text-orange-300 md:right-3 md:h-10 md:w-10"
                    aria-label="Next page"
                    title="Next page"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
                    </div>

                    {/* Bottom progress bar */}
                    <footer
                className={`absolute inset-x-0 bottom-0 z-20 border-t border-neutral-200/70 bg-white/90 px-4 py-2 backdrop-blur-xl transition-transform duration-300 dark:border-neutral-800/70 dark:bg-neutral-950/90 ${
                    chromeVisible ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <div className="mx-auto flex max-w-3xl items-center gap-3">
                    <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                        {clock}
                    </span>
                    <span className="hidden min-w-0 flex-1 truncate text-xs text-neutral-500 dark:text-neutral-400 sm:block">
                        {chapter || title}
                    </span>
                    <span className="flex-1 sm:hidden" />
                    {page && (
                        <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                            Page {page.current} of {page.total}
                        </span>
                    )}
                    <span className="w-9 shrink-0 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                        {pct}%
                    </span>
                </div>
                    {ready && (
                        <div className="mx-auto mt-1.5 flex max-w-3xl items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={scrubLocation ?? pct}
                                onChange={(event) => setScrubLocation(Number(event.target.value))}
                                onPointerUp={(event) => seekToProgress(Number(event.currentTarget.value) / 100)}
                                onKeyUp={(event) => seekToProgress(Number(event.currentTarget.value) / 100)}
                                className="h-1.5 w-full cursor-pointer accent-orange-500"
                                aria-label="Jump to position"
                                title={locationsGenerated ? 'Drag to jump to a page' : 'Drag to jump to a section'}
                            />
                            <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular-nums text-neutral-400">
                                {scrubLocation !== null
                                    ? `${scrubLocation}%`
                                    : page
                                    ? `${page.current}/${page.total}`
                                    : `${pct}%`}
                            </span>
                        </div>
                    )}
                    </footer>

                    {/* Selected passages can be attached to the dedicated reading companion. */}
                    {selectionText && (
                <div className="absolute bottom-16 left-1/2 z-40 w-[min(94%,600px)] -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="mb-2 line-clamp-2 border-l-2 border-orange-500 pl-2 text-xs italic text-neutral-500 dark:text-neutral-400">
                        “{selectionText}”
                    </p>
                        <div className="mb-2 flex items-center gap-2">
                            <Highlighter className="h-4 w-4 text-neutral-400" />
                            <span className="mr-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">Highlight</span>
                            {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
                                <button
                                    key={color}
                                    onClick={() => addHighlight(color)}
                                    className={`h-6 w-6 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-110 ${HIGHLIGHT_COLORS[color].button}`}
                                    aria-label={`Highlight in ${HIGHLIGHT_COLORS[color].label.toLowerCase()}`}
                                    title={`${HIGHLIGHT_COLORS[color].label} highlight`}
                                />
                            ))}
                        </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={askKumiAboutSelection}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
                        >
                            <Sparkles className="h-4 w-4" />
                            Ask Kumi
                        </button>
                        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                            <Languages className="h-4 w-4 shrink-0 text-orange-500" />
                            <select
                                value={translationLanguage}
                                onChange={(event) => {
                                    resetTranslation();
                                    setTranslationLanguage(event.target.value);
                                }}
                                className="max-w-32 bg-transparent text-xs font-semibold outline-none"
                                aria-label="Translation language"
                            >
                                {TRANSLATION_LANGUAGES.map((language) => (
                                    <option key={language} value={language}>
                                        {language}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            onClick={translateSelection}
                            disabled={translationLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-60 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70"
                        >
                            {translationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                            Translate
                        </button>
                        <button
                            onClick={clearSelection}
                            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    {(translationLoading || translationResult || translationError) && (
                        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                                <Languages className="h-3.5 w-3.5" />
                                Translation to {translationLanguage}
                            </div>
                            {translationLoading && !translationResult ? (
                                <div className="flex items-center gap-2 py-1 text-sm text-neutral-500 dark:text-neutral-400">
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                    Translating...
                                </div>
                            ) : translationError ? (
                                <p className="text-sm text-red-600 dark:text-red-400">{translationError}</p>
                            ) : (
                                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                                    {translationResult}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                    )}

                    {/* TOC drawer */}
                    {tocOpen && (
                <div className="absolute inset-0 z-30">
                    <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" onClick={() => setTocOpen(false)} />
                    <div className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col border-r border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                            <span className="font-display text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
                                Contents
                            </span>
                            <button
                                onClick={() => setTocOpen(false)}
                                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {toc.length === 0 ? (
                                <p className="p-4 text-sm text-neutral-400">No table of contents.</p>
                            ) : (
                                toc.map((item, i) => {
                                    const active = item.href === activeTocHref;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => goTo(item.href)}
                                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                                active
                                                    ? 'bg-orange-50 font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                                                    : 'text-neutral-700 hover:bg-orange-50 hover:text-orange-700 dark:text-neutral-300 dark:hover:bg-orange-950/20 dark:hover:text-orange-300'
                                            }`}
                                            aria-current={active ? 'location' : undefined}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                    active ? 'bg-orange-500' : 'bg-transparent'
                                                }`}
                                            />
                                            <span className="truncate">{item.label?.trim()}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
                    )}

                    {highlightsOpen && (
                <div className="absolute inset-0 z-30">
                    <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" onClick={() => setHighlightsOpen(false)} />
                    <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                            <div>
                                <span className="font-display text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
                                    Highlights
                                </span>
                                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                                    Revisit passages and keep the thought attached.
                                </p>
                            </div>
                            <button
                                onClick={() => setHighlightsOpen(false)}
                                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                                aria-label="Close highlights"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto p-3">
                            {highlights.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-neutral-300 p-5 text-center dark:border-neutral-700">
                                    <Highlighter className="mx-auto h-5 w-5 text-orange-500" />
                                    <p className="mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                                        No highlights yet
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                                        Select a passage in the book, choose a color, then add a note here.
                                    </p>
                                </div>
                            ) : (
                                highlights.map((highlight) => (
                                    <article
                                        key={highlight.cfiRange}
                                        className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
                                    >
                                        <button
                                            onClick={() => goToHighlight(highlight)}
                                            className="block w-full text-left"
                                            title="Jump to highlighted passage"
                                        >
                                            <span
                                                className="mb-2 block h-1 w-10 rounded-full"
                                                style={{ background: HIGHLIGHT_COLORS[highlight.color].value }}
                                            />
                                            <p className="line-clamp-4 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                                                “{highlight.text}”
                                            </p>
                                        </button>
                                        <textarea
                                            value={highlightNoteDrafts[highlight.cfiRange] ?? highlight.note}
                                            onChange={(event) =>
                                                setHighlightNoteDrafts((drafts) => ({
                                                    ...drafts,
                                                    [highlight.cfiRange]: event.target.value,
                                                }))
                                            }
                                            rows={2}
                                            className="mt-3 w-full resize-y rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs leading-5 text-neutral-700 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                                            placeholder="Add a note to remember why this matters..."
                                            aria-label="Highlight note"
                                        />
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => removeHighlight(highlight)}
                                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-neutral-500 transition hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => saveHighlightNote(highlight)}
                                                className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-500"
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                                Save note
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                    )}
                </section>

                {assistantOpen && !isNarrow && (
                    <>
                        <div
                            className="group relative z-30 w-1 shrink-0 cursor-col-resize bg-neutral-200 transition-colors hover:bg-orange-500 dark:bg-neutral-800"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                resizingAssistantRef.current = true;
                                document.body.style.cursor = 'col-resize';
                                document.body.style.userSelect = 'none';
                            }}
                            aria-label="Resize reading companion"
                        >
                            <span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400 group-hover:bg-white" />
                        </div>
                        <div className="relative z-20 h-full shrink-0" style={{ width: assistantWidth }}>
                            <ReaderAssistant
                                bookTitle={title}
                                seed={assistantSeed}
                                onClose={() => setAssistantOpen(false)}
                            />
                        </div>
                    </>
                )}

                {assistantOpen && isNarrow && (
                    <div className="absolute inset-0 z-50 flex justify-end bg-neutral-950/35 backdrop-blur-sm">
                        <div className="h-full w-[min(92vw,400px)] shadow-2xl">
                            <ReaderAssistant
                                bookTitle={title}
                                seed={assistantSeed}
                                onClose={() => setAssistantOpen(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
