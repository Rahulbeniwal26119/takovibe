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
