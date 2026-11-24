'use strict';

var glyph = require('./IconHelper').glyph;

/**
 * The models a case refers to, as Flowable Design's model hierarchy lists
 * them: the processes, cases and decisions its tasks start, the forms of its
 * tasks and of its start, and the events and channels of the event registry.
 *
 * Font Awesome Free by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (icons: CC BY 4.0)
 */

var KINDS = [ 'case', 'process', 'decision', 'form', 'event', 'channel' ];

var KIND_LABELS = {
  'case': 'Case',
  process: 'Process',
  decision: 'Decision',
  form: 'Form',
  event: 'Event',
  channel: 'Channel'
};

var KIND_ICONS = {
  'case': glyph(require('@fortawesome/free-solid-svg-icons/faBriefcase').faBriefcase, 16),
  process: glyph(require('@fortawesome/free-solid-svg-icons/faDiagramProject').faDiagramProject, 16),
  decision: glyph(require('@fortawesome/free-solid-svg-icons/faTableCells').faTableCells, 16),
  form: glyph(require('@fortawesome/free-solid-svg-icons/faRectangleList').faRectangleList, 16),
  event: glyph(require('@fortawesome/free-solid-svg-icons/faBolt').faBolt, 16),
  channel: glyph(require('@fortawesome/free-solid-svg-icons/faTowerBroadcast').faTowerBroadcast, 16)
};

module.exports.KINDS = KINDS;
module.exports.KIND_LABELS = KIND_LABELS;
module.exports.KIND_ICONS = KIND_ICONS;

// the attributes of a callable task: a reference to an element of the file
// (or a key), or an expression whose text is the key
var CALLABLES = {
  'cmmn:ProcessTask': { kind: 'process', ref: 'processRef', expression: 'processRefExpression', collection: 'processes' },
  'cmmn:CaseTask': { kind: 'case', ref: 'caseRef', expression: 'caseRefExpression', collection: 'cases' },
  'cmmn:DecisionTask': { kind: 'decision', ref: 'decisionRef', expression: 'decisionRefExpression', collection: 'decisions' }
};

var EXTENSIONS = {
  'flowable:eventtype': 'event',
  'flowable:channelkey': 'channel'
};

function isExpression(text) {
  return /[$#]\{/.test(text);
}

function getDefinitions(element) {
  var definitions = element;

  while (definitions && definitions.$type !== 'cmmn:Definitions') {
    definitions = definitions.$parent;
  }

  return definitions;
}

function callableKey(definition, callable) {

  var ref = definition.get(callable.ref),
      expression = definition.get(callable.expression),
      body = expression && expression.get('body');

  if (ref) {
    var definitions = getDefinitions(definition),
        local = definitions && (definitions.get(callable.collection) || []).filter(function(candidate) {
          return candidate.id === ref;
        })[0];

    // a case of the same file is no other model
    if (local && callable.kind === 'case') {
      return null;
    }

    return { key: (local && local.get('externalRef')) || ref };
  }

  if (body && body.trim()) {
    return { key: body.trim(), expression: isExpression(body) };
  }

  return null;
}

function extensionValues(owner) {
  var extensionElements = owner && owner.get && owner.get('extensionElements');

  return (extensionElements && extensionElements.get('values')) || [];
}


/**
 * The models the diagram's elements refer to, case first, then processes,
 * decisions, forms, events and channels, each by key.
 *
 * @param {ElementRegistry} elementRegistry
 *
 * @return {Array<Object>} [ { kind, key, expression, elements: [ element ids ] } ]
 */
module.exports.referencedModels = function(elementRegistry) {

  var models = [],
      byKey = {};

  function add(kind, key, expression, elementId) {
    var id = kind + ':' + key,
        model = byKey[id];

    if (!model) {
      model = byKey[id] = { kind: kind, key: key, expression: !!expression, elements: [] };
      models.push(model);
    }

    if (model.elements.indexOf(elementId) === -1) {
      model.elements.push(elementId);
    }
  }

  elementRegistry.forEach(function(element) {

    var bo = element.businessObject;

    // the shapes of the diagram, not its root, labels or connections
    if (!bo || !element.parent || element.labelTarget || element.waypoints) {
      return;
    }

    var definition = bo.definitionRef || bo,
        type = definition.$type,
        isCasePlanModel = bo.$parent && bo.$parent.$type === 'cmmn:Case' && bo.$parent.casePlanModel === bo;

    var callable = CALLABLES[type],
        reference = callable && callableKey(definition, callable);

    if (reference) {
      add(callable.kind, reference.key, reference.expression, element.id);
    }

    // the form of a task, or the start form of the case
    var formKey = definition.get && definition.$instanceOf &&
      (definition.$instanceOf('cmmn:Task') || isCasePlanModel) && definition.get('flowable:formKey');

    if (formKey && formKey.trim()) {
      add('form', formKey.trim(), isExpression(formKey), element.id);
    }

    // the events and channels of the event registry: on the element, or on
    // the case for the event that starts it
    var owners = isCasePlanModel ? [ bo.$parent ] : [ definition ];

    owners.forEach(function(owner) {
      extensionValues(owner).forEach(function(value) {
        var kind = EXTENSIONS[(value.$type || '').toLowerCase()],
            body = value.get && value.get('body');

        if (kind && body && body.trim()) {
          add(kind, body.trim(), isExpression(body), element.id);
        }
      });
    });
  });

  return models.sort(function(a, b) {
    return (KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind)) ||
      (a.expression - b.expression) ||
      a.key.localeCompare(b.key);
  });
};
