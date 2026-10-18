import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { BulkTokenGrant, Spinner } from './BulkTokenGrant';

const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const monthStart = () => new Date(Date.now() + 330 * 60000 - 29 * 86400000).toISOString().slice(0, 10);
type Filters = { start: string; end: string; timezone: string; source: string; campaign: string; query: string; activity: string; product: string };
interface InsightUser {
    id: number; email: string; name: string; joined_at: string; is_active: boolean;
    acquisition: { product?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string };
    saved_resume_count: number; last_resume_saved_at: string | null; has_purchase: boolean; token_balance: number; last_reminder_sent_at: string | null;
}
interface Report {
    count: number; results: InsightUser[]; generated_at: string;
    summary: { joined_users: number; saved_resumes: number; users_with_saved_resume: number; users_with_no_saved_resume: number; campaign_tagged_users: number; without_campaign_tags: number; purchasing_users: number };
}
interface ReminderResult {
    eligible: number; will_send?: number; sent?: number; failed?: number; remaining?: number; error?: string; email?: string;
    skipped: { inactive: number; unsubscribed: number; recently_emailed: number }; cooldown_days: number;
}
const REMINDERS = '/api/users/campaign-insights/resume-reminders/';
const skipReason = (result: ReminderResult) => result.skipped.recently_emailed ? `already reminded in the last ${result.cooldown_days} days` : result.skipped.unsubscribed ? 'unsubscribed' : result.skipped.inactive ? 'inactive account' : 'has a saved resume or is outside this report';

const plainLoading = (text: string) => <p role="status" className="mt-6 text-sm">{text}</p>;

