'use strict';

require('../../../TestHelper');

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


describe('flowable - extensions', function() {

  var diagramXML = require('./Extensions.cmmn');

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

  function getTabLink() {
    return domQuery('[data-tab-target="extensions"]', container).parentNode;
  }

  function getGroups() {
    return Array.prototype.slice.call(
      domQueryAll('[data-tab="extensions"] .cpp-properties-group', container));
  }

  function getGroup(id) {
    return domQuery('[data-tab="extensions"] [data-group="extensions-' + id + '"]', container);
  }

  function isVisible(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  /**
   * The rendered attributes of the group's top level, as name=value.
   */
  function topAttributes(group) {
    var list = domQuery('.cpp-extensions > .cpp-extensions-attributes', group);

    if (!list) {
      return [];
    }

    var names = domQueryAll('dt', list),
        values = domQueryAll('dd', list),
        result = [];

    for (var i = 0; i < names.length; i++) {
      result.push(names[i].textContent + '=' + values[i].textContent);
    }

    return result;
  }

  /**
   * The names of the extension elements, nested ones indented.
   */
  function elementNames(group) {
    var result = [];

    function walk(list, indent) {
      var items = list ? list.children : [];

      for (var i = 0; i < items.length; i++) {
        var item = items[i];

        result.push(indent + domQuery('.cpp-extensions-name', item).textContent);

        walk(domQuery(':scope > .cpp-extensions-elements', item), indent + '  ');
      }
    }

    walk(domQuery('.cpp-extensions > .cpp-extensions-elements', group), '');

    return result;
  }


  describe('plan item with a task definition', function() {

    beforeEach(function() {
      select('PI_Task');
    });


    it('should show the tab', function() {
      expect(isVisible(getTabLink())).to.be.true;
    });


    it('should show the item control and the definition', function() {

      // then
      expect(isVisible(getGroup('element'))).to.be.false;

      expect(elementNames(getGroup('itemControl'))).to.eql([ 'flowable:parentCompletionRule' ]);

      var definition = getGroup('definition');

      expect(topAttributes(definition)).to.eql([ 'flowable:async=true', 'flowable:type=java', 'flowable:custom=1' ]);
      expect(elementNames(definition)).to.eql([
        'flowable:taskListener',
        '  flowable:field',
        '    flowable:string',
        'flowable:customElement',
        '  flowable:nested'
      ]);
    });


    it('should show attributes and text of extension elements', function() {

      // then
      var definition = getGroup('definition'),
          text = domQueryAll('.cpp-extensions-text', definition);

      expect(definition.textContent).to.contain('org.example.Listener');
      expect(definition.textContent).to.contain('customAttribute');

      // text is shown as text, not as markup
      expect(text[0].textContent).to.eql('<hello>');
      expect(text[1].textContent).to.eql('value');
    });

  });


  it('should show the sentry of a criterion', function() {

    // when
    select('EC_1');

    // then
    expect(elementNames(getGroup('sentry'))).to.eql([
      'flowable:condition',
      '  flowable:condition'
    ]);
  });


  it('should show the case of a case plan model', function() {

    // when
    select('CasePlanModel_1');

    // then
    var caseGroup = getGroup('case');

    expect(topAttributes(caseGroup)).to.eql([ 'flowable:initiatorVariableName=initiator' ]);
    expect(elementNames(caseGroup)).to.eql([
      'flowable:eventType',
      'flowable:startEventCorrelationConfiguration'
    ]);
  });


  it('should not show the defaults of the descriptor', function() {

    // when
    select('PI_Process');

    // then
    expect(getGroups().filter(isVisible)).to.be.empty;
    expect(isVisible(getTabLink())).to.be.false;
  });


  it('should hide the tab for an element without extensions', function() {

    // when
    select('PI_Plain');

    // then
    expect(getGroups().filter(isVisible)).to.be.empty;
    expect(isVisible(getTabLink())).to.be.false;
  });


  it('should render again when the extensions change', inject(function(elementRegistry, propertiesPanel) {

    // given
    select('PI_Task');

    var shape = elementRegistry.get('PI_Task'),
        definition = shape.businessObject.definitionRef;

    // when
    definition.set('flowable:async', false);
    definition.$attrs['flowable:custom'] = '2';
    propertiesPanel.update(shape);

    // then
    expect(topAttributes(getGroup('definition'))).to.eql([ 'flowable:async=false', 'flowable:type=java', 'flowable:custom=2' ]);
  }));

});
