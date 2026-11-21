'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var inherits = require('inherits');

var propertiesPanelModule = require('lib'),
    PropertiesActivator = require('lib/PropertiesActivator'),
    domQuery = require('min-dom').query,
    domClasses = require('min-dom').classes,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');

var variableAggregationProps = require('lib/provider/flowable/parts/VariableAggregationProps');


/**
 * A provider with the variable aggregations of the item control and of the
 * default control only.
 */
function VariableAggregationProvider(eventBus, cmmnFactory, translate) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {
    return [
      {
        id: 'itemControl',
        label: 'Item Control',
        groups: variableAggregationProps.createGroups(element, cmmnFactory, translate)
      },
      {
        id: 'defaultControl',
        label: 'Default Control',
        groups: variableAggregationProps.createGroups(element, cmmnFactory, translate, {
          isDefaultControl: true
        })
      }
    ];
  };
}

VariableAggregationProvider.$inject = [ 'eventBus', 'cmmnFactory', 'translate' ];

inherits(VariableAggregationProvider, PropertiesActivator);

var variableAggregationProviderModule = {
  __init__: [ 'propertiesProvider' ],
  propertiesProvider: [ 'type', VariableAggregationProvider ]
};


describe('flowable - variable aggregations', function() {

  var diagramXML = require('./VariableAggregation.cmmn');

  var testModules = [
    coreModule, selectionModule, modelingModule,
    propertiesPanelModule,
    variableAggregationProviderModule
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


  var item;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      var element = elementRegistry.get(id);

      selection.select(element);

      item = element.businessObject;
    })();
  }

  function getField(name) {
    return domQuery('[name="' + name + '"]', container);
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getGroup(id) {
    return domQuery('[data-group="' + id + '"]', container);
  }

  function getList(id) {
    return domQuery('#flowable-extensionElements-' + id, container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function optionTexts(id) {
    return Array.prototype.map.call(getList(id).options, function(option) {
      return option.text;
    });
  }

  function selectOption(id, index) {
    var list = getList(id);

    list.options[index].selected = 'selected';
    TestHelper.triggerEvent(list, 'change');
  }

  function clickAdd(id) {
    TestHelper.triggerEvent(domQuery('#flowable-extensionElements-create-' + id, container), 'click');
  }

  function clickRemove(id) {
    TestHelper.triggerEvent(domQuery('#flowable-extensionElements-remove-' + id, container), 'click');
  }

  function setValue(name, value) {
    TestHelper.triggerValue(getField(name), value, 'change');
  }

  function undo() {
    inject(function(commandStack) {
      commandStack.undo();
    })();
  }

  function redo() {
    inject(function(commandStack) {
      commandStack.redo();
    })();
  }

  function getRule() {
    return item.get('itemControl').get('repetitionRule');
  }

  function getAggregations(rule) {
    var extensionElements = rule.get('extensionElements');

    return ((extensionElements && extensionElements.get('values')) || []).filter(function(value) {
      return value.$type === 'flowable:VariableAggregation';
    });
  }


  describe('aggregations of the repetition rule', function() {

    beforeEach(function() {
      select('PI_Aggregations');
    });


    it('should list the aggregations', function() {

      // then
      expect(isShown(getGroup('variableAggregations'))).to.be.true;
      expect(optionTexts('variableAggregations')).to.eql([ 'reviews', '${target}' ]);
    });


    it('should hide the details without a selected aggregation', function() {

      // then
      expect(isShown(getGroup('variableAggregationDetails'))).to.be.false;
      expect(isShown(getGroup('variableAggregationVariables'))).to.be.false;
    });


    it('should show the selected aggregation', function() {

      // when
      selectOption('variableAggregations', 0);

      // then
      expect(isShown(getGroup('variableAggregationDetails'))).to.be.true;
      expect(isShown(getGroup('variableAggregationVariables'))).to.be.true;

      expect(getField('variableAggregation-target').value).to.eql('reviews');
      expect(getField('variableAggregation-targetExpression').value).to.eql('');
      expect(getField('variableAggregation-delegateExpression').value).to.eql('');
      expect(getField('variableAggregation-createOverviewVariable').checked).to.be.true;
      expect(getField('variableAggregation-storeAsTransientVariable').checked).to.be.false;

      expect(optionTexts('variableAggregation-variables')).to.eql([
        '${task:get(taskId).assignee} : userId', 'approved', 'description'
      ]);
    });


    it('should show the other aggregation', function() {

      // when
      selectOption('variableAggregations', 1);

      // then
      expect(getField('variableAggregation-target').value).to.eql('');
      expect(getField('variableAggregation-targetExpression').value).to.eql('${target}');
      expect(getField('variableAggregation-delegateExpression').value).to.eql('${aggregator}');
      expect(getField('variableAggregation-storeAsTransientVariable').checked).to.be.true;
      expect(getField('variableAggregation-createOverviewVariable').checked).to.be.false;

      expect(optionTexts('variableAggregation-variables')).to.eql([]);
    });


    it('should change the target', function() {

      // given
      var aggregation = getAggregations(getRule())[0];

      selectOption('variableAggregations', 0);

      // when
      setValue('variableAggregation-target', 'allReviews');

      // then
      expect(aggregation.get('target')).to.eql('allReviews');
      expect(optionTexts('variableAggregations')[0]).to.eql('allReviews');

      // when
      undo();

      // then
      expect(aggregation.get('target')).to.eql('reviews');

      // when
      redo();

      // then
      expect(aggregation.get('target')).to.eql('allReviews');
    });


    it('should remove the target attribute when empty', function() {

      // given
      var aggregation = getAggregations(getRule())[0];

      selectOption('variableAggregations', 0);

      // when
      setValue('variableAggregation-target', '');

      // then
      expect(aggregation.get('target')).not.to.exist;
    });


    it('should change the flags as strings', function() {

      // given
      var aggregation = getAggregations(getRule())[0];

      selectOption('variableAggregations', 0);

      // when
      TestHelper.triggerEvent(getField('variableAggregation-storeAsTransientVariable'), 'click');
      TestHelper.triggerEvent(getField('variableAggregation-createOverviewVariable'), 'click');

      // then
      expect(aggregation.get('storeAsTransientVariable')).to.eql('true');
      expect(aggregation.get('createOverviewVariable')).not.to.exist;

      // when
      undo();

      // then
      expect(aggregation.get('createOverviewVariable')).to.eql('true');
    });


    it('should add an aggregation', function() {

      // given
      var rule = getRule();

      // when
      clickAdd('variableAggregations');

      // then
      var aggregations = getAggregations(rule);

      expect(aggregations).to.have.length(3);
      expect(aggregations[2].$parent).to.equal(rule.get('extensionElements'));
      expect(isShown(getGroup('variableAggregationDetails'))).to.be.true;

      // when
      setValue('variableAggregation-target', 'results');

      // then
      expect(aggregations[2].get('target')).to.eql('results');

      // when
      undo();
      undo();

      // then
      expect(getAggregations(rule)).to.have.length(2);
    });


    it('should remove an aggregation', function() {

      // given
      var rule = getRule(),
          second = getAggregations(rule)[1];

      selectOption('variableAggregations', 0);

      // when
      clickRemove('variableAggregations');

      // then
      expect(getAggregations(rule)).to.eql([ second ]);
      expect(optionTexts('variableAggregations')).to.eql([ '${target}' ]);

      // when
      undo();

      // then
      expect(getAggregations(rule)).to.have.length(2);
      expect(optionTexts('variableAggregations')).to.eql([ 'reviews', '${target}' ]);
    });


    describe('variables', function() {

      var aggregation;

      beforeEach(function() {
        aggregation = getAggregations(getRule())[0];

        selectOption('variableAggregations', 0);
      });


      it('should hide the variable fields without a selected variable', function() {

        // then
        expect(isShown(getEntry('variableAggregation-variable-source'))).to.be.false;
        expect(isShown(getEntry('variableAggregation-variable-target'))).to.be.false;
      });


      it('should show the selected variable', function() {

        // when
        selectOption('variableAggregation-variables', 0);

        // then
        expect(isShown(getEntry('variableAggregation-variable-source'))).to.be.true;
        expect(getField('variableAggregation-variable-source').value).to.eql('');
        expect(getField('variableAggregation-variable-sourceExpression').value)
          .to.eql('${task:get(taskId).assignee}');
        expect(getField('variableAggregation-variable-target').value).to.eql('userId');
      });


      it('should change the source and the target', function() {

        // given
        var variable = aggregation.get('variable')[1];

        selectOption('variableAggregation-variables', 1);

        // when
        setValue('variableAggregation-variable-source', 'accepted');
        setValue('variableAggregation-variable-target', 'approval');

        // then
        expect(variable.get('source')).to.eql('accepted');
        expect(variable.get('target')).to.eql('approval');
        expect(optionTexts('variableAggregation-variables')[1]).to.eql('accepted : approval');

        // when
        undo();

        // then
        expect(variable.get('target')).not.to.exist;
        expect(variable.get('source')).to.eql('accepted');

        // when
        undo();

        // then
        expect(variable.get('source')).to.eql('approved');
      });


      it('should add a variable', function() {

        // when
        clickAdd('variableAggregation-variables');

        // then
        var variables = aggregation.get('variable');

        expect(variables).to.have.length(4);
        expect(variables[3].$type).to.eql('flowable:AggregationVariable');
        expect(variables[3].$parent).to.equal(aggregation);

        // when
        undo();

        // then
        expect(aggregation.get('variable')).to.have.length(3);
      });


      it('should remove a variable', function() {

        // given
        var variables = aggregation.get('variable').slice();

        selectOption('variableAggregation-variables', 1);

        // when
        clickRemove('variableAggregation-variables');

        // then
        expect(aggregation.get('variable')).to.eql([ variables[0], variables[2] ]);

        // when
        undo();

        // then
        expect(aggregation.get('variable')).to.eql(variables);
      });


      it('should show the variables of another selected aggregation', function() {

        // given
        selectOption('variableAggregation-variables', 1);

        // when
        selectOption('variableAggregations', 1);

        // then
        expect(optionTexts('variableAggregation-variables')).to.eql([]);
        expect(isShown(getEntry('variableAggregation-variable-source'))).to.be.false;
      });

    });

  });


  describe('repetition rule without aggregations', function() {

    beforeEach(function() {
      select('PI_RuleOnly');
    });


    it('should show an empty list', function() {

      // then
      expect(isShown(getGroup('variableAggregations'))).to.be.true;
      expect(optionTexts('variableAggregations')).to.eql([]);
    });


    it('should add an aggregation with the extension elements', function() {

      // given
      var rule = getRule();

      // when
      clickAdd('variableAggregations');

      // then
      expect(rule.get('extensionElements')).to.exist;
      expect(getAggregations(rule)).to.have.length(1);

      // when
      undo();

      // then
      expect(rule.get('extensionElements')).not.to.exist;
    });

  });


  describe('without repetition rule', function() {

    it('should hide the groups of an item control without repetition rule', function() {

      // when
      select('PI_NoRule');

      // then
      expect(isShown(getGroup('variableAggregations'))).to.be.false;
      expect(isShown(getGroup('variableAggregationDetails'))).to.be.false;
      expect(isShown(getGroup('variableAggregationVariables'))).to.be.false;
    });


    it('should hide the groups of a plan item without item control', function() {

      // when
      select('PI_Default');

      // then
      expect(isShown(getGroup('variableAggregations'))).to.be.false;
    });


    it('should not offer the groups for the case plan model', function() {

      // when
      select('CasePlanModel_1');

      // then
      expect(getEntry('variableAggregations')).not.to.exist;
    });

  });


  describe('default control', function() {

    it('should list the aggregations of the repetition rule of the default control', function() {

      // when
      select('PI_Default');

      // then
      expect(isShown(getGroup('defaultControl-variableAggregations'))).to.be.true;
      expect(optionTexts('defaultControl-variableAggregations')).to.eql([ 'defaults' ]);

      // when
      selectOption('defaultControl-variableAggregations', 0);

      // then
      expect(getField('defaultControl-variableAggregation-target').value).to.eql('defaults');
      expect(optionTexts('defaultControl-variableAggregation-variables')).to.eql([ 'value' ]);
    });

  });

});
