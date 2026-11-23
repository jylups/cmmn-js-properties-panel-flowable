'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll,
    domClasses = require('min-dom').classes,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - event registry and event listeners', function() {

  var diagramXML = require('./EventRegistry.cmmn');

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


  var bo;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      var element = elementRegistry.get(id);

      selection.select(element);

      bo = element.businessObject;
    })();
  }

  function getField(name) {
    return domQuery('[name="' + name + '"]', container);
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getList(id) {
    return domQuery('select[id="flowable-extensionElements-' + id + '"]', container);
  }

  function getTabLink(id) {
    return domQuery('[data-tab-target="' + id + '"]', container).parentNode;
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function selectItem(listId, index) {
    var list = getList(listId);

    list.selectedIndex = index;
    TestHelper.triggerEvent(list, 'change');
  }

  function extensions(element, type) {
    var extensionElements = element.get('extensionElements');

    return ((extensionElements && extensionElements.get('values')) || []).filter(function(value) {
      return value.$type === type;
    });
  }

  function change(name, value) {
    TestHelper.triggerValue(getField(name), value, 'change');
  }

  function undo() {
    inject(function(commandStack) {
      commandStack.undo();
    })();
  }


  describe('event listener attributes', function() {

    it('should show a variable event listener', function() {

      // when
      select('PI_Variable');

      // then
      expect(getField('eventListenerType').value).to.eql('variable');
      expect(getField('eventListenerVariableName').value).to.eql('approved');
      expect(getField('eventListenerVariableChangeType').value).to.eql('update');
      expect(getField('eventListenerAvailableCondition').value).to.eql('${listening}');
      expect(isShown(getEntry('eventListenerSignalRef'))).to.be.false;
    });


    it('should change the kind of event listener', function() {

      // given
      select('PI_Variable');

      var definition = bo.definitionRef;

      // when
      change('eventListenerType', 'signal');

      // then
      expect(definition.get('flowable:eventType')).to.eql('signal');
      expect(definition.get('flowable:variableName')).not.to.exist;
      expect(definition.get('flowable:variableChangeType')).not.to.exist;
      expect(definition.get('flowable:availableCondition')).to.eql('${listening}');
      expect(isShown(getEntry('eventListenerSignalRef'))).to.be.true;

      // when
      undo();

      // then
      expect(definition.get('flowable:eventType')).to.eql('variable');
      expect(definition.get('flowable:variableName')).to.eql('approved');
    });


    it('should show a signal event listener', function() {

      // when
      select('PI_Signal');

      // then
      expect(getField('eventListenerSignalRef').value).to.eql('orderCancelled');
    });


    it('should show the available condition of a user event listener', function() {

      // when
      select('PI_User');

      // then
      expect(getField('eventListenerAvailableCondition').value).to.eql('${allowed}');
      expect(getEntry('eventListenerType')).not.to.exist;
    });


    it('should not offer the event registry for a variable event listener', function() {

      // when
      select('PI_Variable');

      // then
      expect(isShown(getTabLink('eventRegistry'))).to.be.false;
    });

  });


  describe('event listener of the event registry', function() {

    beforeEach(function() {
      select('PI_Registry');
    });


    it('should show the event and its correlation', function() {

      // then
      expect(getField('eventListenerType').value).to.eql('');
      expect(isShown(getTabLink('eventRegistry'))).to.be.true;
      expect(getField('eventRegistryEventType').value).to.eql('paymentReceived');
      expect(getList('eventCorrelationParameters').options[0].text).to.eql('orderId = ${orderId}');
      expect(getField('eventRegistryStartCorrelation')).not.to.exist;
    });


    it('should edit a correlation parameter', function() {

      // given
      var parameter = extensions(bo.definitionRef, 'flowable:EventCorrelationParameter')[0];

      selectItem('eventCorrelationParameters', 0);

      expect(getField('eventCorrelationParameters-name').value).to.eql('orderId');

      // when
      TestHelper.triggerValue(getField('eventCorrelationParameters-value'), '${order.id}', 'change');

      // then
      expect(parameter.get('value')).to.eql('${order.id}');
    });


    it('should show the correlation parameters as a Name / Value table with a delete button per row (#104)', function() {

      // given
      var table = domQuery('[data-group="eventRegistryCorrelation"] [data-group-summary] .cpp-summary-table', container);

      // then
      expect(Array.prototype.map.call(domQueryAll('th', table), function(th) {
        return th.textContent;
      })).to.eql([ 'Name', 'Value' ]);

      expect(Array.prototype.map.call(domQueryAll('tbody td', table), function(td) {
        return td.textContent;
      })).to.eql([ 'orderId', '${orderId}' ]);

      expect(getList('eventCorrelationParameters').hasAttribute('data-row-delete')).to.be.true;
      expect(getEntry('eventCorrelationParameters').querySelector('[data-action="moveUp"]')).to.exist;
    });


    it('should add an out parameter', function() {

      // when
      TestHelper.triggerEvent(
        domQuery('[data-entry="eventOutParameters"] button[data-action="createElement"]', container),
        'click'
      );

      // then
      expect(extensions(bo.definitionRef, 'flowable:EventOutParameter')).to.have.length(1);
    });


    it('should change the event key', function() {

      // given
      var definition = bo.definitionRef;

      // when
      change('eventRegistryEventType', 'paymentFailed');

      // then
      expect(extensions(definition, 'flowable:EventType')[0].get('body')).to.eql('paymentFailed');

      // when
      change('eventRegistryEventType', '');

      // then
      expect(extensions(definition, 'flowable:EventType')).to.be.empty;
    });

  });


  describe('case started by an event', function() {

    beforeEach(function() {
      select('CasePlanModel_1');
    });


    it('should show the event of the case', function() {

      // then
      expect(getField('eventRegistryEventType').value).to.eql('orderReceived');
      expect(getField('eventRegistryStartCorrelation').value).to.eql('storeAsUniqueReferenceId');
      expect(getList('eventOutParameters').options[0].text).to.eql('customer → customerName');
    });


    it('should show the transient flag of an out parameter', function() {

      // when
      selectItem('eventOutParameters', 0);

      // then
      expect(getField('eventOutParameters-transient').checked).to.be.true;
    });


    it('should remove the start correlation', function() {

      // when
      change('eventRegistryStartCorrelation', '');

      // then
      expect(extensions(bo.$parent, 'flowable:StartEventCorrelationConfiguration')).to.be.empty;

      // when
      undo();

      // then
      expect(extensions(bo.$parent, 'flowable:StartEventCorrelationConfiguration')).to.have.length(1);
    });

  });


  describe('send event task', function() {

    beforeEach(function() {
      select('PI_Send');
    });


    it('should show the event, channel and in parameters', function() {

      // then
      expect(getField('eventRegistryEventType').value).to.eql('orderShipped');
      expect(getField('eventRegistryChannelKey').value).to.eql('orderChannel');
      expect(getField('eventRegistrySystemChannel').checked).to.be.false;
      expect(getList('eventInParameters').options[0].text).to.eql('${orderId} → orderId');
      expect(getList('eventCorrelationParameters')).not.to.exist;
    });


    it('should send on the system channel', function() {

      // when
      TestHelper.triggerEvent(getField('eventRegistrySystemChannel'), 'click');

      // then
      expect(extensions(bo.definitionRef, 'flowable:SystemChannel')).to.have.length(1);

      // when
      TestHelper.triggerEvent(getField('eventRegistrySystemChannel'), 'click');

      // then
      expect(extensions(bo.definitionRef, 'flowable:SystemChannel')).to.be.empty;
    });

  });


  it('should not offer the event registry for another task', function() {

    // when
    select('PI_Plain');

    // then
    expect(isShown(getTabLink('eventRegistry'))).to.be.false;
  });

});
