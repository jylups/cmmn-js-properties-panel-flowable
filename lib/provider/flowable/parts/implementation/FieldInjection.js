'use strict';

var elementHelper = require('../../../../helper/ElementHelper'),
    cmdHelper = require('../../../../helper/CmdHelper');

var utils = require('../../../../Utils');

var entryFactory = require('../../../../factory/EntryFactory');

var extensionElementsEntry = require('./ExtensionElements');

var assign = require('lodash/assign');


var DEFAULT_PROPS = {
  'stringValue': undefined,
  'string': undefined,
  'cmmnString': undefined,
  'expression': undefined,
  'expressionElement': undefined,
  'cmmnExpression': undefined
};

/**
 * The string value of a field, from its <flowable:string> child element, its
 * stringValue attribute or its <string> child element in the CMMN namespace.
 *
 * @param {ModdleElement} bo flowable:Field
 *
 * @return {string|undefined}
 */
function getString(bo) {
  if (!bo) {
    return;
  }

  var value = bo.string || bo.stringValue;

  if (typeof value !== 'undefined') {
    return value;
  }

  return bo.cmmnString && bo.cmmnString.body;
}

/**
 * The expression of a field, from its expression attribute, its
 * <flowable:expression> child element or its <expression> child element in
 * the CMMN namespace.
 *
 * @param {ModdleElement} bo flowable:Field
 *
 * @return {string|undefined}
 */
function getExpression(bo) {
  if (!bo) {
    return;
  }

  if (typeof bo.expression !== 'undefined') {
    return bo.expression;
  }

  if (bo.expressionElement) {
    return bo.expressionElement.body;
  }

  return bo.cmmnExpression && bo.cmmnExpression.body;
}

/**
 * The child element in the CMMN namespace that holds the value of a field of
 * the given type, if the field was read in that form.
 *
 * @param {ModdleElement} bo flowable:Field
 * @param {string} fieldType string or expression
 *
 * @return {ModdleElement|undefined} cmmn:String or cmmn:Expression
 */
function getCmmnValueElement(bo, fieldType) {
  if (!bo) {
    return;
  }

  if (fieldType === 'string') {
    return bo.cmmnString;
  }

  if (fieldType === 'expression') {
    return bo.cmmnExpression;
  }
}

var FLOWABLE_FIELD_EXTENSION_ELEMENT = 'flowable:Field';

