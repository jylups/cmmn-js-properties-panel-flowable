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
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - model hierarchy - models', function() {

  var diagramXML = require('./ReferencedModels.cmmn');

  var container;

  // the host the modeler gets (one object, reset for each test)
  var host = {
    lookup: function(models) {
      this.looked.push(models);

      return this.answer;
    },
    open: function(model) {
      this.opened.push(model);
    },
    runNoticeAction: function() {
      this.noticeRuns++;
    }
  };

  beforeEach(function() {
    container = TestContainer.get(this);

    host.looked = [];
    host.opened = [];
    host.noticeRuns = 0;
    host.answer = null;
  });

  function bootstrap(withHost) {
    return bootstrapModeler(diagramXML, {
      modules: [
        coreModule, selectionModule, modelingModule,
        propertiesPanelModule,
        propertiesProviderModule
      ].concat(withHost ? [ { referencedModels: [ 'value', host ] } ] : []),
      moddleExtensions: { flowable: flowableModdlePackage }
    });
  }

  function open() {
    return inject(function(propertiesPanel, elementRegistry, selection) {
      propertiesPanel.attachTo(container);

      selection.select(elementRegistry.get('PI_Review'));

      propertiesPanel.openHierarchy();
    });
  }

  function rows() {
    return Array.prototype.map.call(domQueryAll('[data-hierarchy-model-tree] .cpp-hierarchy-item', container), function(item) {
      return domQuery('.cpp-hierarchy-label', item).textContent + ' (' +
        domQuery('.cpp-hierarchy-type', item).textContent + ')';
    });
  }

  function model(index) {
    return domQuery('[data-hierarchy-model="' + index + '"]', container);
  }

  function shown() {
    return domQuery('[data-tab="cpp-hierarchy"]', container).getAttribute('data-hierarchy-shown');
  }


  describe('without a host', function() {

    beforeEach(bootstrap(false));
    beforeEach(open());


    it('should show the models first', function() {
      expect(shown()).to.equal('models');
      expect(domQuery('[data-hierarchy-view="models"]', container).getAttribute('aria-pressed')).to.equal('true');
    });


    it('should list the models the case refers to, by kind and key', function() {

      expect(rows()).to.eql([
        'Orders (Case)',
        'subCase (Case)',
        'invoiceProcess (Process)',
        'leadProcess (Process)',
        '${decisionKey} (Decision · set by an expression)',
        'reviewForm (Form)',
        'startOrder (Form)',
        'orderReceived (Event)',
        'orderShipped (Event)',
        'orderChannel (Channel)'
      ]);
    });


    it('should list a model once for every element that uses it', inject(function(propertiesPanel) {

      var lead = propertiesPanel.getReferencedModels().filter(function(m) {
        return m.key === 'leadProcess';
      })[0];

      expect(lead.elements).to.eql([ 'PI_Lead', 'PI_Lead2' ]);
    }));


    it('should leave out a case of the same file', inject(function(propertiesPanel) {

      var keys = propertiesPanel.getReferencedModels().map(function(m) {
        return m.key;
      });

      expect(keys).not.to.include('Case_2');
    }));


    it('should mark the models of the selected element', function() {
      expect(model(4).classList.contains('cpp-selected')).to.be.true;
      expect(domQueryAll('[data-hierarchy-model-tree] .cpp-selected', container)).to.have.length(1);
    });


    it('should select the elements that use a model, one after the other', inject(function(selection) {

      // when
      TestHelper.triggerEvent(model(2), 'click');

      // then
      expect(selection.get()[0].id).to.equal('PI_Lead');

      // when
      TestHelper.triggerEvent(model(2), 'click');

      // then
      expect(selection.get()[0].id).to.equal('PI_Lead2');
    }));


    it('should select the case plan model from the case', inject(function(selection) {

      // when
      TestHelper.triggerEvent(model('case'), 'click');

      // then
      expect(selection.get()[0].id).to.equal('CasePlanModel_1');
    }));


    it('should collapse and expand the case', function() {

      var caseItem = domQuery('[data-hierarchy-model-tree] > [role=treeitem]', container);

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-toggle="models"]', container), 'click');

      // then
      caseItem = domQuery('[data-hierarchy-model-tree] > [role=treeitem]', container);
      expect(caseItem.getAttribute('aria-expanded')).to.equal('false');

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-toggle="models"]', container), 'click');

      // then
      caseItem = domQuery('[data-hierarchy-model-tree] > [role=treeitem]', container);
      expect(caseItem.getAttribute('aria-expanded')).to.equal('true');
    });


    it('should not offer to open without a host', function() {
      expect(domQueryAll('[data-hierarchy-open]', container)).to.have.length(0);
      expect(domQuery('[data-hierarchy-notice]', container).hidden).to.be.true;
    });


    it('should switch to the outline and back', inject(function(propertiesPanel) {

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-view="outline"]', container), 'click');

      // then
      expect(shown()).to.equal('outline');
      expect(propertiesPanel.getHierarchyView()).to.equal('outline');
      expect(domQuery('[data-hierarchy] [data-hierarchy-element="PI_Review"]', container)).to.exist;

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-view="models"]', container), 'click');

      // then
      expect(shown()).to.equal('models');
    }));

  });


  describe('with a host', function() {

    beforeEach(bootstrap(true));


    it('should ask the host about the models', function() {

      // when
      open()();

      // then
      expect(host.looked).to.have.length(1);
      expect(host.looked[0][2]).to.eql({ kind: 'process', key: 'leadProcess', expression: false });
      expect(host.looked[0][3]).to.eql({ kind: 'decision', key: '${decisionKey}', expression: true });
    });


    it('should show the host\'s names and details, and open a model', function() {

      // given
      host.answer = {
        models: [
          { name: 'Sub Case', detail: 'In the folder', canOpen: true },
          {},
          { name: 'Lead Process', detail: 'Deployed, version 3' }
        ]
      };

      // when
      open()();

      // then
      expect(rows().slice(1, 4)).to.eql([
        'Sub Case (Case · In the folder)',
        'invoiceProcess (Process)',
        'Lead Process (Process · Deployed, version 3)'
      ]);

      var openButtons = domQueryAll('[data-hierarchy-open]', container);

      expect(openButtons).to.have.length(1);
      expect(openButtons[0].getAttribute('aria-label')).to.equal('Open Sub Case');

      // when
      TestHelper.triggerEvent(openButtons[0], 'click');

      // then
      expect(host.opened).to.eql([ { kind: 'case', key: 'subCase', expression: false } ]);
    });


    it('should show the answer when it comes', function(done) {

      // given
      var resolve;

      host.answer = { then: function(onAnswer) { resolve = onAnswer; } };

      open()();

      expect(rows()[1]).to.equal('subCase (Case)');

      // when
      resolve({ models: [ { name: 'Sub Case' } ] });

      // then
      setTimeout(function() {
        expect(rows()[1]).to.equal('Sub Case (Case)');
        done();
      });
    });


    it('should show the host\'s notice and run its action', function() {

      // given
      host.answer = { notice: { text: 'Allow access to the folder of the case', action: 'Allow access' } };

      // when
      open()();

      // then
      var notice = domQuery('[data-hierarchy-notice]', container);

      expect(notice.hidden).to.be.false;
      expect(notice.textContent).to.contain('Allow access to the folder of the case');

      // when
      TestHelper.triggerEvent(domQuery('[data-hierarchy-notice-action]', container), 'click');

      // then
      expect(host.noticeRuns).to.equal(1);
    });


    it('should not ask again for the same models', inject(function(propertiesPanel, elementRegistry, selection) {

      // given
      open()();

      // when
      selection.select(elementRegistry.get('PI_Send'));

      // then
      expect(host.looked).to.have.length(1);
    }));


    it('should ask again when the models change', inject(function(modeling, elementRegistry) {

      // given
      open()();

      // when
      var review = elementRegistry.get('PI_Review');

      review.businessObject.definitionRef.set('flowable:formKey', 'otherForm');
      modeling.updateProperties(review, {});

      // then
      expect(host.looked).to.have.length(2);
    }));


    it('should ask again when the host says so', inject(function(eventBus) {

      // given
      open()();

      // when
      eventBus.fire('referencedModels.changed');

      // then
      expect(host.looked).to.have.length(2);
    }));

  });

});
