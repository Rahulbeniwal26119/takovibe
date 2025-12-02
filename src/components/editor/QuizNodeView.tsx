import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Trash2, Plus, CheckCircle2, Circle, Copy } from 'lucide-react';

const QuizNodeView = ({ node, updateAttributes, editor, getPos }) => {
    const { question, options, correctIndex } = node.attrs;

    const handleQuestionChange = (e) => {
        updateAttributes({ question: e.target.value });
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        updateAttributes({ options: newOptions });
    };

    const addOption = () => {
        updateAttributes({ options: [...options, `Option ${options.length + 1}`] });
    };

    const removeOption = (index) => {
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

    return (
        <NodeViewWrapper className="quiz-component my-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative group">
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleCopyBlock}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Copy Quiz Block"
                >
                    <Copy className="w-4 h-4" />
                </button>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Question
                </label>
                <input
                    type="text"
                    value={question}
                    onChange={handleQuestionChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent dark:text-white"
                    placeholder="Enter your question here..."
                />
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Options
                </label>
                {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <button
                            onClick={() => setCorrectOption(index)}
                            className={`flex-shrink-0 transition-colors ${index === correctIndex
                                ? 'text-green-500'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                            title="Mark as correct answer"
                        >
                            {index === correctIndex ? (
                                <CheckCircle2 className="w-6 h-6" />
                            ) : (
                                <Circle className="w-6 h-6" />
                            )}
                        </button>
                        <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent dark:text-white"
                            placeholder={`Option ${index + 1}`}
                        />
                        <button
                            onClick={() => removeOption(index)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove option"
                            disabled={options.length <= 2}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={addOption}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add Option
            </button>
        </NodeViewWrapper>
    );
};

export default QuizNodeView;
