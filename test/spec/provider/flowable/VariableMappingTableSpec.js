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


describe('flowable - variable mappings in the read view', function() {

  var diagramXML = require('./VariableMappingTable.cmmn');

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
    });
  }

  function getSummary() {
    return domQuery('[data-group="variables"] [data-group-summary]', container);
  }

  function getTableRow(label) {
    return Array.prototype.filter.call(domQueryAll('.cpp-summary-table-row', getSummary()), function(row) {
      return domQuery('dt', row).textContent === label;
    })[0];
  }

  function cells(row) {
    return Array.prototype.map.call(domQueryAll('tbody tr', row), function(tr) {
      return Array.prototype.map.call(domQueryAll('td', tr), function(td) {
        return td.textContent;
      });
    });
  }

  // the stylesheet hides the extra rows of a table that isn't expanded
  function isShown(row, tableRow) {
    return !domClasses(row).has('cpp-summary-extra') || domClasses(tableRow).has('cpp-expanded');
  }


  describe('with mappings', function() {

    beforeEach(select('PI_Many'));


    it('should show In and Out as Source / Target tables', function() {

      // when
      var inRow = getTableRow('In'),
          outRow = getTableRow('Out');

      // then
      expect(Array.prototype.map.call(domQueryAll('th', inRow), function(th) {
        return th.textContent;
      })).to.eql([ 'Source', 'Target' ]);

      expect(cells(inRow)).to.eql([
        [ '${vars:exists(\'firstName\') ? firstName : null}', 'firstName' ],
        [ '${vars:exists(\'lastName\') ? lastName : null}', 'lastName' ],
        [ 'caseId', 'caseInstanceId' ],
        [ 'all variables', '' ],
        [ '${initiator}', '${starter}' ],
        [ 'ssn', 'ssn' ]
      ]);

      expect(cells(outRow)).to.eql([ [ '${roiApproved}', 'roiApproved' ] ]);
    });


    it('should show the first four rows, and all of them with the chevron', function() {

      // given
      var inRow = getTableRow('In'),
          rows = domQueryAll('tbody tr', inRow),
          more = domQuery('[data-summary-more]', inRow);

      // then
      expect(isShown(rows[3], inRow)).to.be.true;
      expect(isShown(rows[4], inRow)).to.be.false;
      expect(more.getAttribute('aria-expanded')).to.equal('false');
      expect(domQuery('[data-summary-more]', getTableRow('Out'))).not.to.exist;

      // when
      TestHelper.triggerEvent(more, 'click');

      // then
      expect(isShown(rows[4], inRow)).to.be.true;
      expect(more.getAttribute('aria-expanded')).to.equal('true');

      // when
      TestHelper.triggerEvent(more, 'click');

      // then
      expect(isShown(rows[4], inRow)).to.be.false;
    });


    it('should give a cell its full text as a tooltip', function() {

      // then
      expect(domQuery('tbody td', getTableRow('In')).title).to.equal('${vars:exists(\'firstName\') ? firstName : null}');
    });


    it('should not show the selected mapping\'s fields', function() {

      // then
      var labels = Array.prototype.map.call(domQueryAll('dt', getSummary()), function(dt) {
        return dt.textContent;
      });

      expect(labels).to.eql([ 'In', 'Out' ]);
    });

  });


  describe('without mappings', function() {

    beforeEach(select('PI_None'));


    it('should show not set', function() {

      // then
      var inRow = getTableRow('In');

      expect(domClasses(inRow).has('cpp-summary-empty')).to.be.true;
      expect(domQuery('dd', inRow).textContent).to.equal('<not set>');
      expect(domQuery('table', inRow)).not.to.exist;
    });

  });



  describe('in the pop-up', function() {

    beforeEach(select('PI_Many'));

    function inList() {
      return domQuery('[data-entry="variableMapping-in"] select', container);
    }

    function selectRow(idx) {
      var list = inList();

      list.selectedIndex = idx;
      TestHelper.triggerEvent(list, 'change');
    }

    function mappings(bo) {
      return bo.extensionElements.values.filter(function(value) {
        return value.$type === 'flowable:In';
      }).map(function(value) {
        return value.target || value.targetExpression || value.variables;
      });
    }


    it('should show each mapping as source \u2192 target', function() {

      // then
      expect(inList().options[2].textContent).to.equal('caseId \u2192 caseInstanceId');
      expect(inList().options[3].textContent).to.equal('all variables');
    });


    it('should show each mapping as a row with a delete button', function() {

      // then
      var rows = domQueryAll('[data-entry="variableMapping-in"] .cpp-list-row', container);

      expect(rows).to.have.length(6);
      expect(domQuery('.cpp-list-row-label', rows[2]).textContent).to.equal('caseId \u2192 caseInstanceId');
      expect(domQuery('[data-list-row-delete]', rows[2])).to.exist;
    });


    it('should select a mapping by its row, and delete one by its button', inject(function(elementRegistry, commandStack) {

      // given
      var definition = elementRegistry.get('PI_Many').businessObject.definitionRef;

      // when
      TestHelper.triggerEvent(domQueryAll('[data-entry="variableMapping-in"] [data-list-row]', container)[1], 'click');

      // then
      expect(inList().selectedIndex).to.equal(1);

      // when
      TestHelper.triggerEvent(domQueryAll('[data-entry="variableMapping-in"] [data-list-row-delete]', container)[2], 'click');

      // then
      expect(mappings(definition)).to.eql([ 'firstName', 'lastName', 'all', '${starter}', 'ssn' ]);
      expect(domQueryAll('[data-entry="variableMapping-in"] .cpp-list-row', container)).to.have.length(5);

      // when
      commandStack.undo();

      // then
      expect(mappings(definition)).to.have.length(6);
    }));


    it('should move a mapping up and down, and undo it', inject(function(elementRegistry, commandStack) {

      // given
      var definition = elementRegistry.get('PI_Many').businessObject.definitionRef;

      selectRow(2);

      // when
      TestHelper.triggerEvent(domQuery('[data-entry="variableMapping-in"] [data-action="moveUp"]', container), 'click');

      // then
      expect(mappings(definition).slice(0, 3)).to.eql([ 'firstName', 'caseInstanceId', 'lastName' ]);

      // the out mapping keeps its place after the in mappings
      expect(definition.extensionElements.values[6].$type).to.equal('flowable:Out');

      // when
      commandStack.undo();

      // then
      expect(mappings(definition).slice(0, 3)).to.eql([ 'firstName', 'lastName', 'caseInstanceId' ]);
    }));

  });

});
