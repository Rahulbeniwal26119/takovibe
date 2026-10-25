import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { ArrowDown, CheckCircle2, Circle, Code2, Copy, Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import SingleQuiz from '../SingleQuiz';
import QuizHighlightedCode from '../QuizHighlightedCode';
import { normalizeQuizCode, normalizeQuizOptions, parseFencedQuizCode, type QuizCode, type QuizOption } from '../../lib/quizContent';
import { exitQuizTransaction, shouldExitQuizCode } from './quizExit';

const fieldClass = 'block w-full min-w-0 max-w-full resize-y overflow-y-auto rounded-lg border px-3 py-2 outline-none transition-colors';
const textFieldClass = 'border-neutral-300 bg-white text-sm leading-relaxed text-neutral-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';
const codeFieldClass = 'rounded-none border-0 bg-transparent font-mono text-xs leading-5 text-transparent caret-neutral-100 placeholder:text-neutral-500 focus:ring-0';
const codeLanguages = [
    ['text', 'Plain text'],
    ['bash', 'Bash'],
    ['c', 'C'],
    ['cpp', 'C++'],
    ['csharp', 'C#'],
    ['css', 'CSS'],
    ['go', 'Go'],
    ['html', 'HTML'],
    ['java', 'Java'],
    ['javascript', 'JavaScript'],
    ['json', 'JSON'],
    ['jsx', 'JSX'],
    ['kotlin', 'Kotlin'],
    ['markdown', 'Markdown'],
    ['php', 'PHP'],
    ['python', 'Python'],
    ['ruby', 'Ruby'],
    ['rust', 'Rust'],
    ['sql', 'SQL'],
    ['swift', 'Swift'],
    ['tsx', 'TSX'],
    ['typescript', 'TypeScript'],
    ['yaml', 'YAML'],
] as const;

function QuizTextArea({ value, onChange, placeholder, rows = 2, maxHeight = 192, className = '', onPaste, onKeyDown, onScroll, wrap, code = false }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    maxHeight?: number;
    className?: string;
    onPaste?: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onScroll?: (event: React.UIEvent<HTMLTextAreaElement>) => void;
    wrap?: 'soft' | 'hard' | 'off';
    code?: boolean;
}) {
    const ref = React.useRef<HTMLTextAreaElement>(null);
    const minHeight = code ? Math.max(120, rows * 20 + 18) : Math.max(64, rows * 24 + 18);

    React.useLayoutEffect(() => {
        const resize = () => {
            const field = ref.current;
            if (!field) return;
            field.style.height = 'auto';
            field.style.height = `${Math.min(maxHeight, Math.max(minHeight, field.scrollHeight))}px`;
        };

        resize();
        // Node views can be measured before ProseMirror attaches them to the page.
        const frame = requestAnimationFrame(resize);
        return () => cancelAnimationFrame(frame);
    }, [value, maxHeight, minHeight]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={event => onChange(event.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            onScroll={onScroll}
            rows={rows}
            wrap={wrap}
            placeholder={placeholder}
            spellCheck={code ? false : undefined}
            style={{ minHeight, maxHeight }}
            className={`${fieldClass} ${code ? codeFieldClass : textFieldClass} ${className}`}
        />
    );
}

function QuizCodeEditor({ label, value, onChange, onRemove, onExit }: {
    label: string;
    value: QuizCode;
    onChange: (value: QuizCode) => void;
    onRemove: () => void;
    onExit: () => void;
}) {
    const [customLanguage, setCustomLanguage] = React.useState(false);
    const highlightRef = React.useRef<HTMLPreElement>(null);
    const languageIsListed = codeLanguages.some(([language]) => language === value.language);
    const showCustomLanguage = customLanguage || !languageIsListed;

    const handleCodeScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
        if (!highlightRef.current) return;
        highlightRef.current.scrollTop = event.currentTarget.scrollTop;
        highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const field = event.currentTarget;
        if (shouldExitQuizCode(event.key, event.metaKey, event.ctrlKey, field.selectionStart, field.selectionEnd, field.value.length)) {
            event.preventDefault();
            event.stopPropagation();
            onExit();
        }
    };

    return (
        <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-neutral-200 bg-stone-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                <span className="min-w-0 truncate text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label} code</span>
                <div className="flex shrink-0 items-center gap-2">
                    <select
                        value={showCustomLanguage ? 'custom' : value.language}
                        onChange={event => {
                            if (event.target.value === 'custom') {
                                setCustomLanguage(true);
                            } else {
                                setCustomLanguage(false);
                                onChange({ ...value, language: event.target.value });
                            }
                        }}
                        aria-label={`${label} code language`}
                        className="w-32 max-w-[42vw] rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 sm:w-40"
                    >
                        {codeLanguages.map(([language, name]) => <option key={language} value={language}>{name}</option>)}
                        <option value="custom">Custom language…</option>
                    </select>
                    <button type="button" onClick={onRemove} title="Remove code snippet" aria-label={`Remove ${label} code`} className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
            {showCustomLanguage && (
                <div className="border-b border-neutral-200 bg-stone-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                    <input
                        type="text"
                        value={value.language}
                        onChange={event => onChange({ ...value, language: event.target.value })}
                        onFocus={event => event.target.select()}
                        aria-label={`${label} custom code language`}
                        placeholder="Language name"
                        className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                    />
                </div>
            )}
            <div className="relative min-w-0 max-w-full bg-neutral-950">
                <pre ref={highlightRef} aria-hidden="true" className="quiz-syntax pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre px-3 py-2 font-mono text-xs leading-5 text-neutral-100">
                    <QuizHighlightedCode language={value.language} code={value.code} />
                </pre>
                <QuizTextArea
                    value={value.code}
                    onChange={code => onChange({ ...value, code })}
                    onPaste={event => {
                        const pastedCode = parseFencedQuizCode(event.clipboardData.getData('text/plain'));
                        if (pastedCode) {
                            event.preventDefault();
                            onChange(pastedCode);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onScroll={handleCodeScroll}
                    placeholder="Paste or type code here..."
                    rows={5}
                    maxHeight={256}
                    wrap="off"
                    code
                    className="relative z-10 max-h-64 selection:bg-orange-500/30"
                />
            </div>
            <p className="border-t border-neutral-200 bg-stone-50 px-3 py-1.5 text-[11px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                Down Arrow at the end, or Cmd/Ctrl + Enter, continues below the quiz.
            </p>
        </div>
    );
}

const QuizNodeView = ({ node, updateAttributes, editor, getPos }: any) => {
    const [showPreview, setShowPreview] = React.useState(false);
    const { question = '', correctIndex = 0, explanation = '' } = node.attrs;
    const questionCode = normalizeQuizCode(node.attrs.questionCode);
    const options = normalizeQuizOptions(node.attrs.options);

    const updateOption = (index: number, patch: Partial<QuizOption>) => {
        const next = options.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option);
        updateAttributes({ options: next });
    };

    const addOption = () => updateAttributes({ options: [...options, { text: '' }] });

    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        const next = options.filter((_, optionIndex) => optionIndex !== index);
        const nextCorrectIndex = index === correctIndex ? 0 : index < correctIndex ? correctIndex - 1 : correctIndex;
        updateAttributes({ options: next, correctIndex: nextCorrectIndex });
    };

    const continueBelowQuiz = () => {
        if (typeof getPos !== 'function') return;
        editor.chain().focus().command(({ state, dispatch }: any) => {
            const tr = exitQuizTransaction(state, getPos());
            if (!tr) return false;
            dispatch?.(tr.scrollIntoView());
            return true;
        }).run();
    };

    const handleFencedPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>, onCode: (code: QuizCode) => void) => {
        const code = parseFencedQuizCode(event.clipboardData.getData('text/plain'));
        if (!code) return;
        event.preventDefault();
        onCode(code);
    };

    const handleCopyBlock = () => {
        if (typeof getPos !== 'function') return;
        editor.commands.setNodeSelection(getPos());
        document.execCommand('copy');
    };

    if (!editor.isEditable) {
        return (
            <NodeViewWrapper className="quiz-component not-prose w-full min-w-0 max-w-full">
                <SingleQuiz question={question} questionCode={questionCode} options={options} correctIndex={correctIndex} explanation={explanation} />
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper className="quiz-component not-prose group relative my-4 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:my-8">
            <div className="flex min-w-0 items-center justify-between gap-3 border-b border-neutral-200 bg-stone-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/70 sm:px-5">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Quiz block</p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Multiline answers and code examples</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => setShowPreview(value => !value)} title={showPreview ? 'Edit quiz' : 'Preview quiz'} aria-label={showPreview ? 'Edit quiz' : 'Preview quiz'} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        {showPreview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={handleCopyBlock} title="Copy quiz block" aria-label="Copy quiz block" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <Copy className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {showPreview ? (
                <div className="min-w-0 px-4 py-1 sm:px-5">
                    <SingleQuiz question={question} questionCode={questionCode} options={options} correctIndex={correctIndex} explanation={explanation} />
                </div>
            ) : (
                <div className="min-w-0 space-y-6 p-4 sm:p-5">
                    <section className="min-w-0">
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Question</label>
                        <QuizTextArea
                            value={question}
                            onChange={value => updateAttributes({ question: value })}
                            onPaste={event => handleFencedPaste(event, code => updateAttributes({ questionCode: code }))}
                            placeholder="Enter your question here..."
                            rows={3}
                        />
                        {questionCode ? (
                            <QuizCodeEditor label="Question" value={questionCode} onChange={value => updateAttributes({ questionCode: value })} onRemove={() => updateAttributes({ questionCode: null })} onExit={continueBelowQuiz} />
                        ) : (
                            <button type="button" onClick={() => updateAttributes({ questionCode: { language: 'text', code: '' } })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30">
                                <Code2 className="h-4 w-4" /> Add code example
                            </button>
                        )}
                    </section>

                    <section className="min-w-0 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Options</h4>
                        {options.map((option, index) => (
                            <div key={index} className="min-w-0 max-w-full rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                                <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                                    <button type="button" onClick={() => updateAttributes({ correctIndex: index })} className={`inline-flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold ${index === correctIndex ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'text-neutral-500 hover:bg-stone-50 dark:hover:bg-neutral-900'}`} aria-label={`Mark option ${String.fromCharCode(65 + index)} as correct`}>
                                        {index === correctIndex ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                                        Option {String.fromCharCode(65 + index)} {index === correctIndex ? '· Correct' : ''}
                                    </button>
                                    <button type="button" onClick={() => removeOption(index)} disabled={options.length <= 2} title="Remove option" aria-label={`Remove option ${String.fromCharCode(65 + index)}`} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <QuizTextArea
                                    value={option.text}
                                    onChange={text => updateOption(index, { text })}
                                    onPaste={event => handleFencedPaste(event, code => updateOption(index, { code }))}
                                    placeholder={`Write option ${String.fromCharCode(65 + index)}...`}
                                />
                                {normalizeQuizCode(option.code) ? (
                                    <QuizCodeEditor label={`Option ${String.fromCharCode(65 + index)}`} value={normalizeQuizCode(option.code)!} onChange={code => updateOption(index, { code })} onRemove={() => updateOption(index, { code: null })} onExit={continueBelowQuiz} />
                                ) : (
                                    <button type="button" onClick={() => updateOption(index, { code: { language: 'text', code: '' } })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30">
                                        <Code2 className="h-4 w-4" /> Add code example
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addOption} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30">
                            <Plus className="h-4 w-4" /> Add option
                        </button>
                    </section>

                    <section className="min-w-0">
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Explanation <span className="font-normal normal-case">(shown after an answer)</span></label>
                        <QuizTextArea value={explanation} onChange={value => updateAttributes({ explanation: value })} placeholder="Explain why the answer is correct..." rows={3} />
                    </section>
                </div>
            )}

            <div className="flex min-w-0 items-center justify-between gap-3 border-t border-neutral-200 bg-stone-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/70 sm:px-5">
                <span className="min-w-0 text-[11px] text-neutral-500 dark:text-neutral-400">Paste fenced code into any question or option field.</span>
                <button type="button" onClick={continueBelowQuiz} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30">
                    Continue below <ArrowDown className="h-3.5 w-3.5" />
                </button>
            </div>
        </NodeViewWrapper>
    );
};

export default QuizNodeView;
