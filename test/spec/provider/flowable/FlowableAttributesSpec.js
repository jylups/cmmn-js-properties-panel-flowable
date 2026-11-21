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


describe('flowable - stage, milestone, repetition rule and criterion attributes', function() {

  var diagramXML = require('./FlowableAttributes.cmmn');

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


  function select(id) {
    return inject(function(elementRegistry, selection) {
      selection.select(elementRegistry.get(id));
    })();
  }

  function getBusinessObject(id) {
    var bo;

    inject(function(elementRegistry) {
      bo = elementRegistry.get(id).businessObject;
    })();

    return bo;
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getField(entryId) {
    var entry = getEntry(entryId);

    return entry && domQuery('input, select', entry);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function isInvalid(field) {
    return domClasses(field).has('invalid');
  }

  function getValue(entryId) {
    return getField(entryId).value;
  }


  describe('stage and milestone', function() {

    it('should show the overview of a stage', function() {

      // when
      select('PI_Stage');

      // then
      expect(getValue('stageOverview-includeInStageOverview')).to.eql('false');
      expect(getValue('stageOverview-displayOrder')).to.eql('20');
      expect(getValue('stageOverview-businessStatus')).to.eql('inReview');
      expect(getValue('stage-autoCompleteCondition')).to.eql('');
      expect(getEntry('milestone-milestoneVariable')).not.to.exist;
    });


    it('should set the overview of a stage', inject(function(commandStack) {

      // given
      select('PI_Stage');

      var stage = getBusinessObject('PI_Stage').definitionRef;

      // when
      TestHelper.triggerValue(getField('stageOverview-includeInStageOverview'), '${showReview}', 'change');
      TestHelper.triggerValue(getField('stageOverview-displayOrder'), '30', 'change');
      TestHelper.triggerValue(getField('stageOverview-businessStatus'), '', 'change');
      TestHelper.triggerValue(getField('stage-autoCompleteCondition'), '${reviewDone}', 'change');

      // then
      expect(stage.get('flowable:includeInStageOverview')).to.eql('${showReview}');
      expect(stage.get('flowable:displayOrder')).to.eql('30');
      expect(stage.get('flowable:businessStatus')).not.to.exist;
      expect(stage.get('flowable:autoCompleteCondition')).to.eql('${reviewDone}');

      // when
      commandStack.undo();
      commandStack.undo();

      // then
      expect(stage.get('flowable:businessStatus')).to.eql('inReview');
      expect(stage.get('flowable:autoCompleteCondition')).not.to.exist;
    }));


    it('should mark a display order that is not a number', function() {

      // given
      select('PI_Stage');

      var field = getField('stageOverview-displayOrder');

      // when
      TestHelper.triggerValue(field, 'first', 'change');

      // then
      expect(isInvalid(field)).to.be.true;

      // when
      TestHelper.triggerValue(field, '-1', 'change');

      // then
      expect(isInvalid(field)).to.be.false;
    });


    it('should show the overview and variable of a milestone', function() {

      // when
      select('PI_Milestone');

      // then
      expect(getValue('stageOverview-includeInStageOverview')).to.eql('');
      expect(getValue('milestone-milestoneVariable')).to.eql('approved');
      expect(getEntry('stage-autoCompleteCondition')).not.to.exist;
    });


    it('should set the milestone variable', function() {

      // given
      select('PI_Milestone');

      var milestone = getBusinessObject('PI_Milestone').definitionRef;

      // when
      TestHelper.triggerValue(getField('milestone-milestoneVariable'), 'isApproved', 'change');

      // then
      expect(milestone.get('flowable:milestoneVariable')).to.eql('isApproved');
    });


    it('should show the stage attributes of the case plan model', function() {

      // when
      select('CasePlanModel_1');

      // then
      expect(getValue('stage-autoCompleteCondition')).to.eql('${planDone}');
      expect(getEntry('stageOverview-includeInStageOverview')).to.exist;
      expect(getEntry('stageOverview-displayOrder')).to.exist;
      expect(getEntry('stageOverview-businessStatus')).to.exist;
    });


    it('should not show them for a task', function() {

      // when
      select('PI_Plain');

      // then
      expect(getEntry('stageOverview-displayOrder')).not.to.exist;
      expect(getEntry('stage-autoCompleteCondition')).not.to.exist;
    });

  });


  describe('repetition rule', function() {

    it('should show the repetition rule of the item control', function() {

      // when
      select('PI_Stage');

      // then
      expect(getValue('itemControl-repetition-counterVariable')).to.eql('count');
      expect(getValue('itemControl-repetition-maxInstanceCount')).to.eql('unlimited');
      expect(getValue('itemControl-repetition-collectionVariable')).to.eql('${orders}');
      expect(getValue('itemControl-repetition-elementVariable')).to.eql('order');
      expect(getValue('itemControl-repetition-elementIndexVariable')).to.eql('orderIndex');
      expect(getField('itemControl-repetition-ignoreCounterVariable').checked).to.be.true;
    });


    it('should set the repetition rule of the item control', function() {

      // given
      select('PI_Stage');

      var rule = getBusinessObject('PI_Stage').itemControl.repetitionRule;

      // when
      TestHelper.triggerValue(getField('itemControl-repetition-collectionVariable'), '${items}', 'change');
      TestHelper.triggerValue(getField('itemControl-repetition-elementVariable'), '', 'change');
      TestHelper.triggerEvent(getField('itemControl-repetition-ignoreCounterVariable'), 'click');

      // then
      expect(rule.get('flowable:collectionVariable')).to.eql('${items}');
      expect(rule.get('flowable:elementVariable')).not.to.exist;
      expect(rule.get('flowable:ignoreCounterVariable')).not.to.exist;
    });


    it('should mark a max instance count Flowable does not accept', function() {

      // given
      select('PI_Stage');

      var rule = getBusinessObject('PI_Stage').itemControl.repetitionRule,
          field = getField('itemControl-repetition-maxInstanceCount');

      // when
      TestHelper.triggerValue(field, '0', 'change');

      // then
      expect(isInvalid(field)).to.be.true;

      // when
      TestHelper.triggerValue(field, '3', 'change');

      // then
      expect(isInvalid(field)).to.be.false;
      expect(rule.get('flowable:maxInstanceCount')).to.eql('3');
    });


    it('should set the repetition rule of the default control', function() {

      // given
      select('PI_Task');

      var rule = getBusinessObject('PI_Task').definitionRef.defaultControl.repetitionRule;

      // then
      expect(getValue('defaultControl-repetition-collectionVariable')).to.eql('items');

      // when
      TestHelper.triggerValue(getField('defaultControl-repetition-elementVariable'), 'item', 'change');

      // then
      expect(rule.get('flowable:elementVariable')).to.eql('item');
    });


    it('should hide the fields without a repetition rule', function() {

      // when
      select('PI_Task');

      // then
      expect(isShown(getEntry('itemControl-repetition-collectionVariable'))).to.be.false;
      expect(isShown(getEntry('defaultControl-repetition-collectionVariable'))).to.be.true;
    });

  });


  describe('sentry and exit criterion', function() {

    it('should show and set the trigger mode of the sentry', inject(function(commandStack) {

      // given
      select('EntryCriterion_Task');

      var sentry = getBusinessObject('EntryCriterion_Task').sentryRef,
          field = getField('sentry-triggerMode');

      // then
      expect(field.value).to.eql('onEvent');
      expect(getEntry('exitCriterion-exitType')).not.to.exist;

      // when
      TestHelper.triggerValue(field, '', 'change');

      // then
      expect(sentry.get('flowable:triggerMode')).not.to.exist;

      // when
      commandStack.undo();

      // then
      expect(sentry.get('flowable:triggerMode')).to.eql('onEvent');
    }));


    it('should show the exit event type and exit type on a stage', function() {

      // when
      select('ExitCriterion_Stage');

      // then
      expect(getField('exitCriterion-exitEventType').value).to.eql('complete');
      expect(getField('exitCriterion-exitType').value).to.eql('activeInstances');
    });


    it('should set the exit type on a task', function() {

      // given
      select('ExitCriterion_Task');

      var criterion = getBusinessObject('ExitCriterion_Task');

      // when
      TestHelper.triggerValue(getField('exitCriterion-exitType'), 'activeAndEnabledInstances', 'change');

      // then
      expect(criterion.get('flowable:exitType')).to.eql('activeAndEnabledInstances');
      expect(getEntry('exitCriterion-exitEventType')).not.to.exist;
    });


    it('should only show the exit event type on the case plan model', function() {

      // given
      select('ExitCriterion_Plan');

      var criterion = getBusinessObject('ExitCriterion_Plan');

      // when
      TestHelper.triggerValue(getField('exitCriterion-exitEventType'), 'forceComplete', 'change');

      // then
      expect(criterion.get('flowable:exitEventType')).to.eql('forceComplete');
      expect(getEntry('exitCriterion-exitType')).not.to.exist;
    });

  });

});
