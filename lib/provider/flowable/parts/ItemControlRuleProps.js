'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper'),
    elementHelper = require('../../../helper/ElementHelper');

var extensionElementUtil = require('./implementation/ExtensionElementUtil'),
    getExtension = extensionElementUtil.getLast,
    addExtension = extensionElementUtil.add,
    removeExtensions = extensionElementUtil.removeAll;

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    getBusinessObject = ModelUtil.getBusinessObject,
    getDefinition = ModelUtil.getDefinition,
    isCasePlanModel = ModelUtil.isCasePlanModel;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isTask = CmmnElementHelper.isTask,
    isStage = CmmnElementHelper.isStage,
    isMilestone = CmmnElementHelper.isMilestone,
    isEventListener = CmmnElementHelper.isEventListener;


var PARENT_COMPLETION_TYPES = [
  'default',
  'ignore',
  'ignoreIfAvailable',
  'ignoreIfAvailableOrEnabled',
  'ignoreAfterFirstCompletion',
  'ignoreAfterFirstCompletionIfAvailableOrEnabled'
];

var REACTIVATION_CONDITIONS = [
  [ 'ActivateCondition', 'Activate Condition', 'activateCondition' ],
  [ 'IgnoreCondition', 'Ignore Condition', 'ignoreCondition' ],
  [ 'DefaultCondition', 'Default Condition', 'defaultCondition' ]
];


// entries //////////////////////////////////////////////////////////////


/**
 * Text fields for the conditions of a reactivation rule. The rule is
 * created with the first condition and removed with the last one.
 */
function reactivationConditionEntries(idPrefix, type, getContainer, cmmnFactory, translate, options) {

  options = options || {};

  return REACTIVATION_CONDITIONS.map(function(condition) {

    var id = idPrefix + condition[0],
        property = condition[2];

    return entryFactory.textField({
      id: id,
      label: translate(condition[1]),
      modelProperty: id,

      get: function(element) {
        var rule = getExtension(getContainer(element), type),
            values = {};

        values[id] = (rule && rule.get(property)) || '';

        return values;
      },

      set: function(element, values) {
        var container = getContainer(element),
            rule = getExtension(container, type),
            value = values[id] || undefined,
            update = {};

        if (!rule) {

          if (!value) {
            return [];
          }

          update[property] = value;

          return addExtension(element, container, cmmnFactory.create(type, update), cmmnFactory);
        }

        var others = REACTIVATION_CONDITIONS.filter(function(other) {
          return other[2] !== property && rule.get(other[2]);
        });

        // the rule has no condition left
        if (!value && !others.length) {
          return removeExtensions(element, container, type);
        }

        update[property] = value;

        return cmdHelper.updateProperties(rule, update, element);
      },

      disabled: options.disabled
    });
  });
}


/**
 * The Flowable rules of the item control of a plan item or the default
 * control of its definition: parent completion, completion neutral and
 * reactivation.
 */
