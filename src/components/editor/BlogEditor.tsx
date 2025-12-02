import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import GapCursor from '@tiptap/extension-gapcursor';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { common, createLowlight } from 'lowlight';
import { QuizExtension } from './QuizExtension';
import CodeBlockComponent from './CodeBlockComponent';
import ImageNodeView from './ImageNodeView';
import { fetchWithAuth } from '../../utils/api';
import '../../styles/editor.css';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Quote,
    List,
    ListOrdered,
    Image as ImageIcon,
    HelpCircle,
    X,
    Check,
    Table as TableIcon,
    Code,
    Plus,
    Save,
    Loader2,
    Cloud,
    AlertCircle,
    Sun,
    Moon,
} from 'lucide-react';

// Initialize lowlight with common languages
const lowlight = createLowlight(common);

interface BlogEditorProps {
    initialContent?: any;
    onChange?: (json: any) => void;
    onSave?: (data: { content: any; frontmatter: any }) => Promise<void>;
    apiEndpoint?: string;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
    initialContent,
    onChange,
    onSave,
    apiEndpoint = 'http://localhost:8000/api/posts/',
}) => {
    const [frontmatter, setFrontmatter] = useState({
        title: '',
        description: '',
        slug: '',
        image: '',
        tags: '',
        keywords: '',
        author: '',
        date: new Date().toISOString().split('T')[0],
        type: 'article',
        series: '',
        seriesOrder: 0,
        readingTime: '',
        layout: '../../layouts/BlogPost.astro',
    });
    const [showImageInput, setShowImageInput] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // Initialize theme
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const isDark = document.documentElement.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'light');
        }
    }, []);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // Auto-save state
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (initialContent?.frontmatter) {
            setFrontmatter(initialContent.frontmatter);
        }
    }, [initialContent]);

    const validateFrontmatter = () => {
        const errors: string[] = [];
        if (!frontmatter.title.trim()) errors.push('title');
        if (!frontmatter.description.trim()) errors.push('description');
        if (!frontmatter.author.trim()) errors.push('author');
        if (!frontmatter.date) errors.push('date');
        if (!frontmatter.slug.trim()) errors.push('slug');
        if (!frontmatter.image.trim()) errors.push('image');
        if (!frontmatter.tags.trim()) errors.push('tags');

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4],
                },
                codeBlock: false, // Disable default codeBlock
            }),
            Underline,
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        caption: {
                            default: '',
                            parseHTML: element => element.getAttribute('data-caption'),
                            renderHTML: attributes => ({
                                'data-caption': attributes.caption,
                            }),
                        },
                    }
                },
                addNodeView() {
                    return ReactNodeViewRenderer(ImageNodeView)
                },
            }),
            CodeBlockLowlight
                .extend({
                    addAttributes() {
                        return {
                            ...this.parent?.(),
                            output: {
                                default: '',
                                parseHTML: element => element.getAttribute('data-output'),
                                renderHTML: attributes => ({
                                    'data-output': attributes.output,
                                }),
                            },
                            showOutput: {
                                default: false,
                                parseHTML: element => element.getAttribute('data-show-output') === 'true',
                                renderHTML: attributes => ({
                                    'data-show-output': attributes.showOutput,
                                }),
                            },
                        }
                    },
                    addNodeView() {
                        return ReactNodeViewRenderer(CodeBlockComponent)
                    },
                })
                .configure({ lowlight }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse table-auto w-full my-4',
                },
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 p-2 font-bold text-left',
                },
            }),
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 p-2',
                },
            }),

            FloatingMenuExtension.configure({
                element: document.querySelector('.floating-menu') as HTMLElement,
                tippyOptions: {
                    duration: 100,
                },
            }),
            QuizExtension,
        ],
        content: initialContent?.content || initialContent || {
            type: 'doc',
            content: [
                {
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: 'Start writing your story...' }],
                },
                {
                    type: 'paragraph',
                },
            ],
        },
        editorProps: {
            attributes: {
                class:
                    `prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 md:px-12 pb-12 ${theme === 'dark' ? 'prose-invert' : 'light-mode-editor'}`,
            },
        },
        onUpdate: ({ editor }) => {
            const json = editor.getJSON();
            if (onChange) {
                onChange({ content: json, frontmatter });
            }
            setHasUnsavedChanges(true);
            setSaveError(null);
        },
    });

    // Update parent when frontmatter changes
    useEffect(() => {
        if (editor && onChange) {
            onChange({ content: editor.getJSON(), frontmatter });
            setHasUnsavedChanges(true);
            setSaveError(null);
        }
    }, [frontmatter, editor]); // Added editor dependency to ensure latest content is used

    // Handle Save
    const handleSave = useCallback(async () => {
        if (!editor) return;

        // Validate before saving
        if (!validateFrontmatter()) {
            setSaveError("Please fill in all required fields");
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            const data = { content: editor.getJSON(), frontmatter };

            if (onSave) {
                await onSave(data);
            } else if (apiEndpoint) {
                const response = await fetchWithAuth(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    throw new Error(`Save failed: ${response.statusText}`);
                }
            }

            setLastSaved(new Date());
            setHasUnsavedChanges(false);
        } catch (error: any) {
            console.error("Failed to save:", error);
            setSaveError(error.message || "Failed to save");
        } finally {
            setIsSaving(false);
        }
    }, [editor, frontmatter, onSave, apiEndpoint]);

    // Auto-save interval
    useEffect(() => {
        const timer = setInterval(() => {
            if (hasUnsavedChanges && !isSaving && !saveError) {
                handleSave();
            }
        }, 10000); // 10 seconds

        return () => clearInterval(timer);
    }, [hasUnsavedChanges, isSaving, handleSave, saveError]);

    // Ensure editor is destroyed on unmount
    useEffect(() => {
        return () => {
            if (editor) {
                editor.destroy();
            }
        };
    }, [editor]);

    if (!editor) {
        return null;
    }

    const addQuiz = () => {
        editor.chain().focus().insertContent([
            { type: 'quizComponent' },
            { type: 'paragraph' }
        ]).run();
        setIsMenuOpen(false);
    };

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

        // Insert a paragraph after the table to prevent cursor trapping
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Find the table ancestor
        let tableDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'table') {
                tableDepth = d;
                break;
            }
        }

        if (tableDepth > -1) {
            const tableNode = $from.node(tableDepth);
            const tablePos = $from.before(tableDepth);
            const tableEnd = tablePos + tableNode.nodeSize;

            // Insert paragraph after table
            editor.chain().insertContentAt(tableEnd, { type: 'paragraph' }).run();
        }

        setIsMenuOpen(false);
    };

    const addCodeBlock = () => {
        editor.chain().focus().insertContent([
            { type: 'codeBlock' },
            { type: 'paragraph' }
        ]).run();
        setIsMenuOpen(false);
    };

    const handleAddImage = () => {
        if (imageUrl) {
            editor.chain().focus().insertContent([
                { type: 'image', attrs: { src: imageUrl } },
                { type: 'paragraph' }
            ]).run();

            setImageUrl('');
            setShowImageInput(false);
            setIsMenuOpen(false);
        }
    };

    const MenuButton = ({ onClick, icon: Icon, label }: any) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            title={label}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </button>
    );

    const getInputClass = (field: string, baseClass: string) => {
        return `${baseClass} ${validationErrors.includes(field) ? 'border-red-500 ring-1 ring-red-500 placeholder-red-400' : ''}`;
    };

    const RequiredLabel = ({ label }: { label: string }) => (
        <span className="w-24 flex items-center gap-1">
            {label}
            <span className="text-red-500">*</span>
        </span>
    );


    // ... (existing code)

    return (
        <div className={`w-full mx-auto min-h-[80vh] relative transition-all duration-300 ${theme === 'dark' ? 'bg-transparent' : 'bg-white rounded-2xl shadow-xl shadow-gray-200 overflow-hidden'}`}>
            {/* Save Status Bar */}
            <div className={`sticky top-0 z-40 flex items-center justify-end gap-4 px-6 py-3 backdrop-blur-md ${theme === 'dark' ? 'bg-transparent' : 'bg-white/90 border-b border-gray-100'}`}>
                <div className={`flex items-center gap-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {/* ... (existing status items) */}
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : saveError ? (
                        <>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-500">{saveError}</span>
                        </>
                    ) : hasUnsavedChanges ? (
                        <span className="text-amber-500">Unsaved changes</span>
                    ) : lastSaved ? (
                        <>
                            <Cloud className="w-4 h-4 text-green-500" />
                            <span>Saved {lastSaved.toLocaleTimeString()}</span>
                        </>
                    ) : (
                        <span>Ready to save</span>
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                    title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges || validationErrors.length > 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${hasUnsavedChanges || validationErrors.length > 0
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
                        : `${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                        }`}
                >
                    <Save className="w-4 h-4" />
                    Sync
                </button>
            </div>

            {/* Inline Frontmatter Form */}
            <div className={`px-8 md:px-12 pt-8 mb-8 space-y-6 ${theme === 'dark' ? '' : 'border-b pb-8 border-gray-100'}`}>
                {/* Title */}
                <input
                    type="text"
                    value={frontmatter.title}
                    onChange={(e) => {
                        setFrontmatter({ ...frontmatter, title: e.target.value });
                        if (validationErrors.includes('title')) setValidationErrors(prev => prev.filter(f => f !== 'title'));
                    }}

                    className={getInputClass('title', `w-full text-4xl font-bold bg-transparent border-none outline-none rounded-lg px-2 -mx-2 ${theme === 'dark' ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-300'}`)}
                    placeholder="Post Title *"
                />

                {/* Description */}
                <textarea
                    value={frontmatter.description}
                    onChange={(e) => {
                        setFrontmatter({ ...frontmatter, description: e.target.value });
                        if (validationErrors.includes('description')) setValidationErrors(prev => prev.filter(f => f !== 'description'));
                    }}

                    className={getInputClass('description', `w-full text-xl bg-transparent border-none outline-none resize-none rounded-lg px-2 -mx-2 ${theme === 'dark' ? 'text-gray-400 placeholder-gray-600' : 'text-gray-600 placeholder-gray-300'}`)}
                    placeholder="Write a short description... *"
                    rows={2}
                />

                {/* Meta Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Row 1: Author & Date */}
                    <div className="space-y-4">
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <RequiredLabel label="Author" />
                            <input
                                type="text"
                                value={frontmatter.author}
                                onChange={(e) => {
                                    setFrontmatter({ ...frontmatter, author: e.target.value });
                                    if (validationErrors.includes('author')) setValidationErrors(prev => prev.filter(f => f !== 'author'));
                                }}
                                className={getInputClass('author', `flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`)}
                                placeholder="Author Name"
                            />
                        </div>
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <RequiredLabel label="Date" />
                            <input
                                type="date"
                                value={frontmatter.date}
                                onChange={(e) => {
                                    setFrontmatter({ ...frontmatter, date: e.target.value });
                                    if (validationErrors.includes('date')) setValidationErrors(prev => prev.filter(f => f !== 'date'));
                                }}
                                className={getInputClass('date', `flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`)}
                            />
                        </div>
                    </div>

                    {/* Row 2: Slug & Type */}
                    <div className="space-y-4">
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <RequiredLabel label="Slug" />
                            <input
                                type="text"
                                value={frontmatter.slug}
                                onChange={(e) => {
                                    setFrontmatter({ ...frontmatter, slug: e.target.value });
                                    if (validationErrors.includes('slug')) setValidationErrors(prev => prev.filter(f => f !== 'slug'));
                                }}
                                className={getInputClass('slug', `flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`)}
                                placeholder="post-slug"
                            />
                        </div>
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="w-24">Type</span>
                            <select
                                value={frontmatter.type}
                                onChange={(e) => setFrontmatter({ ...frontmatter, type: e.target.value })}
                                className={`flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`}
                            >
                                <option value="article">Article</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Tags & Keywords */}
                    <div className="space-y-4">
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <RequiredLabel label="Tags" />
                            <input
                                type="text"
                                value={frontmatter.tags}
                                onChange={(e) => {
                                    setFrontmatter({ ...frontmatter, tags: e.target.value });
                                    if (validationErrors.includes('tags')) setValidationErrors(prev => prev.filter(f => f !== 'tags'));
                                }}
                                className={getInputClass('tags', `flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`)}
                                placeholder="tech, coding"
                            />
                        </div>
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="w-24">Keywords</span>
                            <input
                                type="text"
                                value={frontmatter.keywords}
                                onChange={(e) => setFrontmatter({ ...frontmatter, keywords: e.target.value })}
                                className={`flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`}
                                placeholder="seo, search, terms"
                            />
                        </div>
                    </div>

                    {/* Row 4: Series & Order */}
                    <div className="space-y-4">
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="w-24">Series</span>
                            <input
                                type="text"
                                value={frontmatter.series}
                                onChange={(e) => setFrontmatter({ ...frontmatter, series: e.target.value })}
                                className={`flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`}
                                placeholder="Series Name (Optional)"
                            />
                        </div>
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="w-24">Order</span>
                            <input
                                type="number"
                                value={frontmatter.seriesOrder}
                                onChange={(e) => setFrontmatter({ ...frontmatter, seriesOrder: parseInt(e.target.value) || 0 })}
                                className={`flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`}
                                placeholder="1"
                            />
                        </div>
                    </div>

                    {/* Row 5: Reading Time & Image */}
                    <div className="space-y-4">
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="w-24">Read Time</span>
                            <input
                                type="text"
                                value={frontmatter.readingTime}
                                onChange={(e) => setFrontmatter({ ...frontmatter, readingTime: e.target.value })}
                                className={`flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`}
                                placeholder="5 min"
                            />
                        </div>
                        <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <RequiredLabel label="Image" />
                            <input
                                type="text"
                                value={frontmatter.image}
                                onChange={(e) => {
                                    setFrontmatter({ ...frontmatter, image: e.target.value });
                                    if (validationErrors.includes('image')) setValidationErrors(prev => prev.filter(f => f !== 'image'));
                                }}
                                className={`flex-1 bg-transparent border-b border-transparent focus:border-purple-500 outline-none transition-colors py-1 ${theme === 'dark' ? 'hover:border-gray-700 text-gray-300' : 'hover:border-gray-200 text-gray-900'}`}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Menu (Medium-style) */}
            {editor && (
                <FloatingMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    shouldShow={({ state }) => {
                        const { selection } = state;
                        const { $from } = selection;
                        // Only show on empty paragraphs
                        return selection.empty && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0;
                    }}
                    className="flex items-center"
                >
                    <div className="relative flex items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-1 rounded-full border transition-all duration-200 ${isMenuOpen
                                ? `rotate-45 border-gray-400 text-gray-600 ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white'}`
                                : `border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 ${theme === 'dark' ? 'border-gray-600 text-gray-500 hover:text-gray-300' : ''}`
                                }`}
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        {isMenuOpen && (
                            <div className={`absolute left-10 top-1/2 -translate-y-1/2 flex items-center gap-2 shadow-xl border rounded-lg p-2 animate-in fade-in slide-in-from-left-2 z-50 min-w-[200px] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="flex flex-col gap-1 w-full">
                                    <MenuButton onClick={() => setShowImageInput(true)} icon={ImageIcon} label="Image" />
                                    <MenuButton onClick={addQuiz} icon={HelpCircle} label="Quiz" />
                                    <MenuButton onClick={addTable} icon={TableIcon} label="Table" />
                                    <MenuButton onClick={addCodeBlock} icon={Code} label="Code Block" />
                                </div>
                            </div>
                        )}

                        {/* Image Input Popover */}
                        {showImageInput && (
                            <div className={`absolute left-10 top-1/2 -translate-y-1/2 rounded-xl shadow-xl border p-3 z-[60] animate-in fade-in slide-in-from-left-2 w-80 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="Paste image URL..."
                                        className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 bg-transparent ${theme === 'dark' ? 'border-gray-600 text-white' : 'border-gray-300'}`}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddImage();
                                            if (e.key === 'Escape') setShowImageInput(false);
                                        }}
                                    />
                                    <button
                                        onClick={handleAddImage}
                                        className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setShowImageInput(false)}
                                        className={`p-2 text-gray-500 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </FloatingMenu>
            )}

            {/* Floating Bubble Menu (Text Formatting) */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100, maxWidth: 'none' }}
                    className={`flex items-center flex-wrap gap-1 shadow-lg border rounded-lg p-1 max-w-[90vw] ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                >
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('bold')
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('italic')
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('underline')
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Underline"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('strike')
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </button>
                    <div className={`w-px h-4 mx-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('heading', { level: 1 })
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Heading 1"
                    >
                        <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('heading', { level: 2 })
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('heading', { level: 3 })
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Heading 3"
                    >
                        <Heading3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('heading', { level: 4 })
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Heading 4"
                    >
                        <Heading4 className="w-4 h-4" />
                    </button>
                    <div className={`w-px h-4 mx-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('bulletList')
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('orderedList')
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Ordered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`p-2 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editor.isActive('blockquote')
                            ? `text-purple-600 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'}`
                            : `${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`
                            }`}
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </button>
                </BubbleMenu>
            )}

            {/* Editor Content */}
            <EditorContent editor={editor} />
        </div>
    );
};
