import { useEffect, useState } from 'react';
import { Loader } from '../ui/Loader';
import { Spinner } from './BulkTokenGrant';
import { ArticlePicker, type ArticleOption } from './ArticlePicker';

interface EmailTemplate { key: string; label: string; description: string; normally_sent: string; cooldown_minutes: number; needs_article: boolean; requires_no_resume: boolean }
interface RecentSend { id: number; label: string; article_title: string | null; user_email: string; status: 'sending' | 'sent' | 'failed'; error: string; sent_by: string | null; created_at: string }
interface Catalog { max_recipients: number; templates: EmailTemplate[]; articles: ArticleOption[]; recent: RecentSend[] }
interface Person { id: number; email: string; first_name?: string; last_name?: string }
interface SendResult { sent: number; failed: number; error: string; skipped: Record<string, number> }

const panel = 'rounded-xl border border-gray-200 bg-white p-5 text-gray-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white';
const field = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';
const primary = 'rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const secondary = 'rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-700 disabled:opacity-50';
const muted = 'text-gray-500 dark:text-neutral-400';
const border = 'border-gray-200 dark:border-neutral-800';
const SKIP_LABELS: Record<string, string> = {
    recently_sent: 'already got this email recently', unsubscribed: 'unsubscribed', inactive: 'inactive account',
    has_saved_resume: 'already saved a resume', not_found: 'account not found',
};
const cooldown = (minutes: number) => minutes >= 1440 ? `${Math.round(minutes / 1440)} days` : `${minutes} minutes`;
const name = (person: Person) => [person.first_name, person.last_name].filter(Boolean).join(' ');
const when = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

async function readJson(response: Response, fallback: string) {
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || result.message || Object.entries(result).map(([key, value]) => `${key}: ${value}`).join(' ') || fallback);
    return result;
}

