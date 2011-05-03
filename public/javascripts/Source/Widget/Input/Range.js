/*
---
 
script: Range.js
 
description: Range slider input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Input
  - Widgets/LSD.Widget.Input.Range

provides: [Wrongler.Widget.Input.Range]
 
...
*/

Wrongler.Widget.Input.Range = new Class({
  Extends: LSD.Widget.Input.Range,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});

Wrongler.Widget.Input.Range.Thumb = LSD.Widget.Input.Range.Thumb;