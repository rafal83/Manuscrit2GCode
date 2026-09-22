/**
 * Deterministic pseudo-random number generator.
 * Every stochastic decision in the handwriting engine must flow through an
 * instance of this class (or a derived stream) so that a given seed always
 * reproduces an identical document. Math.random() must never be used inside
 * the engine.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    /**
     * Mulberry32 PRNG: small, fast, statistically decent for our purposes,
     * and fully deterministic from a 32-bit integer seed.
     */
    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hashStringToSeed(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    class SeededRandom {
        /**
         * @param {number|string} seed
         */
        constructor(seed) {
            if (typeof seed === 'string') {
                seed = hashStringToSeed(seed);
            }
            this.seed = (seed >>> 0) || 1;
            this._rand = mulberry32(this.seed);
        }

        /** Float in [0, 1) */
        next() {
            return this._rand();
        }

        /** Float in [min, max) */
        range(min, max) {
            return min + this.next() * (max - min);
        }

        /** Integer in [min, max] inclusive */
        int(min, max) {
            return Math.floor(this.range(min, max + 1));
        }

        /** Boolean with given probability of true (0..1) */
        chance(probability) {
            return this.next() < probability;
        }

        /** Gaussian-ish value via sum of uniforms (Irwin-Hall approximation), mean 0, roughly bounded to [-1,1] */
        gaussian() {
            let sum = 0;
            const n = 4;
            for (let i = 0; i < n; i++) sum += this.next();
            return (sum / n - 0.5) * 2;
        }

        /** Pick a random element from an array */
        pick(arr) {
            if (!arr || arr.length === 0) return undefined;
            return arr[this.int(0, arr.length - 1)];
        }

        /**
         * Weighted pick. `items` is an array of {value, weight}.
         */
        pickWeighted(items) {
            const total = items.reduce((s, it) => s + it.weight, 0);
            if (total <= 0) return items.length ? items[0].value : undefined;
            let r = this.range(0, total);
            for (const it of items) {
                if (r < it.weight) return it.value;
                r -= it.weight;
            }
            return items[items.length - 1].value;
        }

        /**
         * Derive an independent, deterministic child stream from this one.
         * Useful to give each subsystem (jitter, drift, glyph choice...) its
         * own uncorrelated-but-reproducible stream without them starving
         * each other by call order.
         */
        child(label) {
            const mixed = (this.seed ^ hashStringToSeed(String(label))) >>> 0;
            return new SeededRandom(mixed || 1);
        }
    }

    NS.SeededRandom = SeededRandom;
})(window.Handwriter);
