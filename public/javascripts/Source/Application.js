/*
---
 
script: Application.js
 
description: Main script of application
 
license: Public domain (http://unlicense.org).

authors: Andrey Koppel
 
requires:
  - Wrongler
  - Wrongler.Widget.*
  - Native/LSD.Native.Form
  - Native/LSD.Native.Textarea
  - Native/LSD.Native.Button
  - Native/LSD.Native.Label
  - LSD/LSD.Action.*
  - LSD/LSD.Application
  
provides:
  - Wrongler.Application
 
...
*/

Wrongler.Application = new LSD.Application(document);

// Transformations
Wrongler.Transformations = {
  'a.button': 'button',
  'a.button[type="submit"]': 'input[type="submit"]',
  'div[animation]': 'animated'
};
Wrongler.Widget.Body.prototype.options.mutations = Wrongler.Transformations;
Wrongler.Widget.Body.prototype.options.layout.options.context = 'element';