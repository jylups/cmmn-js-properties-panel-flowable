'use strict';

var escapeHTML = require('../Utils').escapeHTML;

var domQuery = require('min-dom').query,
    domify = require('min-dom').domify;

var entryFieldDescription = require('./EntryFieldDescription');


var textField = function(options, defaultParameters) {

  // Default action for the button next to the input-field
  var defaultButtonAction = function(element, inputNode) {
    var input = domQuery('input[name="' + options.modelProperty + '"]', inputNode);
    input.value = '';

    return true;
  };

  // default method to determine if the button should be visible
  var defaultButtonShow = function(element, inputNode) {
    var input = domQuery('input[name="' + options.modelProperty + '"]', inputNode);

    return input.value !== '';
  };

  var resource = defaultParameters,
      label = options.label || resource.id,
      dataValueLabel = options.dataValueLabel,
      buttonLabel = (options.buttonLabel || 'X'),
      actionName = (typeof options.buttonAction != 'undefined') ? options.buttonAction.name : 'clear',
      actionMethod = (typeof options.buttonAction != 'undefined') ? options.buttonAction.method : defaultButtonAction,
      showName = (typeof options.buttonShow != 'undefined') ? options.buttonShow.name : 'canClear',
      showMethod = (typeof options.buttonShow != 'undefined') ? options.buttonShow.method : defaultButtonShow,
      canBeDisabled = !!options.disabled && typeof options.disabled === 'function',
      description = options.description,
      suggestions = options.suggestions,
      listId = 'flowable-' + resource.id + '-suggestions';

  resource.html =
    '<label for="flowable-' + resource.id + '" ' +
      (canBeDisabled ? 'data-show="isDisabled" ' : '') +
      (dataValueLabel ? 'data-value="' + escapeHTML(dataValueLabel) + '"' : '') + '>'+ escapeHTML(label) +'</label>' +
    '<div class="cpp-field-wrapper" ' +
      (canBeDisabled ? 'data-show="isDisabled"' : '') +
      '>' +
      '<input id="flowable-' + escapeHTML(resource.id) + '" type="text" name="' + escapeHTML(options.modelProperty) + '" ' +
        (options.placeholder ? 'placeholder="' + escapeHTML(options.placeholder) + '" ' : '') +
        (suggestions ? 'list="' + escapeHTML(listId) + '" autocomplete="off" autocapitalize="off" ' : '') +
        ' />' +
      (suggestions ? '<datalist id="' + escapeHTML(listId) + '"></datalist>' : '') +
      '<button class="' + escapeHTML(actionName) + '" data-action="' + escapeHTML(actionName) +
        '" data-show="' + escapeHTML(showName) + '" ' +
        (canBeDisabled ? 'data-disabled="isDisabled"' : '') + '>' +
        '<span>' + escapeHTML(buttonLabel) + '</span>' +
      '</button>' +
    '</div>';

  // add description below text input entry field
  if (description) {
    resource.html += entryFieldDescription(description);
  }

  resource[actionName] = actionMethod;
  resource[showName] = showMethod;

  if (canBeDisabled) {
    resource.isDisabled = function() {
      return !options.disabled.apply(resource, arguments);
    };
  }

  // the values to pick from, such as the case's variables (#105), as the
  // model has them now
  if (suggestions) {
    resource.updateView = function(element, node) {
      var list = domQuery('datalist', node);

      if (!list) {
        return;
      }

      var values = suggestions(element, node) || [],
          current = Array.prototype.map.call(list.options, function(option) {
            return option.value;
          });

      if (current.join('\n') === values.join('\n')) {
        return;
      }

      list.innerHTML = '';

      values.forEach(function(value) {
        var option = domify('<option></option>');

        option.value = value;
        list.appendChild(option);
      });
    };
  }

  resource.cssClasses = ['cpp-textfield'];

  return resource;
};

module.exports = textField;
