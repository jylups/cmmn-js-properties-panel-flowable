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


describe('flowable - edit in a pop-up', function() {

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

  function bootstrap(config) {
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

  function summary(groupId) {
    return Array.prototype.map.call(domQueryAll('.cpp-summary-row', getGroup(groupId)), function(row) {
      return domQuery('dt', row).textContent + '=' + domQuery('dd', row).textContent;
    });
  }

  function nameField() {
    return domQuery('[data-entry="name"] [contenteditable]', container);
  }

  function click(node) {
    TestHelper.triggerEvent(node, 'click');
  }

  function keydown(node, key) {
    var event = document.createEvent('Event');
    event.initEvent('keydown', true, true);
    event.key = key;
    node.dispatchEvent(event);
  }


  describe('read-only view', function() {

    beforeEach(bootstrap());

    beforeEach(inject(function(propertiesPanel) {
      propertiesPanel.attachTo(container);

      select('PI_Human');
    }));


    it('should show the values of a group', function() {

      // then
      var common = getGroup('common');

      expect(domClasses(common).has('cpp-read-view')).to.be.true;
      expect(summary('common')).to.include('Id=PI_Human');
      expect(summary('common')).to.include('Name=Human');
      expect(summary('common')).to.include('Documentation=<not set>');
    });


    it('should show check boxes as True or False', function() {

      // then
      expect(summary('execution')).to.include('Asynchronous=False');
    });


    it('should mark empty values', function() {

      // then
      var rows = domQueryAll('[data-group="common"] .cpp-summary-row', container);

      var documentation = Array.prototype.filter.call(rows, function(row) {
        return domQuery('dt', row).textContent === 'Documentation';
      })[0];

      expect(domClasses(documentation).has('cpp-summary-empty')).to.be.true;
    });


    it('should give each group an edit button', function() {

      // then
      var button = domQuery('[data-group="common"] [data-group-edit]', container);

      expect(button.getAttribute('aria-label')).to.equal('Edit Common');
    });


    it('should edit lists of listeners in place', function() {

      // then
      expect(domClasses(getGroup('taskListeners')).has('cpp-read-view')).to.be.false;
      expect(domQuery('[data-group="taskListeners"] [data-group-edit]', container)).not.to.exist;
    });


    it('should update when the model changes', inject(function(modeling, elementRegistry) {

      // when
      modeling.updateProperties(elementRegistry.get('PI_Human'), { name: 'Review' });

      // then
      expect(summary('common')).to.include('Name=Review');
    }));

  });


  describe('pop-up', function() {

    beforeEach(bootstrap());

    beforeEach(inject(function(propertiesPanel) {
      propertiesPanel.attachTo(container);

      select('PI_Human');
    }));


    it('should open from the edit button', inject(function(propertiesPanel) {

      // when
      click(domQuery('[data-group="common"] [data-group-edit]', container));

      // then
      var common = getGroup('common');

      expect(propertiesPanel.getEditedGroup()).to.equal('common');
      expect(domClasses(common).has('cpp-editing')).to.be.true;
      expect(common.getAttribute('role')).to.equal('dialog');
      expect(domClasses(domQuery('.cpp-properties', container)).has('cpp-dialog-open')).to.be.true;

      expect(domQuery('[data-dialog-title]', common).textContent).to.equal('Human Task');
      expect(domQuery('[data-dialog-subtitle]', common).textContent).to.equal('Human (PI_Human)');
    }));


    it('should show the help of the group', function() {

      // then
      expect(domQuery('[data-group="common"] .cpp-dialog-help', container).textContent).to.contain('Every CMMN element');
    });


    it('should open the tab of the group', inject(function(propertiesPanel) {

      // given
      propertiesPanel.activateTab('control');

      // when
      propertiesPanel.openGroup('common');

      // then
      expect(domClasses(domQuery('[data-tab="general"]', container)).has('cpp-active')).to.be.true;
    }));


    it('should keep the changes on Finish', inject(function(propertiesPanel, elementRegistry) {

      // given
      propertiesPanel.openGroup('common');

      TestHelper.triggerValue(nameField(), 'Review', 'input');

      // when
      click(domQuery('[data-group="common"] [data-group-finish]', container));

      // then
      expect(propertiesPanel.getEditedGroup()).to.be.null;
      expect(elementRegistry.get('PI_Human').businessObject.name).to.equal('Review');
      expect(summary('common')).to.include('Name=Review');
    }));


    it('should take the changes back on Cancel', inject(function(propertiesPanel, elementRegistry) {

      // given
      propertiesPanel.openGroup('common');

      TestHelper.triggerValue(nameField(), 'Review', 'input');

      // when
      click(domQuery('[data-group="common"] .cpp-dialog-cancel', container));

      // then
      expect(propertiesPanel.getEditedGroup()).to.be.null;
      expect(elementRegistry.get('PI_Human').businessObject.name).not.to.exist;
      expect(nameField().innerText).to.equal('Human');
      expect(summary('common')).to.include('Name=Human');
    }));


    it('should take back several changes on Cancel', inject(function(propertiesPanel, elementRegistry) {

      // given
      propertiesPanel.openGroup('common');

      TestHelper.triggerValue(nameField(), 'Review', 'change');
      TestHelper.triggerValue(nameField(), 'Second review', 'change');

      // when
      propertiesPanel.closeGroup(false);

      // then
      expect(elementRegistry.get('PI_Human').businessObject.name).not.to.exist;
    }));


    it('should cancel on Escape', inject(function(propertiesPanel, elementRegistry) {

      // given
      propertiesPanel.openGroup('common');

      TestHelper.triggerValue(nameField(), 'Review', 'change');

      // when
      keydown(nameField(), 'Escape');

      // then
      expect(propertiesPanel.getEditedGroup()).to.be.null;
      expect(elementRegistry.get('PI_Human').businessObject.name).not.to.exist;
    }));


    describe('with the focus in a text field', function() {

      function typeInName(text) {
        var field = nameField();

        field.focus();

        // the caret at the end
        var range = document.createRange();
        range.selectNodeContents(field);
        range.collapse(false);

        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        TestHelper.triggerValue(field, field.innerText + text, 'input');
      }


      it('should show the old value again on Escape', inject(function(propertiesPanel, elementRegistry) {

        // given
        propertiesPanel.openGroup('common');

        typeInName(' now');

        // when
        keydown(nameField(), 'Escape');

        // then
        expect(elementRegistry.get('PI_Human').businessObject.name).not.to.exist;
        expect(nameField().innerText).to.equal('Human');
        expect(summary('common')).to.include('Name=Human');
      }));


      it('should not save the cancelled text on a later Finish', inject(function(propertiesPanel, elementRegistry) {

        // given
        propertiesPanel.openGroup('common');

        typeInName(' now');

        keydown(nameField(), 'Escape');

        // when
        propertiesPanel.openGroup('common');

        click(domQuery('[data-group="common"] [data-group-finish]', container));

        // then
        expect(elementRegistry.get('PI_Human').businessObject.name).not.to.exist;
        expect(summary('common')).to.include('Name=Human');
      }));


      it('should keep the caret on undo', inject(function(propertiesPanel, commandStack) {

        // given
        propertiesPanel.openGroup('common');

        typeInName(' now');

        propertiesPanel._debouncedChange.flush();

        // when
        commandStack.undo();

        // then
        var field = nameField(),
            selection = window.getSelection();

        expect(field.innerText).to.equal('Human');
        expect(field.contains(selection.focusNode)).to.be.true;
        expect(selection.focusOffset).to.be.at.most('Human'.length);
      }));

    });


    it('should stay open when the panel is drawn again',inject(function(propertiesPanel, elementRegistry) {

      // given
      propertiesPanel.openGroup('common');

      // when
      propertiesPanel.update(elementRegistry.get('PI_Human'));

      // then
      expect(domClasses(getGroup('common')).has('cpp-editing')).to.be.true;
    }));


    it('should close when another element is selected', inject(function(propertiesPanel) {

      // given
      propertiesPanel.openGroup('common');

      // when
      select('PI_Process');

      // then
      expect(propertiesPanel.getEditedGroup()).to.be.null;
      expect(domQuery('.cpp-editing', container)).not.to.exist;
      expect(domClasses(domQuery('.cpp-properties', container)).has('cpp-dialog-open')).to.be.false;
    }));

  });


  describe('with editInDialog: false', function() {

    beforeEach(bootstrap({ editInDialog: false }));

    beforeEach(inject(function(propertiesPanel) {
      propertiesPanel.attachTo(container);

      select('PI_Human');
    }));


    it('should edit every group in place', function() {

      // then
      expect(domQuery('.cpp-read-view', container)).not.to.exist;
      expect(domQuery('[data-group-edit]', container)).not.to.exist;
    });

  });

});
