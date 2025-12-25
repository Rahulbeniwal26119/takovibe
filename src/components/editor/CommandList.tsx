
import React, { Component, useEffect, useState, useImperativeHandle, forwardRef, useRef } from 'react'
import {
    Heading1, Heading2, Heading3, List, ListOrdered,
    Image as ImageIcon, HelpCircle, Table as TableIcon,
    Code, Minus, Youtube as YoutubeIcon, Text
} from 'lucide-react'

export const CommandList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command(item)
        }
    }

    // Keyboard Navigation
    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    // Auto-scroll to selected item
    useEffect(() => {
        if (scrollContainerRef.current) {
            const selectedElement = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                // Simple scroll into view logic
                const container = scrollContainerRef.current;
                const itemTop = selectedElement.offsetTop;
                const itemBottom = itemTop + selectedElement.offsetHeight;
                const containerScrollTop = container.scrollTop;
                const containerHeight = container.offsetHeight;

                if (itemTop < containerScrollTop) {
                    container.scrollTop = itemTop;
                } else if (itemBottom > containerScrollTop + containerHeight) {
                    container.scrollTop = itemBottom - containerHeight;
                }
            }
        }
    }, [selectedIndex]);

    useEffect(() => {
        setSelectedIndex(0)
    }, [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        },
    }))

    return (
        <div
            ref={scrollContainerRef}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-y-auto min-w-[300px] max-w-[500px] max-h-[350px] p-2 grid grid-cols-1 md:grid-cols-2 gap-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-300 dark:hover:scrollbar-thumb-gray-600"
        >
            {props.items.length ? (
                props.items.map((item: any, index: number) => {
                    const Icon = item.icon
                    const isSelected = index === selectedIndex;
                    return (
                        <button
                            className={`flex items-start gap-3 w-full px-3 py-3 text-left rounded-lg transition-all duration-75 border ${isSelected
                                ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-500/30'
                                : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}
                            key={index}
                            onClick={() => selectItem(index)}
                        >
                            <div className={`p-2 rounded-md shrink-0 ${isSelected
                                ? 'bg-white text-purple-600 shadow-sm dark:bg-purple-500/20 dark:text-purple-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {Icon && <Icon className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`font-semibold text-sm truncate ${isSelected ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {item.title}
                                </span>
                                {item.description && (
                                    <span className={`text-xs truncate ${isSelected ? 'text-purple-700/70 dark:text-purple-200/50' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {item.description}
                                    </span>
                                )}
                            </div>
                        </button>
                    )
                })
            ) : (
                <div className="col-span-2 px-4 py-8 text-center text-sm text-gray-500">
                    No matching commands
                </div>
            )}
        </div>
    )
})
