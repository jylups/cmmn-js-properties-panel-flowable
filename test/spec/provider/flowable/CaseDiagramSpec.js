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


describe('flowable - case diagram (nothing selected)', function() {

  var diagramXML = require('./CaseDiagram.cmmn');

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


  var caze, definitions;

  beforeEach(inject(function(canvas) {
    var diagram = canvas.getRootElement().businessObject;

    definitions = diagram.$parent.$parent;
    caze = definitions.get('cases')[0];
  }));


  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getInput(id) {
    return domQuery('[data-entry="' + id + '"] input', container);
  }

  function getText(id) {
    return domQuery('[data-entry="' + id + '"] [contenteditable]', container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }


  it('should show the case as Flowable Design\'s case diagram', function() {

    // then
    expect(domQuery('[data-tab-title]', container).textContent).to.equal('Case Diagram - General');
    expect(getInput('caseKey').value).to.equal('vetting');
    expect(getText('caseDiagramName').textContent).to.equal('Personnel Vetting');
    expect(getText('caseDiagramDocumentation').textContent).to.equal('Personnel Vetting Case Management');
    expect(getInput('caseCategory').value).to.equal('http://flowable.org/cmmn');
  });


  it('should not show the id, name and documentation of the drawing', function() {

    // then
    expect(isShown(getEntry('id'))).to.be.false;
    expect(isShown(getEntry('name'))).to.be.false;
    expect(isShown(getEntry('documentation'))).to.be.false;
  });


  it('should show the case\'s start settings', function() {

    // then
    expect(getInput('case-initiatorVariableName').value).to.equal('initiator');
    expect(getInput('case-candidateStarterGroups').value).to.equal('flowableUser');
  });


  it('should set and undo the model key, name, documentation and category', inject(function(commandStack) {

    // when
    TestHelper.triggerValue(getInput('caseKey'), 'vettingCase', 'change');
    TestHelper.triggerValue(getText('caseDiagramName'), 'Vetting', 'change');
    TestHelper.triggerValue(getText('caseDiagramDocumentation'), 'Vetting of personnel', 'change');
    TestHelper.triggerValue(getInput('caseCategory'), 'http://example.org/vetting', 'change');

    // then
    expect(caze.id).to.equal('vettingCase');
    expect(caze.name).to.equal('Vetting');
    expect(caze.get('documentation')[0].text).to.equal('Vetting of personnel');
    expect(definitions.targetNamespace).to.equal('http://example.org/vetting');

    // when
    commandStack.undo();
    commandStack.undo();
    commandStack.undo();
    commandStack.undo();

    // then
    expect(caze.id).to.equal('vetting');
    expect(caze.name).to.equal('Personnel Vetting');
    expect(caze.get('documentation')[0].text).to.equal('Personnel Vetting Case Management');
    expect(definitions.targetNamespace).to.equal('http://flowable.org/cmmn');
  }));


  it('should keep a category: the target namespace is required', function() {

    // when
    TestHelper.triggerValue(getInput('caseCategory'), '', 'change');

    // then
    expect(definitions.targetNamespace).to.equal('http://flowable.org/cmmn');
  });

});
