import React, { useState, useRef, useEffect, Suspense } from 'react';
import { X, Send, Sparkles, User, Minimize2, Maximize2, Minus, Mic, MicOff, Trash2, Check, Code2, FileText, Lightbulb, Brain, PanelRight, PanelRightClose } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// Lazy load heavy components
const Mermaid = React.lazy(() => import('./Mermaid'));

interface ChatBotProps {
    articleContext?: string;
    articleTitle?: string;
    articleId?: string;
    isSidebar?: boolean;
    initialMessage?: string;
    onMessageProcessed?: () => void;
    floatingOnly?: boolean; // disable immersive split (for pages without an article container)
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    mode?: string;
    displayContent?: string;
}

function parseQuizContent(raw: string): any | null {
    if (!raw) return null;
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    if (!text.startsWith('{') && !text.startsWith('[')) return null;
    try {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.questions)) return data;
    } catch {
        return null;
    }
    return null;
}

export default function ChatBot({
    articleContext,
    articleTitle,
    articleId,
    isSidebar = false,
    initialMessage,
    onMessageProcessed,
    floatingOnly = false
}: ChatBotProps) {
    const [isOpen, setIsOpen] = useState(isSidebar);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    // Default to split view on desktop (like Code Studio / Excalidraw); floating sheet on mobile
    const [isSplit, setIsSplit] = useState(() => !floatingOnly && typeof window !== 'undefined' && window.innerWidth >= 768);
    const [splitRatio, setSplitRatio] = useState(62); // article % on the left; Kumi takes the rest
    const [isMobile, setIsMobile] = useState(false);
    const isDraggingRef = useRef(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hi! I'm Kumi. I can help you understand this note better. Ask me anything!" }
    ]);

    const [input, setInput] = useState('');
    const [replyContext, setReplyContext] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isPremium, setIsPremium] = useState(false); // Mock/State for Premium Feature

    const scrollToBottom = (instant = false) => {
        if (shouldAutoScrollRef.current) {
            messagesEndRef.current?.scrollIntoView({
                behavior: instant ? 'auto' : 'smooth'
            });
        }
    };

    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            shouldAutoScrollRef.current = isAtBottom;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Persistence: Load
    useEffect(() => {
        // Prefer stable ID (slug) > Title > General
        const key = `chat_history_${articleId || articleTitle || 'general'}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                    // Force an instant scroll to bottom after state update
                    setTimeout(() => scrollToBottom(true), 50);
                }
            } catch (e) {
                console.warn('Failed to load chat history', e);
            }
        }
    }, [articleId, articleTitle]);

    // Persistence: Save
    useEffect(() => {
        if (!isLoading && messages.length > 1) {
            const key = `chat_history_${articleId || articleTitle || 'general'}`;
            localStorage.setItem(key, JSON.stringify(messages));
        }
    }, [messages, isLoading, articleId, articleTitle]);

    useEffect(() => {
        if (isOpen) {
            shouldAutoScrollRef.current = true;
            setTimeout(() => {
                scrollToBottom(true); // Instant on opening sidebar
            }, 100);
        }

        // Notify Toolbar to hide/show
        const event = new CustomEvent('ai-chat-state-change', {
            detail: { isOpen: isOpen && !isMinimized }
        });
        window.dispatchEvent(event);

    }, [isOpen, isMinimized]);

    // Track viewport so split is desktop-only
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const splitActive = isSplit && isOpen && !isMobile && !isSidebar && !floatingOnly;

    // Immersive split: toggle the shared body flag and coordinate with the other immersive panels
    useEffect(() => {
        if (splitActive) {
            document.body.classList.add('split-view-active');
            // Opening Kumi-split closes Code Studio / Excalidraw (they listen for this)
            window.dispatchEvent(new CustomEvent('open-kumi-split'));
        } else {
            document.body.classList.remove('split-view-active');
        }
        return () => document.body.classList.remove('split-view-active');
    }, [splitActive]);

    // Exit split when another immersive panel opens
    useEffect(() => {
        const exit = () => setIsSplit(false);
        window.addEventListener('open-code-studio', exit);
        window.addEventListener('open-excalidraw', exit);
        return () => {
            window.removeEventListener('open-code-studio', exit);
            window.removeEventListener('open-excalidraw', exit);
        };
    }, []);

    // Draggable divider for split mode
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            e.preventDefault();
            const pct = (e.clientX / window.innerWidth) * 100;
            if (pct > 30 && pct < 80) setSplitRatio(pct);
        };
        const onUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        if (splitActive) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [splitActive]);

    useEffect(() => {
        const handleAskKumi = (e: any) => {
            if (e.detail && e.detail.message) {
                const text = e.detail.message;
                setTimeout(() => {
                    sendMessage(text);
                }, 300);
            }
        };

        window.addEventListener('ask-kumi', handleAskKumi);
        return () => window.removeEventListener('ask-kumi', handleAskKumi);
    }, []);

    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    useEffect(() => {
        const handleAiTrigger = (event: CustomEvent<{ text: string; mode?: string }>) => {
            const { text: selectedText, mode } = event.detail;
            setIsOpen(true);
            setIsMinimized(false);
            shouldAutoScrollRef.current = true; // Force scroll on trigger

            if (mode === 'explain') {
                setInput("Can you explain how this code works line-by-line?");
            }

            if (mode === 'debug') {
                // Immediate "One-Click" fix
                sendMessage("I'm getting this error. How can I fix it?", { context: selectedText });
                return;
            }

            // Set the reply context instead of modifying input directly
            setReplyContext(selectedText);

            // Focus input after a short delay to allow UI to update
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        };

        const handleAiToggle = () => {
            setIsOpen(prev => !prev);
            setIsMinimized(false);
            shouldAutoScrollRef.current = true;
        };

        window.addEventListener('trigger-ai-chat', handleAiTrigger as EventListener);
        window.addEventListener('toggle-ai-chat', handleAiToggle as EventListener);

        return () => {
            window.removeEventListener('trigger-ai-chat', handleAiTrigger as EventListener);
            window.removeEventListener('toggle-ai-chat', handleAiToggle as EventListener);
        };
    }, []);

    const [isClosing, setIsClosing] = useState(false); // Track closing animation
    const [isOpening, setIsOpening] = useState(false); // Track opening animation (button press)
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current && messages.length > 0) {
            scrollToBottom(true);
            isInitialMount.current = false;
        }
    }, [messages]);

    const handleOpen = () => {
        setIsOpening(true);
        // "Anticipation" animation: Button shrinks/presses down before the window explodes out
        setTimeout(() => {
            setIsOpen(true);
            setIsOpening(false);
        }, 200);
    };

    const handleClose = () => {
        setIsClosing(true);

        // Immediately notify toolbar to show itself, running the animation 
        // in parallel with the chat closing animation vs waiting for it to finish.
        const event = new CustomEvent('ai-chat-state-change', {
            detail: { isOpen: false }
        });
        window.dispatchEvent(event);

        setTimeout(() => {
            setIsOpen(false);
            setIsMinimized(false);
            setIsClosing(false);
        }, 500); // Match transition duration
    };

    const handleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.innerWidth < 768) {
            // Mobile: Minimize actions as Close (back to icon)
            handleClose();
        } else {
            // Desktop: standard minimize
            setIsMinimized(true);
        }
    };

    // Stop listening on close
    useEffect(() => {
        if (!isOpen) {
            if (isListening) {
                recognitionRef.current?.stop();
                setIsListening(false);
            }
        }
    }, [isOpen]);

    // Voice Input Logic
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const [confirmClear, setConfirmClear] = useState(false);

    const clearChat = () => {
        const initialMessage: Message = { role: 'assistant', content: `Hi! I'm your AI assistant. I can help you understand "${articleTitle || 'this article'}" better. Ask me anything!` };
        setMessages([initialMessage]);
        const key = `chat_history_${articleId || articleTitle || 'general'}`;
        localStorage.removeItem(key);
        setReplyContext(null);
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }
        setConfirmClear(false);
    };

    // Auto-Hide on Scroll (The "Meta" Solution)
    // When the user scrolls the page (reading flow), the chat fades away to almost invisible.
    // When they stop, it reappears. This ensures 100% reading capability without closing the chat.
    useEffect(() => {
        const handleWindowScroll = () => {
            if (!isOpen || isMinimized) return; // Only active when chat is open/blocking

            setIsScrolling(true);

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 300); // 300ms pause defines "stop scrolling"
        };

        window.addEventListener('scroll', handleWindowScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleWindowScroll);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, [isOpen, isMinimized]);

    // Track previous loading state to detect completion
    const wasLoadingRef = useRef(false);

    // Auto-Detect Excalidraw JSON or Mermaid and Dispatch
    useEffect(() => {
        // Only run if we just finished loading (prevents auto-run on history load)
        if (wasLoadingRef.current && !isLoading && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'assistant') {
                // Quiz: hand off to the dedicated quiz drawer instead of rendering inline
                if (lastMsg.mode === 'quiz') {
                    const quiz = parseQuizContent(lastMsg.content);
                    if (quiz) {
                        window.dispatchEvent(new CustomEvent('open-quiz', { detail: { data: quiz } }));
                        setIsMinimized(true);
                    }
                    wasLoadingRef.current = isLoading;
                    return;
                }

                try {
                    const content = lastMsg.content.trim();

                    // 1. Detect Mermaid Code Block
                    if (content.includes('```mermaid')) {
                        const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
                        if (mermaidMatch && mermaidMatch[1]) {
                            const mermaidCode = mermaidMatch[1].trim();
                            const event = new CustomEvent('request-add-to-sketch', {
                                detail: {
                                    elements: mermaidCode,
                                    type: 'mermaid' // Signal that this is mermaid code, not Excalidraw JSON
                                }
                            });
                            window.dispatchEvent(event);
                            setIsMinimized(true);
                            return; // Stop processing
                        }
                    }

                    // Detect JSON Object or Array
                    if ((content.startsWith('{') || content.startsWith('[')) && (content.endsWith('}') || content.endsWith(']'))) {
                        const json = JSON.parse(content);

                        if (Array.isArray(json) && json.length > 0 && (json[0].type || json[0].id)) {
                            const event = new CustomEvent('request-add-to-sketch', { detail: { elements: json } });
                            window.dispatchEvent(event);
                            setIsMinimized(true); // Auto-minimize when drawing starts
                        }

                        if (json.elements && Array.isArray(json.elements)) {
                            const event = new CustomEvent('request-add-to-sketch', { detail: { elements: json.elements } });
                            window.dispatchEvent(event);
                            setIsMinimized(true); // Auto-minimize when drawing starts
                        }
                    }
                } catch (e) {
                    // Not valid JSON, ignore
                }
            }
        }

        // Update ref for next render
        wasLoadingRef.current = isLoading;
    }, [messages, isLoading]);

    const sendMessage = async (text: string, options?: { mode?: string, context?: string, displayText?: string }) => {
        // Allow empty text if we have context/mode
        if ((!text.trim() && !replyContext && !options?.context) || isLoading) return;

        shouldAutoScrollRef.current = true;

        let userMessage = text.trim();
        let contextToSend = options?.context || replyContext;

        // If there's context and it's NOT a hidden mode request, format it
        if (contextToSend && !options?.mode) {
            userMessage = `> ${contextToSend}\n\n${userMessage}`;
            setReplyContext(null);
        }

        // Add User Message — displayContent shows a friendly label while content carries the real prompt
        const newMessages = [...messages, { role: 'user', content: userMessage, mode: options?.mode, displayContent: options?.displayText } as Message];
        setMessages(newMessages);

        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages
                        .filter(m => m.role !== 'assistant' || m.content !== `Hi! I'm your AI assistant. I can help you understand "${articleTitle || 'this article'}" better. Ask me anything!`)
                        .map(m => ({ role: m.role, content: m.content })),
                    article_context: articleContext,
                    mode: options?.mode // Pass mode to API
                })
            });

            if (!response.ok) throw new Error('Failed to fetch response');
            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            setMessages(prev => [...prev, { role: 'assistant', content: '', mode: options?.mode }]);

            let aiResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                aiResponse += chunk;

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                        lastMessage.content = aiResponse;
                    }
                    return newMessages;
                });
            }

            // Premium Nudge for Debug Mode
            if (options?.mode === 'debug' && !isPremium) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**🚀 Upgrade to Premium**\n\nGet faster, more detailed debugging and unlimited queries with our Premium plan.\n\n[View Plans](/pricing)`
                }]);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'assistant' && lastMessage.content === '') {
                    lastMessage.content = 'Sorry, I encountered an error. Please try again.';
                    return newMessages;
                }
                return [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }];
            });
        } finally {
            setIsLoading(false);
            shouldAutoScrollRef.current = true;
            if (options?.context) setReplyContext(null); // Ensure cleaned up
        }
    };

    useEffect(() => {
        if (initialMessage) {
            sendMessage(initialMessage);
            onMessageProcessed?.();
        }
    }, [initialMessage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
        setInput(''); // Clear input immediately for UX
    };


    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');

        // Smart handling: 
        // If text is long (> 50 chars) or contains newlines, treat it as "Context" 
        // to keep the input field clean for the user's question.
        // Short text (like function names or single words) pastes normally.
        if (pastedText && (pastedText.length > 50 || pastedText.includes('\n'))) {
            e.preventDefault();
            setReplyContext(pastedText);
            shouldAutoScrollRef.current = true;
        }
    };

    const containerClasses = [
        // Base: 
        // Mobile: Fixed bottom inset-0 (full width bottom sheet)
        // Desktop: Fixed bottom-right corner
        // FIX: Increased z-index to 20000 to be above CodeEditorDrawer (z-10000)
        'fixed bottom-0 z-[20000] flex flex-col overflow-hidden border border-neutral-200 shadow-xl dark:border-neutral-800',
        'inset-x-0 md:inset-auto md:left-auto md:right-6 md:bottom-6',
        'kumi-chatbot-container', // Hook for CSS

        // Origin:
        // Mobile: Center bottom (grows up from where toolbar was)
        // Desktop: Bottom Right (grows from button)
        'origin-bottom md:origin-bottom-right',

        'bg-white dark:bg-neutral-950',
        'transition-all duration-300', // Smooth transition for entry/exit and hiding
        // Hide when comments are open (body class injected by comments drawer)
        'group-[.comments-open]/body:opacity-0 group-[.comments-open]/body:pointer-events-none group-[.comments-open]/body:translate-y-4',

        // Entry Animation:
        // Mobile: Slide up + Fade (Simple replacement feel)
        // Desktop: Genie Scale (Grow from icon)
        !isClosing
            ? 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 md:zoom-in-0 md:slide-in-from-bottom-0 duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]'
            : '',

        // Exit/Scroll Animation Logic:
        isClosing
            ? 'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] opacity-0 scale-95 translate-y-full rounded-t-[2rem] md:rounded-[5rem] md:scale-0 md:translate-y-0' // Mobile: slide down | Desktop: shrink
            : isScrolling && !isMinimized
                ? 'transition-all duration-500 cubic-bezier(0.4,0,0.2,1) translate-y-[calc(100%-3.5rem)] shadow-lg md:translate-y-0 md:shadow-2xl rounded-t-3xl md:rounded-2xl'
                : 'transition-all duration-500 cubic-bezier(0.19,1,0.22,1) translate-y-0 rounded-t-3xl md:rounded-2xl',

        isMinimized ? 'h-14 cursor-pointer md:w-72' : '', // Minimized spans mobile width
        !isMinimized && isExpanded ? 'h-[85vh] md:w-[800px]' : '',
        !isMinimized && !isExpanded ? 'h-[50dvh] md:w-96 md:h-[600px] max-h-[85dvh]' : ''
    ].filter(Boolean).join(' ');

    // Immersive split: full-height pane on the right; the article (#immersive-article-container)
    // is squeezed to splitRatio% and the header/footer are hidden by the injected styles below.
    const splitContainerClasses = [
        'kumi-chatbot-container flex flex-col overflow-hidden bg-white dark:bg-neutral-950',
        'fixed top-0 bottom-0 right-0 z-[10000] border-l border-neutral-200 shadow-2xl dark:border-neutral-800',
    ].join(' ');

    const finalClasses = splitActive ? splitContainerClasses : containerClasses;

    if (isSidebar) {
        return (
            <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-neutral-950">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div
                        ref={chatContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 space-y-4 overflow-y-auto bg-neutral-50 p-4 dark:bg-neutral-950"
                    >
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === 'user'
                                    ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                                    : 'bg-orange-600 text-white'
                                    }`}>
                                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                </div>
                                <div
                                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${message.role === 'user'
                                        ? 'rounded-tr-sm bg-orange-600 text-white'
                                        : 'rounded-tl-sm border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                                        }`}
                                >
                                    <div className={`prose prose-sm max-w-none ${message.role === 'user'
                                        ? 'prose-invert'
                                        : 'prose-neutral dark:prose-invert prose-p:text-neutral-800 dark:prose-p:text-neutral-200 prose-strong:text-black dark:prose-strong:text-white'
                                        }`}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                        >
                                            {message.displayContent || message.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.content === '' && (
                            <div className="flex gap-3 animate-pulse">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                                    <span className="text-sm font-medium text-neutral-500">Kumi is thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="relative flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Kumi a question..."
                                className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-4 pr-12 text-sm text-neutral-900 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 rounded-lg bg-orange-600 p-1.5 text-white transition-colors hover:bg-orange-500"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* IMMERSIVE SPLIT: squeeze the article left, hide chrome, Kumi takes the right */}
            {splitActive && (
                <style>{`
                    body { overflow: hidden !important; }
                    #site-header, footer, .reading-progress { display: none !important; }

                    #zen-nav {
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        z-index: 9999999 !important;
                        position: fixed !important;
                        top: 0.75rem !important;
                        left: 0.75rem !important;
                        right: auto !important;
                        width: calc(${splitRatio}% - 1.5rem) !important;
                        max-width: calc(${splitRatio}% - 1.5rem) !important;
                        padding: 0 !important;
                        transform: none !important;
                        pointer-events: auto !important;
                    }
                    #zen-nav > div {
                        width: 100% !important;
                        max-width: none !important;
                        height: 3.75rem !important;
                        border-color: rgba(64, 64, 64, 0.9) !important;
                        background: rgba(23, 23, 23, 0.92) !important;
                        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22) !important;
                    }
                    #article-nav-links { display: none !important; }
                    #article-nav-actions a {
                        padding: 0.5rem 0.75rem !important;
                        border-radius: 0.5rem !important;
                        background: #ea580c !important;
                        color: #fff !important;
                    }
                    #zen-nav #zen-menu-trigger {
                        display: grid !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                        background: rgba(255, 255, 255, 0.08) !important;
                        color: white !important;
                        border-color: rgba(255, 255, 255, 0.12) !important;
                        box-shadow: none !important;
                        backdrop-filter: blur(12px) !important;
                    }
                    html.dark #zen-nav #zen-menu-trigger {
                        background: rgba(255, 255, 255, 0.08) !important;
                        border: 1px solid rgba(255, 255, 255, 0.12) !important;
                    }

                    #immersive-article-container {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        width: ${splitRatio}% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 5.25rem 2rem 8rem !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                        z-index: 50 !important;
                        background: var(--zen-bg, #fafaf9);
                        border-right: 1px solid #262626;
                    }
                    html.dark #immersive-article-container {
                        background: var(--zen-bg, #0a0a0a);
                        border-right: 1px solid #262626;
                    }
                    aside { display: none !important; }
                    #immersive-article-container > div {
                        max-width: 800px !important;
                        margin: 0 auto !important;
                        display: block !important;
                    }
                    #article { max-width: 100% !important; }
                    #article header {
                        padding-top: 2rem !important;
                        padding-bottom: 2rem !important;
                        margin-bottom: 2rem !important;
                    }
                    #article h1 {
                        font-size: clamp(2rem, 3.2vw, 3.25rem) !important;
                        line-height: 1.08 !important;
                        max-width: 100% !important;
                    }
                    #article header p {
                        max-width: 40rem !important;
                        font-size: 1rem !important;
                        line-height: 1.7 !important;
                    }
                `}</style>
            )}

            {/* DRAG HANDLE (split only) */}
            {splitActive && !isMinimized && (
                <div
                    className="fixed top-0 bottom-0 z-[10001] flex w-[6px] cursor-col-resize items-center justify-center bg-neutral-200 transition-colors duration-150 hover:bg-orange-500 dark:bg-neutral-800 group"
                    style={{ left: `calc(${splitRatio}% - 3px)` }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        isDraggingRef.current = true;
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }}
                >
                    <div className="h-8 w-1 rounded-full bg-neutral-400 group-hover:bg-white/90"></div>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    className={finalClasses}
                    style={splitActive ? { width: `${100 - splitRatio}%` } : undefined}
                    onClick={isMinimized ? () => setIsMinimized(false) : undefined}
                >


                    {/* Header */}
                    <div
                        className="z-10 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950"
                    >
                        <div className="flex cursor-pointer items-center gap-2 text-neutral-900 dark:text-white" onClick={() => { if (!isSplit) setIsMinimized(!isMinimized); }}>
                            <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            <span className="font-bold">Kumi</span>
                            {isPremium && (
                                <span className="ml-1 rounded-full border border-orange-500 bg-orange-600 px-1.5 py-0.5 font-mono text-[10px] text-white">
                                    PREMIUM
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-neutral-400">
                            {!isMinimized && (
                                <>
                                    {!confirmClear ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmClear(true); }}
                                            className="rounded-md p-1.5 transition-colors hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-900 dark:hover:text-red-400"
                                            title="Clear Chat History"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="flex animate-in items-center rounded-md bg-red-50 duration-200 fade-in zoom-in dark:bg-red-950/40">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); clearChat(); }}
                                                className="rounded-l-md p-1.5 text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
                                                title="Confirm Clear"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmClear(false); }}
                                                className="rounded-r-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    {!floatingOnly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsSplit((s) => !s); setIsExpanded(false); setIsMinimized(false); }}
                                            className={`hidden rounded-md p-1.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200 md:inline-flex ${isSplit ? 'text-orange-600 dark:text-orange-400' : ''}`}
                                            title={isSplit ? "Exit split view" : "Split view"}
                                        >
                                            {isSplit ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
                                        </button>
                                    )}
                                    {!isSplit && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                            className="rounded-md p-1.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                                            title={isExpanded ? "Collapse" : "Expand"}
                                        >
                                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                        </button>
                                    )}
                                    {!isSplit && (
                                        <button
                                            onClick={handleMinimize}
                                            className="rounded-md p-1.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                                            title="Minimize"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    )}
                                </>
                            )}
                            {isMinimized && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                                    className="rounded-md p-1.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                                    title="Restore"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                                className="rounded-md p-1.5 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div >

                    {/* Chat Area */}
                    {
                        !isMinimized && (
                            <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300 opacity-100">
                                <div
                                    ref={chatContainerRef}
                                    onScroll={handleScroll}
                                    className="flex-1 space-y-4 overflow-y-auto bg-neutral-50 p-4 scrollbar-thin scrollbar-thumb-neutral-300 dark:bg-neutral-950 dark:scrollbar-thumb-neutral-700"
                                >
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === 'user'
                                                ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                                                : 'bg-orange-600 text-white'
                                                }`}>
                                                {message.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                            </div>
                                            <div
                                                className={`max-w-[80%] px-4 py-3 rounded-2xl text-base leading-relaxed ${message.role === 'user'
                                                    ? 'rounded-tr-sm bg-orange-600 text-white'
                                                    : 'rounded-tl-sm border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                                                    }`}
                                            >
                                                <div className={`prose max-w-none ${message.role === 'user'
                                                    ? 'prose-invert'
                                                    : 'prose-neutral dark:prose-invert prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-headings:text-neutral-900 dark:prose-headings:text-neutral-100 prose-strong:text-neutral-900 dark:prose-strong:text-white prose-ul:text-neutral-700 dark:prose-ul:text-neutral-300 prose-ol:text-neutral-700 dark:prose-ol:text-neutral-300 prose-li:text-neutral-700 dark:prose-li:text-neutral-300 prose-code:text-orange-700 dark:prose-code:text-orange-300 prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400 prose-a:text-orange-600 dark:prose-a:text-orange-400'
                                                    }`}>
                                                    {(() => {
                                                        const isAssistant = message.role === 'assistant';
                                                        const isQuiz = isAssistant && (message.mode === 'quiz' || /"questions"\s*:/.test(message.content));

                                                        // Quiz: hand off to the quiz drawer — never render raw JSON in chat
                                                        if (isQuiz) {
                                                            const quizData = parseQuizContent(message.content);
                                                            if (quizData) {
                                                                return (
                                                                    <button
                                                                        onClick={() => window.dispatchEvent(new CustomEvent('open-quiz', { detail: { data: quizData } }))}
                                                                        className="group flex w-full items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/20 dark:hover:bg-orange-950/40"
                                                                    >
                                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                                                                            <Brain className="h-5 w-5" />
                                                                        </span>
                                                                        <span className="flex flex-col">
                                                                            <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                                                                                {quizData.title || 'Quiz ready'}
                                                                            </span>
                                                                            <span className="text-xs text-orange-700/80 dark:text-orange-300/80">
                                                                                {quizData.questions.length} questions · tap to open
                                                                            </span>
                                                                        </span>
                                                                    </button>
                                                                );
                                                            }
                                                            // Still streaming, or finished but unparseable — show a friendly state, not JSON
                                                            return (
                                                                <div className="flex items-center gap-2 py-2 text-neutral-500 dark:text-neutral-400">
                                                                    {isLoading ? (
                                                                        <>
                                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                                                                            <span className="text-sm font-medium">Generating quiz…</span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-sm font-medium">Couldn't generate a quiz. Please try again.</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }

                                                        // Fallback / Standard Text
                                                        return (
                                                            <div className={isAssistant && message.mode === 'debug' ? "rounded-xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20 md:-mx-2" : ""}>
                                                                {isAssistant && message.mode === 'debug' && (
                                                                    <div className="mb-3 flex items-center gap-2 border-b border-orange-100 pb-3 dark:border-orange-900/50">
                                                                        <div className="rounded bg-orange-600 p-1.5 text-white"><Code2 className="w-3 h-3" /></div>
                                                                        <span className="text-xs font-bold uppercase tracking-widest text-orange-900 dark:text-orange-100">Debug Solution</span>
                                                                    </div>
                                                                )}
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    rehypePlugins={[rehypeHighlight]}
                                                                    components={{
                                                                        pre: ({ node, ...props }) => (
                                                                            <div className="relative group/code">
                                                                                <pre {...props} className="my-2 overflow-x-auto rounded-lg bg-neutral-950 p-4 text-sm" />
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        const code = (e.currentTarget.previousSibling as HTMLElement)?.textContent || '';
                                                                                        navigator.clipboard.writeText(code);
                                                                                        const btn = e.currentTarget;
                                                                                        const scan = btn.querySelector('span');
                                                                                        if (scan) scan.innerText = 'Copied!';
                                                                                        setTimeout(() => { if (scan) scan.innerText = 'Copy'; }, 2000);
                                                                                    }}
                                                                                    className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-xs text-white/70 hover:text-white rounded opacity-0 group-hover/code:opacity-100 transition-opacity"
                                                                                >
                                                                                    <span>Copy</span>
                                                                                </button>
                                                                            </div>
                                                                        ),
                                                                        code: ({ node, className, children, ...props }) => {
                                                                            const match = /language-(\w+)/.exec(className || '');
                                                                            if (match && match[1] === 'mermaid') {
                                                                                return (
                                                                                    <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading Diagram...</div>}>
                                                                                        <Mermaid chart={String(children).replace(/\n$/, '')} />
                                                                                    </Suspense>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <code {...props} className={className + " bg-black/10 dark:bg-white/10 rounded px-1 py-0.5"}>
                                                                                    {children}
                                                                                </code>
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    {message.displayContent || message.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && messages[messages.length - 1]?.content === '' && (
                                        <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white ring-2 ring-white dark:ring-neutral-900">
                                                <Sparkles className="w-4 h-4 animate-pulse" />
                                            </div>
                                            <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                                                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Kumi is thinking</span>
                                                <div className="flex gap-1">
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500" style={{ animationDelay: '150ms' }}></span>
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500" style={{ animationDelay: '300ms' }}></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Smart Starters - Suggested Questions */}
                                    {messages.length <= 1 && !isLoading && !replyContext && (
                                        <div className="grid grid-cols-1 gap-2 mt-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {[
                                                { icon: FileText, text: "Summarize this article" },
                                                { icon: Lightbulb, text: "What are the key takeaways?" },
                                                { divider: true },
                                                {
                                                    icon: Brain,
                                                    text: "Quiz me!",
                                                    displayText: "Generate a quiz",
                                                    mode: "quiz",
                                                    prompt: `Generate a short multiple-choice quiz about this article.
Return STRICT JSON format only. Do not add any conversational text before or after the JSON.
Format:
{
  "title": "Quiz Title",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct..."
    }
  ]
}`
                                                }
                                            ].map((starter, i) => (
                                                // @ts-ignore
                                                starter.divider ? <div key={i} className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" /> :
                                                    <button
                                                        key={i}
                                                        // @ts-ignore
                                                        onClick={() => sendMessage(starter.prompt || starter.text, (starter.mode || starter.displayText) ? { mode: starter.mode, displayText: starter.displayText } : undefined)}
                                                        className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-900 dark:hover:bg-orange-950/20"
                                                    >
                                                        {/* @ts-ignore */}
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-transform group-hover:scale-105 dark:bg-orange-950/50 dark:text-orange-300">
                                                            {/* @ts-ignore */}
                                                            <starter.icon className="h-4 w-4" />
                                                        </span>
                                                        <div className="flex flex-col">
                                                            {/* @ts-ignore */}
                                                            <span className="text-sm font-medium text-neutral-700 group-hover:text-orange-700 dark:text-neutral-200 dark:group-hover:text-orange-300">{starter.text}</span>
                                                        </div>
                                                    </button>
                                            ))}
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <form onSubmit={handleSubmit} className="border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                                    {replyContext && (
                                        <div key={replyContext} className="group/reply relative mb-3 flex animate-in items-start justify-between rounded-lg border-l-4 border-orange-500 bg-neutral-100 p-3 duration-200 slide-in-from-bottom-2 dark:bg-neutral-900">
                                            <div className="flex-1 pr-6">
                                                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                                    <Sparkles className="w-3 h-3" />
                                                    <span>Context from clipboard</span>
                                                </div>
                                                <p className="line-clamp-2 text-xs italic text-neutral-600 dark:text-neutral-300">
                                                    "{replyContext}"
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReplyContext(null)}
                                                className="absolute right-2 top-2 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="relative flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onPaste={handlePaste}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={replyContext ? "Ask about this text..." : "Ask a question..."}
                                            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-100 py-3 pl-4 pr-24 text-neutral-900 placeholder-neutral-500 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                                        />

                                        {/* Voice Input */}
                                        <button
                                            type="button"
                                            onClick={toggleListening}
                                            className={`absolute right-12 p-2 rounded-lg transition-all duration-200 ${isListening
                                                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 bg-red-50 dark:bg-red-900/10 ring-1 ring-red-500/50'
                                                : 'text-neutral-400 hover:bg-neutral-200 hover:text-orange-600 dark:hover:bg-neutral-800'
                                                }`}
                                            title={isListening ? "Stop Listening" : "Voice Input"}
                                        >
                                            {isListening ? <MicOff className="w-4 h-4 animate-pulse relative z-10" /> : <Mic className="w-4 h-4" />}
                                            {isListening && <span className="absolute inset-0 rounded-lg bg-red-400/20 animate-ping"></span>}
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={(!input.trim() && !replyContext) || isLoading}
                                            className="absolute right-2 rounded-lg bg-orange-600 p-2 text-white transition-colors duration-200 hover:bg-orange-500 disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex flex-col items-center gap-0.5 text-center">
                                        <div className="flex items-center justify-center gap-1.5 opacity-60">
                                            <Sparkles className="h-3 w-3 text-orange-500" />
                                            <p className="text-[10px] text-neutral-400">Powered by TakoVibe AI</p>
                                        </div>
                                        <p className="text-[10px] text-neutral-400">
                                            We don't store your conversations — they're saved only in your device's local storage.
                                        </p>
                                    </div>
                                </form>
                            </div>
                        )
                    }
                </div>
            )}
        </>
    );
}
