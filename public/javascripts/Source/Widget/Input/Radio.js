/*
---
 
script: Radio.js
 
description: A radio button, set of connected widgets that steal checkedness from each other
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
 - Wrongler.Widget.Input
 - Widgets/LSD.Widget.Input.Radio

provides: [Wrongler.Widget.Input.Radio]
 
...
*/

Wrongler.Widget.Input.Radio = new Class({
  Extends: LSD.Widget.Input.Radio,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});