/**
 * app.js: top-level orchestrator. Owns the live config object, runs the
 * full pipeline (layout -> humanize -> stroke-process -> optimize ->
 * machine transform -> operations -> gcode), and wires the UI. This is the
 * ONLY file allowed to call the pipeline modules directly from UI events -
 * everything else (controls.js) only edits the config object and reports
 * back through callbacks.
 */
(function () {
    'use strict';

    const NS = window.Handwriter;
    const $ = (id) => document.getElementById(id);

    const state = {
        config: null,
        fontEngine: null,
        controls: null,
        simulator: null,
        viewBox: null,
        machineStrokes: [],
        operations: [],
        gcodeText: '',
        validation: { valid: true, violations: [] }
    };

    function init() {
        const defaults = NS.Presets.defaultConfig();
        const saved = NS.Storage.load();
        state.config = NS.Storage.mergeOntoDefaults(defaults, saved);
        // machine profile may be missing brand-new fields on an old saved
        // blob; make sure speed/pen mirror the machine values on first load
        syncDerivedFields(state.config);

        state.controls = new NS.Controls(state.config, {
            onChange: () => generate(),
            onGenerate: () => generate(),
            onNewVariation: () => newVariation(),
            onExportSvg: () => exportSVG(),
            onDownloadGcode: () => downloadGcode(),
            onResetSettings: () => resetSettings(),
            onViewModeChange: (mode) => { state.viewMode = mode; renderPreview(); },
            onZoom: (factor) => zoom(factor),
            onFitPage: () => fitPage(),
            onFitMachine: () => fitMachine(),
            onSimPlay: () => simPlay(),
            onSimPause: () => simPause(),
            onSimStop: () => simStop()
        });

        state.viewMode = 'result';
        generate();
    }

    function syncDerivedFields(config) {
        config.pen.penUpZ = config.machine.penUpZ;
        config.pen.penDownZ = config.machine.penDownZ;
        config.pen.minPenZ = config.machine.minPenZ;
        config.speed.travelSpeed = config.machine.travelSpeed;
        config.machine.drawSpeed = config.speed.baseSpeed;
    }

    // -----------------------------------------------------------------
    // Pipeline
    // -----------------------------------------------------------------

    function generate() {
        const config = state.config;
        syncDerivedFields(config);

        state.fontEngine = new NS.FontEngine(config.fontId);
        const masterRng = new NS.SeededRandom(config.seed);

        const glyphSelector = new NS.GlyphSelector(state.fontEngine, masterRng.child('layout'), config.humanization.glyphVariation);
        const layoutEngine = new NS.TextLayoutEngine(state.fontEngine, glyphSelector);
        const document_ = layoutEngine.layout(config.text, config);

        const humanizer = new NS.HandwritingHumanizer(masterRng.child('humanizer'));
        humanizer.humanize(document_, config);

        const strokeProcessor = new NS.StrokeProcessor(masterRng.child('stroke-processor'));
        let strokes = strokeProcessor.process(document_, config);
        strokes = NS.PathOptimizer.optimize(strokes, { minPointDistance: 0.02, collinearToleranceDeg: 1.2 });

        const machineStrokes = NS.PlotterOperations.transformToMachine(strokes, config.sheet);
        state.machineStrokes = machineStrokes;
        state.validation = NS.MachineProfile.validate(machineStrokes, config.machine);

        const operations = NS.PlotterOperations.build(machineStrokes, config.machine);
        state.operations = operations;

        state.gcodeText = NS.GCodeGenerator.generate(operations, config.gcode);
        $('output-gcode').value = state.gcodeText;

        state.simulator = null; // stale after regeneration
        renderPreview();
        updateWarnings();
        updateStats(document_);

        NS.Storage.save(config);
    }

    function currentScene() {
        const config = state.config;
        return {
            operations: state.operations,
            machine: config.machine,
            sheet: config.sheet,
            page: { width: config.paper.width, height: config.paper.height, margins: config.margins },
            viewMode: state.viewMode
        };
    }

    function renderPreview() {
        const svg = $('preview-svg');
        svg.classList.remove('hw-simulating');
        NS.Renderer.render(svg, currentScene());
        if (!state.viewBox) fitMachine();
        else applyViewBox();
    }

    // -----------------------------------------------------------------
    // Stats & warnings
    // -----------------------------------------------------------------

    function countWords(document_) {
        let n = 0;
        for (const page of document_.pages) for (const line of page.lines) n += line.words.filter(w => w.text.length > 0).length;
        return n;
    }

    function updateStats(document_) {
        const drawLen = NS.PlotterOperations.drawLength(state.machineStrokes);
        const travelLen = NS.PlotterOperations.travelLength(state.operations);
        const strokeCount = state.machineStrokes.length;
        const penLifts = state.operations.filter(o => o.type === 'PEN_UP').length;
        const pointCount = state.operations.filter(o => o.type === 'DRAW').length;
        const durationMs = NS.Simulator.estimateDurationMs(state.operations);
        const v = state.validation;

        const stats = [
            ['Longueur tracée', (drawLen / 1000).toFixed(2) + ' m'],
            ['Longueur déplacements', (travelLen / 1000).toFixed(2) + ' m'],
            ['Traits (strokes)', String(strokeCount)],
            ['Levées de stylo', String(penLifts)],
            ['Mots', String(countWords(document_))],
            ['Durée estimée', formatDuration(durationMs)],
            ['X min / max', v.minX !== undefined && isFinite(v.minX) ? v.minX.toFixed(1) + ' / ' + v.maxX.toFixed(1) + ' mm' : '—'],
            ['Y min / max', v.minY !== undefined && isFinite(v.minY) ? v.minY.toFixed(1) + ' / ' + v.maxY.toFixed(1) + ' mm' : '—'],
            ['Points G-code', String(pointCount)]
        ];

        const panel = $('stats-panel');
        panel.innerHTML = '';
        for (const [label, value] of stats) {
            const div = document.createElement('div');
            div.className = 'hw-stat';
            div.innerHTML = '<span class="hw-stat-value"></span><span class="hw-stat-label"></span>';
            div.querySelector('.hw-stat-value').textContent = value;
            div.querySelector('.hw-stat-label').textContent = label;
            panel.appendChild(div);
        }
    }

    function formatDuration(ms) {
        const totalSec = Math.round(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return m + ' min ' + String(s).padStart(2, '0') + ' s';
    }

    function updateWarnings() {
        const box = $('validation-warnings');
        const violations = state.validation.violations || [];
        const gcodeWarnings = NS.GCodeGenerator.scanForUnsafeCommands(
            (state.config.gcode.startGcode || '') + '\n' + (state.config.gcode.endGcode || '')
        );
        const all = [];
        if (!state.validation.valid) {
            all.push('⚠ Le document dépasse la zone d\'écriture de la machine :');
            for (const v of violations) all.push('• ' + v);
        }
        for (const w of gcodeWarnings) all.push('⚠ G-code personnalisé : ' + w);

        if (all.length === 0) {
            box.hidden = true;
            box.innerHTML = '';
            return;
        }
        box.hidden = false;
        box.innerHTML = all.map(line => '<div>' + escapeHtml(line) + '</div>').join('');
    }

    function escapeHtml(s) {
        return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    }

    // -----------------------------------------------------------------
    // Seed / variation
    // -----------------------------------------------------------------

    function newVariation() {
        // Choosing a fresh top-level seed is a UI-level convenience action,
        // not part of the deterministic writing engine itself (which never
        // calls Math.random()) - it just picks which seed to reproduce.
        state.config.seed = Math.floor(Math.random() * 1000000);
        state.controls.setSeedDisplay(state.config.seed);
        generate();
    }

    // -----------------------------------------------------------------
    // Zoom / fit
    // -----------------------------------------------------------------

    function defaultViewBox() {
        const m = state.config.machine;
        return { x: -15, y: -15, w: m.bedWidth + 30, h: m.bedHeight + 30 };
    }

    function applyViewBox() {
        const svg = $('preview-svg');
        const vb = state.viewBox;
        svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    }

    function fitMachine() {
        state.viewBox = defaultViewBox();
        applyViewBox();
    }

    function fitPage() {
        const config = state.config;
        const machine = config.machine;
        const b = NS.Renderer.pageBounds({ width: config.paper.width, height: config.paper.height }, config.sheet);
        const screenMinY = machine.bedHeight - b.maxY;
        const screenMaxY = machine.bedHeight - b.minY;
        const margin = 8;
        state.viewBox = {
            x: b.minX - margin,
            y: screenMinY - margin,
            w: (b.maxX - b.minX) + margin * 2,
            h: (screenMaxY - screenMinY) + margin * 2
        };
        applyViewBox();
    }

    function zoom(factor) {
        if (!state.viewBox) state.viewBox = defaultViewBox();
        const vb = state.viewBox;
        const newW = NS.Geometry.clamp(vb.w / factor, 15, state.config.machine.bedWidth * 4);
        const newH = vb.h * (newW / vb.w);
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        state.viewBox = { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
        applyViewBox();
    }

    // -----------------------------------------------------------------
    // Simulation
    // -----------------------------------------------------------------

    function ensureSimulator() {
        if (state.simulator) return state.simulator;
        const svg = $('preview-svg');
        const sim = new NS.Simulator(svg, currentScene());
        sim.onUpdate = (s) => {
            $('sim-progress-bar').style.width = (s.progress * 100).toFixed(1) + '%';
            $('sim-readout').firstChild.textContent =
                'X: ' + s.x.toFixed(1) + ' Y: ' + s.y.toFixed(1) + ' Z: ' + s.z.toFixed(2) + ' F: ' + Math.round(s.speed) + ' ';
            $('sim-pen-state').textContent = s.penDown ? 'PEN DOWN' : 'PEN UP';
        };
        sim.onFinish = () => {};
        state.simulator = sim;
        return sim;
    }

    function simPlay() { ensureSimulator().play(); }
    function simPause() { if (state.simulator) state.simulator.pause(); }
    function simStop() {
        if (state.simulator) state.simulator.stop();
        $('sim-progress-bar').style.width = '0%';
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.hw-sim-speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (state.simulator) state.simulator.setSpeedMultiplier(parseFloat(btn.dataset.speed));
            });
        });
    });

    // -----------------------------------------------------------------
    // Export / download
    // -----------------------------------------------------------------

    function downloadBlob(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    function exportSVG() {
        const svgText = NS.Renderer.buildStandaloneSVG(currentScene());
        downloadBlob('handwriting.svg', svgText, 'image/svg+xml');
    }

    function downloadGcode() {
        if (!state.validation.valid) {
            const proceed = window.confirm(
                'Le tracé dépasse la zone d\'écriture de la machine. Télécharger quand même ?'
            );
            if (!proceed) return;
        }
        downloadBlob('handwriting.gcode', state.gcodeText, 'text/plain');
    }

    // -----------------------------------------------------------------
    // Reset
    // -----------------------------------------------------------------

    function resetSettings() {
        NS.Storage.clear();
        state.config = NS.Presets.defaultConfig();
        state.viewBox = null;
        state.controls.syncFromConfig(state.config);
        generate();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
