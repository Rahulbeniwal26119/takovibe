
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
import { common, createLowlight } from "lowlight";
import { QuizExtension } from "../components/editor/QuizExtension";
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
            themes: ["github-dark"],
            langs: ["python", "javascript", "html", "css", "json", "bash"],
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
        QuizExtension,
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
                const decoded = content
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'");

                let highlighted = await highlighter.codeToHtml(decoded, {
                    lang: lang,
                    theme: "github-dark",
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
                        <div class="mt-4 bg-[#161b22] rounded-lg border border-gray-700/50 overflow-hidden">
                            <div class="px-4 py-2 bg-[#0d1117] border-b border-gray-700/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Output
                            </div>
                            <div class="p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap">${outputText}</div>
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
