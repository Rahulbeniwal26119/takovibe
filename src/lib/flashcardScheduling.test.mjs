import assert from 'node:assert/strict';
import test from 'node:test';

import {
    formatInterval,
    previewIntervals,
    ratingFromKey,
    scheduleReview,
} from './flashcardScheduling.ts';

const NOW = new Date('2026-09-25T10:00:00.000Z');

function newCard() {
    return {
        due: NOW.toISOString(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: null,
    };
}

test('a new card answered Good leaves the New state and records the review', () => {
    const next = scheduleReview(newCard(), 3, NOW);
    assert.notEqual(next.state, 0);
    assert.equal(next.reps, 1);
    assert.equal(next.last_review, NOW.toISOString());
    assert.ok(new Date(next.due) > NOW);
});

test('Again comes back sooner than Easy', () => {
    const again = scheduleReview(newCard(), 1, NOW);
    const easy = scheduleReview(newCard(), 4, NOW);
    assert.ok(new Date(again.due) < new Date(easy.due));
});

test('repeated Good answers spread reviews further apart', () => {
    let card = newCard();
    let now = NOW;
    const gaps = [];
    for (let i = 0; i < 5; i += 1) {
        card = scheduleReview(card, 3, now);
        const due = new Date(card.due);
        gaps.push(due.getTime() - now.getTime());
        now = due;
    }
    assert.ok(gaps[4] > gaps[1], `expected growing gaps, got ${gaps}`);
});

test('forgetting a review card counts a lapse', () => {
    let card = newCard();
    let now = NOW;
    for (let i = 0; i < 4; i += 1) {
        card = scheduleReview(card, 3, now);
        now = new Date(card.due);
    }
    const forgotten = scheduleReview(card, 1, now);
    assert.equal(forgotten.lapses, card.lapses + 1);
});

test('previews give a label for every button', () => {
    const labels = previewIntervals(newCard(), NOW);
    assert.deepEqual(Object.keys(labels), ['1', '2', '3', '4']);
    Object.values(labels).forEach((label) => assert.match(label, /^(<1m|\d+(\.\d+)?(m|h|d|mo|y))$/));
});

test('intervals format compactly', () => {
    const at = (ms) => new Date(NOW.getTime() + ms);
    assert.equal(formatInterval(at(30_000), NOW), '<1m');
    assert.equal(formatInterval(at(10 * 60_000), NOW), '10m');
    assert.equal(formatInterval(at(3 * 3_600_000), NOW), '3h');
    assert.equal(formatInterval(at(4 * 86_400_000), NOW), '4d');
    assert.equal(formatInterval(at(90 * 86_400_000), NOW), '3mo');
});

test('only keys 1–4 map to ratings', () => {
    assert.equal(ratingFromKey('3'), 3);
    assert.equal(ratingFromKey('5'), null);
    assert.equal(ratingFromKey(' '), null);
});
