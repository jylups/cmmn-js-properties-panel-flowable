'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var IdProp = require('../../cmmn/parts/implementation/IdProp'),
    NameProp = require('../../cmmn/parts/implementation/NameProp'),
    DocumentationProp = require('../../cmmn/parts/implementation/DocumentationProp');

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    getDiagramCase = CmmnElementHelper.getDiagramCase,
    getDiagramDefinitions = CmmnElementHelper.getDiagramDefinitions;


/**
 * What Flowable Design shows as the case diagram's common properties when
 * nothing is selected: the model key (the case's id), the case's name and
 * documentation, and the category Flowable gives the deployed case definition
 * (the file's target namespace).
 */
module.exports = function(group, element, cmmnFactory, translate) {

  var caze = getDiagramCase(element);

  if (!caze) {
    return;
  }

  group.entries = group.entries.concat(IdProp(element, translate, {
    id: 'caseKey',
    label: translate('Model Key'),
    reference: getDiagramCase,

    get: function(element, node, bo) {
      return { id: bo.get('id') };
    },

    set: function(element, values, node, bo) {
      return cmdHelper.updateBusinessObject(element, bo, { id: values.id });
    }
  }));

  group.entries = group.entries.concat(NameProp(element, translate, {
    id: 'caseDiagramName',
    reference: getDiagramCase,

    get: function(element, node, bo) {
      return { name: bo.get('name') };
    },

    set: function(element, values, node, bo) {
      return cmdHelper.updateBusinessObject(element, bo, { name: values.name || undefined });
    }
  }));

  group.entries = group.entries.concat(DocumentationProp(element, cmmnFactory, translate, {
    id: 'caseDiagramDocumentation',
    reference: getDiagramCase
  }));

  group.entries.push(entryFactory.validationAwareTextField({
    id: 'caseCategory',
    label: translate('Category'),
    description: translate('Groups the deployed case definition; the target namespace of the file'),
    modelProperty: 'category',

    get: function(element) {
      var definitions = getDiagramDefinitions(element);

      return { category: (definitions && definitions.get('targetNamespace')) || '' };
    },

    set: function(element, values) {
      var definitions = getDiagramDefinitions(element);

      return cmdHelper.updateBusinessObject(element, definitions, { targetNamespace: values.category });
    },

    // CMMN requires a target namespace
    validate: function(element, values) {
      return (values.category || '').trim() ? {} : { category: translate('Must have a value') };
    }
  }));
};
