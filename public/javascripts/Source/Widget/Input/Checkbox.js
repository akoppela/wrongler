/*
---
 
script: Checkbox.js
 
description: Boolean checkbox type of input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Input
  - Widgets/LSD.Widget.Input.Checkbox

provides: [Wrongler.Widget.Input.Checkbox]
 
...
*/

Wrongler.Widget.Input.Checkbox = new Class({
  Extends: LSD.Widget.Input.Checkbox,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});