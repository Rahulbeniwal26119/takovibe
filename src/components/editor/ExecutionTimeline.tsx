import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronRight, ChevronDown, RefreshCw, X, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface TraceStep {
    line: number;
    locals: Record<string, any>;
    globals: Record<string, any>;
    event: string;
    stdout?: string;
    func?: string;

    stack?: { name: string; line: number; locals?: Record<string, any>; filename?: string }[];
}

interface ExecutionTimelineProps {
    trace: TraceStep[];
    onStepChange: (stepIndex: number) => void;
    onClose: () => void;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ trace, onStepChange, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(800); // ms per step
    const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'state' | 'history'>('state');

    // Reset selected frame when step changes
    useEffect(() => {
        setSelectedFrameIndex(null);
    }, [currentStep]);

    // Derived state
    const maxSteps = trace.length - 1;

    // Safety check for empty trace
    const step = trace[currentStep] || {} as TraceStep;
    // Backward compatibility handles: 'locals' might be 'vars' in old traces
    const currentLocals = step.locals || (step as any).vars || {};
    const currentGlobals = step.globals || {};
    const currentStdout = step.stdout || "";
    const currentFunc = step.func || "<module>";
    const currentStack = step.stack || [];

    // Use selected frame's locals if available, otherwise default to top frame locas
    const activeLocals = (selectedFrameIndex !== null && currentStack[selectedFrameIndex]?.locals)
        ? currentStack[selectedFrameIndex].locals!
        : currentLocals;

