/**
 * PathOptimizer: light, SAFE cleanup of the point lists produced by
 * StrokeProcessor. Per the project's priority order (human render > natural
 * writing order > gestural continuity > optimization), this module never
 * reorders strokes or glyphs - it only removes redundant points so the
 * resulting G-code stays compact, without visibly changing the drawn shape.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const Geometry = NS.Geometry;

    const PathOptimizer = {
        /**
         * @param {Array<{points: Array<{x,y,z,speed}>}>} strokes
         * @param {object} opts { minPointDistance (mm), collinearToleranceDeg }
         */
        optimize(strokes, opts) {
            opts = opts || {};
            const minDist = opts.minPointDistance !== undefined ? opts.minPointDistance : 0.02;
            const collinearDeg = opts.collinearToleranceDeg !== undefined ? opts.collinearToleranceDeg : 1.2;

            return strokes
                .map(s => ({ points: PathOptimizer._dedupe(s.points, minDist) }))
                .map(s => ({ points: PathOptimizer._dropCollinear(s.points, collinearDeg) }))
                .filter(s => s.points.length > 0);
        },

        _dedupe(points, minDist) {
            if (points.length === 0) return points;
            const out = [points[0]];
            for (let i = 1; i < points.length; i++) {
                const prev = out[out.length - 1];
                if (Geometry.distance(prev, points[i]) >= minDist) {
                    out.push(points[i]);
                }
            }
            // always keep the true final point (matters for word-end Z lift)
            const last = points[points.length - 1];
            if (out[out.length - 1] !== last) out.push(last);
            return out;
        },

        /**
         * Drops a middle point when it lies almost exactly on the line
         * between its neighbours AND has essentially the same Z/speed as
         * them (so we never erase a deliberate pressure or speed change).
         */
        _dropCollinear(points, toleranceDeg) {
            if (points.length < 3) return points;
            const out = [points[0]];
            const toleranceRad = Geometry.degToRad(toleranceDeg);

            for (let i = 1; i < points.length - 1; i++) {
                const prev = out[out.length - 1];
                const cur = points[i];
                const next = points[i + 1];

                const a = Geometry.normalize(Geometry.sub(cur, prev));
                const b = Geometry.normalize(Geometry.sub(next, cur));
                const dot = Geometry.clamp(a.x * b.x + a.y * b.y, -1, 1);
                const angle = Math.acos(dot);

                const zClose = Math.abs((cur.z || 0) - (prev.z || 0)) < 0.005 && Math.abs((next.z || 0) - (cur.z || 0)) < 0.005;
                const speedClose = Math.abs((cur.speed || 0) - (prev.speed || 0)) < 1 && Math.abs((next.speed || 0) - (cur.speed || 0)) < 1;

                if (angle < toleranceRad && zClose && speedClose) {
                    continue; // drop it
                }
                out.push(cur);
            }
            out.push(points[points.length - 1]);
            return out;
        }
    };

    NS.PathOptimizer = PathOptimizer;
})(window.Handwriter);
