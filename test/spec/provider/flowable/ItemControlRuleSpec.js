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


describe('flowable - item control rules', function() {

  var diagramXML = require('./ItemControlRule.cmmn');

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


  var item;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      var element = elementRegistry.get(id);

      selection.select(element);

      item = element.businessObject;
    })();
  }

  function getField(name) {
    return domQuery('[data-tab="rules"] [name="' + name + '"]', container);
  }

  function getEntry(id) {
    return domQuery('[data-tab="rules"] [data-entry="' + id + '"]', container);
  }

  function getGroup(id) {
    return domQuery('[data-tab="rules"] [data-group="' + id + '"]', container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function rules(control) {
    var extensionElements = control.get('extensionElements');

    return ((extensionElements && extensionElements.get('values')) || []).map(function(value) {
      return value.$type;
    });
  }

  function getRule(control, type) {
    return control.get('extensionElements').get('values').filter(function(value) {
      return value.$type === type;
    })[0];
  }

  function setValue(name, value) {
    TestHelper.triggerValue(getField(name), value, 'change');
  }

  function click(name) {
    TestHelper.triggerEvent(getField(name), 'click');
  }

  function undo() {
    inject(function(commandStack) {
      commandStack.undo();
    })();
  }


  describe('item control with rules', function() {

    beforeEach(function() {
      select('PI_Task');
    });


    it('should show the rules', function() {

      // then
      expect(getField('itemControlParentCompletionRule').value).to.eql('ignore');
      expect(getField('itemControlCompletionNeutral').checked).to.be.true;
      expect(getField('itemControlCompletionNeutralCondition').value)
        .to.eql('${vars:getOrDefault(\'neutral\', false)}');
      expect(getField('itemControlReactivationActivateCondition').value).to.eql('true');
      expect(getField('itemControlReactivationIgnoreCondition').value).to.eql('');
    });


    it('should change the parent completion type', function() {

      // given
      var rule = getRule(item.itemControl, 'flowable:ParentCompletionRule');

      // when
      setValue('itemControlParentCompletionRule', 'ignoreAfterFirstCompletion');

      // then
      expect(rule.get('type')).to.eql('ignoreAfterFirstCompletion');

      // when
      undo();

      // then
      expect(rule.get('type')).to.eql('ignore');
    });


    it('should remove the parent completion rule', function() {

      // when
      setValue('itemControlParentCompletionRule', '');

      // then
      expect(rules(item.itemControl)).to.eql([ 'flowable:CompletionNeutralRule', 'flowable:ReactivationRule' ]);

      // when
      undo();

      // then
      expect(rules(item.itemControl)).to.eql([
        'flowable:ParentCompletionRule', 'flowable:CompletionNeutralRule', 'flowable:ReactivationRule'
      ]);
    });


    it('should change and remove the completion neutral condition', function() {

      // given
      var rule = getRule(item.itemControl, 'flowable:CompletionNeutralRule');

      // when
      TestHelper.triggerValue(getField('itemControlCompletionNeutralCondition'), '${neutral}', 'change');

      // then
      expect(rule.get('condition').get('body')).to.eql('${neutral}');

      // when
      TestHelper.triggerValue(getField('itemControlCompletionNeutralCondition'), '', 'change');

      // then
      expect(rule.get('condition')).not.to.exist;
    });


    it('should remove the completion neutral rule', function() {

      // when
      click('itemControlCompletionNeutral');

      // then
      expect(rules(item.itemControl)).not.to.include('flowable:CompletionNeutralRule');
      expect(isShown(getEntry('itemControlCompletionNeutralCondition'))).to.be.false;
    });


    it('should remove the reactivation rule with its last condition', function() {

      // given
      var rule = getRule(item.itemControl, 'flowable:ReactivationRule');

      TestHelper.triggerValue(getField('itemControlReactivationIgnoreCondition'), '${ignore}', 'change');

      expect(rule.get('ignoreCondition')).to.eql('${ignore}');

      // when
      TestHelper.triggerValue(getField('itemControlReactivationActivateCondition'), '', 'change');

      // then
      expect(rule.get('activateCondition')).not.to.exist;
      expect(rules(item.itemControl)).to.include('flowable:ReactivationRule');

      // when
      TestHelper.triggerValue(getField('itemControlReactivationIgnoreCondition'), '', 'change');

      // then
      expect(rules(item.itemControl)).not.to.include('flowable:ReactivationRule');
    });

  });


  describe('empty item control', function() {

    beforeEach(function() {
      select('PI_Empty');
    });


    it('should add a parent completion rule', function() {

      // when
      setValue('itemControlParentCompletionRule', 'ignoreIfAvailable');

      // then
      expect(rules(item.itemControl)).to.eql([ 'flowable:ParentCompletionRule' ]);
      expect(getRule(item.itemControl, 'flowable:ParentCompletionRule').get('type')).to.eql('ignoreIfAvailable');

      // when
      undo();

      // then
      expect(item.itemControl.get('extensionElements')).not.to.exist;
    });


    it('should add a completion neutral rule with a condition', function() {

      // when
      click('itemControlCompletionNeutral');

      // then
      expect(rules(item.itemControl)).to.eql([ 'flowable:CompletionNeutralRule' ]);
      expect(isShown(getEntry('itemControlCompletionNeutralCondition'))).to.be.true;

      // when
      TestHelper.triggerValue(getField('itemControlCompletionNeutralCondition'), '${neutral}', 'change');

      // then
      var condition = getRule(item.itemControl, 'flowable:CompletionNeutralRule').get('condition');

      expect(condition.$type).to.eql('cmmn:Expression');
      expect(condition.get('body')).to.eql('${neutral}');
    });


    it('should add a reactivation rule', function() {

      // when
      TestHelper.triggerValue(getField('itemControlReactivationDefaultCondition'), 'true', 'change');

      // then
      expect(getRule(item.itemControl, 'flowable:ReactivationRule').get('defaultCondition')).to.eql('true');
    });

  });


  it('should not offer rules without an item control', function() {

    // when
    select('PI_NoControl');

    // then
    expect(isShown(getEntry('itemControlParentCompletionRule'))).to.be.true;
    expect(isShown(getField('itemControlParentCompletionRule'))).to.be.false;
  });


  it('should show the rules of the default control', function() {

    // when
    select('PI_Default');

    // then
    expect(getField('defaultControlCompletionNeutral').checked).to.be.true;
    expect(getField('itemControlCompletionNeutral')).to.exist;
  });


  describe('reactivation event listener', function() {

    it('should show the default reactivation rule', function() {

      // when
      select('PI_Reactivate');

      // then
      expect(isShown(getGroup('defaultReactivationRule'))).to.be.true;
      expect(getField('defaultReactivationIgnoreCondition').value).to.eql('true');
    });


    it('should not be a reactivation rule of the item control', function() {

      // when
      select('PI_Reactivate');

      // then
      expect(getField('itemControlReactivationIgnoreCondition')).not.to.exist;
    });


    it('should change the default reactivation rule', function() {

      // given
      select('PI_Reactivate');

      var definition = item.definitionRef;

      // when
      TestHelper.triggerValue(getField('defaultReactivationActivateCondition'), '${activate}', 'change');

      // then
      var rule = getRule(definition, 'flowable:DefaultReactivationRule');

      expect(rule.get('activateCondition')).to.eql('${activate}');
      expect(rule.get('ignoreCondition')).to.eql('true');
    });


    it('should not show for another event listener', function() {

      // when
      select('PI_Listener');

      // then
      expect(isShown(getGroup('defaultReactivationRule'))).to.be.false;
    });

  });

});