    // Auto-play logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && currentStep < maxSteps) {
            interval = setInterval(() => {
                setCurrentStep(prev => {
                    const next = prev + 1;
                    if (next >= maxSteps) setIsPlaying(false);
                    return next;
                });
            }, speed);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, maxSteps, speed]);

    // Sync with parent
    useEffect(() => {
        onStepChange(currentStep);
    }, [currentStep, onStepChange]);

    const handleStep = (val: number) => {
        const next = Math.min(Math.max(val, 0), maxSteps);
        setCurrentStep(next);
        setIsPlaying(false); // Pause on manual interaction
    };

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-[#0d1117] border-t border-gray-200 dark:border-gray-800">

            {/* Header / Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        Debugger
                    </span>

                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

                    {/* Playback Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleStep(0)}
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                            title="Restart"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            onClick={() => handleStep(currentStep - 1)}
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-30"
                            disabled={currentStep === 0}
                        >
                            <SkipBack size={16} fill="currentColor" />
                        </button>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30 transition-all active:scale-95 mx-1"
                        >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button
                            onClick={() => handleStep(currentStep + 1)}
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-30"
                            disabled={currentStep === maxSteps}
                        >
                            <SkipForward size={16} fill="currentColor" />
                        </button>
                    </div>

                    {/* Step Counter */}
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        Step <span className="text-gray-900 dark:text-white font-bold">{currentStep + 1}</span> / {trace.length}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Speed Control (Simple) */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 hidden sm:flex">
                        <span>Speed:</span>
                        {[2000, 800, 200].map(s => (
                            <button
                                key={s}
                                onClick={() => setSpeed(s)}
                                className={`px-2 py-0.5 rounded ${speed === s ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                {s === 2000 ? 'Slow' : s === 800 ? 'Normal' : 'Fast'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
                {/* Timeline Slider Area */}
                <div className="w-full px-6 py-4 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                    <input
                        type="range"
                        min={0}
                        max={maxSteps}
                        value={currentStep}
                        onChange={(e) => handleStep(parseInt(e.target.value))}
                        className="w-full accent-purple-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        <span>Start</span>
                        <span>Execution Flow</span>
                        <span>End</span>
                    </div>
                </div>

                {/* Variable Inspector */}
                <div className="w-full sm:w-[400px] bg-slate-50 dark:bg-black/20 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 flex flex-col border-l border-gray-100 dark:border-gray-800">

                    {/* Console Output (Mini) */}
                    <div className="shrink-0 p-4 border-b border-gray-100 dark:border-gray-800 bg-black text-white font-mono text-xs overflow-y-auto max-h-[100px] min-h-[60px]">
                        <div className="opacity-50 mb-1 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1">
                            <Terminal size={10} /> Terminal Output
                        </div>
                        <div className="whitespace-pre-wrap break-all opacity-80">{currentStdout || <span className="text-gray-600 italic">No output...</span>}</div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex border-b border-gray-200 dark:border-gray-800">
                        <button
                            onClick={() => setActiveTab('state')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'state' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            State Inspector
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'history' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Execution History
                        </button>
                    </div>

                    {activeTab === 'state' ? (
                        <>
                            {/* Call Stack - New Feature */}
                            {currentStack.length > 0 && (
                                <>
                                    <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shadow-sm/50">
                                        <h4 className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Call Stack</h4>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {currentStack.map((frame, i) => {
                                            const isSelected = selectedFrameIndex === i || (selectedFrameIndex === null && i === 0);
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSelectedFrameIndex(i); setIsPlaying(false); }}
                                                    className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${isSelected
                                                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/30'
                                                        : 'bg-white dark:bg-gray-800 border-transparent opacity-60 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-750'
                                                        }`}
                                                >
                                                    <div className="flex flex-col">
                                                        <div className={`font-mono text-xs font-bold ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                                            {frame.name}()
                                                        </div>
                                                        {isSelected && <div className="text-[10px] text-purple-500 font-medium">Viewing Locals</div>}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        Line {frame.line}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Scope: Function Name (Legacy/Fallback) */}
                            {currentFunc !== '<module>' && currentStack.length === 0 && (
                                <div className="shrink-0 px-4 py-2 bg-purple-100 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800/50 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                    <div className="w-4 h-4 flex items-center justify-center rounded bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100">ƒ</div>
                                    {currentFunc}()
                                </div>
                            )}

                            {/* Locals */}
                            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shadow-sm/50">
                                <h4 className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Local Variables</h4>
                            </div>
                            <div className="p-2 space-y-1">
                                {Object.keys(activeLocals).length === 0 ? (
                                    <div className="text-center py-4 text-gray-400 text-sm italic">
                                        No local variables in scope
                                    </div>
                                ) : (
                                    Object.entries(activeLocals).map(([key, value]) => (
                                        <div key={key} className="group flex items-start gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                            <div className="mt-0.5 font-mono text-xs font-bold text-purple-600 dark:text-purple-400 min-w-[3rem]">
                                                {key}
                                            </div>
                                            <div className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                                                {JSON.stringify(value)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Globals */}
                            {Object.keys(currentGlobals).length > 0 && (
                                <>
                                    <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10 px-4 py-2 border-b border-gray-100 dark:border-gray-800 border-t mt-2 shadow-sm/50">
                                        <h4 className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Global Variables</h4>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {Object.entries(currentGlobals).map(([key, value]) => (
                                            <div key={key} className="group flex items-start gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                                <div className="mt-0.5 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[3rem]">
                                                    {key}
                                                </div>
                                                <div className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                                                    {JSON.stringify(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="space-y-1">
                                {trace.map((t, i) => {
                                    const stackDepth = (t.stack?.length || 1) - 1;
                                    const isCurrent = i === currentStep;
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => { handleStep(i); setIsPlaying(false); }}
                                            className={`w-full text-left py-1.5 px-2 rounded font-mono text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isCurrent ? 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-800' : ''}`}
                                            style={{ paddingLeft: `${Math.max(4, stackDepth * 12)}px` }}
                                        >
                                            <div className={`flex items-center gap-2 ${isCurrent ? 'text-purple-700 dark:text-purple-300 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                                                <div className="w-4 text-[10px] opacity-50 text-right">{i + 1}</div>
                                                <div className="truncate flex-1">
                                                    {t.event === 'call' && <span className="text-blue-500 font-bold">→ </span>}
                                                    {t.event === 'return' && <span className="text-green-500 font-bold">← </span>}
                                                    {t.func}()
                                                    <span className="opacity-50 ml-2">L{t.line}</span>
                                                </div>
                                            </div>

                                            {isCurrent && t.locals && Object.keys(t.locals).length > 0 && (
                                                <div className="mt-1.5 ml-6 p-2 bg-white/50 dark:bg-black/20 rounded border border-purple-100 dark:border-purple-800/50 text-[10px] text-gray-500 dark:text-gray-400">
                                                    {Object.entries(t.locals).map(([k, v]) => (
                                                        <div key={k} className="flex gap-2">
                                                            <span className="text-purple-600 dark:text-purple-400 font-bold">{k}:</span>
                                                            <span className="truncate">{JSON.stringify(v)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