// fetcher(path) sends a GET; fetcher(path, body) sends a JSON POST.
// renderLoading lets each app show its own loading indicator.
export function CampaignInsights({ fetcher, appearance = 'resume', renderLoading = plainLoading }: { fetcher: (path: string, body?: unknown) => Promise<Response>; appearance?: 'resume' | 'tako'; renderLoading?: (text: string) => ReactNode }) {
    const [draft, setDraft] = useState<Filters>({ start: monthStart(), end: today(), timezone: 'Asia/Kolkata', source: '', campaign: '', query: '', activity: 'all', product: 'all' });
    const [filters, setFilters] = useState(draft);
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allowed, setAllowed] = useState<boolean | null>(appearance === 'resume' ? null : true);
    const [check, setCheck] = useState<ReminderResult | null>(null);
    const [reminderBusy, setReminderBusy] = useState(false);
    const [reminderNote, setReminderNote] = useState('');
    const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
    const [confirmUser, setConfirmUser] = useState<number | null>(null);
    const [cardNote, setCardNote] = useState<{ id: number; text: string } | null>(null);
    const resume = appearance === 'resume';
    const panel = resume ? 'rv-panel p-5 sm:p-6' : 'rounded-xl border border-gray-200 bg-white p-5 text-gray-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white';
    const field = resume ? 'rv-field min-h-11 w-full px-3 py-2 text-sm' : 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';
    const primary = resume ? 'rv-button-primary' : 'rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
    const secondary = resume ? 'rv-button-secondary' : 'rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-700 disabled:opacity-50';
    const muted = resume ? 'text-[var(--text-muted)]' : 'text-gray-500 dark:text-neutral-400';
    const border = resume ? 'border-[var(--border-color)]' : 'border-gray-200 dark:border-neutral-800';
    const date = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { timeZone: filters.timezone }) : 'None';
    const update = (key: keyof Filters, value: string) => setDraft(previous => ({ ...previous, [key]: value }));

    useEffect(() => {
        let current = true;
        if (appearance !== 'resume') return;
        void fetcher('/api/users/me/').then(async response => {
            const result = await response.json();
            if (current) setAllowed(response.ok && result.data?.can_manage_tokens === true);
        }).catch(() => { if (current) setAllowed(false); });
        return () => { current = false; };
    }, [appearance, fetcher]);

    useEffect(() => {
        let current = true;
        if (allowed !== true) return;
        setLoading(true); setError(''); setReport(null);
        const params = new URLSearchParams({ ...filters, page: String(page) });
        void fetcher(`/api/users/campaign-insights/?${params}`).then(async response => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || Object.entries(result).map(([key, value]) => `${key}: ${value}`).join(' ') || 'Could not load the report.');
            if (current) setReport(result);
        }).catch(failure => { if (current) setError(failure.message || 'Could not load the report.'); }).finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [filters, page, reload, fetcher, allowed]);

    const apply = (event: FormEvent) => { event.preventDefault(); setFilters({ ...draft }); setPage(1); setCheck(null); };

    // Reminder emails go to the same cohort as the report, using the applied filters.
    const remind = async (body: Record<string, unknown>): Promise<ReminderResult | null> => {
        setReminderBusy(true); setReminderNote(''); setCardNote(null);
        try {
            const response = await fetcher(REMINDERS, { ...filters, ...body });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || Object.entries(result).map(([key, value]) => `${key}: ${value}`).join(' ') || 'Could not send the reminder.');
            return result;
        } catch (failure) {
            setReminderNote(failure instanceof Error ? failure.message : 'Could not send the reminder.');
            return null;
        } finally { setReminderBusy(false); }
    };
    const checkRecipients = async () => { const result = await remind({ dry_run: true }); if (result) setCheck(result); };
    const sendTest = async () => { const result = await remind({ test: true }); if (result) setReminderNote(`Test email sent to ${result.email}. Check your inbox.`); };
    const sendAll = async () => {
        const result = await remind({});
        if (!result) return;
        setCheck(null);
        setReminderNote(`Sent ${result.sent} reminder${result.sent === 1 ? '' : 's'}.${result.failed ? ` ${result.failed} failed: ${result.error}` : ''}${result.remaining ? ` ${result.remaining} more eligible; check recipients again to continue.` : ''}`);
        setReload(value => value + 1);
    };
    const sendOne = async (user: InsightUser) => {
        const result = await remind({ user_ids: [user.id] });
        setConfirmUser(null);
        if (!result) return;
        setCardNote({ id: user.id, text: result.sent ? 'Reminder sent.' : result.failed ? `Failed: ${result.error}` : `Not sent: ${skipReason(result)}.` });
        if (result.sent) setReload(value => value + 1);
    };
    const togglePreview = async () => {
        if (preview) { setPreview(null); return; }
        setReminderBusy(true); setReminderNote('');
        try {
            const response = await fetcher(REMINDERS);
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Could not load the preview.');
            setPreview(result);
        } catch (failure) { setReminderNote(failure instanceof Error ? failure.message : 'Could not load the preview.'); } finally { setReminderBusy(false); }
    };
    if (allowed === null) return <>{renderLoading('Checking admin access...')}</>;
    if (!allowed) return <p role="alert">Admin access is required to view campaign insights.</p>;
    return <>
    <BulkTokenGrant fetcher={fetcher} classes={{ panel, field, primary, secondary, muted, border }} date={date} />
    <section className={panel} aria-labelledby="campaign-insights-title">
        <p className={`text-xs font-semibold uppercase tracking-widest ${muted}`}>Admin only · First-party account report</p>
        <h2 id="campaign-insights-title" className="mt-2 text-2xl font-semibold">Campaign insights</h2>
        <p className={`mt-3 text-sm leading-6 ${muted}`}>See who joined, their signup campaign, and whether they saved a resume. Dates select the signup cohort; resume counts and purchase flags reflect current, lifetime records for those users. Admin and superuser accounts are excluded.</p>
        <form onSubmit={apply} className="mt-5">
            <fieldset disabled={loading} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <label className="text-xs font-semibold">Joined from<input aria-label="Joined from" required type="date" value={draft.start} onChange={event => update('start', event.target.value)} className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">Joined through (inclusive)<input aria-label="Joined through" required type="date" value={draft.end} onChange={event => update('end', event.target.value)} className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">Date timezone<select aria-label="Date timezone" value={draft.timezone} onChange={event => update('timezone', event.target.value)} className={`${field} mt-2`}><option value="Asia/Kolkata">India (Asia/Kolkata)</option><option value="UTC">UTC</option></select></label>
                <label className="text-xs font-semibold">Source (exact match)<input aria-label="Campaign source" maxLength={80} value={draft.source} onChange={event => update('source', event.target.value)} placeholder="e.g. google" className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">Campaign (exact match)<input aria-label="Campaign name" maxLength={80} value={draft.campaign} onChange={event => update('campaign', event.target.value)} placeholder="e.g. india_backend_pilot" className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">User email or name<input aria-label="Find campaign user" maxLength={200} value={draft.query} onChange={event => update('query', event.target.value)} className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">Signup product<select aria-label="Signup product" value={draft.product} onChange={event => update('product', event.target.value)} className={`${field} mt-2`}><option value="all">All / include historical users</option><option value="resumevibe">ResumeVibe</option><option value="takovibe">TakoVibe</option><option value="unknown">Not captured / unknown</option></select></label>
                <label className="text-xs font-semibold">Show users<select aria-label="Resume activity" value={draft.activity} onChange={event => update('activity', event.target.value)} className={`${field} mt-2`}><option value="all">All users</option><option value="saved">Saved at least one resume</option><option value="none">No saved resume</option></select></label>
            </fieldset>
            <div className="mt-4 flex flex-wrap gap-3"><button disabled={loading} type="submit" className={primary}>Apply report filters</button><button disabled={loading} type="button" onClick={() => setReload(value => value + 1)} className={secondary}>Refresh report</button></div>
        </form>
        {loading && renderLoading('Loading Campaign Report...')}
        {error && <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {report && <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
                ['New accounts', report.summary.joined_users], ['Users with a saved resume', report.summary.users_with_saved_resume], ['Users with no saved resume', report.summary.users_with_no_saved_resume], ['Saved resumes (current)', report.summary.saved_resumes],
                ['Campaign-tagged accounts', report.summary.campaign_tagged_users], ['Without campaign tags', report.summary.without_campaign_tags], ['Token-purchasing users', report.summary.purchasing_users], ['Saved-resume rate', `${report.summary.joined_users ? (report.summary.users_with_saved_resume / report.summary.joined_users * 100).toFixed(1) : '0'}%`],
            ].map(([label, value]) => <div key={String(label)} className={`rounded-xl border p-4 ${border}`}><p className={`text-xs ${muted}`}>{label}</p><p className="mt-2 text-3xl font-semibold">{typeof value === 'number' ? value.toLocaleString() : value}</p></div>)}</div>
            <p className={`mt-4 text-xs leading-6 ${muted}`}>Summary uses the date/source/campaign/product/user filters. “Show users” filters only the list below. Updated {date(report.generated_at)} · {filters.timezone}.</p>
            <div className={`mt-5 rounded-xl border p-4 ${border}`}>
                <h3 className="text-sm font-semibold">Remind users with no saved resume</h3>
                <p className={`mt-1 text-xs leading-6 ${muted}`}>Emails accounts in this report (applied filters) that have no saved resume yet. Skips inactive accounts, unsubscribed emails and anyone reminded in the last 14 days. Sends up to 100 per click.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" disabled={reminderBusy} onClick={togglePreview} className={secondary}>{preview ? 'Hide email preview' : 'Preview email'}</button>
                    <button type="button" disabled={reminderBusy} onClick={sendTest} className={secondary}>Send test to me</button>
                    <button type="button" disabled={reminderBusy} onClick={checkRecipients} className={primary}>Check recipients</button>
                </div>
                {check && <div className={`mt-3 rounded-lg border p-3 text-sm ${border}`}>
                    <p>{check.will_send ? `${check.will_send} user${check.will_send === 1 ? '' : 's'} will receive this email${check.eligible > (check.will_send || 0) ? ` (of ${check.eligible} eligible; send again for the rest)` : ''}.` : 'No users are eligible right now.'}</p>
                    <p className={`mt-1 text-xs ${muted}`}>Skipped: {check.skipped.inactive} inactive · {check.skipped.unsubscribed} unsubscribed · {check.skipped.recently_emailed} reminded in the last {check.cooldown_days} days.</p>
                    <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={reminderBusy || !check.will_send} onClick={sendAll} className={primary}>{reminderBusy ? <><Spinner />Sending...</> : `Send to ${check.will_send || 0} user${check.will_send === 1 ? '' : 's'}`}</button><button type="button" disabled={reminderBusy} onClick={() => setCheck(null)} className={secondary}>Cancel</button></div>
                </div>}
                {reminderNote && <p role="status" className="mt-3 text-sm">{reminderNote}</p>}
                {preview && <div className="mt-4"><p className={`text-xs ${muted}`}>Subject: {preview.subject} · shown with your account's details</p><iframe title="Reminder email preview" sandbox="" srcDoc={preview.html} className={`mt-2 h-[680px] w-full rounded-lg border bg-white ${border}`} /></div>}
            </div>
            <div className="mt-5 space-y-3">{report.results.map(user => <article key={user.id} className={`rounded-xl border p-4 ${border}`}>
                <div className="flex flex-wrap justify-between gap-2"><h3 className="min-w-0 break-all text-sm font-semibold">{user.name || user.email}</h3><span className="text-xs font-semibold">{user.saved_resume_count === 0 ? 'No saved resume' : `${user.saved_resume_count} saved resume${user.saved_resume_count === 1 ? '' : 's'}`}</span></div>
                <p className={`mt-1 break-all text-xs ${muted}`}>{user.email}{!user.is_active ? ' · Inactive account' : ''}</p>
                <dl className="mt-3 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 xl:grid-cols-3">
                    <div><dt className={muted}>Joined</dt><dd className="mt-1">{date(user.joined_at)}</dd></div>
                    <div><dt className={muted}>Signup campaign</dt><dd className="mt-1 break-words">{user.acquisition.utm_campaign || 'Not captured / no campaign tag'}</dd></div>
                    <div><dt className={muted}>Source / medium</dt><dd className="mt-1 break-words">{user.acquisition.utm_source || 'Not captured'} / {user.acquisition.utm_medium || 'Not captured'}</dd></div>
                    <div><dt className={muted}>Last saved resume update</dt><dd className="mt-1">{date(user.last_resume_saved_at)}</dd></div>
                    <div><dt className={muted}>Signup product</dt><dd className="mt-1">{user.acquisition.product || 'Not captured'}</dd></div>
                    <div><dt className={muted}>Token purchase / current balance</dt><dd className="mt-1">{user.has_purchase ? 'Purchase recorded' : 'No purchase recorded'} · {user.token_balance.toLocaleString()} tokens</dd></div>
                </dl>
                {user.saved_resume_count === 0 && user.is_active && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    {confirmUser === user.id
                        ? <><button type="button" disabled={reminderBusy} onClick={() => sendOne(user)} className={primary}>Confirm: email {user.email}</button><button type="button" disabled={reminderBusy} onClick={() => setConfirmUser(null)} className={secondary}>Cancel</button></>
                        : <button type="button" disabled={reminderBusy} onClick={() => { setConfirmUser(user.id); setCardNote(null); }} className={secondary}>Email resume reminder</button>}
                    <span className={muted}>{user.last_reminder_sent_at ? `Last reminder ${date(user.last_reminder_sent_at)}` : 'No reminder sent yet'}</span>
                    {cardNote?.id === user.id && <span role="status" className="font-semibold">{cardNote.text}</span>}
                </div>}
            </article>)}</div>
            {report.results.length === 0 && <p className={`mt-5 text-sm ${muted}`}>No users match these filters. No example accounts are included.</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={page <= 1 || loading} className={secondary} onClick={() => setPage(value => value - 1)}>Previous users</button><span className={`text-xs ${muted}`}>Page {page} · {report.count} matching users</span><button disabled={page * 20 >= report.count || loading} className={secondary} onClick={() => setPage(value => value + 1)}>Next users</button></div>
        </>}
        <aside className={`mt-6 rounded-xl border p-4 text-xs leading-6 ${border} ${muted}`}>
            <p className="font-semibold">What this report cannot prove</p>
            <p>“No saved resume” does not mean no activity: guest edits, local-only documents, PDF exports, and deleted resumes are not counted here. A saved document may still contain sample content. Campaign tags are visitor-reported, captured only at new-account creation, and cannot reconstruct historical attribution or cross-device journeys.</p>
            <p className="mt-2">Purchasing users come from purchase-credit ledger entries; signup/pilot grants are excluded. Ad spend, clicks, verified export counts, revenue, refunds, and profit are not connected to this report. Never interpret the saved-resume rate as an ad-click conversion rate.</p>
        </aside>
    </section>
    </>;
}
