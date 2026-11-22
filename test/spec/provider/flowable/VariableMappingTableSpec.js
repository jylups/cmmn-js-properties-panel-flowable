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

});
