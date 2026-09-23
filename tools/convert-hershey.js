/**
 * Dev-only, one-time conversion script (NOT loaded by the app itself):
 * reads the Hershey Script SVG fonts in tools/hershey-source/ and
 * generates fonts/handwriting-default/font.js from their proven,
 * decades-old pen-plotter letterforms, instead of hand-guessed geometry.
 *
 * Usage: node tools/convert-hershey.js
 * (then: node tools/validate-font.js to sanity-check the result)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const SRC_DIR = path.join(__dirname, 'hershey-source');

// Hershey Script's own metrics (measured empirically across many glyphs -
// see the analysis in the conversation this script was written from):
// baseline = 0, x-height top = 284, ascender top = 662, descender bottom = -378.
const HERSHEY_XHEIGHT = 284;
const HERSHEY_ASCENDER = 662;
const HERSHEY_DESCENDER = -378;

// Our target metrics: x-height is the anchor (fontSize / xHeight = mm-per-unit
// at layout time), everything else derived by applying the SAME scale factor
// Hershey's own proportions - so we inherit its (quite elegant, elongated)
// script-font proportions faithfully rather than squeezing them.
const MY_XHEIGHT = 50;
const SCALE = MY_XHEIGHT / HERSHEY_XHEIGHT;
const MY_ASCENDER = round2(HERSHEY_ASCENDER * SCALE);
const MY_DESCENDER = round2(HERSHEY_DESCENDER * SCALE);

function round2(n) { return Math.round(n * 100) / 100; }

function decodeEntities(s) {
    return s
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function attr(tag, name) {
    const m = tag.match(new RegExp(name + '="([^"]*)"'));
    return m ? m[1] : null;
}

/**
 * Parses one Hershey SVG font file into { char: { advance, subpaths } }.
 * subpaths is an array of SEGMENT-OBJECT arrays, e.g.
 *   [{type:'M',x,y}, {type:'L',x,y}, {type:'C',x1,y1,x2,y2,x,y}, ...]
 * A glyph's `d` attribute is a sequence of M/L/C commands (mostly straight
 * polylines, with occasional cubic curves for small marks like a cedilla);
 * each 'M' starts a new pen-lifted subpath, matching our own
 * multi-stroke-per-glyph model. Segment objects are carried through
 * unflattened so curves stay smooth in the output instead of being
 * linearized.
 */
function parseHersheyFont(filePath) {
    const svg = fs.readFileSync(filePath, 'utf8');
    const tags = svg.match(/<glyph\b[^>]*\/>/g) || [];
    const glyphs = {};
    for (const tag of tags) {
        const uni = attr(tag, 'unicode');
        if (uni === null) continue;
        const ch = decodeEntities(uni);
        const advance = parseFloat(attr(tag, 'horiz-adv-x') || '0');
        const d = attr(tag, 'd') || '';

        const subpaths = [];
        const commands = d.match(/[MLC][^MLC]*/g) || [];
        let current = null;
        for (const cmd of commands) {
            const nums = (cmd.slice(1).match(/-?[0-9.]+/g) || []).map(Number);
            if (cmd[0] === 'M') {
                current = [{ type: 'M', x: nums[0], y: nums[1] }];
                subpaths.push(current);
            } else if (cmd[0] === 'L' && current) {
                current.push({ type: 'L', x: nums[0], y: nums[1] });
            } else if (cmd[0] === 'C' && current) {
                current.push({ type: 'C', x1: nums[0], y1: nums[1], x2: nums[2], y2: nums[3], x: nums[4], y: nums[5] });
            }
        }
        glyphs[ch] = { advance, subpaths };
    }
    return glyphs;
}

const COORD_FIELDS = ['x', 'y', 'x1', 'y1', 'x2', 'y2'];

function scaleSegment(seg) {
    const out = { type: seg.type };
    for (const f of COORD_FIELDS) if (seg[f] !== undefined) out[f] = round2(seg[f] * SCALE);
    return out;
}

function segEndPoint(seg) {
    return { x: seg.x, y: seg.y };
}

/**
 * Rotate + non-uniform scale + shear a copy of subpaths, for a genuinely
 * distinct derived variant. Shear (independent of rotation) keeps roughly-
 * horizontal strokes horizontal while slanting verticals, which reads as a
 * meaningfully different "hand" rather than just the same shape tilted.
 */
