'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    problemsModule = require('@jylups/cmmn-js/lib/features/problems'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - parts Flowable does not read', function() {

  var diagramXML = require('./NotReadByFlowable.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule, selectionModule, modelingModule, problemsModule,
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
    })();
  }

  function notRead(problems, element) {
    return problems.getProblems(element).filter(function(problem) {
      return problem.kind === 'not-read';
    }).map(function(problem) {
      return problem.message;
    });
  }

  function getField(name) {
    return domQuery('[name="' + name + '"]', container);
  }


  describe('problems', function() {

    it('should report a case execution listener', inject(function(problems, elementRegistry) {

      // then
      expect(notRead(problems, elementRegistry.get('PI_Task'))).to.eql([
        'The case execution listener of task \'Review\' is not read by Flowable; use a lifecycle listener. ' +
        'It is kept when the model is saved.'
      ]);
    }));


    it('should report a variable listener', inject(function(problems, elementRegistry) {

      // then
      expect(notRead(problems, elementRegistry.get('CasePlanModel_1'))).to.eql([
        'The variable listener of stage \'Plan\' is not read by Flowable; use a variable event listener. ' +
        'It is kept when the model is saved.'
      ]);
    }));


    it('should report business key, all variables and local of mappings', inject(function(problems, elementRegistry) {

      // then
      var messages = notRead(problems, elementRegistry.get('PI_Process'));

      expect(messages).to.have.length(3);
      expect(messages[0]).to.contain('The business key mapping of process task \'Order\' is not read by Flowable');
      expect(messages[1]).to.contain('The mapping of all variables of process task \'Order\' is not read by Flowable');
      expect(messages[2]).to.contain('Local of a variable mapping of process task \'Order\' is not read by Flowable');
    }));


    it('should not report mappings Flowable reads', inject(function(problems, elementRegistry) {

      // then
      expect(notRead(problems, elementRegistry.get('PI_Clean'))).to.be.empty;
    }));


    it('should be notes, kept on save', inject(function(problems) {

      // then
      problems.getProblems().filter(function(problem) {
        return problem.kind === 'not-read';
      }).forEach(function(problem) {
        expect(problem.severity).to.eql('info');
        expect(problem.removedOnSave).to.be.false;
      });

      expect(problems.getRemovedOnSave()).to.be.empty;
    }));


    it('should show them in the Problems group', function() {

      // when
      select('PI_Process');

      // then
      var items = domQueryAll('[data-group="problems"] .cpp-problem-info', container);

      expect(items).to.have.length(3);
    });


    it('should drop a report once the part is removed', inject(function(problems, elementRegistry, modeling) {

      // given
      var planItem = elementRegistry.get('PI_Task'),
          definition = planItem.businessObject.definitionRef,
          extensionElements = definition.get('extensionElements');

      // when
      modeling.updateProperties(planItem, {}); // no change yet
      extensionElements.set('values', []);
      modeling.updateProperties(planItem, { name: 'Review' });

      // then
      expect(notRead(problems, planItem)).to.be.empty;
    }));

  });


  describe('panel', function() {

    it('should not offer case execution and variable listeners', function() {

      // when
      select('PI_Task');

      // then
      expect(domQuery('[data-entry="caseExecutionListeners"]', container)).not.to.exist;
      expect(domQuery('[data-entry="variableListeners"]', container)).not.to.exist;
      expect(domQuery('[data-entry="planItemLifecycleListeners"]', container)).to.exist;
    });


    it('should not offer the business key checkbox', function() {

      // when
      select('PI_Process');

      // then
      expect(getField('callableBusinessKey')).not.to.exist;
    });

  });


  describe('in and out mappings', function() {

    var mapping;

    beforeEach(inject(function(elementRegistry) {
      select('PI_Clean');

      mapping = elementRegistry.get('PI_Clean').businessObject.definitionRef
        .get('extensionElements').get('values')[0];

      var list = domQuery('select[id="flowable-extensionElements-variableMapping-in"]', container);

      list.selectedIndex = 0;
      TestHelper.triggerEvent(list, 'change');
    }));


    it('should offer source and source expression only', function() {

      // then
      expect(getField('source')).to.exist;
      expect(getField('sourceExpression')).to.exist;
      expect(getField('inOutType')).not.to.exist;
      expect(getField('local')).not.to.exist;
    });


    it('should change the target to an expression', inject(function(commandStack) {

      // when
      TestHelper.triggerValue(getField('targetType'), 'targetExpression', 'change');

      // then
      expect(mapping.get('target')).not.to.exist;
      expect(mapping.get('targetExpression')).to.eql('childAmount');

      // when
      TestHelper.triggerValue(getField('target'), '${child.amount}', 'change');

      // then
      expect(mapping.get('targetExpression')).to.eql('${child.amount}');

      // when
      commandStack.undo();
      commandStack.undo();

      // then
      expect(mapping.get('target')).to.eql('childAmount');
      expect(mapping.get('targetExpression')).not.to.exist;
    }));


    it('should set the variable types', function() {

      // when
      TestHelper.triggerValue(getField('variable-sourceType'), 'string', 'change');
      TestHelper.triggerValue(getField('variable-targetType'), 'integer', 'change');

      // then
      expect(mapping.get('sourceType')).to.eql('string');
      expect(mapping.get('targetType')).to.eql('integer');
    });


    it('should set transient', function() {

      // when
      TestHelper.triggerEvent(getField('transient'), 'click');

      // then
      expect(mapping.get('transient')).to.eql('true');

      // when
      TestHelper.triggerEvent(getField('transient'), 'click');

      // then
      expect(mapping.get('transient')).not.to.exist;
    });

  });

});
