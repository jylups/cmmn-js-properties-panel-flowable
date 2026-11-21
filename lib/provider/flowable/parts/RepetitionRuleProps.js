'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    getBusinessObject = ModelUtil.getBusinessObject,
    isCasePlanModel = ModelUtil.isCasePlanModel,
    getDefinition = ModelUtil.getDefinition;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isTask = CmmnElementHelper.isTask,
    isStage = CmmnElementHelper.isStage,
    isMilestone = CmmnElementHelper.isMilestone,
    isEventListener = CmmnElementHelper.isEventListener;


var MAX_INSTANCE_COUNT = /^(unlimited|-1|[1-9]\d*)$/;


/**
 * What Flowable reads on the repetition rule of the item control or the
 * default control: the counter variable, the maximum instance count, and
 * the collection to repeat the plan item for each element of.
 */
module.exports = function(group, element, itemRegistry, translate, options) {

  if (isCasePlanModel(element) ||
      (!isTask(element) && !isStage(element) && !isMilestone(element) && !isEventListener(element))) {
    return;
  }

  options = options || {};

  var isDefaultControl = options.isDefaultControl,
      idPrefix = (isDefaultControl ? 'default' : 'item') + 'Control-repetition-';

  function getRepetitionRule(element) {
    var bo = isDefaultControl ? getDefinition(element) : getBusinessObject(element),
        control = bo && bo.get(isDefaultControl ? 'defaultControl' : 'itemControl');

    return control && control.get('repetitionRule');
  }

  function update(element, properties) {
    var bo = getBusinessObject(element);

    return cmdHelper.updateProperties(getRepetitionRule(element), properties, itemRegistry.getShapes(bo));
  }

  function hideEntry(element) {
    return !getRepetitionRule(element);
  }

  function textField(name, label, description, validate) {
    var id = idPrefix + name;

    return entryFactory.textField({
      id: id,
      label: translate(label),
      description: description && translate(description),
      modelProperty: name,

      get: function(element) {
        var rule = getRepetitionRule(element),
            values = {};

        values[name] = (rule && rule.get('flowable:' + name)) || '';

        return values;
      },

      set: function(element, values) {
        var properties = {};

        properties['flowable:' + name] = values[name] || undefined;

        return update(element, properties);
      },

      validate: validate,
      hideEntry: hideEntry
    });
  }


  group.entries.push(textField('counterVariable', 'Counter Variable',
    'Local variable with the number of the instance; repetitionCounter when empty'));

  group.entries.push(entryFactory.checkbox({
    id: idPrefix + 'ignoreCounterVariable',
    label: translate('Ignore Counter Variable'),
    modelProperty: 'ignoreCounterVariable',

    get: function(element) {
      var rule = getRepetitionRule(element),
          value = rule && rule.get('flowable:ignoreCounterVariable');

      return {
        ignoreCounterVariable: !!value && value.toLowerCase() === 'true'
      };
    },

    set: function(element, values) {
      return update(element, {
        'flowable:ignoreCounterVariable': values.ignoreCounterVariable ? 'true' : undefined
      });
    },

    hideEntry: hideEntry
  }));

  group.entries.push(textField('maxInstanceCount', 'Max Instance Count',
    'Instances at the same time, a number or unlimited',
    function(element, values) {
      var value = values.maxInstanceCount;

      if (value && !MAX_INSTANCE_COUNT.test(value.trim())) {
        return { maxInstanceCount: translate('Must be a number above 0, or unlimited') };
      }

      return {};
    }));

  group.entries.push(textField('collectionVariable', 'Collection Variable',
    'Collection, or an expression giving one; an instance is created for each element'));

  group.entries.push(textField('elementVariable', 'Element Variable',
    'Local variable with the element of the instance'));

  group.entries.push(textField('elementIndexVariable', 'Element Index Variable',
    'Local variable with the index of the element'));
};
