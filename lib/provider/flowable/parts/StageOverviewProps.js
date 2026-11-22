'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    is = ModelUtil.is,
    isCasePlanModel = ModelUtil.isCasePlanModel,
    getDefinition = ModelUtil.getDefinition;


var INTEGER = /^-?\d+$/;


function textField(id, label, property, translate, options) {

  options = options || {};

  return entryFactory.textField({
    id: id,
    label: translate(label),
    description: options.description && translate(options.description),
    modelProperty: id,

    get: function(element) {
      var definition = getDefinition(element),
          values = {};

      values[id] = (definition && definition.get(property)) || '';

      return values;
    },

    set: function(element, values) {
      var properties = {};

      properties[property] = values[id] || undefined;

      return cmdHelper.updateProperties(getDefinition(element), properties, element);
    },

    validate: options.validate
  });
}


/**
 * What Flowable reads on stages and milestones: whether and where they are
 * shown in the stage overview, the business status they set, the milestone
 * variable, and the auto complete condition of a stage.
 */
module.exports = function(group, element, translate) {

  var definition = getDefinition(element);

  var isStage = is(definition, 'cmmn:Stage'),
      isMilestone = is(definition, 'cmmn:Milestone');

  if (!isStage && !isMilestone) {
    return;
  }

  // the case plan model takes them too, as a stage
  var casePlanModel = isCasePlanModel(element);

  group.entries.push(textField(
    'stageOverview-includeInStageOverview',
    'Include In Stage Overview',
    'flowable:includeInStageOverview',
    translate,
    { description: 'Included when empty; false, or an expression' }
  ));

  group.entries.push(textField(
    'stageOverview-displayOrder',
    'Display Order',
    'flowable:displayOrder',
    translate,
    {
      description: 'Order in the stage overview, a number',
      validate: function(element, values) {
        var value = values['stageOverview-displayOrder'];

        if (value && !INTEGER.test(value.trim())) {
          return { 'stageOverview-displayOrder': translate('Must be a whole number') };
        }

        return {};
      }
    }
  ));

  group.entries.push(textField(
    'stageOverview-businessStatus',
    'Business Status',
    'flowable:businessStatus',
    translate,
    {
      description: casePlanModel ?
        'Set on the case when it starts' :
        isStage ?
          'Set on the case when the stage starts' :
          'Set on the case when the milestone is reached'
    }
  ));

  if (isMilestone) {
    group.entries.push(textField(
      'milestone-milestoneVariable',
      'Milestone Variable',
      'flowable:milestoneVariable',
      translate,
      { description: 'Set to true when the milestone is reached' }
    ));
  }

  if (isStage) {

    // completes once no plan item is active, without waiting for a required one
    group.entries.push(entryFactory.checkbox({
      id: 'stage-autoComplete',
      label: translate('Auto Complete'),
      modelProperty: 'autoComplete',

      // Flowable also reads flowable:autoComplete; the CMMN attribute is written instead
      get: function(element) {
        var definition = getDefinition(element),
            flowableValue = definition.get('flowable:autoComplete');

        return {
          autoComplete: !!definition.get('autoComplete') ||
            String(flowableValue).trim().toLowerCase() === 'true'
        };
      },

      set: function(element, values) {
        return cmdHelper.updateProperties(getDefinition(element), {
          autoComplete: values.autoComplete ? true : undefined,
          'flowable:autoComplete': undefined
        }, element);
      }
    }));

    group.entries.push(textField(
      'stage-autoCompleteCondition',
      'Auto Complete Condition',
      'flowable:autoCompleteCondition',
      translate,
      { description: 'While it holds, the stage completes once no plan item is active' }
    ));
  }
};
