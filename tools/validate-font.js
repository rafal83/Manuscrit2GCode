// Dev-only offline sanity checker for fonts/*/font.js glyph data.
// Not loaded by the app itself (index.html never references this file) -
// it exists purely to catch typos (NaN coordinates, wildly out-of-range
// points, malformed strokes) before opening the app in a browser.
//
// Usage (from the project root, requires a local Node.js - not part of
// the shipped, dependency-free application):
//   node tools/validate-font.js
//   node tools/validate-font.js fonts/my-font/font.js
'use strict';
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

global.window = global.window || {};
global.console = console;

function loadScript(p) {
    const code = fs.readFileSync(p, 'utf8');
    // eslint-disable-next-line no-eval
    (0, eval)(code);
}

loadScript(path.join(projectRoot, 'js/fonts/font-authoring-kit.js'));

const fontFiles = process.argv.slice(2);
if (fontFiles.length === 0) {
    fontFiles.push(path.join(projectRoot, 'fonts/handwriting-default/font.js'));
}
for (const f of fontFiles) {
    loadScript(path.isAbsolute(f) ? f : path.join(projectRoot, f));
}

function sampleSegmentsBasic(segments) {
    const pts = [];
    for (const s of segments) {
        if (s.type === 'M' || s.type === 'L') pts.push({ x: s.x, y: s.y });
        else if (s.type === 'Q') pts.push({ x: s.x1, y: s.y1 }, { x: s.x, y: s.y });
        else if (s.type === 'C') pts.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, { x: s.x, y: s.y });
    }
    return pts;
}

let totalGlyphs = 0;
let totalVariants = 0;
let errors = 0;
let warnings = 0;

const registry = global.window.HandwriterFonts || {};
for (const fontId of Object.keys(registry)) {
    if (fontId === '__addGlyphHelpers') continue;
    const font = registry[fontId];
    const meta = font.meta || {};
    console.log(`\n=== Font: ${fontId} ===`);
    console.log('meta:', meta);

    const glyphs = font.glyphs || {};
    const chars = Object.keys(glyphs);
    console.log(`glyph count: ${chars.length}`);

    for (const ch of chars) {
        totalGlyphs++;
        const glyph = glyphs[ch];
        if (glyph.character !== ch) {
            console.error(`ERROR [${JSON.stringify(ch)}]: character field mismatch: "${glyph.character}"`);
            errors++;
        }
        if (!glyph.variants || glyph.variants.length === 0) {
            console.error(`ERROR [${JSON.stringify(ch)}]: no variants`);
            errors++;
            continue;
        }
        for (const variant of glyph.variants) {
            totalVariants++;
            if (typeof variant.advance !== 'number' || !isFinite(variant.advance) || variant.advance < 0) {
                console.error(`ERROR [${ch}/${variant.id}]: bad advance ${variant.advance}`);
                errors++;
            }
            let allPts = [];
            if (!variant.strokes) variant.strokes = [];
            for (const stroke of variant.strokes) {
                if (!stroke.segments || stroke.segments.length === 0) {
                    console.error(`ERROR [${ch}/${variant.id}]: stroke with no segments`);
                    errors++;
                    continue;
                }
                if (stroke.segments[0].type !== 'M') {
                    console.error(`ERROR [${ch}/${variant.id}]: stroke does not start with M`);
                    errors++;
                }
                const pts = sampleSegmentsBasic(stroke.segments);
                for (const p of pts) {
                    if (!isFinite(p.x) || !isFinite(p.y)) {
                        console.error(`ERROR [${ch}/${variant.id}]: NaN/Infinite coordinate`);
                        errors++;
                    }
                }
                allPts = allPts.concat(pts);
            }
            if (allPts.length > 0) {
                const minX = Math.min(...allPts.map(p => p.x));
                const maxX = Math.max(...allPts.map(p => p.x));
                const minY = Math.min(...allPts.map(p => p.y));
                const maxY = Math.max(...allPts.map(p => p.y));
                const lowY = (meta.descender !== undefined ? meta.descender : -30) - 10;
                const highY = (meta.ascender !== undefined ? meta.ascender : 80) + 10;
                if (minY < lowY || maxY > highY) {
                    console.warn(`WARN  [${ch}/${variant.id}]: Y out of expected range [${lowY},${highY}] -> [${minY.toFixed(1)},${maxY.toFixed(1)}]`);
                    warnings++;
                }
                if (minX < -15 || maxX > variant.advance + 25) {
                    console.warn(`WARN  [${ch}/${variant.id}]: X out of expected range [-15,${(variant.advance + 25).toFixed(1)}] -> [${minX.toFixed(1)},${maxX.toFixed(1)}]`);
                    warnings++;
                }
            } else if (ch !== ' ') {
                console.warn(`WARN  [${ch}/${variant.id}]: glyph has zero drawable points (ok only for space)`);
                warnings++;
            }
        }
    }
}

console.log(`\nTotal glyphs: ${totalGlyphs}, total variants: ${totalVariants}`);
console.log(`Errors: ${errors}, Warnings: ${warnings}`);
process.exit(errors > 0 ? 1 : 0);
