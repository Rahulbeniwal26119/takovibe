import React, { useState } from "react";

interface ChangeLogEntry {
    date: string;
    version?: string;
    title: string;
    changes?: {
        type: "new" | "improvement" | "fix" | "removed";
        text: string;
    }[];
}

interface ChangelogNavProps {
    entries: ChangeLogEntry[];
}

export default function ChangelogNav({ entries }: ChangelogNavProps) {
    const [currentDate, setCurrentDate] = useState(
        entries[0]?.date ? new Date(entries[0].date) : new Date(),
    );

    const formatDateString = (year: number, month: number, day: number) => {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    const getEntryId = (date: string, index: number) => `entry-${date}-${index}`;

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const scrollToEntry = (dateStr: string, index?: number) => {
        const resolvedIndex =
            typeof index === "number"
                ? index
                : entries.findIndex((entry) => entry.date === dateStr);
        const element = document.getElementById(getEntryId(dateStr, resolvedIndex));

        if (element) {
            const yOffset = -100;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    };

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const entryDateSet = new Set(entries.map((entry) => entry.date));
    const recentEntries = entries.slice(0, 8);
    const changeTypeCounts = entries.reduce(
        (acc, entry) => {
            entry.changes?.forEach((change) => {
                acc[change.type] += 1;
            });
            return acc;
        },
        { new: 0, improvement: 0, fix: 0, removed: 0 },
    );

    const daysInMonth = getDaysInMonth(
        currentDate.getFullYear(),
        currentDate.getMonth(),
    );
    const firstDay = getFirstDayOfMonth(
        currentDate.getFullYear(),
        currentDate.getMonth(),
    );

    const prevMonth = () => {
        setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
        );
    };

    const nextMonth = () => {
        setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
        );
    };

    return (
        <div className="space-y-4">
            <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        Updates
                    </h2>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                        {entries.length}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Stat label="New" value={changeTypeCounts.new} className="text-emerald-600 dark:text-emerald-300" />
                    <Stat label="Improved" value={changeTypeCounts.improvement} className="text-sky-600 dark:text-sky-300" />
                    <Stat label="Fixed" value={changeTypeCounts.fix} className="text-amber-600 dark:text-amber-300" />
                    <Stat label="Removed" value={changeTypeCounts.removed} className="text-rose-600 dark:text-rose-300" />
                </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                <div className="mb-4 flex items-center justify-between">
                    <button
                        onClick={prevMonth}
                        className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                        aria-label="Previous month"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <button
                        onClick={nextMonth}
                        className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                        aria-label="Next month"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div key={day} className="py-1">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-sm">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = formatDateString(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            day,
                        );
                        const hasChange = entryDateSet.has(dateStr);

                        return (
                            <button
                                key={day}
                                type="button"
                                disabled={!hasChange}
                                onClick={() => scrollToEntry(dateStr)}
                                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                    hasChange
                                        ? "bg-orange-500 font-bold text-white hover:bg-orange-600"
                                        : "cursor-default text-neutral-500 dark:text-neutral-500"
                                }`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Recent releases
                </h2>
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {recentEntries.map((entry, index) => (
                        <button
                            key={`${entry.date}-${index}`}
                            type="button"
                            onClick={() => scrollToEntry(entry.date, index)}
                            className="group w-full rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-orange-200 hover:bg-orange-50 dark:hover:border-orange-500/20 dark:hover:bg-orange-500/10"
                        >
                            <span className="block text-xs font-semibold text-orange-600 dark:text-orange-400">
                                {new Date(entry.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </span>
                            <span className="mt-1 block text-sm font-semibold leading-5 text-neutral-800 group-hover:text-neutral-950 dark:text-neutral-200 dark:group-hover:text-white">
                                {entry.title}
                            </span>
                            <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
                                {entry.version || "Release"}
                            </span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

function Stat({
    label,
    value,
    className,
}: {
    label: string;
    value: number;
    className: string;
}) {
    return (
        <div className="p-3">
            <p className={`text-lg font-bold ${className}`}>{value}</p>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
        </div>
    );
}
