'use strict';

var forEach = require('lodash/forEach'),
    isArray = require('lodash/isArray'),
    isObject = require('lodash/isObject');


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

  return function(definitions) {

    var problems = [];

    walk(definitions, function(element) {

      var owner = ownerLabel(element);

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

    return problems;
  };
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
