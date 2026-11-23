'use strict';

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is,
    getDefinition = require('@jylups/cmmn-js/lib/util/ModelUtil').getDefinition;

var filter = require('lodash/filter');

var extensionElementsHelper = require('../../../helper/ExtensionElementsHelper'),
    cmdHelper = require('../../../helper/CmdHelper'),

    cmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isInOutBindingCapable = cmmnElementHelper.isInOutBindingCapable;

var extensionElementsEntry = require('./implementation/ExtensionElements');

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

/**
 * Whether a mapping writes to a variable or to an expression.
 */
function getTargetType(mapping) {
  return mapping && typeof mapping.targetExpression !== 'undefined' ? 'targetExpression' : 'target';
}

function getInOutType(mapping) {
  var inOutType = 'source';

  if (mapping.variables === 'all') {
    inOutType = 'variables';
  }
  else if (typeof mapping.source !== 'undefined') {
    inOutType = 'source';
  }
  else if (typeof mapping.sourceExpression !== 'undefined') {
    inOutType = 'sourceExpression';
  }

  return inOutType;
}

var FLOWABLE_IN_EXTENSION_ELEMENT = 'flowable:In',
    FLOWABLE_OUT_EXTENSION_ELEMENT = 'flowable:Out';


/**
 * What a mapping reads, as the read view shows it.
 */
function mappingSource(mapping) {
  var type = getInOutType(mapping);

  if (type === 'variables') {
    return 'all variables';
  }

  return (type === 'sourceExpression' ? mapping.sourceExpression : mapping.source) || '';
}

/**
 * What a mapping writes, as the read view shows it.
 */
function mappingTarget(mapping) {
  return (getTargetType(mapping) === 'targetExpression' ? mapping.targetExpression : mapping.target) || '';
}

/**
 * The read view's table of the mappings of one direction, as Flowable Design
 * shows them: a Source and a Target column.
 */
