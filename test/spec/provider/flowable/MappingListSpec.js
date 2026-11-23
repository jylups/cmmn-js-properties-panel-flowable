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
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


/**
 * The mappings of script, external worker and send event tasks in the
 * editor every mapping of the panel shares (Conscia-LLC/conscia-modeler#105).
 */
describe('flowable - mapping lists', function() {

  var diagramXML = require('./MappingList.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule, selectionModule, modelingModule,
      propertiesPanelModule, propertiesProviderModule
    ],
    moddleExtensions: { flowable: flowableModdlePackage },

    // as the app: each list edited in its own pop-up
    propertiesPanel: { editPerField: true }
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

  function values() {
    return element.businessObject.definitionRef.get('extensionElements').get('values');
  }

  function extensions(type) {
    return values().filter(function(value) {
      return value.$type === type;
    });
  }

  function getList(id) {
    return domQuery('select[id="flowable-extensionElements-' + id + '"]', container);
  }

  function labels(id) {
    return Array.prototype.map.call(getList(id).options, function(option) {
      return option.text;
    });
  }

  function selectItem(id, index) {
    var list = getList(id);

    list.selectedIndex = index;
    TestHelper.triggerEvent(list, 'change');
  }

  function getControl(name) {
    return domQuery('[name="' + name + '"]', container);
  }

  function isDisabled(name) {
    var entry = domQuery('[data-entry="' + name + '"]', container);

    return domClasses(domQuery('[data-show="isDisabled"]', entry)).has('cpp-hidden');
  }

  function suggestions(name) {
    var input = getControl(name),
        list = input.getAttribute('list');

    return list ? Array.prototype.map.call(domQueryAll('#' + list + ' option', container), function(option) {
      return option.value;
    }) : [];
  }


  describe('script task input variables', function() {

    beforeEach(function() {
      select('PI_Script');
    });


    it('should show each mapping as source → target, with a delete button per row and move buttons', function() {

      // then
      expect(labels('taskInParameters')).to.eql([ 'amount → a', '${fee * 2} → b' ]);
      expect(getList('taskInParameters').hasAttribute('data-row-delete')).to.be.true;
      expect(domQuery('[data-entry="taskInParameters"] [data-action="moveUp"]', container)).to.exist;
      expect(domQuery('[data-entry="taskInParameters"] [data-action="moveDown"]', container)).to.exist;
    });


    it('should show a source variable and a source expression for the selected mapping', function() {

      // when
      selectItem('taskInParameters', 1);

      // then
      expect(getControl('taskInParameters-source').value).to.equal('');
      expect(getControl('taskInParameters-sourceExpression').tagName).to.equal('TEXTAREA');
      expect(getControl('taskInParameters-sourceExpression').value).to.equal('${fee * 2}');
      expect(getControl('taskInParameters-target').value).to.equal('b');
    });


    it('should offer the case\'s variables for the source', function() {

      // when
      selectItem('taskInParameters', 0);

      // then
      expect(suggestions('taskInParameters-source')).to.eql([ 'amount', 'orderStatus', 'workerResult' ]);
    });


    it('should clear the variable when an expression is filled in, and back', function() {

      // given
      selectItem('taskInParameters', 0);

      var mapping = extensions('flowable:In')[0];

      // when
      TestHelper.triggerValue(getControl('taskInParameters-sourceExpression'), '${amount + 1}', 'change');

      // then
      expect(mapping.sourceExpression).to.equal('${amount + 1}');
      expect(mapping.source).not.to.exist;
      expect(getControl('taskInParameters-source').value).to.equal('');

      // when
      TestHelper.triggerValue(getControl('taskInParameters-source'), 'total', 'change');

      // then
      expect(mapping.source).to.equal('total');
      expect(mapping.sourceExpression).not.to.exist;
    });


    it('should move a mapping, the script field keeping its place', function() {

      // given
      selectItem('taskInParameters', 1);

      var script = values()[1];

      // when
      TestHelper.triggerEvent(domQuery('[data-entry="taskInParameters"] [data-action="moveUp"]', container), 'click');

      // then
      expect(labels('taskInParameters')).to.eql([ '${fee * 2} → b', 'amount → a' ]);
      expect(values()[1]).to.equal(script);
    });


    it('should disable the fields when no mapping is selected', function() {

      // then
      expect(isDisabled('taskInParameters-source')).to.be.true;
      expect(isDisabled('taskInParameters-sourceExpression')).to.be.true;
    });


    it('should show the mappings as a Source / Target table in the read view', function() {

      // when
      var table = domQuery('[data-group="taskVariables"] [data-group-summary] .cpp-summary-table', container);

      // then
      expect(Array.prototype.map.call(domQueryAll('th', table), function(th) {
        return th.textContent;
      })).to.eql([ 'Source', 'Target' ]);

      expect(Array.prototype.map.call(domQueryAll('tbody tr', table), function(tr) {
        return Array.prototype.map.call(domQueryAll('td', tr), function(td) {
          return td.textContent;
        });
      })).to.eql([ [ 'amount', 'a' ], [ '${fee * 2}', 'b' ] ]);
    });


    it('should edit the list with its mapping beside it', inject(function(propertiesPanel) {

      // given
      var group = domQuery('[data-group="taskVariables"]', container);

      // when
      propertiesPanel.openGroup('taskVariables', 'taskInParameters');

      // then
      expect(domClasses(group).has('cpp-editing-mapping-list')).to.be.true;

      // when
      propertiesPanel.closeGroup(true);

      // then
      expect(domClasses(group).has('cpp-editing-mapping-list')).to.be.false;
    }));


    it('should not lay out other fields as a mapping list', inject(function(propertiesPanel) {

      // given
      var group = domQuery('[data-group="taskFields"]', container);

      // when
      propertiesPanel.openGroup('taskFields', 'taskField-script');

      // then
      expect(domClasses(group).has('cpp-editing-mapping-list')).to.be.false;
    }));

  });


  describe('external worker variables', function() {

    beforeEach(function() {
      select('PI_Worker');
    });


    it('should write the worker\'s variable to a variable or an expression', function() {

      // given
      selectItem('taskOutParameters', 0);

      var mapping = extensions('flowable:ExternalWorkerOutParameter')[0];

      expect(getControl('taskOutParameters-source').value).to.equal('status');
      expect(suggestions('taskOutParameters-target')).to.eql([ 'amount', 'orderStatus', 'workerResult' ]);

      // when
      TestHelper.selectedByOption(getControl('taskOutParameters-targetType'), 'targetExpression');
      TestHelper.triggerEvent(getControl('taskOutParameters-targetType'), 'change');

      // then
      expect(mapping.targetExpression).to.equal('orderStatus');
      expect(mapping.target).not.to.exist;
      expect(suggestions('taskOutParameters-target')).to.eql([]);
    });


    it('should give the variables to the worker from a variable or an expression', function() {

      // when
      selectItem('taskInParameters', 0);

      // then
      expect(getControl('taskInParameters-source').value).to.equal('amount');
      expect(getControl('taskInParameters-sourceExpression')).to.exist;
    });

  });


  describe('send event payload', function() {

    beforeEach(function() {
      select('PI_Send');
    });


    it('should fill the payload from a variable or an expression', function() {

      // given
      selectItem('eventInParameters', 0);

      var mapping = extensions('flowable:EventInParameter')[0];

      expect(getControl('eventInParameters-sourceExpression').value).to.equal('${order.id}');

      // when
      TestHelper.triggerValue(getControl('eventInParameters-source'), 'orderId', 'change');

      // then
      expect(mapping.source).to.equal('orderId');
      expect(mapping.sourceExpression).not.to.exist;
      expect(labels('eventInParameters')).to.eql([ 'orderId → orderId' ]);
    });

  });

});
