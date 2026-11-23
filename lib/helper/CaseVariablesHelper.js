'use strict';

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is;

/**
 * The names of the case variables a model uses, for the variable pickers of
 * the panel, as Flowable Design's "Select variable": the variables the
 * mappings read from and write to the case, and those the model names in its
 * attributes (result variables, the initiator, repetition and milestone
 * variables, aggregations and variable listeners).
 *
 * Conscia-LLC/conscia-modeler#105
 */

// attributes whose value is the name of a case variable
var VARIABLE_ATTRIBUTES = [
  'initiatorVariableName',
  'resultVariableName',
  'resultVariable',
  'idVariableName',
  'taskIdVariableName',
  'taskCompleterVariableName',
  'counterVariable',
  'collectionVariable',
  'elementVariable',
  'elementIndexVariable',
  'milestoneVariable',
  'variableName'
];

/**
 * The case variables an element of a mapping names: what an In mapping
 * reads, what an Out mapping writes; the other sides belong to the process or
 * case the task starts.
 */
function mappingVariable(element) {
  if (is(element, 'flowable:In') || is(element, 'flowable:EventInParameter') ||
      is(element, 'flowable:ExternalWorkerInParameter')) {
    return element.get('source');
  }

  if (is(element, 'flowable:Out') || is(element, 'flowable:ExternalWorkerOutParameter') ||
      is(element, 'flowable:EventOutParameter') ||
      is(element, 'flowable:VariableAggregation') || is(element, 'flowable:AggregationVariable')) {
    return element.get('target');
  }
}

function isName(value) {
  return typeof value === 'string' && /^[A-Za-z_$][\w$.]*$/.test(value);
}

/**
 * The model's root (the definitions) of a business object.
 */
function getRoot(bo) {
  while (bo && bo.$parent) {
    bo = bo.$parent;
  }

  return bo;
}

/**
 * The case variables of the model a business object belongs to, sorted.
 *
 * @param {ModdleElement} bo any business object of the model
 * @return {Array<string>}
 */
function getCaseVariables(bo) {
  var names = {},
      seen = [];

  function add(value) {
    if (isName(value)) {
      names[value] = true;
    }
  }

  function visit(element) {
    if (!element || typeof element !== 'object' || seen.indexOf(element) !== -1) {
      return;
    }

    seen.push(element);

    if (!element.$descriptor) {
      return;
    }

    add(mappingVariable(element));

    // an element of an unknown namespace has no properties described
    (element.$descriptor.properties || []).forEach(function(property) {
      var value = element.get(property.name);

      if (VARIABLE_ATTRIBUTES.indexOf(property.localName || property.name) !== -1) {
        add(value);
      }

      // the model's tree, not its references
      if (property.isReference || !value || typeof value !== 'object') {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(visit);
      } else {
        visit(value);
      }
    });
  }

  visit(getRoot(bo));

  return Object.keys(names).sort(function(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
}


module.exports = {
  getCaseVariables: getCaseVariables
};
