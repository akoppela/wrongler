/*
---
 
script: Dialog.Lightbox.js
 
description: An in-page independent document (like iphone app page)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Body.Dialog
  - LSD/LSD.Mixin.Focus

provides:
  - Wrongler.Widget.Body.Dialog.Lightbox

...
*/

Wrongler.Widget.Body.Dialog.Lightbox = new Class({
  Extends: Wrongler.Widget.Body.Dialog,

  options: {
    tag: 'lightbox',
    container: {
      enabled: true
    },
    events : {
      _lightbox: {
        self: {
          build: function(){
            this.overlay = new Element('div', {
              'class': 'overlay',
              events: {
                click: function(){
                  this.cancel();
                }.bind(this)
              }
            }).inject(this.element);
            this.addEvent('destroy', this.overlay.destroy.bind(this.overlay));
          }
        }
      }
    }
  }
});