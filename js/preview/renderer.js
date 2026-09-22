/**
 * Renderer: builds the SVG preview (machine bed + paper + margins +
 * strokes) from the exact same PlotterOperations that produce the G-code,
 * so what you see is what gets plotted. Also used by Simulator as the
 * static "ghost" base it animates a pen marker over.
 *
 * All content is authored in natural machine-space millimeters (Y-up); a
 * single top-level <g> flips Y for SVG's Y-down convention.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const STROKE_PALETTE = ['#2a3a8c', '#8c2a55', '#2a8c6b', '#8c6b2a', '#5a2a8c', '#2a6b8c'];

    function el(name, attrs) {
        const e = document.createElementNS(SVG_NS, name);
        if (attrs) {
            for (const k in attrs) e.setAttribute(k, attrs[k]);
        }
        return e;
    }

    /**
     * Rebuilds strokes from an operations list into an array of
     * {type:'draw'|'travel', points:[{x,y}], strokeIndex}. Draw runs are
     * the segments between a PEN_DOWN and the following PEN_UP; travel runs
     * are the MOVE segments while the pen is up.
     */
    function extractRuns(operations) {
        const runs = [];
        let current = null;
        let lastPoint = null;
        let strokeIndex = -1;

        for (const op of operations) {
            if (op.type === 'PEN_UP') {
                if (current && current.type === 'draw') runs.push(current);
                current = null;
            } else if (op.type === 'MOVE') {
                if (current && current.type === 'draw') runs.push(current);
                current = { type: 'travel', points: lastPoint ? [lastPoint] : [] };
                current.points.push({ x: op.x, y: op.y });
                lastPoint = { x: op.x, y: op.y };
                runs.push(current);
                current = null;
            } else if (op.type === 'PEN_DOWN') {
                strokeIndex++;
                current = { type: 'draw', points: lastPoint ? [lastPoint] : [], strokeIndex: strokeIndex };
            } else if (op.type === 'DRAW') {
                if (!current) current = { type: 'draw', points: [], strokeIndex: strokeIndex };
                current.points.push({ x: op.x, y: op.y });
                lastPoint = { x: op.x, y: op.y };
            }
        }
        if (current && current.type === 'draw') runs.push(current);
        return runs;
    }

    function pointsToPathD(points) {
        if (points.length === 0) return '';
        let d = 'M ' + points[0].x.toFixed(3) + ' ' + points[0].y.toFixed(3);
        for (let i = 1; i < points.length; i++) {
            d += ' L ' + points[i].x.toFixed(3) + ' ' + points[i].y.toFixed(3);
        }
        return d;
    }

    const Renderer = {
        extractRuns,

        /**
         * @param {SVGSVGElement} svg target <svg> element (already in the DOM)
         * @param {object} scene { operations, machine, sheet, page, viewMode }
         * @returns {{ drawPaths: SVGPathElement[], svgGroup: SVGGElement }}
         */
        render(svg, scene) {
            while (svg.firstChild) svg.removeChild(svg.firstChild);

            const machine = scene.machine;
            const padding = 15;
            const viewW = machine.bedWidth + padding * 2;
            const viewH = machine.bedHeight + padding * 2;
            svg.setAttribute('viewBox', (-padding) + ' ' + (-padding) + ' ' + viewW + ' ' + viewH);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            const flip = el('g', { transform: 'translate(0,' + machine.bedHeight + ') scale(1,-1)' });
            svg.appendChild(flip);

            // Machine bed
            flip.appendChild(el('rect', {
                x: 0, y: 0, width: machine.bedWidth, height: machine.bedHeight,
                class: 'hw-bed'
            }));

            // Paper sheet (positioned/rotated on the bed)
            if (scene.page && scene.sheet) {
                const sheetG = el('g', {
                    transform: 'translate(' + scene.sheet.x + ',' + scene.sheet.y + ') rotate(' + scene.sheet.rotation + ')'
                });
                sheetG.appendChild(el('rect', {
                    x: 0, y: 0, width: scene.page.width, height: scene.page.height, class: 'hw-paper'
                }));
                const m = scene.page.margins;
                sheetG.appendChild(el('rect', {
                    x: m.left, y: m.bottom,
                    width: Math.max(0, scene.page.width - m.left - m.right),
                    height: Math.max(0, scene.page.height - m.top - m.bottom),
                    class: 'hw-margins'
                }));
                flip.appendChild(sheetG);
            }

            const strokesGroup = el('g', { class: 'hw-strokes' });
            flip.appendChild(strokesGroup);

            const runs = extractRuns(scene.operations || []);
            const viewMode = scene.viewMode || 'result';
            const drawPaths = [];

            let debugIndex = 0;
            for (const run of runs) {
                if (run.points.length < 2) continue;
                if (run.type === 'travel') {
                    if (viewMode === 'movements' || viewMode === 'debug') {
                        strokesGroup.appendChild(el('path', {
                            d: pointsToPathD(run.points),
                            class: 'hw-travel'
                        }));
                    }
                    continue;
                }

                // draw run
                let strokeClass = 'hw-stroke';
                let color = null;
                if (viewMode === 'trajectories' || viewMode === 'debug') {
                    color = STROKE_PALETTE[run.strokeIndex % STROKE_PALETTE.length];
                }
                const path = el('path', {
                    d: pointsToPathD(run.points),
                    class: strokeClass,
                    fill: 'none'
                });
                if (color) path.setAttribute('stroke', color);
                strokesGroup.appendChild(path);
                drawPaths.push({ path: path, strokeIndex: run.strokeIndex, points: run.points });

                if (viewMode === 'debug') {
                    const start = run.points[0];
                    strokesGroup.appendChild(el('circle', { cx: start.x, cy: start.y, r: 0.6, class: 'hw-debug-anchor' }));
                    const label = el('text', {
                        x: start.x + 0.8, y: start.y + 0.8, class: 'hw-debug-label',
                        transform: 'scale(1,-1) translate(0,' + (-2 * (start.y + 0.8)) + ')'
                    });
                    label.textContent = String(run.strokeIndex);
                    strokesGroup.appendChild(label);
                    debugIndex++;
                }
            }

            return { drawPaths: drawPaths, svgGroup: flip, runs: runs };
        },

        /**
         * Builds a standalone, self-contained SVG document string (inline
         * styles, no dependency on app.css) representing the final
         * humanized result - suitable for direct file download.
         */
        buildStandaloneSVG(scene) {
            const machine = scene.machine;
            const runs = extractRuns(scene.operations || []);
            const padding = 5;
            const b = scene.page ? Renderer.pageBounds(scene.page, scene.sheet) : { minX: 0, minY: 0, maxX: machine.bedWidth, maxY: machine.bedHeight };
            const screenMinY = machine.bedHeight - b.maxY;
            const screenMaxY = machine.bedHeight - b.minY;
            const x = b.minX - padding, y = screenMinY - padding;
            const w = (b.maxX - b.minX) + padding * 2, h = (screenMaxY - screenMinY) + padding * 2;

            let paths = '';
            for (const run of runs) {
                if (run.type !== 'draw' || run.points.length < 2) continue;
                const flipped = run.points.map(p => ({ x: p.x, y: machine.bedHeight - p.y }));
                paths += '<path d="' + pointsToPathD(flipped) + '" fill="none" stroke="#1c1f27" stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round"/>\n';
            }

            return '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '" width="' + w + 'mm" height="' + h + 'mm">\n' +
                '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#ffffff"/>\n' +
                paths +
                '</svg>\n';
        },

        /** Computes the bounding box of the writable area for "fit page" zoom. */
        pageBounds(page, sheet) {
            const corners = [
                { x: 0, y: 0 }, { x: page.width, y: 0 },
                { x: page.width, y: page.height }, { x: 0, y: page.height }
            ];
            const rot = NS.Geometry.degToRad(sheet.rotation || 0);
            const b = NS.Geometry.emptyBounds();
            for (const c of corners) {
                const r = NS.Geometry.rotatePoint(c, { x: 0, y: 0 }, rot);
                NS.Geometry.extendBounds(b, { x: r.x + sheet.x, y: r.y + sheet.y });
            }
            return b;
        }
    };

    NS.Renderer = Renderer;
})(window.Handwriter);
