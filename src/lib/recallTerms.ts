/**
 * Picks the words that say what a note is *about*, so the Recall panel can find
 * cards from other notes on the same subject — reading MapReduce, the paper
 * mentions "GFS" dozens of times, which is how your GFS cards surface.
 *
 * Deliberately simple and local: word frequency, with acronyms and proper
 * nouns boosted and common English removed. No AI call, instant, free.
 */

const STOPWORDS = new Set(`
a about above after again against all almost along also although always am among an and another any anyone
anything are around as at away back be because been before being below between both but by can cannot could
did do does doing done down during each either else enough etc even ever every example few first for from
further get given gives go goes had has have having he her here hers herself him himself his how however i if
in into is it its itself just keep kept know known large last later least less let like likely made make makes
many may me might more most much must my myself need needs never new next no nor not now number of off often
on once one only onto or other others our ours ourselves out over own part per perhaps put rather really
same second see seen several shall she should show shown since so some something such than that the their
theirs them themselves then there these they thing things third this those though three through thus to
together too two under until up upon us use used uses using very via was way ways we well were what when
where whether which while who whom whose why will with within without would yes yet you your yours yourself
able across actually already based better called case cases certain clear done due easily effect end etc
fact far following found full general good great high however important include including instead kind
level long low main mean means needed often order particular point possible present problem provide
provides quite rather result results right set shows side simple simply small specific still sure take
taken time times total type types typically usually value values whole work works working
section figure table paper papers et al fig ie eg vs abstract introduction conclusion conclusions
references related appendix chapter page pages note notes untitled
read reads write writes run runs stored store stores assign assigns keeps holds contains
`.split(/\s+/).filter(Boolean));

export interface RecallSource {
    title?: string;
    texts: string[];
}

interface TermStats {
    count: number;
    capitalised: number;
    forms: Map<string, number>;
}

const WORD = /[A-Za-z][A-Za-z0-9]*(?:[-'][A-Za-z0-9]+)*/g;
const ACRONYM = /^[A-Z][A-Z0-9]{1,6}s?$/;

function isAcronym(word: string): boolean {
    return ACRONYM.test(word) && /[A-Z].*[A-Z]|[A-Z][0-9]/.test(word);
}

function keyFor(word: string): string {
    // "GFSs" and "chunks" count with "GFS" and "chunk".
    const lower = word.toLowerCase();
    if (isAcronym(word) && word.endsWith('s')) return lower.slice(0, -1);
    if (lower.length > 4 && lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1);
    return lower;
}

function keepable(word: string): boolean {
    if (isAcronym(word)) return true;
    return word.length >= 3 && !STOPWORDS.has(word.toLowerCase());
}

/** The most distinctive terms first, at most `max`. Title words always lead. */
export function extractRecallTerms(source: RecallSource, max = 25): string[] {
    const stats = new Map<string, TermStats>();

    for (const text of source.texts) {
        if (!text) continue;
        for (const match of text.matchAll(WORD)) {
            const word = match[0];
            if (!keepable(word)) continue;
            const key = keyFor(word);
            if (STOPWORDS.has(key)) continue;
            const entry = stats.get(key) || { count: 0, capitalised: 0, forms: new Map() };
            entry.count += 1;
            if (/^[A-Z]/.test(word)) entry.capitalised += 1;
            const form = isAcronym(word) && word.endsWith('s') ? word.slice(0, -1) : word;
            entry.forms.set(form, (entry.forms.get(form) || 0) + 1);
            stats.set(key, entry);
        }
    }

    // Lowercase words show in their folded (singular) form; acronyms and names
    // keep the spelling the note uses most.
    const display = (key: string, entry: TermStats) => {
        const [mostUsed] = [...entry.forms.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
        return mostUsed === mostUsed.toLowerCase() ? key : mostUsed;
    };

    const scored = [...stats.entries()]
        .map(([key, entry]) => {
            const form = display(key, entry);
            let score = entry.count;
            if (isAcronym(form)) score *= 3;
            else if (entry.capitalised / entry.count >= 0.6) score *= 1.5;
            return { key, form, score, count: entry.count };
        })
        // One stray mention is noise unless it is an acronym.
        .filter((term) => term.count >= 2 || isAcronym(term.form))
        .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

    const terms: string[] = [];
    const seen = new Set<string>();
    const add = (form: string) => {
        const key = keyFor(form);
        if (seen.has(key) || terms.length >= max) return;
        seen.add(key);
        terms.push(form);
    };

    for (const match of (source.title || '').matchAll(WORD)) {
        if (keepable(match[0]) && !STOPWORDS.has(keyFor(match[0]))) add(match[0]);
    }
    scored.forEach((term) => add(term.form));
    return terms;
}
