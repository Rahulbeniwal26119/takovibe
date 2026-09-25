import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import '@mathjax/src/js/input/tex/mathtools/MathtoolsConfiguration.js';
import '@mathjax/src/js/input/tex/cancel/CancelConfiguration.js';
import '@mathjax/src/js/input/tex/color/ColorConfiguration.js';
import { viewBoxToPixels } from './mathLatex';

/**
 * Renders LaTeX to an image the canvas can hold like any other image.
 *
 * MathJax is used rather than KaTeX because its SVG output is self-contained
 * (glyphs are paths, no web fonts). Formulas go on the canvas as SVG, not PNG:
 * Excalidraw's dark theme re-inverts raster images to keep photos true-colour,
 * but leaves SVGs inverted with the canvas — so black ink turns light in dark
 * mode exactly like native text, and stays sharp at any zoom.
 * This module is heavy — import it lazily.
 */

// Rarer glyph sets (blackboard bold, fraktur, …) are split out and fetched on
// demand; hand MathJax a loader Vite can bundle.
const fontChunks = import.meta.glob('/node_modules/@mathjax/mathjax-newcm-font/mjs/svg/dynamic/*.js');
mathjax.asyncLoad = (name: string) => {
    const file = name.split('/').pop();
    const key = Object.keys(fontChunks).find((path) => path.endsWith(`/${file}`));
    return key ? fontChunks[key]() : Promise.reject(new Error(`Unknown MathJax resource: ${name}`));
};

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const document = mathjax.document('', {
    InputJax: new TeX({
        packages: ['base', 'ams', 'newcommand', 'boldsymbol', 'mathtools', 'cancel', 'color'],
        // Surface syntax errors to the dialog instead of drawing red error text.
        formatError: (_jax: unknown, error: Error) => {
            throw error;
        },
    }),
    OutputJax: new SVG({ fontCache: 'none' }),
});

/** Size formulas land at on the canvas, roughly matching large text. */
const CANVAS_FONT_SIZE_PX = 32;
const PADDING_PX = 8;
const INK_COLOR = '#1e1e1e';

export interface RenderedFormula {
    svg: string;
    dataURL: string;
    mimeType: 'image/svg+xml';
    width: number;
    height: number;
}

/** Standalone SVG markup for a formula. Throws with MathJax's message on bad LaTeX. */
export async function latexToSvg(latex: string, fontSizePx = CANVAS_FONT_SIZE_PX): Promise<{ svg: string; width: number; height: number }> {
    const node = await mathjax.handleRetriesFor(() => document.convert(latex, { display: true }));
    const svgNode = adaptor.firstChild(node) as any;
    const size = viewBoxToPixels(adaptor.getAttribute(svgNode, 'viewBox'), fontSizePx);
    if (!size) throw new Error('This formula rendered empty.');

    adaptor.setAttribute(svgNode, 'width', `${size.width}px`);
    adaptor.setAttribute(svgNode, 'height', `${size.height}px`);
    adaptor.setAttribute(svgNode, 'color', INK_COLOR);
    adaptor.setStyle(svgNode, 'vertical-align', '');
    const svg = adaptor.outerHTML(svgNode).replace(/currentColor/g, INK_COLOR);
    return { svg, ...size };
}

/** Base64 that survives any non-ASCII MathJax may emit (btoa alone does not). */
function toBase64(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

/** LaTeX → padded standalone SVG data URL sized for the canvas. */
export async function renderLatexToImage(latex: string): Promise<RenderedFormula> {
    const { svg: inner, width, height } = await latexToSvg(latex);
    const outWidth = width + PADDING_PX * 2;
    const outHeight = height + PADDING_PX * 2;
    // Nest the formula so padding needs no viewBox arithmetic; the explicit
    // pixel size is what Excalidraw reads as the image's natural size.
    const nested = inner.replace('<svg ', `<svg x="${PADDING_PX}" y="${PADDING_PX}" `);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outWidth}" height="${outHeight}" viewBox="0 0 ${outWidth} ${outHeight}">${nested}</svg>`;
    return {
        svg,
        dataURL: `data:image/svg+xml;base64,${toBase64(svg)}`,
        mimeType: 'image/svg+xml',
        width: outWidth,
        height: outHeight,
    };
}
