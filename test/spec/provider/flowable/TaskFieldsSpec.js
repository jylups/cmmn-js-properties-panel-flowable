'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll,
    domClasses = require('min-dom').classes,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable'),
    getFieldValue = require('lib/provider/flowable/parts/TaskFieldProps').getFieldValue;


describe('flowable - task fields', function() {

  var diagramXML = require('./TaskFields.cmmn');

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


  var element;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      element = elementRegistry.get(id);

      selection.select(element);
    })();
  }

  function definition() {
    return element.businessObject.definitionRef;
  }

  function extensions(type) {
    var extensionElements = definition().get('extensionElements');

    return ((extensionElements && extensionElements.get('values')) || []).filter(function(value) {
      return value.$type === type;
    });
  }

  function field(name) {
    return extensions('flowable:Field').filter(function(f) {
      return f.name === name;
    })[0];
  }

  function control(id) {
    return domQuery('[data-entry="' + id + '"] input, [data-entry="' + id + '"] select, ' +
      '[data-entry="' + id + '"] [contenteditable]', container);
  }

  function valueOf(id) {
    var node = control(id);

    return node.getAttribute('contenteditable') ? node.innerText : node.value;
  }


  describe('http task', function() {

    beforeEach(function() {
      select('PI_Http');
    });


    it('should show the fields, however they are written', function() {

      // then
      expect(valueOf('taskField-requestMethod')).to.equal('GET');
      expect(valueOf('taskField-requestUrl')).to.equal('${baseUrl}/orders');
      expect(control('taskField-disallowRedirects').checked).to.be.true;
      expect(control('taskField-ignoreException').checked).to.be.false;
      expect(valueOf('taskHttp-requesthandler-class')).to.equal('org.example.RequestHandler');
    });


    it('should show them in the HTTP Request section of General', function() {

      // then
      var section = domQuery('[data-tab="general"] [data-group="taskFields"]', container);

      expect(domQuery('.group-label', section).textContent).to.equal('HTTP Request');
      expect(domQuery('[data-entry="taskField-requestUrl"]', section)).to.exist;
    });


    it('should not offer flowable:class, which Flowable ignores on HTTP tasks', function() {

      // then
      expect(domQuery('[data-entry="taskHttpClass"]', container)).not.to.exist;
      expect(domQuery('[data-entry="taskField-httpActivityBehaviorClass"]', container)).to.exist;
    });


    it('should write a value as string and an expression as expression', inject(function(commandStack) {

      // when
      TestHelper.triggerValue(control('taskField-requestMethod'), 'POST', 'change');
      TestHelper.triggerValue(control('taskField-requestBody'), '${order}', 'change');

      // then
      expect(field('requestMethod').get('string')).to.equal('POST');
      expect(field('requestMethod').stringValue).not.to.exist;
      expect(field('requestBody').get('expressionElement').body).to.equal('${order}');

      // when
      commandStack.undo();
      commandStack.undo();

      // then
      expect(field('requestMethod').stringValue).to.equal('GET');
      expect(field('requestBody')).not.to.exist;
    }));


    it('should write true for a check box and remove the field when unchecked', function() {

      // when
      TestHelper.triggerEvent(control('taskField-ignoreException'), 'click');

      // then
      expect(getFieldValue(field('ignoreException'))).to.equal('true');

      // when
      TestHelper.triggerEvent(control('taskField-disallowRedirects'), 'click');

      // then
      expect(field('disallowRedirects')).not.to.exist;
    });


    it('should require the method and the URL', function() {

      // when
      TestHelper.triggerValue(control('taskField-requestUrl'), '', 'change');

      // then
      expect(field('requestUrl')).not.to.exist;
      expect(domClasses(control('taskField-requestUrl')).has('invalid')).to.be.true;
    });


    it('should remove a handler without class or delegate expression', function() {

      // when
      TestHelper.triggerValue(control('taskHttp-requesthandler-class'), '', 'change');

      // then
      expect(extensions('flowable:HttpRequestHandler')).to.be.empty;
    });


    it('should add a response handler', function() {

      // when
      TestHelper.triggerValue(control('taskHttp-responsehandler-delegateExpression'), '${handler}', 'change');

      // then
      expect(extensions('flowable:HttpResponseHandler')[0].delegateExpression).to.equal('${handler}');
    });

  });


  describe('mail task', function() {

    beforeEach(function() {
      select('PI_Mail');
    });


    it('should read string children of the CMMN namespace and expression attributes', function() {

      // then
      expect(valueOf('taskField-to')).to.equal('orders@example.com');
      expect(valueOf('taskField-subject')).to.equal('${subject}');
    });


    it('should replace the representation of a changed field', function() {

      // when
      TestHelper.triggerValue(control('taskField-subject'), 'Your order', 'change');

      // then
      var subject = field('subject');

      expect(subject.get('expression')).not.to.exist;
      expect(subject.get('string')).to.equal('Your order');
    });


    it('should keep its own order of fields', function() {

      // then
      var section = domQuery('[data-group="taskFields"]', container),
          to = domQuery('[data-entry="taskField-to"]', section),
          ignore = domQuery('[data-entry="taskField-mailIgnoreException"]', section);

      // eslint-disable-next-line no-bitwise
      expect(!!(to.compareDocumentPosition(ignore) & Node.DOCUMENT_POSITION_FOLLOWING)).to.be.true;
    });

  });


  describe('script task', function() {

    beforeEach(function() {
      select('PI_Script');
    });


    it('should show the script and its input variables', function() {

      // then
      expect(valueOf('taskField-script')).to.equal('total = a + b');
      expect(domQuery('#flowable-extensionElements-taskInParameters', container).options.length).to.equal(1);
    });


    it('should require the script', function() {

      // when
      TestHelper.triggerValue(control('taskField-script'), '', 'change');

      // then
      expect(field('script')).not.to.exist;
    });

  });


  describe('decision task', function() {

    beforeEach(function() {
      select('PI_Decision');
    });


    it('should show same deployment checked when not written', function() {

      // then
      expect(control('taskField-sameDeployment').checked).to.be.true;
      expect(control('taskField-fallbackToDefaultTenant').checked).to.be.false;
    });


    it('should write false for same deployment', function() {

      // when
      TestHelper.triggerEvent(control('taskField-sameDeployment'), 'click');

      // then
      expect(getFieldValue(field('sameDeployment'))).to.equal('false');
    });

  });


  describe('service task', function() {

    it('should list the class fields', function() {

      // when
      select('PI_Java');

      // then
      var list = domQuery('#flowable-extensionElements-taskClassFields', container);

      expect(list.options.length).to.equal(1);
      expect(list.options[0].text).to.equal('greeting = hello');
    });


    it('should show the class fields as a Name / Value table (#104)', function() {

      // when
      select('PI_Java');

      // then
      var table = domQuery('[data-group="classFields"] [data-group-summary] .cpp-summary-table', container);

      expect(Array.prototype.map.call(domQueryAll('th', table), function(th) {
        return th.textContent;
      })).to.eql([ 'Name', 'Value' ]);

      expect(Array.prototype.map.call(domQueryAll('tbody td', table), function(td) {
        return td.textContent;
      })).to.eql([ 'greeting', 'hello' ]);

      expect(domQuery('#flowable-extensionElements-taskClassFields', container).hasAttribute('data-row-delete')).to.be.true;
    });

  });


  describe('external worker task', function() {

    it('should offer variables to and from the worker', function() {

      // when
      select('PI_Worker');

      // then
      expect(domQuery('#flowable-extensionElements-taskInParameters', container)).to.exist;
      expect(domQuery('#flowable-extensionElements-taskOutParameters', container)).to.exist;
      expect(domQuery('[data-entry^="taskField-"]', container)).not.to.exist;
    });

  });

});
