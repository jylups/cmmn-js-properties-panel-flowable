'use strict';

var escapeHTML = require('../Utils').escapeHTML;

var domQuery = require('min-dom').query,
    domify = require('min-dom').domify;

var entryFieldDescription = require('./EntryFieldDescription');

var HIDE_CLASS = 'cpp-hidden';

var glyph = require('../helper/IconHelper').glyph;

// Font Awesome Free by @fontawesome - https://fontawesome.com (icon: CC BY 4.0)
var OPEN_ICON = glyph(require('@fortawesome/free-solid-svg-icons/faArrowUpRightFromSquare').faArrowUpRightFromSquare, 12);


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

  // options.pick: what the field holds, so that the application can offer
  // values to pick and open what the field links to (#90): 'case',
  // 'process', 'decision', 'form', 'event', 'channel', 'user' or 'group'.
  // options.pickMultiple: the field holds a comma separated list.
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
      pick = options.pick,
      hasList = !!(suggestions || pick),
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
        (hasList ? 'list="' + escapeHTML(listId) + '" autocomplete="off" autocapitalize="off" ' : '') +
        (pick ? 'data-pick="' + escapeHTML(pick) + '" ' + (options.pickMultiple ? 'data-pick-multiple ' : '') : '') +
        ' />' +
      (hasList ? '<datalist id="' + escapeHTML(listId) + '"></datalist>' : '') +
      (pick ?
        '<button type="button" class="cpp-pick-open ' + HIDE_CLASS + '" data-pick-open ' +
          'title="Open" aria-label="Open">' +
          OPEN_ICON + '<span>Open</span>' +
        '</button>' : '') +
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
