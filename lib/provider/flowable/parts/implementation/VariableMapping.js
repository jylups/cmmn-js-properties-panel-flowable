'use strict';

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper = require('../../../../helper/CmdHelper');

var extensionElementsEntry = require('./ExtensionElements'),
    getAll = require('./ExtensionElementUtil').getAll;

var getCaseVariables = require('../../../../helper/CaseVariablesHelper').getCaseVariables;

/**
 * One editor for every variable mapping of the panel, so they all look and
 * work the same (Conscia-LLC/conscia-modeler#105, #104): the in and out
 * mappings of process and case tasks, the input variables of a script task,
 * the variables to and from an external worker and the payload mappings of
 * the event registry.
 *
 * - a list with a row per mapping as "source → target", add, move up, move
 *   down and a delete button on each row;
 * - the selected mapping's fields beside the list: a Source variable, with
 *   the case's variables to pick from, and a Source expression, a code field
 *   with syntax colours, filling in one clears the other; the target as a
 *   variable (to pick) or an expression, or as a plain name;
 * - in the read view, a Source / Target table.
 */


/**
 * What a mapping reads, as the lists and tables show it.
 */
function mappingSource(mapping) {

  if (mapping.variables === 'all') {
    return 'all variables';
  }

  return (typeof mapping.sourceExpression !== 'undefined' ? mapping.sourceExpression : mapping.source) || '';
}

/**
 * Whether a mapping writes to a variable or to an expression.
 */
function getTargetType(mapping) {
  return mapping && typeof mapping.targetExpression !== 'undefined' ? 'targetExpression' : 'target';
}

/**
 * What a mapping writes, as the lists and tables show it.
 */
function mappingTarget(mapping) {
  return (getTargetType(mapping) === 'targetExpression' ? mapping.targetExpression : mapping.target) || '';
}

/**
 * A row of a mapping list, as Flowable Design shows it: "source → target".
 */
function rowLabel(mapping) {

  if (!mapping) {
    return '<empty>';
  }

  var source = mappingSource(mapping) || '<empty>',
      target = mappingTarget(mapping);

  return target ? source + ' → ' + target : source;
}

/**
 * The read view's table of a list of mappings: a Source and a Target column.
 *
 * @param {string} label
 * @param {Function} getMappings - (element) => the mappings
 * @param {Function} translate
 */
function summaryTable(label, getMappings, translate) {
  return function(element) {
    return {
      label: translate(label),
      columns: [ translate('Source'), translate('Target') ],
      rows: getMappings(element).map(function(mapping) {
        return [ mappingSource(mapping), mappingTarget(mapping) ];
      })
    };
  };
}

/**
 * Moves a mapping among those of its list; the other extension elements keep
 * their place.
 *
 * @param {Function} getMappings - (element) => the mappings
 */
function moveMapping(getMappings) {
  return function(element, extensionElements, idx, delta) {
    var mappings = getMappings(element),
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
}

function hasSource(mapping) {
  return !!(mapping && (mapping.source || mapping.sourceExpression || mapping.variables));
}

function valuesOf(property, value) {
  var values = {};

  values[property] = value;

  return values;
}

/**
 * Hides an entry from the read view and ties it to its list in the pop-up.
 */
function detail(entry) {
  entry.summary = false;

  return entry;
}


/**
 * What a mapping reads: a Source variable, with the case's variables to pick
 * from, and a Source expression, a code field; both in sight, filling in one
 * clears the other.
 *
 * @param {Object} options
 * @param {string} options.id - the prefix of the entries' ids
 * @param {Object} options.names - the model properties: { source, sourceExpression }
 * @param {Function} options.getSelected - (element, node) => the selected mapping
 * @param {Function} options.suggestions - (element) => variable names
 * @param {Function} options.translate
 * @param {string} [options.reference]
 *
 * @return {Array<Object>} the entries
 */
function sourceEntries(options) {

  var translate = options.translate,
      getSelected = options.getSelected,
      names = options.names || { source: 'source', sourceExpression: 'sourceExpression' };

  var disabled = function(element, node) {
    var mapping = getSelected(element, node);

    return !mapping || !!mapping.variables;
  };

  var required = function(name) {
    return function(element, values, node) {
      var mapping = getSelected(element, node);

      if (mapping && !values[name] && !hasSource(mapping)) {
        return valuesOf(name, translate('Mapping must have a source variable or expression'));
      }

      return {};
    };
  };

  var variable = entryFactory.textField({
    id: options.id + '-source',
    label: translate('Source variable'),
    placeholder: translate('Select variable'),
    modelProperty: names.source,
    reference: options.reference,
    suggestions: options.suggestions,
    get: function(element, node) {
      var mapping = getSelected(element, node) || {};

      return valuesOf(names.source, mapping.variables === 'all' ? translate('all variables') : mapping.source);
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node),
          value = values[names.source],
          props;

      if (value) {
        props = { source: value, sourceExpression: undefined };

        if (mapping.variables) {
          props.variables = undefined;
        }
      } else {
        props = { source: mapping.sourceExpression ? undefined : '' };
      }

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },

    // a variable or an expression, to make the mapping understandable;
    // the engine itself takes an empty source
    validate: required(names.source),
    disabled: disabled
  });

  var expression = entryFactory.codeField({
    id: options.id + '-sourceExpression',
    label: translate('Source expression'),
    placeholder: translate('An expression, such as ${amount * 2}'),
    description: translate('Map a variable or an expression: filling in one clears the other.'),
    modelProperty: names.sourceExpression,
    reference: options.reference,
    get: function(element, node) {
      return valuesOf(names.sourceExpression, (getSelected(element, node) || {}).sourceExpression);
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node),
          value = values[names.sourceExpression],
          props;

      if (value) {
        props = { sourceExpression: value, source: undefined };

        if (mapping.variables) {
          props.variables = undefined;
        }
      } else {
        props = { sourceExpression: undefined };

        if (!mapping.source) {
          props.source = '';
        }
      }

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    validate: required(names.sourceExpression),
    disabled: disabled
  });

  return [ detail(variable), detail(expression) ];
}


