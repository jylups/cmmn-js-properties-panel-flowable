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


describe('flowable - lifecycle listeners', function() {

  var diagramXML = require('./LifecycleListener.cmmn');

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


  function select(id) {
    return inject(function(elementRegistry, selection) {
      selection.select(elementRegistry.get(id));
    })();
  }

  function getList(id) {
    return domQuery('select[id="flowable-extensionElements-' + id + '"]', container);
  }

  function selectListener(id, index) {
    var list = getList(id);

    list.selectedIndex = index;
    TestHelper.triggerEvent(list, 'change');
  }

  function getField(name) {
    return domQuery('[name="' + name + '"]', container);
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getGroup(id) {
    return domQuery('[data-tab="listener"] [data-group="' + id + '"]', container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function getListeners(bo, type) {
    var extensionElements = bo.get('extensionElements');

    return ((extensionElements && extensionElements.get('values')) || []).filter(function(value) {
      return value.$instanceOf(type);
    });
  }

  function undo() {
    inject(function(commandStack) {
      commandStack.undo();
    })();
  }


  describe('of a plan item', function() {

    var definition;

    beforeEach(inject(function(elementRegistry) {
      select('PI_Human');

      definition = elementRegistry.get('PI_Human').businessObject.definitionRef;
    }));


    it('should list the lifecycle listeners of the definition', function() {

      // then
      var list = getList('planItemLifecycleListeners');

      expect(isShown(getGroup('lifecycleListeners'))).to.be.true;
      expect(list.options.length).to.eql(1);
      expect(list.options[0].text).to.eql('* → active : Expression');

      expect(getList('caseLifecycleListeners')).not.to.exist;
    });


    it('should show the selected lifecycle listener', function() {

      // when
      selectListener('planItemLifecycleListeners', 0);

      // then
      expect(domQuery('[data-group="listenerDetails"] .group-label', container).textContent)
        .to.eql('Lifecycle Listener');

      expect(getField('planItemLifecycleListenerSourceState').value).to.eql('');
      expect(getField('planItemLifecycleListenerTargetState').value).to.eql('active');
      expect(getField('type').value).to.eql('expression');
      expect(getField('expression').value).to.eql('${listener.notify(planItemInstance)}');

      expect(isShown(getEntry('caseLifecycleListenerTargetState'))).to.be.false;
      expect(isShown(getEntry('taskListenerEventType'))).to.be.false;

      // and its fields
      expect(isShown(getGroup('listener-fields'))).to.be.true;
    });


    it('should change the target state', function() {

      // given
      selectListener('planItemLifecycleListeners', 0);

      var listener = getListeners(definition, 'flowable:PlanItemLifecycleListener')[0];

      // when
      TestHelper.triggerValue(getField('planItemLifecycleListenerTargetState'), 'completed', 'change');

      // then
      expect(listener.get('targetState')).to.eql('completed');
      expect(getList('planItemLifecycleListeners').options[0].text).to.eql('* → completed : Expression');

      // when
      undo();

      // then
      expect(listener.get('targetState')).to.eql('active');
    });


    it('should remove the source state', function() {

      // given
      selectListener('planItemLifecycleListeners', 0);

      var listener = getListeners(definition, 'flowable:PlanItemLifecycleListener')[0];

      TestHelper.triggerValue(getField('planItemLifecycleListenerSourceState'), 'available', 'change');

      expect(listener.get('sourceState')).to.eql('available');

      // when
      TestHelper.triggerValue(getField('planItemLifecycleListenerSourceState'), '', 'change');

      // then
      expect(listener.get('sourceState')).not.to.exist;
    });


    it('should add and remove a lifecycle listener', function() {

      // when
      TestHelper.triggerEvent(
        domQuery('[data-entry="planItemLifecycleListeners"] button[data-action="createElement"]', container),
        'click'
      );

      // then
      expect(getListeners(definition, 'flowable:PlanItemLifecycleListener')).to.have.length(2);
      expect(getListeners(definition, 'flowable:TaskListener')).to.have.length(1);

      // when
      selectListener('planItemLifecycleListeners', 1);

      TestHelper.triggerEvent(
        domQuery('[data-entry="planItemLifecycleListeners"] button[data-action="removeElement"]', container),
        'click'
      );

      // then
      expect(getListeners(definition, 'flowable:PlanItemLifecycleListener')).to.have.length(1);
    });


    it('should deselect a lifecycle listener when a task listener is selected', function() {

      // given
      selectListener('planItemLifecycleListeners', 0);

      // when
      selectListener('taskListeners', 0);

      // then
      expect(getList('planItemLifecycleListeners').selectedIndex).to.eql(-1);
      expect(domQuery('[data-group="listenerDetails"] .group-label', container).textContent)
        .to.eql('Task Listener');
      expect(isShown(getEntry('planItemLifecycleListenerTargetState'))).to.be.false;
    });


    it('should keep the lifecycle listener selected', function() {

      // when
      selectListener('planItemLifecycleListeners', 0);

      // then
      expect(getList('planItemLifecycleListeners').selectedIndex).to.eql(0);
    });

  });


  describe('of milestones and event listeners', function() {

    it('should list lifecycle listeners of a milestone', function() {

      // when
      select('PI_Milestone');

      // then
      expect(getList('planItemLifecycleListeners')).to.exist;
    });


    it('should list lifecycle listeners of an event listener', function() {

      // when
      select('PI_EventListener');

      // then
      expect(getList('planItemLifecycleListeners')).to.exist;
    });

  });


  describe('of a case', function() {

    var caseElement;

    beforeEach(inject(function(elementRegistry) {
      select('CasePlanModel_1');

      caseElement = elementRegistry.get('CasePlanModel_1').businessObject.$parent;
    }));


    it('should list the lifecycle listeners of the case', function() {

      // then
      var list = getList('caseLifecycleListeners');

      expect(list.options.length).to.eql(1);
      expect(list.options[0].text).to.eql('active → completed : Java Class');

      // the case plan model is a stage, with lifecycle listeners of its own
      expect(getList('planItemLifecycleListeners').options.length).to.eql(0);
    });


    it('should show the states of a case', function() {

      // when
      selectListener('caseLifecycleListeners', 0);

      // then
      var targetState = getField('caseLifecycleListenerTargetState');

      expect(targetState.value).to.eql('completed');
      expect(domQuery('option[value="closed"]', targetState)).to.exist;
      expect(domQuery('option[value="wait_repetition"]', targetState)).not.to.exist;

      expect(getField('class').value).to.eql('org.example.CaseListener');
    });


    it('should add a lifecycle listener to the case', inject(function(elementRegistry) {

      // when
      TestHelper.triggerEvent(
        domQuery('[data-entry="caseLifecycleListeners"] button[data-action="createElement"]', container),
        'click'
      );

      // then
      expect(getListeners(caseElement, 'flowable:CaseLifecycleListener')).to.have.length(2);
      expect(elementRegistry.get('CasePlanModel_1').businessObject.get('extensionElements')).not.to.exist;
    }));

  });

});
