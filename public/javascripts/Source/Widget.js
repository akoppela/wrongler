/*
---
 
script: Widget.js
 
description: Basic widget
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler
  - LSD/LSD.Type

provides:
  - Wrongler.Widget
 
...
*/

new LSD.Type('Widget', 'Wrongler');

// Inject native widgets into default widget pool as a fallback
LSD.Element.pool.unshift(Wrongler.Widget);