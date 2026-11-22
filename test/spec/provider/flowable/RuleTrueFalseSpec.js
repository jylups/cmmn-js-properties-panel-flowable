'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - plan item rules as True / False', function() {

  var diagramXML = require('./RuleTrueFalse.cmmn');

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


  var bo;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      var element = elementRegistry.get(id);

      bo = element.businessObject;
      selection.select(element);
    });
  }

  function getCheckbox(id) {
    return domQuery('[data-entry="' + id + '"] input[type=checkbox]', container);
  }

  // the read view's rows of the Control group, as "label: value"
  function summary() {
    return Array.prototype.map.call(
      domQueryAll('[data-group="controlRules"] [data-group-summary] .cpp-summary-row', container),
      function(row) {
        return domQuery('dt', row).textContent + ': ' + domQuery('dd', row).textContent;
      });
  }


  describe('a rule without a condition', function() {

    beforeEach(select('PI_Required'));


    it('should read as True, as it applies always', function() {

      // then
      expect(getCheckbox('itemControlRequiredRuleEnabled').checked).to.be.true;
      expect(getCheckbox('itemControlManualActivationRuleEnabled').checked).to.be.false;
      expect(summary()).to.include('Required: True');
      expect(summary()).to.include('Manual activation: False');
    });


    it('should be removed when unchecked, and come back on undo', inject(function(commandStack) {

      // when
      TestHelper.triggerEvent(getCheckbox('itemControlRequiredRuleEnabled'), 'click');

      // then
      expect(bo.itemControl.requiredRule).not.to.exist;

      // when
      commandStack.undo();

      // then
      expect(bo.itemControl.requiredRule).to.exist;
      expect(bo.itemControl.requiredRule.condition).not.to.exist;
    }));

  });


  describe('a plan item without an item control', function() {

    beforeEach(select('PI_Plain'));


    it('should read as False', function() {

      // then
      expect(getCheckbox('itemControlRequiredRuleEnabled').checked).to.be.false;
      expect(summary()).to.include('Required: False');
    });


    it('should get an item control and a rule without a condition when checked', inject(function(commandStack) {

      // when
      TestHelper.triggerEvent(getCheckbox('itemControlRequiredRuleEnabled'), 'click');

      // then
      expect(bo.itemControl).to.exist;
      expect(bo.itemControl.$parent).to.equal(bo);
      expect(bo.itemControl.requiredRule).to.exist;
      expect(bo.itemControl.requiredRule.condition).not.to.exist;

      // when
      commandStack.undo();

      // then
      expect(bo.itemControl).not.to.exist;
    }));


    it('should get an item control and a rule when a condition is typed', function() {

      // when
      TestHelper.triggerValue(
        domQuery('[data-entry="itemControlRequiredRule"] [contenteditable], [data-entry="itemControlRequiredRule"] input', container),
        '${approved}', 'change');

      // then
      expect(bo.itemControl.requiredRule.condition.body).to.equal('${approved}');
    });

  });

});
