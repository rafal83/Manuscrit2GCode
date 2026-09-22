/**
 * Test cases for the handwriting pipeline. Registered with
 * Handwriter.TestRunner and executed by tests.html - no build step, no
 * Node, just open tests.html directly in a browser.
 */
(function () {
    'use strict';

    const NS = window.Handwriter;
    const T = NS.TestRunner;

    // -----------------------------------------------------------------
    // SeededRandom
    // -----------------------------------------------------------------

    T.test('SeededRandom: same seed produces identical sequences', ({ assertEqual }) => {
        const a = new NS.SeededRandom(12345);
        const b = new NS.SeededRandom(12345);
        for (let i = 0; i < 50; i++) {
            assertEqual(a.next(), b.next(), 'sequence diverged at index ' + i);
        }
    });

    T.test('SeededRandom: different seeds produce different sequences', ({ assertTrue }) => {
        const a = new NS.SeededRandom(1);
        const b = new NS.SeededRandom(2);
        let differs = false;
        for (let i = 0; i < 20; i++) {
            if (a.next() !== b.next()) { differs = true; break; }
        }
        assertTrue(differs, 'two different seeds produced the same sequence');
    });

    T.test('SeededRandom: range() stays within bounds', ({ assertTrue }) => {
        const r = new NS.SeededRandom(999);
        for (let i = 0; i < 500; i++) {
            const v = r.range(-3, 7);
            assertTrue(v >= -3 && v < 7, 'value ' + v + ' out of [-3,7)');
        }
    });

    T.test('SeededRandom: int() is inclusive on both ends over many draws', ({ assertTrue }) => {
        const r = new NS.SeededRandom(42);
        let sawMin = false, sawMax = false;
        for (let i = 0; i < 500; i++) {
            const v = r.int(0, 3);
            assertTrue(v >= 0 && v <= 3, 'int out of range: ' + v);
            if (v === 0) sawMin = true;
            if (v === 3) sawMax = true;
        }
        assertTrue(sawMin && sawMax, 'int(0,3) never hit both bounds over 500 draws');
    });

    T.test('SeededRandom: child streams are deterministic and distinct', ({ assertEqual, assertTrue }) => {
        const r1 = new NS.SeededRandom(555);
        const r2 = new NS.SeededRandom(555);
        assertEqual(r1.child('foo').next(), r2.child('foo').next(), 'same label should reproduce');
        const a = new NS.SeededRandom(555).child('foo').next();
        const b = new NS.SeededRandom(555).child('bar').next();
        assertTrue(a !== b, 'different labels should (almost certainly) diverge');
    });

    // -----------------------------------------------------------------
    // Noise
    // -----------------------------------------------------------------

    T.test('ValueNoise1D: reproducible from the same SeededRandom seed', ({ assertEqual }) => {
        const n1 = new NS.Noise.ValueNoise1D(new NS.SeededRandom(7), 32);
        const n2 = new NS.Noise.ValueNoise1D(new NS.SeededRandom(7), 32);
        for (let t = 0; t < 5; t += 0.37) {
            assertEqual(n1.sample(t, 2), n2.sample(t, 2), 'noise diverged at t=' + t);
        }
    });

    T.test('BoundedDrift: never exceeds its configured amplitude', ({ assertTrue }) => {
        const drift = new NS.Noise.BoundedDrift(new NS.SeededRandom(3), { amplitude: 0.5, smoothing: 0.8 });
        for (let t = 0; t < 200; t += 0.5) {
            const v = drift.at(t);
            assertTrue(Math.abs(v) <= 0.5 + 1e-9, 'drift ' + v + ' exceeded amplitude 0.5 at t=' + t);
        }
    });

    T.test('BoundedDrift: is smooth (small step-to-step delta), not independent jitter', ({ assertTrue }) => {
        const drift = new NS.Noise.BoundedDrift(new NS.SeededRandom(3), { amplitude: 1, smoothing: 0.9 });
        let prev = drift.at(0);
        let maxDelta = 0;
        for (let t = 0.05; t < 20; t += 0.05) {
            const v = drift.at(t);
            maxDelta = Math.max(maxDelta, Math.abs(v - prev));
            prev = v;
        }
        assertTrue(maxDelta < 0.3, 'drift jumped by ' + maxDelta + ' in a single small step - looks like independent noise, not correlated drift');
    });

    // -----------------------------------------------------------------
    // Geometry
    // -----------------------------------------------------------------

    T.test('Geometry.rotatePoint: 90deg rotation around origin', ({ assertClose }) => {
        const p = NS.Geometry.rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
        assertClose(p.x, 0, 1e-9);
        assertClose(p.y, 1, 1e-9);
    });

    T.test('Geometry.applyTransform: scale then rotate then translate composes correctly', ({ assertClose }) => {
        const p = NS.Geometry.applyTransform({ x: 10, y: 0 }, { scaleX: 2, scaleY: 2, rotation: Math.PI / 2, x: 5, y: 5 });
        // (10,0) * scale2 = (20,0) -> rotate 90 = (0,20) -> translate (+5,+5) = (5,25)
        assertClose(p.x, 5, 1e-6);
        assertClose(p.y, 25, 1e-6);
    });

    T.test('Geometry.boundsOfPoints: computes correct min/max', ({ assertEqual }) => {
        const b = NS.Geometry.boundsOfPoints([{ x: 1, y: 5 }, { x: -2, y: 3 }, { x: 4, y: -1 }]);
        assertEqual(b.minX, -2);
        assertEqual(b.maxX, 4);
        assertEqual(b.minY, -1);
        assertEqual(b.maxY, 5);
    });

    T.test('Geometry.clamp: bounds values correctly', ({ assertEqual }) => {
        assertEqual(NS.Geometry.clamp(5, 0, 3), 3);
        assertEqual(NS.Geometry.clamp(-5, 0, 3), 0);
        assertEqual(NS.Geometry.clamp(1, 0, 3), 1);
    });

    // -----------------------------------------------------------------
    // Bezier sampling
    // -----------------------------------------------------------------

    T.test('Bezier.sampleSegments: a straight line produces its two endpoints', ({ assertEqual, assertTrue }) => {
        const pts = NS.Bezier.sampleSegments([{ type: 'M', x: 0, y: 0 }, { type: 'L', x: 10, y: 0 }]);
        assertEqual(pts[0].x, 0);
        assertTrue(pts[pts.length - 1].x === 10);
    });

    T.test('Bezier.sampleSegments: a quadratic curve stays within its control polygon bounding box', ({ assertTrue }) => {
        const pts = NS.Bezier.sampleSegments([
            { type: 'M', x: 0, y: 0 },
            { type: 'Q', x1: 5, y1: 20, x: 10, y: 0 }
        ]);
        for (const p of pts) {
            assertTrue(p.x >= -0.01 && p.x <= 10.01, 'x out of range: ' + p.x);
            assertTrue(p.y >= -0.01 && p.y <= 20.01, 'y out of range: ' + p.y);
        }
    });

    // -----------------------------------------------------------------
    // FontEngine / GlyphSelector
    // -----------------------------------------------------------------

    T.test('FontEngine: default font loads and exposes known glyphs', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        assertTrue(font.hasGlyph('e'), 'font should have a glyph for "e"');
        assertTrue(font.hasGlyph('a'), 'font should have a glyph for "a"');
        assertTrue(font.getGlyph('e').variants.length >= 3, 'e should have at least 3 variants');
    });

    T.test('GlyphSelector: never repeats the same variant twice in a row', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const rng = new NS.SeededRandom(2024);
        const selector = new NS.GlyphSelector(font, rng, 0.7);
        let lastId = null;
        for (let i = 0; i < 200; i++) {
            const v = selector.selectVariant('e', { position: 'middle' });
            if (lastId !== null) {
                assertTrue(v.id !== lastId, 'variant "' + v.id + '" repeated immediately (hard anti-repetition rule violated)');
            }
            lastId = v.id;
        }
    });

    T.test('GlyphSelector: uses more than one variant over many draws (not degenerate)', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const rng = new NS.SeededRandom(77);
        const selector = new NS.GlyphSelector(font, rng, 0.5);
        const seen = new Set();
        for (let i = 0; i < 100; i++) seen.add(selector.selectVariant('a', { position: 'isolated' }).id);
        assertTrue(seen.size >= 2, 'expected at least 2 distinct variants of "a" over 100 draws, got ' + seen.size);
    });

    T.test('GlyphSelector: reset() clears history so a fresh document does not inherit bias', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const rng = new NS.SeededRandom(5);
        const selector = new NS.GlyphSelector(font, rng, 0.5);
        selector.selectVariant('e', { position: 'middle' });
        selector.reset();
        assertTrue(selector.history.size === 0, 'history should be empty after reset()');
    });

    // -----------------------------------------------------------------
    // Layout
    // -----------------------------------------------------------------

    function testConfig(overrides) {
        const base = NS.Presets.defaultConfig();
        return Object.assign(base, overrides || {});
    }

    T.test('TextLayoutEngine: empty text produces one empty page without throwing', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const selector = new NS.GlyphSelector(font, new NS.SeededRandom(1), 0.5);
        const layout = new NS.TextLayoutEngine(font, selector);
        const doc = layout.layout('', testConfig());
        assertTrue(doc.pages.length >= 1, 'expected at least one page');
    });

    T.test('TextLayoutEngine: glyph X positions are monotonically increasing within a word', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const selector = new NS.GlyphSelector(font, new NS.SeededRandom(1), 0.5);
        const layout = new NS.TextLayoutEngine(font, selector);
        const doc = layout.layout('bonjour', testConfig());
        const word = doc.pages[0].lines[0].words[0];
        for (let i = 1; i < word.glyphs.length; i++) {
            assertTrue(word.glyphs[i].x > word.glyphs[i - 1].x, 'glyph x did not increase at index ' + i);
        }
    });

    T.test('TextLayoutEngine: long text wraps onto multiple lines', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const selector = new NS.GlyphSelector(font, new NS.SeededRandom(1), 0.5);
        const layout = new NS.TextLayoutEngine(font, selector);
        const words = [];
        for (let i = 0; i < 40; i++) words.push('mot');
        const doc = layout.layout(words.join(' '), testConfig());
        const totalLines = doc.pages.reduce((n, p) => n + p.lines.length, 0);
        assertTrue(totalLines > 1, 'expected wrapping to produce multiple lines, got ' + totalLines);
    });

    T.test('TextLayoutEngine: overflowing text creates additional pages', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const selector = new NS.GlyphSelector(font, new NS.SeededRandom(1), 0.5);
        const layout = new NS.TextLayoutEngine(font, selector);
        let text = '';
        for (let i = 0; i < 80; i++) text += 'une ligne de texte assez longue pour remplir la page\n';
        const doc = layout.layout(text, testConfig());
        assertTrue(doc.pages.length > 1, 'expected multiple pages, got ' + doc.pages.length);
    });

    // -----------------------------------------------------------------
    // Full pipeline -> PlotterOperations
    // -----------------------------------------------------------------

    function runPipeline(text, configOverrides) {
        const config = testConfig(configOverrides);
        const font = new NS.FontEngine(config.fontId);
        const rng = new NS.SeededRandom(config.seed);
        const selector = new NS.GlyphSelector(font, rng.child('layout'), config.humanization.glyphVariation);
        const layout = new NS.TextLayoutEngine(font, selector);
        const doc = layout.layout(text, config);
        const humanizer = new NS.HandwritingHumanizer(rng.child('humanizer'));
        humanizer.humanize(doc, config);
        const processor = new NS.StrokeProcessor(rng.child('stroke-processor'));
        let strokes = processor.process(doc, config);
        strokes = NS.PathOptimizer.optimize(strokes);
        const machineStrokes = NS.PlotterOperations.transformToMachine(strokes, config.sheet);
        const operations = NS.PlotterOperations.build(machineStrokes, config.machine);
        return { config, doc, strokes, machineStrokes, operations };
    }

    T.test('Pipeline: produces a PEN_UP/MOVE/PEN_DOWN/DRAW operation sequence', ({ assertTrue, assertEqual }) => {
        const { operations } = runPipeline('abc');
        assertEqual(operations[0].type, 'PEN_UP', 'first operation should be a safety PEN_UP');
        let sawMove = false, sawDown = false, sawDraw = false;
        for (const op of operations) {
            if (op.type === 'MOVE') sawMove = true;
            if (op.type === 'PEN_DOWN') sawDown = true;
            if (op.type === 'DRAW') sawDraw = true;
        }
        assertTrue(sawMove && sawDown && sawDraw, 'expected MOVE, PEN_DOWN and DRAW operations to all appear');
    });

    T.test('Pipeline: every PEN_DOWN is eventually followed by a PEN_UP before the next MOVE', ({ assertTrue }) => {
        const { operations } = runPipeline('bonjour');
        let penIsDown = false;
        for (const op of operations) {
            if (op.type === 'PEN_DOWN') penIsDown = true;
            if (op.type === 'PEN_UP') penIsDown = false;
            if (op.type === 'MOVE') assertTrue(!penIsDown, 'MOVE happened while pen was still down');
        }
    });

    T.test('Pipeline: identical seed produces identical operation coordinates (determinism)', ({ assertEqual }) => {
        const a = runPipeline('Bonjour Raphael', { seed: 42 });
        const b = runPipeline('Bonjour Raphael', { seed: 42 });
        assertEqual(a.operations.length, b.operations.length, 'operation counts differ');
        for (let i = 0; i < a.operations.length; i += 17) {
            assertEqual(JSON.stringify(a.operations[i]), JSON.stringify(b.operations[i]), 'operation ' + i + ' differs');
        }
    });

    T.test('Pipeline: different seeds produce different glyph choices or geometry', ({ assertTrue }) => {
        const a = runPipeline('elle est belle', { seed: 1 });
        const b = runPipeline('elle est belle', { seed: 2 });
        assertTrue(JSON.stringify(a.operations) !== JSON.stringify(b.operations), 'two different seeds produced identical output');
    });

    T.test('Pipeline: repeated letters in one word do not all use the same glyph variant', ({ assertTrue }) => {
        const font = new NS.FontEngine('handwriting-default');
        const rng = new NS.SeededRandom(2024);
        const selector = new NS.GlyphSelector(font, rng.child('layout'), 0.6);
        const layout = new NS.TextLayoutEngine(font, selector);
        const doc = layout.layout('elle est belle', testConfig({ seed: 2024 }));
        const eVariants = [];
        for (const page of doc.pages) for (const line of page.lines) for (const word of line.words) {
            for (const g of word.glyphs) if (g.character === 'e' && g.variant) eVariants.push(g.variant.id);
        }
        assertTrue(eVariants.length >= 4, 'expected several "e" occurrences in the sample text');
        const distinct = new Set(eVariants);
        assertTrue(distinct.size >= 2, 'all "e" occurrences used the exact same variant: ' + eVariants.join(','));
    });

    // -----------------------------------------------------------------
    // GCodeGenerator
    // -----------------------------------------------------------------

    T.test('GCodeGenerator: default output contains no extrusion or heater commands', ({ assertTrue }) => {
        const { operations, config } = runPipeline('Bonjour');
        const gcode = NS.GCodeGenerator.generate(operations, config.gcode);
        assertTrue(!/\bE-?\d/.test(gcode), 'found an E (extrusion) command');
        assertTrue(!/M104|M109/.test(gcode), 'found a heater command');
        assertTrue(!/G28\s*Z/i.test(gcode), 'found a Z-homing command');
    });

    T.test('GCodeGenerator: starts with the configured start G-code', ({ assertTrue }) => {
        const { operations, config } = runPipeline('Bonjour');
        const gcode = NS.GCodeGenerator.generate(operations, config.gcode);
        assertTrue(gcode.trim().startsWith('G90'), 'expected G-code to start with G90');
    });

    T.test('GCodeGenerator: respects the configured decimal precision', ({ assertTrue }) => {
        const { operations, config } = runPipeline('Bonjour');
        config.gcode.decimalPlaces = 2;
        const gcode = NS.GCodeGenerator.generate(operations, config.gcode);
        const match = gcode.match(/X(-?\d+\.\d+)/);
        assertTrue(!!match, 'expected at least one X coordinate in the output');
        const decimals = match[1].split('.')[1].length;
        assertTrue(decimals === 2, 'expected 2 decimal places, got ' + decimals);
    });

    T.test('GCodeGenerator.scanForUnsafeCommands: flags G28 Z, M104, M109 and extrusion', ({ assertTrue }) => {
        const warnings = NS.GCodeGenerator.scanForUnsafeCommands('G28 Z\nM104 S200\nM109 S200\nG1 X1 E5');
        assertTrue(warnings.length >= 3, 'expected multiple warnings, got ' + warnings.length);
    });

    T.test('GCodeGenerator.scanForUnsafeCommands: default start/end G-code is clean', ({ assertTrue }) => {
        const warnings = NS.GCodeGenerator.scanForUnsafeCommands(NS.GCodeGenerator.DEFAULT_START + '\n' + NS.GCodeGenerator.DEFAULT_END);
        assertTrue(warnings.length === 0, 'default G-code should never trigger a safety warning, got: ' + warnings.join('; '));
    });

    // -----------------------------------------------------------------
    // Machine limits
    // -----------------------------------------------------------------

    T.test('MachineProfile.validate: passes for strokes safely within bounds', ({ assertTrue }) => {
        const machine = NS.MachineProfile.createDefault();
        const strokes = [{ points: [{ x: 10, y: 10, z: machine.penDownZ }, { x: 20, y: 20, z: machine.penDownZ }] }];
        const result = NS.MachineProfile.validate(strokes, machine);
        assertTrue(result.valid, 'expected a compliant stroke set to validate');
    });

    T.test('MachineProfile.validate: flags an X coordinate beyond maxX', ({ assertTrue }) => {
        const machine = NS.MachineProfile.createDefault();
        const strokes = [{ points: [{ x: machine.maxX + 50, y: 10, z: machine.penDownZ }] }];
        const result = NS.MachineProfile.validate(strokes, machine);
        assertTrue(!result.valid && result.violations.length > 0, 'expected an out-of-range X to be flagged');
    });

    T.test('MachineProfile.validate: never lets Z go below the configured minPenZ floor', ({ assertTrue }) => {
        const machine = NS.MachineProfile.createDefault();
        const strokes = [{ points: [{ x: 10, y: 10, z: machine.minPenZ - 5 }] }];
        const result = NS.MachineProfile.validate(strokes, machine);
        assertTrue(!result.valid, 'expected a Z below minPenZ to be flagged as a violation');
    });

    T.test('PlotterOperations.build: clamps drawn Z within [minPenZ, penUpZ] regardless of input', ({ assertTrue }) => {
        const machine = NS.MachineProfile.createDefault();
        const strokes = [{ points: [{ x: 10, y: 10, z: -999, speed: 1000 }, { x: 12, y: 12, z: 999, speed: 1000 }] }];
        const ops = NS.PlotterOperations.build(strokes, machine);
        for (const op of ops) {
            if (op.z !== undefined) {
                assertTrue(op.z >= machine.minPenZ - 1e-6 && op.z <= machine.penUpZ + 1e-6, 'Z ' + op.z + ' escaped the safe range');
            }
        }
    });
})();
