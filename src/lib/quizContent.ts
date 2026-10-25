export interface QuizCode {
    language: string;
    code: string;
}

export interface QuizOption {
    text: string;
    code?: QuizCode | null;
}

export type StoredQuizOption = string | QuizOption;

export function normalizeQuizCode(value: unknown): QuizCode | null {
    if (!value || typeof value !== 'object') return null;
    const code = value as Partial<QuizCode>;
    if (typeof code.code !== 'string') return null;
    return {
        language: typeof code.language === 'string' && code.language.trim() ? code.language.trim() : 'text',
        code: code.code,
    };
}

export function normalizeQuizOption(value: unknown): QuizOption {
    if (typeof value === 'string') return { text: value };
    if (!value || typeof value !== 'object') return { text: '' };
    const option = value as Partial<QuizOption>;
    const code = normalizeQuizCode(option.code);
    return {
        text: typeof option.text === 'string' ? option.text : '',
        ...(code ? { code } : {}),
    };
}

export function normalizeQuizOptions(value: unknown): QuizOption[] {
    return Array.isArray(value) ? value.map(normalizeQuizOption) : [];
}

export function parseFencedQuizCode(value: string): QuizCode | null {
    const normalized = value.replace(/\r\n/g, '\n').trim();
    const match = normalized.match(/^```([^\n`]*)\n([\s\S]*?)\n?```$/);
    if (!match) return null;
    return {
        language: match[1].trim() || 'text',
        code: match[2].replace(/\n$/, ''),
    };
}
