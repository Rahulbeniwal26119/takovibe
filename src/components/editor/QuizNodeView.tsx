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
                <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mt-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                                {question || "Untitled Quiz"}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {options.map((option, index) => {
                                const isSelected = selectedOption === index;
                                const isCorrect = index === correctIndex;
                                let borderClass = "border-gray-200 dark:border-gray-700";
                                let bgClass = "bg-gray-50 dark:bg-gray-800/50";
                                let textClass = "text-gray-700 dark:text-gray-300";

                                if (isSubmitted) {
                                    if (isCorrect) {
                                        borderClass = "border-green-500 dark:border-green-500";
                                        bgClass = "bg-green-50 dark:bg-green-900/20";
                                        textClass = "text-green-700 dark:text-green-300";
                                    } else if (isSelected) {
                                        borderClass = "border-red-500 dark:border-red-500";
                                        bgClass = "bg-red-50 dark:bg-red-900/20";
                                        textClass = "text-red-700 dark:text-red-300";
                                    }
                                } else if (isSelected) {
                                    borderClass = "border-purple-500";
                                    bgClass = "bg-purple-50 dark:bg-purple-900/10";
                                }

                                return (
                                    <button
                                        key={index}
                                        className={`relative flex items-center p-3 text-left rounded-lg border ${borderClass} ${bgClass} transition-all duration-200 group overflow-hidden ${!isSubmitted ? 'hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10' : 'cursor-default'}`}
                                        onClick={() => handleOptionClick(index)}
                                        disabled={isSubmitted}
                                    >
                                        <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${isSubmitted && isCorrect ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : isSubmitted && isSelected && !isCorrect ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} font-bold text-xs transition-colors mr-3 z-10`}>
                                            {isSubmitted && isCorrect ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : isSubmitted && isSelected && !isCorrect ? (
                                                <div className="w-3.5 h-3.5 flex items-center justify-center">✕</div>
                                            ) : (
                                                String.fromCharCode(65 + index)
                                            )}
                                        </div>
                                        <span className={`${textClass} text-base sm:text-lg font-medium z-10`}>
                                            {option}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                        <span>{isSubmitted ? (selectedOption === correctIndex ? "Correct Answer" : "Incorrect Answer") : "Select an option"}</span>
                        <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSubmitted ? (selectedOption === correctIndex ? 'bg-green-500' : 'bg-red-500') : 'bg-purple-500 animate-pulse'}`}></span>
                            {isSubmitted ? "Completed" : "Interactive"}
                        </span>
                    </div>
                </div>
            </NodeViewWrapper>
        );
    }

    // Render for Editor (Quiz Creator)
    return (
        <NodeViewWrapper className="quiz-component my-4 sm:my-8 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative group">
            <div className="absolute right-2 top-2 sm:right-4 sm:top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleCopyBlock}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Copy Quiz Block"
                >
                    <Copy className="w-4 h-4" />
                </button>
            </div>

            <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Question
                </label>
                <input
                    type="text"
                    value={question}
                    onChange={handleQuestionChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent dark:text-white text-sm sm:text-base"
                    placeholder="Enter your question here..."
                />
            </div>

            <div className="space-y-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Options
                </label>
                {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setCorrectOption(index)}
                            className={`flex-shrink-0 transition-colors ${index === correctIndex
                                ? 'text-green-500'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                            title="Mark as correct answer"
                        >
                            {index === correctIndex ? (
                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                            ) : (
                                <Circle className="w-5 h-5 sm:w-6 sm:h-6" />
                            )}
                        </button>
                        <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent dark:text-white text-sm sm:text-base"
                            placeholder={`Option ${index + 1}`}
                        />
                        <button
                            onClick={() => removeOption(index)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove option"
                            disabled={options.length <= 2}
                        >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={addOption}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors py-2"
            >
                <Plus className="w-4 h-4" />
                Add Option
            </button>
        </NodeViewWrapper>
    );
};

export default QuizNodeView;
