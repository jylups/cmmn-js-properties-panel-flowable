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
    getDefinition = require('@jylups/cmmn-js/lib/util/ModelUtil').getDefinition;

var timerProps = require('lib/provider/flowable/parts/TimerProps');


/**
 * A provider with the timer of a timer event listener only.
 */
function TimerProvider(eventBus, cmmnFactory, elementRegistry, translate) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var timerGroup = {
      id: 'timer',
      label: 'Timer',
      entries: []
    };

    timerProps(timerGroup, element, cmmnFactory, elementRegistry, translate);

    return [
      {
        id: 'general',
        label: 'General',
        groups: [ timerGroup ]
      }
    ];
  };
}

TimerProvider.$inject = [ 'eventBus', 'cmmnFactory', 'elementRegistry', 'translate' ];

inherits(TimerProvider, PropertiesActivator);

var timerProviderModule = {
  __init__: [ 'propertiesProvider' ],
  propertiesProvider: [ 'type', TimerProvider ]
};


describe('flowable - timer event listener', function() {

  var diagramXML = require('./Timer.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule, selectionModule, modelingModule,
      propertiesPanelModule, timerProviderModule
    ]
  }));

  beforeEach(inject(function(propertiesPanel) {
    propertiesPanel.attachTo(container);
  }));


  var definition;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      var element = elementRegistry.get(id);

      selection.select(element);

      definition = getDefinition(element);
    })();
  }

  function getPlanItem(id) {
    var bo;

    inject(function(elementRegistry) {
      bo = elementRegistry.get(id).businessObject;
    })();

    return bo;
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getExpressionField() {
    return domQuery('input', getEntry('timer-expression'));
  }

  function getSourceSelect() {
    return domQuery('select', getEntry('timer-startTriggerSource'));
  }

  function getEventSelect() {
    return domQuery('select', getEntry('timer-startTriggerEvent'));
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function optionValues(select) {
    return Array.prototype.map.call(select.options, function(option) {
      return option.value;
    });
  }

  function optionTexts(select) {
    return Array.prototype.map.call(select.options, function(option) {
      return option.text;
    });
  }

  function choose(select, value) {
    TestHelper.selectedByOption(select, value);
    TestHelper.triggerEvent(select, 'change');
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

  function saveXML(done, check) {
    inject(function(cmmnjs) {
      cmmnjs.saveXML({ format: false }, function(err, xml) {
        try {
          expect(err).not.to.exist;
          check(xml);
          done();
        } catch (e) {
          done(e);
        }
      });
    })();
  }

  function timerXML(xml, id) {
    var match = new RegExp('<cmmn:timerEventListener id="' + id + '"(?:\\s*/>|[^]*?</cmmn:timerEventListener>)')
      .exec(xml);

    return match && match[0];
  }


  describe('get', function() {

    it('should show the expression and the start trigger', function() {

      // when
      select('PI_Timer_1');

      // then
      expect(getExpressionField().value).to.eql('PT3H');
      expect(getSourceSelect().value).to.eql('PI_Stage');
      expect(isShown(getEntry('timer-startTriggerEvent'))).to.be.true;
      expect(getEventSelect().value).to.eql('complete');
    });


    it('should show a timer without expression and start trigger', function() {

      // when
      select('PI_Timer_2');

      // then
      expect(getExpressionField().value).to.eql('');
      expect(getSourceSelect().value).to.eql('');
      expect(isShown(getEntry('timer-startTriggerSource'))).to.be.true;
      expect(isShown(getEntry('timer-startTriggerEvent'))).to.be.false;
    });


    it('should list every other plan item as a source', function() {

      // when
      select('PI_Timer_1');

      // then
      expect(optionValues(getSourceSelect())).to.eql([
        '', 'PI_Stage', 'PI_TaskA', 'PI_TaskB', 'PI_TaskC', 'PI_Timer_2'
      ]);

      expect(optionTexts(getSourceSelect())).to.eql([
        'When the listener is available',
        'Stage (PI_Stage)',
        'A (PI_TaskA)',
        'PI_TaskB',
        'C (PI_TaskC)',
        'PI_Timer_2'
      ]);
    });


    it('should not list the listener itself as a source', function() {

      // when
      select('PI_Timer_2');

      // then
      expect(optionValues(getSourceSelect())).to.include('PI_Timer_1');
      expect(optionValues(getSourceSelect())).not.to.include('PI_Timer_2');
    });


    it('should list the plan item transitions', function() {

      // when
      select('PI_Timer_1');

      // then
      expect(optionValues(getEventSelect())).to.eql([
        'complete', 'create', 'disable', 'enable', 'exit', 'fault', 'manualStart',
        'occur', 'parentResume', 'parentSuspend', 'reactivate', 'reenable',
        'resume', 'start', 'suspend', 'terminate'
      ]);
    });


    it('should not show the timer for another element', function() {

      // when
      select('PI_TaskA');

      // then
      expect(getEntry('timer-expression')).not.to.exist;
      expect(getEntry('timer-startTriggerSource')).not.to.exist;
      expect(getEntry('timer-startTriggerEvent')).not.to.exist;
    });


    it('should not show the timer for a stage', function() {

      // when
      select('PI_Stage');

      // then
      expect(getEntry('timer-expression')).not.to.exist;
    });

  });


  describe('timer expression', function() {

    it('should change the expression', function() {

      // given
      select('PI_Timer_1');

      var expression = definition.get('timerExpression');

      // when
      TestHelper.triggerValue(getExpressionField(), 'R3/PT10M', 'change');

      // then
      expect(definition.get('timerExpression')).to.equal(expression);
      expect(expression.get('body')).to.eql('R3/PT10M');

      // when
      undo();

      // then
      expect(expression.get('body')).to.eql('PT3H');
      expect(getExpressionField().value).to.eql('PT3H');

      // when
      redo();

      // then
      expect(expression.get('body')).to.eql('R3/PT10M');
    });


    it('should create the expression', function() {

      // given
      select('PI_Timer_2');

      // when
      TestHelper.triggerValue(getExpressionField(), 'PT1H', 'change');

      // then
      var expression = definition.get('timerExpression');

      expect(expression.$instanceOf('cmmn:Expression')).to.be.true;
      expect(expression.get('body')).to.eql('PT1H');

      // when
      undo();

      // then
      expect(definition.get('timerExpression')).not.to.exist;
      expect(getExpressionField().value).to.eql('');
    });


    it('should clear the expression', function() {

      // given
      select('PI_Timer_1');

      var expression = definition.get('timerExpression');

      // when
      TestHelper.triggerValue(getExpressionField(), '', 'change');

      // then
      expect(definition.get('timerExpression')).not.to.exist;

      // when
      undo();

      // then
      expect(definition.get('timerExpression')).to.equal(expression);
      expect(getExpressionField().value).to.eql('PT3H');
    });

  });


  describe('start trigger', function() {

    it('should create a start trigger', function() {

      // given
      select('PI_Timer_2');

      // when
      choose(getSourceSelect(), 'PI_TaskA');

      // then
      var trigger = definition.get('timerStart');

      expect(trigger.$instanceOf('cmmn:PlanItemStartTrigger')).to.be.true;
      expect(trigger.get('sourceRef')).to.equal(getPlanItem('PI_TaskA'));
      expect(trigger.get('standardEvent')).to.eql('complete');

      expect(getSourceSelect().value).to.eql('PI_TaskA');
      expect(isShown(getEntry('timer-startTriggerEvent'))).to.be.true;
      expect(getEventSelect().value).to.eql('complete');

      // when
      undo();

      // then
      expect(definition.get('timerStart')).not.to.exist;
      expect(getSourceSelect().value).to.eql('');
      expect(isShown(getEntry('timer-startTriggerEvent'))).to.be.false;
    });


    it('should change the transition', function() {

      // given
      select('PI_Timer_2');
      choose(getSourceSelect(), 'PI_TaskA');

      var trigger = definition.get('timerStart');

      // when
      choose(getEventSelect(), 'exit');

      // then
      expect(trigger.get('standardEvent')).to.eql('exit');
      expect(getEventSelect().value).to.eql('exit');

      // when
      undo();

      // then
      expect(trigger.get('standardEvent')).to.eql('complete');
      expect(getEventSelect().value).to.eql('complete');

      // when
      undo();

      // then
      expect(definition.get('timerStart')).not.to.exist;
    });


    it('should change the source', function() {

      // given
      select('PI_Timer_1');

      var trigger = definition.get('timerStart');

      // when
      choose(getSourceSelect(), 'PI_TaskC');

      // then
      expect(definition.get('timerStart')).to.equal(trigger);
      expect(trigger.get('sourceRef')).to.equal(getPlanItem('PI_TaskC'));
      expect(trigger.get('standardEvent')).to.eql('complete');

      // when
      undo();

      // then
      expect(trigger.get('sourceRef')).to.equal(getPlanItem('PI_Stage'));
      expect(getSourceSelect().value).to.eql('PI_Stage');
    });


    it('should remove the start trigger', function() {

      // given
      select('PI_Timer_1');

      var trigger = definition.get('timerStart');

      // when
      choose(getSourceSelect(), '');

      // then
      expect(definition.get('timerStart')).not.to.exist;
      expect(getSourceSelect().value).to.eql('');
      expect(isShown(getEntry('timer-startTriggerEvent'))).to.be.false;

      // when
      undo();

      // then
      expect(definition.get('timerStart')).to.equal(trigger);
      expect(trigger.get('sourceRef')).to.equal(getPlanItem('PI_Stage'));
      expect(getSourceSelect().value).to.eql('PI_Stage');
      expect(isShown(getEntry('timer-startTriggerEvent'))).to.be.true;
    });

  });


  describe('export', function() {

    it('should save a new timer', function(done) {

      // given
      select('PI_Timer_2');

      // when
      TestHelper.triggerValue(getExpressionField(), 'R3/PT10M', 'change');
      choose(getSourceSelect(), 'PI_TaskA');
      choose(getEventSelect(), 'start');

      // then
      saveXML(done, function(xml) {
        var timer = timerXML(xml, 'Timer_2');

        expect(timer).to.match(
          /^<cmmn:timerEventListener id="Timer_2">\s*<cmmn:timerExpression[^>]*>R3\/PT10M<\/cmmn:timerExpression>/
        );
        expect(timer).to.match(
          /<cmmn:planItemStartTrigger [^>]*sourceRef="PI_TaskA"[^>]*>\s*<cmmn:standardEvent>start<\/cmmn:standardEvent>\s*<\/cmmn:planItemStartTrigger>/
        );
      });
    });


    it('should save a changed timer', function(done) {

      // given
      select('PI_Timer_1');

      // when
      choose(getSourceSelect(), 'PI_TaskB');
      choose(getEventSelect(), 'exit');

      // then
      saveXML(done, function(xml) {
        var timer = timerXML(xml, 'Timer_1');

        expect(timer).to.contain('<cmmn:timerExpression>PT3H</cmmn:timerExpression>');
        expect(timer).to.contain(
          '<cmmn:planItemStartTrigger sourceRef="PI_TaskB">' +
            '<cmmn:standardEvent>exit</cmmn:standardEvent>' +
          '</cmmn:planItemStartTrigger>'
        );
      });
    });


    it('should save a cleared timer', function(done) {

      // given
      select('PI_Timer_1');

      // when
      TestHelper.triggerValue(getExpressionField(), '', 'change');
      choose(getSourceSelect(), '');

      // then
      saveXML(done, function(xml) {
        expect(timerXML(xml, 'Timer_1')).to.eql('<cmmn:timerEventListener id="Timer_1" />');
      });
    });

  });

});
