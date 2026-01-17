export interface ChangeLogEntry {
    date: string;
    version?: string;
    title: string;
    description: string;
    changes: {
        type: 'new' | 'improvement' | 'fix' | 'removed';
        text: string;
        images?: string[];
        comparisons?: {
            image_before: string;
            image_after: string;
            label?: string;
        }[];
    }[];
    // Deprecated root level media fields
    image_before?: string;
    image_after?: string;
    image?: string;
    images?: string[];
    comparisons?: {
        image_before: string;
        image_after: string;
        label?: string;
    }[];
}

export const changelogData: ChangeLogEntry[] = [
    {
        "date": "2026-01-17",
        "version": "Improvement",
        "title": "Homepage & Layout Refinements",
        "description": "Polished the homepage experience with consistent spacing and smoother interactive flows.",
        "changes": [
            {
                "type": "improvement",
                "text": "Code Playground Integration: Clicking 'Try It Out' on the homepage now instantly opens the Code Playground with a live example.",
            },
            {
                "type": "improvement",
                "text": "Visual Consistency: Standardized vertical spacing across all homepage sections for a more balanced rhythm.",
            },
            {
                "type": "fix",
                "text": "Mobile Typography: Optimized article headings on smaller screens (iPhone SE) to prevent text overflow and ensure proper padding.",
            },
        ],
    },
    {
        "date": "2026-01-16",
        "version": "Feature Release",
        "title": "Series Redesign & Vim Mode",
        "description": "A fresh look for the Series page and enhanced developer tools in the Code Studio.",
        "changes": [
            {
                "type": "improvement",
                "text": "Series Page Redesign: Replaced the timeline layout with a modern, responsive grid. Added image support for series cards with a stylish fallback."
            },
            {
                "type": "new",
                "text": "Vim Mode: Added Vim keybinding support to the Code Studio editor. Toggle it on for a keyboard-centric coding experience."
            },
            {
                "type": "improvement",
                "text": "UI Cleanup: Simplified series cards by removing read time indicators and refining the visual hierarchy."
            },
            {
                "type": "fix",
                "text": "Series Navigation: Fixed navigation issues in the 'Start from Beginning' and 'Jump to Latest' buttons."
            }
        ]
    },
    {
        "date": "2026-01-15",
        "version": "Beta Launch",
        "title": "Code Playground",
        "description": "Experiment with code directly in your browser. Now supporting multiple backend languages.",
        "changes": [
            {
                "type": "new",
                "text": "Code Playground: A robust, multi-language editor for testing snippets securely."
            },
            {
                "type": "new",
                "text": "Multi-Language Support: Added backend execution support for Python, Golang, and Rust, alongside standard Web (HTML/CSS/JS)."
            },
            {
                "type": "improvement",
                "text": "Secure Execution: Backend code runs in an isolated, secure environment."
            }
        ]
    },
    {
        "date": "2026-01-13",
        "version": "Feature Release",
        "title": "Note Management Update",
        "description": "Improved note management with deletion capabilities and better access to AI tools.",
        "changes": [
            {
                "type": "new",
                "text": "Delete Notes: You can now permanently delete notes from your collection."
            },
            {
                "type": "improvement",
                "text": "AI Diagram Access: The text-to-diagram tool is now visible to all users, prompting login when needed."
            }
        ]
    },
    {
        "date": "2026-01-12",
        "version": "Bug Fix",
        "title": "Diagram & Editor Stability",
        "description": "Major stability improvements for the editor and diagramming tools, ensuring a smoother creative workflow.",
        "changes": [
            {
                "type": "fix",
                "text": "Mermaid Diagrams: Fixed invisible text and arrows. Diagrams now render robustly with correct centering and high contrast.",
                // "images": [
                //     "https://ik.imagekit.io/bhu1voux5/mermaid_fix_demo.png"
                // ]
            },
            {
                "type": "improvement",
                "text": "Editor Stability: Resolved an 'Infinite Save Loop' that was causing the editor to flash and reload."
            },
            {
                "type": "new",
                "text": "Public Notes: You can now toggle notes as Public or Private directly from the editor."
            },
            {
                "type": "improvement",
                "text": "Excalidraw Integration: Ported the robust 'Ghost Drawer' logic to the main Note Editor for consistent diagram handling."
            }
        ]
    },
    {
        "date": "2026-01-11",
        "version": "Feature Release",
        "title": "Public Notes & Unified Filtering",
        "description": "Added privacy controls for notes and improved site performance with unified data fetching.",
        "changes": [
            {
                "type": "new",
                "text": "Public/Private Toggle: New control in the editor to manage note privacy."
            },
            {
                "type": "improvement",
                "text": "Unified APIs: Consolidated multiple API calls for blogs and drawings into efficient, single endpoints."
            },
            {
                "type": "fix",
                "text": "Light Mode Styling: Fixed article heading visibility issues in light mode."
            }
        ]
    },
    {
        "date": "2026-01-09",
        "version": "Bug Fix",
        "title": "Legacy Article Support",
        "description": "Restored full interactive features for older MDX-based articles.",
        "changes": [
            {
                "type": "fix",
                "text": "Legacy UI Restoration: Zen Navigation and Reader Toolbar now work correctly on legacy MDX articles."
            }
        ]
    },
    {
        "date": "2026-01-08",
        "version": "Improvement",
        "title": "Performance Tuning",
        "description": "Backend and server configuration updates to improve load times.",
        "changes": [
            {
                "type": "improvement",
                "text": "TTFB Optimization: Debugged and optimized Nginx configurations to reduce server response times for static content."
            }
        ]
    },
    {
        "date": "2026-01-06",
        "version": "Feature Release",
        "title": "Notes Dashboard & Ghost Artist",
        "description": "Sketch Notes is out of Preview! We've introduced a dedicated centralized hub for all your visual notes, along with powerful AI sketching capabilities.",
        "changes": [
            {
                "type": "new",
                "text": "Notes Dashboard: A brand new 'My Notes' page to manage all your drawings in one place.",
                // "images": [
                //     "https://ik.imagekit.io/bhu1voux5/notes-dashboard-standalone",
                //     "https://ik.imagekit.io/bhu1voux5/notes-dashboard-article"
                // ]
            },
            {
                "type": "new",
                "text": "Dual Modes: Create 'Standalone Notes' for independent ideas or access 'Article Notes' linked directly to your blog posts."
            },
            {
                "type": "new",
                "text": "Add to Sketch: Seamlessly send text or selections from an article directly to your current note."
            },
            {
                "type": "new",
                "text": "Ghost Artist (Experimental): An AI-powered assistant that turns your text descriptions into editable diagrams using Mermaid.js."
            }
        ]
    },
    {
        "date": "2026-01-02",
        "version": "Beta Preview",
        "title": "Sketch Notes (Preview) & UI Refinements",
        "description": "Introducing Sketch Notes for visual thinking, along with polished transitions and mobile improvements.",
        "changes": [
            {
                "type": "new",
                "text": "Sketch Notes (Preview): Draw diagrams and take visual notes directly alongside articles. Powered by Excalidraw."
            },
            {
                "type": "improvement",
                "text": "Immersive Mode: Maximizing Sketch Notes now hides the website header, giving you a true full-screen canvas."
            },
            {
                "type": "improvement",
                "text": "Mobile Optimization: Sketch Notes automatically adapts to full-screen on mobile devices for better usability."
            },
            {
                "type": "improvement",
                "text": "Reader Toolbar: A cleaner, consolidated toolbar with new 'Preview' badges for AI and Sketch features."
            }
        ]
    },
    {
        "date": "2026-01-01",
        "version": "Improvement",
        "title": "Enhanced Profile, Stats & Editor Polish",
        "description": "We've improved the author profile experience with better statistics and refined the editor with tabbed code blocks.",
        "changes": [
            {
                "type": "improvement",
                "text": "Smart Date Display: The profile now conditionally shows 'Author Since' date instead of a generic joined date."
            },
            {
                "type": "improvement",
                "text": "Accurate Article Counts: Dashboard and profile stats now accurately reflect the total number of published articles."
            },
            {
                "type": "new",
                "text": "Tabbed Code Blocks: You can now add multiple tabs to a single code block, perfect for multi-language examples."
            },
            {
                "type": "improvement",
                "text": "Consistent Code Styling: All code blocks now use JetBrains Mono with consistent sizing and positioning."
            },
            {
                "type": "fix",
                "text": "UI Cleanup: Simplified the sidebar and reduced header clutter in the editor."
            }
        ]
    },
    {
        "date": "2025-12-30",
        "version": "Beta Preview",
        "title": "Introducing Kumi & Comments Redesign",
        "description": "We are excited to introduce Kumi, your new AI reading companion, alongside a completely reimagined commenting experience.",
        "changes": [
            {
                "type": "new",
                "text": "Kumi AI Chatbot: Your new intelligent reading companion. Kumi helps you learn faster with these features:",
            },
            {
                "type": "new",
                "text": "✨ Summarize Articles: Get quick, concise summaries of long posts."
            },
            {
                "type": "new",
                "text": "👨‍💻 Code Explanation: Select any code snippet and ask Kumi to explain it line-by-line."
            },
            {
                "type": "new",
                "text": "📊 Visual Learning: Ask Kumi to visualize concepts with Mermaid diagrams."
            },
            {
                "type": "new",
                "text": "🧠 Interactive Quizzes: Test your knowledge with AI-generated quizzes based on the article."
            },
            {
                "type": "improvement",
                "text": "Floating Comments Panel: Replaced the side drawer with a modern, floating glass panel. It now sits cleanly on the right without overlapping the header."
            },
            {
                "type": "improvement",
                "text": "Clean Workspace: Kumi automatically hides when you open the comments section to prevent visual clutter."
            },
            {
                "type": "fix",
                "text": "Solved z-index layout issues between sticky headers and sidebars."
            }
        ]
    },
    {
        "date": "2025-12-29",
        "version": "Feature Release",
        "title": "Header Improvements and New Pages Added",
        "description": "Header improved and new pages for Inbox and change log",
        "changes": [
            {
                "type": "new",
                "text": "Changelog Page Added",
                "images": [
                    "https://ik.imagekit.io/bhu1voux5/Change%20Log%20Page%20Added"
                ]
            },
            {
                "type": "new",
                "text": "Added Inbox Page For Admins to manage the pending contact messages",
                "images": [
                    "https://ik.imagekit.io/bhu1voux5/added%20inbox%20option%2029%20dec"
                ]
            },
            {
                "type": "removed",
                "text": "Removed Categories Page",
                "comparisons": [
                    {
                        "image_before": "https://ik.imagekit.io/bhu1voux5/categories%20removed",
                        "image_after": "https://ik.imagekit.io/bhu1voux5/categories%20removed%202"
                    }
                ]
            }
        ]
    }
];
