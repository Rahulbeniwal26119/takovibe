import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

export default function GrantTokensDialog({ user, onClose, onGranted }) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('Pilot credit');
    const [product, setProduct] = useState('resumevibe');
    const [review, setReview] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const requestId = useRef(null);
    const submitting = useRef(false);
    const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';

    async function submit(event) {
        event.preventDefault();
        if (submitting.current) return;
        const count = Number(amount);
        if (!Number.isSafeInteger(count) || count < 1 || count > 100000 || !reason.trim()) {
            setError('Enter 1–100,000 whole tokens and a reason.');
            return;
        }
        if (!review) {
            requestId.current = crypto.randomUUID();
            setError('');
            setReview(true);
            return;
        }
        submitting.current = true;
        setBusy(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/users/${user.id}/tokens/grant/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Token ${localStorage.getItem('access_token')}` },
                body: JSON.stringify({ amount: count, reason: reason.trim(), product, request_id: requestId.current }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Grant failed. Check your admin access and try again.');
            onGranted(result.token_balance);
        } catch (failure) {
            setError(failure.message || 'Could not confirm the grant. Retry with this same request to avoid a duplicate credit.');
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="grant-tokens-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 text-gray-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-950 dark:text-white">
                <h2 id="grant-tokens-title" className="text-xl font-bold">Grant tokens</h2>
                <p className="mt-2 break-all text-sm">{user.email}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">Current balance: {Number(user.vibe_credits || 0).toLocaleString()}</p>
                <p className="mt-3 text-sm text-gray-500 dark:text-neutral-400">One-time credit to the shared TakoVibe/ResumeVibe wallet. No automatic refill or expiry. Product records the grant source; it does not restrict where tokens can be spent.</p>
                <fieldset disabled={review || busy} className="mt-5 space-y-4">
                    <label className="block text-sm">Tokens to add<input autoFocus required type="number" min="1" max="100000" step="1" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} /></label>
                    <label className="block text-sm">Reason<input required maxLength="240" value={reason} onChange={e => setReason(e.target.value)} className={inputClass} /></label>
                    <label className="block text-sm">Grant source<select value={product} onChange={e => setProduct(e.target.value)} className={inputClass}><option value="resumevibe">ResumeVibe pilot</option><option value="takovibe">TakoVibe</option></select></label>
                </fieldset>
                {review && <p className="mt-5 rounded-lg border border-orange-300 p-3 text-sm">Confirm adding <strong>{Number(amount).toLocaleString()} tokens</strong> to <strong className="break-all">{user.email}</strong>. This adds to the existing balance; it does not replace it.</p>}
                {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-neutral-700">Cancel</button>
                    {review && <button type="button" disabled={busy} onClick={() => { setReview(false); setError(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-neutral-700">Edit amount</button>}
                    <button type="submit" disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Confirming…' : review ? 'Confirm grant' : 'Review grant'}</button>
                </div>
            </form>
        </div>, document.body,
    );
}
