'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper'),
    elementHelper = require('../../../helper/ElementHelper');

var extensionElementsEntry = require('./implementation/ExtensionElements'),
    getExtensions = require('./implementation/ExtensionElementUtil').getAll;

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    getBusinessObject = ModelUtil.getBusinessObject,
    getDefinition = ModelUtil.getDefinition,
    isCasePlanModel = ModelUtil.isCasePlanModel;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isTask = CmmnElementHelper.isTask,
    isStage = CmmnElementHelper.isStage,
    isMilestone = CmmnElementHelper.isMilestone;


var VARIABLE_AGGREGATION = 'flowable:VariableAggregation',
    AGGREGATION_VARIABLE = 'flowable:AggregationVariable';


/**
 * Whether the element is a plan item that can repeat: Flowable reads the
 * variable aggregations of the repetition rule of a task, stage or
 * milestone.
 */
function isApplicable(element) {
  return !isCasePlanModel(element) && (isTask(element) || isStage(element) || isMilestone(element));
}


/**
 * The variable aggregations of the repetition rule of the item control of a
 * plan item, or of the default control of its definition: a list of the
 * aggregations, the attributes of the selected one, and its variables.
 *
 * @param {djs.model.Base} element
 * @param {CmmnFactory} cmmnFactory
 * @param {Function} translate
 * @param {Object} [options]
 * @param {boolean} [options.isDefaultControl] the default control of the
 *        definition instead of the item control of the plan item; its group
 *        and entry IDs start with 'defaultControl-'
 *
 * @return {Array<Object>} the groups variableAggregations,
 *         variableAggregationDetails and variableAggregationVariables
 */
