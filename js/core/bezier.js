/**
 * Curve sampling utilities: turns a glyph's segment list (M/L/Q/C, in the
 * style of SVG path commands) into a dense polyline, with more points
 * placed where curvature is higher so curves stay smooth without wasting
 * points on straight runs.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    function quadraticPoint(p0, p1, p2, t) {
        const mt = 1 - t;
        return {
            x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
        };
    }

    function cubicPoint(p0, p1, p2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        return {
            x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
            y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y
        };
    }

    /**
     * Estimate a reasonable sample count for a quadratic/cubic based on the
     * length of its control polygon (a cheap proxy for arc length + curvature:
     * tightly curved segments have a control polygon much longer than the
     * chord, so they naturally get more points).
     */
    function estimateSamples(controlPoints, minSamples, maxSamples, unitsPerSample) {
        let polyLen = 0;
        for (let i = 1; i < controlPoints.length; i++) {
            polyLen += NS.Geometry.distance(controlPoints[i - 1], controlPoints[i]);
        }
        const n = Math.round(polyLen / unitsPerSample);
        return NS.Geometry.clamp(n, minSamples, maxSamples);
    }

    /**
     * Sample a list of path segments into a flat array of {x,y} points.
     * Segment format:
     *   { type: 'M', x, y }
     *   { type: 'L', x, y }
     *   { type: 'Q', x1, y1, x, y }
     *   { type: 'C', x1, y1, x2, y2, x, y }
     *
     * @param {Array} segments
     * @param {object} opts { unitsPerSample, minSamples, maxSamples }
     * @returns {Array<{x:number,y:number}>}
     */
    function sampleSegments(segments, opts = {}) {
        const unitsPerSample = opts.unitsPerSample || 3; // design units per emitted point on curves
        const minSamples = opts.minSamples || 4;
        const maxSamples = opts.maxSamples || 40;

        const points = [];
        let current = { x: 0, y: 0 };

        for (const seg of segments) {
            if (seg.type === 'M') {
                current = { x: seg.x, y: seg.y };
                points.push({ x: current.x, y: current.y });
            } else if (seg.type === 'L') {
                current = { x: seg.x, y: seg.y };
                points.push({ x: current.x, y: current.y });
            } else if (seg.type === 'Q') {
                const p0 = current;
                const p1 = { x: seg.x1, y: seg.y1 };
                const p2 = { x: seg.x, y: seg.y };
                const n = estimateSamples([p0, p1, p2], minSamples, maxSamples, unitsPerSample);
                for (let i = 1; i <= n; i++) {
                    points.push(quadraticPoint(p0, p1, p2, i / n));
                }
                current = p2;
            } else if (seg.type === 'C') {
                const p0 = current;
                const p1 = { x: seg.x1, y: seg.y1 };
                const p2 = { x: seg.x2, y: seg.y2 };
                const p3 = { x: seg.x, y: seg.y };
                const n = estimateSamples([p0, p1, p2, p3], minSamples, maxSamples, unitsPerSample);
                for (let i = 1; i <= n; i++) {
                    points.push(cubicPoint(p0, p1, p2, p3, i / n));
                }
                current = p3;
            }
        }

        return points;
    }

    /**
     * Compute cumulative arc-length parametrization (u in [0,1]) for a
     * polyline, returned as an array parallel to `points`.
     */
    function arcLengthParams(points) {
        const dist = [0];
        for (let i = 1; i < points.length; i++) {
            dist.push(dist[i - 1] + NS.Geometry.distance(points[i - 1], points[i]));
        }
        const total = dist[dist.length - 1] || 1;
        return dist.map(d => d / total);
    }

    function totalLength(points) {
        let len = 0;
        for (let i = 1; i < points.length; i++) len += NS.Geometry.distance(points[i - 1], points[i]);
        return len;
    }

    NS.Bezier = {
        quadraticPoint,
        cubicPoint,
        sampleSegments,
        arcLengthParams,
        totalLength
    };
})(window.Handwriter);
