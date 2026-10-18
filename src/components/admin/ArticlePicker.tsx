import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, FileText, Search } from 'lucide-react';

export interface ArticleOption { id: number; title: string; created_at: string; reading_time?: number; image_url?: string }

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const published = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const meta = (article: ArticleOption) => [published(article.created_at), article.reading_time ? `${article.reading_time} min read` : ''].filter(Boolean).join(' · ');

function Highlight({ text, terms }: { text: string; terms: string[] }) {
    if (terms.length === 0) return <>{text}</>;
    const matcher = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
    return <>{text.split(matcher).map((part, index) => index % 2 === 1
        ? <mark key={index} className="rounded bg-orange-200/70 px-0.5 text-inherit dark:bg-orange-500/30">{part}</mark>
        : part)}</>;
}

function Thumbnail({ article }: { article: ArticleOption }) {
    return article.image_url
        ? <img src={article.image_url} alt="" className="h-10 w-14 flex-shrink-0 rounded-md object-cover bg-gray-100 dark:bg-neutral-900" />
        : <span className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-300"><FileText className="h-4 w-4" /></span>;
}

// Searchable article chooser in the dashboard Select style. Searches every
// published article on the server, not only the ones loaded with the page.
export function ArticlePicker({ value, onChange, fetcher, disabled = false }: { value: ArticleOption | null; onChange: (article: ArticleOption) => void; fetcher: (path: string) => Promise<Response>; disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ArticleOption[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [active, setActive] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const optionId = (index: number) => `${listId}-option-${index}`;
    const terms = query.trim().split(/\s+/).filter(Boolean);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!open) return;
        inputRef.current?.focus();
        let current = true;
        setLoading(true); setError('');
        const timer = window.setTimeout(() => {
            void fetcher(`/api/users/emails/articles/?${new URLSearchParams({ query: query.trim() })}`).then(async response => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.detail || 'Article search failed.');
                if (current) { setResults(result.results); setCount(result.count); setActive(0); }
            }).catch(failure => { if (current) setError(failure.message || 'Article search failed.'); })
                .finally(() => { if (current) setLoading(false); });
        }, query.trim() ? 250 : 0);
        return () => { current = false; window.clearTimeout(timer); };
    }, [open, query, fetcher]);

    useEffect(() => { document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' }); }, [active]);

    const choose = (article: ArticleOption) => { onChange(article); setOpen(false); setQuery(''); };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, results.length - 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
        else if (event.key === 'Enter') { event.preventDefault(); if (results[active]) choose(results[active]); }
        else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    };

    return (
        <div className="relative max-w-2xl" ref={containerRef}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Article</label>
            <button
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen(previous => !previous)}
                className={`flex w-full items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2.5 text-left transition-all duration-200 dark:bg-neutral-900/70
                    ${open ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-200 hover:border-gray-300 dark:border-neutral-800 dark:hover:border-neutral-700'}
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
                {value ? <>
                    <Thumbnail article={value} />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{value.title}</span>
                        <span className="block text-xs text-gray-500 dark:text-neutral-400">{meta(value)}</span>
                    </span>
                </> : <span className="flex-1 text-sm text-gray-400">Choose an article</span>}
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-3 dark:border-neutral-800">
                        <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <input
                            ref={inputRef}
                            role="combobox"
                            aria-label="Search articles"
                            aria-expanded="true"
                            aria-controls={listId}
                            aria-activedescendant={results[active] ? optionId(active) : undefined}
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Search by title or topic, e.g. docker, python generators"
                            className="min-h-11 w-full bg-transparent text-sm text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
                        />
                        {loading && <span aria-hidden="true" className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />}
                    </div>
                    <ul id={listId} role="listbox" aria-label="Articles" className="max-h-80 space-y-0.5 overflow-auto p-1">
                        {results.map((article, index) => {
                            const selected = article.id === value?.id;
                            return (
                                <li
                                    key={article.id}
                                    id={optionId(index)}
                                    role="option"
                                    aria-selected={selected}
                                    onMouseEnter={() => setActive(index)}
                                    onMouseDown={event => event.preventDefault()}
                                    onClick={() => choose(article)}
                                    className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors
                                        ${index === active ? 'bg-gray-50 dark:bg-neutral-900' : ''}
                                        ${selected ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    <Thumbnail article={article} />
                                    <span className="min-w-0 flex-1">
                                        <span className={`block text-sm leading-snug ${selected ? 'font-semibold' : 'font-medium'}`}><Highlight text={article.title} terms={terms} /></span>
                                        <span className="block text-xs text-gray-500 dark:text-neutral-400">{meta(article)}</span>
                                    </span>
                                    {selected && <Check className="h-4 w-4 flex-shrink-0" />}
                                </li>
                            );
                        })}
                        {!loading && !error && results.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">No published articles match “{query.trim()}”.</li>}
                        {error && <li role="alert" className="px-3 py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</li>}
                    </ul>
                    {count > results.length && <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-neutral-800 dark:text-neutral-400">Showing {results.length} of {count}. Keep typing to narrow it down.</p>}
                </div>
            )}
        </div>
    );
}
