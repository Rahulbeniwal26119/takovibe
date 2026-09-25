/**
 * Pure helpers for LaTeX formulas placed on the canvas.
 *
 * Kept free of MathJax so they can be unit tested and imported eagerly; the
 * renderer itself is loaded only when someone opens the formula dialog.
 */

/** Strips the math delimiters people paste along with a formula. */
export function normalizeLatex(input: string): string {
    let latex = (input || '').trim();
    const wrappers: Array<[string, string]> = [
        ['$$', '$$'],
        ['\\[', '\\]'],
        ['\\(', '\\)'],
        ['$', '$'],
    ];
    for (const [open, close] of wrappers) {
        if (latex.length > open.length + close.length && latex.startsWith(open) && latex.endsWith(close)) {
            latex = latex.slice(open.length, latex.length - close.length).trim();
            break;
        }
    }
    const environment = latex.match(/^\\begin\{(equation|displaymath)\*?\}([\s\S]*)\\end\{\1\*?\}$/);
    if (environment) latex = environment[2].trim();
    return latex;
}

/**
 * pix2tex often prefixes its output with a style switch (\scriptstyle,
 * \textstyle), which renders the formula tiny or cramped on the canvas. Drop
 * a leading one — and the outer braces it tends to come wrapped in.
 */
export function cleanRecognisedLatex(latex: string): string {
    let result = normalizeLatex(latex);
    for (;;) {
        const stripped = result.replace(/^\\(?:scriptscriptstyle|scriptstyle|textstyle|displaystyle)(?![a-zA-Z])\s*/, '');
        const unwrapped = /^\{[\s\S]*\}$/.test(stripped) && isBalancedGroup(stripped) ? stripped.slice(1, -1).trim() : stripped;
        if (unwrapped === result) return result;
        result = unwrapped;
    }
}

/** True when `text` is a single `{…}` group whose opening brace closes at the end. */
function isBalancedGroup(text: string): boolean {
    let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === '\\') {
            i += 1;
            continue;
        }
        if (char === '{') depth += 1;
        if (char === '}') {
            depth -= 1;
            if (depth === 0 && i !== text.length - 1) return false;
        }
    }
    return depth === 0;
}

/**
 * Converts MathJax's viewBox units (thousandths of an em) into CSS pixels, so a
 * rendered formula lands on the canvas at a readable text size.
 */
export function viewBoxToPixels(viewBox: string, fontSizePx: number): { width: number; height: number } | null {
    const parts = (viewBox || '').trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
    const [, , width, height] = parts;
    if (width <= 0 || height <= 0) return null;
    return {
        width: Math.max(1, Math.ceil((width / 1000) * fontSizePx)),
        height: Math.max(1, Math.ceil((height / 1000) * fontSizePx)),
    };
}

/** Customdata keys a formula image carries so it can be re-edited later. */
export interface MathElementData {
    mathLatex: string;
    mathSource: 'ocr' | 'typed';
}

export function readMathElementData(element: any): MathElementData | null {
    const latex = element?.customData?.mathLatex;
    if (element?.type !== 'image' || typeof latex !== 'string' || !latex.trim()) return null;
    return {
        mathLatex: latex,
        mathSource: element.customData.mathSource === 'ocr' ? 'ocr' : 'typed',
    };
}
