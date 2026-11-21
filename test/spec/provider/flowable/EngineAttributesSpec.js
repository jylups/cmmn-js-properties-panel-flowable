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


describe('flowable - engine attributes', function() {

  var diagramXML = require('./EngineAttributes.cmmn');

  var testModules = [
    coreModule, selectionModule, modelingModule,
    propertiesPanelModule,
    propertiesProviderModule
  ];

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: testModules,
    moddleExtensions: { flowable: flowableModdlePackage }
  }));

  beforeEach(inject(function(propertiesPanel) {
    propertiesPanel.attachTo(container);
  }));


  var element;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      element = elementRegistry.get(id);

      selection.select(element);
    })();
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getInput(id) {
    return domQuery('[data-entry="' + id + '"] input, [data-entry="' + id + '"] select', container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function definition() {
    var bo = element.businessObject;

    return bo.definitionRef || bo;
  }


  describe('human task', function() {

    beforeEach(function() {
      select('PI_Human');
    });


    it('should show owner, category, task variables and form validation', function() {

      // then
      expect(getInput('owner').value).to.equal('kermit');
      expect(getInput('category').value).to.equal('orders');
      expect(getInput('taskIdVariableName').value).to.equal('reviewTaskId');
      expect(getInput('taskCompleterVariableName').value).to.equal('reviewer');
      expect(getInput('formFieldValidation').value).to.equal('true');
    });


    it('should change the owner', inject(function(commandStack) {

      // when
      TestHelper.triggerValue(getInput('owner'), 'gonzo', 'change');

      // then
      expect(definition().get('flowable:owner')).to.equal('gonzo');

      // when
      commandStack.undo();

      // then
      expect(definition().get('flowable:owner')).to.equal('kermit');
    }));


    it('should remove the category when emptied', function() {

      // when
      TestHelper.triggerValue(getInput('category'), '', 'change');

      // then
      expect(definition().get('flowable:category')).not.to.exist;
    });


    it('should show them in Flowable\'s groups', function() {

      // then
      expect(domQuery('[data-group="assignment"] [data-entry="owner"]', container)).to.exist;
      expect(domQuery('[data-group="common"] [data-entry="category"]', container)).to.exist;
      expect(domQuery('[data-group="execution"] [data-entry="taskIdVariableName"]', container)).to.exist;
      expect(domQuery('[data-group="formValidation"] [data-entry="formFieldValidation"]', container)).to.exist;
    });

  });


  describe('blocking', function() {

    it('should be checked when not written, as CMMN defaults it', function() {

      // when
      select('PI_Human');

      // then
      expect(getInput('taskIsBlocking').checked).to.be.true;
    });


    it('should show a non-blocking task', function() {

      // when
      select('PI_Plain');

      // then
      expect(getInput('taskIsBlocking').checked).to.be.false;
    });


    it('should write false only', function() {

      // given
      select('PI_Human');

      // when
      TestHelper.triggerEvent(getInput('taskIsBlocking'), 'click');

      // then
      expect(definition().get('isBlocking')).to.be.false;

      // when
      TestHelper.triggerEvent(getInput('taskIsBlocking'), 'click');

      // then
      expect(definition().get('isBlocking')).to.be.true;
    });

  });


  describe('stage and case plan model', function() {

    it('should change auto complete of a stage', function() {

      // given
      select('PI_Stage');

      expect(getInput('stage-autoComplete').checked).to.be.false;

      // when
      TestHelper.triggerEvent(getInput('stage-autoComplete'), 'click');

      // then
      expect(definition().get('autoComplete')).to.be.true;
    });


    it('should show auto complete, stage overview and author of the case plan model', function() {

      // when
      select('CasePlanModel_1');

      // then
      expect(getInput('stage-autoComplete').checked).to.be.true;
      expect(getInput('stageOverview-businessStatus').value).to.equal('open');
      expect(getInput('definitions-author').value).to.equal('Ana');
    });


    it('should change the author of the file', function() {

      // given
      select('CasePlanModel_1');

      // when
      TestHelper.triggerValue(getInput('definitions-author'), 'Bea', 'change');

      // then
      var definitions = element.businessObject.$parent.$parent;

      expect(definitions.get('author')).to.equal('Bea');
    });


    it('should list lifecycle listeners of the plan model itself', function() {

      // when
      select('CasePlanModel_1');

      // then
      expect(domQuery('#flowable-extensionElements-planItemLifecycleListeners', container)).to.exist;
    });

  });


  describe('event listener item control', function() {

    it('should offer required and repetition, not manual activation', function() {

      // when
      select('PI_Listener');

      // then
      expect(getEntry('itemControlRequiredRule')).to.exist;
      expect(getEntry('itemControlRepetitionRule')).to.exist;
      expect(getEntry('itemControlManualActivationRule')).not.to.exist;

      expect(domQuery('[data-entry="itemControl-repetition-counterVariable"] input', container).value)
        .to.equal('rounds');
    });


    it('should offer completion neutral, parent completion and reactivation', function() {

      // when
      select('PI_Listener');

      // then
      expect(getEntry('itemControlCompletionNeutral')).to.exist;
      expect(getEntry('itemControlParentCompletionRule')).to.exist;
      expect(getEntry('itemControlReactivationIgnoreCondition')).to.exist;
    });


    it('should not give a reactivate event listener reactivation conditions of its own', function() {

      // when
      select('PI_Reactivate');

      // then
      expect(getEntry('itemControlRequiredRule')).to.exist;
      expect(getEntry('itemControlReactivationIgnoreCondition')).not.to.exist;
    });

  });


  describe('process key', function() {

    beforeEach(function() {
      select('PI_Process');
    });


    it('should show the external reference of the referenced process', function() {

      // then
      expect(isShown(getEntry('callableExternalRef'))).to.be.true;
      expect(getInput('callableExternalRef').value).to.equal('orderProcess');
    });


    it('should change it', inject(function(commandStack) {

      // when
      TestHelper.triggerValue(getInput('callableExternalRef'), 'invoiceProcess', 'change');

      // then
      var definitions = element.businessObject.$parent.$parent.$parent,
          process = definitions.get('processes')[0];

      expect(process.get('externalRef')).to.equal('invoiceProcess');

      // when
      commandStack.undo();

      // then
      expect(process.get('externalRef')).to.equal('orderProcess');
    }));

  });


  describe('text annotation', function() {

    it('should show and change the text format', function() {

      // given
      select('TextAnnotation_1');

      expect(getInput('textFormat').value).to.equal('text/plain');

      // when
      TestHelper.triggerValue(getInput('textFormat'), 'text/markdown', 'change');

      // then
      expect(element.businessObject.get('textFormat')).to.equal('text/markdown');
    });

  });

});
