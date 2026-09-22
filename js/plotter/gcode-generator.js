/**
 * GCodeGenerator: pure translation of PlotterOperation[] into G-code text.
 * Never invents geometry or timing decisions of its own - everything it
 * emits is already decided upstream (StrokeProcessor / PlotterOperations).
 *
 * Safety (Klipper / Neptune 4 pen plotter, no extruder):
 *  - default start G-code is only G90 + G21 (absolute positioning, mm)
 *  - never emits E, M104, M109, or any homing command
 *  - custom start/end G-code is scanned and flagged (not blocked) if it
 *    contains anything that looks unsafe for a bare pen plotter
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const DEFAULT_START = 'G90\nG21';
    const DEFAULT_END = 'M84';

    const UNSAFE_PATTERNS = [
        { re: /\bG28\s*Z/i, message: 'G28 Z (homing Z) : le stylo peut heurter la buse si le porte-stylo dépasse.' },
        { re: /\bM104\b/i, message: 'M104 (température extrudeur) : inutile et potentiellement dangereux sur un plotter stylo.' },
        { re: /\bM109\b/i, message: 'M109 (attente température extrudeur) : inutile sur un plotter stylo.' },
        { re: /\bG1\b[^\n]*\bE-?\d/i, message: 'Commande G1 avec E (extrusion) détectée.' }
    ];

    function formatNumber(n, decimals) {
        return n.toFixed(decimals);
    }

    const GCodeGenerator = {
        DEFAULT_START,
        DEFAULT_END,

        /**
         * @param {Array<object>} operations from PlotterOperations.build()
         * @param {object} config { decimalPlaces, startGcode, endGcode }
         * @returns {string}
         */
        generate(operations, config) {
            const decimals = config.decimalPlaces !== undefined ? config.decimalPlaces : 3;
            const startGcode = config.startGcode !== undefined ? config.startGcode : DEFAULT_START;
            const endGcode = config.endGcode !== undefined ? config.endGcode : DEFAULT_END;

            const lines = [];
            if (startGcode.trim().length) lines.push(startGcode.trimEnd());
            lines.push('');

            let lastFeed = null;

            for (const op of operations) {
                if (op.type === 'PEN_UP' || op.type === 'PEN_DOWN') {
                    const cmd = op.type === 'PEN_UP' ? 'G0' : 'G1';
                    let line = cmd + ' Z' + formatNumber(op.z, decimals);
                    line += appendFeed(op.speed, lastFeed, decimals);
                    lastFeed = op.speed;
                    lines.push(line);
                } else if (op.type === 'MOVE' || op.type === 'DRAW') {
                    const cmd = op.type === 'MOVE' ? 'G0' : 'G1';
                    let line = cmd + ' X' + formatNumber(op.x, decimals) + ' Y' + formatNumber(op.y, decimals);
                    if (op.z !== undefined) line += ' Z' + formatNumber(op.z, decimals);
                    line += appendFeed(op.speed, lastFeed, decimals);
                    lastFeed = op.speed;
                    lines.push(line);
                }
            }

            if (endGcode.trim().length) {
                lines.push('');
                lines.push(endGcode.trimEnd());
            }

            return lines.join('\n') + '\n';
        },

        /**
         * Scans arbitrary (possibly user-edited) start/end G-code for
         * commands that are unsafe or meaningless on a bare pen plotter.
         * Never blocks generation - only used to surface a warning in the UI.
         */
        scanForUnsafeCommands(gcodeText) {
            const warnings = [];
            if (!gcodeText) return warnings;
            for (const pattern of UNSAFE_PATTERNS) {
                if (pattern.re.test(gcodeText)) warnings.push(pattern.message);
            }
            return warnings;
        }
    };

    function appendFeed(speed, lastFeed, decimals) {
        if (speed === undefined || speed === null) return '';
        const rounded = Math.round(speed);
        if (lastFeed !== null && Math.round(lastFeed) === rounded) return '';
        return ' F' + rounded;
    }

    NS.GCodeGenerator = GCodeGenerator;
})(window.Handwriter);
