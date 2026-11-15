'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    is = ModelUtil.is,
    isCasePlanModel = ModelUtil.isCasePlanModel,
    getBusinessObject = ModelUtil.getBusinessObject;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isCriterion = CmmnElementHelper.isCriterion,
    isStage = CmmnElementHelper.isStage;


function getSentry(element) {
  var criterion = getBusinessObject(element);

  return criterion && criterion.get('sentryRef');
}

/**
 * Whether the exit criterion is on a stage or the case plan model.
 */
function isOnStage(element) {
  return !!element.host && isStage(element.host);
}

function isOnCasePlanModel(element) {
  return !!element.host && isCasePlanModel(element.host);
}

function selectBox(id, label, description, options, getTarget, property, translate, hideEntry) {

  return entryFactory.selectBox({
    id: id,
    label: translate(label),
    description: translate(description),
    modelProperty: id,
    selectOptions: options.map(function(option) {
      return { name: option.name && translate(option.name), value: option.value };
    }),

    get: function(element) {
      var target = getTarget(element),
          values = {};

      values[id] = (target && target.get(property)) || '';

      return values;
    },

    set: function(element, values) {
      var properties = {};

      properties[property] = values[id] || undefined;

      return cmdHelper.updateProperties(getTarget(element), properties, element);
    },

    hideEntry: hideEntry
  });
}


/**
 * What Flowable reads on the sentry of a criterion (the trigger mode) and
 * on an exit criterion (what it does, and which instances it exits).
 */
module.exports = function(group, element, translate) {

  if (!isCriterion(element)) {
    return;
  }

  group.entries.push(selectBox(
    'sentry-triggerMode',
    'Trigger Mode',
    'On event: the on parts must happen together, not remembered from earlier events',
    [
      { name: '', value: '' },
      { name: 'Default', value: 'default' },
      { name: 'On Event', value: 'onEvent' }
    ],
    getSentry,
    'flowable:triggerMode',
    translate,
    function(element) {
      return !getSentry(element);
    }
  ));

  if (!is(getBusinessObject(element), 'cmmn:ExitCriterion')) {
    return;
  }

  // what a stage or the case plan model does when it exits
  if (isOnStage(element)) {
    group.entries.push(selectBox(
      'exitCriterion-exitEventType',
      'Exit Event Type',
      'Exit when empty; complete or force complete the stage instead',
      [
        { name: '', value: '' },
        { name: 'Exit', value: 'exit' },
        { name: 'Complete', value: 'complete' },
        { name: 'Force Complete', value: 'forceComplete' }
      ],
      getBusinessObject,
      'flowable:exitEventType',
      translate
    ));
  }

  // which instances of a plan item exit
  if (isOnCasePlanModel(element)) {
    return;
  }

  group.entries.push(selectBox(
    'exitCriterion-exitType',
    'Exit Type',
    'Which instances of the plan item exit; all when empty',
    [
      { name: '', value: '' },
      { name: 'Default', value: 'default' },
      { name: 'Active Instances', value: 'activeInstances' },
      { name: 'Active And Enabled Instances', value: 'activeAndEnabledInstances' }
    ],
    getBusinessObject,
    'flowable:exitType',
    translate
  ));
};
