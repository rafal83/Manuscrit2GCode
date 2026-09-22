/**
 * Controls: binds every DOM input in index.html to the shared config
 * object, and reports changes back to app.js. Knows nothing about the
 * handwriting pipeline itself - purely a two-way binding + event layer.
 *
 * Expensive regeneration is debounced here (sliders/number inputs), while
 * discrete actions (preset buttons, format select, paper format...) notify
 * immediately - see Handwriter.debounce in app.js's usage below.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const HUMANIZATION_SLIDER_KEYS = [
        'glyphVariation', 'sizeVariation', 'rotationVariation', 'baselineDrift',
        'slantDrift', 'letterSpacingVariation', 'wordSpacingVariation',
        'strokeJitterAmplitude', 'speedVariation', 'wordStartVariation',
        'wordEndLift', 'pressureVariation', 'connectionProbability'
    ];

    function $(id) { return document.getElementById(id); }

    function debounce(fn, delay) {
        let t = null;
        return function () {
            const args = arguments;
            clearTimeout(t);
            t = setTimeout(() => fn.apply(null, args), delay);
        };
    }

    class Controls {
        /**
         * @param {object} config live config object (mutated in place)
         * @param {object} callbacks {
         *   onChange(reason), onGenerate, onNewVariation, onExportSvg,
         *   onDownloadGcode, onResetSettings, onViewModeChange(mode),
         *   onZoom(delta), onFitPage, onFitMachine,
         *   onSimPlay, onSimPause, onSimStop, onSimSpeed(n)
         * }
         */
        constructor(config, callbacks) {
            this.config = config;
            this.cb = callbacks;
            this.debouncedChange = debounce(() => this.cb.onChange('input'), 220);
            this._bindAll();
            this.syncFromConfig(config);
        }

        _bindAll() {
            this._bindFontSelect();
            this._bindText();
            this._bindPaper();
            this._bindHumanization();
            this._bindMachine();
            this._bindToolbar();
            this._bindSimBar();
        }

        _bindFontSelect() {
            const select = $('input-font');
            const fonts = NS.FontEngine.listAvailableFonts();
            select.innerHTML = '';
            for (const id of fonts) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = id;
                select.appendChild(opt);
            }
            select.addEventListener('change', () => {
                this.config.fontId = select.value;
                this.cb.onChange('font');
            });
        }

        _bindText() {
            $('input-text').addEventListener('input', (e) => {
                this.config.text = e.target.value;
                this.debouncedChange();
            });

            $('input-seed').addEventListener('input', (e) => {
                const v = parseInt(e.target.value, 10);
                this.config.seed = isNaN(v) ? 0 : v;
                this.debouncedChange();
            });

            $('input-style').addEventListener('change', (e) => {
                this.config.style = e.target.value;
                this.cb.onChange('style');
            });

            const newVariation = () => this.cb.onNewVariation();
            $('btn-new-variation').addEventListener('click', newVariation);
            $('btn-new-variation-2').addEventListener('click', newVariation);
        }

        _bindPaper() {
            const formatSelect = $('input-paper-format');
            const widthInput = $('input-paper-width');
            const heightInput = $('input-paper-height');

            formatSelect.addEventListener('change', () => {
                const format = formatSelect.value;
                this.config.paper.format = format;
                if (format !== 'Custom') {
                    const dims = NS.Presets.PAPER_FORMATS[format];
                    this.config.paper.width = dims.width;
                    this.config.paper.height = dims.height;
                    widthInput.value = dims.width;
                    heightInput.value = dims.height;
                }
                widthInput.disabled = format !== 'Custom';
                heightInput.disabled = format !== 'Custom';
                this.cb.onChange('paper');
            });

            widthInput.addEventListener('input', (e) => {
                this.config.paper.width = parseFloat(e.target.value) || 0;
                this.debouncedChange();
            });
            heightInput.addEventListener('input', (e) => {
                this.config.paper.height = parseFloat(e.target.value) || 0;
                this.debouncedChange();
            });

            const marginMap = {
                'input-margin-top': 'top', 'input-margin-right': 'right',
                'input-margin-bottom': 'bottom', 'input-margin-left': 'left'
            };
            for (const id in marginMap) {
                $(id).addEventListener('input', (e) => {
                    this.config.margins[marginMap[id]] = parseFloat(e.target.value) || 0;
                    this.debouncedChange();
                });
            }

            this._bindRangeWithOutput('input-font-size', 'out-font-size', (v) => { this.config.fontSize = v; }, (v) => v.toFixed(1) + ' mm');
            this._bindRangeWithOutput('input-line-height', 'out-line-height', (v) => { this.config.lineHeight = v; }, (v) => v.toFixed(2) + ' mm');
            this._bindRangeWithOutput('input-letter-spacing', 'out-letter-spacing', (v) => { this.config.letterSpacing = v; }, (v) => v.toFixed(2) + ' mm');
            this._bindRangeWithOutput('input-word-spacing', 'out-word-spacing', (v) => { this.config.wordSpacing = v; }, (v) => v.toFixed(2) + ' mm');
        }

        _bindRangeWithOutput(inputId, outputId, setter, format) {
            const input = $(inputId);
            const output = $(outputId);
            input.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                setter(v);
                if (output) output.textContent = format(v);
                this.debouncedChange();
            });
        }

        _bindHumanization() {
            const levelButtons = document.querySelectorAll('#humanization-level-group .hw-preset-btn');
            levelButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.config.humanizationLevel = btn.dataset.level;
                    NS.Presets.resolveHumanization(this.config);
                    this._syncHumanizationUI();
                    this.cb.onChange('preset');
                });
            });

            $('input-personality').addEventListener('change', (e) => {
                this.config.personality = e.target.value;
                NS.Presets.resolveHumanization(this.config);
                this._syncHumanizationUI();
                this.cb.onChange('personality');
            });

            const sliderEls = document.querySelectorAll('#humanization-sliders .hw-slider');
            sliderEls.forEach(el => {
                const key = el.dataset.key;
                const input = el.querySelector('input');
                const output = el.querySelector('output');
                input.addEventListener('input', () => {
                    const v = parseFloat(input.value);
                    if (key === 'strokeJitterAmplitude') {
                        this.config.humanization.strokeJitter.amplitude = v;
                        output.textContent = v.toFixed(3) + ' mm';
                    } else {
                        this.config.humanization[key] = v;
                        output.textContent = Math.round(v * 100) + '%';
                    }
                    this._clearActivePresetButtons();
                    this.debouncedChange();
                });
            });
        }

        _clearActivePresetButtons() {
            document.querySelectorAll('#humanization-level-group .hw-preset-btn').forEach(b => b.classList.remove('active'));
        }

        _bindMachine() {
            const bind = (id, getter, setter, isFloat) => {
                $(id).addEventListener('input', (e) => {
                    const raw = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                    const v = e.target.type === 'checkbox' ? raw : (isFloat ? parseFloat(raw) : parseInt(raw, 10));
                    setter(isNaN(v) && typeof v === 'number' ? 0 : v);
                    this.debouncedChange();
                });
            };

            $('input-machine-name').addEventListener('input', (e) => { this.config.machine.name = e.target.value; this.debouncedChange(); });
            bind('input-bed-width', null, v => this.config.machine.bedWidth = v, true);
            bind('input-bed-height', null, v => this.config.machine.bedHeight = v, true);
            bind('input-max-x', null, v => this.config.machine.maxX = v, true);
            bind('input-max-y', null, v => this.config.machine.maxY = v, true);
            bind('input-pen-up-z', null, v => { this.config.machine.penUpZ = v; this.config.pen.penUpZ = v; }, true);
            bind('input-pen-down-z', null, v => { this.config.machine.penDownZ = v; this.config.pen.penDownZ = v; }, true);
            bind('input-min-pen-z', null, v => { this.config.machine.minPenZ = v; this.config.pen.minPenZ = v; }, true);
            $('input-pressure-enabled').addEventListener('change', (e) => {
                this.config.pen.pressureEnabled = e.target.checked;
                this.cb.onChange('pen');
            });
            bind('input-base-speed', null, v => { this.config.speed.baseSpeed = v; this.config.machine.drawSpeed = v; }, true);
            bind('input-travel-speed', null, v => { this.config.speed.travelSpeed = v; this.config.machine.travelSpeed = v; }, true);
            bind('input-z-speed', null, v => this.config.machine.zSpeed = v, true);
            bind('input-corner-slowdown', null, v => this.config.speed.cornerSlowdown = v, true);

            bind('input-sheet-x', null, v => this.config.sheet.x = v, true);
            bind('input-sheet-y', null, v => this.config.sheet.y = v, true);
            bind('input-sheet-rotation', null, v => this.config.sheet.rotation = v, true);
            bind('input-decimal-places', null, v => this.config.gcode.decimalPlaces = v, false);

            $('input-start-gcode').addEventListener('input', (e) => {
                this.config.gcode.startGcode = e.target.value;
                this.debouncedChange();
            });
            $('input-end-gcode').addEventListener('input', (e) => {
                this.config.gcode.endGcode = e.target.value;
                this.debouncedChange();
            });

            $('btn-reset-settings').addEventListener('click', () => this.cb.onResetSettings());
        }

        _bindToolbar() {
            $('btn-generate').addEventListener('click', () => this.cb.onGenerate());
            $('input-view-mode').addEventListener('change', (e) => this.cb.onViewModeChange(e.target.value));
            $('btn-zoom-in').addEventListener('click', () => this.cb.onZoom(1.2));
            $('btn-zoom-out').addEventListener('click', () => this.cb.onZoom(1 / 1.2));
            $('btn-fit-page').addEventListener('click', () => this.cb.onFitPage());
            $('btn-fit-machine').addEventListener('click', () => this.cb.onFitMachine());
            $('btn-export-svg').addEventListener('click', () => this.cb.onExportSvg());
            $('btn-download-gcode').addEventListener('click', () => this.cb.onDownloadGcode());
        }

        _bindSimBar() {
            $('btn-sim-play').addEventListener('click', () => this.cb.onSimPlay());
            $('btn-sim-pause').addEventListener('click', () => this.cb.onSimPause());
            $('btn-sim-stop').addEventListener('click', () => this.cb.onSimStop());
            document.querySelectorAll('.hw-sim-speed-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.hw-sim-speed-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.cb.onSimSpeed(parseFloat(btn.dataset.speed));
                });
            });
        }

        /** Populates every input from the given config (used at init and after reset/load). */
        syncFromConfig(config) {
            this.config = config;
            $('input-text').value = config.text;
            $('input-seed').value = config.seed;
            $('input-font').value = config.fontId;
            $('input-style').value = config.style;

            $('input-paper-format').value = config.paper.format;
            $('input-paper-width').value = config.paper.width;
            $('input-paper-height').value = config.paper.height;
            $('input-paper-width').disabled = config.paper.format !== 'Custom';
            $('input-paper-height').disabled = config.paper.format !== 'Custom';

            $('input-margin-top').value = config.margins.top;
            $('input-margin-right').value = config.margins.right;
            $('input-margin-bottom').value = config.margins.bottom;
            $('input-margin-left').value = config.margins.left;

            $('input-font-size').value = config.fontSize;
            $('out-font-size').textContent = config.fontSize.toFixed(1) + ' mm';
            $('input-line-height').value = config.lineHeight;
            $('out-line-height').textContent = config.lineHeight.toFixed(2) + ' mm';
            $('input-letter-spacing').value = config.letterSpacing;
            $('out-letter-spacing').textContent = config.letterSpacing.toFixed(2) + ' mm';
            $('input-word-spacing').value = config.wordSpacing;
            $('out-word-spacing').textContent = config.wordSpacing.toFixed(2) + ' mm';

            $('input-personality').value = config.personality;
            this._syncHumanizationUI();

            $('input-machine-name').value = config.machine.name;
            $('input-bed-width').value = config.machine.bedWidth;
            $('input-bed-height').value = config.machine.bedHeight;
            $('input-max-x').value = config.machine.maxX;
            $('input-max-y').value = config.machine.maxY;
            $('input-pen-up-z').value = config.machine.penUpZ;
            $('input-pen-down-z').value = config.machine.penDownZ;
            $('input-min-pen-z').value = config.machine.minPenZ;
            $('input-pressure-enabled').checked = config.pen.pressureEnabled !== false;
            $('input-base-speed').value = config.speed.baseSpeed;
            $('input-travel-speed').value = config.speed.travelSpeed;
            $('input-z-speed').value = config.machine.zSpeed;
            $('input-corner-slowdown').value = config.speed.cornerSlowdown;
            $('input-sheet-x').value = config.sheet.x;
            $('input-sheet-y').value = config.sheet.y;
            $('input-sheet-rotation').value = config.sheet.rotation;
            $('input-decimal-places').value = config.gcode.decimalPlaces;
            $('input-start-gcode').value = config.gcode.startGcode;
            $('input-end-gcode').value = config.gcode.endGcode;
        }

        _syncHumanizationUI() {
            const h = this.config.humanization;
            document.querySelectorAll('#humanization-level-group .hw-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.level === this.config.humanizationLevel);
            });
            document.querySelectorAll('#humanization-sliders .hw-slider').forEach(el => {
                const key = el.dataset.key;
                const input = el.querySelector('input');
                const output = el.querySelector('output');
                const value = key === 'strokeJitterAmplitude' ? h.strokeJitter.amplitude : h[key];
                input.value = value;
                output.textContent = key === 'strokeJitterAmplitude' ? value.toFixed(3) + ' mm' : Math.round(value * 100) + '%';
            });
        }

        setSeedDisplay(seed) {
            $('input-seed').value = seed;
        }

        setSimSpeedActive(n) {
            document.querySelectorAll('.hw-sim-speed-btn').forEach(b => {
                b.classList.toggle('active', parseFloat(b.dataset.speed) === n);
            });
        }
    }

    NS.Controls = Controls;
    NS.debounce = debounce;
})(window.Handwriter);
