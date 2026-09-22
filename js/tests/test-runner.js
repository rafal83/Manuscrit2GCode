/**
 * Minimal homemade test runner - no dependency, works from file://.
 * Usage: TestRunner.test('name', fn) to register, TestRunner.run() to
 * execute everything and render a report into #test-results.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const tests = [];

    function test(name, fn) {
        tests.push({ name, fn });
    }

    function assertTrue(cond, message) {
        if (!cond) throw new Error(message || 'Expected true, got false');
    }

    function assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error((message || 'Values differ') + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
        }
    }

    function assertClose(actual, expected, epsilon, message) {
        epsilon = epsilon === undefined ? 1e-6 : epsilon;
        if (Math.abs(actual - expected) > epsilon) {
            throw new Error((message || 'Values not close') + ' — expected ~' + expected + ', got ' + actual);
        }
    }

    function assertThrows(fn, message) {
        let threw = false;
        try { fn(); } catch (e) { threw = true; }
        if (!threw) throw new Error(message || 'Expected function to throw');
    }

    function run() {
        const results = [];
        let passed = 0;
        for (const t of tests) {
            const start = performance.now();
            try {
                t.fn({ assertTrue, assertEqual, assertClose, assertThrows });
                results.push({ name: t.name, ok: true, ms: performance.now() - start });
                passed++;
            } catch (e) {
                results.push({ name: t.name, ok: false, error: e.message, ms: performance.now() - start });
            }
        }
        render(results, passed, tests.length);
        return { passed, total: tests.length, results };
    }

    function render(results, passed, total) {
        const container = document.getElementById('test-results');
        if (!container) return;
        container.innerHTML = '';

        const summary = document.createElement('div');
        summary.className = 'summary ' + (passed === total ? 'all-pass' : 'has-fail');
        summary.textContent = passed + ' / ' + total + ' tests passed';
        container.appendChild(summary);

        const list = document.createElement('ul');
        for (const r of results) {
            const li = document.createElement('li');
            li.className = r.ok ? 'pass' : 'fail';
            li.textContent = (r.ok ? '✓ ' : '✗ ') + r.name + (r.ok ? '' : ' — ' + r.error) + '  (' + r.ms.toFixed(1) + ' ms)';
            list.appendChild(li);
        }
        container.appendChild(list);
    }

    NS.TestRunner = { test, run, assertTrue, assertEqual, assertClose, assertThrows };
})(window.Handwriter);
