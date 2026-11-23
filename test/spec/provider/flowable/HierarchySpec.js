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


describe('flowable - model hierarchy', function() {

  var diagramXML = require('./Task.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule, selectionModule, modelingModule,
      propertiesPanelModule,
      propertiesProviderModule
    ],
    moddleExtensions: { flowable: flowableModdlePackage }
  }));

  beforeEach(inject(function(propertiesPanel, elementRegistry, selection) {
    propertiesPanel.attachTo(container);

    selection.select(elementRegistry.get('PI_Human'));
  }));


  function items() {
    return Array.prototype.map.call(domQueryAll('.cpp-hierarchy-item', container), function(item) {
      return domQuery('.cpp-hierarchy-label', item).textContent + ' (' +
        domQuery('.cpp-hierarchy-type', item).textContent + ')';
    });
  }

  function item(id) {
    return domQuery('[data-hierarchy-element="' + id + '"]', container);
  }

  function activeTab() {
    return domQuery('.cpp-properties-tab.cpp-active', container).getAttribute('data-tab');
  }


  it('should open from the rail', function() {

    // when
    TestHelper.triggerEvent(domQuery('[data-tab-target="cpp-hierarchy"]', container), 'click');

    // then
    expect(activeTab()).to.equal('cpp-hierarchy');
  });


  it('should show the case plan model and its plan items', inject(function(propertiesPanel) {

    // when
    propertiesPanel.openHierarchy();

    // then
    var shown = items();

    expect(shown[0]).to.equal('A CasePlanModel (Case Plan Model)');
    expect(shown).to.include('Human (Human Task)');
    expect(shown).to.include('Process (Process Task)');

    // plan items are one level below the case plan model
    expect(domQuery('[role=treeitem] [role=group] [data-hierarchy-element="PI_Human"]', container)).to.exist;
  }));


  it('should mark the selected element', inject(function(propertiesPanel) {

    // when
    propertiesPanel.openHierarchy();

    // then
    expect(domQueryAll('.cpp-hierarchy-item.cpp-selected', container)).to.have.length(1);
    expect(item('PI_Human').classList.contains('cpp-selected')).to.be.true;
  }));


  it('should select an element on click and stay open', inject(function(propertiesPanel, selection) {

    // given
    propertiesPanel.openHierarchy();

    // when
    TestHelper.triggerEvent(item('PI_Process'), 'click');

    // then
    expect(selection.get().map(function(e) { return e.id; })).to.eql([ 'PI_Process' ]);
    expect(activeTab()).to.equal('cpp-hierarchy');
    expect(item('PI_Process').classList.contains('cpp-selected')).to.be.true;
  }));


  it('should show changes to other elements', inject(function(propertiesPanel, modeling, elementRegistry) {

    // given
    propertiesPanel.openHierarchy();

    // when
    modeling.updateProperties(elementRegistry.get('PI_Process'), { name: 'Order' });

    // then
    expect(items()).to.include('Order (Process Task)');
  }));


  it('should not be one of the groups for the arrow keys', inject(function(propertiesPanel) {

    // given
    propertiesPanel.activateTab('general');

    var event = document.createEvent('Event');
    event.initEvent('keydown', true, true);
    event.key = 'ArrowUp';

    // when
    domQuery('[data-tab-target="general"]', container).dispatchEvent(event);

    // then
    expect(activeTab()).not.to.equal('cpp-hierarchy');
  }));



  describe('as Flowable Design', function() {

    function treeItem(id) {
      return item(id).parentNode.parentNode;
    }

    beforeEach(inject(function(propertiesPanel) {
      propertiesPanel.openHierarchy();
    }));


    function icon(id) {
      return domQuery('.cpp-hierarchy-icon', item(id)).firstChild;
    }


    it('should show an icon for each type', function() {

      // then
      expect(icon('PI_Human')).to.exist;
      expect(icon('CasePlanModel_1')).to.exist;
      expect(item('PI_Human').title).to.contain('Human Task');
    });


    it('should show the palette\'s icons of CMMN types', function() {

      // then
      expect(icon('CasePlanModel_1').classList.contains('cmmn-icon-case-plan-model')).to.be.true;
      expect(icon('PI_Human').classList.contains('cmmn-icon-human-blocking-task')).to.be.true;
      expect(icon('PI_Process').classList.contains('cmmn-icon-process-task')).to.be.true;
      expect(icon('PI_Decision').classList.contains('cmmn-icon-decision-task')).to.be.true;
      expect(icon('PI_Plain').classList.contains('cmmn-icon-task')).to.be.true;
    });


    it('should show the canvas\'s line icons and the palette\'s names of Flowable task types', function() {

      // then
      expect(icon('PI_Java').tagName.toLowerCase()).to.equal('svg');
      expect(domQuery('rect', icon('PI_Java'))).to.exist;
      expect(items()).to.include('Java (Service Task)');
      expect(items()).to.include('Case Page (Case Page)');
      expect(items()).to.include('Plain (Task)');
    });


    it('should show Flowable event listener types', inject(function(propertiesPanel, elementFactory, modeling, elementRegistry) {

      // given
      var shape = elementFactory.createPlanItemShape('cmmn:EventListener');

      shape.businessObject.definitionRef.set('flowable:eventType', 'variable');

      // when
      var listener = modeling.createShape(shape, { x: 500, y: 400 }, elementRegistry.get('CasePlanModel_1'));

      propertiesPanel.openHierarchy();

      // then
      expect(domQuery('circle', icon(listener.id))).to.exist;
      expect(domQuery('.cpp-hierarchy-type', item(listener.id)).textContent).to.equal('Variable Event Listener');
    }));


    it('should collapse and expand a branch', function() {

      // given
      var plan = treeItem('CasePlanModel_1'),
          toggle = domQuery('[data-hierarchy-toggle="CasePlanModel_1"]', container);

      expect(plan.getAttribute('aria-expanded')).to.equal('true');

      // when
      TestHelper.triggerEvent(toggle, 'click');

      // then
      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('false');

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-toggle="CasePlanModel_1"]', container), 'click');

      // then
      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('true');
    });


    it('should collapse and expand all', function() {

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-all="collapse"]', container), 'click');

      // then
      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('false');

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-all="expand"]', container), 'click');

      // then
      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('true');
    });


    it('should open the branch of a newly selected element', inject(function(propertiesPanel, selection, elementRegistry) {

      // given
      propertiesPanel.collapseHierarchy(true);

      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('false');

      // when
      selection.select(elementRegistry.get('PI_Async'));

      // then
      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('true');
    }));


    it('should close and open a branch with the arrow keys', function() {

      // given
      var plan = item('CasePlanModel_1');

      // when
      plan.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      // then
      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('false');

      // when
      item('CasePlanModel_1').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      // then
      expect(treeItem('CasePlanModel_1').getAttribute('aria-expanded')).to.equal('true');
    });

  });

});
