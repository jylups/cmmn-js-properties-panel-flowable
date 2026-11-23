'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domClasses = require('min-dom').classes,
    is = require('@jylups/cmmn-js/lib/util/ModelUtil').is,
    forEach = require('lodash/forEach'),
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


function getInput(container, selector) {
  return domQuery('input[name="' + selector + '"]', container);
}

function getTextarea(container, name) {
  return domQuery('textarea[name="' + name + '"]', container);
}

function getSelect(container, selector) {
  return domQuery('select[id="' + selector + '"]', container);
}

function getAddButton(container, selector) {
  return domQuery('div[data-entry=' + selector + '] button[data-action=createElement]', container);
}

function getRemoveButton(container, selector) {
  return domQuery('div[data-entry=' + selector + '] button[data-action=removeElement]', container);
}

function getVariableMappings(extensionElements, type) {
  var mappings = [];

  if (extensionElements && extensionElements.values) {
    forEach(extensionElements.values, function(value) {
      if (is(value, type) &&
          (typeof value.source !== 'undefined' ||
           typeof value.sourceExpression !== 'undefined' ||
           value.variables === 'all')) {
        mappings.push(value);
      }
    });
  }
  return mappings;
}

function selectVariableMapping(propertiesPanel, selectorId) {
  var inMappings = getSelect(propertiesPanel._container, selectorId);

  inMappings.selectedIndex = 0;
  TestHelper.triggerEvent(inMappings, 'change');
}

var FLOWABLE_IN_EXTENSION_ELEMENT = 'flowable:In',
    FLOWABLE_OUT_EXTENSION_ELEMENT = 'flowable:Out';


