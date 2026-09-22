/**
 * TextLayoutEngine: turns raw text into a positioned Document tree
 * (Document -> Page -> Line -> Word -> Glyph), in paper-local millimeters,
 * BEFORE any humanization. Humanizer runs next and perturbs this tree;
 * StrokeProcessor turns the result into drawable point lists.
 *
 * Coordinate convention used everywhere in this pipeline (layout, humanizer,
 * stroke-processor, plotter operations): Y-UP millimeters, origin at the
 * bottom-left of the PAPER. Lines are laid out top-down, so line N+1 has a
 * lower baseline Y than line N. The paper's own placement on the machine
 * bed (offset + rotation) is applied later, only at the plotter-operations
 * stage - layout and humanization never need to know about the machine.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    // Small static kerning table: pairs of characters that visually need a
    // touch less space than the sum of their advances. Values are a
    // fraction of the advance to remove (0.04 = 4% tighter). Deliberately
    // small and conservative - this is a base/deterministic nudge, further
    // (randomized) spacing variation is layered on by the Humanizer.
    const KERNING_PAIRS = {
        'ro': 0.05, 'ra': 0.04, 'va': 0.05, 'vo': 0.04, 'we': 0.03,
        'ou': 0.03, 'ol': 0.03, 'll': 0.03, 'to': 0.05, 'ta': 0.03,
        'or': 0.03, 'on': 0.02, 'ar': 0.02, 'er': 0.02
    };

    function kerningFactor(prevChar, nextChar) {
        if (!prevChar || !nextChar) return 0;
        const key = (prevChar + nextChar).toLowerCase();
        return KERNING_PAIRS[key] || 0;
    }

    function charContext(indexInWord, wordLength) {
        if (wordLength <= 1) return 'isolated';
        if (indexInWord === 0) return 'start';
        if (indexInWord === wordLength - 1) return 'end';
        return 'middle';
    }

    class TextLayoutEngine {
        /**
         * @param {Handwriter.FontEngine} fontEngine
         * @param {Handwriter.GlyphSelector} glyphSelector
         */
        constructor(fontEngine, glyphSelector) {
            this.font = fontEngine;
            this.selector = glyphSelector;
        }

        /**
         * @param {string} text raw user text, lines separated by \n
         * @param {object} config see README / ui/presets.js for full shape.
         *   Required fields used here: config.paper {width,height},
         *   config.margins {top,right,bottom,left}, config.fontSize (mm),
         *   config.lineHeight (mm), config.letterSpacing (mm, additive),
         *   config.wordSpacing (mm, additive base gap).
         * @returns {object} Document
         */
        layout(text, config) {
            this.selector.reset();

            const meta = this.font.getMeta();
            const scale = config.fontSize / meta.xHeight;

            const writableWidth = config.paper.width - config.margins.left - config.margins.right;
            const writableHeight = config.paper.height - config.margins.top - config.margins.bottom;
            const ascenderAllowanceMm = meta.ascender * scale * 0.15; // small breathing room under the top margin

            const rawLines = String(text || '').replace(/\r\n/g, '\n').split('\n');

            const pages = [];
            let currentPage = this._newPage(config);
            pages.push(currentPage);

            let baselineY = config.paper.height - config.margins.top - ascenderAllowanceMm;
            let lineIndex = 0;

            for (const rawLine of rawLines) {
                const wrapped = this._wrapLine(rawLine, config, scale, writableWidth);
                for (const lineWords of wrapped) {
                    if (baselineY < config.margins.bottom) {
                        currentPage = this._newPage(config);
                        pages.push(currentPage);
                        baselineY = config.paper.height - config.margins.top - ascenderAllowanceMm;
                    }

                    const line = {
                        index: lineIndex++,
                        baselineY: baselineY,
                        words: lineWords
                    };
                    currentPage.lines.push(line);
                    baselineY -= config.lineHeight;
                }
            }

            return {
                meta: { seed: config.seed, fontId: this.font.fontId },
                // em-units -> millimeters factor (fontSize / font's x-height);
                // Humanizer must fold this into every glyph's transform.scale,
                // since glyph strokes are authored in 100-unit em space.
                unitScale: scale,
                pages: pages,
                writableWidth: writableWidth,
                writableHeight: writableHeight
            };
        }

        _newPage(config) {
            return {
                width: config.paper.width,
                height: config.paper.height,
                margins: config.margins,
                lines: []
            };
        }

        /**
         * Word-wraps a single explicit text line into one or more visual
         * lines, each an array of Word objects with glyphs positioned along
         * X (baselineY is assigned by the caller once it knows which visual
         * line this becomes).
         */
        _wrapLine(rawLine, config, scale, writableWidth) {
            const tokens = rawLine.length ? rawLine.split(/ +/) : [''];
            const visualLines = [];
            let currentWords = [];
            let currentX = 0;

            for (let wi = 0; wi < tokens.length; wi++) {
                const token = tokens[wi];
                const word = this._layoutWord(token, config, scale);
                const wordWidth = word.width;
                const spaceNeeded = currentWords.length > 0 ? config.wordSpacing : 0;

                if (currentWords.length > 0 && currentX + spaceNeeded + wordWidth > writableWidth) {
                    visualLines.push(currentWords);
                    currentWords = [];
                    currentX = 0;
                }

                const startX = currentX + (currentWords.length > 0 ? config.wordSpacing : 0);
                this._offsetWord(word, startX);
                currentWords.push(word);
                currentX = startX + wordWidth;
            }

            if (currentWords.length === 0) currentWords = [];
            visualLines.push(currentWords);
            return visualLines;
        }

        _offsetWord(word, startX) {
            word.startX = startX;
            for (const glyph of word.glyphs) {
                glyph.x += startX;
            }
        }

        /**
         * Lays out one word's glyphs starting at local X = 0. Returns
         * {text, glyphs, width}. Positions are later shifted by _offsetWord.
         */
        _layoutWord(text, config, scale) {
            const characters = Array.from(text);
            const glyphs = [];
            let x = 0;

            for (let i = 0; i < characters.length; i++) {
                const ch = characters[i];
                const position = charContext(i, characters.length);
                const prevChar = i > 0 ? characters[i - 1] : null;
                const nextChar = i < characters.length - 1 ? characters[i + 1] : null;

                const variant = this.selector.selectVariant(ch, { position, prevChar, nextChar });

                if (!variant) {
                    // Unknown character: still reserve horizontal space so
                    // layout stays stable, but draw nothing for it.
                    const fallbackAdvance = config.fontSize * 0.9;
                    const fallbackGap = fallbackAdvance + config.letterSpacing;
                    glyphs.push({
                        character: ch, variant: null, x: x, index: i,
                        gapAfterMm: fallbackGap,
                        context: { position, prevChar, nextChar }
                    });
                    x += fallbackGap;
                    continue;
                }

                let advanceMm = variant.advance * scale;
                const kern = kerningFactor(ch, nextChar);
                advanceMm *= (1 - kern);
                const gapAfterMm = advanceMm + config.letterSpacing;

                glyphs.push({
                    character: ch,
                    variant: variant,
                    x: x,
                    index: i,
                    gapAfterMm: gapAfterMm,
                    context: { position, prevChar, nextChar }
                });

                x += gapAfterMm;
            }

            // trailing letterSpacing over-counts by one; word width should
            // end at the last glyph's visual extent, not one spacing further
            const width = characters.length > 0 ? x - config.letterSpacing : 0;

            return { text: text, glyphs: glyphs, width: Math.max(0, width) };
        }
    }

    NS.TextLayoutEngine = TextLayoutEngine;
})(window.Handwriter);