function summaryTable(label, type, translate) {
  return function(element) {
    var mappings = getVariableMappings(getDefinition(element), type);

    return {
      label: translate(label),
      columns: [ translate('Source'), translate('Target') ],
      rows: mappings.map(function(mapping) {
        return [ mappingSource(mapping), mappingTarget(mapping) ];
      })
    };
  };
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
      var mapping = getVariableMappings(bo, type)[idx];

      if (!mapping) {
        option.text = '<empty>';
        return;
      }

      var source = mappingSource(mapping) || '<empty>',
          target = mappingTarget(mapping);

      option.text = target ? source + ' \u2192 ' + target : source;
      option.title = option.text;
    };
  };

  // moves a mapping among those of its direction; the other extension elements keep their place
  var moveElement = function(type) {
    return function(element, extensionElements, idx, delta) {
      var mappings = getVariableMappings(getDefinition(element), type),
          mapping = mappings[idx],
          other = mappings[idx + delta];

      if (!mapping || !other) {
        return [];
      }

      var values = extensionElements.get('values').slice(),
          from = values.indexOf(mapping),
          to = values.indexOf(other);

      values[from] = other;
      values[to] = mapping;

      return cmdHelper.updateProperties(extensionElements, { values: values }, element);
    };
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


  // what the mapping reads: a variable or an expression, as Flowable Design
  // shows them, both in sight; one replaces the other (#105)

  var hasSource = function(mapping) {
    return !!(mapping && (mapping.source || mapping.sourceExpression || mapping.variables));
  };

  var sourceDisabled = function(element, node) {
    var mapping = getSelected(element, node);

    return !mapping || !!mapping.variables;
  };

  var caseVariables = function(element) {
    return getCaseVariables(getDefinition(element));
  };

  group.entries.push(entryFactory.textField({
    id: 'variableMapping-source',
    label: translate('Source variable'),
    placeholder: translate('Select variable'),
    modelProperty: 'source',
    reference: 'definitionRef',
    suggestions: caseVariables,
    get: function(element, node) {
      var mapping = getSelected(element, node) || {};

      return {
        source: getInOutType(mapping) === 'variables' ? translate('all variables') : mapping.source
      };
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node),
          props;

      if (values.source) {
        props = { source: values.source, sourceExpression: undefined, variables: undefined };
      } else {
        props = { source: mapping.sourceExpression ? undefined : '' };
      }

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    // a variable or an expression, to make the mapping understandable;
    // the engine itself takes an empty source
    validate: function(element, values, node) {
      var mapping = getSelected(element, node);

      if (mapping && !values.source && !hasSource(mapping)) {
        return { source: translate('Mapping must have a source variable or expression') };
      }

      return {};
    },
    disabled: sourceDisabled
  }));


  group.entries.push(entryFactory.codeField({
    id: 'variableMapping-sourceExpression',
    label: translate('Source expression'),
    placeholder: translate('An expression, such as ${amount * 2}'),
    description: translate('Map a variable or an expression: filling in one clears the other.'),
    modelProperty: 'sourceExpression',
    reference: 'definitionRef',
    get: function(element, node) {
      return {
        sourceExpression: (getSelected(element, node) || {}).sourceExpression
      };
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node),
          props;

      if (values.sourceExpression) {
        props = { sourceExpression: values.sourceExpression, source: undefined, variables: undefined };
      } else {
        props = { sourceExpression: undefined };

        if (!mapping.source) {
          props.source = '';
        }
      }

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    validate: function(element, values, node) {
      var mapping = getSelected(element, node);

      if (mapping && !values.sourceExpression && !hasSource(mapping)) {
        return { sourceExpression: translate('Mapping must have a source variable or expression') };
      }

      return {};
    },
    disabled: sourceDisabled
  }));


  // target or target expression

  group.entries.push(entryFactory.selectBox({
    id: 'variableMapping-targetType',
    label: translate('Target Type'),
    selectOptions: [
      { name: translate('Target variable'), value: 'target' },
      { name: translate('Target expression'), value: 'targetExpression' }
    ],
    modelProperty: 'targetType',
    reference: 'definitionRef',
    get: function(element, node) {
      return {
        targetType: getTargetType(getSelected(element, node) || {})
      };
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node),
          current = getTargetType(mapping),
          props = {};

      if (values.targetType !== current) {
        props[values.targetType] = mapping.get(current) || '';
        props[current] = undefined;
      }

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    disabled: function(element, node) {
      return !isSelected(element, node);
    }
  }));


  group.entries.push(entryFactory.textField({
    id: 'variableMapping-target',
    dataValueLabel: 'targetLabel',
    modelProperty: 'target',
    reference: 'definitionRef',
    // variable names to pick from, not for a target expression
    suggestions: function(element, node) {
      return getTargetType(getSelected(element, node) || {}) === 'target' ? caseVariables(element) : [];
    },
    get: function(element, node) {
      var mapping = getSelected(element, node) || {},
          targetType = getTargetType(mapping);

      return {
        target: mapping[targetType],
        targetLabel: targetType === 'targetExpression' ? translate('Target expression') : translate('Target variable')
      };
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node),
          props = {};

      props[getTargetType(mapping)] = values.target || undefined;

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    validate: function(element, values, node) {
      var mapping = getSelected(element, node);

      var validation = {};
      if (mapping) {
        var mappingType = getInOutType(mapping);
        if (!values.target && mappingType !== 'variables') {
          validation.target = translate('Mapping must have a target');
        }
      }

      return validation;
    },
    disabled: function(element, node) {
      var selectedMapping = getSelected(element, node);
      return !selectedMapping || (selectedMapping && selectedMapping.variables);
    }
  }));


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


  group.entries.push(entryFactory.checkbox({
    id: 'variableMapping-transient',
    label: translate('Transient'),
    modelProperty: 'transient',
    reference: 'definitionRef',
    get: function(element, node) {
      return {
        'transient': (getSelected(element, node) || {})['transient'] === 'true'
      };
    },
    set: function(element, values, node) {
      return cmdHelper.updateBusinessObject(element, getSelected(element, node), {
        'transient': values['transient'] ? 'true' : undefined
      });
    },
    disabled: function(element, node) {
      return !isSelected(element, node);
    }
  }));


  // the fields of the selected mapping belong to the pop-up; the read view shows the tables
  group.entries.slice(firstEntry).forEach(function(entry) {
    if (!entry.summaryTable) {
      entry.summary = false;
    }
  });
};
