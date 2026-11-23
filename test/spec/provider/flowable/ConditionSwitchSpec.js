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


describe('flowable - the T / ⚡ switch of conditions', function() {

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  function bootstrap(diagramXML) {
    return bootstrapModeler(diagramXML, {
      modules: [
        coreModule, selectionModule, modelingModule,
        propertiesPanelModule, propertiesProviderModule
      ],
      moddleExtensions: { flowable: flowableModdlePackage }
    });
  }

  var bo;

  function select(id) {
    return inject(function(propertiesPanel, elementRegistry, selection) {
      var element = elementRegistry.get(id);

      propertiesPanel.attachTo(container);

      bo = element.businessObject;
      selection.select(element);
    });
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function switchTo(entryId, mode) {
    TestHelper.triggerEvent(domQuery('[data-mode="' + mode + '"]', getEntry(entryId)), 'click');
  }

  function pressed(entryId) {
    return domQuery('[aria-pressed="true"]', getEntry(entryId)).getAttribute('data-mode');
  }

  function isOff(node) {
    return domClasses(node).has('cpp-condition-off');
  }


  describe('reactivation condition', function() {

    var ID = 'itemControlReactivationActivateCondition';

    beforeEach(bootstrap(require('./ItemControlRule.cmmn')));

    beforeEach(select('PI_Task'));

    // the condition, or nothing when the rule went with its last condition
    function activateCondition() {
      var rule = ((bo.itemControl.extensionElements || {}).values || []).filter(function(value) {
        return value.$type === 'flowable:ReactivationRule';
      })[0];

      return rule && rule.get('activateCondition');
    }

    function check() {
      return domQuery('.cpp-condition-choice', getEntry(ID));
    }

    function expression() {
      return domQuery('.cpp-condition-expression', getEntry(ID));
    }


    it('should show a value as a check, under T', function() {

      // then
      expect(pressed(ID)).to.equal('fixed');
      expect(isOff(check())).to.be.false;
      expect(isOff(expression())).to.be.true;
      expect(domQuery('input[type=checkbox]', check()).checked).to.be.true;
    });


    it('should switch to an expression, which the check no longer sets', function() {

      // when
      switchTo(ID, 'expression');

      // then
      expect(pressed(ID)).to.equal('expression');
      expect(isOff(check())).to.be.true;
      expect(isOff(expression())).to.be.false;
      expect(activateCondition()).not.to.exist;

      // when
      TestHelper.triggerValue(domQuery('input[type=text]', expression()), '${reopen}', 'change');

      // then
      expect(activateCondition()).to.equal('${reopen}');
      expect(pressed(ID)).to.equal('expression');
    });


    it('should switch back to a check, without the expression', function() {

      // given
      switchTo(ID, 'expression');
      TestHelper.triggerValue(domQuery('input[type=text]', expression()), '${reopen}', 'change');

      // when
      switchTo(ID, 'fixed');

      // then
      expect(pressed(ID)).to.equal('fixed');
      expect(isOff(check())).to.be.false;
      expect(domQuery('input[type=checkbox]', check()).checked).to.be.false;
      expect(activateCondition()).not.to.exist;
    });


    it('should show an expression under ⚡', function() {

      // given
      TestHelper.triggerValue(domQuery('input[type=text]', expression()), '${reopen}', 'change');

      // then
      expect(pressed(ID)).to.equal('expression');
      expect(isOff(expression())).to.be.false;
    });


    it('should undo a switch that changed the condition', inject(function(commandStack) {

      // given
      switchTo(ID, 'expression');

      // when
      commandStack.undo();

      // then
      expect(activateCondition()).to.equal('true');
      expect(domQuery('input[type=checkbox]', check()).checked).to.be.true;
    }));

  });


  describe('rule', function() {

    var ID = 'itemControlRequiredRuleEnabled',
        CONDITION = 'itemControlRequiredRule';

    beforeEach(bootstrap(require('./RuleTrueFalse.cmmn')));

    beforeEach(select('PI_Required'));


    it('should show the rule as a check, without its condition', function() {

      // then
      expect(pressed(ID)).to.equal('fixed');
      expect(isOff(domQuery('.cpp-condition-choice', getEntry(ID)))).to.be.false;
      expect(isOff(getEntry(CONDITION))).to.be.true;
    });


    it('should switch to a condition, keeping the rule', function() {

      // when
      switchTo(ID, 'expression');

      // then
      expect(pressed(ID)).to.equal('expression');
      expect(isOff(domQuery('.cpp-condition-choice', getEntry(ID)))).to.be.true;
      expect(isOff(getEntry(CONDITION))).to.be.false;
      expect(bo.itemControl.requiredRule).to.exist;

      // when
      TestHelper.triggerValue(domQuery('input[type=text]', getEntry(CONDITION)), '${approved}', 'change');

      // then
      expect(bo.itemControl.requiredRule.condition.body).to.equal('${approved}');
    });


    it('should switch back to the check, without the condition', function() {

      // given
      switchTo(ID, 'expression');
      TestHelper.triggerValue(domQuery('input[type=text]', getEntry(CONDITION)), '${approved}', 'change');

      // when
      switchTo(ID, 'fixed');

      // then
      expect(pressed(ID)).to.equal('fixed');
      expect(bo.itemControl.requiredRule).to.exist;
      expect(bo.itemControl.requiredRule.condition).not.to.exist;
      expect(isOff(getEntry(CONDITION))).to.be.true;
      expect(domQuery('input[type=checkbox]', getEntry(ID)).checked).to.be.true;
    });


    it('should name the check after the rule in the read view', function() {

      // then
      var row = domQuery('[data-group="controlRules"] [data-group-summary] .cpp-summary-row', container);

      expect(domQuery('dt', row).textContent).to.equal('Required');
      expect(domQuery('dd', row).textContent).to.equal('True');
    });

  });

});
