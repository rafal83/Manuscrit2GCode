# Source of these font files

`HersheyScript1.svg` and `HersheyScriptMed.svg` are copied verbatim from
[techninja/hersheytextjs](https://github.com/techninja/hersheytextjs)
(`svg_fonts/` directory), MIT License, Copyright (c) 2014 James T.

That project is itself a port of the classic **Hershey Fonts**, originally
designed by Dr. Allen V. Hershey at the US Naval Weapons Laboratory in the
1960s specifically for pen-plotter/vector engraving equipment, and long in
the public domain.

Used here as the geometric source for `fonts/handwriting-default/font.js`'s
letterforms (see `tools/convert-hershey.js`), converted into this project's
own glyph JSON format. Not loaded by the app itself - only the generated
`font.js` is.