// Admin-only: send any of our transactional emails again to chosen people,
// e.g. someone who never received their welcome email.
export function EmailCenter({ fetcher }: { fetcher: (path: string, body?: unknown) => Promise<Response> }) {
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [selected, setSelected] = useState('');
    const [article, setArticle] = useState<ArticleOption | null>(null);
    const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
    const [recipients, setRecipients] = useState<Person[]>([]);
    const [query, setQuery] = useState('');
    const [matches, setMatches] = useState<Person[]>([]);
    const [confirming, setConfirming] = useState(false);
    const [busyAction, setBusyAction] = useState<'' | 'preview' | 'test' | 'send'>('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const busy = busyAction !== '';
    const template = catalog?.templates.find(item => item.key === selected);
    const max = catalog?.max_recipients || 50;
    const articleParam = template?.needs_article && article ? `?article_id=${article.id}` : '';
    const articleBody = template?.needs_article && article ? { article_id: article.id } : {};

    useEffect(() => {
        let current = true;
        setError('');
        void fetcher('/api/users/emails/').then(response => readJson(response, 'Could not load emails.')).then((result: Catalog) => {
            if (!current) return;
            setCatalog(result);
            setSelected(previous => previous || result.templates[0]?.key || '');
            setArticle(previous => previous || result.articles[0] || null);
        }).catch(failure => { if (current) setError(failure.message); });
        return () => { current = false; };
    }, [fetcher, reload]);

    useEffect(() => {
        let current = true;
        const term = query.trim();
        if (term.length < 2) { setMatches([]); return; }
        const timer = window.setTimeout(() => {
            void fetcher(`/api/users/?${new URLSearchParams({ query: term, status: 'active', page_size: '10' })}`)
                .then(response => readJson(response, 'Search failed.'))
                .then(result => { if (current) setMatches(result.results || []); })
                .catch(failure => { if (current) setError(failure.message); });
        }, 300);
        return () => { current = false; window.clearTimeout(timer); };
    }, [query, fetcher]);

    const choose = (key: string) => { setSelected(key); setPreview(null); setConfirming(false); setNote(''); setError(''); };
    const add = (person: Person) => {
        setConfirming(false);
        setRecipients(previous => previous.some(item => item.id === person.id) || previous.length >= max ? previous : [...previous, person]);
    };
    const run = async (action: 'preview' | 'test' | 'send', work: () => Promise<void>) => {
        setBusyAction(action); setError(''); setNote('');
        try { await work(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Something went wrong.'); } finally { setBusyAction(''); }
    };
    const togglePreview = () => preview ? setPreview(null) : run('preview', async () => setPreview(await readJson(await fetcher(`/api/users/emails/${selected}/preview/${articleParam}`), 'Could not load the preview.')));
    const sendTest = () => run('test', async () => {
        const result = await readJson(await fetcher(`/api/users/emails/${selected}/send/`, { test: true, ...articleBody }), 'Test email failed.');
        setNote(`Test email sent to ${result.email}.`);
    });
    const send = () => run('send', async () => {
        const result: SendResult = await readJson(await fetcher(`/api/users/emails/${selected}/send/`, { user_ids: recipients.map(person => person.id), ...articleBody }), 'Send failed.');
        const skipped = Object.entries(result.skipped).filter(([, count]) => count > 0).map(([key, count]) => `${count} ${SKIP_LABELS[key] || key}`);
        setNote(`Sent ${result.sent}.${result.failed ? ` ${result.failed} failed: ${result.error}` : ''}${skipped.length ? ` Skipped: ${skipped.join(', ')}.` : ''}`);
        setConfirming(false);
        if (!result.failed) setRecipients([]);
        setReload(value => value + 1);
    });

    if (!catalog && !error) return <div className="py-20 flex justify-center"><Loader text="Loading Emails..." /></div>;
    if (!catalog) return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <div className="text-red-600 dark:text-red-400 font-medium mb-2">Could not load emails</div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
            <button type="button" onClick={() => setReload(value => value + 1)} className="mt-4 text-orange-600 hover:underline">Try again</button>
        </div>
    );
    return <section className={panel} aria-labelledby="email-center-title">
        <p className={`text-xs font-semibold uppercase tracking-widest ${muted}`}>Admin only · Emails</p>
        <h2 id="email-center-title" className="mt-2 text-2xl font-semibold">Send an email again</h2>
        <p className={`mt-3 text-sm leading-6 ${muted}`}>For anyone who missed one of our emails. Pick the email, preview it, choose people and send. Inactive accounts, unsubscribed addresses and anyone who received the same email recently are skipped automatically. Up to {max} people per send.</p>

        <h3 className="mt-6 text-sm font-semibold">1. Choose the email</h3>
        <div role="radiogroup" aria-label="Email" className="mt-3 grid gap-3 md:grid-cols-2">{catalog.templates.map(item => <button key={item.key} type="button" role="radio" aria-checked={selected === item.key} onClick={() => choose(item.key)} className={`rounded-xl border p-4 text-left ${selected === item.key ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : border}`}>
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className={`mt-1 block text-xs leading-5 ${muted}`}>{item.description}</span>
            <span className={`mt-2 block text-xs ${muted}`}>Normally sent: {item.normally_sent} · Resend guard: {cooldown(item.cooldown_minutes)}</span>
        </button>)}</div>
        {template?.needs_article && <div className="mt-4"><ArticlePicker value={article} onChange={choice => { setArticle(choice); setPreview(null); setConfirming(false); }} fetcher={fetcher} disabled={busy} /></div>}
        <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busy || !template} onClick={togglePreview} className={secondary}>{busyAction === 'preview' && <Spinner />}{preview ? 'Hide preview' : 'Preview email'}</button>
            <button type="button" disabled={busy || !template} onClick={sendTest} className={secondary}>{busyAction === 'test' ? <><Spinner />Sending...</> : 'Send test to me'}</button>
        </div>
        {busyAction === 'preview' && <div className="py-10 flex justify-center"><Loader text="Loading Preview..." size="sm" /></div>}
        {preview && <div className="mt-4"><p className={`text-xs ${muted}`}>Subject: {preview.subject} · shown with your account's details</p><iframe title="Email preview" sandbox="" srcDoc={preview.html} className={`mt-2 h-[680px] w-full rounded-lg border bg-white ${border}`} /></div>}

        <h3 className="mt-8 text-sm font-semibold">2. Choose people</h3>
        <label className="mt-3 block max-w-xl text-xs font-semibold">Search active users by email or name<input aria-label="Search users" value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. priya@ or Priya" className={`${field} mt-2`} /></label>
        {matches.length > 0 && <ul className={`mt-2 max-w-xl divide-y rounded-lg border ${border}`}>{matches.map(person => {
            const added = recipients.some(item => item.id === person.id);
            return <li key={person.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span className="min-w-0 break-all">{person.email}{name(person) && <span className={`block text-xs ${muted}`}>{name(person)}</span>}</span><button type="button" disabled={added || recipients.length >= max} onClick={() => add(person)} className={secondary}>{added ? 'Added' : 'Add'}</button></li>;
        })}</ul>}
        {recipients.length > 0 ? <ul className="mt-3 flex flex-wrap gap-2">{recipients.map(person => <li key={person.id} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${border}`}><span className="break-all">{person.email}</span><button type="button" aria-label={`Remove ${person.email}`} disabled={busy} onClick={() => { setRecipients(previous => previous.filter(item => item.id !== person.id)); setConfirming(false); }} className="font-bold">×</button></li>)}</ul>
            : <p className={`mt-3 text-xs ${muted}`}>No one selected yet.</p>}

        <h3 className="mt-8 text-sm font-semibold">3. Send</h3>
        {!confirming
            ? <button type="button" disabled={busy || !template || recipients.length === 0} onClick={() => setConfirming(true)} className={`${primary} mt-3`}>Send {template?.label || 'email'} to {recipients.length} {recipients.length === 1 ? 'person' : 'people'}</button>
            : <div className={`mt-3 rounded-lg border p-4 text-sm ${border}`}>
                <p>Send <strong>{template?.label}</strong>{template?.needs_article && article ? <> (“{article.title}”)</> : null} to <strong>{recipients.length} {recipients.length === 1 ? 'person' : 'people'}</strong>?</p>
                <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={send} className={primary}>{busyAction === 'send' ? <><Spinner />Sending...</> : 'Confirm send'}</button><button type="button" disabled={busy} onClick={() => setConfirming(false)} className={secondary}>Cancel</button></div>
            </div>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {note && <p role="status" className="mt-4 text-sm font-semibold">{note}</p>}

        <h3 className="mt-8 text-sm font-semibold">Recently sent by admins</h3>
        {catalog.recent.length === 0 ? <p className={`mt-2 text-xs ${muted}`}>Nothing sent from here yet. Automatic signup emails are not listed.</p>
            : <ul className="mt-3 space-y-2">{catalog.recent.map(item => <li key={item.id} className={`rounded-lg border p-3 text-xs ${border}`}>
                <span className="font-semibold">{item.label}{item.article_title ? ` · ${item.article_title}` : ''}</span> → <span className="break-all">{item.user_email}</span>
                <span className={`ml-2 font-semibold ${item.status === 'failed' ? 'text-red-600 dark:text-red-400' : ''}`}>{item.status}</span>
                <span className={`block ${muted}`}>{when(item.created_at)} · by {item.sent_by || 'unknown'}{item.error ? ` · ${item.error}` : ''}</span>
            </li>)}</ul>}
    </section>;
}
