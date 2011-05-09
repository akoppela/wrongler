/*
---

name: Target.js

description: Monkey patch for Module Target.

license: MIT-style license.

extends: LSD/LSD.Module.Target

...
*/

!function(parseTargetSelector, getTargetAction) {
  LSD.Module.Target.implement({
    parseTargetSelector: function(selector) {
      if (selector == 'lightbox') return [{target: selector}];
      return parseTargetSelector.apply(this, arguments);
    },

    getTargetAction: function() {
      if (this.attributes.target == 'lightbox') return 'dialog';
      return getTargetAction.apply(this, arguments);
    }
  });
}(LSD.Module.Target.prototype.parseTargetSelector, LSD.Module.Target.prototype.getTargetAction);