/*
---
 
script: Dialog.js
 
description: An in-page independent document (like iphone app page)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Body
  - Native/LSD.Native.Body
  - LSD/LSD.Trait.Fieldset

provides:
  - Wrongler.Widget.Body.Dialog

...
*/

Wrongler.Widget.Body.Dialog = new Class({
  Includes: [
    LSD.Native.Body,
    LSD.Trait.Fieldset
  ],
  
  options: {
    tag: 'dialog',
    pseudos: Array.fast('submittable'),
    nodeType: 1,
    element: {
      tag: 'section'
    },
    transformation: {
      name: 'pop'
    },
    events: {
      _dialog: {
        element: {
          'click:relay(.cancel)': 'cancel'
        },
        self: {
          show: 'build',
          build: function() {
            this.element.inject(document.id('content'));
          }
        }
      }
    },
    has: {
      one: {
        'form': {
          selector: 'form',
          chain: {
            'submission': function() {
              return {action: 'send', target: this.document}
            }
          }
        }
      }
    }
  },
  
  cancel: function() {
    this.hide();
    this.fireEvent('cancel', arguments);
  },
  
  submit: function() {
    this.hide();
    this.fireEvent('submit', arguments);
  },
  
  getData: function() {
    return (this.form ? this.form.getData : this.parent).apply(this.form || this, arguments);
  },
  
  hidden: true
});