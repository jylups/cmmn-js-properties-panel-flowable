'use strict';

var forEach = require('lodash/forEach'),
    isArray = require('lodash/isArray'),
    isObject = require('lodash/isObject');

var getFieldValue = require('./parts/TaskFieldProps').getFieldValue;


/**
 * Attributes the panel's Camunda version offered that Flowable does not read:
 * { type: [ [ property, label ] ] }.
 */
var NOT_READ_ATTRIBUTES = {
  'cmmn:Case': [ [ 'flowable:historyTimeToLive', 'history time to live' ] ],
  'cmmn:HumanTask': [ [ 'flowable:followUpDate', 'follow-up date' ] ],
  'cmmn:CaseTask': [
    [ 'flowable:caseBinding', 'case binding' ],
    [ 'flowable:caseVersion', 'case version' ],
    [ 'flowable:caseTenantId', 'case tenant id' ]
  ],
  'cmmn:ProcessTask': [
    [ 'flowable:processBinding', 'process binding' ],
    [ 'flowable:processVersion', 'process version' ],
    [ 'flowable:processTenantId', 'process tenant id' ]
  ],
  'cmmn:DecisionTask': [
    [ 'flowable:decisionBinding', 'decision binding' ],
    [ 'flowable:decisionVersion', 'decision version' ],
    [ 'flowable:decisionTenantId', 'decision tenant id' ],
    [ 'flowable:mapDecisionResult', 'decision result mapping' ],
    [ 'flowable:resultVariable', 'result variable' ]
  ],
  'cmmn:RepetitionRule': [ [ 'flowable:repeatOnStandardEvent', 'repeat on standard event' ] ]
};

var INTEGER = /^\s*[+-]?\d+\s*$/;


/**
 * A check for the problems service of @jylups/cmmn-js: parts of a model
 * from the Camunda version of the panel that Flowable does not read. They
 * are kept on save, but have no effect in Flowable.
 *
 * @param {Function} translate
 *
 * @return {Function} check(definitions) -> problems
 */
module.exports = function(translate) {

  function notRead(element, message) {
    return {
      kind: 'not-read',
      severity: 'info',
      removedOnSave: false,
      message: message,
      businessObject: element
    };
  }

  // what the Flowable engine rejects when the model is deployed
  function rejected(element, message) {
    return {
      kind: 'deployment',
      severity: 'error',
      removedOnSave: false,
      message: message,
      businessObject: element
    };
  }

  return function(definitions) {

    var problems = [];

    var reactivateListeners = [];

    walk(definitions, function(element) {

      var owner = ownerLabel(element),
          self = elementLabel(element);

      // attributes Flowable does not read
      forEach(NOT_READ_ATTRIBUTES[element.$type] || [], function(attribute) {
        if (isWritten(element, attribute[0])) {
          problems.push(notRead(element, translate(
            'The {attribute} of {element} is not read by Flowable. It is kept when the model is saved.',
            { attribute: attribute[1], element: self })));
        }
      });

      if (element.$type === 'flowable:Script' && isWritten(element, 'resource')) {
        problems.push(notRead(element, translate(
          'The external script resource of {owner} is not read by Flowable; use an inline script. ' +
          'It is kept when the model is saved.', { owner: listenerOwnerLabel(element) })));
      }

      // what the engine rejects at deployment
      if (element.$type === 'cmmn:Task') {
        problems = problems.concat(taskProblems(element, self));
      }

      if (element.$type === 'cmmn:RepetitionRule' && isWritten(element, 'flowable:maxInstanceCount') &&
          String(element.get('flowable:maxInstanceCount')).trim() === '0') {
        problems.push(rejected(element, translate(
          'The max instance count of {owner} is 0, which Flowable rejects when the model is deployed; ' +
          'use a positive number or unlimited.', { owner: controlOwnerLabel(element) })));
      }

      if ((element.$type === 'cmmn:Stage' || element.$type === 'cmmn:Milestone') &&
          isWritten(element, 'flowable:displayOrder') &&
          !INTEGER.test(element.get('flowable:displayOrder'))) {
        problems.push(rejected(element, translate(
          'The display order of {element} is not a whole number, which Flowable rejects when the model ' +
          'is deployed.', { element: self })));
      }

      if (element.$type === 'cmmn:EventListener' && element.get('flowable:eventType') === 'reactivate') {
        reactivateListeners.push(element);
      }

      if (element.$type === 'flowable:CaseExecutionListener') {
        problems.push(notRead(element, translate(
          'The case execution listener of {owner} is not read by Flowable; use a lifecycle listener. ' +
          'It is kept when the model is saved.', { owner: owner })));
      }

      if (element.$type === 'flowable:VariableListener') {
        problems.push(notRead(element, translate(
          'The variable listener of {owner} is not read by Flowable; use a variable event listener. ' +
          'It is kept when the model is saved.', { owner: owner })));
      }

      if (element.$type === 'flowable:In' || element.$type === 'flowable:Out') {

        if (element.get('businessKey') !== undefined) {
          problems.push(notRead(element, translate(
            'The business key mapping of {owner} is not read by Flowable; use the business key expression ' +
            'or inherit business key of the task. It is kept when the model is saved.', { owner: owner })));
        }

        if (element.get('variables') !== undefined) {
          problems.push(notRead(element, translate(
            'The mapping of all variables of {owner} is not read by Flowable; use inherit variables ' +
            'of the task. It is kept when the model is saved.', { owner: owner })));
        }

        if (element.get('local') !== undefined) {
          problems.push(notRead(element, translate(
            'Local of a variable mapping of {owner} is not read by Flowable. ' +
            'It is kept when the model is saved.', { owner: owner })));
        }
      }
    });

    // a case can have one reactivate event listener
    forEach(reactivateListeners.slice(1), function(listener) {
      problems.push(rejected(listener, translate(
        'The case has more than one reactivate event listener, which Flowable rejects when the model ' +
        'is deployed; keep one.')));
    });

    return problems;
  };


  /**
   * What Flowable rejects in the fields of a task when the model is deployed.
   */
  function taskProblems(task, self) {

    var type = task.get('flowable:type'),
        extensionElements = task.get('extensionElements'),
        values = (extensionElements && extensionElements.get('values')) || [],
        fields = values.filter(function(value) {
          return value.$type === 'flowable:Field';
        });

    function fieldValue(name) {
      var value = getFieldValue(fields.filter(function(field) {
        return field.name === name;
      })[0]);

      return value && String(value).trim();
    }

    var problems = [];

    if ((type === 'casePage' || type === 'external-worker') && fields.length) {
      problems.push(rejected(task, translate(
        '{element} has fields, which Flowable rejects on {type} task when the model is deployed; ' +
        'remove them.', { element: capitalize(self), type: type === 'casePage' ? 'a case page' : 'an external worker' })));
    }

    if (type === 'script' && !fieldValue('script')) {
      problems.push(rejected(task, translate(
        'The script task {element} has no script, which Flowable rejects when the model is deployed.',
        { element: quotedName(task) })));
    }

    if (type === 'http') {
      forEach([ [ 'requestMethod', 'request method' ], [ 'requestUrl', 'request URL' ] ], function(field) {
        if (!fieldValue(field[0])) {
          problems.push(rejected(task, translate(
            'The HTTP task {element} has no {field}, which Flowable rejects when the model is deployed.',
            { element: quotedName(task), field: field[1] })));
        }
      });
    }

    return problems;
  }
};


