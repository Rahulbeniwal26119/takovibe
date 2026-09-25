import assert from 'node:assert/strict';
import test from 'node:test';

import { extractRecallTerms } from './recallTerms.ts';

const MAPREDUCE = `
MapReduce is a programming model. The input files are stored in GFS, and the
master assigns map tasks to workers. Each map task reads a split from GFS.
Intermediate data is partitioned and the reduce workers read it remotely.
The master pings every worker; GFS keeps three replicas of each chunk, so the
master schedules map tasks near the chunks they read.
`;

test('acronyms and repeated topic words lead the list', () => {
    const terms = extractRecallTerms({ texts: [MAPREDUCE] }, 8);
    assert.equal(terms[0], 'GFS');
    for (const expected of ['master', 'map']) assert.ok(terms.includes(expected), `${expected} in ${terms}`);
    assert.ok(terms.includes('chunk'), `plural "chunks" folds into "chunk": ${terms}`);
    assert.ok(terms.includes('task') && !terms.includes('tasks'), `plurals display singular: ${terms}`);
});

test('common English and one-off words are left out', () => {
    const terms = extractRecallTerms({ texts: [MAPREDUCE] });
    for (const noise of ['the', 'and', 'each', 'every', 'programming', 'model']) {
        assert.ok(!terms.includes(noise), `${noise} should be filtered: ${terms}`);
    }
});

test('title words always come first', () => {
    const terms = extractRecallTerms({ title: 'MapReduce notes', texts: [MAPREDUCE] }, 5);
    assert.equal(terms[0], 'MapReduce');
    assert.ok(!terms.includes('notes'));
});

test('a single mention of an acronym still counts', () => {
    const terms = extractRecallTerms({ texts: ['Consensus uses RPC between replicas and replicas vote.'] });
    assert.ok(terms.includes('RPC'));
    assert.ok(terms.includes('replica'));
});

test('respects the maximum and never repeats a term', () => {
    const terms = extractRecallTerms({ title: 'GFS GFS', texts: [MAPREDUCE, MAPREDUCE] }, 3);
    assert.equal(terms.length, 3);
    assert.equal(new Set(terms.map((term) => term.toLowerCase())).size, 3);
});

test('empty input gives no terms', () => {
    assert.deepEqual(extractRecallTerms({ texts: [] }), []);
    assert.deepEqual(extractRecallTerms({ title: '', texts: ['', 'the and of'] }), []);
});