/**
 * What a mapping writes: a Target Type (a variable or an expression) and the
 * target, with the case's variables to pick from when it is a variable.
 *
 * @param {Object} options
 * @param {string} options.id - the prefix of the entries' ids
 * @param {Object} options.names - the model properties: { targetType, target }
 * @param {Function} options.getSelected - (element, node) => the selected mapping
 * @param {Function} options.suggestions - (element) => variable names
 * @param {Function} options.translate
 * @param {string} [options.reference]
 *
 * @return {Array<Object>} the entries
 */
function targetEntries(options) {

  var translate = options.translate,
      getSelected = options.getSelected,
      names = options.names || { targetType: 'targetType', target: 'target' };

  var type = entryFactory.selectBox({
    id: options.id + '-targetType',
    label: translate('Target Type'),
    selectOptions: [
      { name: translate('Target variable'), value: 'target' },
      { name: translate('Target expression'), value: 'targetExpression' }
    ],
    modelProperty: names.targetType,
    reference: options.reference,
    get: function(element, node) {
      return valuesOf(names.targetType, getTargetType(getSelected(element, node) || {}));
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node),
          current = getTargetType(mapping),
          wanted = values[names.targetType],
          props = {};

      if (wanted !== current) {
        props[wanted] = mapping.get(current) || '';
        props[current] = undefined;
      }

      return cmdHelper.updateBusinessObject(element, mapping, props);
    },
    disabled: function(element, node) {
      return !getSelected(element, node);
    }
  });

  var target = entryFactory.textField({
    id: options.id + '-target',
    dataValueLabel: 'targetLabel',
    modelProperty: names.target,
    reference: options.reference,

    // variable names to pick from, not for a target expression
    suggestions: function(element, node) {
      return getTargetType(getSelected(element, node) || {}) === 'target' ? options.suggestions(element) : [];
    },
    get: function(element, node) {
      var mapping = getSelected(element, node) || {},
          targetType = getTargetType(mapping),
          values = valuesOf(names.target, mapping[targetType]);

      values.targetLabel = targetType === 'targetExpression' ?
        translate('Target expression') :
        translate('Target variable');

      return values;
    },
    set: function(element, values, node) {
      var mapping = getSelected(element, node);

      return cmdHelper.updateBusinessObject(element, mapping,
        valuesOf(getTargetType(mapping), values[names.target] || undefined));
    },
    validate: function(element, values, node) {
      var mapping = getSelected(element, node);

      if (mapping && !values[names.target] && mapping.variables !== 'all') {
        return valuesOf(names.target, translate('Mapping must have a target'));
      }

      return {};
    },
    disabled: function(element, node) {
      var mapping = getSelected(element, node);

      return !mapping || !!mapping.variables;
    }
  });

  return [ detail(type), detail(target) ];
}


/**
 * A field for a plain attribute of the selected mapping, such as the target
 * payload field of an event.
 */
function nameEntry(options) {

  var property = options.property,
      name = options.modelProperty;

  return detail(entryFactory.textField({
    id: options.id,
    label: options.label,
    modelProperty: name,
    placeholder: options.placeholder,
    suggestions: options.suggestions,
    get: function(element, node) {
      return valuesOf(name, (options.getSelected(element, node) || {})[property]);
    },
    set: function(element, values, node) {
      return cmdHelper.updateBusinessObject(element, options.getSelected(element, node),
        valuesOf(property, values[name] || undefined));
    },
    validate: options.required ? function(element, values, node) {
      if (options.getSelected(element, node) && !values[name]) {
        return valuesOf(name, options.required);
      }

      return {};
    } : undefined,
    disabled: function(element, node) {
      return !options.getSelected(element, node);
    }
  }));
}


/**
 * The Transient flag of the selected mapping.
 */
