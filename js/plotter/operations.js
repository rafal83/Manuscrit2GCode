/**
 * PlotterOperations: the last vector representation before G-code text.
 * Turns page-space stroke point lists into an ordered list of explicit
 * plotter operations (PEN_UP / MOVE / PEN_DOWN / DRAW), after applying the
 * sheet's position/rotation on the machine bed (the only place in the
 * pipeline that needs to know about machine coordinates).
 *
 * Both GCodeGenerator and the on-screen Simulator consume exactly this
 * list, so they can never show something different from what gets plotted.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const Geometry = NS.Geometry;

    const PlotterOperations = {
        /**
         * Maps page-local (x,y) millimeters (origin = bottom-left of the
         * PAPER) to machine bed millimeters, applying the sheet's placement.
         * @param {Array<{points:Array}>} strokes
         * @param {{x:number,y:number,rotation:number}} sheet rotation in degrees
         */
        transformToMachine(strokes, sheet) {
            const rot = Geometry.degToRad(sheet.rotation || 0);
            const origin = { x: 0, y: 0 };
            return strokes.map(stroke => ({
                points: stroke.points.map(p => {
                    const rotated = Geometry.rotatePoint({ x: p.x, y: p.y }, origin, rot);
                    return {
                        x: rotated.x + sheet.x,
                        y: rotated.y + sheet.y,
                        z: p.z,
                        speed: p.speed
                    };
                })
            }));
        },

        /**
         * @param {Array<{points:Array<{x,y,z,speed}>}>} machineStrokes already in machine coordinates
         * @param {object} machine MachineProfile instance (penUpZ, penDownZ, travelSpeed, zSpeed)
         * @returns {Array<object>} operations
         */
        build(machineStrokes, machine) {
            const ops = [];
            ops.push({ type: 'PEN_UP', z: machine.penUpZ, speed: machine.zSpeed });

            for (const stroke of machineStrokes) {
                const points = stroke.points;
                if (!points || points.length === 0) continue;
                const first = points[0];

                ops.push({ type: 'MOVE', x: first.x, y: first.y, speed: machine.travelSpeed });
                ops.push({ type: 'PEN_DOWN', z: clampZ(first.z, machine), speed: machine.zSpeed });

                if (points.length === 1) {
                    ops.push({ type: 'DRAW', x: first.x, y: first.y, z: clampZ(first.z, machine), speed: machine.drawSpeed });
                } else {
                    for (let i = 1; i < points.length; i++) {
                        const p = points[i];
                        ops.push({ type: 'DRAW', x: p.x, y: p.y, z: clampZ(p.z, machine), speed: p.speed || machine.drawSpeed });
                    }
                }

                ops.push({ type: 'PEN_UP', z: machine.penUpZ, speed: machine.zSpeed });
            }

            return ops;
        },

        /** Total pen-down (drawing) path length in mm, across all strokes. */
        drawLength(machineStrokes) {
            let len = 0;
            for (const stroke of machineStrokes) len += NS.Bezier.totalLength(stroke.points);
            return len;
        },

        /** Total travel (pen-up move) length in mm, derived from the operation list. */
        travelLength(operations) {
            let len = 0;
            let last = null;
            for (const op of operations) {
                if (op.type === 'MOVE') {
                    if (last) len += Geometry.distance(last, op);
                    last = op;
                } else if (op.type === 'DRAW') {
                    last = op;
                }
            }
            return len;
        }
    };

    function clampZ(z, machine) {
        if (z === undefined) return machine.penDownZ;
        return Geometry.clamp(z, machine.minPenZ, machine.penUpZ);
    }

    NS.PlotterOperations = PlotterOperations;
})(window.Handwriter);
