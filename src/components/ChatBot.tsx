import React, { useState, useRef, useEffect, Suspense } from 'react';
import { MessageCircle, X, Send, Sparkles, User, Minimize2, Maximize2, Minus, Volume2, VolumeX, Copy, Mic, MicOff, Trash2, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// Lazy load heavy components
const Mermaid = React.lazy(() => import('./Mermaid'));
const QuizCard = React.lazy(() => import('./QuizCard'));

interface ChatBotProps {
    articleContext?: string;
    articleTitle?: string;
    articleId?: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatBot({ articleContext, articleTitle, articleId }: ChatBotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: `Hi! I'm your AI assistant. I can help you understand "${articleTitle || 'this article'}" better. Ask me anything!` }
    ]);
    const [input, setInput] = useState('');
    const [replyContext, setReplyContext] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        if (shouldAutoScrollRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

        // Notify Toolbar to hide/show
        const event = new CustomEvent('ai-chat-state-change', {
            detail: { isOpen: isOpen && !isMinimized }
        });
        window.dispatchEvent(event);

    }, [isOpen, isMinimized]);

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

            if (mode === 'visualize') {
                sendMessage("Visualize this", { mode: 'visualize', context: selectedText });
                return;
            }

            if (mode === 'explain') {
                setInput("Can you explain how this code works line-by-line?");
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

    // Speech Logic
    const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);

    const speak = (text: string) => {
        // console.log("Speak called:", text.substring(0, 50));
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // Stop current

        // Strip markdown roughly for better speech
        const cleanText = text
            .replace(/```[\s\S]*?```/g, 'Code snippet provided.') // Skip code blocks
            .replace(/[*#_`~>]/g, '') // Remove formatting chars
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links to text

        const utterance = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(utterance);
    };

    // Stop speech/listening on close
    useEffect(() => {
        if (!isOpen) {
            window.speechSynthesis?.cancel();
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
        window.speechSynthesis?.cancel();
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

    const sendMessage = async (text: string, options?: { mode?: string, context?: string }) => {
        // Allow empty text if we have context/mode (e.g. visualize)
        if ((!text.trim() && !replyContext && !options?.context) || isLoading) return;

        shouldAutoScrollRef.current = true;

        let userMessage = text.trim();
        let contextToSend = options?.context || replyContext;

        // If there's context and it's NOT a hidden mode request, format it
        if (contextToSend && !options?.mode) {
            userMessage = `> ${contextToSend}\n\n${userMessage}`;
            setReplyContext(null);
        }

        // Add User Message
        const newMessages = [...messages, { role: 'user', content: userMessage } as Message];
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

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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

            if (isSpeechEnabled && aiResponse) {
                speak(aiResponse);
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
        'fixed bottom-0 z-[9999] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden',
        'inset-x-0 md:inset-auto md:left-auto md:right-6 md:bottom-6',
        'kumi-chatbot-container', // Hook for CSS

        // Origin:
        // Mobile: Center bottom (grows up from where toolbar was)
        // Desktop: Bottom Right (grows from button)
        'origin-bottom md:origin-bottom-right',

        'bg-white dark:bg-slate-900',
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

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div className={containerClasses} onClick={isMinimized ? () => setIsMinimized(false) : undefined}>


                    {/* Header */}
                    <div
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-blue-600 shadow-md z-10 h-14"
                    >
                        <div className="flex items-center gap-2 text-white cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                            <Sparkles className="w-5 h-5" />
                            <span className="font-bold">Kumi</span>
                            <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded-full text-white/90 border border-white/10 shadow-sm ml-1">
                                PREVIEW
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-white/80">
                            {!isMinimized && (
                                <>
                                    {!confirmClear ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmClear(true); }}
                                            className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-red-300"
                                            title="Clear Chat History"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="flex items-center bg-red-500/20 rounded-lg animate-in fade-in zoom-in duration-200">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); clearChat(); }}
                                                className="p-1.5 text-red-300 hover:text-white hover:bg-white/10 rounded-l-lg transition-colors"
                                                title="Confirm Clear"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmClear(false); }}
                                                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-r-lg transition-colors"
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newState = !isSpeechEnabled;
                                            setIsSpeechEnabled(newState);
                                            if (!newState) {
                                                window.speechSynthesis?.cancel();
                                            } else {
                                                const u = new SpeechSynthesisUtterance("Speech enabled.");
                                                window.speechSynthesis?.speak(u);
                                            }
                                        }}
                                        className={`p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${isSpeechEnabled ? 'text-white' : 'text-white/50'}`}
                                        title={isSpeechEnabled ? "Mute Speech" : "Enable Speech"}
                                    >
                                        {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                        className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title={isExpanded ? "Collapse" : "Expand"}
                                    >
                                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={handleMinimize}
                                        className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title="Minimize"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            {isMinimized && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                                    className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="Restore"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
                                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-800/50 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                                >
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === 'user'
                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                                }`}>
                                                {message.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                            </div>
                                            <div
                                                className={`max-w-[80%] px-4 py-3 rounded-2xl text-base leading-relaxed ${message.role === 'user'
                                                    ? 'bg-purple-600 text-white rounded-tr-sm'
                                                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm rounded-tl-sm'
                                                    }`}
                                            >
                                                <div className={`prose max-w-none ${message.role === 'user'
                                                    ? 'prose-invert'
                                                    : 'dark:prose-invert'
                                                    }`}>
                                                    {(() => {
                                                        const isAssistant = message.role === 'assistant';
                                                        const isJson = isAssistant && (message.content.trim().startsWith('{') || message.content.trim().startsWith('['));

                                                        // 1. Loading State for Quiz
                                                        if (isLoading && isJson) {
                                                            return (
                                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                                                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                                                    <span className="text-sm font-medium">Generating...</span>
                                                                </div>
                                                            );
                                                        }

                                                        // 2. Finished State for Quiz
                                                        if (!isLoading && isJson) {
                                                            try {
                                                                const quizData = JSON.parse(message.content);
                                                                if (quizData.questions && Array.isArray(quizData.questions)) {
                                                                    return (
                                                                        <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading Quiz...</div>}>
                                                                            <QuizCard data={quizData} />
                                                                        </Suspense>
                                                                    );
                                                                }
                                                            } catch (e) {
                                                                // console.warn("Failed to parse JSON", e);
                                                            }
                                                        }

                                                        // 3. Fallback / Standard Text
                                                        return (
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                rehypePlugins={[rehypeHighlight]}
                                                                components={{
                                                                    pre: ({ node, ...props }) => (
                                                                        <div className="relative group/code">
                                                                            <pre {...props} className="bg-slate-950 rounded-lg p-4 overflow-x-auto my-2 text-sm" />
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
                                                                {message.content}
                                                            </ReactMarkdown>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && messages[messages.length - 1]?.content === '' && (
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 text-white">
                                                <Sparkles className="w-4 h-4 animate-pulse" />
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700 shadow-sm">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Smart Starters - Suggested Questions */}
                                    {messages.length <= 1 && !isLoading && !replyContext && (
                                        <div className="grid grid-cols-1 gap-2 mt-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {[
                                                { icon: "📝", text: "Summarize this article" },
                                                { icon: "💡", text: "What are the key takeaways?" },
                                                {
                                                    icon: "🎨",
                                                    text: "Ghost Artist (Experimental)",
                                                    mode: "visualize",
                                                    prompt: "Visualize this", // Fallback text if needed, but mode takes precedence
                                                    warning: "⚠️ Use on a new/empty note to stay safe"
                                                },
                                                { divider: true },
                                                {
                                                    icon: "🧠",
                                                    text: "Quiz me!",
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
                                                starter.divider ? <div key={i} className="h-px bg-gray-200 dark:bg-gray-700 my-1" /> :
                                                    <button
                                                        key={i}
                                                        // @ts-ignore
                                                        onClick={() => sendMessage(starter.prompt || starter.text, starter.mode ? { mode: starter.mode } : undefined)}
                                                        className="text-left p-3 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 hover:border-purple-200 dark:hover:border-purple-700/50 border border-gray-200 dark:border-gray-700 transition-all group flex items-start gap-3 shadow-sm hover:shadow-md"
                                                    >
                                                        {/* @ts-ignore */}
                                                        <span className="text-xl bg-white dark:bg-slate-900 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm group-hover:scale-110 transition-transform shrink-0">{starter.icon}</span>
                                                        <div className="flex flex-col">
                                                            {/* @ts-ignore */}
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">{starter.text}</span>
                                                            {/* @ts-ignore */}
                                                            {starter.warning && (
                                                                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">{starter.warning}</span>
                                                            )}
                                                        </div>
                                                    </button>
                                            ))}
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-gray-800">
                                    {replyContext && (
                                        <div key={replyContext} className="mb-3 p-3 bg-gray-50 dark:bg-slate-800/80 rounded-lg border-l-4 border-purple-500 relative flex justify-between items-start group/reply animate-in slide-in-from-bottom-2 duration-200">
                                            <div className="flex-1 pr-6">
                                                <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                                    <Sparkles className="w-3 h-3" />
                                                    <span>Context from clipboard</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic">
                                                    "{replyContext}"
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReplyContext(null)}
                                                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700/50 rounded-full transition-colors"
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
                                            className="flex-1 pl-4 pr-24 py-3 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl border-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500 transition-all"
                                        />

                                        {/* Voice Input */}
                                        <button
                                            type="button"
                                            onClick={toggleListening}
                                            className={`absolute right-12 p-2 rounded-lg transition-all duration-200 ${isListening
                                                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 bg-red-50 dark:bg-red-900/10 ring-1 ring-red-500/50'
                                                : 'text-gray-400 hover:text-purple-600 hover:bg-gray-200 dark:hover:bg-slate-700'
                                                }`}
                                            title={isListening ? "Stop Listening" : "Voice Input"}
                                        >
                                            {isListening ? <MicOff className="w-4 h-4 animate-pulse relative z-10" /> : <Mic className="w-4 h-4" />}
                                            {isListening && <span className="absolute inset-0 rounded-lg bg-red-400/20 animate-ping"></span>}
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={(!input.trim() && !replyContext) || isLoading}
                                            className="absolute right-2 p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none transition-all duration-200"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="text-center mt-2 flex items-center justify-center gap-1.5 opacity-60">
                                        <Sparkles className="w-3 h-3 text-purple-500" />
                                        <p className="text-[10px] text-gray-400">Powered by TakoVibe AI</p>
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