/**
 * Visit the model elements contained in the given one, depth first.
 */
function walk(element, fn) {

  var visited = new Set(); // eslint-disable-line no-undef

  function visit(element) {

    if (!element || !element.$type || visited.has(element)) {
      return;
    }

    visited.add(element);

    fn(element);

    forEach((element.$descriptor && element.$descriptor.properties) || [], function(property) {

      if (property.isReference || property.isAttr) {
        return;
      }

      var value = element[property.name];

      forEach(isArray(value) ? value : [ value ], function(child) {
        if (isObject(child)) {
          visit(child);
        }
      });
    });
  }

  visit(element);
}

/**
 * Whether the model writes a property, rather than having it from a default.
 */
function isWritten(element, property) {
  var name = property.split(':').pop();

  return Object.prototype.hasOwnProperty.call(element, name) && element[name] !== undefined;
}

/**
 * An element by type and name or ID, such as task 'Review'.
 */
function elementLabel(element) {
  var type = (element.$type || '').split(':').pop().replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(),
      name = element.name || element.id;

  return name ? type + ' \'' + name + '\'' : type;
}

function quotedName(element) {
  var name = element.name || element.id;

  return name ? '\'' + name + '\'' : '';
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The plan item or definition whose item control or default control holds a rule.
 */
function controlOwnerLabel(rule) {
  var control = rule.$parent,
      owner = control && control.$parent;

  if (!owner || !owner.$type) {
    return 'an element';
  }

  if (owner.$type === 'cmmn:PlanItem' && owner.definitionRef) {
    return elementLabel(owner.definitionRef);
  }

  return elementLabel(owner);
}

/**
 * The element whose listener holds a script.
 */
function listenerOwnerLabel(script) {
  var listener = script.$parent;

  return listener ? ownerLabel(listener) : 'an element';
}

/**
 * The element whose extension elements contain the given one, by type and
 * name or ID.
 */
function ownerLabel(element) {
  var owner = element.$parent && element.$parent.$parent;

  if (!owner || !owner.$type) {
    return 'an element';
  }

  var type = owner.$type.split(':').pop().replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(),
      name = owner.name || owner.id;

  return name ? type + ' \'' + name + '\'' : type;
}
