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
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - task attributes', function() {

  var diagramXML = require('./Task.cmmn');

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

  beforeEach(inject(function(propertiesPanel) {
    propertiesPanel.attachTo(container);
  }));


  var definition;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      var item = elementRegistry.get(id);

      selection.select(item);

      definition = item.businessObject.definitionRef;
    })();
  }

  function getEntry(id) {
    return domQuery('[data-entry="' + id + '"]', container);
  }

  function getField(name) {
    return domQuery('[name="' + name + '"]', container);
  }

  function getGroup(id) {
    return domQuery('[data-group="' + id + '"]', container);
  }

  function isShown(node) {
    return !!node && !domClasses(node).has('cpp-hidden');
  }

  function undo() {
    inject(function(commandStack) {
      commandStack.undo();
    })();
  }

  function setValue(name, value) {
    TestHelper.triggerValue(getField(name), value, 'change');
  }

  function click(name) {
    TestHelper.triggerEvent(getField(name), 'click');
  }


  describe('java task', function() {

    beforeEach(function() {
      select('PI_Java');
    });


    it('should show the type, implementation and java fields', function() {

      // then
      expect(isShown(getGroup('implementation'))).to.be.true;

      expect(getField('taskType').value).to.eql('java');
      expect(getField('taskImplementation').value).to.eql('class');
      expect(getField('taskClass').value).to.eql('org.example.Delegate');
      expect(getField('taskResultVariableName').value).to.eql('result');
      expect(getField('taskFormKey').value).to.eql('javaForm');

      expect(isShown(getEntry('taskClass'))).to.be.true;
      expect(isShown(getEntry('taskExpression'))).to.be.false;
      expect(isShown(getEntry('taskScriptFormat'))).to.be.false;
      expect(isShown(getEntry('taskTopic'))).to.be.false;
      expect(isShown(getEntry('taskLabel'))).to.be.false;
    });


    it('should switch to an expression', function() {

      // when
      setValue('taskImplementation', 'expression');

      // then
      expect(definition.get('flowable:class')).not.to.exist;
      expect(definition.get('flowable:expression')).to.eql('');

      expect(isShown(getEntry('taskClass'))).to.be.false;
      expect(isShown(getEntry('taskExpression'))).to.be.true;

      // when
      undo();

      // then
      expect(definition.get('flowable:class')).to.eql('org.example.Delegate');
      expect(definition.get('flowable:expression')).not.to.exist;
    });


    it('should remove the java attributes when the type changes', function() {

      // when
      setValue('taskType', 'script');

      // then
      expect(definition.get('flowable:type')).to.eql('script');
      expect(definition.get('flowable:class')).not.to.exist;
      expect(definition.get('flowable:formKey')).not.to.exist;

      // a script task has a result variable as well
      expect(definition.get('flowable:resultVariableName')).to.eql('result');

      expect(isShown(getEntry('taskScriptFormat'))).to.be.true;
      expect(isShown(getEntry('taskClass'))).to.be.false;

      // when
      undo();

      // then
      expect(definition.get('flowable:type')).to.eql('java');
      expect(definition.get('flowable:class')).to.eql('org.example.Delegate');
      expect(definition.get('flowable:formKey')).to.eql('javaForm');
    });


    it('should remove the type', function() {

      // when
      setValue('taskType', '');

      // then
      expect(definition.get('flowable:type')).not.to.exist;
      expect(definition.get('flowable:class')).not.to.exist;
      expect(definition.get('flowable:resultVariableName')).not.to.exist;
    });


    it('should change the class', function() {

      // when
      TestHelper.triggerValue(getField('taskClass'), 'org.example.Other', 'change');

      // then
      expect(definition.get('flowable:class')).to.eql('org.example.Other');
    });

  });


  describe('case page', function() {

    beforeEach(function() {
      select('PI_CasePage');
    });


    it('should show the case page fields', function() {

      // then
      expect(getField('taskFormKey').value).to.eql('pageKey');
      expect(getField('taskLabel').value).to.eql('Overview');

      expect(isShown(getEntry('taskAssignee'))).to.be.true;
      expect(isShown(getEntry('taskFormFieldValidation'))).to.be.false;
      expect(isShown(getEntry('taskImplementation'))).to.be.false;
    });


    it('should use the same deployment by default', function() {

      // then
      expect(getField('taskCasePageSameDeployment').checked).to.be.true;

      // when
      click('taskCasePageSameDeployment');

      // then
      expect(definition.get('flowable:sameDeployment')).to.be.false;

      // when
      click('taskCasePageSameDeployment');

      // then
      expect(definition.get('flowable:sameDeployment')).not.to.exist;
    });

  });


  describe('asynchronous continuations', function() {

    function getChoice(name, value) {
      return domQuery('[name="' + name + '"][value="' + value + '"]', container);
    }


    it('should show No, Yes exclusive or Yes non-exclusive, as Flowable Design', function() {

      // when
      select('PI_Async');

      // then
      expect(getChoice('taskAsync', 'exclusive').checked).to.be.true;
      expect(getChoice('taskAsyncLeave', 'no').checked).to.be.true;
      expect(getEntry('taskExclusive')).not.to.exist;
    });


    it('should make a task asynchronous and non-exclusive', function() {

      // given
      select('PI_Plain');

      expect(getChoice('taskAsync', 'no').checked).to.be.true;

      // when
      TestHelper.triggerEvent(getChoice('taskAsync', 'nonExclusive'), 'click');

      // then
      expect(definition.get('flowable:async')).to.be.true;
      expect(definition.get('flowable:exclusive')).to.be.false;

      // when
      undo();

      // then
      expect(definition.get('flowable:async')).not.to.exist;
      expect(definition.get('flowable:exclusive')).not.to.exist;
    });


    it('should leave asynchronously and exclusively, Flowable\'s default', function() {

      // given
      select('PI_Plain');

      // when
      TestHelper.triggerEvent(getChoice('taskAsyncLeave', 'exclusive'), 'click');

      // then
      expect(definition.get('flowable:asyncLeave')).to.be.true;
      expect(definition.get('flowable:asyncLeaveExclusive')).not.to.exist;
    });


    it('should remove both attributes for No', function() {

      // given
      select('PI_Async');

      // when
      TestHelper.triggerEvent(getChoice('taskAsync', 'no'), 'click');

      // then
      expect(definition.get('flowable:async')).not.to.exist;
      expect(definition.get('flowable:exclusive')).not.to.exist;
    });


    it('should apply to every task', function() {

      // when
      select('PI_Decision');

      // then
      expect(isShown(getGroup('execution'))).to.be.true;
      expect(isShown(getGroup('implementation'))).to.be.false;
      expect(getEntry('taskSameDeployment')).not.to.exist;
    });

  });


  it('should edit the blocking expression', function() {

    // given
    select('PI_Async');

    expect(getField('taskBlockingExpression').value).to.eql('${blocking}');

    // when
    TestHelper.triggerValue(getField('taskBlockingExpression'), '', 'change');

    // then
    expect(definition.get('flowable:isBlockingExpression')).not.to.exist;
  });


  describe('same deployment', function() {

    it('should default to true for a human task', function() {

      // given
      select('PI_Human');

      expect(isShown(getGroup('implementation'))).to.be.false;
      expect(getField('taskSameDeployment').checked).to.be.true;

      // when
      click('taskSameDeployment');

      // then
      expect(definition.get('flowable:sameDeployment')).to.be.false;
    });


    it('should default to false for a process task', function() {

      // given
      select('PI_Process');

      expect(getField('taskSameDeployment').checked).to.be.false;

      // when
      click('taskSameDeployment');

      // then
      expect(definition.get('flowable:sameDeployment')).to.be.true;
    });

  });


  // the panel showed or disabled the entries of the new element for the
  // previous one, and failed for a callable task after another task
  it('should switch between all kinds of tasks', function() {

    // when
    [ 'PI_CasePage', 'PI_Plain', 'PI_Async', 'PI_Human', 'PI_Process', 'PI_Decision', 'PI_Java', 'PI_Process' ]
      .forEach(select);

    // then
    expect(getField('childIdVariableName').value).to.eql('processId');
  });


  describe('process task', function() {

    beforeEach(function() {
      select('PI_Process');
    });


    it('should show the child task fields', function() {

      // then
      expect(getField('childBusinessKey').value).to.eql('${key}');
      expect(getField('childInheritBusinessKey').checked).to.be.false;
      expect(getField('childInheritVariables').checked).to.be.true;
      expect(getField('childIdVariableName').value).to.eql('processId');
      expect(getField('childFallbackToDefaultTenant').checked).to.be.false;
    });


    it('should inherit the business key', function() {

      // when
      click('childInheritBusinessKey');

      // then
      expect(definition.get('flowable:inheritBusinessKey')).to.be.true;

      // when
      undo();

      // then
      expect(definition.get('flowable:inheritBusinessKey')).not.to.exist;
    });

  });

});
