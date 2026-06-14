import React, { useCallback, useEffect, useState } from 'react';
import EbookLibrary from './ebook/EbookLibrary';
import EbookReaderView from './ebook/EbookReaderView';
import ReaderHeader from './ebook/ReaderHeader';

interface Props {
    // Set when landing directly on /reader/<id>, so we open that document immediately.
    initialBookId?: string;
}

const readerPathForBook = (id: string) => `/reader/${encodeURIComponent(id)}`;

const bookIdFromPath = (): string | null => {
    const match = window.location.pathname.match(/^\/reader\/(.+?)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
};

export default function EbookReaderHydrator({ initialBookId }: Props) {
    const [open, setOpen] = useState<{ id: string; title: string } | null>(
        initialBookId ? { id: initialBookId, title: '' } : null,
    );

    // Back-compat: ?book=<id> still opens a document.
    useEffect(() => {
        if (initialBookId) return;
        const bookId = new URLSearchParams(window.location.search).get('book');
        if (bookId) setOpen({ id: bookId, title: '' });
    }, [initialBookId]);

    // Keep the open document in sync with the browser history (back/forward).
    useEffect(() => {
        const syncFromUrl = () => {
            const id = bookIdFromPath();
            setOpen((current) => {
                if (id) return current && current.id === id ? current : { id, title: '' };
                return null;
            });
        };
        window.addEventListener('popstate', syncFromUrl);
        return () => window.removeEventListener('popstate', syncFromUrl);
    }, []);

    const openBook = useCallback((id: string, title: string) => {
        setOpen({ id, title });
        const url = readerPathForBook(id);
        if (window.location.pathname !== url) {
            window.history.pushState({ bookId: id }, '', url);
        }
    }, []);

    const closeBook = useCallback(() => {
        setOpen(null);
        if (window.location.pathname !== '/reader') {
            window.history.pushState({}, '', '/reader');
        }
    }, []);

    return (
        <>
            {open ? (
                <EbookReaderView bookId={open.id} onClose={closeBook} />
            ) : (
                <>
                    <ReaderHeader />
                    <EbookLibrary onOpen={openBook} />
                </>
            )}
        </>
    );
}
