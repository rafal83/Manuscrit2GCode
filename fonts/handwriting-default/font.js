/**
 * Default demo handwriting font ("handwriting-default").
 *
 * Design space (glyph units, NOT millimeters - scaled at layout time):
 *   unitsPerEm = 100, Y-up, baseline = 0
 *   xHeight = 50 (top of a,c,e,m,n,o,r,s,u,v,w,x,z)
 *   ascender = 72 (top of b,d,f,h,k,l,t and uppercase-ish strokes)
 *   capHeight = 68 (top of uppercase letters)
 *   descender = -24 (bottom of g,j,p,q,y)
 *
 * Authored with js/fonts/font-authoring-kit.js helpers (M/L/Q/C + elliptical
 * arcs) so bowls and loops stay geometrically clean. Each character can
 * have several *genuinely different* hand-drawn variants (not just
 * transforms of one shape) - see 'a', 'e', 's', 't' below in particular.
 *
 * anchorIn / anchorOut mark where a cursive connector stroke may join this
 * glyph to its neighbours; null means "don't try to join here" (natural
 * pen lift), used for round/bowl letters where a joining stroke would look
 * wrong in this semi-cursive style.
 */
(function () {
    'use strict';

    var K = window.Handwriter.FontAuthoringKit;
    var buildStroke = K.buildStroke;
    var pt = K.ellipsePoint;

    function S(segments, width, metadata) {
        return { segments: segments, width: width || 1, metadata: metadata || {} };
    }

    function V(id, advance, strokes, opts) {
        opts = opts || {};
        return {
            id: id,
            advance: advance,
            anchorIn: opts.anchorIn || null,
            anchorOut: opts.anchorOut || null,
            contexts: opts.contexts || null,
            strokes: strokes
        };
    }

    var glyphs = {};

    function addGlyph(character, variants) {
        glyphs[character] = { character: character, variants: variants };
    }

    // ---------------------------------------------------------------
    // Whitespace & basic punctuation
    // ---------------------------------------------------------------

    addGlyph(' ', [V('sp1', 26, [])]);

    addGlyph('.', [
        V('dot1', 18, [S(buildStroke({ x: 4, y: 1.5 }, [{ type: 'line', to: { x: 5.4, y: 0.6 } }]), 1.4)])
    ]);

    addGlyph(',', [
        V('comma1', 18, [S(buildStroke({ x: 5, y: 4 }, [{ type: 'quad', ctrl: { x: 5.5, y: -3 }, to: { x: 0.5, y: -9 } }]))])
    ]);

    // ---------------------------------------------------------------
    // a  (>= 3 variants required)
    // ---------------------------------------------------------------

    addGlyph('a', [
        // a1: single-story bowl + right stem, entry at baseline, exit at baseline
        V('a1', 50,
            [S(buildStroke(
                pt(24, 23, 18, 21, -12),
                [
                    { type: 'arc', cx: 24, cy: 23, rx: 18, ry: 21, fromDeg: -12, toDeg: -12 + 330 },
                    { type: 'line', to: { x: 44, y: 40 } },
                    { type: 'line', to: { x: 44, y: 2 } },
                    { type: 'quad', ctrl: { x: 44, y: -6 }, to: { x: 52, y: 2 } }
                ]
            ))],
            { anchorIn: { x: 4, y: 8 }, anchorOut: { x: 52, y: 2 } }
        ),
        // a2: rounder, slightly more open bowl, no foot flick
        V('a2', 48,
            [S(buildStroke(
                pt(23, 24, 19, 22, -6),
                [
                    { type: 'arc', cx: 23, cy: 24, rx: 19, ry: 22, fromDeg: -6, toDeg: -6 + 345 },
                    { type: 'line', to: { x: 42, y: 44 } },
                    { type: 'line', to: { x: 42, y: 0 } }
                ]
            ))],
            { anchorIn: { x: 3, y: 9 }, anchorOut: { x: 42, y: 0 } }
        ),
        // a3: narrower, taller bowl, upright stem with tiny top serif (more "print" feel)
        V('a3', 46,
            [S(buildStroke(
                pt(21, 22, 16, 22, -18),
                [
                    { type: 'arc', cx: 21, cy: 22, rx: 16, ry: 22, fromDeg: -18, toDeg: -18 + 320 },
                    { type: 'line', to: { x: 40, y: 38 } },
                    { type: 'line', to: { x: 40, y: 1 } }
                ]
            ))],
            { anchorIn: { x: 5, y: 7 }, anchorOut: { x: 40, y: 1 } }
        )
    ]);

    // ---------------------------------------------------------------
    // e  (>= 4 variants: e is the letter explicitly called out in the spec)
    // ---------------------------------------------------------------

    addGlyph('e', [
        // e1: classic looped cursive e (bar across the middle then loop)
        V('e1', 46,
            [S(buildStroke(
                pt(24, 24, 19, 22, -22),
                [
                    { type: 'line', to: pt(24, 24, 19, 22, 158) },
                    { type: 'arc', cx: 24, cy: 24, rx: 19, ry: 22, fromDeg: 158, toDeg: 158 + 336 }
                ]
            ))],
            { anchorIn: { x: 2, y: 10 }, anchorOut: { x: 43, y: 8 } }
        ),
        // e2: smaller tighter loop, steeper bar
        V('e2', 44,
            [S(buildStroke(
                pt(22, 22, 16, 20, -35),
                [
                    { type: 'line', to: pt(22, 22, 16, 20, 150) },
                    { type: 'arc', cx: 22, cy: 22, rx: 16, ry: 20, fromDeg: 150, toDeg: 150 + 330 }
                ]
            ))],
            { anchorIn: { x: 3, y: 8 }, anchorOut: { x: 38, y: 6 } }
        ),
        // e3: open / wide e, loop barely closes (more relaxed, faster-looking)
        V('e3', 48,
            [S(buildStroke(
                pt(26, 25, 21, 23, -10),
                [
                    { type: 'line', to: pt(26, 25, 21, 23, 165) },
                    { type: 'arc', cx: 26, cy: 25, rx: 21, ry: 23, fromDeg: 165, toDeg: 165 + 320 }
                ]
            ))],
            { anchorIn: { x: 1, y: 12 }, anchorOut: { x: 46, y: 10 } }
        ),
        // e4: simple print-style e, no internal loop, just an open bowl (genuinely different construction)
        V('e4', 42,
            [S(buildStroke(
                pt(22, 24, 17, 21, 60),
                [
                    { type: 'arc', cx: 22, cy: 24, rx: 17, ry: 21, fromDeg: 60, toDeg: 60 + 300 }
                ]
            ), 1, { note: 'print-e, no bar' })],
            { anchorIn: null, anchorOut: { x: 34, y: 5 } }
        )
    ]);

    // ---------------------------------------------------------------
    // i  (2 variants)
    // ---------------------------------------------------------------

    addGlyph('i', [
        V('i1', 26,
            [
                S(buildStroke({ x: 12, y: 0 }, [{ type: 'quad', ctrl: { x: 10, y: 16 }, to: { x: 15, y: 36 } }])),
                S(buildStroke({ x: 14, y: 45 }, [{ type: 'line', to: { x: 15.4, y: 46 } }]), 1.4)
            ],
            { anchorIn: { x: 12, y: 0 }, anchorOut: { x: 15, y: 36 } }
        ),
        V('i2', 24,
            [
                S(buildStroke({ x: 11, y: 1 }, [{ type: 'line', to: { x: 16, y: 34 } }])),
                S(buildStroke({ x: 15, y: 43 }, [{ type: 'line', to: { x: 16.2, y: 44.4 } }]), 1.4)
            ],
            { anchorIn: { x: 11, y: 1 }, anchorOut: { x: 16, y: 34 } }
        )
    ]);

    // ---------------------------------------------------------------
    // l  (2 variants, ascender loop)
    // ---------------------------------------------------------------

    addGlyph('l', [
        V('l1', 32,
            [S(buildStroke(
                { x: 10, y: 0 },
                [
                    { type: 'quad', ctrl: { x: 6, y: 20 }, to: { x: 14, y: 40 } },
                    { type: 'quad', ctrl: { x: 20, y: 58 }, to: { x: 12, y: 70 } },
                    { type: 'quad', ctrl: { x: 6, y: 55 }, to: { x: 16, y: 38 } },
                    { type: 'quad', ctrl: { x: 24, y: 20 }, to: { x: 30, y: 4 } }
                ]
            ))],
            { anchorIn: { x: 10, y: 0 }, anchorOut: { x: 30, y: 4 } }
        ),
        V('l2', 30,
            [S(buildStroke(
                { x: 9, y: 1 },
                [
                    { type: 'quad', ctrl: { x: 7, y: 30 }, to: { x: 13, y: 68 } },
                    { type: 'quad', ctrl: { x: 15, y: 50 }, to: { x: 28, y: 2 } }
                ]
            ))],
            { anchorIn: { x: 9, y: 1 }, anchorOut: { x: 28, y: 2 } }
        )
    ]);

    // ---------------------------------------------------------------
    // n  (2 variants)
    // ---------------------------------------------------------------

    addGlyph('n', [
        V('n1', 48,
            [S(buildStroke(
                { x: 10, y: 0 },
                [
                    { type: 'line', to: { x: 12, y: 34 } },
                    { type: 'quad', ctrl: { x: 14, y: 46 }, to: { x: 24, y: 40 } },
                    { type: 'quad', ctrl: { x: 30, y: 36 }, to: { x: 32, y: 20 } },
                    { type: 'line', to: { x: 34, y: 2 } }
                ]
            ))],
            { anchorIn: { x: 10, y: 0 }, anchorOut: { x: 34, y: 2 } }
        ),
        V('n2', 46,
            [S(buildStroke(
                { x: 9, y: 1 },
                [
                    { type: 'line', to: { x: 11, y: 32 } },
                    { type: 'quad', ctrl: { x: 12, y: 42 }, to: { x: 22, y: 38 } },
                    { type: 'quad', ctrl: { x: 29, y: 34 }, to: { x: 31, y: 18 } },
                    { type: 'line', to: { x: 33, y: 1 } }
                ]
            ))],
            { anchorIn: { x: 9, y: 1 }, anchorOut: { x: 33, y: 1 } }
        )
    ]);

    // ---------------------------------------------------------------
    // o  (2 variants, no join - round bowl)
    // ---------------------------------------------------------------

    addGlyph('o', [
        V('o1', 46,
            [S(buildStroke(
                pt(23, 24, 18, 23, 75),
                [{ type: 'arc', cx: 23, cy: 24, rx: 18, ry: 23, fromDeg: 75, toDeg: 75 + 370 }]
            ))],
            { anchorIn: null, anchorOut: null }
        ),
        V('o2', 44,
            [S(buildStroke(
                pt(22, 23, 16, 21, 100),
                [{ type: 'arc', cx: 22, cy: 23, rx: 16, ry: 21, fromDeg: 100, toDeg: 100 + 360 }]
            ))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // r  (3 variants)
    // ---------------------------------------------------------------

    addGlyph('r', [
        V('r1', 32,
            [S(buildStroke(
                { x: 10, y: 0 },
                [
                    { type: 'line', to: { x: 12, y: 32 } },
                    { type: 'quad', ctrl: { x: 14, y: 42 }, to: { x: 22, y: 40 } },
                    { type: 'quad', ctrl: { x: 27, y: 38 }, to: { x: 30, y: 32 } }
                ]
            ))],
            { anchorIn: { x: 10, y: 0 }, anchorOut: { x: 30, y: 32 } }
        ),
        V('r2', 30,
            [S(buildStroke(
                { x: 9, y: 1 },
                [
                    { type: 'line', to: { x: 10, y: 30 } },
                    { type: 'quad', ctrl: { x: 12, y: 38 }, to: { x: 19, y: 36 } }
                ]
            ))],
            { anchorIn: { x: 9, y: 1 }, anchorOut: { x: 19, y: 36 } }
        ),
        V('r3', 34,
            [S(buildStroke(
                { x: 11, y: 0 },
                [
                    { type: 'line', to: { x: 13, y: 36 } },
                    { type: 'quad', ctrl: { x: 16, y: 44 }, to: { x: 26, y: 40 } },
                    { type: 'line', to: { x: 32, y: 30 } }
                ]
            ))],
            { anchorIn: { x: 11, y: 0 }, anchorOut: { x: 32, y: 30 } }
        )
    ]);

    // ---------------------------------------------------------------
    // s  (>= 3 variants required)
    // ---------------------------------------------------------------

    addGlyph('s', [
        V('s1', 36,
            [S(buildStroke(
                { x: 30, y: 38 },
                [
                    { type: 'quad', ctrl: { x: 14, y: 46 }, to: { x: 10, y: 34 } },
                    { type: 'quad', ctrl: { x: 6, y: 24 }, to: { x: 20, y: 20 } },
                    { type: 'quad', ctrl: { x: 34, y: 16 }, to: { x: 28, y: 4 } },
                    { type: 'quad', ctrl: { x: 24, y: -2 }, to: { x: 10, y: 4 } }
                ]
            ))],
            { anchorIn: null, anchorOut: { x: 10, y: 4 } }
        ),
        V('s2', 34,
            [S(buildStroke(
                { x: 27, y: 36 },
                [
                    { type: 'quad', ctrl: { x: 13, y: 40 }, to: { x: 11, y: 30 } },
                    { type: 'quad', ctrl: { x: 9, y: 22 }, to: { x: 22, y: 19 } },
                    { type: 'quad', ctrl: { x: 32, y: 16 }, to: { x: 24, y: 6 } },
                    { type: 'quad', ctrl: { x: 18, y: 0 }, to: { x: 8, y: 5 } }
                ]
            ))],
            { anchorIn: null, anchorOut: { x: 8, y: 5 } }
        ),
        V('s3', 38,
            [S(buildStroke(
                { x: 32, y: 40 },
                [
                    { type: 'quad', ctrl: { x: 12, y: 48 }, to: { x: 9, y: 35 } },
                    { type: 'quad', ctrl: { x: 6, y: 26 }, to: { x: 22, y: 21 } },
                    { type: 'quad', ctrl: { x: 36, y: 16 }, to: { x: 30, y: 2 } },
                    { type: 'quad', ctrl: { x: 25, y: -4 }, to: { x: 9, y: 3 } }
                ]
            ))],
            { anchorIn: null, anchorOut: { x: 9, y: 3 } }
        )
    ]);

    // ---------------------------------------------------------------
    // t  (>= 3 variants required, two strokes: stem + crossbar)
    // ---------------------------------------------------------------

    addGlyph('t', [
        V('t1', 32,
            [
                S(buildStroke({ x: 10, y: 2 }, [
                    { type: 'quad', ctrl: { x: 8, y: 20 }, to: { x: 14, y: 38 } },
                    { type: 'line', to: { x: 16, y: 58 } }
                ])),
                S(buildStroke({ x: 4, y: 40 }, [{ type: 'line', to: { x: 24, y: 42 } }]))
            ],
            { anchorIn: { x: 10, y: 2 }, anchorOut: { x: 24, y: 42 } }
        ),
        V('t2', 30,
            [
                S(buildStroke({ x: 12, y: 0 }, [{ type: 'line', to: { x: 15, y: 56 } }])),
                S(buildStroke({ x: 5, y: 38 }, [{ type: 'line', to: { x: 22, y: 39 } }]))
            ],
            { anchorIn: { x: 12, y: 0 }, anchorOut: { x: 22, y: 39 } }
        ),
        V('t3', 34,
            [
                S(buildStroke({ x: 9, y: 3 }, [
                    { type: 'quad', ctrl: { x: 7, y: 24 }, to: { x: 15, y: 42 } },
                    { type: 'quad', ctrl: { x: 19, y: 52 }, to: { x: 17, y: 60 } }
                ])),
                S(buildStroke({ x: 3, y: 41 }, [{ type: 'line', to: { x: 26, y: 44 } }]))
            ],
            { anchorIn: { x: 9, y: 3 }, anchorOut: { x: 26, y: 44 } }
        )
    ]);

    // ---------------------------------------------------------------
    // u  (2 variants)
    // ---------------------------------------------------------------

    addGlyph('u', [
        V('u1', 46,
            [S(buildStroke(
                { x: 10, y: 40 },
                [
                    { type: 'line', to: { x: 11, y: 12 } },
                    { type: 'quad', ctrl: { x: 12, y: 0 }, to: { x: 22, y: 2 } },
                    { type: 'quad', ctrl: { x: 30, y: 4 }, to: { x: 31, y: 16 } },
                    { type: 'line', to: { x: 33, y: 40 } }
                ]
            ))],
            { anchorIn: { x: 10, y: 40 }, anchorOut: { x: 33, y: 40 } }
        ),
        V('u2', 44,
            [S(buildStroke(
                { x: 9, y: 38 },
                [
                    { type: 'line', to: { x: 10, y: 10 } },
                    { type: 'quad', ctrl: { x: 11, y: -1 }, to: { x: 20, y: 1 } },
                    { type: 'quad', ctrl: { x: 28, y: 3 }, to: { x: 29, y: 14 } },
                    { type: 'line', to: { x: 31, y: 38 } }
                ]
            ))],
            { anchorIn: { x: 9, y: 38 }, anchorOut: { x: 31, y: 38 } }
        )
    ]);

    // ---------------------------------------------------------------
    // b  (stem + bowl, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('b', [
        V('b1', 48,
            [
                S(buildStroke({ x: 10, y: 1 }, [{ type: 'quad', ctrl: { x: 7, y: 36 }, to: { x: 12, y: 72 } }])),
                S(buildStroke(
                    pt(27, 23, 17, 21, 192),
                    [{ type: 'arc', cx: 27, cy: 23, rx: 17, ry: 21, fromDeg: 192, toDeg: 192 - 330 }]
                ))
            ],
            { anchorIn: { x: 10, y: 1 }, anchorOut: { x: 14, y: 9 } }
        ),
        V('b2', 46,
            [
                S(buildStroke({ x: 9, y: 0 }, [{ type: 'line', to: { x: 11, y: 70 } }])),
                S(buildStroke(
                    pt(25, 21, 16, 19, 185),
                    [{ type: 'arc', cx: 25, cy: 21, rx: 16, ry: 19, fromDeg: 185, toDeg: 185 - 320 }]
                ))
            ],
            { anchorIn: { x: 9, y: 0 }, anchorOut: { x: 14, y: 8 } }
        )
    ]);

    // ---------------------------------------------------------------
    // c  (2 variants, open bowl, no join)
    // ---------------------------------------------------------------

    addGlyph('c', [
        V('c1', 46,
            [S(buildStroke(
                pt(24, 25, 18, 22, 25),
                [{ type: 'arc', cx: 24, cy: 25, rx: 18, ry: 22, fromDeg: 25, toDeg: 25 + 312 }]
            ))],
            { anchorIn: null, anchorOut: null }
        ),
        V('c2', 42,
            [S(buildStroke(
                pt(22, 23, 16, 20, 30),
                [{ type: 'arc', cx: 22, cy: 23, rx: 16, ry: 20, fromDeg: 30, toDeg: 30 + 300 }]
            ))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // d  (stem + bowl, 2 strokes, mirror of b)
    // ---------------------------------------------------------------

    addGlyph('d', [
        V('d1', 44,
            [
                S(buildStroke({ x: 37, y: 3 }, [{ type: 'quad', ctrl: { x: 40, y: 38 }, to: { x: 38, y: 72 } }])),
                S(buildStroke(
                    pt(22, 22, 17, 20, -8),
                    [{ type: 'arc', cx: 22, cy: 22, rx: 17, ry: 20, fromDeg: -8, toDeg: -8 + 325 }]
                ))
            ],
            { anchorIn: { x: 37, y: 3 }, anchorOut: { x: 34, y: 8 } }
        ),
        V('d2', 40,
            [
                S(buildStroke({ x: 34, y: 1 }, [{ type: 'line', to: { x: 36, y: 70 } }])),
                S(buildStroke(
                    pt(20, 21, 16, 19, -5),
                    [{ type: 'arc', cx: 20, cy: 21, rx: 16, ry: 19, fromDeg: -5, toDeg: -5 + 330 }]
                ))
            ],
            { anchorIn: { x: 34, y: 1 }, anchorOut: { x: 33, y: 10 } }
        )
    ]);

    // ---------------------------------------------------------------
    // f  (stem with top curl + crossbar, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('f', [
        V('f1', 30,
            [
                S(buildStroke({ x: 18, y: 70 }, [
                    { type: 'quad', ctrl: { x: 8, y: 72 }, to: { x: 8, y: 58 } },
                    { type: 'line', to: { x: 11, y: 2 } }
                ])),
                S(buildStroke({ x: 2, y: 42 }, [{ type: 'line', to: { x: 22, y: 44 } }]))
            ],
            { anchorIn: null, anchorOut: { x: 11, y: 2 } }
        ),
        V('f2', 28,
            [
                S(buildStroke({ x: 16, y: 68 }, [
                    { type: 'quad', ctrl: { x: 7, y: 70 }, to: { x: 7, y: 56 } },
                    { type: 'line', to: { x: 10, y: 1 } }
                ])),
                S(buildStroke({ x: 1, y: 40 }, [{ type: 'line', to: { x: 20, y: 41 } }]))
            ],
            { anchorIn: null, anchorOut: { x: 10, y: 1 } }
        )
    ]);

    // ---------------------------------------------------------------
    // g  (bowl + descender curl, single stroke)
    // ---------------------------------------------------------------

    addGlyph('g', [
        V('g1', 44,
            [S(buildStroke(
                pt(23, 23, 18, 21, -14),
                [
                    { type: 'arc', cx: 23, cy: 23, rx: 18, ry: 21, fromDeg: -14, toDeg: -14 + 330 },
                    { type: 'line', to: { x: 32, y: -18 } },
                    { type: 'quad', ctrl: { x: 28, y: -25 }, to: { x: 20, y: -22 } }
                ]
            ))],
            { anchorIn: null, anchorOut: null }
        ),
        V('g2', 40,
            [S(buildStroke(
                pt(21, 21, 16, 19, -16),
                [
                    { type: 'arc', cx: 21, cy: 21, rx: 16, ry: 19, fromDeg: -16, toDeg: -16 + 320 },
                    { type: 'line', to: { x: 27, y: -16 } },
                    { type: 'quad', ctrl: { x: 23, y: -23 }, to: { x: 16, y: -20 } }
                ]
            ))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // h  (stem + arch, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('h', [
        V('h1', 48,
            [
                S(buildStroke({ x: 9, y: 0 }, [{ type: 'quad', ctrl: { x: 6, y: 36 }, to: { x: 11, y: 71 } }])),
                S(buildStroke({ x: 11, y: 40 }, [
                    { type: 'quad', ctrl: { x: 13, y: 50 }, to: { x: 22, y: 46 } },
                    { type: 'quad', ctrl: { x: 30, y: 42 }, to: { x: 32, y: 26 } },
                    { type: 'line', to: { x: 33, y: 2 } }
                ]))
            ],
            { anchorIn: { x: 9, y: 0 }, anchorOut: { x: 33, y: 2 } }
        ),
        V('h2', 46,
            [
                S(buildStroke({ x: 8, y: 1 }, [{ type: 'line', to: { x: 10, y: 69 } }])),
                S(buildStroke({ x: 10, y: 36 }, [
                    { type: 'quad', ctrl: { x: 12, y: 44 }, to: { x: 20, y: 42 } },
                    { type: 'quad', ctrl: { x: 27, y: 40 }, to: { x: 30, y: 24 } },
                    { type: 'line', to: { x: 31, y: 1 } }
                ]))
            ],
            { anchorIn: { x: 8, y: 1 }, anchorOut: { x: 31, y: 1 } }
        )
    ]);

    // ---------------------------------------------------------------
    // j  (descender curl + dot, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('j', [
        V('j1', 24,
            [
                S(buildStroke({ x: 14, y: 40 }, [
                    { type: 'line', to: { x: 15, y: -6 } },
                    { type: 'quad', ctrl: { x: 15, y: -20 }, to: { x: 6, y: -19 } }
                ])),
                S(buildStroke({ x: 13, y: 49 }, [{ type: 'line', to: { x: 14.4, y: 50 } }]), 1.4)
            ],
            { anchorIn: null, anchorOut: null }
        ),
        V('j2', 22,
            [
                S(buildStroke({ x: 13, y: 38 }, [
                    { type: 'line', to: { x: 14, y: -4 } },
                    { type: 'quad', ctrl: { x: 14, y: -18 }, to: { x: 6, y: -17 } }
                ])),
                S(buildStroke({ x: 12, y: 47 }, [{ type: 'line', to: { x: 13.3, y: 48 } }]), 1.4)
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // k  (stem + arms, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('k', [
        V('k1', 44,
            [
                S(buildStroke({ x: 9, y: 0 }, [{ type: 'quad', ctrl: { x: 6, y: 36 }, to: { x: 11, y: 71 } }])),
                S(buildStroke({ x: 30, y: 48 }, [
                    { type: 'line', to: { x: 12, y: 28 } },
                    { type: 'line', to: { x: 31, y: 2 } }
                ]))
            ],
            { anchorIn: { x: 9, y: 0 }, anchorOut: { x: 31, y: 2 } }
        ),
        V('k2', 42,
            [
                S(buildStroke({ x: 8, y: 1 }, [{ type: 'line', to: { x: 10, y: 69 } }])),
                S(buildStroke({ x: 28, y: 44 }, [
                    { type: 'quad', ctrl: { x: 16, y: 32 }, to: { x: 11, y: 26 } },
                    { type: 'quad', ctrl: { x: 18, y: 18 }, to: { x: 29, y: 1 } }
                ]))
            ],
            { anchorIn: { x: 8, y: 1 }, anchorOut: { x: 29, y: 1 } }
        )
    ]);

    // ---------------------------------------------------------------
    // m  (like n with an extra hump, single stroke)
    // ---------------------------------------------------------------

    addGlyph('m', [
        V('m1', 54,
            [S(buildStroke({ x: 9, y: 0 }, [
                { type: 'line', to: { x: 11, y: 33 } },
                { type: 'quad', ctrl: { x: 13, y: 45 }, to: { x: 22, y: 40 } },
                { type: 'quad', ctrl: { x: 28, y: 36 }, to: { x: 29, y: 22 } },
                { type: 'line', to: { x: 30, y: 33 } },
                { type: 'quad', ctrl: { x: 32, y: 45 }, to: { x: 41, y: 40 } },
                { type: 'quad', ctrl: { x: 47, y: 36 }, to: { x: 48, y: 20 } },
                { type: 'line', to: { x: 49, y: 2 } }
            ]))],
            { anchorIn: { x: 9, y: 0 }, anchorOut: { x: 49, y: 2 } }
        ),
        V('m2', 50,
            [S(buildStroke({ x: 8, y: 1 }, [
                { type: 'line', to: { x: 9, y: 30 } },
                { type: 'quad', ctrl: { x: 10, y: 40 }, to: { x: 19, y: 37 } },
                { type: 'quad', ctrl: { x: 25, y: 34 }, to: { x: 26, y: 19 } },
                { type: 'line', to: { x: 27, y: 29 } },
                { type: 'quad', ctrl: { x: 28, y: 39 }, to: { x: 37, y: 36 } },
                { type: 'quad', ctrl: { x: 43, y: 33 }, to: { x: 44, y: 17 } },
                { type: 'line', to: { x: 45, y: 1 } }
            ]))],
            { anchorIn: { x: 8, y: 1 }, anchorOut: { x: 45, y: 1 } }
        )
    ]);

    // ---------------------------------------------------------------
    // p  (descender stem + bowl, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('p', [
        V('p1', 46,
            [
                S(buildStroke({ x: 10, y: 41 }, [{ type: 'line', to: { x: 11, y: -22 } }])),
                S(buildStroke(
                    pt(26, 23, 16, 20, 195),
                    [{ type: 'arc', cx: 26, cy: 23, rx: 16, ry: 20, fromDeg: 195, toDeg: 195 - 325 }]
                ))
            ],
            { anchorIn: null, anchorOut: { x: 16, y: 8 } }
        ),
        V('p2', 42,
            [
                S(buildStroke({ x: 9, y: 39 }, [{ type: 'line', to: { x: 10, y: -20 } }])),
                S(buildStroke(
                    pt(24, 21, 15, 18, 190),
                    [{ type: 'arc', cx: 24, cy: 21, rx: 15, ry: 18, fromDeg: 190, toDeg: 190 - 315 }]
                ))
            ],
            { anchorIn: null, anchorOut: { x: 15, y: 6 } }
        )
    ]);

    // ---------------------------------------------------------------
    // q  (descender stem + bowl, 2 strokes, mirror of p)
    // ---------------------------------------------------------------

    addGlyph('q', [
        V('q1', 44,
            [
                S(buildStroke({ x: 32, y: 40 }, [
                    { type: 'line', to: { x: 33, y: -20 } },
                    { type: 'quad', ctrl: { x: 36, y: -24 }, to: { x: 40, y: -21 } }
                ])),
                S(buildStroke(
                    pt(20, 22, 16, 20, -6),
                    [{ type: 'arc', cx: 20, cy: 22, rx: 16, ry: 20, fromDeg: -6, toDeg: -6 + 320 }]
                ))
            ],
            { anchorIn: null, anchorOut: { x: 31, y: 8 } }
        ),
        V('q2', 42,
            [
                S(buildStroke({ x: 31, y: 38 }, [{ type: 'line', to: { x: 32, y: -22 } }])),
                S(buildStroke(
                    pt(19, 20, 15, 18, -4),
                    [{ type: 'arc', cx: 19, cy: 20, rx: 15, ry: 18, fromDeg: -4, toDeg: -4 + 315 }]
                ))
            ],
            { anchorIn: null, anchorOut: { x: 29, y: 6 } }
        )
    ]);

    // ---------------------------------------------------------------
    // v  (two diagonals, single stroke, no join - starts/ends high)
    // ---------------------------------------------------------------

    addGlyph('v', [
        V('v1', 36,
            [S(buildStroke({ x: 8, y: 40 }, [
                { type: 'line', to: { x: 17, y: 1 } },
                { type: 'line', to: { x: 28, y: 42 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        ),
        V('v2', 34,
            [S(buildStroke({ x: 7, y: 38 }, [
                { type: 'line', to: { x: 15, y: 0 } },
                { type: 'line', to: { x: 25, y: 39 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // w  (four diagonals, single stroke, no join)
    // ---------------------------------------------------------------

    addGlyph('w', [
        V('w1', 46,
            [S(buildStroke({ x: 7, y: 40 }, [
                { type: 'line', to: { x: 14, y: 2 } },
                { type: 'line', to: { x: 21, y: 32 } },
                { type: 'line', to: { x: 29, y: 1 } },
                { type: 'line', to: { x: 37, y: 40 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        ),
        V('w2', 42,
            [S(buildStroke({ x: 6, y: 38 }, [
                { type: 'line', to: { x: 12, y: 1 } },
                { type: 'line', to: { x: 19, y: 29 } },
                { type: 'line', to: { x: 27, y: 0 } },
                { type: 'line', to: { x: 34, y: 37 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // x  (two crossing diagonals, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('x', [
        V('x1', 36,
            [
                S(buildStroke({ x: 8, y: 40 }, [{ type: 'line', to: { x: 30, y: 1 } }])),
                S(buildStroke({ x: 29, y: 39 }, [{ type: 'line', to: { x: 9, y: 2 } }]))
            ],
            { anchorIn: null, anchorOut: { x: 9, y: 2 } }
        ),
        V('x2', 34,
            [
                S(buildStroke({ x: 7, y: 38 }, [{ type: 'line', to: { x: 27, y: 1 } }])),
                S(buildStroke({ x: 26, y: 37 }, [{ type: 'line', to: { x: 8, y: 2 } }]))
            ],
            { anchorIn: null, anchorOut: { x: 8, y: 2 } }
        )
    ]);

    // ---------------------------------------------------------------
    // y  (two diagonals, right one continues into a descender curl, 2 strokes)
    // ---------------------------------------------------------------

    addGlyph('y', [
        V('y1', 36,
            [
                S(buildStroke({ x: 8, y: 40 }, [{ type: 'line', to: { x: 19, y: 0 } }])),
                S(buildStroke({ x: 29, y: 41 }, [
                    { type: 'line', to: { x: 14, y: -8 } },
                    { type: 'quad', ctrl: { x: 10, y: -22 }, to: { x: 18, y: -23 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        ),
        V('y2', 34,
            [
                S(buildStroke({ x: 7, y: 38 }, [{ type: 'line', to: { x: 17, y: 1 } }])),
                S(buildStroke({ x: 27, y: 39 }, [
                    { type: 'line', to: { x: 13, y: -9 } },
                    { type: 'quad', ctrl: { x: 9, y: -22 }, to: { x: 16, y: -22 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // z  (zigzag, single stroke)
    // ---------------------------------------------------------------

    addGlyph('z', [
        V('z1', 38,
            [S(buildStroke({ x: 8, y: 40 }, [
                { type: 'line', to: { x: 30, y: 40 } },
                { type: 'line', to: { x: 9, y: 1 } },
                { type: 'line', to: { x: 31, y: 1 } }
            ]))],
            { anchorIn: null, anchorOut: { x: 31, y: 1 } }
        ),
        V('z2', 34,
            [S(buildStroke({ x: 7, y: 38 }, [
                { type: 'line', to: { x: 26, y: 38 } },
                { type: 'line', to: { x: 8, y: 2 } },
                { type: 'line', to: { x: 27, y: 2 } }
            ]))],
            { anchorIn: null, anchorOut: { x: 27, y: 2 } }
        )
    ]);

    // ---------------------------------------------------------------
    // Uppercase A-M (print capitals, no cursive join: anchorIn/anchorOut null)
    // ---------------------------------------------------------------

    addGlyph('A', [
        V('A1', 42,
            [
                S(buildStroke({ x: 2, y: 0 }, [
                    { type: 'line', to: { x: 20, y: 68 } },
                    { type: 'line', to: { x: 38, y: 0 } }
                ])),
                S(buildStroke({ x: 9, y: 22 }, [{ type: 'line', to: { x: 31, y: 22 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('B', [
        V('B1', 36,
            [
                S(buildStroke({ x: 8, y: 0 }, [{ type: 'line', to: { x: 8, y: 68 } }])),
                S(buildStroke({ x: 9, y: 68 }, [
                    { type: 'quad', ctrl: { x: 30, y: 68 }, to: { x: 29, y: 50 } },
                    { type: 'quad', ctrl: { x: 28, y: 38 }, to: { x: 9, y: 36 } },
                    { type: 'quad', ctrl: { x: 31, y: 34 }, to: { x: 31, y: 16 } },
                    { type: 'quad', ctrl: { x: 31, y: 0 }, to: { x: 9, y: 1 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('C', [
        V('C1', 44,
            [S(buildStroke(
                pt(21, 34, 19, 32, 25),
                [{ type: 'arc', cx: 21, cy: 34, rx: 19, ry: 32, fromDeg: 25, toDeg: 25 + 310 }]
            ))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('D', [
        V('D1', 42,
            [
                S(buildStroke({ x: 8, y: 0 }, [{ type: 'line', to: { x: 8, y: 68 } }])),
                S(buildStroke({ x: 8, y: 68 }, [
                    { type: 'quad', ctrl: { x: 34, y: 66 }, to: { x: 38, y: 34 } },
                    { type: 'quad', ctrl: { x: 34, y: 2 }, to: { x: 8, y: 0 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('E', [
        V('E1', 32,
            [
                S(buildStroke({ x: 26, y: 68 }, [
                    { type: 'line', to: { x: 8, y: 68 } },
                    { type: 'line', to: { x: 8, y: 0 } },
                    { type: 'line', to: { x: 27, y: 0 } }
                ])),
                S(buildStroke({ x: 8, y: 35 }, [{ type: 'line', to: { x: 22, y: 35 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('F', [
        V('F1', 30,
            [
                S(buildStroke({ x: 27, y: 68 }, [
                    { type: 'line', to: { x: 9, y: 68 } },
                    { type: 'line', to: { x: 9, y: 0 } }
                ])),
                S(buildStroke({ x: 9, y: 35 }, [{ type: 'line', to: { x: 21, y: 35 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('G', [
        V('G1', 44,
            [S(buildStroke(
                pt(22, 34, 19, 32, 35),
                [
                    { type: 'arc', cx: 22, cy: 34, rx: 19, ry: 32, fromDeg: 35, toDeg: 35 + 295 },
                    { type: 'line', to: { x: 24, y: 18 } },
                    { type: 'line', to: { x: 24, y: 32 } }
                ]
            ))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('H', [
        V('H1', 38,
            [
                S(buildStroke({ x: 8, y: 0 }, [{ type: 'line', to: { x: 8, y: 68 } }])),
                S(buildStroke({ x: 32, y: 0 }, [{ type: 'line', to: { x: 32, y: 68 } }])),
                S(buildStroke({ x: 8, y: 34 }, [{ type: 'line', to: { x: 32, y: 35 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('I', [
        V('I1', 20,
            [S(buildStroke({ x: 14, y: 0 }, [{ type: 'line', to: { x: 15, y: 68 } }]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('J', [
        V('J1', 30,
            [S(buildStroke({ x: 24, y: 66 }, [
                { type: 'line', to: { x: 23, y: 10 } },
                { type: 'quad', ctrl: { x: 22, y: -4 }, to: { x: 10, y: 0 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('K', [
        V('K1', 36,
            [
                S(buildStroke({ x: 8, y: 0 }, [{ type: 'line', to: { x: 8, y: 68 } }])),
                S(buildStroke({ x: 30, y: 68 }, [
                    { type: 'line', to: { x: 9, y: 36 } },
                    { type: 'line', to: { x: 31, y: 0 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('L', [
        V('L1', 32,
            [S(buildStroke({ x: 9, y: 68 }, [
                { type: 'line', to: { x: 9, y: 1 } },
                { type: 'line', to: { x: 28, y: 0 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('M', [
        V('M1', 44,
            [S(buildStroke({ x: 6, y: 0 }, [
                { type: 'line', to: { x: 8, y: 68 } },
                { type: 'line', to: { x: 22, y: 30 } },
                { type: 'line', to: { x: 36, y: 68 } },
                { type: 'line', to: { x: 38, y: 0 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // Uppercase N-Z (print capitals, no cursive join: anchorIn/anchorOut null)
    // ---------------------------------------------------------------

    addGlyph('N', [
        V('N1', 40,
            [S(buildStroke({ x: 8, y: 0 }, [
                { type: 'line', to: { x: 9, y: 68 } },
                { type: 'line', to: { x: 33, y: 0 } },
                { type: 'line', to: { x: 34, y: 68 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('O', [
        V('O1', 48,
            [S(buildStroke(
                pt(23, 34, 20, 32, 80),
                [{ type: 'arc', cx: 23, cy: 34, rx: 20, ry: 32, fromDeg: 80, toDeg: 80 + 368 }]
            ))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('P', [
        V('P1', 38,
            [
                S(buildStroke({ x: 8, y: 0 }, [{ type: 'line', to: { x: 8, y: 68 } }])),
                S(buildStroke({ x: 8, y: 68 }, [
                    { type: 'quad', ctrl: { x: 32, y: 68 }, to: { x: 32, y: 50 } },
                    { type: 'quad', ctrl: { x: 32, y: 34 }, to: { x: 8, y: 35 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('Q', [
        V('Q1', 48,
            [
                S(buildStroke(
                    pt(23, 34, 20, 32, 80),
                    [{ type: 'arc', cx: 23, cy: 34, rx: 20, ry: 32, fromDeg: 80, toDeg: 80 + 368 }]
                )),
                S(buildStroke({ x: 20, y: 6 }, [{ type: 'line', to: { x: 34, y: -10 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('R', [
        V('R1', 40,
            [
                S(buildStroke({ x: 8, y: 0 }, [{ type: 'line', to: { x: 8, y: 68 } }])),
                S(buildStroke({ x: 8, y: 68 }, [
                    { type: 'quad', ctrl: { x: 32, y: 68 }, to: { x: 32, y: 50 } },
                    { type: 'quad', ctrl: { x: 32, y: 34 }, to: { x: 8, y: 35 } }
                ])),
                S(buildStroke({ x: 16, y: 35 }, [{ type: 'line', to: { x: 34, y: 0 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('S', [
        V('S1', 40,
            [S(buildStroke({ x: 34, y: 60 }, [
                { type: 'quad', ctrl: { x: 14, y: 70 }, to: { x: 9, y: 52 } },
                { type: 'quad', ctrl: { x: 4, y: 38 }, to: { x: 24, y: 34 } },
                { type: 'quad', ctrl: { x: 44, y: 30 }, to: { x: 36, y: 10 } },
                { type: 'quad', ctrl: { x: 30, y: -2 }, to: { x: 8, y: 6 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('T', [
        V('T1', 40,
            [
                S(buildStroke({ x: 19, y: 0 }, [{ type: 'line', to: { x: 20, y: 68 } }])),
                S(buildStroke({ x: 4, y: 64 }, [{ type: 'line', to: { x: 36, y: 66 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('U', [
        V('U1', 46,
            [S(buildStroke({ x: 9, y: 68 }, [
                { type: 'line', to: { x: 10, y: 18 } },
                { type: 'quad', ctrl: { x: 11, y: 0 }, to: { x: 24, y: 0 } },
                { type: 'quad', ctrl: { x: 36, y: 0 }, to: { x: 37, y: 18 } },
                { type: 'line', to: { x: 38, y: 68 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('V', [
        V('V1', 42,
            [S(buildStroke({ x: 5, y: 68 }, [
                { type: 'line', to: { x: 21, y: 0 } },
                { type: 'line', to: { x: 37, y: 68 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('W', [
        V('W1', 48,
            [S(buildStroke({ x: 4, y: 68 }, [
                { type: 'line', to: { x: 14, y: 0 } },
                { type: 'line', to: { x: 24, y: 44 } },
                { type: 'line', to: { x: 34, y: 0 } },
                { type: 'line', to: { x: 44, y: 68 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('X', [
        V('X1', 40,
            [
                S(buildStroke({ x: 6, y: 68 }, [{ type: 'line', to: { x: 34, y: 0 } }])),
                S(buildStroke({ x: 33, y: 68 }, [{ type: 'line', to: { x: 7, y: 0 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('Y', [
        V('Y1', 40,
            [
                S(buildStroke({ x: 5, y: 68 }, [{ type: 'line', to: { x: 20, y: 34 } }])),
                S(buildStroke({ x: 35, y: 68 }, [
                    { type: 'line', to: { x: 20, y: 34 } },
                    { type: 'line', to: { x: 19, y: 0 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('Z', [
        V('Z1', 40,
            [S(buildStroke({ x: 7, y: 68 }, [
                { type: 'line', to: { x: 33, y: 68 } },
                { type: 'line', to: { x: 8, y: 0 } },
                { type: 'line', to: { x: 34, y: 0 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // Digits 0-9 (no cursive join: anchorIn/anchorOut null)
    // ---------------------------------------------------------------

    addGlyph('0', [
        V('0_1', 40,
            [S(buildStroke(
                pt(20, 34, 17, 30, 80),
                [{ type: 'arc', cx: 20, cy: 34, rx: 17, ry: 30, fromDeg: 80, toDeg: 80 + 364 }]
            ))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('1', [
        V('1_1', 24,
            [S(buildStroke({ x: 10, y: 56 }, [
                { type: 'line', to: { x: 18, y: 66 } },
                { type: 'line', to: { x: 18, y: 0 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('2', [
        V('2_1', 38,
            [S(buildStroke({ x: 8, y: 52 }, [
                { type: 'quad', ctrl: { x: 8, y: 66 }, to: { x: 20, y: 66 } },
                { type: 'quad', ctrl: { x: 32, y: 66 }, to: { x: 30, y: 52 } },
                { type: 'quad', ctrl: { x: 28, y: 40 }, to: { x: 10, y: 18 } },
                { type: 'line', to: { x: 8, y: 2 } },
                { type: 'line', to: { x: 32, y: 1 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('3', [
        V('3_1', 38,
            [S(buildStroke({ x: 9, y: 60 }, [
                { type: 'quad', ctrl: { x: 12, y: 68 }, to: { x: 22, y: 66 } },
                { type: 'quad', ctrl: { x: 34, y: 64 }, to: { x: 26, y: 36 } },
                { type: 'quad', ctrl: { x: 36, y: 34 }, to: { x: 34, y: 14 } },
                { type: 'quad', ctrl: { x: 32, y: -2 }, to: { x: 16, y: 0 } },
                { type: 'quad', ctrl: { x: 8, y: 1 }, to: { x: 6, y: 8 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('4', [
        V('4_1', 38,
            [
                S(buildStroke({ x: 28, y: 68 }, [
                    { type: 'line', to: { x: 7, y: 23 } },
                    { type: 'line', to: { x: 33, y: 24 } }
                ])),
                S(buildStroke({ x: 25, y: 60 }, [{ type: 'line', to: { x: 24, y: 0 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('5', [
        V('5_1', 38,
            [S(buildStroke({ x: 30, y: 66 }, [
                { type: 'line', to: { x: 9, y: 66 } },
                { type: 'line', to: { x: 8, y: 40 } },
                { type: 'quad', ctrl: { x: 24, y: 44 }, to: { x: 30, y: 28 } },
                { type: 'quad', ctrl: { x: 34, y: 10 }, to: { x: 16, y: 2 } },
                { type: 'quad', ctrl: { x: 8, y: -2 }, to: { x: 6, y: 8 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('6', [
        V('6_1', 38,
            [S(buildStroke({ x: 30, y: 66 }, [
                { type: 'quad', ctrl: { x: 14, y: 60 }, to: { x: 8, y: 40 } },
                { type: 'quad', ctrl: { x: 2, y: 20 }, to: { x: 10, y: 6 } },
                { type: 'quad', ctrl: { x: 16, y: -2 }, to: { x: 26, y: 4 } },
                { type: 'quad', ctrl: { x: 34, y: 10 }, to: { x: 28, y: 24 } },
                { type: 'quad', ctrl: { x: 20, y: 32 }, to: { x: 10, y: 24 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('7', [
        V('7_1', 36,
            [S(buildStroke({ x: 7, y: 66 }, [
                { type: 'line', to: { x: 32, y: 66 } },
                { type: 'line', to: { x: 14, y: 0 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('8', [
        V('8_1', 40,
            [S(buildStroke({ x: 20, y: 34 }, [
                { type: 'quad', ctrl: { x: 8, y: 38 }, to: { x: 9, y: 52 } },
                { type: 'quad', ctrl: { x: 10, y: 66 }, to: { x: 22, y: 66 } },
                { type: 'quad', ctrl: { x: 34, y: 66 }, to: { x: 32, y: 52 } },
                { type: 'quad', ctrl: { x: 30, y: 40 }, to: { x: 20, y: 34 } },
                { type: 'quad', ctrl: { x: 9, y: 28 }, to: { x: 8, y: 14 } },
                { type: 'quad', ctrl: { x: 7, y: 0 }, to: { x: 20, y: 0 } },
                { type: 'quad', ctrl: { x: 33, y: 0 }, to: { x: 32, y: 14 } },
                { type: 'quad', ctrl: { x: 31, y: 28 }, to: { x: 20, y: 34 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('9', [
        V('9_1', 36,
            [S(buildStroke({ x: 26, y: 40 }, [
                { type: 'quad', ctrl: { x: 34, y: 48 }, to: { x: 26, y: 56 } },
                { type: 'quad', ctrl: { x: 16, y: 62 }, to: { x: 10, y: 52 } },
                { type: 'quad', ctrl: { x: 4, y: 42 }, to: { x: 14, y: 36 } },
                { type: 'quad', ctrl: { x: 22, y: 32 }, to: { x: 28, y: 40 } },
                { type: 'line', to: { x: 24, y: 2 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    // ---------------------------------------------------------------
    // Accented (French) lowercase - base letter stroke(s) reused/copied,
    // plus one small extra stroke for the diacritic. Anchors follow the
    // base letter's own anchors (accent strokes are decorative only).
    // ---------------------------------------------------------------

    addGlyph('é', [ // e acute
        V('eacute1', 46,
            [
                S(buildStroke(
                    pt(24, 24, 19, 22, -22),
                    [
                        { type: 'line', to: pt(24, 24, 19, 22, 158) },
                        { type: 'arc', cx: 24, cy: 24, rx: 19, ry: 22, fromDeg: 158, toDeg: 158 + 336 }
                    ]
                )),
                S(buildStroke({ x: 17, y: 57 }, [{ type: 'line', to: { x: 27, y: 65 } }]))
            ],
            { anchorIn: { x: 2, y: 10 }, anchorOut: { x: 43, y: 8 } }
        )
    ]);

    addGlyph('è', [ // e grave
        V('egrave1', 46,
            [
                S(buildStroke(
                    pt(24, 24, 19, 22, -22),
                    [
                        { type: 'line', to: pt(24, 24, 19, 22, 158) },
                        { type: 'arc', cx: 24, cy: 24, rx: 19, ry: 22, fromDeg: 158, toDeg: 158 + 336 }
                    ]
                )),
                S(buildStroke({ x: 17, y: 65 }, [{ type: 'line', to: { x: 27, y: 57 } }]))
            ],
            { anchorIn: { x: 2, y: 10 }, anchorOut: { x: 43, y: 8 } }
        )
    ]);

    addGlyph('ê', [ // e circumflex
        V('ecirc1', 46,
            [
                S(buildStroke(
                    pt(24, 24, 19, 22, -22),
                    [
                        { type: 'line', to: pt(24, 24, 19, 22, 158) },
                        { type: 'arc', cx: 24, cy: 24, rx: 19, ry: 22, fromDeg: 158, toDeg: 158 + 336 }
                    ]
                )),
                S(buildStroke({ x: 15, y: 58 }, [
                    { type: 'line', to: { x: 22, y: 67 } },
                    { type: 'line', to: { x: 29, y: 58 } }
                ]))
            ],
            { anchorIn: { x: 2, y: 10 }, anchorOut: { x: 43, y: 8 } }
        )
    ]);

    addGlyph('ë', [ // e diaeresis
        V('ediaer1', 46,
            [
                S(buildStroke(
                    pt(24, 24, 19, 22, -22),
                    [
                        { type: 'line', to: pt(24, 24, 19, 22, 158) },
                        { type: 'arc', cx: 24, cy: 24, rx: 19, ry: 22, fromDeg: 158, toDeg: 158 + 336 }
                    ]
                )),
                S(buildStroke({ x: 16, y: 60 }, [{ type: 'line', to: { x: 17.4, y: 61 } }]), 1.4),
                S(buildStroke({ x: 26, y: 60 }, [{ type: 'line', to: { x: 27.4, y: 61 } }]), 1.4)
            ],
            { anchorIn: { x: 2, y: 10 }, anchorOut: { x: 43, y: 8 } }
        )
    ]);

    addGlyph('à', [ // a grave
        V('agrave1', 50,
            [
                S(buildStroke(
                    pt(24, 23, 18, 21, -12),
                    [
                        { type: 'arc', cx: 24, cy: 23, rx: 18, ry: 21, fromDeg: -12, toDeg: -12 + 330 },
                        { type: 'line', to: { x: 44, y: 40 } },
                        { type: 'line', to: { x: 44, y: 2 } },
                        { type: 'quad', ctrl: { x: 44, y: -6 }, to: { x: 52, y: 2 } }
                    ]
                )),
                S(buildStroke({ x: 19, y: 65 }, [{ type: 'line', to: { x: 29, y: 57 } }]))
            ],
            { anchorIn: { x: 4, y: 8 }, anchorOut: { x: 52, y: 2 } }
        )
    ]);

    addGlyph('â', [ // a circumflex
        V('acirc1', 50,
            [
                S(buildStroke(
                    pt(24, 23, 18, 21, -12),
                    [
                        { type: 'arc', cx: 24, cy: 23, rx: 18, ry: 21, fromDeg: -12, toDeg: -12 + 330 },
                        { type: 'line', to: { x: 44, y: 40 } },
                        { type: 'line', to: { x: 44, y: 2 } },
                        { type: 'quad', ctrl: { x: 44, y: -6 }, to: { x: 52, y: 2 } }
                    ]
                )),
                S(buildStroke({ x: 17, y: 57 }, [
                    { type: 'line', to: { x: 24, y: 66 } },
                    { type: 'line', to: { x: 31, y: 57 } }
                ]))
            ],
            { anchorIn: { x: 4, y: 8 }, anchorOut: { x: 52, y: 2 } }
        )
    ]);

    addGlyph('ç', [ // c cedilla
        V('ccedil1', 46,
            [
                S(buildStroke(
                    pt(24, 25, 18, 22, 25),
                    [{ type: 'arc', cx: 24, cy: 25, rx: 18, ry: 22, fromDeg: 25, toDeg: 25 + 312 }]
                )),
                S(buildStroke({ x: 29, y: 4 }, [{ type: 'quad', ctrl: { x: 33, y: -6 }, to: { x: 24, y: -9 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('ù', [ // u grave
        V('ugrave1', 46,
            [
                S(buildStroke({ x: 10, y: 40 }, [
                    { type: 'line', to: { x: 11, y: 12 } },
                    { type: 'quad', ctrl: { x: 12, y: 0 }, to: { x: 22, y: 2 } },
                    { type: 'quad', ctrl: { x: 30, y: 4 }, to: { x: 31, y: 16 } },
                    { type: 'line', to: { x: 33, y: 40 } }
                ])),
                S(buildStroke({ x: 16, y: 66 }, [{ type: 'line', to: { x: 24, y: 58 } }]))
            ],
            { anchorIn: { x: 10, y: 40 }, anchorOut: { x: 33, y: 40 } }
        )
    ]);

    addGlyph('û', [ // u circumflex
        V('ucirc1', 46,
            [
                S(buildStroke({ x: 10, y: 40 }, [
                    { type: 'line', to: { x: 11, y: 12 } },
                    { type: 'quad', ctrl: { x: 12, y: 0 }, to: { x: 22, y: 2 } },
                    { type: 'quad', ctrl: { x: 30, y: 4 }, to: { x: 31, y: 16 } },
                    { type: 'line', to: { x: 33, y: 40 } }
                ])),
                S(buildStroke({ x: 14, y: 58 }, [
                    { type: 'line', to: { x: 21, y: 67 } },
                    { type: 'line', to: { x: 28, y: 58 } }
                ]))
            ],
            { anchorIn: { x: 10, y: 40 }, anchorOut: { x: 33, y: 40 } }
        )
    ]);

    addGlyph('ô', [ // o circumflex
        V('ocirc1', 46,
            [
                S(buildStroke(
                    pt(23, 24, 18, 23, 75),
                    [{ type: 'arc', cx: 23, cy: 24, rx: 18, ry: 23, fromDeg: 75, toDeg: 75 + 370 }]
                )),
                S(buildStroke({ x: 16, y: 54 }, [
                    { type: 'line', to: { x: 23, y: 63 } },
                    { type: 'line', to: { x: 30, y: 54 } }
                ]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('î', [ // i circumflex
        V('icirc1', 26,
            [
                S(buildStroke({ x: 12, y: 0 }, [{ type: 'quad', ctrl: { x: 10, y: 16 }, to: { x: 15, y: 36 } }])),
                S(buildStroke({ x: 9, y: 40 }, [
                    { type: 'line', to: { x: 14, y: 49 } },
                    { type: 'line', to: { x: 19, y: 40 } }
                ]))
            ],
            { anchorIn: { x: 12, y: 0 }, anchorOut: { x: 15, y: 36 } }
        )
    ]);

    addGlyph('ï', [ // i diaeresis
        V('idiaer1', 26,
            [
                S(buildStroke({ x: 12, y: 0 }, [{ type: 'quad', ctrl: { x: 10, y: 16 }, to: { x: 15, y: 36 } }])),
                S(buildStroke({ x: 10, y: 44 }, [{ type: 'line', to: { x: 11.4, y: 45 } }]), 1.4),
                S(buildStroke({ x: 18, y: 44 }, [{ type: 'line', to: { x: 19.4, y: 45 } }]), 1.4)
            ],
            { anchorIn: { x: 12, y: 0 }, anchorOut: { x: 15, y: 36 } }
        )
    ]);

    // ---------------------------------------------------------------
    // Punctuation (no cursive join: anchorIn/anchorOut null)
    // ---------------------------------------------------------------

    addGlyph(';', [
        V('semi1', 16,
            [
                S(buildStroke({ x: 6, y: 34 }, [{ type: 'line', to: { x: 7.4, y: 35 } }]), 1.4),
                S(buildStroke({ x: 8, y: 10 }, [{ type: 'quad', ctrl: { x: 8.5, y: 2 }, to: { x: 2, y: -6 } }]))
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph(':', [
        V('colon1', 14,
            [
                S(buildStroke({ x: 6, y: 34 }, [{ type: 'line', to: { x: 7.4, y: 35 } }]), 1.4),
                S(buildStroke({ x: 6, y: 8 }, [{ type: 'line', to: { x: 7.4, y: 9 } }]), 1.4)
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('!', [
        V('excl1', 16,
            [
                S(buildStroke({ x: 8, y: 50 }, [{ type: 'line', to: { x: 7, y: 16 } }])),
                S(buildStroke({ x: 6.3, y: 2 }, [{ type: 'line', to: { x: 7.7, y: 3 } }]), 1.4)
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('?', [
        V('quest1', 28,
            [
                S(buildStroke({ x: 6, y: 40 }, [
                    { type: 'quad', ctrl: { x: 6, y: 52 }, to: { x: 16, y: 52 } },
                    { type: 'quad', ctrl: { x: 26, y: 52 }, to: { x: 22, y: 38 } },
                    { type: 'quad', ctrl: { x: 18, y: 28 }, to: { x: 16, y: 18 } }
                ])),
                S(buildStroke({ x: 15, y: 2 }, [{ type: 'line', to: { x: 16.4, y: 3 } }]), 1.4)
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('\'', [
        V('apos1', 12,
            [S(buildStroke({ x: 6, y: 46 }, [{ type: 'quad', ctrl: { x: 8, y: 40 }, to: { x: 5, y: 36 } }]), 1.2)],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('"', [
        V('quote1', 18,
            [
                S(buildStroke({ x: 5, y: 46 }, [{ type: 'quad', ctrl: { x: 7, y: 40 }, to: { x: 4, y: 36 } }]), 1.2),
                S(buildStroke({ x: 12, y: 46 }, [{ type: 'quad', ctrl: { x: 14, y: 40 }, to: { x: 11, y: 36 } }]), 1.2)
            ],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('-', [
        V('hyphen1', 22,
            [S(buildStroke({ x: 4, y: 24 }, [{ type: 'line', to: { x: 18, y: 25 } }]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph('(', [
        V('lparen1', 20,
            [S(buildStroke({ x: 14, y: 64 }, [
                { type: 'quad', ctrl: { x: 2, y: 44 }, to: { x: 2, y: 24 } },
                { type: 'quad', ctrl: { x: 2, y: 4 }, to: { x: 14, y: -16 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    addGlyph(')', [
        V('rparen1', 20,
            [S(buildStroke({ x: 4, y: 64 }, [
                { type: 'quad', ctrl: { x: 16, y: 44 }, to: { x: 16, y: 24 } },
                { type: 'quad', ctrl: { x: 16, y: 4 }, to: { x: 4, y: -16 } }
            ]))],
            { anchorIn: null, anchorOut: null }
        )
    ]);

    window.HandwriterFonts = window.HandwriterFonts || {};
    window.HandwriterFonts['handwriting-default'] = {
        meta: {
            name: 'Handwriting Default',
            unitsPerEm: 100,
            xHeight: 50,
            capHeight: 68,
            ascender: 72,
            descender: -24,
            baseline: 0
        },
        glyphs: glyphs
    };

    // Exposed so the completion pass (remaining letters, digits, accents,
    // punctuation) can extend this same registry entry from another file
    // loaded right after this one, instead of duplicating the header.
    window.HandwriterFonts.__addGlyphHelpers = { S: S, V: V, buildStroke: buildStroke, ellipsePoint: pt };
})();
