
export function generateFAQSchema(contentJson: any) {
    if (!contentJson || !contentJson.content) return null;

    const faqItems: any[] = [];

    const traverse = (nodes: any[]) => {
        nodes.forEach(node => {
            if (node.type === 'faqSection' && node.attrs && node.attrs.items) {
                node.attrs.items.forEach((item: any) => {
                    if (item.question && item.answer) {
                        faqItems.push({
                            "@type": "Question",
                            "name": item.question,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": item.answer
                            }
                        });
                    }
                });
            }
            if (node.content) {
                traverse(node.content);
            }
        });
    };

    traverse(contentJson.content);

    if (faqItems.length === 0) return null;

    return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems
    });
}
