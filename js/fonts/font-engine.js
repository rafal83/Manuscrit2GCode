/**
 * FontEngine: abstraction over the raw font data registered in
 * `window.HandwriterFonts`. This is the only module that should know the
 * shape of the raw font-data objects, so that format can evolve later
 * (e.g. a real user-supplied handwriting font) without touching layout,
 * humanization or rendering code.
 *
 * Raw font format (see fonts/handwriting-default/font.js for a full example):
 * window.HandwriterFonts["<font-id>"] = {
 *   meta: {
 *     name, unitsPerEm, xHeight, capHeight, ascender, descender, baseline
 *   },
 *   glyphs: {
 *     "<character>": {
 *       character: "<character>",
 *       variants: [
 *         {
 *           id: "a1",
 *           advance: 52,
 *           anchorIn: {x,y} | null,
 *           anchorOut: {x,y} | null,
 *           contexts: ["isolated","start","middle","end"], // optional, default: all
 *           strokes: [
 *             { segments: [...], width: 1, metadata: {} }
 *           ]
 *         }, ...
 *       ]
 *     }
 *   }
 * };
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const DEFAULT_META = {
        unitsPerEm: 100,
        xHeight: 50,
        capHeight: 68,
        ascender: 70,
        descender: -22,
        baseline: 0
    };

    class FontEngine {
        /**
         * @param {string} fontId key into window.HandwriterFonts
         */
        constructor(fontId) {
            const registry = window.HandwriterFonts || {};
            const raw = registry[fontId];
            if (!raw) {
                throw new Error('Unknown font: ' + fontId + '. Make sure its <script> tag is included.');
            }
            this.fontId = fontId;
            this.raw = raw;
            this.meta = Object.assign({}, DEFAULT_META, raw.meta || {});
            this._missingChars = new Set();
        }

        static listAvailableFonts() {
            return Object.keys(window.HandwriterFonts || {});
        }

        getMeta() {
            return this.meta;
        }

        hasGlyph(character) {
            return !!(this.raw.glyphs && this.raw.glyphs[character]);
        }

        /**
         * Returns the full glyph entry (all variants) for a character, or
         * null if not present in this font.
         */
        getGlyph(character) {
            const g = this.raw.glyphs ? this.raw.glyphs[character] : null;
            if (!g) {
                this._missingChars.add(character);
                return null;
            }
            return g;
        }

        getMissingCharacters() {
            return Array.from(this._missingChars);
        }

        /**
         * Variants of a glyph applicable to a given context ('isolated' |
         * 'start' | 'middle' | 'end'). Falls back to all variants when a
         * variant declares no explicit contexts (meaning "any").
         */
        getVariantsForContext(character, context) {
            const glyph = this.getGlyph(character);
            if (!glyph) return [];
            return glyph.variants.filter(v => !v.contexts || v.contexts.indexOf(context) !== -1);
        }

        getAdvance(character, variantId) {
            const glyph = this.getGlyph(character);
            if (!glyph) return this.meta.xHeight * 0.9;
            const variant = glyph.variants.find(v => v.id === variantId) || glyph.variants[0];
            return variant ? variant.advance : this.meta.xHeight * 0.9;
        }
    }

    NS.FontEngine = FontEngine;
})(window.Handwriter);
