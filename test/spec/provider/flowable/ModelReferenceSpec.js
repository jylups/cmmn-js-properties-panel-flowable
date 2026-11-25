'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject, Promise */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');

var keyFor = require('lib/PropertiesPanel').keyFor;


describe('flowable - model references (jylups/cmmn-js-env#98)', function() {

  var diagramXML = require('./ReferencedModels.cmmn');

  var container;

  var referencedModels = {
    lookup: function(models) {
      var self = this;

      return {
        models: models.map(function(model) {
          return self.known[model.key] || {};
        })
      };
    },
    open: function(model) {
      this.opened.push(model);
    }
  };

  var fieldOptions = {
    options: function(kind) {
      return this.answers[kind];
    },
    note: function(kind) {
      return this.notes[kind];
    }
  };

  beforeEach(function() {
    container = TestContainer.get(this);

    referencedModels.known = {};
    referencedModels.opened = [];
    fieldOptions.answers = {};
    fieldOptions.notes = {};
    fieldOptions.created = [];
    delete fieldOptions.create;
  });

  function bootstrap(withHost) {
    return bootstrapModeler(diagramXML, {
      modules: [
        coreModule, selectionModule, modelingModule,
        propertiesPanelModule,
        propertiesProviderModule
      ].concat(withHost ? [ {
        fieldOptions: [ 'value', fieldOptions ],
        referencedModels: [ 'value', referencedModels ]
      } ] : []),
      moddleExtensions: { flowable: flowableModdlePackage }
    });
  }

  function select(id) {
    return inject(function(propertiesPanel, elementRegistry, selection) {
      propertiesPanel.attachTo(container);

      selection.select(elementRegistry.get(id));
    });
  }

  function reference() {
    return domQuery('[data-model-reference]', container);
  }

  function summaryRow() {
    return domQuery('[data-group="reference"] .cpp-summary-row', container);
  }

  function rows() {
    return Array.prototype.map.call(domQueryAll('[data-ref-rows] tr', container), function(row) {
      return row.querySelector('.cpp-model-reference-name').textContent + ' (' +
        row.querySelector('.cpp-model-reference-key').textContent + ') ' +
        row.querySelector('.cpp-model-reference-where').textContent +
        (row.classList.contains('cpp-selected') ? ' *' : '');
    });
  }

  function bodyOf(elementRegistry, id) {
    var definition = elementRegistry.get(id).businessObject.definitionRef,
        expression = definition.get('processRefExpression');

    return expression && expression.get('body');
  }


  describe('without a host', function() {

    beforeEach(bootstrap(false));


    it('should name the field after what the task starts, as required', function() {

      // when
      select('PI_Lead')();

      // then
      var row = summaryRow();

      expect(row.querySelector('dt').textContent).to.equal('Process reference *');
      expect(row.querySelector('dd').textContent).to.equal('leadProcess');
      expect(row.querySelector('[data-summary-open]')).not.to.exist;
    });


    it('should show an empty reference in red', function() {

      // given
      select('PI_Lead')();

      // when
      TestHelper.triggerValue(domQuery('[data-ref-input]', container), '', 'change');

      // then
      var row = summaryRow();

      expect(row.classList.contains('cpp-summary-required')).to.be.true;
      expect(row.querySelector('dd').textContent).to.equal('<not set>');
      expect(reference().querySelector('[data-ref-required]').classList.contains('cpp-hidden')).to.be.false;
    });


    it('should offer only to link, with no models', function() {

      // when
      select('PI_Lead')();

      // then
      expect(reference().classList.contains('cpp-can-create')).to.be.false;
      expect(reference().getAttribute('data-ref-mode')).to.equal('link');
      expect(rows()).to.eql([]);
      expect(reference().querySelector('[data-ref-current]').textContent).to.equal('Linked to leadProcess');
    });


    it('should start with the expression of one', function() {

      // when
      select('PI_Decision')();

      // then
      expect(reference().getAttribute('data-ref-mode')).to.equal('expression');
      expect(domQuery('[data-ref-input]', container).value).to.equal('${decisionKey}');
    });

  });


  describe('with a host', function() {

    beforeEach(bootstrap(true));


    it('should show the model\'s name and key, which open it', function() {

      // given
      referencedModels.known.leadProcess = { name: 'Lead Process', canOpen: true };

      // when
      select('PI_Lead')();

      // then
      var link = summaryRow().querySelector('[data-summary-open]');

      expect(link.textContent).to.equal('Lead Process (leadProcess)');

      // when
      TestHelper.triggerEvent(link, 'click');

      // then
      expect(referencedModels.opened).to.eql([ { kind: 'process', key: 'leadProcess', expression: false } ]);
    });


    it('should list the models to link, with their details', function() {

      // given
      fieldOptions.answers.process = [
        { value: 'leadProcess', name: 'Lead Process', where: 'processes/lead.bpmn', modified: '2026-11-20T14:48:00Z' },
        { value: 'invoiceProcess', label: 'Invoice · deployed', where: 'Deployed, version 2' }
      ];

      // when
      select('PI_Lead')();

      // then
      expect(rows()).to.eql([
        'Lead Process (leadProcess) processes/lead.bpmn *',
        'Invoice (invoiceProcess) Deployed, version 2'
      ]);
      expect(reference().querySelector('[data-ref-current]').classList.contains('cpp-hidden')).to.be.true;
    });


    it('should filter the models by name or key', function() {

      // given
      fieldOptions.answers.process = [ { value: 'leadProcess', name: 'Lead Process' }, { value: 'invoiceProcess' } ];

      select('PI_Lead')();

      // when
      TestHelper.triggerValue(domQuery('[data-ref-filter]', container), 'INVOICE', 'input');

      // then
      expect(rows()).to.eql([ 'invoiceProcess (invoiceProcess) ' ]);
    });


    it('should link the model of a row', inject(function(elementRegistry) {

      // given
      fieldOptions.answers.process = [ { value: 'leadProcess' }, { value: 'invoiceProcess' } ];

      select('PI_Lead')();

      // when
      TestHelper.triggerEvent(domQueryAll('[data-ref-rows] tr', container)[1], 'click');

      // then
      expect(bodyOf(elementRegistry, 'PI_Lead')).to.equal('invoiceProcess');
      expect(rows()[1]).to.match(/\*$/);
    }));


    it('should switch between a model and an expression', function() {

      // given
      select('PI_Lead')();

      var pane = function(mode) {
        return domQuery('[data-ref-pane="' + mode + '"]', container).classList.contains('cpp-ref-pane-off');
      };

      // when
      TestHelper.triggerEvent(domQuery('.cpp-model-reference-switch [data-ref-show="expression"]', container), 'click');

      // then
      expect(reference().getAttribute('data-ref-mode')).to.equal('expression');
      expect(pane('expression')).to.be.false;
      expect(pane('link')).to.be.true;

      // when
      TestHelper.triggerEvent(domQuery('.cpp-model-reference-switch [data-ref-show="link"]', container), 'click');

      // then
      expect(pane('link')).to.be.false;
    });


    it('should create a model through the host, and link it', function(done) {

      // given
      fieldOptions.create = function(kind, values) {
        this.created.push({ kind: kind, values: values });

        return Promise.resolve(values.key);
      };

      select('PI_Lead')();

      expect(reference().classList.contains('cpp-can-create')).to.be.true;

      TestHelper.triggerEvent(domQuery('[data-ref-prompt="create"] [data-ref-show="create"]', container), 'click');

      // when
      TestHelper.triggerValue(domQuery('[data-ref-create-name]', container), 'Create New Lead', 'input');
      TestHelper.triggerEvent(domQuery('[data-ref-create]', container), 'click');

      // then
      setTimeout(function() {
        expect(fieldOptions.created).to.eql([
          { kind: 'process', values: { name: 'Create New Lead', key: 'createNewLead', description: '' } }
        ]);

        inject(function(elementRegistry) {
          expect(bodyOf(elementRegistry, 'PI_Lead')).to.equal('createNewLead');
        })();

        expect(reference().getAttribute('data-ref-mode')).to.equal('link');

        done();
      }, 0);
    });


    it('should say what is missing to create a model', function() {

      // given
      fieldOptions.create = function() {
        throw new Error('not expected');
      };

      select('PI_Lead')();

      // when
      TestHelper.triggerEvent(domQuery('[data-ref-create]', container), 'click');

      // then
      expect(domQuery('[data-ref-create-error]', container).textContent).to.equal('A name and a key are required');
    });


    it('should show the host\'s note in the info box', function() {

      // given
      fieldOptions.notes.process = 'Choose the folder with the models in the Model Hierarchy.';

      // when
      select('PI_Lead')();

      // then
      var help = domQuery('[data-group="reference"] .cpp-dialog-help', container);

      expect(help.textContent).to.contain('Reference to the BPMN process model');
      expect(help.querySelector('.cpp-dialog-help-note').textContent)
        .to.equal('Choose the folder with the models in the Model Hierarchy.');
    });

  });


  it('should suggest a key for a name', function() {
    expect(keyFor('Create New Lead')).to.equal('createNewLead');
    expect(keyFor('  lead -- review 2 ')).to.equal('leadReview2');
    expect(keyFor('ABC')).to.equal('aBC');
  });

});
