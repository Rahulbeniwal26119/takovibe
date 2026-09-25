import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanRecognisedLatex, normalizeLatex, readMathElementData, viewBoxToPixels } from './mathLatex.ts';

test('pasted delimiters are stripped', () => {
    assert.equal(normalizeLatex('$$ x^2 $$'), 'x^2');
    assert.equal(normalizeLatex('\\[a+b\\]'), 'a+b');
    assert.equal(normalizeLatex('\\(a\\)'), 'a');
    assert.equal(normalizeLatex('$y$'), 'y');
    assert.equal(normalizeLatex('\\begin{equation*} E=mc^2 \\end{equation*}'), 'E=mc^2');
});

test('formulas without delimiters are left alone', () => {
    assert.equal(normalizeLatex('  \\frac{1}{2}  '), '\\frac{1}{2}');
    assert.equal(normalizeLatex('$'), '$');
    assert.equal(normalizeLatex(''), '');
    // Inner dollars that are not a wrapper must survive.
    assert.equal(normalizeLatex('a$ + $b'), 'a$ + $b');
});

test('viewBox units scale with the chosen font size', () => {
    assert.deepEqual(viewBoxToPixels('0 -1559 6209.8 2471', 32), { width: 199, height: 80 });
    assert.equal(viewBoxToPixels('0 0 0 10', 32), null);
    assert.equal(viewBoxToPixels('nonsense', 32), null);
});

test('only images carrying LaTeX count as formulas', () => {
    assert.deepEqual(
        readMathElementData({ type: 'image', customData: { mathLatex: 'x', mathSource: 'ocr' } }),
        { mathLatex: 'x', mathSource: 'ocr' },
    );
    assert.equal(readMathElementData({ type: 'image', customData: {} }), null);
    assert.equal(readMathElementData({ type: 'text', customData: { mathLatex: 'x' } }), null);
    assert.equal(readMathElementData(null), null);
});

test('recognised LaTeX loses a leading style switch and its wrapping braces', () => {
    assert.equal(
        cleanRecognisedLatex('\\scriptstyle{\\frac{\\pi n}{\\hbar c^{2}}}{\\frac{\\zeta E}{\\zeta a^{2}}}'),
        '{\\frac{\\pi n}{\\hbar c^{2}}}{\\frac{\\zeta E}{\\zeta a^{2}}}',
    );
    assert.equal(cleanRecognisedLatex('\\textstyle\\int_{0}^{1}x\\,dx'), '\\int_{0}^{1}x\\,dx');
    assert.equal(cleanRecognisedLatex('{\\displaystyle{a+b}}'), 'a+b');
    // Two separate groups are not one wrapper, and \\textstyles are not \\textstyle.
    assert.equal(cleanRecognisedLatex('{a}{b}'), '{a}{b}');
    assert.equal(cleanRecognisedLatex('\\textstyles x'), '\\textstyles x');
    assert.equal(cleanRecognisedLatex('\\{x\\}'), '\\{x\\}');
});
