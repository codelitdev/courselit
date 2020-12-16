/**
 * Local patch for draft-js-multidecorators.
 */

import MultiDecorator from "draft-js-multidecorators";
import Immutable from "immutable";

var KEY_SEPARATOR = "-";

// Passing contentState down.
// Reference: https://github.com/SamyPesse/draft-js-multidecorators/issues/4
MultiDecorator.prototype.getDecorations = function (block, contentState) {
  var decorations = Array(block.getText().length).fill(null);

  this.decorators.forEach(function (decorator, i) {
    var _decorations = decorator.getDecorations(block, contentState);

    _decorations.forEach(function (key, offset) {
      if (!key) {
        return;
      }

      key = i + KEY_SEPARATOR + key;

      decorations[offset] = key;
    });
  });

  return Immutable.List(decorations);
};

export default MultiDecorator;
