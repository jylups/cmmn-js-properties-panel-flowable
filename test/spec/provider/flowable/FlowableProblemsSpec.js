'use strict';

require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    problemsModule = require('@jylups/cmmn-js/lib/features/problems'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - problems', function() {

  var diagramXML = require('./FlowableProblems.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule, selectionModule, modelingModule, problemsModule,
      propertiesPanelModule,
      propertiesProviderModule
    ],
    moddleExtensions: { flowable: flowableModdlePackage }
  }));

  beforeEach(inject(function(propertiesPanel) {
    propertiesPanel.attachTo(container);
  }));


  function messages(kind, problems, element) {
    return problems.getProblems(element).filter(function(problem) {
      return problem.kind === kind;
    }).map(function(problem) {
      return problem.message;
    });
  }

  function allMessages(kind, problems) {
    return messages(kind, problems);
  }


  describe('fields Flowable does not read', function() {

    it('should report the history time to live of the case', inject(function(problems) {

      // then
      expect(allMessages('not-read', problems)).to.include(
        'The history time to live of case \'Case_1\' is not read by Flowable. It is kept when the model is saved.');
    }));


    it('should report the follow-up date of a human task', inject(function(problems, elementRegistry) {

      // then
      expect(messages('not-read', problems, elementRegistry.get('PI_Human'))).to.include(
        'The follow-up date of human task \'Review\' is not read by Flowable. It is kept when the model is saved.');
    }));


    it('should report the binding of a process task and the result mapping of a decision task',
      inject(function(problems, elementRegistry) {

        // then
        expect(messages('not-read', problems, elementRegistry.get('PI_Process'))[0])
          .to.contain('The process binding of process task \'Order\' is not read by Flowable');
        expect(messages('not-read', problems, elementRegistry.get('PI_Decision'))[0])
          .to.contain('The decision result mapping of decision task \'Decide\' is not read by Flowable');
      })
    );


    it('should report repeat on standard event and an external script resource', inject(function(problems) {

      // then
      var notRead = allMessages('not-read', problems).join('\n');

      expect(notRead).to.contain('The repeat on standard event of repetition rule \'RepetitionRule_1\' is not read');
      expect(notRead).to.contain('The external script resource of human task \'Review\' is not read by Flowable');
    }));


    it('should be notes, kept on save', inject(function(problems) {

      // then
      problems.getProblems().filter(function(problem) {
        return problem.kind === 'not-read';
      }).forEach(function(problem) {
        expect(problem.severity).to.equal('info');
        expect(problem.removedOnSave).to.be.false;
      });
    }));


    it('should no longer offer fields for them', inject(function(elementRegistry, selection) {

      // when
      selection.select(elementRegistry.get('PI_Human'));

      // then
      expect(domQuery('[data-entry="followUpDate"]', container)).not.to.exist;

      // when
      selection.select(elementRegistry.get('PI_Process'));

      // then
      expect(domQuery('[data-entry="callableBinding"]', container)).not.to.exist;

      // when
      selection.select(elementRegistry.get('PI_Repeat'));

      // then
      expect(domQuery('[data-entry="itemControlRepeatOnStandardEvent"]', container)).not.to.exist;
    }));

  });


  describe('deployment pitfalls', function() {

    it('should report fields on a case page and an external worker task', inject(function(problems, elementRegistry) {

      // then
      expect(messages('deployment', problems, elementRegistry.get('PI_CasePage'))).to.eql([
        'Task \'Page\' has fields, which Flowable rejects on a case page task when the model is deployed; remove them.'
      ]);
      expect(messages('deployment', problems, elementRegistry.get('PI_Worker'))[0])
        .to.contain('rejects on an external worker task');
    }));


    it('should report a max instance count of 0', inject(function(problems) {

      // then
      expect(allMessages('deployment', problems)).to.include(
        'The max instance count of task \'Repeat\' is 0, which Flowable rejects when the model is deployed; ' +
        'use a positive number or unlimited.');
    }));


    it('should report a display order that is not a whole number', inject(function(problems, elementRegistry) {

      // then
      expect(messages('deployment', problems, elementRegistry.get('PI_Stage'))).to.eql([
        'The display order of stage \'Stage\' is not a whole number, which Flowable rejects when the model is deployed.'
      ]);
      expect(messages('deployment', problems, elementRegistry.get('PI_Milestone'))).to.be.empty;
    }));


    it('should report a script task without a script', inject(function(problems, elementRegistry) {

      // then
      expect(messages('deployment', problems, elementRegistry.get('PI_Script'))).to.eql([
        'The script task \'Empty script\' has no script, which Flowable rejects when the model is deployed.'
      ]);
      expect(messages('deployment', problems, elementRegistry.get('PI_ScriptOk'))).to.be.empty;
    }));


    it('should report an HTTP task without request method', inject(function(problems, elementRegistry) {

      // then
      expect(messages('deployment', problems, elementRegistry.get('PI_Http'))).to.eql([
        'The HTTP task \'Call\' has no request method, which Flowable rejects when the model is deployed.'
      ]);
      expect(messages('deployment', problems, elementRegistry.get('PI_HttpOk'))).to.be.empty;
    }));


    it('should report the second reactivate event listener', inject(function(problems, elementRegistry) {

      // then
      expect(messages('deployment', problems, elementRegistry.get('PI_Reactivate1'))).to.be.empty;
      expect(messages('deployment', problems, elementRegistry.get('PI_Reactivate2'))[0])
        .to.contain('more than one reactivate event listener');
    }));


    it('should be errors, kept on save', inject(function(problems) {

      // then
      var deployment = problems.getProblems().filter(function(problem) {
        return problem.kind === 'deployment';
      });

      expect(deployment).to.have.length(7);

      deployment.forEach(function(problem) {
        expect(problem.severity).to.equal('error');
        expect(problem.removedOnSave).to.be.false;
      });
    }));


    it('should go away once fixed', inject(function(problems, elementRegistry, modeling) {

      // given
      var stage = elementRegistry.get('PI_Stage');

      // when
      modeling.updateProperties(stage, {});
      stage.businessObject.definitionRef.set('flowable:displayOrder', '3');
      modeling.updateProperties(stage, { name: 'Stage' });

      // then
      expect(messages('deployment', problems, stage)).to.be.empty;
    }));

  });

});