module.exports.planItemControlRuleProps = function(group, element, cmmnFactory, translate, options) {

  if (isCasePlanModel(element) ||
      (!isTask(element) && !isStage(element) && !isMilestone(element) && !isEventListener(element))) {
    return;
  }

  options = options || {};

  var isDefaultControl = options.isDefaultControl,
      idPrefix = (isDefaultControl ? 'default' : 'item') + 'Control';

  function getControl(element) {
    var bo = isDefaultControl ? getDefinition(element) : getBusinessObject(element);

    return bo && bo.get(isDefaultControl ? 'defaultControl' : 'itemControl');
  }

  function noControl(element) {
    return !getControl(element);
  }


  // parent completion
  group.entries.push(entryFactory.selectBox({
    id: idPrefix + 'ParentCompletionRule',
    label: translate('Parent Completion'),
    description: translate('How the plan item counts for the completion of its stage'),
    modelProperty: idPrefix + 'ParentCompletionRule',
    selectOptions: [ { name: '', value: '' } ].concat(PARENT_COMPLETION_TYPES.map(function(type) {
      return { name: type, value: type };
    })),

    get: function(element) {
      var rule = getExtension(getControl(element), 'flowable:ParentCompletionRule');

      var values = {};

      values[idPrefix + 'ParentCompletionRule'] = (rule && rule.get('type')) || '';

      return values;
    },

    set: function(element, values) {
      var control = getControl(element),
          rule = getExtension(control, 'flowable:ParentCompletionRule'),
          type = values[idPrefix + 'ParentCompletionRule'] || undefined;

      if (!type) {
        return removeExtensions(element, control, 'flowable:ParentCompletionRule');
      }

      if (rule) {
        return cmdHelper.updateProperties(rule, { type: type }, element);
      }

      return addExtension(element, control, cmmnFactory.create('flowable:ParentCompletionRule', {
        type: type
      }), cmmnFactory);
    },

    disabled: noControl
  }));


  // completion neutral
  group.entries.push(entryFactory.checkbox({
    id: idPrefix + 'CompletionNeutral',
    label: translate('Completion Neutral'),
    modelProperty: idPrefix + 'CompletionNeutral',

    get: function(element) {
      var values = {};

      values[idPrefix + 'CompletionNeutral'] = !!getExtension(getControl(element), 'flowable:CompletionNeutralRule');

      return values;
    },

    set: function(element, values) {
      var control = getControl(element);

      if (!values[idPrefix + 'CompletionNeutral']) {
        return removeExtensions(element, control, 'flowable:CompletionNeutralRule');
      }

      return addExtension(element, control, cmmnFactory.create('flowable:CompletionNeutralRule'), cmmnFactory);
    },

    disabled: noControl
  }));

  group.entries.push(entryFactory.textField({
    id: idPrefix + 'CompletionNeutralCondition',
    label: translate('Completion Neutral Condition'),
    description: translate('Always completion neutral when empty'),
    modelProperty: idPrefix + 'CompletionNeutralCondition',

    get: function(element) {
      var rule = getExtension(getControl(element), 'flowable:CompletionNeutralRule'),
          condition = rule && rule.get('condition'),
          values = {};

      values[idPrefix + 'CompletionNeutralCondition'] = (condition && condition.get('body')) || '';

      return values;
    },

    set: function(element, values) {
      var rule = getExtension(getControl(element), 'flowable:CompletionNeutralRule'),
          condition = rule && rule.get('condition'),
          body = values[idPrefix + 'CompletionNeutralCondition'] || undefined;

      if (!rule) {
        return [];
      }

      if (!body) {
        return cmdHelper.updateProperties(rule, { condition: undefined }, element);
      }

      if (condition) {
        return cmdHelper.updateProperties(condition, { body: body }, element);
      }

      condition = elementHelper.createElement('cmmn:Expression', { body: body }, rule, cmmnFactory);

      return cmdHelper.updateProperties(rule, { condition: condition }, element);
    },

    hideEntry: function(element) {
      return !getExtension(getControl(element), 'flowable:CompletionNeutralRule');
    }
  }));


  // reactivation; a reactivate event listener has its default reactivation rule instead
  if (isReactivationEventListener(element)) {
    return;
  }

  group.entries = group.entries.concat(reactivationConditionEntries(
    idPrefix + 'Reactivation', 'flowable:ReactivationRule', getControl, cmmnFactory, translate, {
      disabled: noControl
    }
  ));
};


/**
 * Whether the element is an event listener that reactivates the case.
 */
function isReactivationEventListener(element) {
  var definition = getDefinition(element);

  return isEventListener(element) && !!definition && definition.get('flowable:eventType') === 'reactivate';
}

module.exports.isReactivationEventListener = isReactivationEventListener;


/**
 * The default reactivation rule of an event listener that reactivates the
 * case, for the plan items without a reactivation rule of their own.
 */
module.exports.defaultReactivationRuleProps = function(group, element, cmmnFactory, translate) {

  if (!isReactivationEventListener(element)) {
    return;
  }

  group.entries = group.entries.concat(reactivationConditionEntries(
    'defaultReactivation', 'flowable:DefaultReactivationRule', getDefinition, cmmnFactory, translate
  ));
};