describe('variable-mapping-properties', function() {

  var diagramXML = require('./VariableMapping.cmmn');

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

    describe('# Case Task', function() {

      describe('# flowable:in', function() {

        var variableMappings;

        beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

          // given
          var item = elementRegistry.get('PlanItem_CaseTask_Source');
          selection.select(item);

          var bo = item.businessObject.definitionRef;
          variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);

          // select existing in-mapping
          selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        }));


        it('should fetch the source of a case task definition', inject(function(propertiesPanel) {

          var field = getInput(propertiesPanel._container, 'source');

          // when selecting element

          // then
          expect(field.value).to.equal(variableMappings[0].get('source'));

        }));


        it('should fetch the target of a case task definition', inject(function(propertiesPanel) {

          var field = getInput(propertiesPanel._container, 'target');

          // when selecting element

          // then
          expect(field.value).to.equal(variableMappings[0].get('target'));

        }));


      });

    });

    describe('# Process Task', function() {

      var variableMappings;

      describe('# flowable:in', function() {

        beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

          // given
          var item = elementRegistry.get('PlanItem_ProcessTask_SourceExpression');
          selection.select(item);

          var bo = item.businessObject.definitionRef;
          variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);

          // select existing in-mapping
          selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        }));


        it('should fetch the sourceExpression of a process task definition', inject(function(propertiesPanel) {

          var field = getTextarea(propertiesPanel._container, 'sourceExpression');

          // when selecting element

          // then
          expect(field.value).to.equal(variableMappings[0].get('sourceExpression'));
          expect(getInput(propertiesPanel._container, 'source').value).to.equal('');

        }));


        it('should fetch the target of a process task definition', inject(function(propertiesPanel) {

          var field = getInput(propertiesPanel._container, 'target');

          // when selecting element

          // then
          expect(field.value).to.equal(variableMappings[0].get('target'));

        }));


      });

    });


  });


  describe('validation errors', function() {

    describe('# Case Task', function() {

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Invalid');
        selection.select(item);

        // select existing in-mapping
        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

      }));

      it('should be shown if the source variable and expression are empty', inject(function(propertiesPanel) {

        var field = getInput(propertiesPanel._container, 'source'),
            expression = getTextarea(propertiesPanel._container, 'sourceExpression');

        // when selecting element

        // then
        expect(domClasses(field).has('invalid')).to.be.true;
        expect(domClasses(expression).has('invalid')).to.be.true;

      }));

      it('should be shown if the target is empty', inject(function(propertiesPanel) {

        var field = getInput(propertiesPanel._container, 'target');

        // when selecting element

        // then
        expect(domClasses(field).has('invalid')).to.be.true;

      }));

    });

    describe('# Process Task', function() {

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_ProcessTask_Invalid');
        selection.select(item);

        // select existing in-mapping
        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

      }));

      it('should be shown if an empty source expression is the only source', inject(function(propertiesPanel) {

        var field = getTextarea(propertiesPanel._container, 'sourceExpression');

        // when selecting element

        // then
        expect(domClasses(field).has('invalid')).to.be.true;

      }));

      it('should be shown if the target of an expression mapping is empty', inject(function(propertiesPanel) {

        var field = getInput(propertiesPanel._container, 'target');

        // when selecting element

        // then
        expect(domClasses(field).has('invalid')).to.be.true;

      }));

    });

  });


  describe('set', function() {

    describe('# source', function() {

      var field, variableMappings;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Invalid');
        selection.select(item);

        var bo = item.businessObject.definitionRef;
        variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);

        // select existing in-mapping
        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        field = getInput(propertiesPanel._container, 'source');

        // when

        TestHelper.triggerValue(field, 'FOO', 'change');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field.value).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field.value).to.equal('');
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field.value).to.equal('FOO');
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          expect(variableMappings[0].get('source')).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(variableMappings[0].get('source')).to.equal('');
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(variableMappings[0].get('source')).to.equal('FOO');
        }));

      });

    });

    describe('# sourceExpression', function() {

      var field, variableMappings;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_ProcessTask_Invalid');
        selection.select(item);

        var bo = item.businessObject.definitionRef;
        variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);

        // select existing in-mapping
        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        field = getTextarea(propertiesPanel._container, 'sourceExpression');

        // when

        TestHelper.triggerValue(field, 'FOO', 'change');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field.value).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field.value).to.equal('');
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field.value).to.equal('FOO');
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          expect(variableMappings[0].get('sourceExpression')).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(variableMappings[0].get('sourceExpression')).to.equal('');
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(variableMappings[0].get('sourceExpression')).to.equal('FOO');
        }));

      });

    });

    describe('# target', function() {

      var field, variableMappings;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_ProcessTask_Invalid');
        selection.select(item);

        var bo = item.businessObject.definitionRef;
        variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);

        // select existing in-mapping
        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        field = getInput(propertiesPanel._container, 'target');

        // when

        TestHelper.triggerValue(field, 'FOO', 'change');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field.value).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field.value).to.equal('');
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field.value).to.equal('FOO');
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          expect(variableMappings[0].get('target')).to.equal('FOO');
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(variableMappings[0].get('target')).to.be.undefined;
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(variableMappings[0].get('target')).to.equal('FOO');
        }));

      });

    });

    describe('# a variable or an expression', function() {

      function mappingOf(elementRegistry, id) {
        var bo = elementRegistry.get(id).businessObject.definitionRef;

        return getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT)[0];
      }


      it('should replace the variable with an expression', inject(
        function(elementRegistry, selection, propertiesPanel, commandStack) {

          // given
          selection.select(elementRegistry.get('PlanItem_CaseTask_Source'));
          selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

          var mapping = mappingOf(elementRegistry, 'PlanItem_CaseTask_Source');

          // when
          TestHelper.triggerValue(getTextarea(propertiesPanel._container, 'sourceExpression'), '${amount * 2}', 'change');

          // then
          expect(mapping.get('source')).not.to.exist;
          expect(mapping.get('sourceExpression')).to.equal('${amount * 2}');
          expect(getInput(propertiesPanel._container, 'source').value).to.equal('');

          // when
          commandStack.undo();

          // then
          expect(mapping.get('source')).to.equal('mySource');
          expect(mapping.get('sourceExpression')).not.to.exist;
        }
      ));


      it('should replace the expression with a variable', inject(
        function(elementRegistry, selection, propertiesPanel) {

          // given
          selection.select(elementRegistry.get('PlanItem_ProcessTask_SourceExpression'));
          selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

          var mapping = mappingOf(elementRegistry, 'PlanItem_ProcessTask_SourceExpression');

          // when
          TestHelper.triggerValue(getInput(propertiesPanel._container, 'source'), 'amount', 'change');

          // then
          expect(mapping.get('source')).to.equal('amount');
          expect(mapping.get('sourceExpression')).not.to.exist;
          expect(getTextarea(propertiesPanel._container, 'sourceExpression').value).to.equal('');
        }
      ));


      it('should keep the other side when one is cleared', inject(
        function(elementRegistry, selection, propertiesPanel) {

          // given
          selection.select(elementRegistry.get('PlanItem_ProcessTask_SourceExpression'));
          selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

          var mapping = mappingOf(elementRegistry, 'PlanItem_ProcessTask_SourceExpression');

          // when
          TestHelper.triggerValue(getInput(propertiesPanel._container, 'source'), '', 'change');

          // then
          expect(mapping.get('sourceExpression')).to.equal('${mySourceExpression}');
        }
      ));


      it('should colour the expression', inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        selection.select(elementRegistry.get('PlanItem_ProcessTask_SourceExpression'));

        // when
        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        // then
        var copy = domQuery('[data-entry="variableMapping-sourceExpression"] .cpp-code-highlight', propertiesPanel._container);

        expect(copy.textContent).to.equal('${mySourceExpression}');
        expect(domQuery('.cpp-code-variable', copy).textContent).to.equal('mySourceExpression');

        // when
        var field = getTextarea(propertiesPanel._container, 'sourceExpression');

        TestHelper.triggerValue(field, '${a and b}', 'input');

        // then
        expect(domQuery('.cpp-code-keyword', copy).textContent).to.equal('and');
      }));


      it('should offer the case variables', inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        selection.select(elementRegistry.get('PlanItem_CaseTask_Source'));

        // when
        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        // then
        var input = getInput(propertiesPanel._container, 'source'),
            list = domQuery('#' + input.getAttribute('list'), propertiesPanel._container);

        expect(Array.prototype.map.call(list.options, function(option) {
          return option.value;
        })).to.eql([ 'mySource' ]);

        // a new variable is offered at once
        TestHelper.triggerValue(input, 'claimAmount', 'change');

        expect(Array.prototype.map.call(list.options, function(option) {
          return option.value;
        })).to.eql([ 'claimAmount' ]);
      }));

    });

  });


  describe('add', function() {

    describe('# flowable:in', function() {

      var bo, field;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Empty');
        selection.select(item);

        bo = item.businessObject.definitionRef;

        var button = getAddButton(propertiesPanel._container, 'variableMapping-in');
        field = getSelect(propertiesPanel._container, 'flowable-extensionElements-variableMapping-in');

        // when

        TestHelper.triggerEvent(button, 'click');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field).to.have.length(1);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field).to.have.length(0);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field).to.have.length(1);
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(1);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(0);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(1);
        }));

      });

    });

    describe('# flowable:out', function() {

      var bo, field;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Empty');
        selection.select(item);

        bo = item.businessObject.definitionRef;

        var button = getAddButton(propertiesPanel._container, 'variableMapping-out');
        field = getSelect(propertiesPanel._container, 'flowable-extensionElements-variableMapping-out');

        // when

        TestHelper.triggerEvent(button, 'click');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field).to.have.length(1);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field).to.have.length(0);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field).to.have.length(1);
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_OUT_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(1);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_OUT_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(0);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_OUT_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(1);
        }));

      });

    });

  });


  describe('remove', function() {

    describe('# flowable:in', function() {

      var bo, field;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Source');
        selection.select(item);

        bo = item.businessObject.definitionRef;

        var button = getRemoveButton(propertiesPanel._container, 'variableMapping-in');
        field = getSelect(propertiesPanel._container, 'flowable-extensionElements-variableMapping-in');

        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        // when

        TestHelper.triggerEvent(button, 'click');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field).to.have.length(0);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field).to.have.length(1);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field).to.have.length(0);
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(0);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(1);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_IN_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(0);
        }));

      });

    });

    describe('# flowable:out', function() {

      var bo, field;

      beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

        // given
        var item = elementRegistry.get('PlanItem_CaseTask_Out_All');
        selection.select(item);

        bo = item.businessObject.definitionRef;

        var button = getRemoveButton(propertiesPanel._container, 'variableMapping-out');
        field = getSelect(propertiesPanel._container, 'flowable-extensionElements-variableMapping-out');

        selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-out');

        // when

        TestHelper.triggerEvent(button, 'click');

      }));


      describe('in the DOM', function() {

        it('should execute', function() {
          expect(field).to.have.length(0);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          expect(field).to.have.length(1);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          expect(field).to.have.length(0);
        }));

      });

      describe('on the business object', function() {

        it('should execute', function() {
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_OUT_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(0);
        });

        it('should undo', inject(function(commandStack) {
          // when
          commandStack.undo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_OUT_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(1);
        }));

        it('should redo', inject(function(commandStack) {
          // when
          commandStack.undo();
          commandStack.redo();

          // then
          var variableMappings = getVariableMappings(bo.get('extensionElements'), FLOWABLE_OUT_EXTENSION_ELEMENT);
          expect(variableMappings).to.have.length(0);
        }));

      });

    });

  });


  describe('control visibility', function() {

    function expectVisible(visible, getter, inputNode, parentElement) {

      return inject(function(propertiesPanel, selection, elementRegistry) {

        var field = getter(propertiesPanel._container, inputNode);

        if (parentElement) {
          field = field.parentElement;
        }

        // then
        if (visible) {
          expect(field).to.exist;
        } else {
          expect(domClasses(field).has('cpp-hidden')).to.be.true;
        }
      });
    }

    describe('should show', function() {

      describe('all fields when in variable mapping is selected', function() {

        beforeEach(inject(function(elementRegistry, selection, propertiesPanel) {

          var item = elementRegistry.get('PlanItem_CaseTask_Source');
          selection.select(item);

          selectVariableMapping(propertiesPanel, 'flowable-extensionElements-variableMapping-in');

        }));

        it('expression', expectVisible(true, getTextarea, 'sourceExpression'));
        it('source', expectVisible(true, getInput, 'source'));
        it('target', expectVisible(true, getInput, 'target'));

      });

    });

    describe('should hide', function() {

      describe('all fields when no variable mapping is selected', function() {

        beforeEach(inject(function(elementRegistry, selection) {

          var item = elementRegistry.get('PlanItem_CaseTask_Source');
          selection.select(item);

        }));

        it('expression', expectVisible(false, getTextarea, 'sourceExpression', true));
        it('source', expectVisible(false, getInput, 'source', true));
        it('target', expectVisible(false, getInput, 'target', true));

      });

    });

  });


});
