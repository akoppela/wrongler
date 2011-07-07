/*
---
 
script: Lightbox.js
 
description: An in-page independent document (like iphone app page)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Body
  - Core/Element.Dimensions

provides:
  - Wrongler.Widget.Body.Lightbox

...
*/

Wrongler.Widget.Body.Lightbox = new Class({
  Extends: Wrongler.Widget.Body,

  options: {
    element: {
      tag: 'section',
      id: 'lightbox'
    },
    attributes: {
      type: 'lightbox'
    },
    container: {
      enabled: true
    },
    lightbox: {
      top: 130
    },
    events : {
      _lightbox: {
        element: {
          'click:relay(.cancel)': 'cancel'
        },
        self: {
          build: function(){
            this.overlay = new Element('div', {
              'class': 'overlay'
            }).inject(this.element);
            this.overlay.addEvent('click', function(){
              this.cancel();
            }.bind(this));
            this.addEvent('destroy', this.overlay.destroy.bind(this.overlay));
            this.getWrapper().setStyle('top', document.body.getScroll().y + this.options.lightbox.top);
          }
        }
      }
    }
  },
  
  cancel: function() {
    this.destroy();
    this.fireEvent('cancel', arguments);
  }
});