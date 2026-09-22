/**
 * Smooth, correlated pseudo-random noise, deterministic from a SeededRandom
 * stream. Used everywhere we want variation that drifts over time/space
 * instead of jittering independently point-to-point (which reads as
 * "shaky CNC" rather than "human hand").
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    /**
     * 1D value noise: generates a lattice of random values at integer
     * positions and smoothly interpolates (smoothstep) between them.
     * Deterministic for a given SeededRandom instance + lattice size.
     */
    class ValueNoise1D {
        /**
         * @param {Handwriter.SeededRandom} rng
         * @param {number} latticeSize number of control points to pre-generate
         */
        constructor(rng, latticeSize = 256) {
            this.size = latticeSize;
            this.values = new Array(latticeSize);
            for (let i = 0; i < latticeSize; i++) {
                this.values[i] = rng.range(-1, 1);
            }
        }

        static smoothstep(t) {
            return t * t * (3 - 2 * t);
        }

        /**
         * Sample the noise at an arbitrary (possibly fractional, possibly
         * unbounded) position. `frequency` scales how fast the lattice is
         * traversed per unit of `t`.
         */
        sample(t, frequency = 1) {
            const x = t * frequency;
            const i0 = Math.floor(x);
            const frac = x - i0;
            const a = this.values[((i0 % this.size) + this.size) % this.size];
            const b = this.values[(((i0 + 1) % this.size) + this.size) % this.size];
            const s = ValueNoise1D.smoothstep(frac);
            return a + (b - a) * s;
        }
    }

    /**
     * A bounded random walk: at each step, drifts by a small correlated
     * amount but is pulled gently back toward zero (or a target), so it
     * never wanders off to an extreme value. Good for "slow personality
     * drift" signals (slant, baseline, size...) that must stay believable.
     */
    class BoundedDrift {
        /**
         * @param {Handwriter.SeededRandom} rng
         * @param {object} opts
         * @param {number} opts.amplitude max absolute deviation
         * @param {number} opts.smoothing 0..1, higher = slower/smoother drift
         * @param {number} opts.steps number of lattice points to precompute
         */
        constructor(rng, opts = {}) {
            const amplitude = opts.amplitude !== undefined ? opts.amplitude : 1;
            const smoothing = opts.smoothing !== undefined ? opts.smoothing : 0.85;
            const steps = opts.steps || 128;
            this.amplitude = amplitude;
            this.noise = new ValueNoise1D(rng, steps);
            this.frequency = 1 - smoothing * 0.9; // lower smoothing -> higher frequency traversal
            if (this.frequency <= 0.02) this.frequency = 0.02;
        }

        /** Value of the drift signal at position t (e.g. character index, or mm along the line) */
        at(t) {
            return this.noise.sample(t, this.frequency) * this.amplitude;
        }
    }

    /**
     * Smooth 1D noise sampled along a stroke's arc-length parameter (0..1),
     * used for jitter that is correlated along the length of a single
     * stroke rather than per-point independent noise.
     */
    class StrokeNoise {
        constructor(rng, frequency = 3) {
            this.noiseX = new ValueNoise1D(rng.child('jx'), 32);
            this.noiseY = new ValueNoise1D(rng.child('jy'), 32);
            this.frequency = frequency;
        }

        sample(u) {
            return {
                x: this.noiseX.sample(u, this.frequency),
                y: this.noiseY.sample(u, this.frequency)
            };
        }
    }

    NS.Noise = {
        ValueNoise1D,
        BoundedDrift,
        StrokeNoise
    };
})(window.Handwriter);
