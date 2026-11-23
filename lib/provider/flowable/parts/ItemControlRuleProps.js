'use strict';

var escapeHTML = require('../../../Utils').escapeHTML;

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper'),
    elementHelper = require('../../../helper/ElementHelper');

var ConditionSwitch = require('../../cmmn/parts/implementation/ConditionSwitch');

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
 * typed. The T / ⚡ switch shows the check or the expression field; switching
 * clears the other. The rule is created with the first condition and removed
 * with the last.
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
      '<div class="cpp-condition-head">' +
        '<label id="flowable-' + escapeHTML(id) + '-label">' + escapeHTML(label) + '</label>' +
        ConditionSwitch.html(label, translate) +
      '</div>' +
      '<div class="cpp-condition-choice">' +
        '<input type="checkbox" id="flowable-' + escapeHTML(trueId) + '" name="' + escapeHTML(trueId) + '" ' +
          'aria-labelledby="flowable-' + escapeHTML(id) + '-label" />' +
        '<label for="flowable-' + escapeHTML(trueId) + '">' + escapeHTML(translate('True')) + '</label>' +
      '</div>' +
      '<div class="cpp-field-wrapper cpp-condition-expression">' +
        '<input id="flowable-' + escapeHTML(id) + '" type="text" name="' + escapeHTML(id) + '" ' +
          'aria-label="' + escapeHTML(label) + ' expression" ' +
          'placeholder="' + escapeHTML(translate('An expression, such as ${approved}')) + '" />' +
      '</div>' +
      '<div class="cpp-field-description">' + escapeHTML(translate(condition[3])) + '</div>';

    function mode(element, node) {
      return ConditionSwitch.getMode(node, isExpression(getValue(element)));
    }

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

          var create = function(container) {
            return addExtension(element, container, cmmnFactory.create(type, update), cmmnFactory);
          };

          // an item control without a control gets one with its first condition
          if (!container) {
            return options.withContainer ? options.withContainer(element, create) : [];
          }

          return create(container);
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

      // T / ⚡: the check or the expression field, on every update
      updateView: function(element, node) {
        var current = mode(element, node);

        ConditionSwitch.showMode(node, current);
        ConditionSwitch.toggle(node.querySelector('.cpp-condition-choice'), current === ConditionSwitch.FIXED);
        ConditionSwitch.toggle(node.querySelector('.cpp-condition-expression'), current === ConditionSwitch.EXPRESSION);
      },

      // switching clears what the other mode had: an expression, or the check
      useFixed: function(element, node) {
        if (mode(element, node) === ConditionSwitch.FIXED) {
          return false;
        }

        ConditionSwitch.setMode(node, ConditionSwitch.FIXED);
        node.querySelector('input[type=text]').value = '';

        return true;
      },

      useExpression: function(element, node) {
        if (mode(element, node) === ConditionSwitch.EXPRESSION) {
          return false;
        }

        ConditionSwitch.setMode(node, ConditionSwitch.EXPRESSION);
        node.querySelector('input[type=checkbox]').checked = false;

        return true;
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

  // the control is created with its first rule, as Flowable Design does
  function withControl(element, fn) {
    var bo = isDefaultControl ? getDefinition(element) : getBusinessObject(element),
        control = getControl(element),
        cmds = [];

    if (!control) {
      var update = {};

      update[isDefaultControl ? 'defaultControl' : 'itemControl'] = control = cmmnFactory.create('cmmn:PlanItemControl');

      cmds.push(
        cmdHelper.updateProperties(bo, update, element),
        cmdHelper.updateSemanticParent(control, bo, null, element)
      );
    }

    return cmds.concat(fn(control));
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
        return control ? removeExtensions(element, control, 'flowable:ParentCompletionRule') : [];
      }

      if (rule) {
        return cmdHelper.updateProperties(rule, { type: type }, element);
      }

      return withControl(element, function(control) {
        return addExtension(element, control, cmmnFactory.create('flowable:ParentCompletionRule', {
          type: type
        }), cmmnFactory);
      });
    }
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
        return control ? removeExtensions(element, control, 'flowable:CompletionNeutralRule') : [];
      }

      return withControl(element, function(control) {
        return addExtension(element, control, cmmnFactory.create('flowable:CompletionNeutralRule'), cmmnFactory);
      });
    }
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
      withContainer: withControl
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
