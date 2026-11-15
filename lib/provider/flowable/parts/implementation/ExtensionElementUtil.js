'use strict';

var cmdHelper = require('../../../../helper/CmdHelper'),
    elementHelper = require('../../../../helper/ElementHelper');


/**
 * Helpers for the Flowable extension elements of an element, matched by
 * their exact type: Flowable reads them by element name, so a subtype in
 * the descriptor is another element to Flowable.
 */


/**
 * The extension elements of exactly the given type.
 */
function getAll(bo, type) {
  var extensionElements = bo && bo.get('extensionElements'),
      values = (extensionElements && extensionElements.get('values')) || [];

  return values.filter(function(value) {
    return value.$type === type;
  });
}

module.exports.getAll = getAll;


/**
 * The last extension element of the given type, the one Flowable uses
 * when it reads one.
 */
function getLast(bo, type) {
  var all = getAll(bo, type);

  return all[all.length - 1];
}

module.exports.getLast = getLast;


/**
 * Commands that add an extension element to the element, and its
 * extension elements when it has none.
 */
function add(element, bo, extension, cmmnFactory) {
  var extensionElements = bo.get('extensionElements'),
      commands = [];

  if (!extensionElements) {
    extensionElements = elementHelper.createElement('cmmn:ExtensionElements', { values: [] }, bo, cmmnFactory);

    commands.push(cmdHelper.updateProperties(bo, { extensionElements: extensionElements }, element));
  }

  extension.$parent = extensionElements;

  commands.push(cmdHelper.addAndRemoveElementsFromList(
    element, extensionElements, 'values', 'extensionElements', [ extension ], []
  ));

  return commands;
}

module.exports.add = add;


/**
 * Commands that remove every extension element of the given type.
 */
function removeAll(element, bo, type) {
  var extensionElements = bo.get('extensionElements'),
      toRemove = getAll(bo, type);

  if (!toRemove.length) {
    return [];
  }

  return [
    cmdHelper.removeElementsFromList(element, extensionElements, 'values', 'extensionElements', toRemove)
  ];
}

module.exports.removeAll = removeAll;
