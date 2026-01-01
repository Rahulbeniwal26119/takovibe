
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Heading from "@tiptap/extension-heading";
import ImageExt from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import { common, createLowlight } from "lowlight";
import { QuizSchema } from "../components/editor/QuizSchema";
import { CodePlaygroundSchema } from "../components/editor/CodePlaygroundSchema";
import { FAQSchema } from "../components/editor/FAQSchema";
import { createHighlighter } from "shiki";

// Initialize lowlight
const lowlight = createLowlight(common);

// Initialize highlighter
// We use a singleton promise pattern to avoid recreating the highlighter on every request if the module is cached,
// though in serverless this might run per request.
let highlighterPromise: Promise<any> | null = null;

async function getHighlighter() {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: ["github-dark", "github-light"],
            langs: ["python", "javascript", "html", "css", "json", "bash", "go", "typescript", "tsx", "jsx", "shell", "yaml", "dockerfile", "sql", "rust"],
        });
    }
    return highlighterPromise;
}

// Helper for async replace
async function replaceAsync(str: string, regex: RegExp, asyncFn: (...args: any[]) => Promise<string>) {
    const promises: Promise<string>[] = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
        return match;
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift() || "");
}

// Custom code block extension
const CustomCodeBlock = CodeBlockLowlight.extend({
    addAttributes() {
        return {
            output: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-output"),
                renderHTML: (attributes) => {
                    if (
                        attributes.output === null ||
                        attributes.output === undefined
                    ) {
                        return {};
                    }
                    return {
                        "data-output": attributes.output,
                    };
                },
            },
            showOutput: {
                default: false,
                parseHTML: (element) =>
                    element.getAttribute("data-show-output") === "true",
                renderHTML: (attributes) => {
                    if (!attributes.showOutput) {
                        return {};
                    }
                    return {
                        "data-show-output": "true",
                    };
                },
            },
            language: {
                default: null,
                parseHTML: (element) => {
                    const classList = element.querySelector("code")?.classList;
                    const match = classList
                        ? Array.from(classList).find((cls) =>
                            cls.startsWith("language-"),
                        )
                        : null;
                    return match ? match.replace("language-", "") : null;
                },
                renderHTML: (attributes) => {
                    return {};
                },
            },
            tabs: {
                default: null,
                parseHTML: (element) => {
                    const tabsData = element.getAttribute("data-tabs");
                    return tabsData ? JSON.parse(tabsData) : null;
                },
                renderHTML: (attributes) => {
                    if (!attributes.tabs) return {};
                    return {
                        "data-tabs": JSON.stringify(attributes.tabs),
                    };
                },
            },
        };
    },
});

export async function processBackendContent(contentJson: any) {
    const headings: { depth: number; slug: string; text: string }[] = [];

    // Process headings for TOC
    if (contentJson && contentJson.content) {
        const traverseNodes = (nodes: any[]) => {
            nodes.forEach((node) => {
                if (node.type === "heading") {
                    const text = node.content?.[0]?.text || "";
                    const slug = text
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^\w-]/g, "");
                    if (!node.attrs) node.attrs = {};
                    node.attrs.id = slug;
                    headings.push({
                        depth: node.attrs.level,
                        slug: slug,
                        text: text,
                    });
                }
                if (node.content) {
                    traverseNodes(node.content);
                }
            });
        };
        traverseNodes(contentJson.content);
    }

    const CustomHeading = Heading.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                id: {
                    default: null,
                    renderHTML: (attributes) => {
                        if (!attributes.id) return {};
                        return { id: attributes.id };
                    },
                    parseHTML: (element) => element.getAttribute("id"),
                },
            };
        },
    });

    let htmlContent = generateHTML(contentJson, [
        StarterKit.configure({
            codeBlock: false,
            heading: false,
        }),
        CustomHeading,
        Underline,
        Table.configure({
            HTMLAttributes: {
                class: "border-collapse table-auto w-full my-4",
            },
        }),
        TableRow,
        TableHeader.configure({
            HTMLAttributes: {
                class: "border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 p-2 font-bold text-left",
            },
        }),
        TableCell.configure({
            HTMLAttributes: {
                class: "border border-gray-300 dark:border-gray-600 p-2",
            },
        }),
        ImageExt.configure({
            HTMLAttributes: {
                class: "rounded-xl shadow-lg my-8",
            },
        }),
        CustomCodeBlock.configure({
            lowlight,
        }),
        QuizSchema,
        CodePlaygroundSchema,
        FAQSchema,
        Link.configure({
            openOnClick: false,
            autolink: true,
            defaultProtocol: 'https',
        }),
        Youtube.configure({
            controls: false,
            nocookie: true,
        }),
    ]);

    // Highlight code blocks
    htmlContent = await highlightCodeBlocks(htmlContent);

    return { htmlContent, headings };
}

async function highlightCodeBlocks(html: string) {
    const highlighter = await getHighlighter();

    return replaceAsync(
        html,
        /<pre([^>]*)><code[^>]*class="[^"]*language-([a-zA-Z0-9_-]+)[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
        async (match: string, preAttrs: string, lang: string, content: string) => {
            try {
                // Skip highlighting if this code block has tabs (will be handled by frontend)
                if (preAttrs.includes('data-tabs')) {
                    return match;
                }

                const decoded = content
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'");

                let highlighted = await highlighter.codeToHtml(decoded, {
                    lang: lang,
                    themes: {
                        light: "github-light",
                        dark: "github-dark",
                    },
                });

                const showOutputMatch = preAttrs.match(
                    /data-show-output="true"/,
                );
                const outputMatch = preAttrs.match(/data-output="([^"]*)"/);

                if (showOutputMatch && outputMatch) {
                    const outputText = outputMatch[1]
                        .replace(/&amp;/g, "&")
                        .replace(/&quot;/g, '"')
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&#34;/g, '"');

                    const outputHtml = `
                        <div class="bg-[#1e1e1e] border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div class="flex items-center justify-between px-4 py-1.5 border-b border-white/10 bg-[#252526]">
                                <div class="flex items-center gap-2">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="4 17 10 11 4 5"></polyline>
                                        <line x1="12" y1="19" x2="20" y2="19"></line>
                                    </svg>
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Output</span>
                                </div>
                            </div>
                            <div class="p-0">
                                <div class="w-full bg-transparent text-gray-300 font-mono text-[12px] sm:text-[14px] leading-relaxed p-3 whitespace-pre-wrap selection:bg-gray-700">${outputText}</div>
                            </div>
                        </div>
                    `;

                    highlighted += outputHtml;
                }

                return highlighted;
            } catch (e) {
                console.error("Highlighting failed", e);
                return match;
            }
        },
    );
}
