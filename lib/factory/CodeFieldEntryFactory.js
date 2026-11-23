'use strict';

var escapeHTML = require('../Utils').escapeHTML;

var domQuery = require('min-dom').query;

var entryFieldDescription = require('./EntryFieldDescription');

var highlight = require('../helper/ExpressionHighlightHelper').highlight;


/**
 * A field for an expression, as Flowable Design's code editor: a monospaced
 * text area that wraps and grows with its text, its expressions in syntax
 * colours. The colours are drawn by a copy of the text behind the (clear)
 * text area, so typing, selecting and the touch keyboard work as in any text
 * area.
 *
 * Conscia-LLC/conscia-modeler#105
 */
function codeField(options, resource) {

  var id = 'flowable-' + resource.id,
      label = options.label || resource.id,
      dataValueLabel = options.dataValueLabel,
      canBeDisabled = typeof options.disabled === 'function',
      showDisabled = canBeDisabled ? 'data-show="isDisabled" ' : '';

  resource.html =
    '<label for="' + escapeHTML(id) + '" ' + showDisabled +
      (dataValueLabel ? 'data-value="' + escapeHTML(dataValueLabel) + '"' : '') + '>' +
      escapeHTML(label) +
    '</label>' +
    '<div class="cpp-code-field" ' + showDisabled + '>' +
      '<pre class="cpp-code-highlight" aria-hidden="true"></pre>' +
      '<textarea id="' + escapeHTML(id) + '" name="' + escapeHTML(options.modelProperty) + '" ' +
        'rows="1" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off"' +
        (options.placeholder ? ' placeholder="' + escapeHTML(options.placeholder) + '"' : '') +
      '></textarea>' +
    '</div>';

  if (options.description) {
    resource.html += entryFieldDescription(options.description);
  }

  // the colours follow the text the panel puts in, and the text typed
  resource.updateView = function(element, node) {
    render(node);
  };

  if (canBeDisabled) {
    resource.isDisabled = function() {
      return !options.disabled.apply(resource, arguments);
    };
  }

  resource.cssClasses = [ 'cpp-code' ];

  return resource;
}

function render(node) {
  var textarea = domQuery('.cpp-code-field textarea', node),
      copy = domQuery('.cpp-code-highlight', node);

  if (!textarea || !copy) {
    return;
  }

  if (!textarea._cppHighlight) {
    textarea._cppHighlight = true;

    textarea.addEventListener('input', function() {
      copy.innerHTML = highlight(textarea.value);
    });
  }

  copy.innerHTML = highlight(textarea.value);
}


module.exports = codeField;
module.exports.render = render;
