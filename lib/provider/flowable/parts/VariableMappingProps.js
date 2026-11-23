'use strict';

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is,
    getDefinition = require('@jylups/cmmn-js/lib/util/ModelUtil').getDefinition;

var filter = require('lodash/filter');

var extensionElementsHelper = require('../../../helper/ExtensionElementsHelper'),
    cmdHelper = require('../../../helper/CmdHelper'),

    cmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isInOutBindingCapable = cmmnElementHelper.isInOutBindingCapable;

var extensionElementsEntry = require('./implementation/ExtensionElements'),
    variableMapping = require('./implementation/VariableMapping');

var entryFactory = require('../../../factory/EntryFactory');

var getCaseVariables = require('../../../helper/CaseVariablesHelper').getCaseVariables;

/**
  * return depend on parameter 'type' flowable:in or flowable:out extension elements
  */
function getCamundaInOutMappings(bo, type) {
  return (bo && extensionElementsHelper.getExtensionElements(bo, type)) || [];
}

/**
  * return depend on parameter 'type' flowable:in or flowable:out extension elements
  * with source or sourceExpression attribute
  */
function getVariableMappings(bo, type, reference) {
  var camundaMappings = getCamundaInOutMappings(bo, type);
  return filter(camundaMappings, function(mapping) {
    return !mapping.businessKey;
  });
}

var FLOWABLE_IN_EXTENSION_ELEMENT = 'flowable:In',
    FLOWABLE_OUT_EXTENSION_ELEMENT = 'flowable:Out';


/**
 * The read view's table of the mappings of one direction, as Flowable Design
 * shows them: a Source and a Target column.
 */
function summaryTable(label, type, translate) {
  return variableMapping.summaryTable(label, function(element) {
    return getVariableMappings(getDefinition(element), type);
  }, translate);
}


