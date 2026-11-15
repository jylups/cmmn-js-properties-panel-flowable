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
    problemsModule = require('@jylups/cmmn-js/lib/features/problems'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - problems', function() {

  var diagramXML = require('./Problems.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });


  function select(id) {
    return inject(function(elementRegistry, selection) {
      selection.select(elementRegistry.get(id));
    })();
  }

  function getGroup() {
    return domQuery('[data-tab="general"] [data-group="problems"]', container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function getProblems() {
    return Array.prototype.slice.call(domQueryAll('.cpp-problems .cpp-problem', getGroup()));
  }


  describe('with the problems of cmmn-js', function() {

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


    it('should show what is lost on save', function() {

      // when
      select('EntryCriterion_1');

      // then
      var problems = getProblems();

      expect(isShown(getGroup())).to.be.true;
      expect(problems).to.have.length(1);
      expect(domClasses(problems[0]).has('cpp-problem-error')).to.be.true;
      expect(problems[0].textContent).to.contain('refers to sentry \'Sentry_Missing\', which is not in this file');
    });


    it('should show what is kept but not recognised', function() {

      // when
      select('PI_Unknown');

      // then
      var problems = getProblems();

      expect(problems).to.have.length(1);
      expect(domClasses(problems[0]).has('cpp-problem-info')).to.be.true;
      expect(problems[0].textContent).to.contain('unknownAttribute');
    });


    it('should hide the group for an element without problems', function() {

      // when
      select('PI_Task');

      // then
      expect(isShown(getGroup())).to.be.false;
    });


    it('should hide the problem once it is fixed', inject(function(elementRegistry, modeling) {

      // given
      select('EntryCriterion_1');

      var criterion = elementRegistry.get('EntryCriterion_1'),
          sentry = criterion.businessObject.$parent.$parent.get('sentries')[0];

      // when
      modeling.updateProperties(criterion, { sentryRef: sentry });

      // then
      expect(isShown(getGroup())).to.be.false;
    }));

  });


  describe('without the problems of cmmn-js', function() {

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


    it('should not show the group', function() {

      // when
      select('EntryCriterion_1');

      // then
      expect(isShown(getGroup())).to.be.false;
    });

  });

});
