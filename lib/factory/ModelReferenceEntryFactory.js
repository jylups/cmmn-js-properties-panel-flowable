'use strict';

var escapeHTML = require('../Utils').escapeHTML;

var glyph = require('../helper/IconHelper').glyph;

/**
 * Font Awesome Free by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (icons: CC BY 4.0)
 */
var MODEL_ICON = glyph(require('@fortawesome/free-solid-svg-icons/faFont').faFont, 12),
    EXPRESSION_ICON = glyph(require('@fortawesome/free-solid-svg-icons/faBolt').faBolt, 12);

/**
 * A reference to a model, as Flowable Design shows a process task's Process
 * reference (jylups/cmmn-js-env#98). The pop-up offers to link an existing
 * model from a list, to create a new one (when the host can), or to enter an
 * expression; the T / ⚡ switch chooses between a model and an expression.
 * The model keeps only the key, in the entry's input; the panel fills the
 * list from the host and handles the pop-up (see PropertiesPanel,
 * _updateModelReferences).
 *
 * options, as a text field's, and:
 * - kind: what the reference holds ('process', 'case' or 'decision');
 * - kindLabel: its name in the prompt (Process);
 * - taskLabel: the element's (Process task).
 */
module.exports = function(options, resource) {

  var id = escapeHTML(resource.id),
      kind = escapeHTML(options.kind),
      what = escapeHTML(options.kindLabel),
      task = escapeHTML(options.taskLabel);

  resource.html =
    '<label for="flowable-' + id + '">' + escapeHTML(options.label) +
      ' <span class="cpp-required" aria-hidden="true">*</span></label>' +
    '<div class="cpp-model-reference" data-model-reference="' + kind + '">' +
      '<div class="cpp-model-reference-head">' +
        // with a host that creates models, as Flowable Design asks
        '<p class="cpp-model-reference-prompt" data-ref-prompt="create">' +
          '<button type="button" class="cpp-link-button" data-ref-show="create">Create a new ' + what + '</button>' +
          ' for the ' + task + ', ' +
          '<button type="button" class="cpp-link-button" data-ref-show="link">link to an existing one</button>' +
          ', or click <b>Finish</b> to skip this step' +
        '</p>' +
        '<p class="cpp-model-reference-prompt" data-ref-prompt="link">' +
          '<button type="button" class="cpp-link-button" data-ref-show="link">Link the ' + task + ' to an existing ' +
            what.toLowerCase() + '</button>, or click <b>Finish</b> to skip this step' +
        '</p>' +
        '<div class="cpp-model-reference-switch" role="group" aria-label="A model or an expression">' +
          '<button type="button" data-ref-show="link" title="A model" aria-label="A model">' + MODEL_ICON + '</button>' +
          '<button type="button" data-ref-show="expression" title="An expression" aria-label="An expression">' +
            EXPRESSION_ICON +
          '</button>' +
        '</div>' +
      '</div>' +
      '<p class="cpp-model-reference-required" data-ref-required>A model reference is required</p>' +
      '<div class="cpp-model-reference-pane" data-ref-pane="link">' +
        '<p class="cpp-model-reference-current" data-ref-current></p>' +
        '<input type="search" class="cpp-model-reference-filter" data-ref-filter ' +
          'placeholder="Filter by name" aria-label="Filter by name" autocomplete="off" autocapitalize="off" />' +
        '<table class="cpp-model-reference-table">' +
          '<thead><tr><th scope="col">Model</th><th scope="col">Modified</th><th scope="col">Where</th></tr></thead>' +
          '<tbody data-ref-rows></tbody>' +
        '</table>' +
        '<p class="cpp-model-reference-empty" data-ref-empty>No models to link.</p>' +
      '</div>' +
      '<div class="cpp-model-reference-pane" data-ref-pane="create">' +
        '<div class="cpp-model-reference-fields">' +
          '<label>Name <span class="cpp-required" aria-hidden="true">*</span>' +
            '<input type="text" data-ref-create-name autocomplete="off" /></label>' +
          '<label>Key <span class="cpp-required" aria-hidden="true">*</span>' +
            '<input type="text" data-ref-create-key autocomplete="off" autocapitalize="off" /></label>' +
          '<label class="cpp-model-reference-description">Description' +
            '<textarea data-ref-create-description rows="3"></textarea></label>' +
        '</div>' +
        '<button type="button" class="cpp-model-reference-create" data-ref-create>Create</button>' +
        '<p class="cpp-model-reference-error" data-ref-create-error></p>' +
      '</div>' +
      '<div class="cpp-model-reference-pane cpp-field-wrapper" data-ref-pane="expression">' +
        '<input id="flowable-' + id + '" type="text" name="' + escapeHTML(options.modelProperty) + '" ' +
          'data-ref-input autocomplete="off" autocapitalize="off" placeholder="${…}" />' +
      '</div>' +
    '</div>';

  // the read view: the model's name and key, which open it
  resource.summaryValue = options.summaryValue;

  resource.cssClasses = [ 'cpp-model-reference-entry' ];

  return resource;
};
