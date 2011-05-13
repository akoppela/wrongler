/*
---
 
script: Select.js
 
description: Basic selectbox
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget
  - Widgets/LSD.Widget.Select

provides: [Wrongler.Widget.Select, Wrongler.Widget.Select.Button, Wrongler.Widget.Select.Option]

...
*/

Wrongler.Widget.Select = new Class({
  Extends: LSD.Widget.Select,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});

Wrongler.Widget.Select.Button = LSD.Widget.Select.Button;

Wrongler.Widget.Select.Option = new Class({
  Extends: LSD.Widget.Select.Option,
  
  options: {
    element: {
      tag: 'div'
    }
  }
});

Wrongler.Widget.Menu = LSD.Widget.Menu;

Wrongler.Widget.Menu.Context = new Class({
  Extends: LSD.Widget.Menu.Context,
  
  options: {
    attributes: {
      animation: 'fade'
    },
    animation: {
      duration: 350,
      transition: 'circ:out' 
    }
  }
});