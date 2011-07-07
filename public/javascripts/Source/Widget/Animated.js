/*
---
 
script: Animated.js
 
description: Basic widget animated
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler.Widget
  - LSD/LSD.Mixin.Animation
  - LSD/LSD.Mixin.Focusable
  - Core/Fx.Transitions

provides:
  - Wrongler.Widget.Animated
 
...
*/

Wrongler.Widget.Animated = new Class({
  options: {
    tag: 'widget',
    animation: {
      duration: 350,
      transition: 'circ:out'
    }
  }
});