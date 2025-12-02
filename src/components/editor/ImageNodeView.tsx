import { NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Copy, Type, Trash2, Maximize2 } from 'lucide-react';

export default ({ node, updateAttributes, editor, getPos, selected, deleteNode }: any) => {
    const { src, alt, title, caption } = node.attrs;
    const [showAltInput, setShowAltInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const captionRef = useRef<HTMLInputElement>(null);

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
            className="image-component my-8 relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 transition-all duration-200 ${selected || isHovered ? 'ring-2 ring-purple-500 shadow-lg' : 'border border-gray-200 dark:border-gray-800'
                    }`}
            >
                <img
                    src={src}
                    alt={alt}
                    title={title}
                    className="w-full h-auto max-h-[600px] object-contain mx-auto"
                />

                {/* Toolbar */}
                <div className={`absolute top-4 right-4 flex items-center gap-2 transition-opacity duration-200 ${isHovered || showAltInput ? 'opacity-100' : 'opacity-0'
                    }`}>
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-xl">
                        <button
                            onClick={() => setShowAltInput(!showAltInput)}
                            className={`p-2 rounded-md transition-colors ${showAltInput
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-200 hover:bg-white/20'
                                }`}
                            title="Alt Text"
                        >
                            <Type className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <button
                            onClick={handleCopyBlock}
                            className="p-2 rounded-md text-gray-200 hover:bg-white/20 transition-colors"
                            title="Copy Image Block"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={deleteNode}
                            className="p-2 rounded-md text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Delete Image"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Alt Text Input */}
                {showAltInput && (
                    <div className="absolute top-16 right-4 z-20 w-72 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alt Text</label>
                            <span className="text-[10px] text-gray-400">For accessibility</span>
                        </div>
                        <input
                            type="text"
                            value={alt || ''}
                            onChange={(e) => updateAttributes({ alt: e.target.value })}
                            placeholder="Describe this image for screen readers..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>
                )}
            </div>

            {/* Caption */}
            <div className="mt-3 text-center px-8">
                <input
                    ref={captionRef}
                    type="text"
                    value={caption || ''}
                    onChange={(e) => updateAttributes({ caption: e.target.value })}
                    placeholder="Type a caption for this image (optional)"
                    className="w-full text-center text-sm text-gray-500 dark:text-gray-400 bg-transparent border-none focus:ring-0 placeholder-gray-300 dark:placeholder-gray-600 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
                />
            </div>
        </NodeViewWrapper>
    );
};
