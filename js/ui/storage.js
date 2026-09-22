/**
 * Storage: thin wrapper around localStorage for persisting the user's
 * configuration between sessions. Fails silently (falls back to defaults)
 * if localStorage is unavailable (e.g. some strict file:// / privacy
 * contexts) - the app must keep working without it.
 */
window.Handwriter = window.Handwriter || {};

(function (NS) {
    'use strict';

    const STORAGE_KEY = 'handwriter.config.v1';

    function isAvailable() {
        try {
            const testKey = '__handwriter_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    const Storage = {
        available: isAvailable(),

        save(config) {
            if (!Storage.available) return false;
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
                return true;
            } catch (e) {
                return false;
            }
        },

        load() {
            if (!Storage.available) return null;
            try {
                const raw = window.localStorage.getItem(STORAGE_KEY);
                if (!raw) return null;
                return JSON.parse(raw);
            } catch (e) {
                return null;
            }
        },

        clear() {
            if (!Storage.available) return;
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                // ignore
            }
        },

        /**
         * Shallow-merges a saved config onto a freshly built default config,
         * so new fields introduced by an app update always have a sane
         * default even if the saved blob predates them.
         */
        mergeOntoDefaults(defaults, saved) {
            if (!saved) return defaults;
            const merged = JSON.parse(JSON.stringify(defaults));
            deepMerge(merged, saved);
            return merged;
        }
    };

    function deepMerge(target, source) {
        for (const key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            const sv = source[key];
            if (sv !== null && typeof sv === 'object' && !Array.isArray(sv) && target[key] && typeof target[key] === 'object') {
                deepMerge(target[key], sv);
            } else {
                target[key] = sv;
            }
        }
    }

    NS.Storage = Storage;
})(window.Handwriter);