module.exports = function(group, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate) {

  if (!isInOutBindingCapable(element)) {
    return;
  }

  var firstEntry = group.entries.length;

  var isSelected = function(element, node) {
    return !!getSelected(element, node);
  };

  var getSelected = function(element, node) {
    var parentNode = node.parentNode;
    var selection = inEntry.getSelected(element, parentNode);

    var parameter = getVariableMappings(getDefinition(element), FLOWABLE_IN_EXTENSION_ELEMENT)[selection.idx];
    if (!parameter && outEntry) {
      selection = outEntry.getSelected(element, parentNode);
      parameter = getVariableMappings(getDefinition(element), FLOWABLE_OUT_EXTENSION_ELEMENT)[selection.idx];
    }
    return parameter;
  };

  // a row of the list, as Flowable Design shows it: "source → target"
  var setOptionLabelValue = function(type) {
    return function(element, node, option, property, value, idx, bo) {
      option.text = variableMapping.rowLabel(getVariableMappings(bo, type)[idx]);
      option.title = option.text;
    };
  };

  // moves a mapping among those of its direction; the other extension elements keep their place
  var moveElement = function(type) {
    return variableMapping.moveMapping(function(element) {
      return getVariableMappings(getDefinition(element), type);
    });
  };

  var newElement = function(type) {
    return function(element, extensionElements, value) {
      var newElem = cmmnFactory.create(type, { source: '' });
      return cmdHelper.updateSemanticParent(newElem, extensionElements, 'values', element);
    };
  };

  var removeElement = function(type) {
    return function(element, extensionElements, value, idx) {
      var variablesMappings= getVariableMappings(getDefinition(element), type);
      var mapping = variablesMappings[idx];
      return extensionElementsHelper.removeEntry(getDefinition(element), element, mapping);
    };
  };

  // in mapping for source and sourceExpression ///////////////////////////////////////////////////////////////

  var inEntry = extensionElementsEntry(element, cmmnFactory, {
    id: 'variableMapping-in',
    label: translate('In Mapping'),
    modelProperty: 'source',
    prefix: 'In',
    idGeneration: false,
    resizable: true,
    reference: 'definitionRef',

    createExtensionElement: newElement(FLOWABLE_IN_EXTENSION_ELEMENT),
    removeExtensionElement: removeElement(FLOWABLE_IN_EXTENSION_ELEMENT),
    moveExtensionElement: moveElement(FLOWABLE_IN_EXTENSION_ELEMENT),
    rowDelete: true,

    getExtensionElements: function(element, bo) {
      return getVariableMappings(bo, FLOWABLE_IN_EXTENSION_ELEMENT);
    },

    onSelectionChange: function(element, node, event, scope) {
      outEntry && outEntry.deselect(element, node.parentNode);
    },

    setOptionLabelValue: setOptionLabelValue(FLOWABLE_IN_EXTENSION_ELEMENT)
  });
  inEntry.summaryTable = summaryTable('In', FLOWABLE_IN_EXTENSION_ELEMENT, translate);
  group.entries.push(inEntry);

  // out mapping for source and sourceExpression ///////////////////////////////////////////////////////

  var outEntry = extensionElementsEntry(element, cmmnFactory, {
    id: 'variableMapping-out',
    label: translate('Out Mapping'),
    modelProperty: 'source',
    prefix: 'Out',
    idGeneration: false,
    resizable: true,
    reference: 'definitionRef',

    createExtensionElement: newElement(FLOWABLE_OUT_EXTENSION_ELEMENT),
    removeExtensionElement: removeElement(FLOWABLE_OUT_EXTENSION_ELEMENT),
    moveExtensionElement: moveElement(FLOWABLE_OUT_EXTENSION_ELEMENT),
    rowDelete: true,

    getExtensionElements: function(element, bo) {
      return getVariableMappings(bo, FLOWABLE_OUT_EXTENSION_ELEMENT);
    },

    onSelectionChange: function(element, node, event, scope) {
      inEntry.deselect(element, node.parentNode);
    },

    setOptionLabelValue: setOptionLabelValue(FLOWABLE_OUT_EXTENSION_ELEMENT)
  });
  outEntry.summaryTable = summaryTable('Out', FLOWABLE_OUT_EXTENSION_ELEMENT, translate);

  // In and Out are edited on one screen, each with its own edit button
  outEntry.editWith = inEntry.id;
  outEntry.editButton = true;

  group.entries.push(outEntry);

  // label for selected mapping ///////////////////////////////////////////////////////

  group.entries.push(entryFactory.label({
    id: 'variableMapping-typeLabel',
    get: function(element, node) {
      var mapping = getSelected(element, node);

      var value = '';
      if (is(mapping, FLOWABLE_IN_EXTENSION_ELEMENT)) {
        value = translate('In Mapping');
      }
      else if (is(mapping, FLOWABLE_OUT_EXTENSION_ELEMENT)) {
        value = translate('Out Mapping');
      }

      return {
        label: value
      };
    },

    showLabel: function(element, node) {
      return isSelected(element, node);
    }
  }));


  // what the mapping reads and writes, as every mapping of the panel (#105)

  var caseVariables = function(element) {
    return getCaseVariables(getDefinition(element));
  };

  var fields = {
    id: 'variableMapping',
    reference: 'definitionRef',
    getSelected: getSelected,
    suggestions: caseVariables,
    translate: translate
  };

  group.entries.push.apply(group.entries, variableMapping.sourceEntries(fields));
  group.entries.push.apply(group.entries, variableMapping.targetEntries(fields));


  // the variable types Flowable converts the value from and to

  [
    [ 'sourceType', translate('Source Variable Type') ],
    [ 'targetType', translate('Target Variable Type') ]
  ].forEach(function(field) {

    var property = field[0],
        modelProperty = 'variable-' + property;

    group.entries.push(entryFactory.textField({
      id: 'variableMapping-variable-' + property,
      label: field[1],
      description: translate('For example string, integer or date'),
      modelProperty: modelProperty,
      reference: 'definitionRef',
      get: function(element, node) {
        var values = {};

        values[modelProperty] = (getSelected(element, node) || {})[property];

        return values;
      },
      set: function(element, values, node) {
        var props = {};

        props[property] = values[modelProperty] || undefined;

        return cmdHelper.updateBusinessObject(element, getSelected(element, node), props);
      },
      disabled: function(element, node) {
        return !isSelected(element, node);
      }
    }));
  });


  group.entries.push(variableMapping.transientEntry({
    id: 'variableMapping-transient',
    modelProperty: 'transient',
    reference: 'definitionRef',
    getSelected: getSelected,
    translate: translate
  }));


  // the fields of the selected mapping belong to the pop-up; the read view shows the tables
  group.entries.slice(firstEntry).forEach(function(entry) {
    if (!entry.summaryTable) {
      entry.summary = false;
    }
  });
};
