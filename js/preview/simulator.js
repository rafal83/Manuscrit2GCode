/**
 * Simulator: animates a pen marker along the exact PlotterOperations that
 * will be exported as G-code (via Renderer, so there is only ever one
 * source of truth for "what gets plotted"). Progressive ink reveal uses
 * the standard SVG stroke-dasharray/dashoffset technique driven by a
 * pre-computed timeline (derived from per-segment distance / feedrate),
 * so playback speed and G-code timing stay consistent.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const Geometry = NS.Geometry;
    const MIN_EVENT_DURATION_MS = 12;

    function mmPerMinToMmPerMs(feed) {
        return feed / 60000;
    }

    /**
     * Pure, DOM-free estimate of total plot duration (ms) from an
     * operations list - used for the stats panel without needing to build
     * a full Simulator (which requires a live <svg> in the document).
     */
    function estimateDurationMs(operations) {
        let t = 0;
        let cur = { x: 0, y: 0, z: 0 };
        for (const op of operations) {
            if (op.type === 'PEN_UP' || op.type === 'PEN_DOWN') {
                const dz = Math.abs(op.z - cur.z);
                t += Math.max(MIN_EVENT_DURATION_MS, (dz / mmPerMinToMmPerMs(op.speed)) || MIN_EVENT_DURATION_MS);
                cur = { x: cur.x, y: cur.y, z: op.z };
            } else if (op.type === 'MOVE' || op.type === 'DRAW') {
                const dist = Geometry.distance(cur, { x: op.x, y: op.y });
                t += Math.max(MIN_EVENT_DURATION_MS, (dist / mmPerMinToMmPerMs(op.speed)) || MIN_EVENT_DURATION_MS);
                cur = { x: op.x, y: op.y, z: op.z !== undefined ? op.z : cur.z };
            }
        }
        return t;
    }

    class Simulator {
        /**
         * @param {SVGSVGElement} svg
         * @param {object} scene { operations, machine, sheet, page, viewMode }
         */
        constructor(svg, scene) {
            this.svg = svg;
            this.scene = scene;
            this.speedMultiplier = 1;
            this.playing = false;
            this.virtualTime = 0;
            this.onUpdate = null;
            this.onFinish = null;
            this._rafId = null;
            this._lastWallTime = null;
            this._eventCursor = 0;

            this._build();
        }

        _build() {
            const renderResult = NS.Renderer.render(this.svg, this.scene);
            this.svg.classList.add('hw-simulating');
            this.drawPaths = renderResult.drawPaths;
            this.timeline = this._buildTimeline(this.scene.operations, this.drawPaths);
            this.totalTime = this.timeline.length ? this.timeline[this.timeline.length - 1].tEnd : 0;

            this.marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            this.marker.setAttribute('r', 1.6);
            this.marker.setAttribute('class', 'hw-pen-marker');
            renderResult.svgGroup.appendChild(this.marker);

            for (const dp of this.drawPaths) {
                const ink = dp.path.cloneNode(false);
                ink.setAttribute('class', 'hw-ink');
                ink.removeAttribute('stroke');
                renderResult.svgGroup.appendChild(ink);
                dp.inkPath = ink;
                dp.length = dp.path.getTotalLength ? dp.path.getTotalLength() : this._fallbackLength(dp.points);
                ink.style.strokeDasharray = dp.length;
                ink.style.strokeDashoffset = dp.length;
            }

            this._seek(0);
        }

        _fallbackLength(points) {
            return NS.Bezier.totalLength(points);
        }

        _buildTimeline(operations, drawPaths) {
            const events = [];
            let t = 0;
            let cur = { x: 0, y: 0, z: this.scene.machine.penUpZ };
            let runIndex = -1;
            let runCumLength = 0;

            const runLengthByIndex = {};
            for (const dp of drawPaths) runLengthByIndex[dp.strokeIndex] = 0;

            for (const op of operations) {
                if (op.type === 'PEN_UP' || op.type === 'PEN_DOWN') {
                    const dz = Math.abs(op.z - cur.z);
                    const duration = Math.max(MIN_EVENT_DURATION_MS, (dz / mmPerMinToMmPerMs(op.speed)) || MIN_EVENT_DURATION_MS);
                    events.push({
                        type: op.type, tStart: t, tEnd: t + duration,
                        fromX: cur.x, fromY: cur.y, fromZ: cur.z,
                        toX: cur.x, toY: cur.y, toZ: op.z,
                        speed: op.speed, runIndex: runIndex
                    });
                    t += duration;
                    cur = { x: cur.x, y: cur.y, z: op.z };
                    if (op.type === 'PEN_DOWN') { runIndex++; runCumLength = 0; }
                } else if (op.type === 'MOVE' || op.type === 'DRAW') {
                    const dist = Geometry.distance(cur, { x: op.x, y: op.y });
                    const duration = Math.max(MIN_EVENT_DURATION_MS, (dist / mmPerMinToMmPerMs(op.speed)) || MIN_EVENT_DURATION_MS);
                    const segStart = runCumLength;
                    if (op.type === 'DRAW') runCumLength += dist;
                    events.push({
                        type: op.type, tStart: t, tEnd: t + duration,
                        fromX: cur.x, fromY: cur.y, fromZ: cur.z,
                        toX: op.x, toY: op.y, toZ: op.z !== undefined ? op.z : cur.z,
                        speed: op.speed, runIndex: runIndex,
                        segStart: segStart, segLength: dist
                    });
                    t += duration;
                    cur = { x: op.x, y: op.y, z: op.z !== undefined ? op.z : cur.z };
                }
            }
            return events;
        }

        play() {
            if (this.playing) return;
            if (this.virtualTime >= this.totalTime) this.virtualTime = 0;
            this.playing = true;
            this._lastWallTime = performance.now();
            this._tick();
        }

        pause() {
            this.playing = false;
            if (this._rafId) cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        stop() {
            this.pause();
            this._seek(0);
        }

        setSpeedMultiplier(m) {
            this.speedMultiplier = m;
        }

        seekFraction(fraction) {
            this._seek(Geometry.clamp(fraction, 0, 1) * this.totalTime);
        }

        _tick() {
            if (!this.playing) return;
            const now = performance.now();
            const dt = now - this._lastWallTime;
            this._lastWallTime = now;
            this.virtualTime += dt * this.speedMultiplier;

            if (this.virtualTime >= this.totalTime) {
                this._seek(this.totalTime);
                this.playing = false;
                if (this.onFinish) this.onFinish();
                return;
            }

            this._seek(this.virtualTime);
            this._rafId = requestAnimationFrame(() => this._tick());
        }

        _seek(t) {
            this.virtualTime = t;
            const event = this._findEvent(t);
            if (!event) return;

            const localT = event.tEnd > event.tStart ? Geometry.clamp((t - event.tStart) / (event.tEnd - event.tStart), 0, 1) : 1;
            const x = event.fromX + (event.toX - event.fromX) * localT;
            const y = event.fromY + (event.toY - event.fromY) * localT;
            const z = event.fromZ + (event.toZ - event.fromZ) * localT;

            this.marker.setAttribute('cx', x);
            this.marker.setAttribute('cy', y);
            const penDown = event.type === 'DRAW' || (event.type === 'PEN_DOWN' && localT > 0.5);
            this.marker.setAttribute('class', 'hw-pen-marker' + (penDown ? ' hw-pen-down' : ''));

            this._updateInk(t);

            if (this.onUpdate) {
                this.onUpdate({
                    x: x, y: y, z: z,
                    speed: event.speed,
                    penDown: penDown,
                    opType: event.type,
                    progress: this.totalTime > 0 ? t / this.totalTime : 1
                });
            }
        }

        _updateInk(t) {
            for (const dp of this.drawPaths) {
                if (dp.length <= 0) continue;
                const runStartTime = this._runStartTime(dp.strokeIndex);
                const runEndTime = this._runEndTime(dp.strokeIndex);
                if (t <= runStartTime) {
                    dp.inkPath.style.strokeDashoffset = dp.length;
                } else if (t >= runEndTime) {
                    dp.inkPath.style.strokeDashoffset = 0;
                } else {
                    const drawn = this._drawnLengthAt(dp.strokeIndex, t);
                    dp.inkPath.style.strokeDashoffset = Math.max(0, dp.length - drawn);
                }
            }
        }

        _runStartTime(runIndex) {
            for (const e of this.timeline) if (e.runIndex === runIndex && e.type === 'DRAW') return e.tStart;
            return Infinity;
        }

        _runEndTime(runIndex) {
            let end = -Infinity;
            for (const e of this.timeline) if (e.runIndex === runIndex && e.type === 'DRAW') end = e.tEnd;
            return end;
        }

        _drawnLengthAt(runIndex, t) {
            let length = 0;
            for (const e of this.timeline) {
                if (e.runIndex !== runIndex || e.type !== 'DRAW') continue;
                if (t >= e.tEnd) { length = e.segStart + e.segLength; continue; }
                if (t <= e.tStart) break;
                const localT = (t - e.tStart) / (e.tEnd - e.tStart);
                length = e.segStart + e.segLength * localT;
                break;
            }
            return length;
        }

        _findEvent(t) {
            if (this.timeline.length === 0) return null;
            // sequential scan from cursor - virtual time is monotonic during normal playback
            let i = this._eventCursor;
            if (i >= this.timeline.length || this.timeline[i].tStart > t) i = 0;
            while (i < this.timeline.length - 1 && this.timeline[i].tEnd < t) i++;
            this._eventCursor = i;
            return this.timeline[i];
        }

        destroy() {
            this.pause();
        }
    }

    Simulator.estimateDurationMs = estimateDurationMs;

    NS.Simulator = Simulator;
})(window.Handwriter);
