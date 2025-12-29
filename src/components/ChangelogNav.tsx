import React, { useState, useEffect } from "react";

interface ChangeLogEntry {
    date: string;
    version?: string;
    title: string;
}

interface ChangelogNavProps {
    entries: ChangeLogEntry[];
}

export default function ChangelogNav({ entries }: ChangelogNavProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper to format date as YYYY-MM-DD
    const formatDateString = (year: number, month: number, day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const daysInMonth = getDaysInMonth(
        currentDate.getFullYear(),
        currentDate.getMonth()
    );
    const firstDay = getFirstDayOfMonth(
        currentDate.getFullYear(),
        currentDate.getMonth()
    );

    const prevMonth = () => {
        setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        );
    };

    const nextMonth = () => {
        setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
        );
    };

    const scrollToEntry = (dateStr: string) => {
        const element = document.getElementById(`entry-${dateStr}`);
        if (element) {
            // smooth scroll with offset for fixed header if needed
            const yOffset = -100;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="flex flex-col gap-6">

            {/* Calendar Section */}
            <div className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-colors text-purple-600 dark:text-purple-400"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-colors text-purple-600 dark:text-purple-400"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-gray-400 font-medium py-1">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-sm">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const hasChange = entries.some(e => e.date === dateStr);

                        return (
                            <div
                                key={day}
                                className={`
                  relative h-8 w-8 mx-auto flex items-center justify-center rounded-full transition-all duration-300
                  ${hasChange
                                        ? "cursor-pointer font-bold text-white bg-gradient-to-tr from-purple-500 to-blue-500 shadow-md hover:shadow-lg hover:scale-110"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"}
                `}
                                onClick={() => hasChange && scrollToEntry(dateStr)}
                            >
                                {day}
                                {hasChange && (
                                    <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Version Filter Section */}
            <div className="w-full flex flex-col gap-4">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-2xl shadow-lg p-6 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200 dark:scrollbar-thumb-gray-600">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Filter by Version
                    </h3>
                    <div className="space-y-2">
                        {entries.reduce<{ entry: ChangeLogEntry, originalIdx: number }[]>((acc, entry, idx) => {
                            // Only keep the first occurrence of each version string
                            // Or if version is undefined, we might treat it as a unique key or group them. 
                            // Assuming version is populated or we fallback to 'v1.0'.
                            // We want UNIQUE versions.
                            const version = entry.version || 'v1.0';
                            if (!acc.find(item => (item.entry.version || 'v1.0') === version)) {
                                acc.push({ entry, originalIdx: idx });
                            }
                            return acc;
                        }, []).map(({ entry, originalIdx }) => (
                            <button
                                key={originalIdx}
                                onClick={() => scrollToEntry(entry.date)}
                                className="w-full text-left px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all group flex items-center justify-between"
                            >
                                <div>
                                    <span className="inline-block px-2 py-0.5 text-xs font-bold text-white bg-purple-500 rounded mr-2">
                                        {entry.version || 'v1.0'}
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 font-medium">
                                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">
                                    →
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
