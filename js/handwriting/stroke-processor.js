/**
 * StrokeProcessor: turns a humanized Document (glyphs with a resolved
 * `transform` and humanization decisions) into a flat, ordered list of
 * drawable paths: [{ points: [{x,y,z,speed}, ...] }, ...], in absolute
 * page-space millimeters. This is the single source of truth consumed by
 * BOTH the G-code generator and the on-screen simulator, so they can never
 * diverge (spec requirement: no separate simulation engine).
 *
 * Responsibilities:
 *  - sample each stroke's curve segments into points, and transform them
 *    into page space (position, rotation, scale)
 *  - apply correlated (not independent-per-point) spatial jitter
 *  - assign a Z (pen pressure) value per point, respecting minPenZ
 *  - assign a speed per point (corner slowdown, word start/end easing)
 *  - join consecutive glyphs with a smooth connector curve when the
 *    Humanizer decided they should connect (glyph.connectBefore), instead
 *    of lifting the pen
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const Geometry = NS.Geometry;
    const Bezier = NS.Bezier;
    const StrokeNoise = NS.Noise.StrokeNoise;
    const ValueNoise1D = NS.Noise.ValueNoise1D;

    class StrokeProcessor {
        /**
         * @param {Handwriter.SeededRandom} rng dedicated child stream (e.g. masterRng.child('stroke-processor'))
         */
        constructor(rng) {
            this.rng = rng;
        }

        /**
         * @param {object} document humanized Document
         * @param {object} config full app config
         * @returns {Array<{points: Array<{x,y,z,speed}>}>}
         */
        process(document, config) {
            const units = this._buildUnits(document, config);
            const merged = this._mergeConnectors(units, config);
            return merged.map(u => ({ points: u.points }));
        }

        /**
         * First pass: every stroke of every drawable glyph becomes one
         * "unit" with fully resolved points (jitter/z/speed applied), still
         * separate from its neighbours.
         */
        _buildUnits(document, config) {
            const units = [];
            const h = config.humanization;
            const pen = config.pen;
            const speedCfg = config.speed;

            for (let pi = 0; pi < document.pages.length; pi++) {
                const page = document.pages[pi];
                for (let li = 0; li < page.lines.length; li++) {
                    const line = page.lines[li];
                    for (let wi = 0; wi < line.words.length; wi++) {
                        const word = line.words[wi];
                        for (let gi = 0; gi < word.glyphs.length; gi++) {
                            const glyph = word.glyphs[gi];
                            if (!glyph.variant) continue;
                            const strokes = glyph.variant.strokes;
                            for (let si = 0; si < strokes.length; si++) {
                                const label = 'p' + pi + ':l' + li + ':w' + wi + ':g' + gi + ':s' + si;
                                const unit = this._buildStrokeUnit(strokes[si], glyph, si, strokes.length, label, config);
                                unit.glyph = glyph;
                                unit.isFirstStrokeOfGlyph = (si === 0);
                                unit.isLastStrokeOfGlyph = (si === strokes.length - 1);
                                units.push(unit);
                            }
                        }
                    }
                }
            }
            return units;
        }

        _buildStrokeUnit(stroke, glyph, strokeIndex, strokeCount, label, config) {
            const h = config.humanization;
            const pen = config.pen;
            const speedCfg = config.speed;
            const rng = this.rng;

            const local = Bezier.sampleSegments(stroke.segments, { unitsPerSample: 2.2, minSamples: 4, maxSamples: 36 });
            let points = local.map(p => Geometry.applyTransform(p, glyph.transform));

            const isWordStartStroke = glyph.isWordStart && strokeIndex === 0 && glyph.wordStartEase;
            const isWordEndStroke = glyph.isWordEnd && strokeIndex === strokeCount - 1 && glyph.wordEndLift;

            if (isWordEndStroke && points.length >= 2) {
                points = this._elongateEnd(points, glyph.wordEndLift.elongate);
            }

            const us = Bezier.arcLengthParams(points);

            // --- spatial jitter, correlated along arc length, faded at the very ends ---
            const jitterAmp = (h.strokeJitter && h.strokeJitter.amplitude) || 0;
            if (jitterAmp > 0.001) {
                const noise = new StrokeNoise(rng.child('jitter:' + label), (h.strokeJitter.frequency || 3));
                for (let i = 0; i < points.length; i++) {
                    const u = us[i];
                    const envelope = Math.sin(Math.PI * Geometry.clamp(u, 0, 1));
                    const n = noise.sample(u);
                    points[i] = {
                        x: points[i].x + n.x * jitterAmp * envelope,
                        y: points[i].y + n.y * jitterAmp * envelope
                    };
                }
            }

            // --- Z (pressure) ---
            const pressureNoise = new ValueNoise1D(rng.child('pressure:' + label), 24);
            const pressureEnabled = pen.pressureEnabled !== false;
            const pressureAmp = pressureEnabled ? 0.12 * Geometry.clamp(h.pressureVariation || 0, 0, 1) : 0;
            const zValues = new Array(points.length);
            for (let i = 0; i < points.length; i++) {
                let z = pen.penDownZ + pressureNoise.sample(us[i], 2.5) * pressureAmp;
                z = Math.max(pen.minPenZ, z);
                zValues[i] = z;
            }
            if (isWordEndStroke) {
                this._applyWordEndLift(zValues, us, glyph.wordEndLift, pen);
            }
            if (isWordStartStroke) {
                this._applyWordStartEase(zValues, us, glyph.wordStartEase, pen);
            }

            // --- speed ---
            const speedNoise = new ValueNoise1D(rng.child('speed:' + label), 24);
            const speeds = new Array(points.length);
            const base = speedCfg.baseSpeed * (glyph.speedMultiplier || 1);
            for (let i = 0; i < points.length; i++) {
                const corner = this._cornerFactor(points, i, speedCfg.cornerSlowdown || 0);
                const variation = 1 + speedNoise.sample(us[i], 3) * 0.25 * Geometry.clamp(speedCfg.speedVariation || 0, 0, 1);
                speeds[i] = Math.max(speedCfg.baseSpeed * 0.15, base * corner * variation);
            }
            if (isWordEndStroke) {
                this._applyWordEndAcceleration(speeds, us, glyph.wordEndLift, speedCfg);
            }
            if (isWordStartStroke) {
                this._applyWordStartEase(speeds, us, glyph.wordStartEase, null, true);
            }

            const out = new Array(points.length);
            for (let i = 0; i < points.length; i++) {
                out[i] = { x: points[i].x, y: points[i].y, z: zValues[i], speed: speeds[i] };
            }
            return { points: out };
        }

        _elongateEnd(points, elongate) {
            const n = points.length;
            const last = points[n - 1];
            const prev = points[n - 2];
            const dir = Geometry.normalize(Geometry.sub(last, prev));
            const extendMm = (elongate - 1) * 10;
            const newLast = { x: last.x + dir.x * extendMm, y: last.y + dir.y * extendMm };
            const copy = points.slice();
            copy[n - 1] = newLast;
            return copy;
        }

        _cornerFactor(points, i, cornerSlowdown) {
            if (cornerSlowdown <= 0 || i === 0 || i === points.length - 1) return 1;
            const a = Geometry.normalize(Geometry.sub(points[i], points[i - 1]));
            const b = Geometry.normalize(Geometry.sub(points[i + 1], points[i]));
            const dot = Geometry.clamp(a.x * b.x + a.y * b.y, -1, 1);
            const turn = Math.acos(dot); // 0 = straight, PI = full reversal
            const turnFraction = turn / Math.PI;
            return Geometry.clamp(1 - turnFraction * cornerSlowdown, 0.25, 1);
        }

        /** Mutates zValues in place: tapers Z up toward penUpZ starting at liftStartFraction. */
        _applyWordEndLift(zValues, us, liftCfg, pen) {
            const start = liftCfg.liftStartFraction;
            const maxProgress = 0.85 * liftCfg.extraZFactor;
            for (let i = 0; i < zValues.length; i++) {
                if (us[i] <= start) continue;
                const local = (us[i] - start) / (1 - start);
                const smooth = local * local * (3 - 2 * local);
                const progress = Math.min(0.9, smooth * maxProgress);
                zValues[i] = zValues[i] + (pen.penUpZ - zValues[i]) * progress;
            }
        }

        /** Progressive contact: eases Z down from penUpZ over the first part of the stroke. */
        _applyWordStartEase(values, us, easeCfg, pen, isSpeedArray) {
            const frac = easeCfg.easeInFraction;
            for (let i = 0; i < values.length; i++) {
                if (us[i] >= frac) continue;
                const local = us[i] / frac;
                const smooth = local * local * (3 - 2 * local);
                if (isSpeedArray) {
                    values[i] = values[i] * (0.35 + 0.65 * smooth);
                } else if (pen) {
                    values[i] = pen.penUpZ + (values[i] - pen.penUpZ) * smooth;
                }
            }
        }

        _applyWordEndAcceleration(speeds, us, liftCfg, speedCfg) {
            const start = liftCfg.liftStartFraction;
            const accel = Geometry.clamp(speedCfg.wordEndAcceleration || 0, 0, 1);
            for (let i = 0; i < speeds.length; i++) {
                if (us[i] <= start) continue;
                const local = (us[i] - start) / (1 - start);
                speeds[i] = speeds[i] * (1 + local * accel * 0.5);
            }
        }

        /**
         * Second pass: merges a glyph's first-stroke unit into the previous
         * glyph's last-stroke unit with a smooth connector curve, whenever
         * glyph.connectBefore is true (the Humanizer already decided this
         * stochastically based on connectionProbability and anchor
         * compatibility).
         */
        _mergeConnectors(units, config) {
            const result = [];
            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                const glyph = unit.glyph;

                if (unit.isFirstStrokeOfGlyph && glyph.connectBefore && result.length > 0) {
                    const prevUnit = result[result.length - 1];
                    const prevGlyph = prevUnit.glyph;
                    if (prevUnit.isLastStrokeOfGlyphMarker !== false) {
                        const connectorPoints = this._buildConnector(prevUnit.points, unit.points, prevGlyph, glyph, config, i);
                        prevUnit.points = prevUnit.points.concat(connectorPoints, unit.points);
                        prevUnit.glyph = glyph; // subsequent connector (if any) chains from here
                        prevUnit.isLastStrokeOfGlyphMarker = unit.isLastStrokeOfGlyph;
                        continue;
                    }
                }
                unit.isLastStrokeOfGlyphMarker = unit.isLastStrokeOfGlyph;
                result.push(unit);
            }
            return result;
        }

        _buildConnector(prevPoints, curPoints, prevGlyph, curGlyph, config, seedIndex) {
            const from = prevPoints[prevPoints.length - 1];
            const to = curPoints[0];
            const rng = this.rng.child('connector:' + seedIndex);

            const dist = Geometry.distance(from, to);
            const mid = Geometry.lerp(from, to, 0.5);
            // Dip (and its random wobble) must stay PROPORTIONAL to the gap
            // being bridged - a fixed mm offset looks like a subtle
            // connecting stroke at large letter sizes but reads as a wild,
            // disproportionate loop once real handwriting-scale gaps (often
            // just 1-2 mm) are this small.
            const dip = Geometry.clamp(dist * 0.15, 0.05, 1.2) + rng.gaussian() * Math.min(0.15, dist * 0.06);
            const control = { x: mid.x, y: mid.y - dip };

            const steps = Geometry.clamp(Math.round(dist / 1.8), 1, 7);
            const pts = [];
            const speedFrom = from.speed || config.speed.baseSpeed;
            const speedTo = to.speed || config.speed.baseSpeed;
            for (let s = 1; s <= steps; s++) {
                const t = s / (steps + 1);
                const p = Bezier.quadraticPoint(from, control, to, t);
                pts.push({
                    x: p.x,
                    y: p.y,
                    z: config.pen.penDownZ,
                    speed: speedFrom + (speedTo - speedFrom) * t
                });
            }
            return pts;
        }
    }

    NS.StrokeProcessor = StrokeProcessor;
})(window.Handwriter);
