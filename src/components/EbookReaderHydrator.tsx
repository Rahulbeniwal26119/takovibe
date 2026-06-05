import React, { useEffect, useState } from 'react';
import EbookLibrary from './ebook/EbookLibrary';
import EbookReaderView from './ebook/EbookReaderView';
import ReaderHeader from './ebook/ReaderHeader';

export default function EbookReaderHydrator() {
    const [open, setOpen] = useState<{ id: string; title: string } | null>(null);

    useEffect(() => {
        const bookId = new URLSearchParams(window.location.search).get('book');
        if (bookId) setOpen({ id: bookId, title: '' });
    }, []);

    return (
        <>
            {open ? (
                <EbookReaderView bookId={open.id} onClose={() => setOpen(null)} />
            ) : (
                <>
                    <ReaderHeader />
                    <EbookLibrary onOpen={(id, title) => setOpen({ id, title })} />
                </>
            )}
        </>
    );
}
