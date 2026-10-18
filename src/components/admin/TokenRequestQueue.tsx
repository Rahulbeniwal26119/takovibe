import { useEffect, useRef, useState } from 'react';

export interface PilotRequest {
    id: number;
    user_email: string;
    user_name: string;
    requested_amount: number;
    reason: string;
    product: string;
    status: 'pending' | 'approved' | 'rejected';
    granted_amount: number;
    admin_note: string;
    created_at: string;
    reviewed_at: string | null;
    reviewer_email: string | null;
}

type Fetcher = (path: string, options?: RequestInit) => Promise<Response>;

export async function requestResult(response: Response) {
    const data = await response.json();
    if (!response.ok) {
        const message = data.detail || Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' ');
        throw new Error(message || 'Request failed. Please try again.');
    }
    return data;
}

export function TokenRequestQueue({ fetcher, appearance = 'resume' }: { fetcher: Fetcher; appearance?: 'resume' | 'tako' }) {
    const [rows, setRows] = useState<PilotRequest[]>([]);
    const [filter, setFilter] = useState('pending');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [selected, setSelected] = useState<PilotRequest | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [busy, setBusy] = useState(false);
    const [reload, setReload] = useState(0);
    const submitting = useRef(false);
    const resume = appearance === 'resume';
    const panel = resume ? 'rv-panel p-5 sm:p-6' : 'rounded-xl border border-gray-200 bg-white p-5 text-gray-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white';
    const field = resume ? 'rv-field min-h-11 w-full px-3 py-2 text-sm' : 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';
    const primary = resume ? 'rv-button-primary' : 'rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
    const secondary = resume ? 'rv-button-secondary' : 'rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-700 disabled:opacity-50';
    const muted = resume ? 'text-[var(--text-muted)]' : 'text-gray-500 dark:text-neutral-400';
    const border = resume ? 'border-[var(--border-color)]' : 'border-gray-200 dark:border-neutral-800';

    useEffect(() => {
        let current = true;
        setLoading(true);
        const timer = window.setTimeout(() => {
            const params = new URLSearchParams({ status: filter, query, page: String(page) });
            void fetcher(`/api/users/token-requests/admin/?${params}`).then(requestResult).then(data => {
                if (current) { setRows(data.results || []); setCount(data.count || 0); setError(''); }
            }).catch(failure => { if (current) { setRows([]); setError(failure.message); } })
                .finally(() => { if (current) setLoading(false); });
        }, 250);
        return () => { current = false; window.clearTimeout(timer); };
    }, [filter, query, page, reload, fetcher]);

    function prepare(next: 'approve' | 'reject') {
        const tokens = Number(amount);
        if (next === 'approve' && (!Number.isSafeInteger(tokens) || tokens < 1 || tokens > 100000)) {
            setError('Choose 1–100,000 whole tokens.'); return;
        }
        if (next === 'reject' && !note.trim()) { setError('Enter a reason the user can see before rejecting.'); return; }
        setError(''); setAction(next);
    }

    async function review() {
        if (!selected || !action || submitting.current) return;
        submitting.current = true; setBusy(true); setError('');
        try {
            const result = await requestResult(await fetcher(`/api/users/token-requests/${selected.id}/review/`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...(action === 'approve' ? { granted_amount: Number(amount) } : {}), admin_note: note.trim() }),
            }));
            setNotice(`Request #${selected.id} ${result.request.status}${action === 'approve' ? `: ${result.request.granted_amount.toLocaleString()} tokens granted` : ''}.`);
            setSelected(null); setAction(null); setReload(value => value + 1);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Could not confirm. Retry this same review to avoid a duplicate grant.');
        } finally { submitting.current = false; setBusy(false); }
    }

    return <section id="admin-token-requests" className={panel} aria-labelledby="token-request-queue-title">
        <p className={`text-xs font-semibold uppercase tracking-widest ${muted}`}>Admin only</p>
        <h2 id="token-request-queue-title" className="mt-2 text-2xl font-semibold">Token request inbox</h2>
        <p className={`mt-2 text-sm leading-6 ${muted}`}>Requests do not credit tokens automatically. Review the reason, choose an amount, then approve or reject. Review notes are visible to the requester.</p>
        <fieldset disabled={busy || !!action} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="flex-1 text-xs font-semibold">Find a requester<input aria-label="Find a requester" className={`${field} mt-2`} value={query} placeholder="Email or name" onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
            <label className="text-xs font-semibold">Status<select aria-label="Request status" className={`${field} mt-2`} value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All requests</option></select></label>
            <button type="button" className={`${secondary} self-end`} onClick={() => setReload(value => value + 1)}>Refresh requests</button>
        </fieldset>
        {loading ? <p role="status" className="mt-5 text-sm">Loading requests…</p> : <>
            <p className={`mt-4 text-xs ${muted}`}>{count} matching request{count === 1 ? '' : 's'}</p>
            {rows.length === 0 && <p className={`mt-4 text-sm ${muted}`}>No requests match this filter.</p>}
            <div className="mt-4 space-y-3">{rows.map(row => <article key={row.id} className={`rounded-xl border p-4 ${border}`}>
                <div className="flex flex-wrap justify-between gap-2"><p className="min-w-0 break-all text-sm font-semibold">#{row.id} · {row.user_email}</p><span className="text-xs font-semibold capitalize">{row.status}</span></div>
                <p className={`mt-1 text-xs ${muted}`}>{row.requested_amount.toLocaleString()} requested · {row.product} · {new Date(row.created_at).toLocaleString()}</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{row.reason}</p>
                {row.status === 'pending' ? <button type="button" disabled={busy || !!action} className={`${secondary} mt-3`} onClick={() => { setSelected(row); setAmount(String(row.requested_amount)); setNote(''); setAction(null); setError(''); setNotice(''); }}>Review request #{row.id}</button> : <p className={`mt-3 whitespace-pre-wrap break-words text-xs leading-6 ${muted}`}>{row.status === 'approved' ? `${row.granted_amount.toLocaleString()} tokens granted. ` : ''}{row.admin_note || 'No review note.'}{row.reviewer_email ? ` Reviewed by ${row.reviewer_email}.` : ''}</p>}
            </article>)}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3"><button className={secondary} disabled={page <= 1 || busy || !!action} onClick={() => setPage(value => value - 1)}>Previous requests</button><span className={`text-xs ${muted}`}>Page {page}</span><button className={secondary} disabled={page * 10 >= count || busy || !!action} onClick={() => setPage(value => value + 1)}>Next requests</button></div>
        </>}
        {selected && <section className={`mt-5 rounded-xl border p-4 ${border}`} aria-label="Review token request">
            <h3 className="break-all text-sm font-semibold">Review #{selected.id} · {selected.user_email}</h3>
            <fieldset disabled={busy || !!action} className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                <label className="text-xs font-semibold">Tokens to approve<input aria-label="Tokens to approve" type="number" min="1" max="100000" step="1" value={amount} onChange={event => setAmount(event.target.value)} className={`${field} mt-2`} /></label>
                <label className="text-xs font-semibold">Note for the user<textarea aria-label="Note for the user" maxLength={500} value={note} onChange={event => setNote(event.target.value)} className={`${field} mt-2`} placeholder="Required for rejection" /></label>
            </fieldset>
            {action && <p className={`mt-4 break-words text-sm leading-6 ${muted}`}>{action === 'approve' ? `Confirm granting ${Number(amount).toLocaleString()} tokens. This adds to the user's shared wallet.` : 'Confirm rejection. No tokens will be credited.'}</p>}
            <div className="mt-4 flex flex-wrap gap-2">{action ? <><button disabled={busy} className={primary} onClick={() => void review()}>{busy ? 'Confirming…' : action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</button><button disabled={busy} className={secondary} onClick={() => setAction(null)}>Edit review</button></> : <><button className={primary} onClick={() => prepare('approve')}>Review approval</button><button className={secondary} onClick={() => prepare('reject')}>Review rejection</button><button className={secondary} onClick={() => setSelected(null)}>Close review</button></>}</div>
        </section>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
    </section>;
}