module.exports = function(element, cmmnFactory, translate, options) {

  options = options || {};

  var getSelectedListener = options.getListener,
      reference = 'definitionRef';

  var entries = [];

  var isSelected = function(element, node) {
    return getSelectedField(element, node);
  };

  function getSelectedField(element, node) {
    var selected = fieldEntry.getSelected(element, node.parentNode);

    if (selected.idx === -1) {
      return;
    }

    var formFields = getCamundaListenerFields(element, node);

    return formFields[selected.idx];
  }

  function getCamundaListenerFields(element, node) {
    var selectedListener = getSelectedListener(element, node);
    return selectedListener && selectedListener.fields || [];
  }

  function getFieldType(bo) {
    var fieldType = 'string';

    var expressionValue = getExpression(bo);
    var stringValue = getString(bo);

    if (typeof stringValue !== 'undefined') {
      fieldType = 'string';
    } else if (typeof expressionValue !== 'undefined') {
      fieldType = 'expression';
    }

    return fieldType;
  }

  var setOptionLabelValue = function() {
    return function(element, node, option, property, value, idx) {
      var camundaFields = getCamundaListenerFields(element,node);
      var field = camundaFields[idx];

      value = (field.name) ? field.name : '<empty>';

      var label = idx + ' : ' + value;

      option.text = label;
    };
  };

  var newElement = function() {
    return function(element, extensionElements, value, node) {
      var props = {
        name: '',
        string: ''
      };

      var selectedListener = getSelectedListener(element, node);
      var newFieldElem = elementHelper.createElement(FLOWABLE_FIELD_EXTENSION_ELEMENT, props, selectedListener, cmmnFactory);
      return cmdHelper.addElementsTolist(element, selectedListener, 'fields', [ newFieldElem ]);

    };
  };

  var removeElement = function() {
    return function(element, extensionElements, value, idx, node) {
      var camundaFields= getCamundaListenerFields(element, node);
      var field = camundaFields[idx];
      if (field) {
        var selectedListener = getSelectedListener(element, node);
        return cmdHelper.removeElementsFromList(element, selectedListener, 'fields', null, [ field ]);
      }
    };
  };


  var fieldEntry = extensionElementsEntry(element, cmmnFactory, {
    id : 'listener-fields',
    label : translate('Fields'),
    modelProperty: 'fieldName',
    reference: reference,
    idGeneration: 'false',

    createExtensionElement: newElement(),
    removeExtensionElement: removeElement(),

    getExtensionElements: function(element, node) {
      return getCamundaListenerFields(element, node);
    },

    setOptionLabelValue: setOptionLabelValue()

  });
  entries.push(fieldEntry);


  entries.push(entryFactory.validationAwareTextField({
    id: 'listener-field-name',
    label: translate('Name'),
    reference: reference,
    modelProperty: 'fieldName',

    get: function(element, node) {
      return { fieldName: (getSelectedField(element, node) || {}).name };
    },

    set: function(element, values, node) {
      var selectedField = getSelectedField(element, node);
      return cmdHelper.updateBusinessObject(element, selectedField, { name : values.fieldName });
    },

    validate: function(element, values, node) {
      var bo = getSelectedField(element, node);

      var validation = {};
      if (bo) {
        var nameValue = values.fieldName;

        if (nameValue) {
          if (utils.containsSpace(nameValue)) {
            validation.fieldName = translate('Name must not contain spaces');
          }
        }
        else {
          validation.fieldName = translate('Parameter must have a name');
        }
      }

      return validation;
    },

    disabled: function(element, node) {
      return !isSelected(element, node);
    }

  }));


  entries.push(entryFactory.selectBox({
    id: 'listener-field-type',
    label: translate('Type'),
    selectOptions: [
      {
        name: translate('String'),
        value: 'string'
      },
      {
        name: translate('Expression'),
        value: 'expression'
      }
    ],
    reference: reference,
    modelProperty: 'fieldType',

    get: function(element, node) {
      var bo = getSelectedField(element, node);

      var fieldType = getFieldType(bo);

      return {
        fieldType: fieldType
      };
    },

    set: function(element, values, node) {
      var props = assign({}, DEFAULT_PROPS);

      var fieldType = values.fieldType;

      if (fieldType === 'string') {
        props.string = '';
      }
      else if (fieldType === 'expression') {
        props.expression = '';
      }

      return cmdHelper.updateBusinessObject(element, getSelectedField(element, node), props);
    },

    disabled: function(element, node) {
      return !isSelected(element, node);
    }

  }));


  entries.push(entryFactory.textBox({
    id: 'listener-field-value',
    label: translate('Value'),
    reference: reference,
    modelProperty: 'fieldValue',

    get: function(element, node) {
      var bo = getSelectedField(element, node);
      var fieldType = getFieldType(bo);

      var fieldValue;

      if (fieldType === 'string') {
        fieldValue = getString(bo);
      }
      else if (fieldType === 'expression') {
        fieldValue = getExpression(bo);
      }

      return {
        fieldValue: fieldValue
      };
    },

    set: function(element, values, node) {
      var bo = getSelectedField(element, node);
      var fieldType = getFieldType(bo);

      var fieldValue = values.fieldValue || undefined;

      // keep a value read as a child element in the CMMN namespace in that
      // form; changing its body keeps the element without an ID
      var cmmnValueElement = getCmmnValueElement(bo, fieldType);

      if (cmmnValueElement) {
        return cmdHelper.updateBusinessObject(element, cmmnValueElement, { body: fieldValue });
      }

      var props = assign({}, DEFAULT_PROPS);

      if (fieldType === 'string') {
        props.string = fieldValue;
      }
      else if (fieldType === 'expression') {

        // keep the form the expression was read in
        if (bo && bo.expressionElement) {
          props.expressionElement = elementHelper.createElement(
            'flowable:Expression', { body: fieldValue }, bo, cmmnFactory);
        } else {
          props.expression = fieldValue;
        }
      }

      return cmdHelper.updateBusinessObject(element, bo, props);

    },

    validate: function(element, values, node) {
      var bo = getSelectedField(element, node);

      var validation = {};
      if (bo) {
        if (!values.fieldValue) {
          validation.fieldValue = translate('Must provide a value');
        }
      }

      return validation;
    },

    show: function(element, node) {
      return isSelected(element, node);
    }

  }));

  return entries;

};
