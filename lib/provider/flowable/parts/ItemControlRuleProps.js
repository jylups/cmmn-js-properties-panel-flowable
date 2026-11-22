'use strict';

var escapeHTML = require('../../../Utils').escapeHTML;

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

/** A parent completion type in words, as Flowable Design lists it: ignoreIfAvailable is "ignore if available". */
function parentCompletionLabel(type) {
  return type.replace(/([A-Z])/g, ' $1').toLowerCase();
}

var REACTIVATION_CONDITIONS = [
  [ 'ActivateCondition', 'Direct activation condition', 'activateCondition',
    'Evaluated first when the case is reactivated: when true, the plan item is activated at once, ' +
    'whatever its entry sentries.' ],
  [ 'IgnoreCondition', 'Ignore condition', 'ignoreCondition',
    'When true, the plan item is ignored on reactivation.' ],
  [ 'DefaultCondition', 'Default condition', 'defaultCondition',
    'Evaluated when the others are false: when true, the plan item behaves as in a new case, ' +
    'with its entry sentries.' ]
];


// entries //////////////////////////////////////////////////////////////


/**
 * The conditions of a reactivation rule as Flowable Design shows them: each is
 * False (not written), True (a check) or an expression, which wins when one is
 * typed. The rule is created with the first condition and removed with the last.
 */
function reactivationConditionEntries(idPrefix, type, getContainer, cmmnFactory, translate, options) {

  options = options || {};

  return REACTIVATION_CONDITIONS.map(function(condition) {

    var id = idPrefix + condition[0],
        trueId = id + 'True',
        property = condition[2],
        label = translate(condition[1]);

    function getValue(element) {
      var rule = getExtension(getContainer(element), type);

      return (rule && rule.get(property)) || '';
    }

    function isExpression(value) {
      return !!value && value !== 'true' && value !== 'false';
    }

    var html =
      '<div class="cpp-condition-choice">' +
        '<input type="checkbox" id="flowable-' + escapeHTML(trueId) + '" name="' + escapeHTML(trueId) + '" />' +
        '<label for="flowable-' + escapeHTML(trueId) + '">' + escapeHTML(label) + '</label>' +
      '</div>' +
      '<div class="cpp-field-wrapper">' +
        '<input id="flowable-' + escapeHTML(id) + '" type="text" name="' + escapeHTML(id) + '" ' +
          'aria-label="' + escapeHTML(label) + ' expression" ' +
          'placeholder="' + escapeHTML(translate('or an expression, such as ${approved}')) + '" />' +
      '</div>' +
      '<div class="cpp-field-description">' + escapeHTML(translate(condition[3])) + '</div>';

    return {
      id: id,
      html: html,
      modelProperty: id,

      get: function(element) {
        var value = getValue(element),
            values = {};

        values[trueId] = value === 'true';
        values[id] = isExpression(value) ? value : '';

        return values;
      },

      set: function(element, values) {
        var container = getContainer(element),
            rule = getExtension(container, type),
            current = getValue(element),
            expression = (values[id] || '').trim(),
            value;

        // a check that was just made wins; then a typed expression; then the check
        if (values[trueId] && current !== 'true') {
          value = 'true';
        } else if (expression) {
          value = expression;
        } else if (values[trueId]) {
          value = 'true';
        }

        var update = {};

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

      // one row in the read view: True, False or the expression
      summaryValue: function(element) {
        var value = getValue(element);

        return {
          label: label,
          value: isExpression(value) ? value : (value === 'true' ? 'True' : 'False')
        };
      },

      disabled: options.disabled
    };
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
    label: translate(isDefaultControl ? 'Default impact on parent completion' : 'Impact on parent completion'),
    description: translate('Normally a stage completes when none of its plan items is active any more. ' +
      'Ignore leaves this plan item out of that check; the other choices leave it out only in some states.'),
    modelProperty: idPrefix + 'ParentCompletionRule',
    selectOptions: [ { name: translate('Select…'), value: '', placeholder: true } ].concat(PARENT_COMPLETION_TYPES.map(function(type) {
      return { name: translate(parentCompletionLabel(type)), value: type };
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
