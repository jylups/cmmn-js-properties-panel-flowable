'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domClasses = require('min-dom').classes,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    camundaModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


// the Type of a task that refers to an element of the file
function refType(container) {
  return domQuery('[data-entry="callableRefType"] select', container);
}

function getInput(container, selector) {
  return domQuery('input[name="' + selector + '"]', container);
}

function getSelect(container, selector) {
  return domQuery('select[name="' + selector + '"]', container);
}


describe('callable-properties', function() {

  var diagramXML = require('./Callable.cmmn');

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
    moddleExtensions: { camunda: camundaModdlePackage }
  }));


  beforeEach(inject(function(commandStack, propertiesPanel) {

    var undoButton = document.createElement('button');
    undoButton.textContent = 'UNDO';

    undoButton.addEventListener('click', function() {
      commandStack.undo();
    });

    container.appendChild(undoButton);

    propertiesPanel.attachTo(container);
  }));


  describe('get', function() {

    describe('# Decision Task', function() {

      var bo;

      beforeEach(inject(function(elementRegistry, selection) {

        // given
        var item = elementRegistry.get('PlanItem_DecisionTask_Valid');
        selection.select(item);

        bo = item.businessObject.definitionRef;

      }));


      it('should fetch the callableRefType of a decision task definition', inject(function(propertiesPanel) {

        var field = getSelect(propertiesPanel._container, 'type');

        // when selecting element

        // then
        expect(field.value).to.equal('ref');

      }));


      it('should fetch the decisionRef of a decision task definition', inject(function(propertiesPanel) {

        var field = getInput(propertiesPanel._container, 'decisionRef');

        // when selecting element

        // then
        expect(field.value).to.equal(bo.get('decisionRef'));

      }));

    });

    describe('# Case Task', function() {

      var bo;

      beforeEach(inject(function(elementRegistry, selection) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Valid');
        selection.select(item);

        bo = item.businessObject.definitionRef;

      }));


      it('should fetch the callableRefType of a case task definition', inject(function(propertiesPanel) {

        var field = getSelect(propertiesPanel._container, 'type');

        // when selecting element

        // then
        expect(field.value).to.equal('ref');

      }));


      it('should fetch the caseRef of a case task definition', inject(function(propertiesPanel) {

        var field = getInput(propertiesPanel._container, 'caseRef');

        // when selecting element

        // then
        expect(field.value).to.equal(bo.get('caseRef'));

      }));

    });

    describe('# Process Task', function() {

      var bo;

      beforeEach(inject(function(elementRegistry, selection) {

        // given
        var item = elementRegistry.get('PlanItem_ProcessTask_Valid');
        selection.select(item);

        bo = item.businessObject.definitionRef;

      }));


      it('should show a Process reference instead of a type (jylups/cmmn-js-env#98)', inject(function(propertiesPanel) {

        // when selecting element

        // then
        expect(refType(propertiesPanel._container)).not.to.exist;
        expect(domQuery('[data-model-reference="process"]', propertiesPanel._container)).to.exist;

      }));


      it('should fetch the processRef of a process task definition', inject(function(propertiesPanel) {

        var field = getInput(propertiesPanel._container, 'processRefExpression');

        // when selecting element

        // then
        expect(field.value).to.equal(bo.get('processRefExpression').get('body'));

      }));

    });


    describe('# Case Task Without Properties', function() {

      beforeEach(inject(function(elementRegistry, selection) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Without_Properties');
        selection.select(item);

      }));


      it('should offer a Case reference (jylups/cmmn-js-env#98)', inject(function(propertiesPanel) {

        // when selecting element

        // then
        expect(refType(propertiesPanel._container)).not.to.exist;
        expect(getInput(propertiesPanel._container, 'caseRefExpression').value).to.equal('');

      }));

    });

  });


  describe('validation errors', function() {

    describe('# Case Task', function() {

      beforeEach(inject(function(elementRegistry, selection) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Invalid');
        selection.select(item);

      }));


      it('should be shown if callableRefType is set and caseRef is empty', inject(function(propertiesPanel) {

        var callableRefType = getSelect(propertiesPanel._container, 'type');
        var ref = getInput(propertiesPanel._container, 'caseRef');

        // when selecting element

        // then
        expect(callableRefType.value).to.equal('ref');
        expect(domClasses(ref).has('invalid')).to.be.true;

      }));

    });

    describe('# Decision Task', function() {

      beforeEach(inject(function(elementRegistry, selection) {

        // given
        var item = elementRegistry.get('PlanItem_DecisionTask_Invalid');
        selection.select(item);

      }));


      it('should be shown if callableRefType is set and decisionRef is empty', inject(function(propertiesPanel) {

        var callableRefType = getSelect(propertiesPanel._container, 'type');
        var ref = getInput(propertiesPanel._container, 'decisionRef');

        // when selecting element

        // then
        expect(callableRefType.value).to.equal('ref');
        expect(domClasses(ref).has('invalid')).to.be.true;

      }));

    });

    describe('# Process Task', function() {

      beforeEach(inject(function(elementRegistry, selection) {

        // given
        var item = elementRegistry.get('PlanItem_ProcessTask_Invalid');
        selection.select(item);

      }));


      it('should be shown if processRefExpression is empty', inject(function(propertiesPanel) {

        var ref = getInput(propertiesPanel._container, 'processRefExpression');

        // when selecting element

        // then
        expect(domClasses(ref).has('invalid')).to.be.true;

      }));

    });

  });


  describe('set', function() {

    describe('# caseRef', function() {

      var bo, field;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Invalid');
        selection.select(item);

        bo = item.businessObject.definitionRef;

        field = getInput(propertiesPanel._container, 'caseRef');

        // when

        TestHelper.triggerValue(field, 'FOO', 'change');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field.value).to.equal('FOO');
          expect(domClasses(field).has('invalid')).to.be.false;
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field.value).to.equal('');
          expect(domClasses(field).has('invalid')).to.be.true;
        }));


        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field.value).to.equal('FOO');
          expect(domClasses(field).has('invalid')).to.be.false;
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          expect(bo.get('caseRef')).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(bo.get('caseRef')).to.equal('');
        }));


        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(bo.get('caseRef')).to.equal('FOO');
        }));

      });

    });

    describe('# decisionRef', function() {

      var bo, field;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_DecisionTask_Invalid');
        selection.select(item);

        bo = item.businessObject.definitionRef;

        field = getInput(propertiesPanel._container, 'decisionRef');

        // when

        TestHelper.triggerValue(field, 'FOO', 'change');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field.value).to.equal('FOO');
          expect(domClasses(field).has('invalid')).to.be.false;
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field.value).to.equal('');
          expect(domClasses(field).has('invalid')).to.be.true;
        }));


        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field.value).to.equal('FOO');
          expect(domClasses(field).has('invalid')).to.be.false;
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          expect(bo.get('decisionRef')).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(bo.get('decisionRef')).to.equal('');
        }));


        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(bo.get('decisionRef')).to.equal('FOO');
        }));

      });

    });

    describe('# processRefExpression', function() {

      var bo, field;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_ProcessTask_Invalid');
        selection.select(item);

        bo = item.businessObject.definitionRef;

        field = getInput(propertiesPanel._container, 'processRefExpression');

        // when

        TestHelper.triggerValue(field, 'FOO', 'change');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field.value).to.equal('FOO');
          expect(domClasses(field).has('invalid')).to.be.false;
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field.value).to.equal('');
          expect(domClasses(field).has('invalid')).to.be.true;
        }));


        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field.value).to.equal('FOO');
          expect(domClasses(field).has('invalid')).to.be.false;
        }));

      });


      describe('on the business object', function() {

        it('should execute', function() {
          expect(bo.get('processRefExpression').get('body')).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(bo.get('processRefExpression').get('body')).to.be.undefined;
        }));


        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(bo.get('processRefExpression').get('body')).to.equal('FOO');
        }));

      });

    });

    describe('# callableRefType', function() {

      var bo, field;

      describe(' reference -> expression', function() {

        beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

          // given
          var item = elementRegistry.get('PlanItem_CaseTask_Valid');
          selection.select(item);

          bo = item.businessObject.definitionRef;

          field = getSelect(propertiesPanel._container, 'type');

          // when

          // select 'Reference'
          field[1].selected = 'selected';
          TestHelper.triggerEvent(field, 'change');

        }));


        describe('in the DOM', function() {

          // an expression is a Case reference (jylups/cmmn-js-env#98)
          it('should execute', inject(function(propertiesPanel) {
            expect(refType(propertiesPanel._container)).not.to.exist;
            expect(getInput(propertiesPanel._container, 'caseRefExpression')).to.exist;
          }));

          it('should undo', inject(function(commandStack, propertiesPanel) {
            // when
            commandStack.undo();

            // then
            expect(refType(propertiesPanel._container).value).to.equal('ref');
          }));


          it('should redo', inject(function(commandStack, propertiesPanel) {
            // when
            commandStack.undo();
            commandStack.redo();

            // then
            expect(refType(propertiesPanel._container)).not.to.exist;
          }));

        });


        describe('on the business object', function() {

          it('should execute', function() {
            expect(bo.get('caseRefExpression')).to.exist;
            expect(bo.get('caseRef')).to.be.undefined;
          });

          it('should undo', inject(function(commandStack) {
            // when
            commandStack.undo();

            // then
            expect(bo.get('caseRefExpression')).to.be.undefined;
            expect(bo.get('caseRef')).to.exist;
          }));


          it('should redo', inject(function(commandStack) {
            // when
            commandStack.undo();
            commandStack.redo();

            // then
            expect(bo.get('caseRefExpression')).to.exist;
            expect(bo.get('caseRef')).to.be.undefined;
          }));

        });

      });

    });

  });

});