module.exports.createGroups = function(element, cmmnFactory, translate, options) {

  options = options || {};

  var isDefaultControl = options.isDefaultControl,
      idPrefix = isDefaultControl ? 'defaultControl-' : '';

  var aggregationsGroup = {
    id: idPrefix + 'variableAggregations',
    label: translate('Variable Aggregations'),
    entries: [],
    enabled: function(element) {
      return !!getRepetitionRule(element);
    }
  };

  var detailsGroup = {
    id: idPrefix + 'variableAggregationDetails',
    label: translate('Variable Aggregation'),
    entries: [],
    enabled: function(element, node) {
      return !!getSelectedAggregation(element, node);
    }
  };

  var variablesGroup = {
    id: idPrefix + 'variableAggregationVariables',
    label: translate('Aggregation Variables'),
    entries: [],
    enabled: function(element, node) {
      return !!getSelectedAggregation(element, node);
    }
  };

  var groups = [ aggregationsGroup, detailsGroup, variablesGroup ];

  if (!isApplicable(element)) {
    return groups;
  }


  // model ////////////////////////////////////////////////////////////////

  function getRepetitionRule(element) {
    var bo = isDefaultControl ? getDefinition(element) : getBusinessObject(element),
        control = bo && bo.get(isDefaultControl ? 'defaultControl' : 'itemControl');

    return control && control.get('repetitionRule');
  }

  function getAggregations(element) {
    return getExtensions(getRepetitionRule(element), VARIABLE_AGGREGATION);
  }

  function getVariables(aggregation) {
    return (aggregation && aggregation.get('variable')) || [];
  }


  // aggregations /////////////////////////////////////////////////////////

  var aggregationsEntry = extensionElementsEntry(element, cmmnFactory, {
    id: idPrefix + 'variableAggregations',
    label: translate('Variable Aggregations'),
    modelProperty: 'target',
    resizable: true,

    // the repetition rule holds the aggregations in its extension elements
    getBusinessObject: getRepetitionRule,

    getExtensionElements: function(element) {
      return getAggregations(element);
    },

    // a list update keeps the order of the extension elements on undo
    createExtensionElement: function(element, extensionElements) {
      var aggregation = elementHelper.createElement(VARIABLE_AGGREGATION, {}, extensionElements, cmmnFactory);

      return cmdHelper.addAndRemoveElementsFromList(
        element, extensionElements, 'values', 'extensionElements', [ aggregation ], []
      );
    },

    removeExtensionElement: function(element, extensionElements, value, idx) {
      var aggregation = getAggregations(element)[idx];

      if (!aggregation) {
        return [];
      }

      return cmdHelper.removeElementsFromList(
        element, extensionElements, 'values', 'extensionElements', [ aggregation ]
      );
    },

    setOptionLabelValue: function(element, node, option, property, value, idx) {
      var aggregation = getAggregations(element)[idx];

      option.text = getAggregationLabel(aggregation, translate);
    },

    // another aggregation has other variables
    onSelectionChange: function(element, node) {
      variablesEntry.deselect(element, node);
    }
  });

  function getSelectedAggregation(element, node) {
    var selection = aggregationsEntry.getSelected(element, node);

    if (!selection || selection.idx < 0) {
      return;
    }

    return getAggregations(element)[selection.idx];
  }

  aggregationsGroup.entries.push(aggregationsEntry);


  // details //////////////////////////////////////////////////////////////

  function aggregationTextField(name, label, description) {
    var id = idPrefix + 'variableAggregation-' + name;

    return entryFactory.textField({
      id: id,
      label: translate(label),
      description: description && translate(description),
      modelProperty: id,

      get: function(element, node) {
        var aggregation = getSelectedAggregation(element, node),
            values = {};

        values[id] = (aggregation && aggregation.get(name)) || '';

        return values;
      },

      set: function(element, values, node) {
        var aggregation = getSelectedAggregation(element, node),
            properties = {};

        if (!aggregation) {
          return [];
        }

        properties[name] = values[id] || undefined;

        return cmdHelper.updateBusinessObject(element, aggregation, properties);
      }
    });
  }

  function aggregationCheckbox(name, label, description) {
    var id = idPrefix + 'variableAggregation-' + name;

    return entryFactory.checkbox({
      id: id,
      label: translate(label),
      description: description && translate(description),
      modelProperty: id,

      get: function(element, node) {
        var aggregation = getSelectedAggregation(element, node),
            value = aggregation && aggregation.get(name),
            values = {};

        values[id] = !!value && value.toLowerCase() === 'true';

        return values;
      },

      set: function(element, values, node) {
        var aggregation = getSelectedAggregation(element, node),
            properties = {};

        if (!aggregation) {
          return [];
        }

        // false is what Flowable assumes without the attribute
        properties[name] = values[id] ? 'true' : undefined;

        return cmdHelper.updateBusinessObject(element, aggregation, properties);
      }
    });
  }

  detailsGroup.entries.push(aggregationTextField('target', 'Target',
    'Variable to store the aggregated values in'));

  detailsGroup.entries.push(aggregationTextField('targetExpression', 'Target Expression',
    'Expression giving the name of the variable to store the aggregated values in'));

  detailsGroup.entries.push(aggregationTextField('class', 'Class',
    'Custom aggregator class; the values are collected in a list when empty'));

  detailsGroup.entries.push(aggregationTextField('delegateExpression', 'Delegate Expression',
    'Expression giving a custom aggregator'));

  detailsGroup.entries.push(aggregationCheckbox('storeAsTransientVariable', 'Store As Transient Variable',
    'The aggregated value is not stored once the case continues'));

  detailsGroup.entries.push(aggregationCheckbox('createOverviewVariable', 'Create Overview Variable',
    'Keep a variable with the values aggregated so far while the instances run'));


  // variables ////////////////////////////////////////////////////////////

  // the add and remove callbacks of the list are not given the node of the
  // entry, which tells the selected aggregation
  var currentNode;

  var variablesEntry = extensionElementsEntry(element, cmmnFactory, {
    id: idPrefix + 'variableAggregation-variables',
    label: translate('Variables'),
    modelProperty: 'source',
    resizable: true,
    getBusinessObject: getRepetitionRule,

    getExtensionElements: function(element, bo, node) {
      return getVariables(getSelectedAggregation(element, node || currentNode));
    },

    createExtensionElement: function(element) {
      var aggregation = getSelectedAggregation(element, currentNode);

      if (!aggregation) {
        return [];
      }

      var variable = elementHelper.createElement(AGGREGATION_VARIABLE, {}, aggregation, cmmnFactory);

      return cmdHelper.addElementsTolist(element, aggregation, 'variable', [ variable ]);
    },

    removeExtensionElement: function(element, extensionElements, value, idx) {
      var aggregation = getSelectedAggregation(element, currentNode),
          variable = getVariables(aggregation)[idx];

      if (!variable) {
        return [];
      }

      return cmdHelper.removeElementsFromList(element, aggregation, 'variable', null, [ variable ]);
    },

    setOptionLabelValue: function(element, node, option, property, value, idx) {
      var variable = getVariables(getSelectedAggregation(element, node))[idx];

      option.text = getVariableLabel(variable, translate);
    }
  });

  // remember the node of the entry for the callbacks above
  var getVariablesEntryValues = variablesEntry.get,
      setVariablesEntryValues = variablesEntry.set;

  variablesEntry.get = function(element, node) {
    currentNode = node;

    return getVariablesEntryValues.apply(this, arguments);
  };

  variablesEntry.set = function(element, values, node) {
    currentNode = node;

    return setVariablesEntryValues.apply(this, arguments);
  };

  function getSelectedVariable(element, node) {
    var selection = variablesEntry.getSelected(element, node);

    if (!selection || selection.idx < 0) {
      return;
    }

    return getVariables(getSelectedAggregation(element, node))[selection.idx];
  }

  variablesGroup.entries.push(variablesEntry);

  function variableTextField(name, label, description) {
    var id = idPrefix + 'variableAggregation-variable-' + name;

    return entryFactory.textField({
      id: id,
      label: translate(label),
      description: description && translate(description),
      modelProperty: id,

      get: function(element, node) {
        var variable = getSelectedVariable(element, node),
            values = {};

        values[id] = (variable && variable.get(name)) || '';

        return values;
      },

      set: function(element, values, node) {
        var variable = getSelectedVariable(element, node),
            properties = {};

        if (!variable) {
          return [];
        }

        properties[name] = values[id] || undefined;

        return cmdHelper.updateBusinessObject(element, variable, properties);
      },

      hideEntry: function(element, node) {
        return !getSelectedVariable(element, node);
      }
    });
  }

  variablesGroup.entries.push(variableTextField('source', 'Source',
    'Variable of the instance to aggregate'));

  variablesGroup.entries.push(variableTextField('sourceExpression', 'Source Expression',
    'Expression giving the value to aggregate'));

  variablesGroup.entries.push(variableTextField('target', 'Target',
    'Name of the value in the aggregation; the source when empty'));

  variablesGroup.entries.push(variableTextField('targetExpression', 'Target Expression',
    'Expression giving the name of the value in the aggregation'));


  return groups;
};


/**
 * The label of an aggregation in the list: where it stores the values.
 */
function getAggregationLabel(aggregation, translate) {
  var target = aggregation && (aggregation.get('target') || aggregation.get('targetExpression'));

  return target || translate('<no target>');
}

module.exports.getAggregationLabel = getAggregationLabel;


/**
 * The label of a variable in the list: what it aggregates, and the name of
 * the value when another one.
 */
function getVariableLabel(variable, translate) {
  if (!variable) {
    return '';
  }

  var source = variable.get('source') || variable.get('sourceExpression'),
      target = variable.get('target') || variable.get('targetExpression');

  if (!source) {
    return target ? '? : ' + target : translate('<empty>');
  }

  return target && target !== source ? source + ' : ' + target : source;
}

module.exports.getVariableLabel = getVariableLabel;
