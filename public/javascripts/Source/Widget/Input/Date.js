/*
---
 
script: Date.js
 
description: Date picker input
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Wrongler.Widget.Input
  - Native/LSD.Native.Table.Calendar
  - LSD/LSD.Widget
  - LSD/LSD.Trait.Date

provides: 
  - Wrongler.Widget.Input.Date

...
*/

Wrongler.Widget.Input.Date = new Class({
  Includes: [
    LSD.Widget,
    LSD.Trait.Date
  ],
  
  options: {
    tag: 'input',
    attributes: {
      type: 'date'
    },
    element: {
      tag: 'div'
    },
    date: {
      format: '%d %b %Y'
    },
    shortcuts: {
      cancel: 'cancel'
    },
    events: {
      _date: {
        element: {
          click: 'expand'
        },
        self: {
          blur: 'collapse',
          dominject: function(){
            this.setDate(this.getDate());
          }
        } 
      }
    },
    writable: true,
    layout: {
      children: Array.fast('::button')
    },
    has: {
      one: {
        button: {
          selector: 'button',
          layout: 'select-button'
        },
        datepicker: {
          selector: ':datepicker',
          layout: 'datepicker',
          events: {
            self: {
              selectDate: function(date){
                this.listWidget.setDate(date);
                this.listWidget.collapse();
              }
            },
            element: {
              click: function(event){
                if (event) event.stop();
              }
            }
          }
        }
      }
    },
    states: Array.fast('expanded')
  },
  
  setDate: function(date) {
    this.parent.apply(this, arguments);
    if (date){
      this.setValue(this.formatDate(date));
      this.write(this.formatDate(date));
    };
    if (this.datepicker) this.datepicker.setDate(date);
  },
  
  cancel: function() {
    this.collapse();
  },
  
  buildDatepicker: function(){
    return this.buildLayout(this.options.layout.datepicker);
  },
  
  expand: function() {
    if (!this.datepicker){
      this.datepicker = this.buildDatepicker();
      this.datepicker.listWidget = this;
    };
    this.datepicker.show();
  },
  
  collapse: function(){
    if(this.datepicker) this.datepicker.hide();
  }
});

Wrongler.Widget.Datepicker = new Class({
  Includes: [
    LSD.Widget,
    LSD.Trait.Date
  ],
  
  options: {
    attributes: {
      animation: 'fade'
    },
    animation: {
      duration: 350,
      transition: 'circ:out'
    },
    classes: Array.fast('datepicker'),
    pseudos: Array.fast('datepicker'),
    writable: true,
    layout: {
      children: {
        '.arrow::decrementor': 'Previous month',
        '.arrow::incrementor': 'Next month',
        '::table': true
      }
    },
    has: {
      one: {
        table: {
          selector: 'table[type=calendar]',
          events: {
            set: 'selectDate'
          }
        },
        decrementor: {
          selector: 'button#decrement',
          events: {
            click: 'decrement'
          }
        },
        incrementor: {
          selector: 'button#increment',
          events: {
            click: 'increment'
          }
        }
      }
    }
  },
  
  getData: function() {
    return this.date;
  },
  
  setDate: function(date) {
    this.parent.apply(this, arguments);
    this.table.setDate(date);
  },
  
  selectDate: function(date) {
    this.setDate(date);
    this.fireEvent('onSelectDate', date);
  }  
});