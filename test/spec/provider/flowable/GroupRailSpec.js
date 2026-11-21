'use strict';

require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll,
    domClasses = require('min-dom').classes,
    domAttr = require('min-dom').attr,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - group rail', function() {

  var diagramXML = require('./Task.cmmn');

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

  /**
   * The ids of the groups shown in the rail, in order.
   */
  function shownGroups() {
    return Array.prototype.filter.call(
      domQueryAll('.cpp-properties-rail .cpp-properties-tab-link', container),
      function(link) {
        return !domClasses(link).has('cpp-hidden');
      }
    ).map(function(link) {
      return domAttr(domQuery('[data-tab-target]', link), 'data-tab-target');
    });
  }


  it('should give every group an icon', function() {

    // when
    select('PI_Human');

    // then
    var buttons = domQueryAll('.cpp-properties-rail [data-tab-target]', container);

    expect(buttons.length).to.equal(7);

    Array.prototype.forEach.call(buttons, function(button) {
      expect(domQuery('.cpp-properties-tab-icon svg', button), domAttr(button, 'data-tab-target')).to.exist;
    });
  });


  it('should show the groups of a human task', function() {

    // when
    select('PI_Human');

    // then
    expect(shownGroups()).to.eql([ 'general', 'rules', 'listener', 'definition' ]);
  });


  it('should show the groups of a process task', function() {

    // when
    select('PI_Process');

    // then
    expect(shownGroups()).to.eql([ 'general', 'rules', 'variables', 'listener', 'definition', 'extensions' ]);
  });


  it('should show the groups of the case plan model', function() {

    // when
    select('CasePlanModel_1');

    // then
    expect(shownGroups()).to.eql([ 'general', 'eventRegistry', 'listener' ]);
  });

});
