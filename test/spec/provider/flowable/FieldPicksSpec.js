'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject, Promise */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - values to pick and open (#90)', function() {

  var diagramXML = require('./ReferencedModels.cmmn');

  var container;

  // the host's options, by kind: a list, or a promise of one
  var fieldOptions = {
    options: function(kind, context) {
      this.asked.push({ kind: kind, element: context.element && context.element.id });

      return this.answers[kind];
    }
  };

  // the host's referenced models: it can open the keys in `openable`
  var referencedModels = {
    lookup: function(models) {
      var self = this;

      this.looked.push(models);

      return {
        models: models.map(function(model) {
          return { canOpen: self.openable.indexOf(model.key) !== -1 };
        })
      };
    },
    open: function(model) {
      this.opened.push(model);
    }
  };

  beforeEach(function() {
    container = TestContainer.get(this);

    fieldOptions.asked = [];
    fieldOptions.answers = {};
    referencedModels.looked = [];
    referencedModels.opened = [];
    referencedModels.openable = [];
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

  function input(name) {
    return domQuery('input[name="' + name + '"]', container);
  }

  function listOf(field) {
    return Array.prototype.map.call(field.list ? field.list.options : [], function(option) {
      return option.label ? option.value + ' · ' + option.label : option.value;
    });
  }

  function openButton(field) {
    return domQuery('[data-pick-open]', field.parentNode);
  }

  function isShown(node) {
    return !node.classList.contains('cpp-hidden');
  }


  describe('without a host', function() {

    beforeEach(bootstrap(false));
    beforeEach(select('PI_Lead'));


    it('should keep a plain text field', function() {

      // given
      var field = input('processRefExpression');

      // then
      expect(field.getAttribute('data-pick')).to.equal('process');
      expect(listOf(field)).to.eql([]);
      expect(isShown(openButton(field))).to.be.false;
    });

  });


  describe('with a host', function() {

    beforeEach(bootstrap(true));


    it('should offer the host\'s values for the kind of field', function() {

      // given
      fieldOptions.answers.process = [
        { value: 'leadProcess', label: 'Lead Process', data: { file: 'processes/lead.bpmn' } },
        { value: 'invoiceProcess' },
        { value: '' }
      ];

      // when
      select('PI_Lead')();

      // then
      var field = input('processRefExpression');

      expect(listOf(field)).to.eql([ 'leadProcess · Lead Process', 'invoiceProcess' ]);
      expect(fieldOptions.asked).to.deep.include({ kind: 'process', element: 'PI_Lead' });
    });


    it('should fill the list when the host answers later', function(done) {

      // given
      var answer;

      fieldOptions.answers.form = new Promise(function(resolve) {
        answer = resolve;
      });

      select('PI_Review')();

      var field = input('formKey');

      expect(listOf(field)).to.eql([]);

      // when
      answer([ { value: 'reviewForm', label: 'Review' } ]);

      // then
      setTimeout(function() {
        expect(listOf(field)).to.eql([ 'reviewForm · Review' ]);
        done();
      }, 0);
    });


    it('should offer users after the ones already in a list', function() {

      // given
      fieldOptions.answers.user = [ { value: 'kermit' }, { value: 'gonzo' }, { value: 'fozzie' } ];

      select('PI_Review')();

      var field = input('candidateUsers');

      // when
      TestHelper.triggerValue(field, 'kermit,', 'input');

      // then: at once, while typing
      expect(listOf(field)).to.eql([ 'kermit, gonzo', 'kermit, fozzie' ]);

      // when
      TestHelper.triggerValue(input('candidateUsers'), 'kermit, gonzo, ', 'change');

      // then
      expect(listOf(input('candidateUsers'))).to.eql([ 'kermit, gonzo, fozzie' ]);

      // when: the last one is being typed, so it is offered
      TestHelper.triggerValue(input('candidateUsers'), 'kermit, go', 'input');

      // then
      expect(listOf(input('candidateUsers'))).to.eql([ 'kermit, gonzo', 'kermit, fozzie' ]);
      expect(isShown(openButton(field))).to.be.false;
    });


    it('should open the model a field links to, with the host\'s data', function() {

      // given
      fieldOptions.answers.process = [ { value: 'leadProcess', data: { file: 'processes/lead.bpmn' } } ];
      referencedModels.openable = [ 'leadProcess' ];

      // when
      select('PI_Lead')();

      // then
      var field = input('processRefExpression'),
          button = openButton(field);

      expect(isShown(button)).to.be.true;
      expect(button.getAttribute('aria-label')).to.equal('Open leadProcess');

      // when
      TestHelper.triggerEvent(button, 'click');

      // then
      expect(referencedModels.opened).to.eql([
        { kind: 'process', key: 'leadProcess', expression: false, data: { file: 'processes/lead.bpmn' } }
      ]);
    });


    it('should not offer to open a model the host can\'t open', function() {

      // when
      select('PI_Lead')();

      // then
      expect(isShown(openButton(input('processRefExpression')))).to.be.false;
    });


    it('should not ask about an expression', function() {

      // when
      select('PI_Decision')();

      // then
      var field = input('decisionRefExpression');

      expect(field.value).to.equal('${decisionKey}');
      expect(isShown(openButton(field))).to.be.false;
      expect(referencedModels.looked).to.eql([]);
    });


    it('should ask again when the host has other values', inject(function(eventBus) {

      // given
      fieldOptions.answers.process = [ { value: 'leadProcess' } ];

      select('PI_Lead')();

      fieldOptions.answers.process = [ { value: 'leadProcess' }, { value: 'newProcess' } ];

      // when
      eventBus.fire('fieldOptions.changed');

      // then
      expect(listOf(input('processRefExpression'))).to.eql([ 'leadProcess', 'newProcess' ]);
    }));

  });

});
