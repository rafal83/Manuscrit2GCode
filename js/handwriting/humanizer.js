/**
 * HandwritingHumanizer: breaks mechanical perfection WITHOUT independent
 * per-point noise. Variation is generated hierarchically (document -> line
 * -> word -> glyph -> stroke) using smooth, correlated drift signals
 * (Handwriter.Noise.BoundedDrift), so nearby letters share a "mood" instead
 * of jittering independently. This module decides WHAT should vary and by
 * how much; the actual point-level math (curve sampling, jitter
 * application, speed/Z assignment) happens in StrokeProcessor.
 *
 * Input: a layout Document (see text-layout-engine.js) whose glyphs already
 * have {x, gapAfterMm, variant, context}. This function enriches each
 * glyph in place with a final `transform` and a handful of per-glyph
 * humanization decisions, and re-flows X positions (letter/word spacing
 * variation changes them from the raw layout).
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const Geometry = NS.Geometry;
    const BoundedDrift = NS.Noise.BoundedDrift;

    class HandwritingHumanizer {
        /**
         * @param {Handwriter.SeededRandom} rng dedicated child stream (e.g. masterRng.child('humanizer'))
         */
        constructor(rng) {
            this.rng = rng;
        }

        /**
         * @param {object} document from TextLayoutEngine.layout()
         * @param {object} config full app config (see ui/presets.js for shape)
         * @returns {object} the same document, enriched
         */
        humanize(document, config) {
            const h = config.humanization;
            const rng = this.rng;

            // --- Document-level personality: one persistent, seed-derived bias ---
            const personality = {
                slantDeg: rng.child('doc-slant').gaussian() * 3 * clamp01(h.slantDrift),
                sizeMultiplier: 1 + rng.child('doc-size').gaussian() * 0.05 * clamp01(h.sizeVariation),
                spacingMultiplier: 1 + rng.child('doc-spacing').gaussian() * 0.06 * clamp01(h.letterSpacingVariation)
            };

            // --- Slow drift signals, sampled by a running "word position" counter ---
            const baselineDrift = new BoundedDrift(rng.child('baseline-drift'), { amplitude: 0.5 * clamp01(h.baselineDrift), smoothing: 0.9 });
            const slantDrift = new BoundedDrift(rng.child('slant-drift'), { amplitude: 2.0 * clamp01(h.slantDrift), smoothing: 0.92 });
            const sizeDrift = new BoundedDrift(rng.child('size-drift'), { amplitude: 0.06 * clamp01(h.sizeVariation), smoothing: 0.88 });
            const spacingDrift = new BoundedDrift(rng.child('spacing-drift'), { amplitude: 0.08 * clamp01(h.letterSpacingVariation), smoothing: 0.85 });
            const speedDrift = new BoundedDrift(rng.child('speed-drift'), { amplitude: 0.15 * clamp01(h.speedVariation), smoothing: 0.8 });

            let globalWordCounter = 0;

            for (let pi = 0; pi < document.pages.length; pi++) {
                const page = document.pages[pi];
                for (let li = 0; li < page.lines.length; li++) {
                    const line = page.lines[li];
                    this._humanizeLine(line, li, config, personality, {
                        baselineDrift, slantDrift, sizeDrift, spacingDrift, speedDrift
                    }, () => globalWordCounter++, document.unitScale);
                }
            }

            return document;
        }

        _humanizeLine(line, lineIndex, config, personality, drifts, nextWordT, unitScale) {
            const h = config.humanization;
            const rng = this.rng;
            const lineRng = rng.child('line-' + lineIndex);

            // Each line gets its own tiny persistent slope + vertical offset,
            // and a subtly different average baseline height.
            const lineSlopeDeg = lineRng.gaussian() * 0.1 * clamp01(h.slantDrift);
            const lineBaselineBias = lineRng.gaussian() * 0.3 * clamp01(h.baselineDrift);

            let runningX = config.margins.left;

            for (let wi = 0; wi < line.words.length; wi++) {
                const word = line.words[wi];
                const t = nextWordT();
                const wordRng = rng.child('word-' + lineIndex + '-' + wi);

                if (wi > 0) {
                    const wordGapVariation = 1 + wordRng.gaussian() * 0.12 * clamp01(h.wordSpacingVariation)
                        + drifts.spacingDrift.at(t) * 2;
                    runningX += config.wordSpacing * personality.spacingMultiplier * Math.max(0.4, wordGapVariation);
                }

                const wordScale = personality.sizeMultiplier
                    * (1 + drifts.sizeDrift.at(t))
                    * (1 + wordRng.gaussian() * 0.03 * clamp01(h.sizeVariation));
                const wordSpeedBias = 1 + drifts.speedDrift.at(t) + wordRng.gaussian() * 0.06 * clamp01(h.speedVariation);
                const wordSlantBias = drifts.slantDrift.at(t) + wordRng.gaussian() * 0.4 * clamp01(h.slantDrift);

                word.startX = runningX;
                const wordStartX = runningX;
                let localX = 0;

                const glyphs = word.glyphs;
                const lastDrawableIndex = this._lastDrawableIndex(glyphs);

                for (let gi = 0; gi < glyphs.length; gi++) {
                    const glyph = glyphs[gi];
                    const glyphRng = rng.child('glyph-' + lineIndex + '-' + wi + '-' + gi);

                    glyph.isWordStart = (gi === 0);
                    glyph.isWordEnd = (gi === lastDrawableIndex);

                    // Baseline offset comes ONLY from the smooth, correlated
                    // drift signals (line bias + slow BoundedDrift) - never
                    // an independent per-glyph random term. A per-letter
                    // gaussian here reads as a jagged sawtooth baseline
                    // ("_/\_/\/\_"), which is exactly the mechanical-noise
                    // look the humanizer is supposed to avoid; real
                    // handwriting drifts slowly, it doesn't hop letter to
                    // letter ("___/‾‾‾\___").
                    const rotationDeg = personality.slantDeg + lineSlopeDeg + wordSlantBias
                        + glyphRng.gaussian() * 0.6 * clamp01(h.rotationVariation);
                    const sizeMultX = wordScale * (1 + glyphRng.gaussian() * 0.04 * clamp01(h.sizeVariation));
                    const sizeMultY = wordScale * (1 + glyphRng.gaussian() * 0.03 * clamp01(h.sizeVariation));
                    const scaleX = unitScale * sizeMultX;
                    const scaleY = unitScale * sizeMultY;
                    const baselineOffset = drifts.baselineDrift.at(t + gi * 0.15) + lineBaselineBias;

                    glyph.x = wordStartX + localX;
                    glyph.transform = {
                        x: glyph.x,
                        y: line.baselineY + baselineOffset,
                        rotation: Geometry.degToRad(rotationDeg),
                        scaleX: scaleX,
                        scaleY: scaleY
                    };

                    glyph.speedMultiplier = Math.max(0.3, wordSpeedBias * (1 + glyphRng.gaussian() * 0.08 * clamp01(h.speedVariation)));

                    // Cursive connection to the PREVIOUS glyph in this word
                    glyph.connectBefore = false;
                    if (gi > 0) {
                        const prev = glyphs[gi - 1];
                        const prevVariant = prev.variant;
                        const curVariant = glyph.variant;
                        if (prevVariant && curVariant && prevVariant.anchorOut && curVariant.anchorIn) {
                            glyph.connectBefore = glyphRng.chance(clamp01(h.connectionProbability));
                        }
                    }

                    glyph.wordStartEase = glyph.isWordStart ? {
                        easeInFraction: 0.18 + glyphRng.next() * 0.12 * clamp01(h.wordStartVariation)
                    } : null;

                    glyph.wordEndLift = null;
                    if (glyph.isWordEnd && h.wordEndLift > 0) {
                        const wordLength = glyphs.length;
                        const applyProbability = clamp01(0.55 + h.wordEndLift * 0.45);
                        if (glyphRng.chance(applyProbability)) {
                            glyph.wordEndLift = {
                                liftStartFraction: 0.55 - clamp01(h.wordEndLift) * 0.2 - Math.min(0.15, wordLength * 0.01),
                                extraZFactor: 0.6 + glyphRng.next() * 0.8 * clamp01(h.wordEndLift),
                                elongate: 1 + glyphRng.next() * 0.15 * clamp01(h.wordEndLift)
                            };
                        }
                    }

                    // advance to next glyph position, with letter-spacing variation
                    if (glyph.variant) {
                        const spacingVariation = 1 + glyphRng.gaussian() * 0.06 * clamp01(h.letterSpacingVariation)
                            + drifts.spacingDrift.at(t + gi * 0.1);
                        localX += glyph.gapAfterMm * personality.spacingMultiplier * Math.max(0.5, spacingVariation) * sizeMultX;
                    } else {
                        localX += glyph.gapAfterMm;
                    }
                }

                word.width = localX;
                runningX = wordStartX + localX;
            }
        }

        _lastDrawableIndex(glyphs) {
            for (let i = glyphs.length - 1; i >= 0; i--) {
                if (glyphs[i].variant) return i;
            }
            return glyphs.length - 1;
        }
    }

    function clamp01(v) {
        if (v === undefined || v === null || isNaN(v)) return 0;
        return Geometry.clamp(v, 0, 1);
    }

    NS.HandwritingHumanizer = HandwritingHumanizer;
})(window.Handwriter);
