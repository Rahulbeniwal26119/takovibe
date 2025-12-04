import { NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Copy, Type, Trash2 } from 'lucide-react';

export default ({ node, updateAttributes, editor, getPos, deleteNode }: any) => {
    const { src, alt, title, caption } = node.attrs;
    const [showAltInput, setShowAltInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const captionRef = useRef<HTMLInputElement>(null);

    const isEditable = editor.isEditable;

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
        <NodeViewWrapper
            className="image-component my-8 not-prose group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <figure className="relative flex flex-col items-center">
                <div className="relative overflow-hidden rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <img
                        src={src}
                        alt={alt}
                        title={title}
                        className={`max-w-full h-auto rounded-xl transition-transform duration-500 ${!isEditable ? 'hover:scale-[1.01]' : ''}`}
                    />

                    {/* Toolbar - Only show if editable */}
                    {isEditable && (
                        <div className={`absolute top-4 right-4 flex items-center gap-2 transition-all duration-300 ${isHovered || showAltInput ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-xl rounded-xl p-1.5 border border-white/10 shadow-2xl">
                                <button
                                    onClick={() => setShowAltInput(!showAltInput)}
                                    className={`p-2 rounded-lg transition-colors ${showAltInput ? 'bg-purple-600 text-white' : 'text-gray-200 hover:bg-white/20'}`}
                                    title="Alt Text"
                                >
                                    <Type className="w-4 h-4" />
                                </button>
                                <div className="w-px h-4 bg-white/20 mx-1" />
                                <button
                                    onClick={handleCopyBlock}
                                    className="p-2 rounded-lg text-gray-200 hover:bg-white/20 transition-colors"
                                    title="Copy Image Block"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={deleteNode}
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Delete Image"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Alt Text Input - Only show if editable */}
                    {isEditable && showAltInput && (
                        <div className="absolute top-16 right-4 z-20 w-80 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                    <Type className="w-3 h-3" /> Alt Text
                                </label>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">Accessibility</span>
                            </div>
                            <input
                                type="text"
                                value={alt || ''}
                                onChange={(e) => updateAttributes({ alt: e.target.value })}
                                placeholder="Describe this image for screen readers..."
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Caption */}
                <div className="mt-3 w-full flex justify-center">
                    {isEditable ? (
                        <input
                            ref={captionRef}
                            type="text"
                            value={caption || ''}
                            onChange={(e) => updateAttributes({ caption: e.target.value })}
                            placeholder="Type a caption for this image (optional)"
                            className="w-full max-w-md text-center text-sm font-medium text-gray-600 dark:text-gray-300 bg-transparent border-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600 transition-colors hover:text-gray-900 dark:hover:text-white"
                        />
                    ) : (
                        caption && (
                            <figcaption className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium px-4 py-1.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-full border border-gray-100 dark:border-gray-800/50 backdrop-blur-sm">
                                {caption}
                            </figcaption>
                        )
                    )}
                </div>
            </figure>
        </NodeViewWrapper>
    );
};
