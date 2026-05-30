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
import { ShareButton } from './ShareButton';
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
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider">
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

interface CodePlaygroundProps {
    initialHtml?: string;
    initialCss?: string;
    initialJs?: string;
    initialCode?: string;
    initialLanguage?: string;
    onSave?: (html: string, css: string, js: string) => void;
    isEditable?: boolean;
    title?: string;
    saveStatus?: 'saved' | 'saving';
    onDelete?: () => void;
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

// Component Definition
export const CodePlayground: React.FC<CodePlaygroundProps> = ({
    initialHtml = '',
    initialCss = '',
    initialJs = '',
    initialCode = '',
    initialLanguage = 'html',
    onSave,
    isEditable = true,
    title = 'Code Playground',
    saveStatus = 'saved',
    onDelete
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
    const [isDark, setIsDark] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [vimMode, setVimMode] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [autoComplete, setAutoComplete] = useState(false);

    // Initial load for persistence
    useEffect(() => {
        const savedVim = localStorage.getItem('editor_vim_mode');
        if (savedVim !== null) setVimMode(savedVim === 'true');

        const savedAuto = localStorage.getItem('editor_autocomplete');
        if (savedAuto !== null) setAutoComplete(savedAuto === 'true');
    }, []);

    // Save persistence
    useEffect(() => {
        localStorage.setItem('editor_vim_mode', vimMode.toString());
    }, [vimMode]);

    useEffect(() => {
        localStorage.setItem('editor_autocomplete', autoComplete.toString());
    }, [autoComplete]);

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

        showToast("Fix applied successfully!", "success");
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
    const [topPanelHeight, setTopPanelHeight] = useState(60);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const editorMinHeight = '24rem';

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
        const isDarkMode = document.documentElement.classList.contains('dark');
        setIsDark(isDarkMode);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

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

            // Prevent Ctrl+W from closing tab (Best Effort)
            // Note: Most browsers block this for security, but it may work in PWA/App mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                e.stopPropagation();
                console.log("Ctrl+W intercepted");
            }
        };
        // Use capture phase to intercept before CodeMirror
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [html, css, js, backendCode, mode, backendLanguage]);

    // Resizing Logic
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
        // Check Authentication First
        const token = localStorage.getItem('access_token');
        if (!token) {
            const event = new CustomEvent('show-login-prompt', {
                detail: {
                    feature: 'Code Playground',
                    message: 'Please log in to run code.'
                }
            });
            window.dispatchEvent(event);
            return;
        }

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
                // Assuming execution-engine API is proxied or available
                // Adjust URL based on actual setup (e.g., localhost:9001 if local, or via /api proxy)
                // Use internal Astro API proxy which handles auth and connects to execution engine
                const EXEC_API_URL = '/api/execute';

                const response = await fetchWithAuth(EXEC_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: backendLanguage,
                        code: backendCode,
                        debug: debugMode // Pass debug flag
                    })
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
                    // Automatically switch to Visual Mode if trace exists
                    showToast("Debug trace captured! Visualizing...", "success");
                } else if (debugMode) {
                    showToast("No trace data generated.", "info");
                }

                if (!result.stdout && !result.stderr && !result.error && !result.trace) {
                    setLogs(prev => [...prev, { type: 'info', message: 'Program executed successfully with no output.', timestamp: Date.now() }]);
                }

            } catch (error: any) {
                if (error.message === 'Unauthorized') {
                    // Login prompt will show, don't log system error
                    setIsRunning(false);
                    return;
                }
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

    const handleReset = () => {
        if (mode === 'web') {
            setHtml(initialHtml || DEFAULT_CODE.html);
            setCss(initialCss);
            setJs(initialJs);
            setPreviewHtml(initialHtml || DEFAULT_CODE.html);
            setPreviewCss(initialCss);
            setPreviewJs(initialJs);
        } else {
            setBackendCode(initialCode || DEFAULT_CODE[backendLanguage] || '');
        }
        setLogs([]);
        setRunId(prev => prev + 1);
    };

    const extensions = useMemo(() => {
        const exts = [];

        if (autoComplete) {
            exts.push(autocompletion());
        }

        if (vimMode) {
            exts.push(vim());
        }

        // Highlight Active Debug Line logic (using EditorSelection for simplicity)
        // Note: Ideally we'd use a decorations extension, but selection is a decent proxy for "focus"

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
    }, [mode, backendLanguage, activeTab, vimMode, autoComplete]);

    // Effect: Highlight Active Debug Line
    useEffect(() => {
        if (!view || !debugTrace || !debugTrace[debugStep]) return;

        try {
            const line = debugTrace[debugStep].line;
            const doc = view.state.doc;

            // Validate line number
            if (line < 1 || line > doc.lines) return;

            const lineInfo = doc.line(line);

            // Create selection and scroll effect
            // We select the whole line or just the start to indicator position
            view.dispatch({
                selection: EditorSelection.single(lineInfo.from),
                effects: [
                    EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
                    // We could add a special line decoration here but selection is the MVP request
                ]
            });
        } catch (e) {
            console.error("Error updating debug selection:", e);
        }
    }, [debugStep, debugTrace, view]);

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
        // If user writes a full HTML document, use it directly but inject script logic
        // This is a simple check; for production, a more robust parser might be needed
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
            // Inject scripts into the user's document
            let doc = previewHtml;
            // Inject console script at the top of head, or body if head missing
            if (doc.includes('<head>')) doc = doc.replace('<head>', '<head>' + consoleScript);
            else if (doc.includes('<body>')) doc = doc.replace('<body>', '<body>' + consoleScript);
            else doc = consoleScript + doc;

            // Inject execution script at end of body
            if (doc.includes('</body>')) doc = doc.replace('</body>', executionScript + '</body>');
            else doc = doc + executionScript;

            return doc;
        }

        // Standard wrapper
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
        <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 not-prose">
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

            {/* Visual Execution Timeline */}


            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md overflow-hidden relative">
                        <button
                            onClick={() => setShowShortcuts(false)}
                            className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                            <X size={18} />
                        </button>

                        <div className="p-5">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                                <Keyboard size={20} className="text-orange-600" />
                                Keyboard Shortcuts
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">General</h4>
                                    <div className="grid gap-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-700 dark:text-neutral-300">Run Code</span>
                                            <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700">Ctrl + Enter</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Review Mode</h4>
                                    <div className="grid gap-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-700 dark:text-neutral-300">Accept Fix</span>
                                            <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700">Ctrl + Enter</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-700 dark:text-neutral-300">Reject Fix</span>
                                            <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700">Shift + Esc</span>
                                        </div>
                                    </div>
                                </div>

                                {vimMode && (
                                    <div>
                                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Vim Mode</h4>
                                        <div className="grid gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                            <div className="flex justify-between">
                                                <span>Normal Mode</span>
                                                <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">Esc</code>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Insert Mode</span>
                                                <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">i</code>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Save (Mock)</span>
                                                <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">:w</code>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-800 px-5 py-3 text-xs text-center text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-700">
                            Press <span className="font-bold">Esc</span> to close this guide
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-stone-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900/80 shrink-0">
                <div className="flex items-center gap-4">
                    {/* Modern Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                            className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200 hover:text-orange-600 dark:hover:text-orange-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-white dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-lg px-3 py-1.5 transition-all shadow-sm group"
                        >
                            <span className="capitalize">{SUPPORTED_LANGUAGES.find(l => l.value === (mode === 'web' ? 'html' : backendLanguage))?.label}</span>
                            <ChevronDown size={14} className={`text-neutral-400 group-hover:text-orange-500 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showLanguageMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setShowLanguageMenu(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
                                    <div className="p-1.5">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                                            Platform
                                        </div>
                                        {/* Web / HTML */}
                                        <button
                                            onClick={() => {
                                                setMode('web');
                                                setActiveOutput('console');
                                                setShowLanguageMenu(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-all ${mode === 'web'
                                                ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${mode === 'web' ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                                                <span>HTML / Web</span>
                                            </div>
                                            {mode === 'web' && <Check size={14} className="text-orange-600 dark:text-orange-400" />}
                                        </button>

                                        <div className="my-1.5 border-t border-neutral-100 dark:border-neutral-800" />

                                        <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
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
                                                            // Keep code if it matches default or if switching modes, otherwise preserve user code if desirable (logic can vary)
                                                            // Here we just ensure we have code
                                                            if (!backendCode || Object.values(DEFAULT_CODE).some(c => c.trim() === backendCode.trim()) || mode === 'web') {
                                                                setBackendCode(newDefault);
                                                            }
                                                            setActiveOutput('console');
                                                            setAutoRun(false);
                                                            setShowLanguageMenu(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${isActive
                                                            ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                                                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                                                            <span>{lang.label}</span>
                                                        </div>
                                                        {isActive && <Check size={14} className="text-orange-600 dark:text-orange-400" />}
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
                        <div className="flex items-center bg-neutral-200 dark:bg-neutral-900 p-1 rounded-lg">
                            <TabButton active={activeTab === 'html'} onClick={() => setActiveTab('html')} label="HTML" />
                            <TabButton active={activeTab === 'css'} onClick={() => setActiveTab('css')} label="CSS" />
                            <TabButton active={activeTab === 'js'} onClick={() => setActiveTab('js')} label="JS" />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {mode === 'web' && (
                        <button
                            onClick={() => setAutoRun(!autoRun)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${autoRun ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                            title={autoRun ? 'Auto-run enabled' : 'Auto-run disabled'}
                        >
                            {autoRun ? <Activity size={14} className="animate-pulse" /> : <ZapOff size={14} />}
                            <span className="hidden sm:inline">{autoRun ? 'Auto' : 'Manual'}</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowShortcuts(true)}
                        className="p-1.5 rounded-md text-neutral-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                        title="Keyboard Shortcuts"
                    >
                        <Keyboard size={16} />
                    </button>

                    <button
                        onClick={() => setVimMode(!vimMode)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${vimMode ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                        title={vimMode ? 'Vim Mode enabled' : 'Vim Mode disabled'}
                    >
                        <span className="font-bold font-mono text-xs">VIM</span>
                        <span className="hidden sm:inline">Vim</span>
                    </button>

                    <button
                        onClick={() => setAutoComplete(!autoComplete)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${autoComplete ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                        title={autoComplete ? 'Auto-complete enabled' : 'Auto-complete disabled'}
                    >
                        <Cpu size={14} className={autoComplete ? 'text-orange-500' : ''} />
                        <span className="hidden sm:inline">IDE Tips</span>
                    </button>

                    <ShareButton code={getCurrentValue()} lang={mode === 'web' ? 'html' : backendLanguage} />

                    {/* Run Button Group */}
                    <div className="flex items-center rounded-lg shadow-sm">
                        <button
                            onClick={() => handleRun(false)}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'backend' && backendLanguage === 'python' ? 'rounded-l-lg' : 'rounded-lg'}`}
                        >
                            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                            Run
                        </button>

                        {/* Debug Split Button (Only for Python for now) */}
                        {mode === 'backend' && backendLanguage === 'python' && (
                            <button
                                onClick={() => handleRun(true)}
                                disabled={isRunning}
                                className="px-2 py-1.5 bg-orange-700 hover:bg-orange-800 text-white/90 border-l border-orange-800 rounded-r-lg transition-all active:scale-95 disabled:opacity-50"
                                title="Debug (Visual Execution)"
                            >
                                <BugPlay size={14} />
                            </button>
                        )}

                        {/* If not python, complete the rounded corners for run button */}
                        {!(mode === 'backend' && backendLanguage === 'python') && (
                            <div className="w-0" />
                        )}
                    </div>

                    {/* Future Save Button */}
                    {/*
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 transition-colors"
                        title="Save Snippet (Coming Soon)"
                        onClick={() => showToast("Saving to snippets... (Demo)", "success")}
                    >
                        <Save size={12} /> Save
                    </button>
                    */}
                </div>
            </div>

            {/* Content Container - Vertical Layout */}
            <div ref={containerRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Editor Pane (Top) */}
                <div
                    className="relative flex flex-col overflow-hidden bg-white dark:bg-neutral-950"
                    style={{ flex: `0 0 ${topPanelHeight}%`, minHeight: editorMinHeight }}
                >
                    <div className="h-full overflow-auto">
                        <CodeMirror
                            value={getCurrentValue()}
                            height="100%"
                            minHeight={editorMinHeight}
                            theme={isDark ? githubDark : githubLight}
                            extensions={extensions}
                            onChange={handleChange}
                            onCreateEditor={setView}
                            className="h-full text-base [&_.cm-editor]:h-full [&_.cm-editor]:rounded-none [&_.cm-gutters]:border-r-neutral-200 dark:[&_.cm-gutters]:border-r-neutral-800 [&_.cm-scroller]:font-mono"
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
                    className="flex h-2 items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-500/20 dark:hover:bg-orange-400/20 cursor-row-resize transition-colors z-20 shrink-0 border-y border-neutral-200 dark:border-neutral-700"
                    onMouseDown={startResize}
                >
                    <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                </div>

                {/* Output Pane (Bottom) */}
                <div
                    className={`flex flex-col relative bg-white dark:bg-neutral-900 flex-1 min-h-0 ${isDragging ? 'pointer-events-none' : ''}`}
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
                            <div className="flex items-center border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
                                {mode === 'web' && (
                                    <button
                                        onClick={() => setActiveOutput('preview')}
                                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border-r border-neutral-200 dark:border-neutral-700 ${activeOutput === 'preview'
                                            ? 'bg-white dark:bg-neutral-900 text-orange-600 dark:text-orange-400 border-b-2 border-b-orange-500'
                                            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                            }`}
                                    >
                                        <Eye size={14} /> Preview
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveOutput('console')}
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border-r border-neutral-200 dark:border-neutral-700 ${activeOutput === 'console'
                                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white' + (mode === 'backend' ? ' border-b-2 border-b-orange-500' : '')
                                        : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    <Terminal size={14} /> {mode === 'web' ? 'Console' : 'Output'}
                                    {logs.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-[10px] font-mono">
                                            {logs.length}
                                        </span>
                                    )}
                                </button>
                                <div className="flex-1" />
                                {(activeOutput === 'console' || mode === 'backend') && (
                                    <button
                                        onClick={() => setLogs([])}
                                        className="mr-2 p-1.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
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
                                <div className={`absolute inset-0 w-full h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900 font-mono text-sm p-4 flex flex-col gap-2 transition-opacity duration-200 ${activeOutput === 'console' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                    {logs.length === 0 ? (
                                        <div className="text-neutral-400 dark:text-neutral-500 italic text-center mt-10 select-none">
                                            {isRunning ? 'Running...' : (mode === 'backend' ? 'Run code to see output' : 'No logs yet...')}
                                        </div>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div key={i} className={`group flex flex-col gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-1 last:border-0 ${log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                                                log.type === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                                                    'text-neutral-700 dark:text-neutral-300'
                                                }`}>
                                                <div className="flex gap-2">
                                                    <span className="opacity-40 select-none">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                                                    <span className="flex-1 whitespace-pre-wrap break-all">{'> '}{log.message}</span>
                                                </div>
                                                {/* Ask Kumi / Inline Fix */}
                                                {log.type === 'error' && (
                                                    <div className="mt-2 pl-6">
                                                        {!aiFixData[i] ? (
                                                            <button
                                                                onClick={() => handleAskKumi(log.message, i)}
                                                                className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] uppercase tracking-wider font-bold rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Sparkles size={10} />
                                                                Ask Kumi to Fix
                                                            </button>
                                                        ) : (
                                                            <div className="relative rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                                {/* Header */}
                                                                <div className="flex items-center justify-between px-3 py-2 bg-orange-100/50 dark:bg-orange-900/30 border-b border-orange-100 dark:border-orange-800/50">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="p-1 bg-orange-500 rounded text-white">
                                                                            <Sparkles size={12} fill="currentColor" />
                                                                        </div>
                                                                        <span className="text-xs font-bold text-orange-900 dark:text-orange-100 uppercase tracking-wider">As per Kumi</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {aiFixData[i].extractedCode && !aiFixData[i].loading && (
                                                                            <button
                                                                                onClick={() => setReviewingFixIndex(i)}
                                                                                className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors animate-in fade-in zoom-in duration-300"
                                                                            >
                                                                                <DiffIcon size={12} />
                                                                                Review Fix
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => closeFix(i)}
                                                                            className="text-orange-400 hover:text-orange-700 dark:hover:text-orange-200 transition-colors"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Content */}
                                                                <div className="p-4 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:bg-neutral-800 prose-pre:text-white prose-code:text-orange-600 dark:prose-code:text-orange-300">
                                                                    {aiFixData[i].loading && !aiFixData[i].content ? (
                                                                        <div className="flex items-center gap-2 text-orange-500">
                                                                            <Loader2 size={16} className="animate-spin" />
                                                                            <span className="text-xs font-medium">Analyzing error...</span>
                                                                        </div>
                                                                    ) : (
                                                                        <ReactMarkdown
                                                                            remarkPlugins={[remarkGfm]}
                                                                            rehypePlugins={[rehypeHighlight]}
                                                                        >
                                                                            {aiFixData[i].content || ""}
                                                                        </ReactMarkdown>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div >
        </div >
    );
};
