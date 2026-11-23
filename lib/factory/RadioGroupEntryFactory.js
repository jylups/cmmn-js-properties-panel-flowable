'use strict';

var escapeHTML = require('../Utils').escapeHTML;

var entryFieldDescription = require('./EntryFieldDescription');


/**
 * A group of radio buttons, one per choice, as Flowable Design shows a choice
 * between a few options (such as No, Yes exclusive and Yes non-exclusive).
 *
 * Options, besides those of every entry (id, get, set, reference, hideEntry):
 * - label: the group's label
 * - modelProperty: the name of the value (default: the id)
 * - choices: [ { value, name } ], in their order
 * - description: a help text under the choices
 *
 * get returns { [modelProperty]: value of the chosen choice }, and set
 * receives the same.
 */
module.exports = function radioGroup(options, defaultParameters) {

  var resource = defaultParameters,
      id = resource.id,
      name = options.modelProperty || id,
      label = options.label || id;

  resource.modelProperty = name;

  resource.html =
    '<label class="cpp-radio-group-label">' + escapeHTML(label) + '</label>' +
    '<div class="cpp-radio-group" role="radiogroup" aria-label="' + escapeHTML(label) + '">' +
      (options.choices || []).map(function(choice) {
        var inputId = 'flowable-' + id + '-' + choice.value;

        return '<div class="cpp-radio">' +
          '<input type="radio" id="' + escapeHTML(inputId) + '" name="' + escapeHTML(name) + '" ' +
            'value="' + escapeHTML(choice.value) + '" />' +
          '<label for="' + escapeHTML(inputId) + '">' + escapeHTML(choice.name) + '</label>' +
        '</div>';
      }).join('') +
    '</div>' +
    (options.description ? entryFieldDescription(options.description) : '');

  return resource;
};
