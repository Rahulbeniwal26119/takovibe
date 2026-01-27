import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { common, createLowlight } from 'lowlight';
import { QuizExtension } from './QuizExtension';
import { CodePlaygroundExtension } from './CodePlaygroundExtension';
import { FAQExtension } from './FAQExtension';
import { SlashCommand } from './SlashCommand';
import CodeBlockComponent from './CodeBlockComponent';
import ImageNodeView from './ImageNodeView';
import { fetchWithAuth } from '../../utils/api';
import { SEOPreview } from './SEOPreview';
import UserAuth from '../UserAuth';
import { Select } from '../ui/Select';

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
    LayoutTemplate,

    Keyboard,
    Eye,

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
    Settings,
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
    apiEndpoint = import.meta.env.PUBLIC_API_URL ? `${import.meta.env.PUBLIC_API_URL}/api/posts/?include_content=true` : 'http://localhost:8000/api/posts/?include_content=true',
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
    const [canPublish, setCanPublish] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showSeoPreview, setShowSeoPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);


    const [showSettings, setShowSettings] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textareas (Robust: handles content change + window resize)
    const adjustTextareaHeight = useCallback(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
        if (descriptionRef.current) {
            descriptionRef.current.style.height = 'auto';
            descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
        }
    }, [frontmatter.title, frontmatter.description]);

    // Adjust on content change
    useLayoutEffect(() => {
        adjustTextareaHeight();
    }, [adjustTextareaHeight]);

    // Adjust on window resize (fixes mobile rotation/screen size changes)
    useEffect(() => {
        window.addEventListener('resize', adjustTextareaHeight);
        return () => window.removeEventListener('resize', adjustTextareaHeight);
    }, [adjustTextareaHeight]);

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
        immediatelyRender: false,
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
                            tabs: {
                                default: null,
                                parseHTML: element => {
                                    const tabsData = element.getAttribute('data-tabs');
                                    return tabsData ? JSON.parse(tabsData) : null;
                                },
                                renderHTML: attributes => {
                                    if (!attributes.tabs) return {};
                                    return {
                                        'data-tabs': JSON.stringify(attributes.tabs),
                                    };
                                },
                            },
                        }
                    },
                    addNodeView() {
                        return ReactNodeViewRenderer(CodeBlockComponent)
                    },
                    addKeyboardShortcuts() {
                        return {
                            'Mod-a': () => {
                                if (this.editor.isActive('codeBlock')) {
                                    const { state } = this.editor;
                                    const { selection } = state;
                                    const { $from } = selection;

                                    // Find the start and end of the current code block
                                    const startPos = $from.start();
                                    const endPos = $from.end();

                                    this.editor.commands.setTextSelection({
                                        from: startPos,
                                        to: endPos
                                    });

                                    return true; // Prevent default behavior
                                }
                                return false;
                            }
                        }
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
            CodePlaygroundExtension,
            FAQExtension,
            Link.extend({
                addKeyboardShortcuts() {
                    return {
                        'Mod-k': () => {
                            // openMediaInput('link') logic needs to be triggered. 
                            // Since we can't easily access the component function from here without binding, 
                            // we can dispatch the custom event 'open-media-input'.
                            this.editor.view.dom.dispatchEvent(new CustomEvent('open-media-input', {
                                detail: { type: 'link' },
                                bubbles: true
                            }))
                            return true
                        }
                    }
                }
            }).configure({
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
                    `prose prose-lg max-w-4xl mx-auto focus:outline-none h-full px-6 pb-4 dark:prose-invert light-mode-editor transition-all duration-500 ease-in-out`,
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

    // Mobile optimization: Focus handling
    useEffect(() => {
        if (editor && titleRef.current) {
            // Optional: simpler mobile-specific logic if needed
        }
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

        // 1. Basic Content Validation
        if (!frontmatter.title.trim() || !frontmatter.description.trim()) {
            setSaveError("Please add a title and description.");
            setTimeout(() => setSaveError(null), 3000);
            return;
        }

        // 2. Meta Fields Validation (Tags, Slug, Image)
        // If these are missing, we open the settings modal to let the user fill them in
        if (!frontmatter.slug.trim() || !frontmatter.tags.trim() || !frontmatter.image.trim()) {
            setShowSettings(true);
            setSaveError("Please complete story details to publish.");
            // Highlight missing fields logic could go here if we want to be fancy, 
            // but opening the modal is a good first step.
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
                    <span class="text-emerald-500">Published!</span>
                `;
                saveStatus.classList.add('bg-emerald-50', 'dark:bg-emerald-900/20');

                // Redirect to the blog post after a short delay
                setTimeout(() => {
                    window.location.href = `/blog/${frontmatter.slug}`;
                }, 1500);
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

    const addCodePlayground = () => {
        editor.chain().focus().insertContent([
            { type: 'codePlayground' },
            { type: 'paragraph' }
        ]).run();
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

    const addFAQ = () => {
        editor.chain().focus().insertContent([
            { type: 'faqSection' },
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
        <div className="relative w-full min-h-screen">
            {/* Main Content Container */}
            <div className="w-full min-h-screen bg-white dark:bg-black transition-colors duration-500">

                {/* Decorative Background Elements - OFF for clean look */}
                {/* <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${isZenMode ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-20 bg-purple-400 dark:bg-purple-600" />
                    <div className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full blur-3xl opacity-20 bg-blue-400 dark:bg-blue-600" />
                </div> */}



                {/* Save Status Bar & Toolbar */}
                <div className="sticky top-0 z-40 transition-all duration-500 backdrop-blur-xl border-b bg-white/80 dark:bg-slate-900/70 border-slate-200/50 dark:border-white/10 opacity-100">
                    <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:px-6 md:py-4">

                        {/* Left: Logo & Status */}
                        <div className="flex items-center gap-4">
                            <a href="/" className="flex items-center gap-2 group" title="Go to Dashboard">
                                <img src="/images/logo.svg" alt="TakoVibe" className="w-8 h-8 rounded-full hover:rotate-12 transition-transform duration-300" />
                            </a>
                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

                            <div id="save-status" className="flex items-center gap-2 text-sm font-medium transition-all duration-300 text-gray-400 dark:text-gray-500">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                                        <span className="text-purple-500 text-xs">Saving...</span>
                                    </>
                                ) : saveError ? (
                                    <>
                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                        <span className="text-red-500 text-xs">{saveError}</span>
                                    </>
                                ) : hasUnsavedChanges ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-amber-500 text-xs">Unsaved changes</span>
                                    </>
                                ) : (
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                        {lastSaved ? 'Saved' : 'Ready to write'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 md:gap-3">

                            {/* Shortcuts Toggle - Desktop Only */}
                            <button
                                onClick={() => setShowShortcuts(true)}
                                className="hidden md:block p-2 md:p-2.5 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-all duration-300"
                                title="Keyboard Shortcuts"
                            >
                                <Keyboard className="w-5 h-5" />
                            </button>

                            {/* Settings Button */}
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-2 md:p-2.5 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-all duration-300"
                                title="Story Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>

                            {/* View Button */}
                            {frontmatter.slug && (
                                <a
                                    href={`/blog/${frontmatter.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden sm:flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-medium text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-all duration-300"
                                    title="View Live Page"
                                >
                                    <Eye className="w-5 h-5" />
                                    <span className="hidden lg:inline">View</span>
                                </a>
                            )}

                            {/* Publish Button (Admins only) */}
                            {canPublish && (
                                <button
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="px-3 py-1.5 md:px-4 md:py-1.5 rounded-full text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-all shadow-sm hover:shadow hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    title="Ready to Publish?"
                                >
                                    {isPublishing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">{isPublishing ? 'Publishing...' : 'Publish'}</span>
                                </button>
                            )}

                            {/* User Profile */}
                            <div className="pl-2 ml-1 border-l border-gray-200 dark:border-gray-700">
                                <UserAuth />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto w-full">
                    {/* Clean Title Input (Medium Style) */}
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-8 pb-2 transition-all duration-500 ease-in-out">
                        <textarea
                            ref={titleRef}
                            value={frontmatter.title}
                            onChange={(e) => {
                                setFrontmatter({ ...frontmatter, title: e.target.value });
                                setHasUnsavedChanges(true);
                                if (validationErrors.includes('title')) setValidationErrors(prev => prev.filter(f => f !== 'title'));
                            }}
                            className="w-full text-4xl md:text-5xl font-serif font-bold bg-transparent border-none outline-none p-0 placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-white transition-all leading-tight mb-2 resize-none overflow-hidden"
                            placeholder="Title"
                            rows={1}
                        />

                        <textarea
                            ref={descriptionRef}
                            value={frontmatter.description}
                            onChange={(e) => {
                                setFrontmatter({ ...frontmatter, description: e.target.value });
                                setHasUnsavedChanges(true);
                                if (validationErrors.includes('description')) setValidationErrors(prev => prev.filter(f => f !== 'description'));
                            }}
                            className="w-full text-xl bg-transparent border-none outline-none resize-none p-0 placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-600 dark:text-gray-300 transition-all font-serif mb-4 resize-none overflow-hidden"
                            placeholder="Tell your story..."
                            rows={1}
                        />
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
                                                <MenuButton onClick={addCodePlayground} icon={LayoutTemplate} label="Code Playground" />
                                                <MenuButton onClick={addFAQ} icon={HelpCircle} label="FAQ Section" />
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


                    {/* Inline Status Info - Inside text flow */}
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-4 flex items-center gap-4 text-xs font-medium text-gray-400 dark:text-gray-500 transition-all duration-500 ease-in-out border-t border-gray-100 dark:border-gray-800 mt-8">
                        {editor && (
                            <>
                                <div className="flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{editor.storage.characterCount.words()} words</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                <div className="flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{Math.ceil(editor.storage.characterCount.words() / 200)} min read</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom Padding for scroll */}
                    <div className="h-20" />
                </div>


            </div >
            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden outline-none max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Story Settings</h3>
                            </div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cover Image */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cover Image</label>
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        value={frontmatter.image}
                                        onChange={(e) => setFrontmatter({ ...frontmatter, image: e.target.value })}
                                        className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm focus:border-purple-500 outline-none transition-colors dark:text-white"
                                        placeholder="https://..."
                                    />
                                    {frontmatter.image && (
                                        <div className="w-16 h-10 rounded overflow-hidden bg-gray-100">
                                            <img src={frontmatter.image} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Author & Slug */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Author</label>
                                <input
                                    type="text"
                                    value={frontmatter.author}
                                    readOnly
                                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm text-gray-500 cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Slug</label>
                                <input
                                    type="text"
                                    value={frontmatter.slug}
                                    onChange={(e) => setFrontmatter({ ...frontmatter, slug: e.target.value })}
                                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm focus:border-purple-500 outline-none transition-colors dark:text-white"
                                    placeholder="post-url-slug"
                                />
                            </div>

                            {/* Date & Tags */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Publish Date</label>
                                <input
                                    type="date"
                                    value={frontmatter.date}
                                    onChange={(e) => setFrontmatter({ ...frontmatter, date: e.target.value })}
                                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm focus:border-purple-500 outline-none transition-colors dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tags</label>
                                <input
                                    type="text"
                                    value={frontmatter.tags}
                                    onChange={(e) => setFrontmatter({ ...frontmatter, tags: e.target.value })}
                                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm focus:border-purple-500 outline-none transition-colors dark:text-white"
                                    placeholder="comma, separated, tags"
                                />
                            </div>

                            {/* Series */}
                            {/* <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Series</label>
                                <input
                                    type="text"
                                    value={frontmatter.series}
                                    onChange={(e) => setFrontmatter({ ...frontmatter, series: e.target.value })}
                                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm focus:border-purple-500 outline-none transition-colors dark:text-white"
                                    placeholder="Optional series name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Order</label>
                                <input
                                    type="number"
                                    value={frontmatter.seriesOrder}
                                    onChange={(e) => setFrontmatter({ ...frontmatter, seriesOrder: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-sm focus:border-purple-500 outline-none transition-colors dark:text-white"
                                />
                            </div> */}

                            {/* SEO Preview Toggle */}
                            <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => setShowSeoPreview(!showSeoPreview)}
                                    className="text-xs font-bold uppercase tracking-wider text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                >
                                    {showSeoPreview ? 'Hide' : 'Show'} SEO Preview
                                </button>
                                {showSeoPreview && (
                                    <div className="mt-4">
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
                    </div>
                </div>
            )}
            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden outline-none">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <Keyboard className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Shortcuts</h3>
                            </div>
                            <button
                                onClick={() => setShowShortcuts(false)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-2">
                            <div className="grid gap-1">
                                {[
                                    { label: 'Menu', keys: ['/'] },
                                    { label: 'Bold', keys: ['⌘', 'B'] },
                                    { label: 'Italic', keys: ['⌘', 'I'] },
                                    { label: 'Link', keys: ['⌘', 'K'] },
                                    { label: 'Heading 1', keys: ['#', 'Space'] },
                                    { label: 'Heading 2', keys: ['##', 'Space'] },
                                    { label: 'Bullet List', keys: ['-', 'Space'] },
                                    { label: 'Ordered List', keys: ['1.', 'Space'] },
                                    { label: 'Quote', keys: ['>', 'Space'] },
                                    { label: 'Code Block', keys: ['```', 'Enter'] },
                                    { label: 'Divider', keys: ['---', 'Enter'] },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                                        <div className="flex gap-1">
                                            {item.keys.map((key, k) => (
                                                <kbd key={k} className="min-w-[1.5rem] px-1.5 py-0.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm text-center font-sans">
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
export default BlogEditor;
