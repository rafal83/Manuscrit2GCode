/**
 * FontAuthoringKit: small helpers used when hand-authoring glyph data in
 * fonts/<font-id>/font.js files. Not used at runtime by the rendering/layout
 * pipeline (that only ever sees plain {type:'M'|'L'|'Q'|'C', ...} segment
 * objects) - this is purely a convenience so glyph strokes can be composed
 * from lines and elliptical arcs instead of hand-guessed control points.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    function M(x, y) { return { type: 'M', x, y }; }
    function L(x, y) { return { type: 'L', x, y }; }
    function Q(x1, y1, x, y) { return { type: 'Q', x1, y1, x, y }; }
    function C(x1, y1, x2, y2, x, y) { return { type: 'C', x1, y1, x2, y2, x, y }; }

    const KAPPA = 0.5522847498307936;

    /**
     * Point on an ellipse for a given angle in degrees (0 = +X axis, 90 = +Y axis).
     */
    function ellipsePoint(cx, cy, rx, ry, deg) {
        const rad = (deg * Math.PI) / 180;
        return { x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) };
    }

    /**
     * Approximate an elliptical arc from fromDeg to toDeg (degrees, can go
     * either direction and span >180) as a series of cubic bezier segments.
     * Returns an array of 'C' segments (does NOT include a leading M - the
     * caller's current point must already be at the arc's start).
     */
    function arcSegments(cx, cy, rx, ry, fromDeg, toDeg) {
        const segments = [];
        const totalSpan = toDeg - fromDeg;
        const steps = Math.max(1, Math.ceil(Math.abs(totalSpan) / 90));
        const stepSpan = totalSpan / steps;

        for (let i = 0; i < steps; i++) {
            const a0 = fromDeg + i * stepSpan;
            const a1 = fromDeg + (i + 1) * stepSpan;
            const p0 = ellipsePoint(cx, cy, rx, ry, a0);
            const p1 = ellipsePoint(cx, cy, rx, ry, a1);

            const a0r = (a0 * Math.PI) / 180;
            const a1r = (a1 * Math.PI) / 180;
            const spanR = a1r - a0r;
            const k = KAPPA * (spanR / (Math.PI / 2)) * (4 / 3) * (Math.PI / 2) / (Math.PI / 2);
            // tangent-based handle length for this sub-arc
            const handle = (4 / 3) * Math.tan(spanR / 4);

            const c1 = {
                x: p0.x - rx * Math.sin(a0r) * handle,
                y: p0.y + ry * Math.cos(a0r) * handle
            };
            const c2 = {
                x: p1.x + rx * Math.sin(a1r) * handle,
                y: p1.y - ry * Math.cos(a1r) * handle
            };
            segments.push(C(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y));
        }
        return segments;
    }

    /**
     * Build a full segment list (starting with M) from a compact part list:
     *   { type:'line', to:{x,y} }
     *   { type:'quad', ctrl:{x,y}, to:{x,y} }
     *   { type:'cubic', c1:{x,y}, c2:{x,y}, to:{x,y} }
     *   { type:'arc', cx,cy,rx,ry, fromDeg, toDeg }  (start point must match current pen pos)
     */
    function buildStroke(start, parts) {
        const segments = [M(start.x, start.y)];
        let current = { x: start.x, y: start.y };

        for (const part of parts) {
            if (part.type === 'line') {
                segments.push(L(part.to.x, part.to.y));
                current = part.to;
            } else if (part.type === 'quad') {
                segments.push(Q(part.ctrl.x, part.ctrl.y, part.to.x, part.to.y));
                current = part.to;
            } else if (part.type === 'cubic') {
                segments.push(C(part.c1.x, part.c1.y, part.c2.x, part.c2.y, part.to.x, part.to.y));
                current = part.to;
            } else if (part.type === 'arc') {
                const expectedStart = ellipsePoint(part.cx, part.cy, part.rx, part.ry, part.fromDeg);
                if (Math.abs(expectedStart.x - current.x) > 0.5 || Math.abs(expectedStart.y - current.y) > 0.5) {
                    // eslint-disable-next-line no-console
                    console.warn('FontAuthoringKit: arc start does not match current pen position', expectedStart, current);
                }
                const arcSegs = arcSegments(part.cx, part.cy, part.rx, part.ry, part.fromDeg, part.toDeg);
                for (const s of arcSegs) segments.push(s);
                const end = ellipsePoint(part.cx, part.cy, part.rx, part.ry, part.toDeg);
                current = end;
            }
        }
        return segments;
    }

    NS.FontAuthoringKit = {
        M, L, Q, C,
        ellipsePoint,
        arcSegments,
        buildStroke
    };
})(window.Handwriter);
