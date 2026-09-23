/**
 * Presets: the canonical shape of the app's configuration object, plus
 * named presets for humanization level and writing "personality". Both are
 * just numeric multiplier sets layered onto the default config - no other
 * module needs to know preset names exist.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const PAPER_FORMATS = {
        A4: { width: 210, height: 297 },
        A5: { width: 148, height: 210 },
        Letter: { width: 215.9, height: 279.4 },
        Custom: { width: 210, height: 297 }
    };

    const HUMANIZATION_LEVELS = {
        regulier: {
            glyphVariation: 0.15, sizeVariation: 0.12, rotationVariation: 0.12,
            baselineDrift: 0.12, slantDrift: 0.08, letterSpacingVariation: 0.15,
            wordSpacingVariation: 0.15, strokeJitter: { amplitude: 0.02, frequency: 2.5 },
            speedVariation: 0.15, wordStartVariation: 0.2, wordEndLift: 0.2,
            pressureVariation: 0.15, connectionProbability: 0.85
        },
        naturel: {
            glyphVariation: 0.5, sizeVariation: 0.4, rotationVariation: 0.45,
            baselineDrift: 0.45, slantDrift: 0.35, letterSpacingVariation: 0.45,
            wordSpacingVariation: 0.5, strokeJitter: { amplitude: 0.06, frequency: 3 },
            speedVariation: 0.45, wordStartVariation: 0.5, wordEndLift: 0.55,
            pressureVariation: 0.4, connectionProbability: 0.9
        },
        manuscrit: {
            glyphVariation: 0.7, sizeVariation: 0.6, rotationVariation: 0.65,
            baselineDrift: 0.65, slantDrift: 0.55, letterSpacingVariation: 0.6,
            wordSpacingVariation: 0.65, strokeJitter: { amplitude: 0.09, frequency: 3.5 },
            speedVariation: 0.6, wordStartVariation: 0.65, wordEndLift: 0.7,
            pressureVariation: 0.55, connectionProbability: 0.92
        },
        tresHumain: {
            glyphVariation: 0.9, sizeVariation: 0.8, rotationVariation: 0.85,
            baselineDrift: 0.85, slantDrift: 0.7, letterSpacingVariation: 0.8,
            wordSpacingVariation: 0.85, strokeJitter: { amplitude: 0.12, frequency: 4 },
            speedVariation: 0.8, wordStartVariation: 0.85, wordEndLift: 0.9,
            pressureVariation: 0.7, connectionProbability: 0.88
        }
    };

    // Personality presets are multipliers applied ON TOP OF the chosen
    // humanization level, plus a speed/connection bias of their own -
    // never allowed to push a level into caricature territory (capped in applyPersonality).
    const PERSONALITIES = {
        soignee: {
            variationMultiplier: 0.55, speedMultiplier: 0.75, connectionBias: -0.05,
            wordEndLiftMultiplier: 0.7
        },
        naturelle: {
            variationMultiplier: 1.0, speedMultiplier: 1.0, connectionBias: 0,
            wordEndLiftMultiplier: 1.0
        },
        rapide: {
            variationMultiplier: 1.05, speedMultiplier: 1.35, connectionBias: 0.06,
            wordEndLiftMultiplier: 1.25
        },
        irreguliere: {
            variationMultiplier: 1.35, speedMultiplier: 1.05, connectionBias: -0.03,
            wordEndLiftMultiplier: 1.1
        }
    };

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    function applyPersonality(levelConfig, personalityName) {
        const p = PERSONALITIES[personalityName] || PERSONALITIES.naturelle;
        const out = {};
        for (const key in levelConfig) {
            const v = levelConfig[key];
            if (key === 'strokeJitter') {
                out.strokeJitter = {
                    amplitude: clampAmplitude(v.amplitude * p.variationMultiplier),
                    frequency: v.frequency
                };
            } else if (key === 'connectionProbability') {
                out.connectionProbability = clamp01(v + p.connectionBias);
            } else if (key === 'wordEndLift') {
                out.wordEndLift = clamp01(v * p.wordEndLiftMultiplier);
            } else {
                out[key] = clamp01(v * p.variationMultiplier);
            }
        }
        return out;
    }

    function clampAmplitude(a) {
        return Math.max(0, Math.min(0.18, a));
    }

    const Presets = {
        PAPER_FORMATS,
        HUMANIZATION_LEVELS,
        PERSONALITIES,
        applyPersonality,

        defaultConfig() {
            const machine = NS.MachineProfile.createDefault();
            return {
                seed: 842931,
                text: 'Bonjour,\n\nVeuillez trouver ci-joint les documents demandés.\n\nCordialement,\nRaphaël',
                fontId: 'handwriting-default',
                style: 'cursive',

                paper: { format: 'A4', width: PAPER_FORMATS.A4.width, height: PAPER_FORMATS.A4.height },
                margins: { top: 20, right: 18, bottom: 20, left: 18 },

                fontSize: 5.2,
                // The default font (Hershey Script) has tall, elegant
                // ascenders/descenders (ascender=116.55, descender=-66.55,
                // vs xHeight=50) - lineHeight must clear that full span
                // (~19mm at fontSize 5.2mm) or lines visually collide.
                lineHeight: 20,
                letterSpacing: 0.4,
                wordSpacing: 3.4,

                humanizationLevel: 'naturel',
                personality: 'naturelle',
                humanization: applyPersonality(HUMANIZATION_LEVELS.naturel, 'naturelle'),

                speed: {
                    baseSpeed: 1700,
                    speedVariation: 0.4,
                    cornerSlowdown: 0.55,
                    wordEndAcceleration: 0.3,
                    travelSpeed: machine.travelSpeed
                },
                pen: {
                    penUpZ: machine.penUpZ,
                    penDownZ: machine.penDownZ,
                    minPenZ: machine.minPenZ,
                    // master on/off switch for Z pressure variation - the
                    // AMOUNT of variation is humanization.pressureVariation;
                    // this lets it be disabled entirely regardless of preset.
                    pressureEnabled: true
                },

                machine: machine,
                sheet: { x: 8, y: 8, rotation: 0 },

                gcode: {
                    decimalPlaces: 3,
                    startGcode: machine.startGcode,
                    endGcode: machine.endGcode
                }
            };
        },

        /**
         * Rebuilds config.humanization from the current level+personality
         * names, keeping everything else untouched.
         */
        resolveHumanization(config) {
            const level = HUMANIZATION_LEVELS[config.humanizationLevel] || HUMANIZATION_LEVELS.naturel;
            config.humanization = applyPersonality(level, config.personality);
            return config;
        }
    };

    NS.Presets = Presets;
})(window.Handwriter);
