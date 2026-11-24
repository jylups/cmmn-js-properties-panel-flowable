'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var getDiagramCase = require('../../../helper/CmmnElementHelper').getDiagramCase;

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    getBusinessObject = ModelUtil.getBusinessObject,
    isCasePlanModel = ModelUtil.isCasePlanModel;


function getCase(element) {
  return getDiagramCase(element) || getBusinessObject(element).$parent;
}

// the case plan model, or the diagram when nothing is selected
function isCaseElement(element) {
  return isCasePlanModel(element) || !!getDiagramCase(element);
}

function getDefinitions(element) {
  var bo = getBusinessObject(element);

  while (bo && bo.$type !== 'cmmn:Definitions') {
    bo = bo.$parent;
  }

  return bo;
}

function getPlanModel(element) {
  return getBusinessObject(element);
}

function textField(id, label, property, getTarget, translate, description, pick) {

  pick = pick || {};

  return entryFactory.textField({
    id: id,
    label: translate(label),
    description: description && translate(description),
    modelProperty: id,
    pick: pick.kind,
    pickMultiple: pick.multiple,

    get: function(element) {
      var target = getTarget(element),
          values = {};

      values[id] = (target && target.get(property)) || '';

      return values;
    },

    set: function(element, values) {
      var properties = {};

      properties[property] = values[id] || undefined;

      return cmdHelper.updateBusinessObject(element, getTarget(element), properties);
    }
  });
}

/**
 * A checkbox for a Boolean attribute; the value Flowable uses when the
 * attribute is not written is not written either.
 */
function checkbox(id, label, property, getTarget, translate, defaultValue, description) {

  return entryFactory.checkbox({
    id: id,
    label: translate(label),
    description: description && translate(description),
    modelProperty: id,

    get: function(element) {
      var value = getTarget(element).get(property),
          values = {};

      values[id] = typeof value === 'boolean' ? value : defaultValue;

      return values;
    },

    set: function(element, values) {
      var value = !!values[id],
          properties = {};

      properties[property] = value === defaultValue ? undefined : value;

      return cmdHelper.updateBusinessObject(element, getTarget(element), properties);
    }
  });
}


/**
 * What Flowable reads on the case, shown with its case plan model: whether
 * it starts asynchronously, the initiator variable, and who may start it.
 */
module.exports.caseProps = function(group, element, translate) {

  if (!isCaseElement(element)) {
    return;
  }

  group.entries.push(checkbox('case-async', 'Asynchronous Start', 'flowable:async', getCase, translate, false,
    'Creates the case instance and starts its plan model in a job'));

  group.entries.push(textField('case-initiatorVariableName', 'Initiator Variable', 'flowable:initiatorVariableName',
    getCase, translate, 'Variable with the ID of the user who started the case'));

  group.entries.push(textField('case-candidateStarterUsers', 'Candidate Starter Users',
    'flowable:candidateStarterUsers', getCase, translate, 'Users who may start the case, comma separated',
    { kind: 'user', multiple: true }));

  group.entries.push(textField('case-candidateStarterGroups', 'Candidate Starter Groups',
    'flowable:candidateStarterGroups', getCase, translate, 'Groups who may start the case, comma separated',
    { kind: 'group', multiple: true }));

  // the author of the file, shown with the case in Flowable Design
  group.entries.push(textField('definitions-author', 'Author', 'author', getDefinitions, translate));
};


/**
 * The start form of the case, on its case plan model.
 */
module.exports.startFormProps = function(group, element, translate) {

  if (!isCasePlanModel(element)) {
    return;
  }

  group.entries.push(textField('startForm-formKey', 'Form Key', 'flowable:formKey', getPlanModel, translate,
    undefined, { kind: 'form' }));

  group.entries.push(textField('startForm-formFieldValidation', 'Form Field Validation',
    'flowable:formFieldValidation', getPlanModel, translate, 'true, false or an expression'));

  group.entries.push(checkbox('startForm-sameDeployment', 'Same Deployment', 'flowable:sameDeployment',
    getPlanModel, translate, true, 'Takes the form from the deployment of the case; from any deployment when unchecked'));
};
