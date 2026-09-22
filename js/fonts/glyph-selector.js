/**
 * GlyphSelector: picks which drawn variant of a character to use for one
 * particular occurrence in the text, given its context (position in word,
 * neighbouring letters) and recent history (to avoid repeating the same
 * variant back-to-back, which is the single biggest tell of a plotted font).
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';


    class GlyphSelector {
        /**
         * @param {Handwriter.FontEngine} fontEngine
         * @param {Handwriter.SeededRandom} rng
         * @param {number} [variationStrength] 0..1, maps to humanization.glyphVariation.
         *   Low = only avoid repeating the immediately-previous variant; high = also
         *   actively avoid anything used recently, for a less predictable rotation.
         */
        constructor(fontEngine, rng, variationStrength) {
            this.font = fontEngine;
            this.rng = rng.child('glyph-selector');
            this.recentPenalty = lerp(0.85, 0.25, clamp01(variationStrength === undefined ? 0.5 : variationStrength));
            /** @type {Map<string, string[]>} per-character recent variant id history */
            this.history = new Map();
        }

        reset() {
            this.history.clear();
        }

        _recordUsage(character, variantId) {
            const list = this.history.get(character) || [];
            list.push(variantId);
            if (list.length > 6) list.shift();
            this.history.set(character, list);
        }

        /**
         * @param {string} character
         * @param {object} ctx { position: 'isolated'|'start'|'middle'|'end', prevChar, nextChar }
         * @returns {object|null} the chosen variant, or null if the font has no glyph for this character
         */
        selectVariant(character, ctx = {}) {
            const position = ctx.position || 'isolated';
            let candidates = this.font.getVariantsForContext(character, position);
            if (candidates.length === 0) {
                // fall back to any variant regardless of declared context
                const glyph = this.font.getGlyph(character);
                if (!glyph || glyph.variants.length === 0) return null;
                candidates = glyph.variants;
            }
            if (candidates.length === 1) {
                this._recordUsage(character, candidates[0].id);
                return candidates[0];
            }

            const recent = this.history.get(character) || [];
            const lastId = recent.length ? recent[recent.length - 1] : null;

            // Hard rule (not a probability): never draw the immediately-previous
            // variant again when another one is available at all.
            const nonRepeating = candidates.filter(v => v.id !== lastId);
            const pool = nonRepeating.length > 0 ? nonRepeating : candidates;

            const weighted = pool.map(variant => {
                let weight = 1;
                if (recent.indexOf(variant.id) !== -1) {
                    weight *= this.recentPenalty;
                }
                return { value: variant, weight };
            });

            const chosen = this.rng.pickWeighted(weighted);
            this._recordUsage(character, chosen.id);
            return chosen;
        }
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    NS.GlyphSelector = GlyphSelector;
})(window.Handwriter);
