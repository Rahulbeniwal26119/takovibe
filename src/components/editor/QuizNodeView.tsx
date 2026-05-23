import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Trash2, Plus, CheckCircle2, Circle, Copy } from 'lucide-react';

const QuizNodeView = ({ node, updateAttributes, editor, getPos }) => {
    const { question, options, correctIndex } = node.attrs;

    const isEditable = editor.isEditable;

    const [selectedOption, setSelectedOption] = React.useState(null);
    const [isSubmitted, setIsSubmitted] = React.useState(false);

    const handleQuestionChange = (e) => {
        if (!isEditable) return;
        updateAttributes({ question: e.target.value });
    };

    const handleOptionChange = (index, value) => {
        if (!isEditable) return;
        const newOptions = [...options];
        newOptions[index] = value;
        updateAttributes({ options: newOptions });
    };

    const addOption = () => {
        if (!isEditable) return;
        updateAttributes({ options: [...options, `Option ${options.length + 1}`] });
    };

    const removeOption = (index) => {
        if (!isEditable) return;
        const newOptions = options.filter((_, i) => i !== index);
        // Adjust correctIndex if necessary
        let newCorrectIndex = correctIndex;
        if (index === correctIndex) {
            newCorrectIndex = 0;
        } else if (index < correctIndex) {
            newCorrectIndex = correctIndex - 1;
        }
        updateAttributes({ options: newOptions, correctIndex: newCorrectIndex });
    };

    const setCorrectOption = (index) => {
        if (!isEditable) return;
        updateAttributes({ correctIndex: index });
    };

    const handleCopyBlock = () => {
        if (typeof getPos === 'function') {
            const pos = getPos();
            editor.commands.setNodeSelection(pos);
            document.execCommand('copy');

            // Move cursor to next line
            editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: 'paragraph' }).run();
        }
    };

    // Render for Reader (Quiz Taker)
    if (!isEditable) {
        const [selectedOption, setSelectedOption] = React.useState(null);
        const [isSubmitted, setIsSubmitted] = React.useState(false);

        const handleOptionClick = (index) => {
            if (isSubmitted) return;
            setSelectedOption(index);
            setIsSubmitted(true);
        };

        return (
            <NodeViewWrapper className="quiz-component my-4 sm:my-8 w-full not-prose">
                <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="border-b border-neutral-200 bg-stone-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/70 sm:px-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                                    <span className="text-sm font-bold">?</span>
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                    Quick Check
                                </span>
                            </div>
                            <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                                {isSubmitted ? "Completed" : "Interactive"}
                            </span>
                        </div>
                    </div>

                    <div className="p-4 sm:p-5">
                        <h3 className="mb-4 text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-100 sm:text-lg lg:text-xl">
                            {question || "Untitled Quiz"}
                        </h3>

                        <div className="grid grid-cols-1 gap-2">
                            {options.map((option, index) => {
                                const isSelected = selectedOption === index;
                                const isCorrect = index === correctIndex;
                                let borderClass = "border-neutral-200 dark:border-neutral-800";
                                let bgClass = "bg-stone-50 dark:bg-neutral-900/70";
                                let textClass = "text-neutral-700 dark:text-neutral-300";
                                let markerClass = "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";

                                if (isSubmitted) {
                                    if (isCorrect) {
                                        borderClass = "border-emerald-500 dark:border-emerald-500";
                                        bgClass = "bg-emerald-50 dark:bg-emerald-950/30";
                                        textClass = "text-green-700 dark:text-green-300";
                                        markerClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
                                    } else if (isSelected) {
                                        borderClass = "border-red-500 dark:border-red-500";
                                        bgClass = "bg-red-50 dark:bg-red-950/30";
                                        textClass = "text-red-700 dark:text-red-300";
                                        markerClass = "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
                                    }
                                } else if (isSelected) {
                                    borderClass = "border-orange-500 dark:border-orange-500";
                                    bgClass = "bg-orange-50 dark:bg-orange-950/30";
                                    markerClass = "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
                                }

                                return (
                                    <button
                                        key={index}
                                        className={`relative flex items-center rounded-lg border p-3 text-left ${borderClass} ${bgClass} group overflow-hidden transition-all duration-200 ${!isSubmitted ? 'hover:border-orange-400 hover:bg-orange-50 dark:hover:border-orange-500 dark:hover:bg-orange-950/30' : 'cursor-default'}`}
                                        onClick={() => handleOptionClick(index)}
                                        disabled={isSubmitted}
                                    >
                                        <div className={`z-10 mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${markerClass}`}>
                                            {isSubmitted && isCorrect ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : isSubmitted && isSelected && !isCorrect ? (
                                                <div className="flex h-4 w-4 items-center justify-center">x</div>
                                            ) : (
                                                String.fromCharCode(65 + index)
                                            )}
                                        </div>
                                        <span className={`z-10 text-sm font-medium sm:text-base ${textClass}`}>
                                            {option}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-200 bg-stone-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400 sm:px-5 sm:py-2.5">
                        <span>{isSubmitted ? (selectedOption === correctIndex ? "Correct Answer" : "Incorrect Answer") : "Select an option"}</span>
                        <span className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${isSubmitted ? (selectedOption === correctIndex ? 'bg-emerald-500' : 'bg-red-500') : 'bg-orange-500 animate-pulse'}`}></span>
                            {isSubmitted ? "Completed" : "Interactive"}
                        </span>
                    </div>
                </div>
            </NodeViewWrapper>
        );
    }

    // Render for Editor (Quiz Creator)
    return (
        <NodeViewWrapper className="quiz-component group relative my-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:my-8">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-stone-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/70 sm:px-5">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                        <span className="text-sm font-bold">?</span>
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            Quiz Block
                        </p>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                            Mark the correct answer before publishing.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleCopyBlock}
                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    title="Copy Quiz Block"
                >
                    <Copy className="h-4 w-4" />
                </button>
            </div>

            <div className="p-4 sm:p-5">
                <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Question
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={handleQuestionChange}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white sm:px-4 sm:py-2 sm:text-base"
                        placeholder="Enter your question here..."
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Options
                    </label>
                    {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setCorrectOption(index)}
                                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${index === correctIndex
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                                    : 'border-neutral-200 bg-stone-50 text-neutral-400 hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-800 dark:hover:text-orange-300'
                                    }`}
                                title="Mark as correct answer"
                            >
                                {index === correctIndex ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                    <Circle className="h-5 w-5" />
                                )}
                            </button>
                            <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white sm:px-4 sm:py-2 sm:text-base"
                                placeholder={`Option ${index + 1}`}
                            />
                            <button
                                onClick={() => removeOption(index)}
                                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
                                title="Remove option"
                                disabled={options.length <= 2}
                            >
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addOption}
                    className="mt-4 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
                >
                    <Plus className="h-4 w-4" />
                    Add Option
                </button>
            </div>
        </NodeViewWrapper>
    );
};

export default QuizNodeView;
