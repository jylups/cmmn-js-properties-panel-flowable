'use strict';

require('../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */



var propertiesPanelModule = require('lib'),
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('./properties');


var domQuery = require('min-dom').query,
    domAttr = require('min-dom').attr;


describe('properties-panel', function() {

  var diagramXML = require('./test.cmmn');

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
    modules: testModules
  }));


  beforeEach(inject(function(commandStack) {

    var button = document.createElement('button');
    button.textContent = 'UNDO';

    button.addEventListener('click', function() {
      commandStack.undo();
    });

    container.appendChild(button);
  }));


  it('should attach to element', inject(function(propertiesPanel, selection, elementRegistry) {

    // given
    var taskShape = elementRegistry.get('PlanItem_1');

    propertiesPanel.attachTo(container);

    // when
    selection.select(taskShape);

  }));


  describe('helpers', function() {

    describe('inject element id into [data-label-id] element', function() {

      function headerText(propertiesPanel) {
        return domQuery('[data-label-id]', propertiesPanel._container).textContent;
      }

      var shape;

      beforeEach(inject(function(propertiesPanel, elementRegistry) {
        propertiesPanel.attachTo(container);

        shape = elementRegistry.get('PlanItem_1');
      }));


      it('should display initially', inject(function(propertiesPanel, selection) {

        // when
        selection.select(shape);

        // then
        expect(headerText(propertiesPanel)).to.eql(shape.id);
      }));


      it('should update on id edit',
        inject(function(propertiesPanel, selection, modeling) {

          // given
          var newId = 'BAR';

          selection.select(shape);

          // when
          modeling.updateProperties(shape, { id: newId });

          // then
          expect(headerText(propertiesPanel)).to.eql(newId);
        })
      );


      it('should update on id undo', inject(function(propertiesPanel, selection, commandStack, modeling) {

        // given
        var oldId = shape.id;

        selection.select(shape);
        modeling.updateProperties(shape, { id: 'BAR' });

        // when
        commandStack.undo();

        // then
        expect(headerText(propertiesPanel)).to.eql(oldId);
      }));

    });

  });


  describe('tab selection', function() {

    function getActiveTabId(container) {
      var activeTabNode = domQuery('.cpp-properties-tab.cpp-active', container);
      return domAttr(activeTabNode, 'data-tab');
    }

    it('should keep the selected tab when changing the selected element',
      inject(function(propertiesPanel, selection, elementRegistry) {

        propertiesPanel.attachTo(container);

        // select event
        var shape = elementRegistry.get('PlanItem_1');
        selection.select(shape);

        // first: check selected tab
        expect(getActiveTabId(propertiesPanel._container)).to.equal('tab1');

        // select tab2
        propertiesPanel.activateTab('tab2');

        // check selected tab
        expect(getActiveTabId(propertiesPanel._container)).to.equal('tab2');

        // select task
        shape = elementRegistry.get('CasePlanModel_1');
        selection.select(shape);

        // check selected tab again
        expect(getActiveTabId(propertiesPanel._container)).to.equal('tab2');

      }));


    it('should select the first tab because the selected tab does not exist',
      inject(function(propertiesPanel, selection, elementRegistry) {

        propertiesPanel.attachTo(container);

        // select task
        var shape = elementRegistry.get('CasePlanModel_1');
        selection.select(shape);

        // select tab3
        propertiesPanel.activateTab('tab3');

        // check selected tab
        expect(getActiveTabId(propertiesPanel._container)).to.equal('tab3');

        // select event
        shape = elementRegistry.get('PlanItem_1');
        selection.select(shape);

        // check selected tab again
        expect(getActiveTabId(propertiesPanel._container)).to.equal('tab1');

      }));

  });


  describe('group rail', function() {

    var domClasses = require('min-dom').classes,
        domQueryAll = require('min-dom').queryAll;

    function railButton(container, id) {
      return domQuery('.cpp-properties-rail [data-tab-target="' + id + '"]', container);
    }

    function activeTabId(container) {
      return domAttr(domQuery('.cpp-properties-tab.cpp-active', container), 'data-tab');
    }

    function keydown(node, key) {
      var event = document.createEvent('Event');
      event.initEvent('keydown', true, true);
      event.key = key;
      node.dispatchEvent(event);
    }

    beforeEach(inject(function(propertiesPanel, selection, elementRegistry) {
      propertiesPanel.attachTo(container);

      selection.select(elementRegistry.get('PlanItem_1'));
    }));


    it('should show a button per group, named by its label', function() {

      // when
      var buttons = domQueryAll('.cpp-properties-tabs-links [role=tab]', container);

      // then
      expect(buttons.length).to.equal(3);

      var button = railButton(container, 'tab2');

      expect(domAttr(button, 'aria-label')).to.equal('Tab 2');
      expect(domAttr(button, 'title')).to.equal('Tab 2');
      expect(domQuery('.cpp-properties-tab-letter', button).textContent).to.equal('T');
    });


    it('should mark the open group', function() {

      // then
      expect(domAttr(railButton(container, 'tab1'), 'aria-selected')).to.equal('true');
      expect(domAttr(railButton(container, 'tab1'), 'tabindex')).to.equal('0');
      expect(domAttr(railButton(container, 'tab2'), 'aria-selected')).to.equal('false');
      expect(domAttr(railButton(container, 'tab2'), 'tabindex')).to.equal('-1');

      expect(domQuery('[data-tab-title]', container).textContent).to.equal('Task - Tab 1');
    });


    it('should hide the button of a group without entries', function() {

      // then
      expect(domClasses(railButton(container, 'tab3').parentNode).has('cpp-hidden')).to.be.true;
    });


    it('should open a group on click', function() {

      // when
      railButton(container, 'tab2').click();

      // then
      expect(activeTabId(container)).to.equal('tab2');
      expect(domQuery('[data-tab-title]', container).textContent).to.equal('Task - Tab 2');
    });


    describe('keyboard', function() {

      it('should open the next group on arrow down', function() {

        // when
        keydown(railButton(container, 'tab1'), 'ArrowDown');

        // then
        expect(activeTabId(container)).to.equal('tab2');
        expect(document.activeElement).to.equal(railButton(container, 'tab2'));
      });


      it('should skip hidden groups and wrap around', function() {

        // when
        keydown(railButton(container, 'tab1'), 'ArrowUp');

        // then
        expect(activeTabId(container)).to.equal('tab2');

        // when
        keydown(railButton(container, 'tab2'), 'ArrowDown');

        // then
        expect(activeTabId(container)).to.equal('tab1');
      });


      it('should open the first and last group on Home and End', function() {

        // when
        keydown(railButton(container, 'tab1'), 'End');

        // then
        expect(activeTabId(container)).to.equal('tab2');

        // when
        keydown(railButton(container, 'tab2'), 'Home');

        // then
        expect(activeTabId(container)).to.equal('tab1');
      });

    });


    describe('collapse', function() {

      function toggle(container) {
        return domQuery('[data-collapse-toggle]', container);
      }

      it('should collapse to the rail and open again', inject(function(propertiesPanel, eventBus) {

        // given
        var events = [];

        eventBus.on('propertiesPanel.collapsed', function(e) {
          events.push(e.panel.isCollapsed());
        });

        // when
        toggle(container).click();

        // then
        expect(propertiesPanel.isCollapsed()).to.be.true;
        expect(domClasses(propertiesPanel._container).has('cpp-collapsed')).to.be.true;
        expect(domAttr(toggle(container), 'aria-expanded')).to.equal('false');

        // when
        toggle(container).click();

        // then
        expect(propertiesPanel.isCollapsed()).to.be.false;
        expect(domAttr(toggle(container), 'aria-expanded')).to.equal('true');
        expect(events).to.eql([ true, false ]);
      }));


      it('should stay collapsed when the selection changes',
        inject(function(propertiesPanel, selection, elementRegistry) {

          // given
          propertiesPanel.setCollapsed(true);

          // when
          selection.select(elementRegistry.get('CasePlanModel_1'));

          // then
          expect(domClasses(propertiesPanel._container).has('cpp-collapsed')).to.be.true;
          expect(domAttr(toggle(container), 'aria-expanded')).to.equal('false');
        })
      );


      it('should open when a group is clicked', inject(function(propertiesPanel) {

        // given
        propertiesPanel.setCollapsed(true);

        // when
        railButton(container, 'tab2').click();

        // then
        expect(propertiesPanel.isCollapsed()).to.be.false;
        expect(activeTabId(container)).to.equal('tab2');
      }));

    });

  });


  describe('description for field entry', function() {

    function getDescriptionField(container, dataEntrySelector) {
      return domQuery(dataEntrySelector + ' .cpp-field-description', container);
    }

    var eventShape;

    beforeEach(inject(function(propertiesPanel, selection, elementRegistry) {
      propertiesPanel.attachTo(container);

      eventShape = elementRegistry.get('PlanItem_1');
      selection.select(eventShape);

    }));


    it('only text', inject(function(propertiesPanel) {
      var descriptionField = getDescriptionField(propertiesPanel._container, '[data-entry=myText]');

      expect(descriptionField.textContent).to.be.equal('This field is for documentation');
    }));


    it('with a markdown link', inject(function(propertiesPanel) {
      var descriptionField = getDescriptionField(propertiesPanel._container, '[data-entry=myLinkText]');

      expect(descriptionField.textContent).to.be.equal('For details see camunda.org');

      var link = domQuery('a', descriptionField);

      expect(link.href).to.be.equal('http://www.camunda.org/');
      expect(link.textContent).to.be.equal('camunda.org');
    }));


    it('with an html link', inject(function(propertiesPanel) {
      var descriptionField = getDescriptionField(propertiesPanel._container, '[data-entry=myHtmlLinkText]');

      expect(descriptionField.textContent).to.be.equal('For details see camunda.org');

      var link = domQuery('a', descriptionField);

      expect(link.href).to.be.equal('http://www.camunda.org/');
      expect(link.textContent).to.be.equal('camunda.org');
    }));


    it('with a malicious link', inject(function(propertiesPanel) {
      var descriptionField = getDescriptionField(propertiesPanel._container, '[data-entry=maliciousLinkText]');

      expect(descriptionField.textContent).to.be.equal('For malicious code see [javascript](javascript:alert(1))');

      var link = domQuery('a', descriptionField);

      expect(link).to.not.exist;
    }));

  });


  describe('listeners', function() {

    // Cannot be tested due to paste events not affecting document's contents per default.
    // Cf. https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
    it('should paste to [contenteditable] as plain text');
  });


  describe('element without a business object', function() {

    var Modeler = require('@jylups/cmmn-js/lib/Modeler');


    it('should show nothing', inject(function(propertiesPanel) {

      // given
      propertiesPanel.attachTo(container);

      // when
      propertiesPanel.update({ id: '__implicitroot_1' });

      // then
      expect(propertiesPanel._current).not.to.exist;
      expect(domQuery('.cpp-properties', container)).not.to.exist;
    }));


    it('should show an element again', inject(function(propertiesPanel, elementRegistry, selection) {

      // given
      propertiesPanel.attachTo(container);
      selection.select(elementRegistry.get('PlanItem_1'));

      propertiesPanel.update({ id: '__implicitroot_1' });

      // when
      selection.select(elementRegistry.get('PlanItem_1'));

      // then
      expect(domQuery('.cpp-properties', container)).to.exist;
      expect(domQuery('[data-label-id]', container).textContent).to.exist;
    }));


    it('should ignore the implicit root of an empty canvas', function() {

      // given
      var modeler = new Modeler({
        container: container,
        additionalModules: [ propertiesPanelModule, propertiesProviderModule ],
        propertiesPanel: { parent: container }
      });

      // when
      var root = modeler.get('canvas').getRootElement();

      // then
      expect(root.businessObject).not.to.exist;
      expect(modeler.get('propertiesPanel')._current).not.to.exist;

      modeler.destroy();
    });

  });
});