function transientEntry(options) {

  var name = options.modelProperty;

  return detail(entryFactory.checkbox({
    id: options.id,
    label: options.translate('Transient'),
    modelProperty: name,
    reference: options.reference,
    get: function(element, node) {
      return valuesOf(name, (options.getSelected(element, node) || {})['transient'] === 'true');
    },
    set: function(element, values, node) {
      return cmdHelper.updateBusinessObject(element, options.getSelected(element, node), {
        'transient': values[name] ? 'true' : undefined
      });
    },
    disabled: function(element, node) {
      return !options.getSelected(element, node);
    }
  }));
}


/**
 * A list of mappings of one extension element type, such as the input
 * variables of a script task, with the fields of the selected one.
 *
 * @param {Object} group
 * @param {djs.model.Base} element
 * @param {Object} options
 * @param {string} options.id
 * @param {string} options.label
 * @param {string} options.type - the extension element type, such as flowable:EventInParameter
 * @param {Function} options.getContainer - (element) => the business object holding the mappings
 * @param {string} options.source - 'variable' for a Source variable and a Source expression,
 *                                  else the label of a plain source name, such as a payload field
 * @param {string} options.target - 'variable' for a target variable (or expression with
 *                                  targetExpression), else the label of a plain target name
 * @param {boolean} [options.targetExpression] - whether the target can be an expression
 * @param {boolean} [options.transient] - whether the mapping can be transient
 * @param {CmmnFactory} cmmnFactory
 * @param {Function} translate
 *
 * @return {Object} the list entry
 */
function mappingList(group, element, options, cmmnFactory, translate) {

  var id = options.id,
      type = options.type,
      getContainer = options.getContainer;

  var getMappings = function(element) {
    return getAll(getContainer(element), type);
  };

  var suggestions = function(element) {
    return getCaseVariables(getContainer(element));
  };

  var list = extensionElementsEntry(element, cmmnFactory, {
    id: id,
    label: translate(options.label),
    modelProperty: 'source',
    idGeneration: false,
    resizable: true,
    rowDelete: true,
    getBusinessObject: getContainer,

    createExtensionElement: function(element, extensionElements) {
      var mapping = cmmnFactory.create(type, { source: '', target: '' });

      return cmdHelper.updateSemanticParent(mapping, extensionElements, 'values', element);
    },

    removeExtensionElement: function(element, extensionElements, value, idx) {
      return cmdHelper.updateSemanticParent(getMappings(element)[idx], null, 'values', element);
    },

    moveExtensionElement: moveMapping(getMappings),

    getExtensionElements: getMappings,

    setOptionLabelValue: function(element, node, option, property, value, idx) {
      option.text = rowLabel(getMappings(element)[idx]);
      option.title = option.text;
    }
  });

  list.summaryTable = summaryTable(options.label, getMappings, translate);
  list.cssClasses = [ 'cpp-mapping-list' ];

  group.entries.push(list);

  var getSelected = function(element, node) {
    var selection = list.getSelected(element, node);

    return selection && selection.idx > -1 ? getMappings(element)[selection.idx] : undefined;
  };

  var common = {
    getSelected: getSelected,
    suggestions: suggestions,
    translate: translate
  };

  function entries(more) {
    var result = {};

    [ common, more ].forEach(function(source) {
      Object.keys(source).forEach(function(key) {
        result[key] = source[key];
      });
    });

    return result;
  }

  if (options.source === 'variable') {
    group.entries.push.apply(group.entries, sourceEntries(entries({
      id: id,
      names: { source: id + '-source', sourceExpression: id + '-sourceExpression' }
    })));
  } else {
    group.entries.push(nameEntry(entries({
      id: id + '-source',
      property: 'source',
      modelProperty: id + '-source',
      label: translate(options.source),
      suggestions: undefined,
      required: translate('Mapping must have a source')
    })));
  }

  if (options.target === 'variable' && options.targetExpression) {
    group.entries.push.apply(group.entries, targetEntries(entries({
      id: id,
      names: { targetType: id + '-targetType', target: id + '-target' }
    })));
  } else if (options.target === 'variable') {
    group.entries.push(nameEntry(entries({
      id: id + '-target',
      property: 'target',
      modelProperty: id + '-target',
      label: translate('Target variable'),
      placeholder: translate('Select variable'),
      required: translate('Mapping must have a target')
    })));
  } else {
    group.entries.push(nameEntry(entries({
      id: id + '-target',
      property: 'target',
      modelProperty: id + '-target',
      label: translate(options.target),
      suggestions: undefined,
      required: translate('Mapping must have a target')
    })));
  }

  if (options['transient']) {
    group.entries.push(transientEntry(entries({
      id: id + '-transient',
      modelProperty: id + '-transient'
    })));
  }

  return list;
}


module.exports = {
  mappingSource: mappingSource,
  mappingTarget: mappingTarget,
  getTargetType: getTargetType,
  rowLabel: rowLabel,
  summaryTable: summaryTable,
  moveMapping: moveMapping,
  sourceEntries: sourceEntries,
  targetEntries: targetEntries,
  transientEntry: transientEntry,
  mappingList: mappingList
};
