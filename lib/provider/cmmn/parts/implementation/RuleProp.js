'use strict';

var ConditionProp = require('./ConditionProp');

var entryFactory = require('../../../../factory/EntryFactory'),
    cmdHelper = require('../../../../helper/CmdHelper');


/**
 * A plan item control rule (required, manual activation, repetition) as
 * Flowable Design shows it: whether the rule applies (True / False), and its
 * optional condition. In CMMN a rule without a condition always applies, so
 * an empty <requiredRule/> means required; no rule means not required.
 */


module.exports = function(element, cmmnFactory, itemRegistry, translate, options) {


  function getPlanItemControl(bo, controlRef) {
    return bo && bo.get(controlRef);
  }

  function getRule(bo, controlRef, ruleRef) {
    var control = getPlanItemControl(bo, controlRef);
    return control && control.get(ruleRef);
  }

  function getRuleCondition(bo, controlRef, ruleRef) {
    var rule = getRule(bo, controlRef, ruleRef);
    return rule && rule.get('condition');
  }


  options = options || {};

  var id = options.id,
      label = options.label,
      reference = options.reference,
      modelProperty = options.modelProperty,
      ruleType = options.ruleType,
      controlRef = options.controlRef,
      ruleRef = options.ruleRef;


  function getTarget(element) {
    var bo = element.businessObject;

    return reference ? bo && bo.get(reference) : bo;
  }

  // the control is created with the first rule, as Flowable Design does
  function ensureControl(bo, cmds, element) {
    var control = getPlanItemControl(bo, controlRef);

    if (!control) {
      var controlUpdate = {};
      controlUpdate[controlRef] = control = cmmnFactory.create('cmmn:PlanItemControl');
      cmds.push(
        cmdHelper.updateProperties(bo, controlUpdate, itemRegistry.getShapes(bo)),
        cmdHelper.updateSemanticParent(control, bo, null, element)
      );
    }

    return control;
  }

  var enabledProperty = (id || 'rule') + 'Enabled';

  var enabledEntry = entryFactory.checkbox({
    id: enabledProperty,
    label: options.enabledLabel || label || translate('Rule'),
    description: options.enabledDescription,
    modelProperty: enabledProperty,

    get: function(element) {
      var values = {};

      values[enabledProperty] = !!getRule(getTarget(element), controlRef, ruleRef);

      return values;
    },

    set: function(element, values) {
      var bo = getTarget(element),
          rule = getRule(bo, controlRef, ruleRef),
          cmds = [],
          control,
          ruleUpdate = {};

      if (values[enabledProperty] && !rule) {
        control = ensureControl(bo, cmds, element);
        ruleUpdate[ruleRef] = rule = cmmnFactory.create(ruleType);
        cmds.push(
          cmdHelper.updateProperties(control, ruleUpdate, itemRegistry.getShapes(bo)),
          cmdHelper.updateSemanticParent(rule, control, null, element)
        );
      }

      if (!values[enabledProperty] && rule) {
        control = getPlanItemControl(bo, controlRef);
        ruleUpdate[ruleRef] = undefined;
        cmds.push(
          cmdHelper.updateSemanticParent(rule, null, null, element),
          cmdHelper.updateProperties(control, ruleUpdate, itemRegistry.getShapes(bo))
        );
      }

      return cmds;
    },

    validate: options.validate && function(element, values, node) {
      var result = options.validate(element, values, node, getTarget(element)),
          warning = result && result[modelProperty];

      var mapped = {};

      if (warning) {
        mapped[enabledProperty] = warning;
      }

      return mapped;
    }
  });

  var conditionEntries = ConditionProp(element, cmmnFactory, translate, {

    id: id || 'rule',
    label: label || translate('Rule'),
    reference: reference,
    modelProperty: modelProperty,

    getCondition: function(element, node, bo) {
      return getRuleCondition(bo, controlRef, ruleRef);
    },

    createdCondition: function(condition, element, node, bo) {
      var cmds = [],
          control = ensureControl(bo, cmds, element),
          rule = getRule(bo, controlRef, ruleRef);

      if (!rule) {
        var ruleUpdate = {};
        ruleUpdate[ruleRef] = rule = cmmnFactory.create(ruleType);
        cmds.push(
          cmdHelper.updateProperties(control, ruleUpdate, itemRegistry.getShapes(bo)),
          cmdHelper.updateSemanticParent(rule, control, null, element)
        );
      }

      cmds.push(
        cmdHelper.updateProperties(rule, { condition: condition }, element),
        cmdHelper.updateSemanticParent(condition, rule, null, element)
      );

      return cmds;
    },

    // clearing the condition keeps the rule: without one it always applies
    removedCondition: function(condition, element, node, bo) {
      var rule = getRule(bo, controlRef, ruleRef);

      if (!rule) {
        return [];
      }

      return [
        cmdHelper.updateSemanticParent(condition, null, null, element),
        cmdHelper.updateProperties(rule, { condition: undefined }, element)
      ];
    },

    validate: options.validate,
    disabled: options.disabled

  });

  // the condition is edited with the rule
  conditionEntries.forEach(function(entry) {
    entry.editWith = enabledProperty;
  });

  return [ enabledEntry ].concat(conditionEntries);

};
