import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import SingleQuiz from '../components/SingleQuiz';
import { QuizSchema } from '../components/editor/QuizSchema';
import { normalizeQuizOptions, parseFencedQuizCode } from './quizContent';

test('old string answers still render as text options', () => {
    expect(normalizeQuizOptions(['One', 'Two lines\nremain together'])).toEqual([
        { text: 'One' },
        { text: 'Two lines\nremain together' },
    ]);
});

test('fenced code paste keeps language and line breaks', () => {
    expect(parseFencedQuizCode('```python\nprint("hi")\nprint("bye")\n```')).toEqual({
        language: 'python',
        code: 'print("hi")\nprint("bye")',
    });
    expect(parseFencedQuizCode('ordinary\nmultiline text')).toBeNull();
});

test('quiz HTML carries code and explanation for article hydration', () => {
    const html = generateHTML({
        type: 'doc',
        content: [{
            type: 'quizComponent',
            attrs: {
                question: 'What prints?',
                questionCode: { language: 'python', code: 'print("hi")\nprint("bye")' },
                options: [{ text: 'A', code: { language: 'python', code: 'print("hi")' } }, 'B'],
                correctIndex: 0,
                explanation: 'Two lines\nare printed.',
            },
        }],
    }, [StarterKit, QuizSchema]);

    expect(html).toContain('data-question-code=');
    expect(html).toContain('data-explanation=');
    expect(html).toContain('options=');
    const encodedCode = html.match(/data-question-code="([^"]+)"/)?.[1];
    expect(JSON.parse(encodedCode!.replace(/&quot;/g, '"')).code).toBe('print("hi")\nprint("bye")');
});

test('reader renders multiline text and code in contained blocks', () => {
    const html = renderToStaticMarkup(createElement(SingleQuiz, {
        question: 'Line one\nLine two',
        questionCode: { language: 'sql', code: 'SELECT *\nFROM sales;' },
        options: [{ text: 'Use this', code: { language: 'sql', code: 'SELECT 1;' } }, 'Plain answer'],
        correctIndex: 0,
    }));

    expect(html).toContain('Line one\nLine two');
    const codeText = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1].replace(/<[^>]*>/g, '');
    expect(codeText).toBe('SELECT *\nFROM sales;');
    expect(html).toContain('class="hljs-keyword"');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('min-w-0');
});
