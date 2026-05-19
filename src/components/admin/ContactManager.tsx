import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

interface ContactRequest {
    id: number;
    name: string;
    email: string;
    subject: string;
    message: string;
    is_resolved: boolean;
    created_at: string;
}

interface PaginatedResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ContactRequest[];
}

export const ContactManager: React.FC = () => {
    const [contacts, setContacts] = useState<ContactRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<{ next: string | null; previous: string | null; count: number }>({
        next: null,
        previous: null,
        count: 0,
    });
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchContacts = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchWithAuth(`${API_URL}/api/blogs/contact-us/?page=${page}`);

            if (response.status === 403) {
                setError("You are not authorized to view this page. Admin access required.");
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch contact requests');
            }

            const data: PaginatedResponse = await response.json();
            setContacts(data.results);
            setPagination({
                next: data.next,
                previous: data.previous,
                count: data.count,
            });
            setCurrentPage(page);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const handleResolve = async (id: number) => {
        setProcessingId(id);
        try {
            const response = await fetchWithAuth(`${API_URL}/api/blogs/contact-us/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_resolved: true }),
            });

            if (!response.ok) {
                throw new Error('Failed to resolve contact request');
            }

            // Remove user from list or update state
            setContacts(contacts.filter(c => c.id !== id));

            // Optionally refresh to get new items if current page becomes empty?
            // simpler to just remove for now.
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to resolve');
        } finally {
            setProcessingId(null);
        }
    };



    if (loading && contacts.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="h-12 w-12 animate-pulse rounded-lg border border-orange-500/20 bg-orange-500/10"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <div className="text-red-600 dark:text-red-400 font-medium mb-2">Access Denied</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
                <a href="/" className="inline-block mt-4 text-orange-600 hover:underline">Return Home</a>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inbox</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {pagination.count} unresolved message{pagination.count !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => fetchContacts(currentPage)}
                    className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {contacts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-neutral-950 rounded-lg border border-dashed border-gray-200 dark:border-neutral-800">
                    <div className="text-4xl mb-4">📭</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No New Messages</h3>
                    <p className="text-gray-500 dark:text-gray-400">You're all caught up!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {contacts.map((contact) => (
                        <div
                            key={contact.id}
                            className="bg-white dark:bg-neutral-950 p-5 rounded-lg border border-gray-200 dark:border-neutral-800 transition-colors hover:border-orange-500/40 group"
                        >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold text-sm shrink-0">
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            {contact.subject}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            <span className="font-medium text-gray-900 dark:text-gray-300 break-words">{contact.name}</span>
                                            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">&bull;</span>
                                            <a href={`mailto:${contact.email}`} className="text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors break-all">{contact.email}</a>
                                            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">&bull;</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{new Date(contact.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>


                            </div>

                            <div className="bg-gray-50 dark:bg-neutral-900/70 rounded-lg p-4 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                {contact.message}
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => handleResolve(contact.id)}
                                    disabled={processingId === contact.id}
                                    className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                                >
                                    {processingId === contact.id ? 'Resolving...' : 'Resolve'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {/* Pagination */}
            {
                (pagination.next || pagination.previous) && (
                    <div className="flex justify-center gap-4 mt-8">
                        <button
                            onClick={() => fetchContacts(currentPage - 1)}
                            disabled={!pagination.previous}
                            className="px-4 py-2 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="flex items-center px-4 text-gray-500 dark:text-gray-400 text-sm">
                            Page {currentPage}
                        </span>
                        <button
                            onClick={() => fetchContacts(currentPage + 1)}
                            disabled={!pagination.next}
                            className="px-4 py-2 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )
            }
        </div >
    );
};
