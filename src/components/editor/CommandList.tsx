
import React, { Component, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import {
    Heading1, Heading2, Heading3, List, ListOrdered,
    Image as ImageIcon, HelpCircle, Table as TableIcon,
    Code, Minus, Youtube as YoutubeIcon, Text
} from 'lucide-react'

export const CommandList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command(item)
        }
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[300px] p-1">
            {props.items.length ? (
                props.items.map((item: any, index: number) => {
                    const Icon = item.icon
                    return (
                        <button
                            className={`flex items-center gap-3 w-full px-3 py-2 text-sm text-left rounded-md transition-colors ${index === selectedIndex
                                    ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            key={index}
                            onClick={() => selectItem(index)}
                        >
                            <div className={`p-1 rounded ${index === selectedIndex ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                {Icon && <Icon className="w-4 h-4" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">{item.title}</span>
                                {item.description && <span className="text-xs opacity-70">{item.description}</span>}
                            </div>
                        </button>
                    )
                })
            ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No result</div>
            )}
        </div>
    )
})
