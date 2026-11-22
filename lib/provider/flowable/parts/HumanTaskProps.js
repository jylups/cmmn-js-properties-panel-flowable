'use strict';

var entryFactory = require('../../../factory/EntryFactory');

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isAssignable = CmmnElementHelper.isAssignable,
    isFormSupported = CmmnElementHelper.isFormSupported;

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    is = ModelUtil.is,
    getDefinition = ModelUtil.getDefinition;


module.exports = function(group, element, cmmnFactory, elementRegistry, itemRegistry, translate) {

  if (isFormSupported(element)) {

    // Form Key
    group.entries.push(entryFactory.textField({
      id : 'formKey',
      label : translate('Form Key'),
      modelProperty : 'formKey',
      reference: 'definitionRef'
    }));
  }

  var humanTask = is(getDefinition(element), 'cmmn:HumanTask');

  if (humanTask) {

    // server-side validation of the form fields when the task completes
    group.entries.push(entryFactory.textField({
      id : 'formFieldValidation',
      label : translate('Validate Form Fields'),
      description : translate('Validate the form fields on the server when the task completes: ' +
                              'true, false or an expression'),
      modelProperty : 'formFieldValidation',
      reference: 'definitionRef'
    }));
  }

  if (isAssignable(element)) {

    // Assignee
    group.entries.push(entryFactory.textField({
      id : 'assignee',
      label : translate('Assignee'),
      modelProperty : 'assignee',
      reference: 'definitionRef'
    }));

    // Owner
    group.entries.push(entryFactory.textField({
      id : 'owner',
      label : translate('Owner'),
      modelProperty : 'owner',
      reference: 'definitionRef'
    }));

    // Candidate Users
    group.entries.push(entryFactory.textField({
      id : 'candidateUsers',
      label : translate('Candidate Users'),
      modelProperty : 'candidateUsers',
      reference: 'definitionRef'
    }));

    // Candidate Groups
    group.entries.push(entryFactory.textField({
      id : 'candidateGroups',
      label : translate('Candidate Groups'),
      modelProperty : 'candidateGroups',
      reference: 'definitionRef'
    }));

    // Due Date
    group.entries.push(entryFactory.textField({
      id : 'dueDate',
      description : translate('The due date as an EL expression (e.g. ${someDate} or an ISO date (e.g. 2015-06-26T09:54:00)'),
      label : translate('Due Date'),
      modelProperty : 'dueDate',
      reference: 'definitionRef'
    }));

    // priority
    group.entries.push(entryFactory.textField({
      id : 'priority',
      label : translate('Priority'),
      modelProperty : 'priority',
      reference: 'definitionRef'
    }));
  }

  if (humanTask) {

    // Category
    group.entries.push(entryFactory.textField({
      id : 'category',
      label : translate('Category'),
      modelProperty : 'category',
      reference: 'definitionRef'
    }));

    // the variables Flowable sets to the task's id and to who completed it
    group.entries.push(entryFactory.textField({
      id : 'taskIdVariableName',
      label : translate('Task ID Variable'),
      description : translate('Variable set to the id of the task when it is created'),
      modelProperty : 'taskIdVariableName',
      reference: 'definitionRef'
    }));

    group.entries.push(entryFactory.textField({
      id : 'taskCompleterVariableName',
      label : translate('Task Completer Variable'),
      description : translate('Variable set to the id of the user who completes the task'),
      modelProperty : 'taskCompleterVariableName',
      reference: 'definitionRef'
    }));
  }
};
