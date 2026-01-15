import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html as langHtml } from '@codemirror/lang-html';
import { css as langCss } from '@codemirror/lang-css';
import { javascript as langJs } from '@codemirror/lang-javascript';
import { python as langPython } from '@codemirror/lang-python';
import { rust as langRust } from '@codemirror/lang-rust';
import { go as langGo } from '@codemirror/lang-go';
import { autocompletion } from '@codemirror/autocomplete';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { Play, RotateCcw, Box, Check, Loader2, GripVertical, Terminal, Eye, Trash2, Zap, ZapOff, Save } from 'lucide-react';
import { fetchWithAuth } from '../../utils/api';
import { showToast } from '../../utils/toast';

interface LogEntry {
    type: 'log' | 'warn' | 'error' | 'info';
    message: string;
    timestamp: number;
}

interface CodePlaygroundProps {
    initialHtml?: string;
    initialCss?: string;
    initialJs?: string;
    initialCode?: string; // Generic code input
    initialLanguage?: string; // Generic language input
    onSave?: (html: string, css: string, js: string) => void;
    isEditable?: boolean;
    title?: string;
    saveStatus?: 'saved' | 'saving';
}

const SUPPORTED_LANGUAGES = [
    { value: 'html', label: 'HTML/Web' },
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'Node.js' },
    // { value: 'go', label: 'Go' }, // Disabled for now until engine support confirmed
    // { value: 'rust', label: 'Rust' },
];

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${active
            ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
    >
        {Icon && <Icon size={14} />}
        {label}
    </button>
);

