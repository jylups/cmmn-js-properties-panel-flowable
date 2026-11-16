'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domClasses = require('min-dom').classes,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - case and start form', function() {

  var diagramXML = require('./CaseStart.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule, selectionModule, modelingModule,
      propertiesPanelModule, propertiesProviderModule
    ],
    moddleExtensions: { flowable: flowableModdlePackage }
  }));

  beforeEach(inject(function(propertiesPanel) {
    propertiesPanel.attachTo(container);
  }));


  var caze, casePlanModel;

  beforeEach(inject(function(elementRegistry, selection) {
    var element = elementRegistry.get('CasePlanModel_1');

    casePlanModel = element.businessObject;
    caze = casePlanModel.$parent;

    selection.select(element);
  }));


  function getGroup(id) {
    return domQuery('[data-tab="general"] [data-group="' + id + '"]', container);
  }

  function getField(entryId) {
    return domQuery('[data-entry="' + entryId + '"] input', container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }


  describe('case', function() {

    it('should show the case', function() {

      // then
      expect(isShown(getGroup('case'))).to.be.true;
      expect(getField('case-async').checked).to.be.false;
      expect(getField('case-initiatorVariableName').value).to.eql('initiator');
      expect(getField('case-candidateStarterUsers').value).to.eql('');
      expect(getField('case-candidateStarterGroups').value).to.eql('sales');
    });


    it('should set and undo the case attributes', inject(function(commandStack) {

      // when
      TestHelper.triggerValue(getField('case-candidateStarterUsers'), 'kermit,fozzie', 'change');
      TestHelper.triggerValue(getField('case-initiatorVariableName'), '', 'change');

      // then
      expect(caze.get('flowable:candidateStarterUsers')).to.eql('kermit,fozzie');
      expect(caze.get('flowable:initiatorVariableName')).not.to.exist;

      // when
      commandStack.undo();

      // then
      expect(caze.get('flowable:initiatorVariableName')).to.eql('initiator');
    }));


    it('should write an asynchronous start only when checked', function() {

      // when
      TestHelper.triggerEvent(getField('case-async'), 'click');

      // then
      expect(caze.get('flowable:async')).to.be.true;

      // when
      TestHelper.triggerEvent(getField('case-async'), 'click');

      // then
      expect(caze.get('flowable:async')).not.to.exist;
    });

  });


  describe('start form', function() {

    it('should show the start form', function() {

      // then
      expect(isShown(getGroup('startForm'))).to.be.true;
      expect(getField('startForm-formKey').value).to.eql('orderForm');
      expect(getField('startForm-formFieldValidation').value).to.eql('');
      expect(getField('startForm-sameDeployment').checked).to.be.false;
    });


    it('should set the form key and form field validation', function() {

      // when
      TestHelper.triggerValue(getField('startForm-formKey'), 'startForm', 'change');
      TestHelper.triggerValue(getField('startForm-formFieldValidation'), 'false', 'change');

      // then
      expect(casePlanModel.get('flowable:formKey')).to.eql('startForm');
      expect(casePlanModel.get('flowable:formFieldValidation')).to.eql('false');
    });


    it('should write same deployment only when unchecked', function() {

      // when
      TestHelper.triggerEvent(getField('startForm-sameDeployment'), 'click');

      // then
      expect(casePlanModel.get('flowable:sameDeployment')).not.to.exist;

      // when
      TestHelper.triggerEvent(getField('startForm-sameDeployment'), 'click');

      // then
      expect(casePlanModel.get('flowable:sameDeployment')).to.be.false;
    });

  });


  it('should not show the groups for a plan item', inject(function(elementRegistry, selection) {

    // when
    selection.select(elementRegistry.get('PI_Task'));

    // then
    expect(isShown(getGroup('case'))).to.be.false;
    expect(isShown(getGroup('startForm'))).to.be.false;
  }));

});
