import { NodeViewWrapper } from '@tiptap/react';
import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

export default ({ node, updateAttributes, editor }: any) => {
    const isEditable = editor.isEditable;
    const items: FAQItem[] = node.attrs.items || [];

    // State for which item is currently expanded (index)
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

    const handleAddItem = () => {
        const newItems = [...items, { question: '', answer: '' }];
        updateAttributes({ items: newItems });
        setExpandedIndex(newItems.length - 1);
    };

    const handleUpdateItem = (index: number, field: 'question' | 'answer', value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        updateAttributes({ items: newItems });
    };

    const handleDeleteItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        updateAttributes({ items: newItems });
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <NodeViewWrapper className="faq-component my-12 not-prose w-full">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/20 text-white transform -rotate-6">
                    <HelpCircle size={22} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="font-display font-bold text-xl text-neutral-900 dark:text-neutral-50 leading-tight">
                        Frequently Asked Questions
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                        Everything you need to know about the topic
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className={`group border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900/50 transition-all duration-300 ${expandedIndex === index
                            ? 'shadow-lg shadow-neutral-200/50 dark:shadow-none ring-1 ring-orange-500/20 dark:ring-orange-500/30'
                            : 'hover:border-orange-200 dark:hover:border-orange-800/50'
                            }`}
                    >
                        <button
                            type="button"
                            className="w-full text-left py-5 px-6 flex items-start gap-4 cursor-pointer focus:outline-none"
                            onClick={() => toggleExpand(index)}
                            aria-expanded={expandedIndex === index}
                        >
                            <span
                                className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-all duration-300 ${expandedIndex === index
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 scale-110'
                                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                                    }`}
                            >
                                {index + 1}
                            </span>

                            <div className="flex-grow min-w-0 pt-0.5">
                                {isEditable ? (
                                    <input
                                        type="text"
                                        value={item.question}
                                        onChange={(e) => handleUpdateItem(index, 'question', e.target.value)}
                                        placeholder="Type your question here..."
                                        className="w-full bg-transparent border-none outline-none font-bold text-lg sm:text-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400/70 p-0 focus:ring-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <h4 className="font-bold text-lg sm:text-xl text-neutral-900 dark:text-neutral-100 pr-4 leading-snug">
                                        {item.question || 'Untitled Question'}
                                    </h4>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 self-start mt-0.5">
                                {isEditable && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteItem(index);
                                        }}
                                        className="p-2 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer"
                                        title="Delete Question"
                                    >
                                        <Trash2 size={18} />
                                    </div>
                                )}
                                <div
                                    className={`p-2 rounded-lg transition-all duration-300 ${expandedIndex === index
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 rotate-180'
                                        : 'text-neutral-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                                        }`}
                                >
                                    <ChevronDown size={20} strokeWidth={2.5} />
                                </div>
                            </div>
                        </button>

                        <div
                            className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[grid-template-rows,opacity,padding] ${expandedIndex === index
                                ? 'grid-rows-[1fr] opacity-100 pb-6'
                                : 'grid-rows-[0fr] opacity-0 pb-0'
                                }`}
                        >
                            <div className="overflow-hidden">
                                <div className="pl-[4.5rem] pr-6">
                                    {isEditable ? (
                                        <textarea
                                            value={item.answer}
                                            onChange={(e) => handleUpdateItem(index, 'answer', e.target.value)}
                                            placeholder="Write the detailed answer here..."
                                            className="w-full bg-neutral-50 dark:bg-black/20 border border-transparent focus:border-orange-200 dark:focus:border-orange-800 focus:bg-white dark:focus:bg-black/40 rounded-xl p-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed outline-none resize-none focus:ring-4 focus:ring-orange-500/5 transition-all min-h-[100px]"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="text-neutral-600 dark:text-neutral-300 text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                                            {item.answer || 'No answer provided yet.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isEditable && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleAddItem}
                        className="group flex items-center gap-3 px-6 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 rounded-full transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={18} strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200 group-hover:text-orange-700 dark:group-hover:text-orange-300">
                            Add Another Question
                        </span>
                    </button>
                </div>
            )}
        </NodeViewWrapper>
    );
};