export const CodePlayground: React.FC<CodePlaygroundProps> = ({
    initialHtml = '',
    initialCss = '',
    initialJs = '',
    initialCode = '',
    initialLanguage = 'html',
    onSave,
    isEditable = true,
    title = 'Code Playground',
    saveStatus = 'saved'
}) => {
    // Mode: 'web' (HTML/CSS/JS) or 'backend' (Python, etc.)
    const [mode, setMode] = useState<'web' | 'backend'>(initialLanguage === 'html' ? 'web' : 'backend');

    // State for WEB editor inputs
    const [html, setHtml] = useState(initialHtml || '<h1>Hello World</h1>');
    const [css, setCss] = useState(initialCss);
    const [js, setJs] = useState(initialJs);

    // State for BACKEND editor inputs
    const [backendCode, setBackendCode] = useState(initialCode);
    const [backendLanguage, setBackendLanguage] = useState(initialLanguage === 'html' ? 'python' : initialLanguage);

    // State for preview execution
    const [previewHtml, setPreviewHtml] = useState(initialHtml);
    const [previewCss, setPreviewCss] = useState(initialCss);
    const [previewJs, setPreviewJs] = useState(initialJs);
    const [runId, setRunId] = useState(0); // For iframe remount

    // UI and control states
    const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
    const [activeOutput, setActiveOutput] = useState<'preview' | 'console'>('preview');
    const [autoRun, setAutoRun] = useState(mode === 'web');
    const [isDark, setIsDark] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    // Resizing state
    const [topPanelHeight, setTopPanelHeight] = useState(60);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial Setup from props
    useEffect(() => {
        if (initialLanguage && initialLanguage !== 'html') {
            setMode('backend');
            setBackendLanguage(initialLanguage);
            setBackendCode(initialCode || '');
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
        };
        // Use capture phase to intercept before CodeMirror
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
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


    const handleRun = async () => {
        setLogs([]);
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
                const EXEC_API_URL = 'http://localhost:9001/execute'; // Direct for dev, or use proxy

                const response = await fetch(EXEC_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: backendLanguage,
                        code: backendCode
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
                if (!result.stdout && !result.stderr && !result.error) {
                    setLogs(prev => [...prev, { type: 'info', message: 'Program executed successfully with no output.', timestamp: Date.now() }]);
                }

            } catch (error) {
                setLogs(prev => [...prev, {
                    type: 'error',
                    message: `Failed to connect to execution engine. Ensure it's running on port 9001. Error: ${error}`,
                    timestamp: Date.now()
                }]);
            } finally {
                setIsRunning(false);
            }
        }
    };

    const handleReset = () => {
        if (mode === 'web') {
            setHtml(initialHtml);
            setCss(initialCss);
            setJs(initialJs);
            setPreviewHtml(initialHtml);
            setPreviewCss(initialCss);
            setPreviewJs(initialJs);
        } else {
            setBackendCode(initialCode);
        }
        setLogs([]);
        setRunId(prev => prev + 1);
    };

    const getExtensions = () => {
        const extensions = [autocompletion()]; // Enable auto-complete

        if (mode === 'backend') {
            if (backendLanguage === 'python') return [...extensions, langPython()];
            if (backendLanguage === 'rust') return [...extensions, langRust()];
            if (backendLanguage === 'go') return [...extensions, langGo()];
            if (backendLanguage === 'javascript') return [...extensions, langJs()];
            return [...extensions];
        }

        if (activeTab === 'html') return [...extensions, langHtml()];
        if (activeTab === 'css') return [...extensions, langCss()];
        return [...extensions, langJs()];
    };

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
        const isFullDoc = /^\s*<!DOCTYPE/i.test(previewHtml) || /^\s*<html/i.test(previewHtml);

        const consoleScript = `
            <script>
                (function() {
                    const send = (type, args) => {
                        try {
                            const message = args.map(arg => {
                                if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
                                return String(arg);
                            }).join(' ');
                            window.parent.postMessage({ type: 'console', level: type, args: message }, '*');
                        } catch (e) {}
                    };
                    const originalLog = console.log;
                    const originalWarn = console.warn;
                    const originalError = console.error;
                    const originalInfo = console.info;
                    console.log = (...args) => { originalLog.apply(console, args); send('log', args); };
                    console.warn = (...args) => { originalWarn.apply(console, args); send('warn', args); };
                    console.error = (...args) => { originalError.apply(console, args); send('error', args); };
                    console.info = (...args) => { originalInfo.apply(console, args); send('info', args); };
                    window.onerror = function(msg, url, line) { send('error', [msg]); return false; };
                })();
            </script>
        `;

        const executionScript = `
            <script>
                try { ${previewJs} } catch (e) { console.error(e.message); }
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
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 1rem; margin: 0; }
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
        <div className="flex flex-col h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900 not-prose">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <div className="flex items-center gap-4">
                    {/* Language/Mode Selector */}
                    <div className="relative">
                        <select
                            value={mode === 'web' ? 'html' : backendLanguage}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'html') {
                                    setMode('web');
                                    setActiveOutput('preview');
                                } else {
                                    setMode('backend');
                                    setBackendLanguage(val);
                                    setActiveOutput('console');
                                    setAutoRun(false);
                                }
                            }}
                            className="bg-gray-200 dark:bg-gray-700 border-none text-xs font-bold rounded-md px-2 py-1.5 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                        >
                            {SUPPORTED_LANGUAGES.map(l => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>
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
                    {mode === 'web' && (
                        <button
                            onClick={() => setAutoRun(!autoRun)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${autoRun ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-500 hover:bg-gray-200'}`}
                            title={autoRun ? 'Auto-run enabled' : 'Auto-run disabled'}
                        >
                            {autoRun ? <Zap size={14} fill="currentColor" /> : <ZapOff size={14} />}
                            <span className="hidden sm:inline">{autoRun ? 'Auto' : 'Manual'}</span>
                        </button>
                    )}

                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-colors shadow-sm active:translate-y-0.5 ${isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                        {isRunning ? 'Running...' : (
                            <>
                                <span>Run</span>
                                <span className="ml-1 text-[10px] opacity-60 font-mono hidden sm:inline" title="Cmd/Ctrl + Enter">
                                    (⌘↵)
                                </span>
                            </>
                        )}
                    </button>

                    {/* Future Save Button */}
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-colors"
                        title="Save Snippet (Coming Soon)"
                        onClick={() => showToast("Saving to snippets... (Demo)", "success")}
                    >
                        <Save size={12} /> Save
                    </button>
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
                            extensions={getExtensions()}
                            onChange={handleChange}
                            className="h-full text-base"
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: true,
                                highlightActiveLine: true,
                                autocompletion: true,
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
                    {/* Output Tabs */}
                    <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                        {mode === 'web' && (
                            <button
                                onClick={() => setActiveOutput('preview')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border-r border-gray-200 dark:border-gray-700 ${activeOutput === 'preview'
                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-b-2 border-b-purple-500'
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

                    {/* Output Content */}
                    <div className="flex-1 relative overflow-hidden">
                        {mode === 'web' && (
                            <div className={`absolute inset-0 w-full h-full transition-opacity duration-200 ${activeOutput === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                <iframe
                                    key={runId}
                                    srcDoc={srcDoc}
                                    title="Code Preview"
                                    className="w-full h-full border-0 bg-white ring-1 ring-gray-200 dark:ring-gray-800"
                                    sandbox="allow-scripts allow-modals"
                                />
                            </div>
                        )}
                        <div className={`absolute inset-0 w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 font-mono text-sm p-4 flex flex-col gap-2 transition-opacity duration-200 ${activeOutput === 'console' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            {logs.length === 0 ? (
                                <div className="text-gray-400 dark:text-gray-500 italic text-center mt-10 select-none">
                                    {isRunning ? 'Running...' : (mode === 'backend' ? 'Run code to see output' : 'No logs yet...')}
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className={`flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1 last:border-0 ${log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                                        log.type === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-gray-700 dark:text-gray-300'
                                        }`}>
                                        <span className="opacity-40 select-none">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                                        <span className="flex-1 whitespace-pre-wrap break-all">{'> '}{log.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
