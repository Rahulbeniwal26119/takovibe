import { useEffect, useRef, useState, type FormEvent } from 'react';

const BULK_GRANT = '/api/users/tokens/bulk-grant/';
interface GrantRow { grant_id: string; amount: number; reason: string; product: string; recipient_count: number; total_tokens: number; granted_by: string | null; created_at: string }
interface Summary { active_recipients: number; max_per_user: number; recent: GrantRow[] }
// Neutral busy indicator (inherits the button colour) shared by both apps.
export const Spinner = () => <span aria-hidden="true" className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]" />;
export interface PanelClasses { panel: string; field: string; primary: string; secondary: string; muted: string; border: string }

// One-click campaign credit for every active non-admin account. Review is a
// server dry run; the grant ID is reused on retry so a lost response or double
// click can never credit anyone twice.
export function BulkTokenGrant({ fetcher, classes, date }: { fetcher: (path: string, body?: unknown) => Promise<Response>; classes: PanelClasses; date: (value: string | null) => string }) {
    const { panel, field, primary, secondary, muted, border } = classes;
    const [summary, setSummary] = useState<Summary | null>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('Campaign bonus');
    const [product, setProduct] = useState('resumevibe');
    const [review, setReview] = useState<{ recipients: number; total_tokens: number } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const [reload, setReload] = useState(0);
    const grantId = useRef('');
    const max = summary?.max_per_user || 10000;

    useEffect(() => {
        let current = true;
        void fetcher(BULK_GRANT).then(async response => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Could not load campaign grants.');
            if (current) setSummary(result);
        }).catch(failure => { if (current) setError(failure.message || 'Could not load campaign grants.'); });
        return () => { current = false; };
    }, [fetcher, reload]);

    const call = async (body: Record<string, unknown>) => {
        const response = await fetcher(BULK_GRANT, body);
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || Object.entries(result).map(([key, value]) => `${key}: ${value}`).join(' ') || 'Grant failed.');
        return result;
    };

    const reviewGrant = async (event: FormEvent) => {
        event.preventDefault();
        const count = Number(amount);
        if (!Number.isSafeInteger(count) || count < 1 || count > max || reason.trim().length < 3) {
            setError(`Enter 1–${max.toLocaleString()} whole tokens and a reason.`);
            return;
        }
        grantId.current = crypto.randomUUID();
        setBusy(true); setError(''); setNote('');
        try { setReview(await call({ amount: count, reason: reason.trim(), product, grant_id: grantId.current, dry_run: true })); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not review the grant.'); }
        finally { setBusy(false); }
    };

    const confirmGrant = async () => {
        setBusy(true); setError('');
        try {
            const result = await call({ amount: Number(amount), reason: reason.trim(), product, grant_id: grantId.current });
            setNote(`${result.replayed ? 'Already granted' : 'Granted'}: ${result.amount.toLocaleString()} tokens to each of ${result.recipient_count.toLocaleString()} users (${result.total_tokens.toLocaleString()} tokens total).`);
            setReview(null); setAmount('');
            setReload(value => value + 1);
        } catch (failure) {
            setError(`${failure instanceof Error ? failure.message : 'Could not confirm the grant.'} Confirming again reuses this grant, so nobody is credited twice.`);
        } finally { setBusy(false); }
    };

    return <section className={`${panel} mb-6`} aria-labelledby="bulk-grant-title">
        <p className={`text-xs font-semibold uppercase tracking-widest ${muted}`}>Admin only · Campaign credit</p>
        <h2 id="bulk-grant-title" className="mt-2 text-2xl font-semibold">Give tokens to every active user</h2>
        <p className={`mt-3 text-sm leading-6 ${muted}`}>Adds the same one-time, non-expiring credit to every active account{summary ? ` (${summary.active_recipients.toLocaleString()} right now)` : ''}. Admin accounts are excluded, and the report filters below do not apply. Each credit is recorded in the user's token history.</p>
        <form onSubmit={reviewGrant} className="mt-5">
            <fieldset disabled={busy || review !== null} className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-semibold">Tokens per user<input aria-label="Tokens per user" required type="number" min={1} max={max} step={1} value={amount} onChange={event => setAmount(event.target.value)} placeholder="e.g. 100" className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">Reason (shown in token history)<input aria-label="Grant reason" required minLength={3} maxLength={240} value={reason} onChange={event => setReason(event.target.value)} className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">Grant source<select aria-label="Grant source" value={product} onChange={event => setProduct(event.target.value)} className={`${field} mt-2`}><option value="resumevibe">ResumeVibe campaign</option><option value="takovibe">TakoVibe</option></select></label>
            </fieldset>
            {!review && <button type="submit" disabled={busy || !summary} className={`${primary} mt-4`}>{busy ? <><Spinner />Checking...</> : 'Review grant'}</button>}
        </form>
        {review && <div className={`mt-4 rounded-lg border p-4 text-sm ${border}`}>
            <p>Add <strong>{Number(amount).toLocaleString()} tokens</strong> to each of <strong>{review.recipients.toLocaleString()} active users</strong>: <strong>{review.total_tokens.toLocaleString()} tokens</strong> in total.</p>
            <p className={`mt-1 text-xs ${muted}`}>This adds to existing balances and cannot be undone from here. Reason: “{reason.trim()}”.</p>
            <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy || review.recipients === 0} onClick={confirmGrant} className={primary}>{busy ? <><Spinner />Granting...</> : `Confirm: grant to ${review.recipients.toLocaleString()} users`}</button><button type="button" disabled={busy} onClick={() => { setReview(null); setError(''); }} className={secondary}>Edit</button></div>
        </div>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {note && <p role="status" className="mt-4 text-sm font-semibold">{note}</p>}
        {summary && summary.recent.length > 0 && <div className="mt-5">
            <p className="text-xs font-semibold">Recent campaign grants</p>
            <ul className="mt-2 space-y-2">{summary.recent.map(grant => <li key={grant.grant_id} className={`rounded-lg border p-3 text-xs ${border}`}>
                <span className="font-semibold">{grant.amount.toLocaleString()} tokens × {grant.recipient_count.toLocaleString()} users</span> = {grant.total_tokens.toLocaleString()} · {grant.reason}
                <span className={`block ${muted}`}>{date(grant.created_at)} · by {grant.granted_by || 'unknown'} · {grant.product}</span>
            </li>)}</ul>
        </div>}
    </section>;
}
