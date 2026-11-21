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


describe('flowable - property search', function() {

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

    select('PI_Human');
  }));


  function select(id) {
    return inject(function(elementRegistry, selection) {
      selection.select(elementRegistry.get(id));
    })();
  }

  function searchInput() {
    return domQuery('[data-search-input]', container);
  }

  function activeTab() {
    return domQuery('.cpp-properties-tab.cpp-active', container).getAttribute('data-tab');
  }

  function shownResults() {
    return Array.prototype.map.call(domQueryAll('.cpp-search-result', container), function(result) {
      return domQuery('dt', result).textContent;
    });
  }

  function keydown(node, key) {
    var event = document.createEvent('Event');
    event.initEvent('keydown', true, true);
    event.key = key;
    node.dispatchEvent(event);
  }


  it('should open from the link in the header', function() {

    // when
    TestHelper.triggerEvent(domQuery('[data-search-link]', container), 'click');

    // then
    expect(activeTab()).to.equal('cpp-search');
    expect(document.activeElement).to.equal(searchInput());
    expect(domQuery('[data-tab-title]', container).textContent).to.equal('Search Property');
  });


  it('should open from the rail', function() {

    // when
    TestHelper.triggerEvent(domQuery('.cpp-properties-rail-tools [data-tab-target]', container), 'click');

    // then
    expect(activeTab()).to.equal('cpp-search');
  });


  it('should not be one of the groups for the arrow keys', inject(function(propertiesPanel) {

    // given
    propertiesPanel.activateTab('general');

    // when
    keydown(domQuery('[data-tab-target="general"]', container), 'ArrowUp');

    // then
    expect(activeTab()).not.to.equal('cpp-search');
  }));


  it('should find fields by their label, with their group and value', inject(function(propertiesPanel) {

    // when
    var results = propertiesPanel.search('name');

    // then
    expect(results).to.deep.include({
      label: 'Name', value: 'Human', tabLabel: 'General', groupLabel: 'Common'
    });
  }));


  it('should ignore case and find the field in any group', inject(function(propertiesPanel) {

    // when
    var results = propertiesPanel.search('CANDIDATE');

    // then
    expect(results.map(function(r) { return r.label; })).to.eql([ 'Candidate Users', 'Candidate Groups' ]);
    expect(results[0].tabLabel).to.equal('Assignment');
  }));


  it('should search as you type', inject(function(propertiesPanel) {

    // given
    propertiesPanel.openSearch();

    // when
    TestHelper.triggerValue(searchInput(), 'async', 'input');

    // then
    expect(shownResults()).to.include('Asynchronous');
  }));


  it('should say when nothing matches', inject(function(propertiesPanel) {

    // given
    propertiesPanel.openSearch();

    // when
    TestHelper.triggerValue(searchInput(), 'no such field', 'input');

    // then
    expect(shownResults()).to.be.empty;
    expect(domQuery('.cpp-search-hint', container).textContent).to.contain('No property matches');
  }));


  it('should clear on Escape', inject(function(propertiesPanel) {

    // given
    propertiesPanel.openSearch();
    TestHelper.triggerValue(searchInput(), 'name', 'input');

    // when
    keydown(searchInput(), 'Escape');

    // then
    expect(searchInput().value).to.equal('');
    expect(shownResults()).to.be.empty;
  }));


  it('should keep the search when another element is selected', inject(function(propertiesPanel) {

    // given
    propertiesPanel.openSearch();
    TestHelper.triggerValue(searchInput(), 'name', 'input');

    // when
    select('PI_Process');

    // then
    expect(activeTab()).to.equal('cpp-search');
    expect(searchInput().value).to.equal('name');
    expect(shownResults()).to.include('Name');
  }));


  describe('opening a result', function() {

    it('should edit the field in its group\'s pop-up', inject(function(propertiesPanel) {

      // given
      propertiesPanel.openSearch();
      propertiesPanel.search('candidate groups');

      // when
      TestHelper.triggerEvent(domQuery('[data-search-open="0"]', container), 'click');

      // then
      expect(propertiesPanel.getEditedGroup()).to.equal('assignment');
      expect(document.activeElement.getAttribute('name')).to.equal('candidateGroups');
    }));


    it('should go back to the results when the pop-up closes', inject(function(propertiesPanel) {

      // given
      propertiesPanel.openSearch();
      propertiesPanel.search('candidate groups');
      propertiesPanel.openSearchResult(0);

      // when
      propertiesPanel.closeGroup(true);

      // then
      expect(activeTab()).to.equal('cpp-search');
    }));


    it('should open the first result on Enter', inject(function(propertiesPanel) {

      // given
      propertiesPanel.openSearch();
      TestHelper.triggerValue(searchInput(), 'priority', 'input');

      // when
      keydown(searchInput(), 'Enter');

      // then
      expect(propertiesPanel.getEditedGroup()).to.equal('common');
    }));


    it('should go to a field of a group edited in place', inject(function(propertiesPanel) {

      // given
      propertiesPanel.openSearch();

      var results = propertiesPanel.search('task listener');

      expect(results.length).to.be.above(0);

      // when
      propertiesPanel.openSearchResult(0);

      // then
      expect(propertiesPanel.getEditedGroup()).to.be.null;
      expect(activeTab()).to.equal('listener');
      expect(domClasses(document.activeElement.parentNode).has('cpp-hidden')).to.be.false;
    }));

  });

});
