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


describe('flowable - one edit button per field', function() {

  var testModules = [
    coreModule, selectionModule, modelingModule,
    propertiesPanelModule,
    propertiesProviderModule
  ];

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  function bootstrap(diagramXML, config) {
    return bootstrapModeler(diagramXML, {
      modules: testModules,
      moddleExtensions: { flowable: flowableModdlePackage },
      propertiesPanel: config
    });
  }

  function select(id) {
    return inject(function(elementRegistry, selection) {
      selection.select(elementRegistry.get(id));
    })();
  }

  function getGroup(id) {
    return domQuery('[data-group="' + id + '"]', container);
  }

  function buttons(groupId) {
    return domQueryAll('[data-unit-edit]', getGroup(groupId));
  }

  function button(groupId, label) {
    return Array.prototype.filter.call(buttons(groupId), function(node) {
      return node.getAttribute('aria-label') === 'Edit ' + label;
    })[0];
  }

  // the labels of the rows next to an edit button
  function rowsOf(editButton) {
    return Array.prototype.map.call(domQueryAll('dt', editButton.parentNode), function(dt) {
      return dt.textContent;
    });
  }

  // the entries the pop-up shows
  function shownEntries(groupId) {
    return Array.prototype.filter.call(domQueryAll('.cpp-properties-entry', getGroup(groupId)), function(node) {
      return !domClasses(node).has('cpp-unit-other') && !domClasses(node).has('cpp-hidden');
    }).map(function(node) {
      return node.getAttribute('data-entry');
    });
  }

  function click(node) {
    TestHelper.triggerEvent(node, 'click');
  }

  function nameField() {
    return domQuery('[data-entry="name"] [contenteditable]', container);
  }


  describe('task', function() {

    beforeEach(bootstrap(require('./Task.cmmn'), { editPerField: true }));

    beforeEach(inject(function(propertiesPanel) {
      propertiesPanel.attachTo(container);

      select('PI_Human');
    }));


    it('should give each field an edit button, and the group none', function() {

      // then
      var common = getGroup('common');

      expect(domClasses(common).has('cpp-edit-per-field')).to.be.true;
      expect(domQuery('[data-group-edit]', common)).not.to.exist;

      expect(rowsOf(button('common', 'Id'))).to.eql([ 'Id' ]);
      expect(rowsOf(button('common', 'Name'))).to.eql([ 'Name' ]);
      expect(rowsOf(button('common', 'Documentation'))).to.eql([ 'Documentation' ]);
    });


    it('should edit both asynchronous choices with one button', function() {

      // then
      expect(rowsOf(button('execution', 'Asynchronous'))).to.eql([ 'Asynchronous', 'Leave asynchronously' ]);
      expect(button('execution', 'Leave asynchronously')).not.to.exist;
    });


    it('should edit a rule and its condition with one button', function() {

      // given
      var enabled = domQuery('[data-entry="itemControlRequiredRuleEnabled"]', container),
          condition = domQuery('[data-entry="itemControlRequiredRule"]', container);

      // then
      expect(condition.getAttribute('data-edit-unit')).to.equal('itemControlRequiredRuleEnabled');
      expect(enabled.getAttribute('data-edit-unit')).to.equal('itemControlRequiredRuleEnabled');
    });


    it('should show only the field in the pop-up', inject(function(propertiesPanel) {

      // when
      click(button('common', 'Name'));

      // then
      expect(propertiesPanel.getEditedGroup()).to.equal('common');
      expect(propertiesPanel.getEditedUnit()).to.equal('name');
      expect(domClasses(getGroup('common')).has('cpp-editing')).to.be.true;
      expect(shownEntries('common')).to.eql([ 'name' ]);
      expect(document.activeElement).to.equal(nameField());
    }));


    it('should show the fields edited together', inject(function(propertiesPanel) {

      // when
      click(button('execution', 'Blocking'));

      // then
      expect(shownEntries('execution')).to.eql([ 'taskIsBlocking', 'taskBlockingExpression' ]);
    }));


    it('should keep the change on Finish and go back to the button', inject(
      function(propertiesPanel, elementRegistry) {

        // given
        click(button('common', 'Name'));

        TestHelper.triggerValue(nameField(), 'Review', 'input');

        // when
        click(domQuery('[data-group="common"] [data-group-finish]', container));

        // then
        expect(propertiesPanel.getEditedGroup()).to.be.null;
        expect(elementRegistry.get('PI_Human').businessObject.name).to.equal('Review');
        expect(document.activeElement).to.equal(button('common', 'Name'));
        expect(domQuery('[data-group="common"] .cpp-unit-other', container)).not.to.exist;
      }
    ));


    it('should take the change back on Cancel', inject(function(propertiesPanel, elementRegistry) {

      // given
      click(button('common', 'Name'));

      TestHelper.triggerValue(nameField(), 'Review', 'input');

      // when
      click(domQuery('[data-group="common"] .cpp-dialog-cancel', container));

      // then
      expect(elementRegistry.get('PI_Human').businessObject.name).not.to.exist;
    }));


    it('should still open the whole group', inject(function(propertiesPanel) {

      // when
      propertiesPanel.openGroup('common');

      // then
      expect(propertiesPanel.getEditedUnit()).to.be.null;
      expect(domQuery('[data-group="common"] .cpp-unit-other', container)).not.to.exist;
    }));


    it('should open a search result\'s field', inject(function(propertiesPanel) {

      // given
      propertiesPanel.search('documentation');

      // when
      propertiesPanel.openSearchResult(0);

      // then
      expect(propertiesPanel.getEditedUnit()).to.equal('documentation');
      expect(shownEntries('common')).to.eql([ 'documentation' ]);
    }));

  });


  describe('variable mappings', function() {

    beforeEach(bootstrap(require('./VariableMappingTable.cmmn'), { editPerField: true }));

    beforeEach(inject(function(propertiesPanel) {
      propertiesPanel.attachTo(container);

      select('PI_Many');
    }));


    it('should give In and Out a button each', function() {

      // then
      expect(rowsOf(button('variables', 'In'))).to.eql([ 'In' ]);
      expect(rowsOf(button('variables', 'Out'))).to.eql([ 'Out' ]);
    });


    it('should edit In and Out on one screen, from the Out list', inject(function(propertiesPanel) {

      // when
      click(button('variables', 'Out'));

      // then
      expect(propertiesPanel.getEditedUnit()).to.equal('variableMapping-in');
      expect(shownEntries('variables')).to.include.members([ 'variableMapping-in', 'variableMapping-out' ]);
      expect(domQuery('.cpp-unit-other', getGroup('variables'))).not.to.exist;
      expect(document.activeElement).to.equal(domQuery('[data-entry="variableMapping-out"] select', container));
    }));


    it('should go back to the Out button', function() {

      // given
      click(button('variables', 'Out'));

      // when
      click(domQuery('[data-group="variables"] [data-group-finish]', container));

      // then
      expect(document.activeElement).to.equal(button('variables', 'Out'));
    });

  });


  describe('by default', function() {

    beforeEach(bootstrap(require('./Task.cmmn')));

    beforeEach(inject(function(propertiesPanel) {
      propertiesPanel.attachTo(container);

      select('PI_Human');
    }));


    it('should give each group one edit button', function() {

      // then
      expect(domQuery('[data-group="common"] [data-group-edit]', container)).to.exist;
      expect(domQuery('[data-unit-edit]', container)).not.to.exist;
    });

  });

});
