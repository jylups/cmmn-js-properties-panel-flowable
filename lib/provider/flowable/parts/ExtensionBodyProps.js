'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    getDefinition = ModelUtil.getDefinition,
    isCasePlanModel = ModelUtil.isCasePlanModel;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isTask = CmmnElementHelper.isTask,
    isStage = CmmnElementHelper.isStage,
    isMilestone = CmmnElementHelper.isMilestone,
    isEventListener = CmmnElementHelper.isEventListener;

var extensionElementUtil = require('./implementation/ExtensionElementUtil'),
    getLast = extensionElementUtil.getLast,
    addExtension = extensionElementUtil.add,
    removeExtensions = extensionElementUtil.removeAll;


/**
 * A field for the text of an extension element of the element's definition,
 * such as <flowable:jobCategory>orders</flowable:jobCategory>. An empty value
 * removes the element.
 */
function bodyField(factory, id, label, type, cmmnFactory, translate, description) {

  return factory({
    id: id,
    label: translate(label),
    description: description && translate(description),
    modelProperty: id,

    get: function(element) {
      var extension = getLast(getDefinition(element), type),
          values = {};

      values[id] = (extension && extension.get('body')) || '';

      return values;
    },

    set: function(element, values) {
      var definition = getDefinition(element),
          extension = getLast(definition, type),
          body = values[id] || undefined;

      if (!body) {
        return removeExtensions(element, definition, type);
      }

      if (extension) {
        return cmdHelper.updateProperties(extension, { body: body }, element);
      }

      return addExtension(element, definition, cmmnFactory.create(type, { body: body }), cmmnFactory);
    }
  });
}


/**
 * What Flowable reads as extension elements of every plan item definition:
 * the category of its jobs and its name with line breaks.
 */
module.exports = function(group, element, cmmnFactory, translate) {

  if (isCasePlanModel(element) ||
      (!isTask(element) && !isStage(element) && !isMilestone(element) && !isEventListener(element))) {
    return;
  }

  // Flowable writes a name with line breaks as <flowable:element-name> and
  // reads it instead of the name attribute
  group.entries.push(bodyField(entryFactory.textBox, 'elementName', 'Multi-line Name', 'flowable:Element-name',
    cmmnFactory, translate, 'Used instead of the name when it has line breaks'));

  // the category of the element's jobs: asynchronous continuations, external worker jobs
  group.entries.push(bodyField(entryFactory.textField, 'jobCategory', 'Job Category', 'flowable:JobCategory',
    cmmnFactory, translate, 'Category of the jobs of the element, for executors that take only some categories'));
};