function deriveVariant(subpaths, opts) {
    const rotateDeg = opts.rotateDeg || 0;
    const scaleX = opts.scaleX !== undefined ? opts.scaleX : 1;
    const scaleY = opts.scaleY !== undefined ? opts.scaleY : 1;
    const shearDeg = opts.shearDeg || 0;
    const rad = (rotateDeg * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const shear = Math.tan((shearDeg * Math.PI) / 180);
    function xf(x, y) {
        let sx = x * scaleX;
        const sy = y * scaleY;
        sx += sy * shear;
        return { x: round2(sx * cos - sy * sin), y: round2(sx * sin + sy * cos) };
    }
    return subpaths.map(sp => sp.map(seg => {
        const out = { type: seg.type };
        const p = xf(seg.x, seg.y);
        out.x = p.x; out.y = p.y;
        if (seg.type === 'C') {
            const c1 = xf(seg.x1, seg.y1);
            const c2 = xf(seg.x2, seg.y2);
            out.x1 = c1.x; out.y1 = c1.y;
            out.x2 = c2.x; out.y2 = c2.y;
        }
        return out;
    }));
}

function polylineLength(sp) {
    let len = 0;
    for (let i = 1; i < sp.length; i++) {
        const dx = sp[i].x - sp[i - 1].x, dy = sp[i].y - sp[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
}

/**
 * Some Hershey Script capitals (mostly in the "Med" weight) fake a
 * calligraphic thick/thin pen stroke on a monoline font by literally
 * duplicating part of a stroke as a second, near-parallel subpath a few
 * units away (e.g. capital V in HersheyScriptMed: its second subpath
 * shadows the first for its whole length, then diverges to become the
 * rest of the letter). On a real thin plotter pen that doesn't read as
 * calligraphy - it just looks like a stray double line. This detects two
 * kinds of duplication and removes exactly the redundant part, leaving
 * genuinely different short marks (a 't' crossbar, an 'i' dot, an accent)
 * untouched:
 *   1. whole-path duplicate (both subpaths are the same shape/length) -> drop the shorter
 *   2. partial/prefix duplicate (one subpath shadows the START of a much
 *      longer one, then the longer one continues on to draw something
 *      else) -> trim just the shadowed portion off the longer subpath
 */
function dedupeShadeStrokes(subpaths) {
    if (subpaths.length < 2) return subpaths;
    let working = subpaths.map(sp => sp.slice());

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function avgNearestDist(a, b) {
        const SAMPLES = 8;
        function sample(sp) {
            if (sp.length <= SAMPLES) return sp.map(segEndPoint);
            const out = [];
            for (let i = 0; i < SAMPLES; i++) out.push(segEndPoint(sp[Math.round(i * (sp.length - 1) / (SAMPLES - 1))]));
            return out;
        }
        const ptsA = sample(a), ptsB = sample(b);
        let total = 0;
        for (const pb of ptsB) {
            let best = Infinity;
            for (const pa of ptsA) best = Math.min(best, dist(pa, pb));
            total += best;
        }
        return total / ptsB.length;
    }

    // --- pass 1: whole-path near-duplicates ---
    let keep = working.map(() => true);
    const lengths = working.map(polylineLength);
    for (let i = 0; i < working.length; i++) {
        if (!keep[i]) continue;
        for (let j = i + 1; j < working.length; j++) {
            if (!keep[j]) continue;
            const shortLen = Math.min(lengths[i], lengths[j]);
            const longLen = Math.max(lengths[i], lengths[j]);
            if (shortLen < longLen * 0.55) continue;
            if (avgNearestDist(working[i], working[j]) < shortLen * 0.18) {
                if (lengths[j] <= lengths[i]) keep[j] = false; else keep[i] = false;
            }
        }
    }
    working = working.filter((_, idx) => keep[idx]);

    // --- pass 2: partial/prefix duplicates (shadow-then-diverge) ---
    for (let i = 0; i < working.length; i++) {
        for (let j = 0; j < working.length; j++) {
            if (i === j || !working[i] || !working[j]) continue;
            const A = working[i], B = working[j];
            if (A.length < 2 || B.length < 2) continue;
            const lenA = polylineLength(A), lenB = polylineLength(B);
            if (lenA >= lenB) continue; // only ever trim the longer path (B) around the shorter one (A)

            const endpoints = {
                AS: segEndPoint(A[0]), AE: segEndPoint(A[A.length - 1]),
                BS: segEndPoint(B[0]), BE: segEndPoint(B[B.length - 1])
            };
            let best = null;
            for (const [ka, kb] of [['AS', 'BS'], ['AS', 'BE'], ['AE', 'BS'], ['AE', 'BE']]) {
                const d = dist(endpoints[ka], endpoints[kb]);
                if (!best || d < best.d) best = { d, ka, kb };
            }
            const junctionThreshold = Math.max(6, lenA * 0.08);
            if (best.d > junctionThreshold) continue; // subpaths don't even share a nearby endpoint

            const orderedA = (best.ka === 'AE' ? A.slice().reverse() : A).map(segEndPoint);
            const bFromEnd = best.kb === 'BE';
            const orderedB = (bFromEnd ? B.slice().reverse() : B);
            const orderedBPts = orderedB.map(segEndPoint);

            const matchThreshold = Math.max(6, lenA * 0.15);
            let matched = 0;
            const steps = Math.min(orderedA.length, orderedBPts.length);
            for (let k = 0; k < steps; k++) {
                if (dist(orderedA[k], orderedBPts[k]) <= matchThreshold) matched = k + 1;
                else break;
            }
            if (matched < 3 || matched < orderedA.length * 0.5) continue; // not a real shadow overlap

            // Trim the matched prefix off B (in its walked order), keep the rest as a fresh subpath starting with 'M'.
            const remaining = orderedB.slice(matched);
            if (remaining.length < 2) continue;
            const trimmedB = bFromEnd ? remaining.reverse() : remaining;
            trimmedB[0] = Object.assign({}, trimmedB[0], { type: 'M' });
            working[j] = trimmedB;
        }
    }

    return working.filter(sp => sp && sp.length >= 2);
}

function subpathBBoxDiagonal(sp) {
    const xs = [], ys = [];
    for (const seg of sp) {
        xs.push(seg.x); ys.push(seg.y);
        if (seg.type === 'C') { xs.push(seg.x1, seg.x2); ys.push(seg.y1, seg.y2); }
    }
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    return Math.sqrt(w * w + h * h);
}

function subpathsToStrokes(subpaths) {
    return subpaths
        .filter(sp => sp.length >= 2)
        .map(sp => ({
            segments: sp,
            width: subpathBBoxDiagonal(sp) < 3.5 ? 1.3 : 1
        }));
}

/**
 * Anchor eligibility window. Measured empirically across Script1's actual
 * lowercase letters: its cursive join convention sits at roughly MID
 * x-height (y ~ 28-33 out of xHeight=50 - e.g. n/m/u/l/r/s/h/k/v/y/z/b/f/p
 * all start AND end almost exactly at y=27.82), not near the baseline as
 * originally assumed here. A tight [-5,15] baseline-only window rejected
 * nearly every legitimate join point (only 1 of 26 lowercase letters had
 * both anchors), which is why the generated G-code was lifting the pen
 * far more than real connected cursive would. [8,38] comfortably covers
 * that mid-height convention while still excluding genuine outliers (a
 * dot at y=77, an ascender top at y=72, a bowl top at y=50).
 */
function anchorFor(point) {
    if (!point) return null;
    return (point.y >= 8 && point.y <= 38) ? { x: point.x, y: point.y } : null;
}

function buildVariant(id, advance, subpaths, opts) {
    opts = opts || {};
    const strokes = subpathsToStrokes(subpaths);
    const first = subpaths.find(sp => sp.length >= 2);
    const last = [...subpaths].reverse().find(sp => sp.length >= 2);
    const anchorIn = opts.forceNoAnchors ? null : anchorFor(first && segEndPoint(first[0]));
    const anchorOut = opts.forceNoAnchors ? null : anchorFor(last && segEndPoint(last[last.length - 1]));
    return { id, advance: round2(advance), strokes, anchorIn, anchorOut };
}

// -----------------------------------------------------------------------

const script1 = parseHersheyFont(path.join(SRC_DIR, 'HersheyScript1.svg'));

function scaled(font, ch) {
    const g = font[ch];
    if (!g) return null;
    // Defensive safety net, not expected to trigger on Script1 (see note
    // above addChar) - cheap insurance in case a future source font does
    // use the shading trick.
    const cleaned = dedupeShadeStrokes(g.subpaths);
    return {
        advance: g.advance * SCALE,
        subpaths: cleaned.map(sp => sp.map(scaleSegment))
    };
}

// The letters the spec calls out as needing rich variety (most frequent in
// French/English text) get a 5th variant; every character still gets at
// least 4 (up from 2) so the anti-repetition rule (which only forbids an
// IMMEDIATE repeat) has real room to work with before any word is long
// enough to force a shape to reappear.
const NEEDS_5 = 'aeilnorstu'.split('');
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DIGITS = '0123456789'.split('');
const ACCENTED = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'ù', 'û', 'ô', 'î', 'ï'];
const PUNCT = ['.', ',', ';', ':', '!', '?', "'", '"', '-', '(', ')'];

const glyphEntries = []; // { char, variants: [...] }

// Each recipe rotates + non-uniformly scales + shears a copy of the clean
// Script1 geometry. Shear (independent of rotation) keeps near-horizontal
// strokes horizontal while slanting verticals, so these read as genuinely
// different "hands" rather than the same shape tilted by different amounts.
// Kept within a range that stayed legible in visual testing (rotate <= 6,
// scale within 0.90-1.08, shear <= 3.5).
const DERIVE_RECIPES = [
    { id: 'd1', rotateDeg: 2.5, scaleX: 0.95, scaleY: 1.0, shearDeg: 0, advanceMul: 0.98 },
    { id: 'd2', rotateDeg: -3.5, scaleX: 1.06, scaleY: 0.97, shearDeg: -2.5, advanceMul: 1.03 },
    { id: 'd3', rotateDeg: 5, scaleX: 0.9, scaleY: 1.04, shearDeg: 3, advanceMul: 0.95 },
    { id: 'd4', rotateDeg: -6, scaleX: 1.08, scaleY: 0.93, shearDeg: -3.5, advanceMul: 1.05 }
];

// NOTE: HersheyScriptMed is intentionally NOT used as a raw data source.
// It simulates its bolder "medium" weight on several capitals by literally
// duplicating part of a stroke as a second, near-parallel subpath a few
// units away (e.g. capital V) - a classic trick to fake a calligraphic
// thick/thin line on a monoline font. On a real thin plotter pen that
// doesn't read as calligraphy, it reads as a stray double line. Script1's
// multi-subpath letters were checked by hand (B, W, H, ...) and are all
// legitimate distinct structural strokes (separate bowls, zigzag legs, a
// crossbar) - so instead of trying to detect/repair ScriptMed's shading,
// every variant beyond the first is derived procedurally from Script1's
// clean geometry.
function addChar(ch, forceNoAnchors) {
    const s1 = scaled(script1, ch);
    if (!s1) {
        console.warn('MISSING in Hershey Script1:', JSON.stringify(ch));
        return;
    }
    const variants = [];
    variants.push(buildVariant('h1', s1.advance, s1.subpaths, { forceNoAnchors }));

    const count = NEEDS_5.includes(ch) ? 4 : 3; // + h1 = 5 or 4 total
    for (let i = 0; i < count; i++) {
        const recipe = DERIVE_RECIPES[i];
        const derived = deriveVariant(s1.subpaths, recipe);
        variants.push(buildVariant(recipe.id, s1.advance * recipe.advanceMul, derived, { forceNoAnchors }));
    }
    glyphEntries.push({ char: ch, variants });
}

addChar(' ', true);
for (const ch of PUNCT) addChar(ch, true);
for (const ch of 'abcdefghijklmnopqrstuvwxyz'.split('')) addChar(ch, false);
for (const ch of UPPERCASE) addChar(ch, true);
for (const ch of DIGITS) addChar(ch, true);
for (const ch of ACCENTED) addChar(ch, false);

// space has no strokes regardless of what Hershey defines (its 'd' is empty anyway)
const spaceEntry = glyphEntries.find(g => g.char === ' ');
if (spaceEntry) spaceEntry.variants.forEach(v => { v.strokes = []; });

// -----------------------------------------------------------------------
// Emit fonts/handwriting-default/font.js
// -----------------------------------------------------------------------

function jsNum(n) {
    return Number.isInteger(n) ? String(n) : String(round2(n));
}

function emitSegments(segments) {
    return '[' + segments.map(s => {
        if (s.type === 'C') {
            return `{ type: 'C', x1: ${jsNum(s.x1)}, y1: ${jsNum(s.y1)}, x2: ${jsNum(s.x2)}, y2: ${jsNum(s.y2)}, x: ${jsNum(s.x)}, y: ${jsNum(s.y)} }`;
        }
        return `{ type: '${s.type}', x: ${jsNum(s.x)}, y: ${jsNum(s.y)} }`;
    }).join(', ') + ']';
}

function emitStroke(stroke) {
    return `S(${emitSegments(stroke.segments)}${stroke.width !== 1 ? ', ' + stroke.width : ''})`;
}

function emitAnchor(a) {
    return a ? `{ x: ${jsNum(a.x)}, y: ${jsNum(a.y)} }` : 'null';
}

function emitVariant(v) {
    const strokesStr = v.strokes.length
        ? '[\n                ' + v.strokes.map(emitStroke).join(',\n                ') + '\n            ]'
        : '[]';
    return `        V('${v.id}', ${jsNum(v.advance)},\n            ${strokesStr},\n            { anchorIn: ${emitAnchor(v.anchorIn)}, anchorOut: ${emitAnchor(v.anchorOut)} }\n        )`;
}

function charLiteral(ch) {
    if (ch === "'") return "\"'\"";
    if (ch === '\\') return "'\\\\'";
    return "'" + ch.replace(/'/g, "\\'") + "'";
}

const lines = [];
lines.push('/**');
lines.push(' * Default demo handwriting font ("handwriting-default").');
lines.push(' *');
lines.push(' * GENERATED by tools/convert-hershey.js from the Hershey Script fonts');
lines.push(' * (public-domain pen-plotter letterforms via techninja/hersheytextjs, MIT -');
lines.push(' * see tools/hershey-source/LICENSE-NOTICE.md). Do not hand-edit the bulk of');
lines.push(' * this file - regenerate it instead, and adjust the converter if a shape');
lines.push(' * needs to change. Small hand-authored touch-ups are fine if clearly');
lines.push(' * commented as such.');
lines.push(' *');
lines.push(' * Design space (glyph units, NOT millimeters - scaled at layout time):');
lines.push(' *   Y-up, baseline = 0');
lines.push(` *   xHeight = ${MY_XHEIGHT} (top of a,c,e,m,n,o,r,s,u,v,w,x,z)`);
lines.push(` *   ascender = ${MY_ASCENDER} (top of b,d,f,h,k,l,t and uppercase)`);
lines.push(` *   capHeight = ${MY_ASCENDER} (same as ascender in this script font)`);
lines.push(` *   descender = ${MY_DESCENDER} (bottom of g,j,p,q,y)`);
lines.push(' *');
lines.push(' * anchorIn / anchorOut mark where a cursive connector stroke may join this');
lines.push(' * glyph to its neighbours; null means "don\'t try to join here" (natural pen');
lines.push(' * lift) - only assigned when the glyph\'s actual first/last point sits near');
lines.push(' * the baseline (y in [-5,15]), otherwise a connector would swoop across the');
lines.push(' * letter body instead of reading as a natural join.');
lines.push(' */');
lines.push('(function () {');
lines.push("    'use strict';");
lines.push('');
lines.push('    function S(segments, width, metadata) {');
lines.push("        return { segments: segments, width: width || 1, metadata: metadata || {} };");
lines.push('    }');
lines.push('');
lines.push('    function V(id, advance, strokes, opts) {');
lines.push('        opts = opts || {};');
lines.push('        return {');
lines.push('            id: id,');
lines.push('            advance: advance,');
lines.push('            anchorIn: opts.anchorIn || null,');
lines.push('            anchorOut: opts.anchorOut || null,');
lines.push('            contexts: opts.contexts || null,');
lines.push('            strokes: strokes');
lines.push('        };');
lines.push('    }');
lines.push('');
lines.push('    var glyphs = {};');
lines.push('');
lines.push('    function addGlyph(character, variants) {');
lines.push('        glyphs[character] = { character: character, variants: variants };');
lines.push('    }');
lines.push('');

for (const entry of glyphEntries) {
    lines.push(`    addGlyph(${charLiteral(entry.char)}, [`);
    lines.push(entry.variants.map(emitVariant).join(',\n'));
    lines.push('    ]);');
    lines.push('');
}

lines.push('    window.HandwriterFonts = window.HandwriterFonts || {};');
lines.push("    window.HandwriterFonts['handwriting-default'] = {");
lines.push('        meta: {');
lines.push("            name: 'Handwriting Default (Hershey Script)',");
lines.push('            unitsPerEm: 100,');
lines.push(`            xHeight: ${jsNum(MY_XHEIGHT)},`);
lines.push(`            capHeight: ${jsNum(MY_ASCENDER)},`);
lines.push(`            ascender: ${jsNum(MY_ASCENDER)},`);
lines.push(`            descender: ${jsNum(MY_DESCENDER)},`);
lines.push('            baseline: 0');
lines.push('        },');
lines.push('        glyphs: glyphs');
lines.push('    };');
lines.push('})();');
lines.push('');

const outPath = path.join(projectRoot, 'fonts/handwriting-default/font.js');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', outPath);
console.log('Characters:', glyphEntries.length, ' Total variants:', glyphEntries.reduce((n, e) => n + e.variants.length, 0));
console.log('Metrics: xHeight=' + MY_XHEIGHT + ' ascender=' + MY_ASCENDER + ' descender=' + MY_DESCENDER);
