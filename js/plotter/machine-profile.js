/**
 * MachineProfile: describes the physical plotter (bed size, safe travel
 * area, pen Z heights, default speeds). The Neptune 4 Plus pen-plotter
 * profile below is only the default - everything here is meant to be
 * edited by the user and persisted (see ui/storage.js), never hard-coded
 * elsewhere.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const DEFAULT_MACHINE_PROFILE = {
        id: 'neptune4-plus-pen-plotter',
        name: 'Elegoo Neptune 4 Plus (porte-stylo)',
        bedWidth: 330,
        bedHeight: 330,
        minX: 0,
        minY: 0,
        maxX: 320,
        maxY: 320,
        minZ: 0,
        maxZ: 15,
        penUpZ: 5.0,
        penDownZ: 1.0,
        minPenZ: 0.2,
        travelSpeed: 6000,
        drawSpeed: 1800,
        zSpeed: 900,
        startGcode: 'G90\nG21',
        endGcode: 'M84'
    };

    function clonePofile(p) {
        return JSON.parse(JSON.stringify(p));
    }

    const MachineProfile = {
        DEFAULT: DEFAULT_MACHINE_PROFILE,

        createDefault() {
            return clonePofile(DEFAULT_MACHINE_PROFILE);
        },

        /**
         * Checks a flat list of {points:[{x,y,z}]} strokes (already placed
         * in MACHINE coordinates, i.e. after the sheet offset/rotation has
         * been applied) against the machine's travel limits.
         * @returns {{ valid: boolean, minX,maxX,minY,maxY,minZ,maxZ: number, violations: string[] }}
         */
        validate(strokes, machine) {
            const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
            for (const stroke of strokes) {
                for (const p of stroke.points) {
                    if (p.x < bounds.minX) bounds.minX = p.x;
                    if (p.x > bounds.maxX) bounds.maxX = p.x;
                    if (p.y < bounds.minY) bounds.minY = p.y;
                    if (p.y > bounds.maxY) bounds.maxY = p.y;
                    const z = p.z !== undefined ? p.z : machine.penDownZ;
                    if (z < bounds.minZ) bounds.minZ = z;
                    if (z > bounds.maxZ) bounds.maxZ = z;
                }
            }
            if (!isFinite(bounds.minX)) {
                return Object.assign({ valid: true, violations: [] }, bounds);
            }

            const violations = [];
            if (bounds.minX < machine.minX) violations.push('X minimum demandé : ' + bounds.minX.toFixed(1) + ' mm < limite machine ' + machine.minX + ' mm');
            if (bounds.maxX > machine.maxX) violations.push('X maximum demandé : ' + bounds.maxX.toFixed(1) + ' mm > limite machine ' + machine.maxX + ' mm');
            if (bounds.minY < machine.minY) violations.push('Y minimum demandé : ' + bounds.minY.toFixed(1) + ' mm < limite machine ' + machine.minY + ' mm');
            if (bounds.maxY > machine.maxY) violations.push('Y maximum demandé : ' + bounds.maxY.toFixed(1) + ' mm > limite machine ' + machine.maxY + ' mm');
            if (bounds.minZ < machine.minZ) violations.push('Z minimum demandé : ' + bounds.minZ.toFixed(2) + ' mm < limite machine ' + machine.minZ + ' mm');
            if (bounds.maxZ > machine.maxZ) violations.push('Z maximum demandé : ' + bounds.maxZ.toFixed(2) + ' mm > limite machine ' + machine.maxZ + ' mm');

            return Object.assign({ valid: violations.length === 0, violations: violations }, bounds);
        }
    };

    NS.MachineProfile = MachineProfile;
})(window.Handwriter);
