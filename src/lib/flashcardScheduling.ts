import { fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

/**
 * Spaced-repetition scheduling for flashcards.
 *
 * The backend only stores card state; every "when is this due next" decision is
 * made here with FSRS, so the review screen can preview each button's interval
 * before the person answers.
 */

export type ReviewRating = 1 | 2 | 3 | 4;

/** FSRS state exactly as the API stores it. Dates travel as ISO strings. */
export interface StoredCardState {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    learning_steps: number;
    reps: number;
    lapses: number;
    state: number;
    last_review: string | null;
}

export const RATING_LABELS: Record<ReviewRating, string> = {
    1: 'Again',
    2: 'Hard',
    3: 'Good',
    4: 'Easy',
};

export const CARD_STATE_LABELS: Record<number, string> = {
    [State.New]: 'New',
    [State.Learning]: 'Learning',
    [State.Review]: 'Review',
    [State.Relearning]: 'Relearning',
};

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: true }));

export function toFsrsCard(stored: StoredCardState): Card {
    return {
        due: new Date(stored.due),
        stability: stored.stability,
        difficulty: stored.difficulty,
        elapsed_days: stored.elapsed_days,
        scheduled_days: stored.scheduled_days,
        learning_steps: stored.learning_steps,
        reps: stored.reps,
        lapses: stored.lapses,
        state: stored.state as State,
        last_review: stored.last_review ? new Date(stored.last_review) : undefined,
    };
}

export function toStoredState(card: Card): StoredCardState {
    return {
        due: card.due.toISOString(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        learning_steps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        last_review: card.last_review ? card.last_review.toISOString() : null,
    };
}

/** The state a card moves to if it is answered with `rating` at `now`. */
export function scheduleReview(stored: StoredCardState, rating: ReviewRating, now: Date = new Date()): StoredCardState {
    const { card } = scheduler.next(toFsrsCard(stored), now, rating as Grade);
    return toStoredState(card);
}

/** Compact "in 10m" / "in 3d" label for how far `due` sits from `now`. */
export function formatInterval(due: Date | string, now: Date = new Date()): string {
    const minutes = Math.max(0, Math.floor((new Date(due).getTime() - now.getTime()) / 60_000));
    if (minutes < 1) return '<1m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo`;
    return `${Math.round((days / 365) * 10) / 10}y`;
}

/** What each answer button would schedule, for showing under the buttons. */
export function previewIntervals(stored: StoredCardState, now: Date = new Date()): Record<ReviewRating, string> {
    const card = toFsrsCard(stored);
    const preview = scheduler.repeat(card, now);
    return {
        1: formatInterval(preview[Rating.Again].card.due, now),
        2: formatInterval(preview[Rating.Hard].card.due, now),
        3: formatInterval(preview[Rating.Good].card.due, now),
        4: formatInterval(preview[Rating.Easy].card.due, now),
    };
}

/** Maps a keyboard key to a rating, the way Anki does (1–4). */
export function ratingFromKey(key: string): ReviewRating | null {
    return key === '1' || key === '2' || key === '3' || key === '4' ? (Number(key) as ReviewRating) : null;
}
