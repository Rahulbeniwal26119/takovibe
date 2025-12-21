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
import { SlashCommand } from './SlashCommand';
import CodeBlockComponent from './CodeBlockComponent';
import ImageNodeView from './ImageNodeView';
import { fetchWithAuth } from '../../utils/api';
import { SEOPreview } from './SEOPreview';
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
    Keyboard,
    Eye,
    Moon,
    Maximize,
    Minimize,
    Minus,
    ArrowRight,
    ArrowDown,
    Trash2,
    Link as LinkIcon,
    Youtube as YoutubeIcon,
    FileText,
    Clock,
    Send,
} from 'lucide-react';
import { getUser } from '../../utils/auth';

import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import CharacterCount from '@tiptap/extension-character-count';

// Initialize lowlight with common languages
const lowlight = createLowlight(common);

interface BlogEditorProps {
    initialContent?: any;
    onChange?: (json: any) => void;
    onSave?: (data: { content: any; frontmatter: any }) => Promise<void>;
    apiEndpoint?: string;
    method?: 'POST' | 'PUT' | 'PATCH';
}

export const BlogEditor: React.FC<BlogEditorProps> = ({
    initialContent,
    onChange,
    onSave,
    apiEndpoint = import.meta.env.PUBLIC_API_URL ? `${import.meta.env.PUBLIC_API_URL}/api/posts/` : 'http://localhost:8000/api/posts/',
    method = 'POST',
}) => {
    const [frontmatter, setFrontmatter] = useState({
        title: '',
        description: '',
        slug: '',
        image: '',
        tags: '',
        keywords: '',
        author: getUser()?.name || '',
        date: new Date().toISOString().split('T')[0],
        type: 'article',
        series: '',
        seriesOrder: 0,
        readingTime: '',
        layout: '../../layouts/BlogPost.astro',
    });
    const [showTableInput, setShowTableInput] = useState(false);
    const [tableDims, setTableDims] = useState({ rows: 3, cols: 3 });
    const [mediaInput, setMediaInput] = useState<{ type: 'image' | 'video' | 'link' | null; url: string }>({ type: null, url: '' });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const [canPublish, setCanPublish] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showSeoPreview, setShowSeoPreview] = useState(false);
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
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
            }),
            Youtube.configure({
                controls: false,
                nocookie: true,
            }),
            CharacterCount,
            SlashCommand,
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
                    `prose prose-lg max-w-none focus:outline-none h-full px-8 md:px-12 pb-12 dark:prose-invert light-mode-editor`,
                'data-gramm': 'false',
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const { schema } = view.state;
                            const node = schema.nodes.image.create({ src: e.target?.result });
                            const transaction = view.state.tr.replaceSelectionWith(node);
                            view.dispatch(transaction);
                        };
                        reader.readAsDataURL(file);
                        return true;
                    }
                }
                return false;
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

    // Listen for custom events from SlashCommand (to avoid using window.prompt)
    useEffect(() => {
        if (!editor) return;

        const handleMediaInput = (e: any) => {
            const type = e.detail?.type;
            if (type) {
                openMediaInput(type);
            }
        };

        const dom = editor.view.dom;
        dom.addEventListener('open-media-input', handleMediaInput);

        return () => {
            dom.removeEventListener('open-media-input', handleMediaInput);
        };
    }, [editor]);

    // Fetch User Details for Author Name
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
                const response = await fetchWithAuth(`${baseUrl}/api/users/me/`);
                if (response.ok) {
                    const data = await response.json();
                    if (data?.data?.name) {
                        setFrontmatter(prev => ({ ...prev, author: data.data.name }));
                    }
                    if (data?.data?.can_publish) {
                        setCanPublish(true);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user details", error);
            }
        };

        fetchUser();
    }, []);

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
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const responseData = await response.json();

                if (!response.ok) {
                    // Handle validation errors
                    if (responseData && typeof responseData === 'object') {
                        const errors = Object.entries(responseData)
                            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                            .join('\n');
                        throw new Error(errors || `Save failed: ${response.statusText}`);
                    }
                    throw new Error(`Save failed: ${response.statusText}`);
                }

                // Update frontmatter with server response (e.g. slug, date, id)
                if (responseData.frontmatter) {
                    setFrontmatter(prev => ({ ...prev, ...responseData.frontmatter }));
                }
            }

            setLastSaved(new Date());
            setHasUnsavedChanges(false);

            // Show success feedback (could be enhanced with a toast later)
            const saveStatus = document.getElementById('save-status');
            if (saveStatus) {
                saveStatus.classList.add('text-green-500', 'font-bold');
                setTimeout(() => saveStatus.classList.remove('text-green-500', 'font-bold'), 2000);
            }

        } catch (error: any) {
            console.error("Failed to save:", error);
            setSaveError(error.message || "Failed to save");
        } finally {
            setIsSaving(false);
        }
    }, [editor, frontmatter, onSave, apiEndpoint]);

    const handlePublish = async () => {
        if (!editor) return;

        // Validate before publishing
        if (!validateFrontmatter()) {
            setSaveError("Please fill in all required fields before publishing");
            return;
        }

        setIsPublishing(true);
        setSaveError(null);

        try {
            // First save the content
            await handleSave();

            const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetchWithAuth(`${baseUrl}/api/blogs/author-blogs/publish/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slug: frontmatter.slug,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Publish failed: ${response.statusText}`);
            }

            // Show success feedback
            const saveStatus = document.getElementById('save-status');
            if (saveStatus) {
                const originalContent = saveStatus.innerHTML;
                saveStatus.innerHTML = `
                    <svg class="w-4 h-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <span class="text-emerald-500">Published Successfully!</span>
                `;
                saveStatus.classList.add('bg-emerald-50', 'dark:bg-emerald-900/20');

                setTimeout(() => {
                    saveStatus.innerHTML = originalContent;
                    saveStatus.classList.remove('bg-emerald-50', 'dark:bg-emerald-900/20');
                    setLastSaved(new Date());
                }, 3000);
            }

        } catch (error: any) {
            console.error("Failed to publish:", error);
            setSaveError(error.message || "Failed to publish");
        } finally {
            setIsPublishing(false);
        }
    };

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

    const addHorizontalRule = () => {
        editor.chain().focus().setHorizontalRule().run();
        setIsMenuOpen(false);
    };

    const handleInsertTable = () => {
        editor.chain().focus().insertTable({
            rows: tableDims.rows,
            cols: tableDims.cols,
            withHeaderRow: true
        }).run();

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

        setShowTableInput(false);
        setIsMenuOpen(false);
        setTableDims({ rows: 3, cols: 3 });
    };

    const addCodeBlock = () => {
        editor.chain().focus().insertContent([
            { type: 'codeBlock' },
            { type: 'paragraph' }
        ]).run();
        setIsMenuOpen(false);
    };

    const handleMediaSubmit = () => {
        if (!mediaInput.url) return;

        if (mediaInput.type === 'image') {
            editor.chain().focus().insertContent([
                { type: 'image', attrs: { src: mediaInput.url } },
                { type: 'paragraph' }
            ]).run();
        } else if (mediaInput.type === 'video') {
            editor.chain().focus().setYoutubeVideo({ src: mediaInput.url }).run();
        } else if (mediaInput.type === 'link') {
            // If text is selected, link it. If not, insert url.
            if (editor.state.selection.empty) {
                editor.chain().focus().insertContent(`<a href="${mediaInput.url}">${mediaInput.url}</a>`).run();
            } else {
                editor.chain().focus().setLink({ href: mediaInput.url }).run();
            }
        }

        setMediaInput({ type: null, url: '' });
        setIsMenuOpen(false);
    };

    const openMediaInput = (type: 'image' | 'video' | 'link') => {
        // Pre-fill link if editing existing link
        let initialUrl = '';
        if (type === 'link' && editor.isActive('link')) {
            initialUrl = editor.getAttributes('link').href;
        }
        setMediaInput({ type, url: initialUrl });
        setIsMenuOpen(type === 'image' || type === 'video'); // Keep menu open for floating items, but maybe close for bubbles?
    };

    const MenuButton = ({ onClick, icon: Icon, label }: any) => (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
        <div className="relative w-full max-w-7xl mx-auto">
            {/* Editor Hints Sidebar - Positioned absolutely to the right of the editor content on large screens */}
            {/* Editor Hints Sidebar - Animated for Zen Mode */}
            <div className={`hidden 2xl:block absolute left-full top-0 ml-6 w-60 p-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-[2px] transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] transform origin-left ${isZenMode
                ? 'opacity-0 translate-x-10 pointer-events-none blur-sm scale-95'
                : 'opacity-100 translate-x-0 blur-0 scale-100'
                }`}>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Cheatsheet</span>
                </div>

                <ul className="space-y-2.5">
                    <li className="flex items-center justify-between group">
                        <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Menu</span>
                        <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm min-w-[1.5rem] text-center">/</kbd>
                    </li>
                    <li className="flex items-center justify-between group">
                        <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Format</span>
                        <div className="flex gap-1">
                            <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">⌘B</kbd>
                            <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">⌘I</kbd>
                        </div>
                    </li>
                    <li className="flex items-center justify-between group">
                        <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Headers</span>
                        <div className="flex gap-1">
                            <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">#</kbd>
                            <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">##</kbd>
                        </div>
                    </li>
                    <li className="flex items-center justify-between group">
                        <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Lists</span>
                        <div className="flex gap-1">
                            <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">-</kbd>
                            <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">1.</kbd>
                        </div>
                    </li>
                    <li className="flex items-center justify-between group">
                        <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Quote</span>
                        <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">&gt;</kbd>
                    </li>
                    <li className="flex items-center justify-between group">
                        <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Code</span>
                        <kbd className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 shadow-sm">```</kbd>
                    </li>
                </ul>
            </div>

            <div className="w-full mx-auto h-[90vh] flex flex-col relative transition-all duration-500 bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-20 bg-purple-400 dark:bg-purple-600" />
                    <div className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full blur-3xl opacity-20 bg-blue-400 dark:bg-blue-600" />
                </div>



                {/* Save Status Bar & Toolbar */}
                <div className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b transition-colors duration-300 bg-white/80 dark:bg-slate-900/70 border-slate-200/50 dark:border-white/10">

                    {/* Left: Status Indicators */}
                    <div id="save-status" className="flex items-center gap-3 text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 bg-slate-100/50 dark:bg-white/5 text-slate-600 dark:text-gray-300">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                <span className="text-purple-500">Saving...</span>
                            </>
                        ) : saveError ? (
                            <>
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-red-500">{saveError}</span>
                            </>
                        ) : hasUnsavedChanges ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-amber-500">Unsaved changes</span>
                            </>
                        ) : lastSaved ? (
                            <>
                                <Cloud className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-500">Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                        ) : (
                            <span className="text-gray-400">Ready to write</span>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {/* Zen Mode Toggle */}
                        <button
                            onClick={() => {
                                setIsZenMode(!isZenMode);
                                document.body.classList.toggle('zen-mode');
                            }}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${isZenMode
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/20'
                                }`}
                            title="Toggle Zen Mode"
                        >
                            {isZenMode ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>

                        {/* View Button */}
                        {frontmatter.slug && (
                            <a
                                href={`/p/${frontmatter.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-all duration-300"
                                title="View Live Page"
                            >
                                <Eye className="w-5 h-5" />
                                <span className="hidden sm:inline">View</span>
                            </a>
                        )}

                        {/* Publish Button (Admins only) */}
                        {canPublish && (
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing || isSaving || validationErrors.length > 0}
                                className="group relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                title="Publish Article"
                            >
                                {isPublishing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
                            </button>
                        )}

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges || validationErrors.length > 0}
                            className={`group relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 ${hasUnsavedChanges || validationErrors.length > 0
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <Save className={`w-4 h-4 ${hasUnsavedChanges ? 'group-hover:animate-bounce' : ''}`} />
                            <span>Sync</span>

                            {/* Validation Tooltip */}
                            {validationErrors.length > 0 && (
                                <div className="absolute top-full right-0 mt-2 w-48 p-3 bg-red-500 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Missing: {validationErrors.join(', ')}
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* Inline Frontmatter Form */}
                    <div className="px-8 md:px-12 pt-8 mb-8 space-y-8 border-b pb-8 border-slate-100 dark:border-transparent">
                        {/* Cover Image Preview */}
                        {frontmatter.image && (
                            <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden group shadow-md border border-slate-200 dark:border-slate-800">
                                <img
                                    src={frontmatter.image}
                                    alt="Cover"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://placehold.co/1200x600/e2e8f0/64748b?text=Invalid+Image';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                                    <button
                                        onClick={() => setFrontmatter({ ...frontmatter, image: '' })}
                                        className="px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-105 flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remove Cover
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Title & Description Group */}
                        <div className="space-y-4">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={frontmatter.title}
                                    onChange={(e) => {
                                        setFrontmatter({ ...frontmatter, title: e.target.value });
                                        if (validationErrors.includes('title')) setValidationErrors(prev => prev.filter(f => f !== 'title'));
                                    }}
                                    className={getInputClass('title', "w-full text-5xl font-extrabold bg-transparent border-none outline-none p-0 placeholder-opacity-40 transition-all duration-300 text-slate-900 placeholder-slate-300 dark:text-white dark:placeholder-gray-500")}
                                    placeholder="Untitled Post"
                                />
                                {!frontmatter.title && <span className="absolute top-2 -left-4 text-red-500 text-xl opacity-50">*</span>}
                            </div>

                            <div className="relative group">
                                <textarea
                                    value={frontmatter.description}
                                    onChange={(e) => {
                                        setFrontmatter({ ...frontmatter, description: e.target.value });
                                        if (validationErrors.includes('description')) setValidationErrors(prev => prev.filter(f => f !== 'description'));
                                    }}
                                    className={getInputClass('description', "w-full text-xl bg-transparent border-none outline-none resize-none p-0 placeholder-opacity-50 transition-all duration-300 text-slate-600 placeholder-slate-400 dark:text-gray-300 dark:placeholder-gray-600")}
                                    placeholder="Add a short description..."
                                    rows={1}
                                    style={{ minHeight: 'auto', height: 'auto' }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${target.scrollHeight}px`;
                                    }}
                                />
                                {!frontmatter.description && <span className="absolute top-1 -left-4 text-red-500 text-lg opacity-50">*</span>}
                            </div>
                        </div>

                        {/* Meta Grid - Collapsible or clean layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 rounded-2xl border transition-all duration-300 bg-slate-50/80 border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10">

                            {/* Column 1: Core Info */}
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">
                                        Author <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={frontmatter.author}
                                        readOnly
                                        disabled
                                        className="w-full bg-transparent border-b transition-colors py-1 focus:outline-none border-slate-300 dark:border-gray-700 text-slate-500 dark:text-gray-500 cursor-not-allowed opacity-70"
                                        placeholder="Name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">
                                        Publish Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={frontmatter.date}
                                        onChange={(e) => setFrontmatter({ ...frontmatter, date: e.target.value })}
                                        className="w-full bg-transparent border-b transition-colors py-1 focus:outline-none border-slate-300 focus:border-purple-500 text-slate-700 dark:border-gray-700 dark:focus:border-purple-500 dark:text-gray-200"
                                    />
                                </div>
                            </div>

                            {/* Column 2: SEO & Organization */}
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">
                                        Slug <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={frontmatter.slug}
                                        onChange={(e) => setFrontmatter({ ...frontmatter, slug: e.target.value })}
                                        className="w-full bg-transparent border-b transition-colors py-1 focus:outline-none border-slate-300 focus:border-purple-500 text-slate-700 dark:border-gray-700 dark:focus:border-purple-500 dark:text-gray-200"
                                        placeholder="post-url-slug"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">
                                        Tags <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={frontmatter.tags}
                                        onChange={(e) => setFrontmatter({ ...frontmatter, tags: e.target.value })}
                                        className="w-full bg-transparent border-b transition-colors py-1 focus:outline-none border-slate-300 focus:border-purple-500 text-slate-700 dark:border-gray-700 dark:focus:border-purple-500 dark:text-gray-200"
                                        placeholder="react, astro, web"
                                    />
                                </div>
                            </div>

                            {/* Column 3: Series & Media */}
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">
                                        Cover Image URL <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={frontmatter.image}
                                            onChange={(e) => setFrontmatter({ ...frontmatter, image: e.target.value })}
                                            className="w-full bg-transparent border-b transition-colors py-1 focus:outline-none border-slate-300 focus:border-purple-500 text-slate-700 dark:border-gray-700 dark:focus:border-purple-500 dark:text-gray-200"
                                            placeholder="https://..."
                                        />
                                        {frontmatter.image && (
                                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-gray-500/20">
                                                <img src={frontmatter.image} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">Series</label>
                                        <input
                                            type="text"
                                            value={frontmatter.series}
                                            onChange={(e) => setFrontmatter({ ...frontmatter, series: e.target.value })}
                                            className="w-full bg-transparent border-b transition-colors py-1 focus:outline-none border-slate-300 focus:border-purple-500 text-slate-700 dark:border-gray-700 dark:focus:border-purple-500 dark:text-gray-200"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div className="space-y-1.5 w-20">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-500">Order</label>
                                        <input
                                            type="number"
                                            value={frontmatter.seriesOrder}
                                            onChange={(e) => setFrontmatter({ ...frontmatter, seriesOrder: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-transparent border-b transition-colors py-1 focus:outline-none border-slate-300 focus:border-purple-500 text-slate-700 dark:border-gray-700 dark:focus:border-purple-500 dark:text-gray-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEO Preview Toggle & Section */}
                        <div className="mt-8 border-t border-slate-100 dark:border-transparent pt-8">
                            <button
                                onClick={() => setShowSeoPreview(!showSeoPreview)}
                                className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            >
                                {showSeoPreview ? <ArrowDown className="w-4 h-4 rotate-180 transition-transform" /> : <ArrowDown className="w-4 h-4 transition-transform" />}
                                SEO & Social Preview
                            </button>

                            {showSeoPreview && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                    <SEOPreview
                                        title={frontmatter.title}
                                        description={frontmatter.description}
                                        slug={frontmatter.slug}
                                        image={frontmatter.image}
                                    />
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Floating Menu (Medium-style) */}
                    {
                        editor && (
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
                                            ? 'rotate-45 border-gray-400 text-gray-600 bg-white dark:bg-gray-800 dark:text-gray-300'
                                            : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>

                                    {isMenuOpen && (
                                        <div className="absolute left-10 top-1/2 -translate-y-1/2 flex items-center gap-2 shadow-xl border rounded-lg p-2 animate-in fade-in slide-in-from-left-2 z-50 min-w-[200px] bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                            <div className="flex flex-col gap-1 w-full">
                                                <MenuButton onClick={() => openMediaInput('image')} icon={ImageIcon} label="Image" />
                                                <MenuButton onClick={() => openMediaInput('video')} icon={YoutubeIcon} label="Embed Video" />
                                                <MenuButton onClick={addQuiz} icon={HelpCircle} label="Quiz" />
                                                <MenuButton onClick={() => setShowTableInput(true)} icon={TableIcon} label="Table" />
                                                <MenuButton onClick={addCodeBlock} icon={Code} label="Code Block" />
                                                <MenuButton onClick={addHorizontalRule} icon={Minus} label="Separator" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Table Input Popover */}
                                    {showTableInput && (
                                        <div className="absolute left-10 top-1/2 -translate-y-1/2 rounded-xl shadow-xl border p-4 z-[60] animate-in fade-in slide-in-from-left-2 w-64 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                            <div className="space-y-3">
                                                <div className="flex gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold text-gray-500 uppercase">Rows</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="20"
                                                            value={tableDims.rows}
                                                            onChange={(e) => setTableDims(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-purple-500 bg-transparent border-gray-300 dark:border-gray-600 dark:text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold text-gray-500 uppercase">Cols</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="10"
                                                            value={tableDims.cols}
                                                            onChange={(e) => setTableDims(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))}
                                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-purple-500 bg-transparent border-gray-300 dark:border-gray-600 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        onClick={handleInsertTable}
                                                        className="flex-1 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                                    >
                                                        Insert Table
                                                    </button>
                                                    <button
                                                        onClick={() => setShowTableInput(false)}
                                                        className="px-3 py-1.5 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Media Input Popover (Image/Youtube) */}
                                    {mediaInput.type && mediaInput.type !== 'link' && (
                                        <div className="absolute left-10 top-1/2 -translate-y-1/2 rounded-xl shadow-xl border p-3 z-[60] animate-in fade-in slide-in-from-left-2 w-80 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={mediaInput.url}
                                                    onChange={(e) => setMediaInput({ ...mediaInput, url: e.target.value })}
                                                    placeholder={`Paste ${mediaInput.type} URL...`}
                                                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 bg-transparent border-gray-300 dark:border-gray-600 dark:text-white"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleMediaSubmit();
                                                        if (e.key === 'Escape') setMediaInput({ type: null, url: '' });
                                                    }}
                                                />
                                                <button
                                                    onClick={handleMediaSubmit}
                                                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setMediaInput({ type: null, url: '' })}
                                                    className="p-2 text-gray-500 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </FloatingMenu>
                        )
                    }

                    {/* Floating Bubble Menu (Text Formatting) */}
                    {
                        editor && (
                            <BubbleMenu
                                editor={editor}
                                tippyOptions={{ duration: 100, maxWidth: 'none' }}
                                className="flex items-center flex-wrap gap-1 shadow-lg border rounded-lg p-1 max-w-[90vw] bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                            >
                                <button
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('bold')
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Bold"
                                >
                                    <Bold className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('italic')
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Italic"
                                >
                                    <Italic className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('underline')
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Underline"
                                >
                                    <UnderlineIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('strike')
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Strikethrough"
                                >
                                    <Strikethrough className="w-4 h-4" />
                                </button>
                                <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
                                <div className="relative">
                                    <button
                                        onClick={() => openMediaInput('link')}
                                        className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('link')
                                            ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                            : 'text-gray-600 dark:text-gray-300'
                                            }`}
                                        title="Link"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                    </button>
                                    {mediaInput.type === 'link' && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-xl shadow-xl border p-2 z-[60] animate-in fade-in slide-in-from-top-2 w-64 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={mediaInput.url}
                                                    onChange={(e) => setMediaInput({ ...mediaInput, url: e.target.value })}
                                                    placeholder="https://..."
                                                    className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-purple-500 bg-transparent border-gray-300 dark:border-gray-600 dark:text-white"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleMediaSubmit();
                                                        if (e.key === 'Escape') setMediaInput({ type: null, url: '' });
                                                    }}
                                                />
                                                <button
                                                    onClick={handleMediaSubmit}
                                                    className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (editor.isActive('link')) {
                                                            editor.chain().focus().unsetLink().run();
                                                        }
                                                        setMediaInput({ type: null, url: '' });
                                                    }}
                                                    className="p-1.5 text-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Unlink"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
                                <button
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('heading', { level: 1 })
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Heading 1"
                                >
                                    <Heading1 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('heading', { level: 2 })
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Heading 2"
                                >
                                    <Heading2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('heading', { level: 3 })
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Heading 3"
                                >
                                    <Heading3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('heading', { level: 4 })
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Heading 4"
                                >
                                    <Heading4 className="w-4 h-4" />
                                </button>
                                <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
                                <button
                                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('bulletList')
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Bullet List"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('orderedList')
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Ordered List"
                                >
                                    <ListOrdered className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                    className={`p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('blockquote')
                                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                        : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                    title="Quote"
                                >
                                    <Quote className="w-4 h-4" />
                                </button>
                            </BubbleMenu>
                        )
                    }

                    {/* Table Bubble Menu */}
                    {editor && (
                        <BubbleMenu
                            editor={editor}
                            tippyOptions={{ duration: 100, maxWidth: 'none' }}
                            shouldShow={({ editor }) => editor.isActive('table')}
                            className="flex items-center gap-1 shadow-lg border rounded-lg p-1 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                        >
                            <button
                                onClick={() => editor.chain().focus().addColumnBefore().run()}
                                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                title="Add Column Before"
                            >
                                <div className="flex items-center">
                                    <Plus className="w-3 h-3" />
                                    <ArrowRight className="w-3 h-3 rotate-180" />
                                </div>
                            </button>
                            <button
                                onClick={() => editor.chain().focus().addColumnAfter().run()}
                                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                title="Add Column After"
                            >
                                <div className="flex items-center">
                                    <ArrowRight className="w-3 h-3" />
                                    <Plus className="w-3 h-3" />
                                </div>
                            </button>
                            <button
                                onClick={() => editor.chain().focus().deleteColumn().run()}
                                className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Delete Column"
                            >
                                <div className="flex items-center">
                                    <Trash2 className="w-3 h-3" />
                                    <div className="w-3 h-0.5 bg-current rotate-90" />
                                </div>
                            </button>
                            <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
                            <button
                                onClick={() => editor.chain().focus().addRowBefore().run()}
                                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                title="Add Row Before"
                            >
                                <div className="flex flex-col items-center">
                                    <Plus className="w-3 h-3" />
                                    <ArrowDown className="w-3 h-3 rotate-180" />
                                </div>
                            </button>
                            <button
                                onClick={() => editor.chain().focus().addRowAfter().run()}
                                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                title="Add Row After"
                            >
                                <div className="flex flex-col items-center">
                                    <ArrowDown className="w-3 h-3" />
                                    <Plus className="w-3 h-3" />
                                </div>
                            </button>
                            <button
                                onClick={() => editor.chain().focus().deleteRow().run()}
                                className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Delete Row"
                            >
                                <div className="flex items-center">
                                    <Trash2 className="w-3 h-3" />
                                    <div className="w-3 h-0.5 bg-current" />
                                </div>
                            </button>
                            <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
                            <button
                                onClick={() => editor.chain().focus().deleteTable().run()}
                                className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Delete Table"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </BubbleMenu>
                    )}

                    {/* Editor Content */}
                    <EditorContent editor={editor} />

                    {/* Bottom Padding for scroll */}
                    <div className="h-20" />
                </div>

                {/* Status Bar */}
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-4 px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {editor && (
                        <>
                            <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                <span>{editor.storage.characterCount.words()} words</span>
                            </div>
                            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{Math.ceil(editor.storage.characterCount.words() / 200)} min read</span>
                            </div>
                        </>
                    )}
                </div>
            </div >
        </div >
    );
};
