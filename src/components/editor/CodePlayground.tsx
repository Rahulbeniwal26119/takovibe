
import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html as langHtml } from '@codemirror/lang-html';
import { css as langCss } from '@codemirror/lang-css';
import { javascript as langJs } from '@codemirror/lang-javascript';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { Play, RotateCcw, Box, Check, Loader2, GripVertical, Terminal, Eye, Trash2, Zap, ZapOff } from 'lucide-react';

interface LogEntry {
    type: 'log' | 'warn' | 'error' | 'info';
    message: string;
    timestamp: number;
}

interface CodePlaygroundProps {
    initialHtml: string;
    initialCss: string;
    initialJs: string;
    onSave?: (html: string, css: string, js: string) => void;
    isEditable?: boolean;
    title?: string;
    saveStatus?: 'saved' | 'saving';
}

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
    initialHtml,
    initialCss,
    initialJs,
    onSave,
    isEditable = true,
    title = 'Code Playground',
    saveStatus = 'saved'
}) => {
    // State for editor inputs
    const [html, setHtml] = useState(initialHtml);
    const [css, setCss] = useState(initialCss);
    const [js, setJs] = useState(initialJs);

    // State for preview execution
    const [previewHtml, setPreviewHtml] = useState(initialHtml);
    const [previewCss, setPreviewCss] = useState(initialCss);
    const [previewJs, setPreviewJs] = useState(initialJs);
    const [runId, setRunId] = useState(0); // For iframe remount

    // UI and control states
    const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
    const [activeOutput, setActiveOutput] = useState<'preview' | 'console'>('preview');
    const [autoRun, setAutoRun] = useState(true);
    const [isDark, setIsDark] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Resizing state
    const [leftPanelWidth, setLeftPanelWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Effect: Handle Auto-Run
    useEffect(() => {
        if (!autoRun) return;

        const timeout = setTimeout(() => {
            setPreviewHtml(html);
            setPreviewCss(css);
            setPreviewJs(js);
            // Verify if we need to clear logs on auto-run? Maybe not to avoid flickering but usually a fresh run clears logs.
            // setLogs([]); // Optional: clear logs on auto-run?
        }, 800);

        return () => clearTimeout(timeout);
    }, [html, css, js, autoRun]);

    // Effect: Report changes upstream
    useEffect(() => {
        if (onSave) {
            onSave(html, css, js);
        }
    }, [html, css, js, onSave]);


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
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        setLeftPanelWidth(Math.min(Math.max(newWidth, 20), 80)); // Clamp between 20% and 80%
    };

    const stopResize = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
    };


    const handleRun = () => {
        setPreviewHtml(html);
        setPreviewCss(css);
        setPreviewJs(js);
        setLogs([]);
        setRunId(prev => prev + 1); // Force remount
        setActiveOutput('preview');
    };

    const handleReset = () => {
        setHtml(initialHtml);
        setCss(initialCss);
        setJs(initialJs);
        setPreviewHtml(initialHtml);
        setPreviewCss(initialCss);
        setPreviewJs(initialJs);
        setLogs([]);
        setRunId(prev => prev + 1);
    };

    const getExtensions = () => {
        if (activeTab === 'html') return [langHtml()];
        if (activeTab === 'css') return [langCss()];
        return [langJs()];
    };

    const getCurrentValue = () => {
        if (activeTab === 'html') return html;
        if (activeTab === 'css') return css;
        return js;
    };

    const handleChange = (value: string) => {
        if (activeTab === 'html') setHtml(value);
        else if (activeTab === 'css') setCss(value);
        else setJs(value);
    };

    // Construct preview source
    const srcDoc = `
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 1rem; margin: 0; }
                    ${previewCss}
                </style>
                <script>
                    (function() {
                        const send = (type, args) => {
                            try {
                                const message = args.map(arg => {
                                    if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
                                    return String(arg);
                                }).join(' ');
                                window.parent.postMessage({ type: 'console', level: type, args: message }, '*');
                            } catch (e) {
                                // Ignore cross-origin errors
                            }
                        };

                        const originalLog = console.log;
                        const originalWarn = console.warn;
                        const originalError = console.error;
                        const originalInfo = console.info;

                        console.log = (...args) => { originalLog.apply(console, args); send('log', args); };
                        console.warn = (...args) => { originalWarn.apply(console, args); send('warn', args); };
                        console.error = (...args) => { originalError.apply(console, args); send('error', args); };
                        console.info = (...args) => { originalInfo.apply(console, args); send('info', args); };
                        
                        window.onerror = function(msg, url, line) {
                            send('error', [msg]);
                            return false;
                        };
                    })();
                </script>
            </head>
            <body>
                ${previewHtml}
                <script>
                    try {
                        ${previewJs}
                    } catch (e) {
                        console.error(e.message);
                    }
                </script>
            </body>
        </html>
    `;

    return (
        <div className="my-8 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900 not-prose">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Box size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
                    </div>

                    {/* Tab Buttons */}
                    <div className="flex items-center bg-gray-200 dark:bg-gray-900 p-1 rounded-lg">
                        <TabButton active={activeTab === 'html'} onClick={() => setActiveTab('html')} label="HTML" />
                        <TabButton active={activeTab === 'css'} onClick={() => setActiveTab('css')} label="CSS" />
                        <TabButton active={activeTab === 'js'} onClick={() => setActiveTab('js')} label="JS" />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRun(!autoRun)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${autoRun ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-500 hover:bg-gray-200'}`}
                        title={autoRun ? 'Auto-run enabled' : 'Auto-run disabled'}
                    >
                        {autoRun ? <Zap size={14} fill="currentColor" /> : <ZapOff size={14} />}
                        <span className="hidden sm:inline">{autoRun ? 'Auto' : 'Manual'}</span>
                    </button>

                    <button
                        onClick={handleRun}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm active:translate-y-0.5"
                    >
                        <Play size={12} fill="currentColor" /> Run
                    </button>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Reset Code"
                    >
                        <RotateCcw size={12} /> Reset
                    </button>
                </div>
            </div>

            {/* Content */}
            <div ref={containerRef} className="flex flex-col lg:flex-row h-[500px] relative">
                {/* Editor Pane (Left/Top) */}
                <div
                    className="flex flex-col relative overflow-hidden bg-white dark:bg-[#0d1117]"
                    style={{ width: `100%`, flex: `0 0 ${leftPanelWidth}%` }}
                >
                    <CodeMirror
                        value={getCurrentValue()}
                        height="100%"
                        theme={isDark ? githubDark : githubLight}
                        extensions={getExtensions()}
                        onChange={handleChange}
                        className="h-full font-mono text-sm"
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                            autocompletion: true,
                            bracketMatching: true,
                            closeBrackets: true,
                        }}
                    />
                    {isEditable && (
                        <div className="absolute bottom-2 right-4 z-10 text-[10px] bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none border border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                            {saveStatus === 'saving' ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                                    <span className="text-purple-500">Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3 h-3 text-green-500" />
                                    <span className="text-gray-400">Saved</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Resizer Handle */}
                <div
                    className="hidden lg:flex w-2 items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-purple-500/20 dark:hover:bg-purple-400/20 cursor-col-resize transition-colors z-20"
                    onMouseDown={startResize}
                >
                    <GripVertical size={12} className="text-gray-400 select-none" />
                </div>

                {/* Output Pane (Right/Bottom) */}
                <div
                    className={`flex flex-col h-full relative bg-white dark:bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 ${isDragging ? 'pointer-events-none' : ''}`}
                    style={{ flex: 1 }}
                >
                    {/* Output Tabs */}
                    <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <button
                            onClick={() => setActiveOutput('preview')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border-r border-gray-200 dark:border-gray-700 ${activeOutput === 'preview'
                                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-b-2 border-b-purple-500'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <Eye size={14} /> Preview
                        </button>
                        <button
                            onClick={() => setActiveOutput('console')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border-r border-gray-200 dark:border-gray-700 ${activeOutput === 'console'
                                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <Terminal size={14} /> Console
                            {logs.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-mono">
                                    {logs.length}
                                </span>
                            )}
                        </button>
                        <div className="flex-1" />
                        {activeOutput === 'console' && (
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
                        <div className={`absolute inset-0 w-full h-full transition-opacity duration-200 ${activeOutput === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            <iframe
                                key={runId}
                                srcDoc={srcDoc}
                                title="Code Preview"
                                className="w-full h-full border-0 bg-white"
                                sandbox="allow-scripts allow-modals"
                            />
                        </div>
                        <div className={`absolute inset-0 w-full h-full overflow-y-auto bg-gray-900 font-mono text-xs p-4 flex flex-col gap-2 transition-opacity duration-200 ${activeOutput === 'console' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            {logs.length === 0 ? (
                                <div className="text-gray-500 italic text-center mt-10">No logs yet...</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className={`flex gap-2 border-b border-gray-800 pb-1 last:border-0 ${log.type === 'error' ? 'text-red-400' :
                                        log.type === 'warn' ? 'text-yellow-400' :
                                            'text-gray-300'
                                        }`}>
                                        <span className="opacity-50 select-none">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
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
