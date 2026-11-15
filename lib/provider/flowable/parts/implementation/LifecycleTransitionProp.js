'use strict';

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is;

var cmdHelper = require('../../../../helper/CmdHelper'),
    entryFactory = require('../../../../factory/EntryFactory');

var forEach = require('lodash/forEach');


/**
 * The states of a plan item instance and of a case instance in Flowable.
 */
var PLAN_ITEM_STATES = [
  'available', 'unavailable', 'enabled', 'disabled', 'active', 'async-active', 'async-active-leave',
  'wait_repetition', 'failed', 'suspended', 'completed', 'terminated'
];

var CASE_STATES = [ 'active', 'completed', 'failed', 'suspended', 'closed', 'terminated' ];


function toOptions(values) {
  return [ { name: '', value: '' } ].concat(values.map(function(value) {
    return { name: value, value: value };
  }));
}


/**
 * Source state and target state of the selected lifecycle listener.
 *
 * The listener's onTransaction is not offered: the CMMN engine reads it but
 * does not use it.
 */
module.exports = function(element, translate, options) {

  var getListener = options.getListener,
      entries = [];

  function getValue(property, modelProperty) {
    return function(element, node) {
      var listener = getListener(element, node),
          value = {};

      value[modelProperty] = (listener && listener.get(property)) || '';

      return value;
    };
  }

  function setValue(property, modelProperty) {
    return function(element, values, node) {
      var listener = getListener(element, node),
          update = {};

      update[property] = values[modelProperty] || undefined;

      return cmdHelper.updateProperties(listener, update, element);
    };
  }

  function hideUnless(type) {
    return function(element, node) {
      return !is(getListener(element, node), type);
    };
  }

  forEach([
    [ 'planItem', 'flowable:PlanItemLifecycleListener', PLAN_ITEM_STATES ],
    [ 'case', 'flowable:CaseLifecycleListener', CASE_STATES ]
  ], function(kind) {

    var prefix = kind[0] + 'LifecycleListener',
        type = kind[1],
        states = kind[2];

    entries.push(entryFactory.selectBox({
      id: prefix + 'SourceState',
      label: translate('Source State'),
      description: translate('Any state when empty'),
      modelProperty: prefix + 'SourceState',
      selectOptions: toOptions(states),
      get: getValue('sourceState', prefix + 'SourceState'),
      set: setValue('sourceState', prefix + 'SourceState'),
      hideEntry: hideUnless(type)
    }));

    entries.push(entryFactory.selectBox({
      id: prefix + 'TargetState',
      label: translate('Target State'),
      description: translate('Any state when empty'),
      modelProperty: prefix + 'TargetState',
      selectOptions: toOptions(states),
      get: getValue('targetState', prefix + 'TargetState'),
      set: setValue('targetState', prefix + 'TargetState'),
      hideEntry: hideUnless(type)
    }));
  });

  return entries;
};
