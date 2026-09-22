/**
 * Small 2D geometry utilities: vectors, transforms, bounding boxes.
 * No dependencies. Points are plain {x, y[, z]} objects throughout the app.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const Geometry = {
        add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
        sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
        scale(a, s) { return { x: a.x * s, y: a.y * s }; },
        length(a) { return Math.sqrt(a.x * a.x + a.y * a.y); },
        distance(a, b) { return Geometry.length(Geometry.sub(b, a)); },
        lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; },

        normalize(a) {
            const len = Geometry.length(a);
            if (len < 1e-9) return { x: 0, y: 0 };
            return { x: a.x / len, y: a.y / len };
        },

        angle(a, b) {
            return Math.atan2(b.y - a.y, b.x - a.x);
        },

        degToRad(d) { return (d * Math.PI) / 180; },
        radToDeg(r) { return (r * 180) / Math.PI; },

        /**
         * Rotate a point around a center by `radians`.
         */
        rotatePoint(p, center, radians) {
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            const dx = p.x - center.x;
            const dy = p.y - center.y;
            return {
                x: center.x + dx * cos - dy * sin,
                y: center.y + dx * sin + dy * cos
            };
        },

        /**
         * Apply a full affine transform (scale, rotate around origin, then
         * translate) to a point. Order: scale -> rotate -> translate.
         */
        applyTransform(p, transform) {
            const sx = transform.scaleX !== undefined ? transform.scaleX : 1;
            const sy = transform.scaleY !== undefined ? transform.scaleY : 1;
            const rot = transform.rotation || 0;
            const tx = transform.x || 0;
            const ty = transform.y || 0;

            let x = p.x * sx;
            let y = p.y * sy;

            if (rot) {
                const cos = Math.cos(rot);
                const sin = Math.sin(rot);
                const rx = x * cos - y * sin;
                const ry = x * sin + y * cos;
                x = rx;
                y = ry;
            }

            return { x: x + tx, y: y + ty, z: p.z };
        },

        emptyBounds() {
            return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        },

        extendBounds(bounds, p) {
            if (p.x < bounds.minX) bounds.minX = p.x;
            if (p.y < bounds.minY) bounds.minY = p.y;
            if (p.x > bounds.maxX) bounds.maxX = p.x;
            if (p.y > bounds.maxY) bounds.maxY = p.y;
            return bounds;
        },

        boundsOfPoints(points) {
            const b = Geometry.emptyBounds();
            for (const p of points) Geometry.extendBounds(b, p);
            return b;
        },

        mergeBounds(a, b) {
            return {
                minX: Math.min(a.minX, b.minX),
                minY: Math.min(a.minY, b.minY),
                maxX: Math.max(a.maxX, b.maxX),
                maxY: Math.max(a.maxY, b.maxY)
            };
        },

        boundsWidth(b) { return b.maxX - b.minX; },
        boundsHeight(b) { return b.maxY - b.minY; },

        clamp(v, min, max) {
            return Math.max(min, Math.min(max, v));
        }
    };

    NS.Geometry = Geometry;
})(window.Handwriter);
