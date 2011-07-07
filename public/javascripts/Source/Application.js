/*
---
 
script: Application.js
 
description: Main script of application
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler
  - Wrongler.Widget.*
  - Widgets/LSD.Widget.Button
  - Widgets/LSD.Widget.Form
  - LSD/LSD.Mixin.Request
  - LSD/LSD.Mixin.Target
  - LSD/LSD.Action.*
  - LSD/LSD.Document
  
  
provides:
  - Wrongler.Application
 
...
*/

LSD.Element.pool.push(LSD.Widget);

Wrongler.Application = new LSD.Document({
  mutations: {
    'a.button[type="submit"]': 'button-submit',
    'a.button': 'button'
  }
});

LSD.Allocations.lightbox.parent = function() {
  return document.id('content');
};