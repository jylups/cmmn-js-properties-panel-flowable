'use strict';

var domAttr = require('min-dom').attr,
    domQueryAll = require('min-dom').queryAll,
    domClasses = require('min-dom').classes;

var escapeHTML = require('../../../../Utils').escapeHTML;


/**
 * Flowable Design's T / ⚡ switch of a condition: T shows a fixed value (a
 * check for True), ⚡ an expression. The condition is shown as one or the
 * other, never both: as an expression when it has one, else as the user last
 * switched it (kept on the entry's node while it is shown), else as a value.
 *
 * Conscia-LLC/conscia-modeler#108
 */

var MODE_ATTR = 'data-condition-mode';

var FIXED = 'fixed',
    EXPRESSION = 'expression';

/**
 * The switch's two buttons, for an entry's html. Their clicks call the entry's
 * `useFixed` and `useExpression` actions.
 *
 * @param {string} label the condition's name, for screen readers
 */
function html(label, translate) {
  return (
    '<div class="cpp-condition-switch" role="group" aria-label="' +
        escapeHTML(translate('{label}: value or expression').replace('{label}', label)) + '">' +
      '<button type="button" class="cpp-condition-switch-option" data-action="useFixed" data-mode="' + FIXED + '" ' +
        'title="' + escapeHTML(translate('A value')) + '" aria-label="' + escapeHTML(translate('A value')) + '">T</button>' +
      '<button type="button" class="cpp-condition-switch-option" data-action="useExpression" data-mode="' + EXPRESSION + '" ' +
        'title="' + escapeHTML(translate('An expression')) + '" aria-label="' + escapeHTML(translate('An expression')) + '">' +
        // the text form of the glyph, which takes the button's color
        '\u26a1\ufe0e</button>' +
    '</div>'
  );
}

/**
 * The mode the condition is shown in.
 *
 * @param {Element} node the entry's node (or a node inside it)
 * @param {boolean} hasExpression whether the condition is an expression
 * @return {string} 'fixed' or 'expression'
 */
function getMode(node, hasExpression) {

  if (hasExpression) {
    return EXPRESSION;
  }

  return domAttr(entryNode(node), MODE_ATTR) === EXPRESSION ? EXPRESSION : FIXED;
}

/**
 * Keep the mode the user switched to, and show it on the buttons.
 */
function setMode(node, mode) {
  domAttr(entryNode(node), MODE_ATTR, mode);

  showMode(node, mode);
}

/**
 * Show a mode on the switch's buttons.
 */
function showMode(node, mode) {
  var entry = entryNode(node);

  if (!entry) {
    return;
  }

  Array.prototype.forEach.call(domQueryAll('.cpp-condition-switch-option', entry), function(button) {
    var pressed = domAttr(button, 'data-mode') === mode;

    domAttr(button, 'aria-pressed', pressed ? 'true' : 'false');
    domClasses(button).toggle('cpp-active', pressed);
  });
}

/**
 * Show or hide a part of the condition for the mode. Hidden with a class of
 * its own, not the panel's hidden class, so the field keeps taking part in
 * the entry's values and the read view.
 */
function toggle(node, shown) {
  if (node) {
    domClasses(node).toggle('cpp-condition-off', !shown);
  }
}

function entryNode(node) {
  while (node && !(node.getAttribute && node.getAttribute('data-entry'))) {
    node = node.parentNode;
  }

  return node;
}


module.exports = {
  html: html,
  getMode: getMode,
  setMode: setMode,
  showMode: showMode,
  toggle: toggle,
  FIXED: FIXED,
  EXPRESSION: EXPRESSION
};
