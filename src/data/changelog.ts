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
        "date": "2026-01-06",
        "version": "Feature Release",
        "title": "Notes Dashboard & Ghost Artist",
        "description": "Sketch Notes is out of Preview! We've introduced a dedicated centralized hub for all your visual notes, along with powerful AI sketching capabilities.",
        "changes": [
            {
                "type": "new",
                "text": "Notes Dashboard: A brand new 'My Notes' page to manage all your drawings in one place.",
                "images": [
                    "https://ik.imagekit.io/bhu1voux5/notes-dashboard-standalone",
                    "https://ik.imagekit.io/bhu1voux5/notes-dashboard-article"
                ]
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
        "version": "Feature Update",
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
        "version": "Initial Version",
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
