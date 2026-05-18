import React, { useState, useEffect, useRef, useMemo, type FC, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html as langHtml } from '@codemirror/lang-html';
import { css as langCss } from '@codemirror/lang-css';
import { javascript as langJs } from '@codemirror/lang-javascript';
import { python as langPython } from '@codemirror/lang-python';
import { rust as langRust } from '@codemirror/lang-rust';
import { go as langGo } from '@codemirror/lang-go';
import { autocompletion } from '@codemirror/autocomplete';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { Play, RotateCcw, Box, Check, Loader2, GripVertical, Terminal, Eye, Trash2, Zap, ZapOff, Save, Keyboard, Sparkles, X, ChevronRight, CheckCircle2, AlertCircle, Diff as DiffIcon, ChevronDown, Monitor, BugPlay, Activity, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { vim } from '@replit/codemirror-vim';
import 'highlight.js/styles/github-dark.css';
import { fetchWithAuth } from '../../utils/api';
import { showToast } from '../../utils/toast';
import { diffLines, type Change } from 'diff';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { ExecutionTimeline } from './ExecutionTimeline';

const DiffView = ({ original, modified, explanation, onAccept, onReject }: { original: string, modified: string, explanation?: string, onAccept: () => void, onReject: () => void }) => {
    const changes = diffLines(original, modified);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key === 'Escape') {
                e.preventDefault();
                onReject();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onAccept();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onAccept, onReject]);

    return (
        <div className="absolute inset-0 z-50 bg-white dark:bg-[#0d1117] flex flex-col animate-in fade-in duration-200">
            {/* Diff Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-orange-100/50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-orange-900 dark:text-orange-100 uppercase tracking-wider">Review Fix</span>

                    {/* Confidence Badge */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                        <Sparkles size={10} fill="currentColor" />
                        High Confidence
                    </div>

                    <div className="h-4 w-px bg-orange-200 dark:bg-orange-800 mx-1" />

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-mono">- Original</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-mono">+ Modified</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onReject}
                        className="group flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
                        title="Shift + Esc"
                    >
                        Reject
                    </button>
                    <button
                        onClick={onAccept}
                        className="group flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-green-900/20 transition-all active:scale-95"
                        title="Cmd + Enter"
                    >
                        <Check size={14} className="stroke-[3px]" />
                        Accept Fix
                        <span className="hidden sm:inline-block font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-white/90 group-hover:bg-black/30 transition-colors">⌘⏎</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* Explanation Sidebar */}
                {explanation && (
                    <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 overflow-y-auto p-4">
                        <div className="flex items-center gap-2 mb-3 text-orange-600 dark:text-orange-400">
                            <Sparkles size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">Kumi's Insight</span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-neutral-600 dark:prose-p:text-neutral-300 prose-code:text-orange-600 dark:prose-code:text-orange-400 prose-ul:pl-4 prose-li:my-1">
                            <ReactMarkdown>{explanation}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Diff Content */}
                <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-white dark:bg-[#0d1117]">
                    {changes.map((part, i) => {
                        const color = part.added ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                            part.removed ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 decoration-line-through opacity-70' :
                                'text-neutral-500 dark:text-neutral-400';
                        return (
                            <div key={i} className={`${color} whitespace-pre-wrap break-all px-2 border-l-2 ${part.added ? 'border-green-500' : part.removed ? 'border-red-500' : 'border-transparent'}`}>
                                {part.value}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};



interface LogEntry {
    type: 'log' | 'warn' | 'error' | 'info';
    message: string;
    timestamp: number;
}

interface EmbedPlaygroundProps {
    initialHtml?: string;
    initialCss?: string;
    initialJs?: string;
    initialCode?: string;
    initialLanguage?: string;
    isEditable?: boolean;
    title?: string;
    theme?: 'light' | 'dark' | 'system';
    rounded?: boolean;
    showVim?: boolean;
    showIdeTips?: boolean;
    siteUrl?: string;
}

const SUPPORTED_LANGUAGES = [
    { value: 'html', label: 'HTML/Web' },
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'Node.js' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
];

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${active
            ? 'bg-white dark:bg-neutral-700 text-orange-600 dark:text-orange-400 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
    >
        {Icon && <Icon size={14} />}
        {label}
    </button>
);

export const EmbedPlayground: React.FC<EmbedPlaygroundProps> = ({
    initialHtml = '',
    initialCss = '',
    initialJs = '',
    initialCode = '',
    initialLanguage = 'html',
    isEditable = true,
    title = 'Code Playground',
    theme = 'system',
    rounded = true,
    showVim = false,
    showIdeTips = true,
    siteUrl = 'https://takovibe.com',
}) => {
    // Default code templates
    const DEFAULT_CODE: Record<string, string> = {
        python: `def main():\n    print("Hello from Python!")\n\nif __name__ == "__main__":\n    main()`,
        javascript: `console.log("Hello from NodeJS!");\n\nconst add = (a, b) => a + b;\nconsole.log("2 + 3 =", add(2, 3));`,
        go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n}`,
        rust: `fn main() {\n    println!("Hello from Rust!");\n}`,
        html: `<h1>Hello World</h1>`
    };

    // Mode: 'web' (HTML/CSS/JS) or 'backend' (Python, etc.)
    const [mode, setMode] = useState<'web' | 'backend'>(initialLanguage === 'html' ? 'web' : 'backend');
    const [view, setView] = useState<EditorView | null>(null);

    // Local configuration toggles mapped to iframe props initially
    const [localShowVim, setLocalShowVim] = useState(showVim);
    const [localShowIdeTips, setLocalShowIdeTips] = useState(showIdeTips);

    // State for WEB editor inputs
    const [html, setHtml] = useState(initialHtml || DEFAULT_CODE.html);
    const [css, setCss] = useState(initialCss);
    const [js, setJs] = useState(initialJs);

    // State for BACKEND editor inputs
    const [backendCode, setBackendCode] = useState(initialCode || DEFAULT_CODE[initialLanguage] || '');
    const [backendLanguage, setBackendLanguage] = useState(initialLanguage === 'html' ? 'python' : initialLanguage);

    // State for preview execution
    const [previewHtml, setPreviewHtml] = useState(initialHtml);
    const [previewCss, setPreviewCss] = useState(initialCss);
    const [previewJs, setPreviewJs] = useState(initialJs);
    const [runId, setRunId] = useState(0); // For iframe remount

    // UI and control states
    const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
    const [activeOutput, setActiveOutput] = useState<'preview' | 'console'>('console');
    const [autoRun, setAutoRun] = useState(mode === 'web');
    const [isSystemDark, setIsSystemDark] = useState(false);
    
    // Customization Props Mapping
    const isDark = theme === 'dark' || (theme === 'system' && isSystemDark);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [autoComplete, setAutoComplete] = useState(false);

    // Initial load for persistence
    useEffect(() => {
        const savedVim = localStorage.getItem('editor_vim_mode');
        if (savedVim !== null) { /* ... */ }

        const savedAuto = localStorage.getItem('editor_autocomplete');
        if (savedAuto !== null) setAutoComplete(savedAuto === 'true');
    }, []);

    // Inline AI Fix State
    const [fixingErrorIndex, setFixingErrorIndex] = useState<number | null>(null); // Index of error being fixed
    const [aiFixData, setAiFixData] = useState<Record<number, { loading: boolean, content?: string, extractedCode?: string }>>({});
    const [reviewingFixIndex, setReviewingFixIndex] = useState<number | null>(null); // State for visual diff review

    // Debug / Visual Execution State
    const [debugTrace, setDebugTrace] = useState<any[] | null>(null);
    const [debugStep, setDebugStep] = useState(0);

    const extractCodeBlock = (markdown: string): string | null => {
        // Find all code blocks
        const matches = [...markdown.matchAll(/```(?:\w+)?\s+([\s\S]*?)```/g)];
        if (matches.length > 0) {
            // Return the content of the LAST matched block
            return matches[matches.length - 1][1].trim();
        }
        return null;
    };

    const handleApplyFix = (code: string, index: number) => {
        if (mode === 'backend') {
            setBackendCode(code);
        } else {
            // For web mode, simplistic check for now
            const langMatch = aiFixData[index]?.content?.match(/```(\w+)\s+/);
            const lang = langMatch ? langMatch[1] : '';

            if (lang === 'html') setHtml(code);
            else if (lang === 'css') setCss(code);
            else setJs(code); // default to js
        }

        setReviewingFixIndex(null);
        closeFix(index);
    };

    const handleAskKumi = async (errorMsg: string, index: number) => {
        if (aiFixData[index]?.loading) return;

        setFixingErrorIndex(index);
        setAiFixData(prev => ({ ...prev, [index]: { loading: true } }));

        try {
            const codeContext = `Code:\n\`\`\`${mode === 'web' ? 'html' : backendLanguage}\n${getCurrentValue()}\n\`\`\`\n\nError:\n${errorMsg}`;

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'user', content: "I'm getting this error. \n1. Briefly explain the fix in bullet points (Issue: ... Fix: ...).\n2. Add a line at the end: 'Why this matters: [explanation]'.\n3. finally provide the COMPLETE FULL FILE CONTENT in a markdown code block.\n\nIMPORTANT: Return the ENTIRE file with the fix applied. DO NOT return fragments, snippets, or placeholders like '// ... rest of code'. The response must be a valid, complete, and executable file.\n\n" + codeContext, mode: 'debug' }
                    ],
                    mode: 'debug'
                })
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                result += chunk;

                // Real-time extraction
                const extracted = extractCodeBlock(result);
                setAiFixData(prev => ({ ...prev, [index]: { loading: true, content: result, extractedCode: extracted || undefined } }));
            }

            const finalExtracted = extractCodeBlock(result);

            // Remove code blocks from the explanation text to avoid duplication
            const cleanExplanation = result.replace(/```[\s\S]*?```/g, '').trim();

            setAiFixData(prev => ({
                ...prev,
                [index]: {
                    loading: false,
                    content: cleanExplanation || "Fix generated.", // Use clean explanation 
                    extractedCode: finalExtracted || undefined
                }
            }));

            if (finalExtracted) {
                setReviewingFixIndex(index);
            }

        } catch (e) {
            console.error(e);
            setAiFixData(prev => ({ ...prev, [index]: { loading: false, content: "**Error getting fix.** Please try again." } }));
        }
    };

    const closeFix = (index: number) => {
        setAiFixData(prev => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    // Resizing state
    const [topPanelHeight, setTopPanelHeight] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    // Initial Setup from props
    useEffect(() => {
        if (initialLanguage && initialLanguage !== 'html') {
            setMode('backend');
            setBackendLanguage(initialLanguage);
            setBackendCode(initialCode || DEFAULT_CODE[initialLanguage] || '');
            // Use console output for backend
            setActiveOutput('console');
            setAutoRun(false); // Disable auto-run for backend by default
        }
    }, [initialLanguage, initialCode]);

    // Detect Dark Mode
    useEffect(() => {
        if (theme === 'system') {
            if (document.documentElement.classList.contains('dark')) setIsSystemDark(true);
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        setIsSystemDark(document.documentElement.classList.contains('dark'));
                    }
                });
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            return () => observer.disconnect();
        } else {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [theme]);

    // Effect: Handle Auto-Run (Only for Web Mode)
    useEffect(() => {
        if (!autoRun || mode !== 'web') return;

        const timeout = setTimeout(() => {
            setPreviewHtml(html);
            setPreviewCss(css);
            setPreviewJs(js);
        }, 800);

        return () => clearTimeout(timeout);
    }, [html, css, js, autoRun, mode]);

    // Listen for messages from iframe (console logs)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'console') {
                setLogs(prev => [...prev, {
                    type: event.data.level,
                    message: event.data.args,
                    timestamp: Date.now()
                }]);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Global Shortcut: Cmd/Ctrl + Enter to Run
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleRun();
            }
        };
        // Use capture phase to intercept before CodeMirror
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [html, css, js, backendCode, mode, backendLanguage]);

    // Auto-scroll console to bottom on new logs
    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);
    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
        setTopPanelHeight(Math.min(Math.max(newHeight, 20), 80)); // Clamp between 20% and 80%
    };

    const stopResize = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
    };


    const handleRun = async (debugMode = false) => {

        setLogs([]);
        setDebugTrace(null); // Clear previous trace

        if (mode === 'web') {
            setPreviewHtml(html);
            setPreviewCss(css);
            setPreviewJs(js);
            setRunId(prev => prev + 1); // Force remount
            setActiveOutput('preview');
        } else {
            // Backend Execution
            setIsRunning(true);
            setActiveOutput('console');

            try {
                // Route through the secure SSR proxy — token stays server-side
                const params = new URLSearchParams({
                    language: backendLanguage,
                    code: btoa(unescape(encodeURIComponent(backendCode)))
                });

                const response = await fetch(`/api/embed-execute?${params.toString()}`, {
                    method: 'GET'
                });

                const result = await response.json();

                if (result.stdout) {
                    setLogs(prev => [...prev, { type: 'log', message: result.stdout, timestamp: Date.now() }]);
                }
                if (result.stderr) {
                    setLogs(prev => [...prev, { type: 'error', message: result.stderr, timestamp: Date.now() }]);
                }
                if (result.error) {
                    setLogs(prev => [...prev, { type: 'error', message: `System Error: ${result.error}`, timestamp: Date.now() }]);
                }

                // Handle Trace Data
                if (result.trace && Array.isArray(result.trace)) {
                    setDebugTrace(result.trace);
                    setDebugStep(0);
                }

                if (!result.stdout && !result.stderr && !result.error && !result.trace) {
                    setLogs(prev => [...prev, { type: 'info', message: 'Program executed successfully with no output.', timestamp: Date.now() }]);
                }

            } catch (error: any) {
                setLogs(prev => [...prev, {
                    type: 'error',
                    message: `Execution Failed: ${error.message || 'Unknown error'}`,
                    timestamp: Date.now()
                }]);
            } finally {
                setIsRunning(false);
            }
        }
    };

    const extensions = useMemo(() => {
        const exts = [];

        if (localShowIdeTips) {
            exts.push(autocompletion());
        }

        if (localShowVim) {
            exts.push(vim());
        }

        exts.push(EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                handleChange(update.state.doc.toString());
            }
        }));

        if (mode === 'backend') {
            if (backendLanguage === 'python') return [...exts, langPython()];
            if (backendLanguage === 'rust') return [...exts, langRust()];
            if (backendLanguage === 'go') return [...exts, langGo()];
            if (backendLanguage === 'javascript') return [...exts, langJs()];
            return [...exts];
        }

        if (activeTab === 'html') return [...exts, langHtml()];
        if (activeTab === 'css') return [...exts, langCss()];
        return [...exts, langJs()];
    }, [mode, backendLanguage, activeTab, localShowVim, localShowIdeTips]);

    const getCurrentValue = () => {
        if (mode === 'backend') return backendCode;
        if (activeTab === 'html') return html;
        if (activeTab === 'css') return css;
        return js;
    };

    const handleChange = (value: string) => {
        if (mode === 'backend') setBackendCode(value);
        else if (activeTab === 'html') setHtml(value);
        else if (activeTab === 'css') setCss(value);
        else setJs(value);
    };

    // Construct preview source for WEB mode
    const srcDoc = (() => {
        const isFullDoc = /^\s*<!DOCTYPE/i.test(previewHtml) || /^\s*<html /i.test(previewHtml);

        const consoleScript = `
                    <script>
                        (function() {
                    const send = (type, args) => {
                        try {
                            const message = args.map(arg => {
                                if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
                        return String(arg);
                            }).join(' ');
                        window.parent.postMessage({type: 'console', level: type, args: message }, '*');
                        } catch (e) { }
                    };
                        const originalLog = console.log;
                        const originalWarn = console.warn;
                        const originalError = console.error;
                        const originalInfo = console.info;
                    console.log = (...args) => {originalLog.apply(console, args); send('log', args); };
                    console.warn = (...args) => {originalWarn.apply(console, args); send('warn', args); };
                    console.error = (...args) => {originalError.apply(console, args); send('error', args); };
                    console.info = (...args) => {originalInfo.apply(console, args); send('info', args); };
                        window.onerror = function(msg, url, line) {send('error', [msg]); return false; };
                })();
                    </script>
                    `;

        const executionScript = `
                    <script>
                        try {${previewJs} } catch (e) {console.error(e.message); }
                    </script>
                    `;

        if (isFullDoc) {
            let doc = previewHtml;
            if (doc.includes('<head>')) doc = doc.replace('<head>', '<head>' + consoleScript);
            else if (doc.includes('<body>')) doc = doc.replace('<body>', '<body>' + consoleScript);
            else doc = consoleScript + doc;

            if (doc.includes('</body>')) doc = doc.replace('</body>', executionScript + '</body>');
            else doc = doc + executionScript;

            return doc;
        }

        return `
                        <!DOCTYPE html>
                        <html>
                            <head>
                                <style>
                                    body {font - family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 1rem; margin: 0; }
                                    ${previewCss}
                                </style>
                                ${consoleScript}
                            </head>
                            <body>
                                ${previewHtml}
                                ${executionScript}
                            </body>
                        </html>
                        `;
    })();

    return (
        <div className={`flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900 not-prose relative ${rounded ? 'rounded-xl' : 'rounded-none'}`} style={{ height: '100%', minHeight: '400px' }}>
            {/* Diff View Overlay */}
            {reviewingFixIndex !== null && aiFixData[reviewingFixIndex]?.extractedCode && (
                <DiffView
                    original={getCurrentValue()}
                    modified={aiFixData[reviewingFixIndex].extractedCode!}
                    explanation={aiFixData[reviewingFixIndex].content}
                    onAccept={() => handleApplyFix(aiFixData[reviewingFixIndex].extractedCode!, reviewingFixIndex)}
                    onReject={() => setReviewingFixIndex(null)}
                />
            )}

            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden relative">
                        <button
                            onClick={() => setShowShortcuts(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X size={18} />
                        </button>

                        <div className="p-5">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                <Keyboard size={20} className="text-purple-600" />
                                Keyboard Shortcuts
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">General</h4>
                                    <div className="grid gap-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">Run Code</span>
                                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">Ctrl + Enter</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <div className="flex items-center gap-4">
                    {/* Modern Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                            className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 transition-all shadow-sm group"
                        >
                            <span className="capitalize">{SUPPORTED_LANGUAGES.find(l => l.value === (mode === 'web' ? 'html' : backendLanguage))?.label}</span>
                            <ChevronDown size={14} className={`text-gray-400 group-hover:text-purple-500 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showLanguageMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setShowLanguageMenu(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
                                    <div className="p-1.5">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
                                            Platform
                                        </div>
                                        <button
                                            onClick={() => {
                                                setMode('web');
                                                setActiveOutput('console');
                                                setShowLanguageMenu(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-all ${mode === 'web'
                                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${mode === 'web' ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                <span>HTML / Web</span>
                                            </div>
                                            {mode === 'web' && <Check size={14} className="text-purple-600 dark:text-purple-400" />}
                                        </button>

                                        <div className="my-1.5 border-t border-gray-100 dark:border-gray-800" />

                                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
                                            Backend
                                        </div>
                                        <div className="grid grid-cols-1 gap-0.5">
                                            {SUPPORTED_LANGUAGES.filter(l => l.value !== 'html').map(lang => {
                                                const isActive = mode === 'backend' && backendLanguage === lang.value;
                                                return (
                                                    <button
                                                        key={lang.value}
                                                        onClick={() => {
                                                            setMode('backend');
                                                            setBackendLanguage(lang.value);
                                                            const newDefault = DEFAULT_CODE[lang.value] || '';
                                                            if (!backendCode || Object.values(DEFAULT_CODE).some(c => c.trim() === backendCode.trim()) || mode === 'web') {
                                                                setBackendCode(newDefault);
                                                            }
                                                            setActiveOutput('console');
                                                            setAutoRun(false);
                                                            setShowLanguageMenu(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${isActive
                                                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                            <span>{lang.label}</span>
                                                        </div>
                                                        {isActive && <Check size={14} className="text-purple-600 dark:text-purple-400" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Web Mode Tabs */}
                    {mode === 'web' && (
                        <div className="flex items-center bg-gray-200 dark:bg-gray-900 p-1 rounded-lg">
                            <TabButton active={activeTab === 'html'} onClick={() => setActiveTab('html')} label="HTML" />
                            <TabButton active={activeTab === 'css'} onClick={() => setActiveTab('css')} label="CSS" />
                            <TabButton active={activeTab === 'js'} onClick={() => setActiveTab('js')} label="JS" />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Optionally visible toggles based on iframe props config */}
                    {showVim && (
                        <button
                            onClick={() => setLocalShowVim(!localShowVim)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${localShowVim ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                            title={localShowVim ? "Disable Vim Mode" : "Enable Vim Mode"}
                        >
                            <span className="font-bold font-mono text-xs">VIM</span>
                        </button>
                    )}
                    
                    {showIdeTips && (
                        <button
                            onClick={() => setLocalShowIdeTips(!localShowIdeTips)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${localShowIdeTips ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                            title={localShowIdeTips ? "Disable IDE Tips" : "Enable IDE Tips"}
                        >
                            <Cpu size={14} className={localShowIdeTips ? 'text-purple-500' : ''} />
                            <span className="hidden sm:inline">IDE Tips</span>
                        </button>
                    )}
                    
                    <div className="flex items-center rounded-lg shadow-sm">
                        <button
                            onClick={() => handleRun(false)}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg`}
                        >
                            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                            Run
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Container - Vertical Layout */}
            <div ref={containerRef} className="flex flex-col flex-1 relative min-h-0">
                {/* Editor Pane (Top) */}
                <div
                    className="flex flex-col relative overflow-hidden bg-white dark:bg-[#0d1117]"
                    style={{ flex: `0 0 ${topPanelHeight}%` }}
                >
                    <div className="h-full overflow-auto">
                        <CodeMirror
                            value={getCurrentValue()}
                            height="100%"
                            theme={isDark ? githubDark : githubLight}
                            extensions={extensions}
                            onChange={handleChange}
                            onCreateEditor={setView}
                            className="h-full text-base"
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: true,
                                highlightActiveLine: true,
                                autocompletion: autoComplete,
                                bracketMatching: true,
                                closeBrackets: true,
                            }}
                        />
                    </div>
                </div>

                {/* Resizer Handle (Horizontal) */}
                <div
                    className="flex h-2 items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-purple-500/20 dark:hover:bg-purple-400/20 cursor-row-resize transition-colors z-20 shrink-0 border-y border-gray-200 dark:border-gray-700"
                    onMouseDown={startResize}
                >
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>

                {/* Output Pane (Bottom) */}
                <div
                    className={`flex flex-col relative bg-white dark:bg-gray-900 flex-1 min-h-0 ${isDragging ? 'pointer-events-none' : ''}`}
                >
                    {debugTrace ? (
                        <div className="flex-1 min-h-0">
                            <ExecutionTimeline
                                trace={debugTrace}
                                onStepChange={setDebugStep}
                                onClose={() => setDebugTrace(null)}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Output Tabs Header */}
                            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                                {mode === 'web' && (
                                    <button
                                        onClick={() => setActiveOutput('preview')}
                                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border-r border-gray-200 dark:border-gray-700 ${activeOutput === 'preview'
                                            ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 border-b-2 border-b-purple-500'
                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <Eye size={14} /> Preview
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveOutput('console')}
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border-r border-gray-200 dark:border-gray-700 ${activeOutput === 'console'
                                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white' + (mode === 'backend' ? ' border-b-2 border-b-purple-500' : '')
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <Terminal size={14} /> {mode === 'web' ? 'Console' : 'Output'}
                                    {logs.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-mono">
                                            {logs.length}
                                        </span>
                                    )}
                                </button>
                                <div className="flex-1" />
                                {(activeOutput === 'console' || mode === 'backend') && (
                                    <button
                                        onClick={() => setLogs([])}
                                        className="mr-2 p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        title="Clear Console"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Output Content Body */}
                            <div className="flex-1 relative overflow-hidden">
                                {/* Preview Iframe */}
                                <iframe
                                    key={runId}
                                    title="Preview"
                                    srcDoc={srcDoc}
                                    className={`absolute inset-0 w-full h-full bg-white transition-opacity duration-200 ${activeOutput === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                    sandbox="allow-scripts allow-modals"
                                />
                                <div className={`absolute inset-0 w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 font-mono text-sm p-4 flex flex-col gap-2 transition-opacity duration-200 ${activeOutput === 'console' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                    {logs.length === 0 ? (
                                        <div className="text-gray-400 dark:text-gray-500 italic text-center mt-10 select-none">
                                            {isRunning ? 'Running...' : (mode === 'backend' ? 'Run code to see output' : 'No logs yet...')}
                                        </div>
                                    ) : (
                                        <>
                                            {logs.map((log, i) => (
                                                <div key={i} className={`group flex flex-col gap-1 border-b border-gray-200 dark:border-gray-800 pb-1 last:border-0 ${log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                                                    log.type === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                                                        'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    <div className="flex gap-2">
                                                        <span className="opacity-40 select-none">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                                                        <span className="flex-1 whitespace-pre-wrap break-words font-mono text-xs">{log.type === 'error' ? '✗ ' : '> '}{log.message}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={consoleEndRef} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Embedded Watermark */}
                <div className="absolute bottom-3 right-4 z-50">
                    <a 
                        href={siteUrl}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-md rounded-full text-[10px] font-bold text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-200 dark:border-gray-700 transition-all hover:scale-105"
                    >
                        <Sparkles size={10} className="text-purple-500" />
                        Powered by TakoVibe
                    </a>
                </div>
            </div >
        </div >
    );
};
