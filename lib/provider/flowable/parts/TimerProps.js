'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper'),
    elementHelper = require('../../../helper/ElementHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    is = ModelUtil.is,
    getBusinessObject = ModelUtil.getBusinessObject,
    getDefinition = ModelUtil.getDefinition;

var forEach = require('lodash/forEach'),
    find = require('lodash/find');


/**
 * The transitions of a plan item that can start the timer: the values of
 * the PlanItemTransition enumeration of CMMN 1.1 without close, which only
 * a case instance takes.
 */
var TRANSITIONS = [
  'complete',
  'create',
  'disable',
  'enable',
  'exit',
  'fault',
  'manualStart',
  'occur',
  'parentResume',
  'parentSuspend',
  'reactivate',
  'reenable',
  'resume',
  'start',
  'suspend',
  'terminate'
];

var DEFAULT_TRANSITION = 'complete';


function isTimerEventListener(element) {
  return is(getBusinessObject(element), 'cmmn:PlanItem') &&
         is(getDefinition(element), 'cmmn:TimerEventListener');
}

function getTimerStart(element) {
  var definition = getDefinition(element);

  return definition && definition.get('timerStart');
}

/**
 * The plan item start trigger of the timer, if it has one; a case file item
 * start trigger is not returned.
 */
function getPlanItemStartTrigger(element) {
  var timerStart = getTimerStart(element);

  return is(timerStart, 'cmmn:PlanItemStartTrigger') ? timerStart : undefined;
}

function hasCaseFileItemStartTrigger(element) {
  return is(getTimerStart(element), 'cmmn:CaseFileItemStartTrigger');
}

function getCase(bo) {
  while (bo && !is(bo, 'cmmn:Case')) {
    bo = bo.$parent;
  }

  return bo;
}

/**
 * Every plan item of the case of the given plan item, at any depth, in
 * document order.
 */
function getAllPlanItems(planItem) {
  var caze = getCase(planItem),
      planItems = [];

  function collect(planFragment) {
    forEach(planFragment && planFragment.get('planItems'), function(item) {
      var definition = item.get('definitionRef');

      planItems.push(item);

      if (is(definition, 'cmmn:PlanFragment')) {
        collect(definition);
      }
    });
  }

  collect(caze && caze.get('casePlanModel'));

  return planItems;
}

function getPlanItemLabel(planItem) {
  var definition = planItem.get('definitionRef'),
      name = planItem.get('name') || (definition && definition.get('name'));

  return name ? name + ' (' + planItem.id + ')' : planItem.id;
}

/**
 * The plan items that can start the timer of the given listener: every
 * other plan item of its case.
 */
function getSourceCandidates(element) {
  var listener = getBusinessObject(element);

  return getAllPlanItems(listener).filter(function(planItem) {
    return planItem !== listener;
  });
}


/**
 * The timer of a timer event listener, as Flowable reads it: the timer
 * expression, and the plan item transition that starts the timer.
 */
module.exports = function(group, element, cmmnFactory, elementRegistry, translate) {

  if (!isTimerEventListener(element)) {
    return;
  }


  // timer expression
  group.entries.push(entryFactory.textField({
    id: 'timer-expression',
    label: translate('Timer Expression'),
    description: translate(
      'An ISO 8601 date (2026-12-31T23:59:00), duration (PT1H), repetition (R3/PT10M), ' +
      'a cron expression (0 0 9 * * ?) or an expression (${dueDate})'
    ),
    modelProperty: 'timerExpression',

    get: function(element) {
      var expression = getDefinition(element).get('timerExpression');

      return { timerExpression: (expression && expression.get('body')) || '' };
    },

    set: function(element, values) {
      var definition = getDefinition(element),
          expression = definition.get('timerExpression'),
          body = values.timerExpression || undefined;

      if (!body) {
        return expression ?
          cmdHelper.updateProperties(definition, { timerExpression: undefined }, element) :
          [];
      }

      if (expression) {
        return cmdHelper.updateProperties(expression, { body: body }, element);
      }

      expression = elementHelper.createElement('cmmn:Expression', { body: body }, definition, cmmnFactory);

      return cmdHelper.updateProperties(definition, { timerExpression: expression }, element);
    }
  }));


  // the plan item whose transition starts the timer
  var sourceOptions = [ { name: translate('When the listener is available'), value: '' } ];

  forEach(getSourceCandidates(element), function(planItem) {
    sourceOptions.push({ name: getPlanItemLabel(planItem), value: planItem.id });
  });

  group.entries.push(entryFactory.selectBox({
    id: 'timer-startTriggerSource',
    label: translate('Started By'),
    description: translate('The plan item whose transition starts the timer'),
    modelProperty: 'startTriggerSource',
    selectOptions: sourceOptions,
    emptyParameter: false,

    get: function(element) {
      var trigger = getPlanItemStartTrigger(element),
          source = trigger && trigger.get('sourceRef');

      return { startTriggerSource: (source && source.id) || '' };
    },

    set: function(element, values) {
      var definition = getDefinition(element),
          trigger = getPlanItemStartTrigger(element),
          sourceId = values.startTriggerSource;

      if (!sourceId) {
        return trigger ?
          cmdHelper.updateProperties(definition, { timerStart: undefined }, element) :
          [];
      }

      var source = find(getSourceCandidates(element), function(planItem) {
        return planItem.id === sourceId;
      });

      if (!source) {
        return [];
      }

      if (trigger) {
        return cmdHelper.updateProperties(trigger, { sourceRef: source }, element);
      }

      trigger = elementHelper.createElement('cmmn:PlanItemStartTrigger', {
        sourceRef: source,
        standardEvent: DEFAULT_TRANSITION
      }, definition, cmmnFactory);

      return cmdHelper.updateProperties(definition, { timerStart: trigger }, element);
    },

    // a case file item start trigger is kept as it is
    hideEntry: hasCaseFileItemStartTrigger
  }));


  // the transition of that plan item
  group.entries.push(entryFactory.selectBox({
    id: 'timer-startTriggerEvent',
    label: translate('Transition'),
    modelProperty: 'startTriggerEvent',
    selectOptions: TRANSITIONS.map(function(transition) {
      return { name: transition, value: transition };
    }),
    emptyParameter: false,

    get: function(element) {
      var trigger = getPlanItemStartTrigger(element);

      return { startTriggerEvent: (trigger && trigger.get('standardEvent')) || '' };
    },

    set: function(element, values) {
      var trigger = getPlanItemStartTrigger(element);

      if (!trigger) {
        return [];
      }

      return cmdHelper.updateProperties(trigger, {
        standardEvent: values.startTriggerEvent || DEFAULT_TRANSITION
      }, element);
    },

    hideEntry: function(element) {
      return !getPlanItemStartTrigger(element);
    }
  }));
};
