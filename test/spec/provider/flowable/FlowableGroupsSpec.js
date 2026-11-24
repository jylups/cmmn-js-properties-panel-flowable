'use strict';

require('../../../TestHelper');

var regroup = require('lib/provider/flowable/FlowableGroups');


describe('flowable - groups', function() {

  function translate(text) {
    return text;
  }

  /**
   * A shape whose definition is of the given type.
   */
  function shape(type) {
    var definition = {
      $instanceOf: function(t) {
        return t === type;
      }
    };

    return {
      businessObject: {
        definitionRef: definition,
        $instanceOf: function(t) {
          return t === 'cmmn:PlanItem';
        }
      }
    };
  }

  function entries() {
    return Array.prototype.map.call(arguments, function(id) {
      return { id: id, html: '<div></div>' };
    });
  }

  function tab(tabs, id) {
    return tabs.filter(function(t) {
      return t.id === id;
    })[0];
  }

  function group(t, id) {
    return t && t.groups.filter(function(g) {
      return g.id === id;
    })[0];
  }

  function ids(g) {
    return g.entries.map(function(e) {
      return e.id;
    });
  }


  it('should order the groups as Flowable Design does', function() {

    // when
    var tabs = regroup([
      { id: 'general', groups: [ { id: 'general', entries: entries('id', 'name', 'assignee') } ] },
      { id: 'rules', groups: [ { id: 'itemControl', entries: entries(
        'itemControlControlAction', 'itemControlRequiredRule', 'itemControlRepetitionRule',
        'itemControlParentCompletionRule', 'itemControlReactivationIgnoreCondition') } ] }
    ], shape('cmmn:HumanTask'), translate);

    // then
    expect(tabs.map(function(t) { return t.id; })).to.eql([
      'general', 'assignment', 'control', 'repetition', 'advanced', 'reactivation'
    ]);

    expect(ids(group(tab(tabs, 'general'), 'common'))).to.eql([ 'id', 'name' ]);
    expect(ids(group(tab(tabs, 'assignment'), 'assignment'))).to.eql([ 'assignee' ]);
    expect(ids(group(tab(tabs, 'control'), 'controlRules'))).to.eql([
      'itemControlControlAction', 'itemControlRequiredRule'
    ]);
    expect(ids(group(tab(tabs, 'advanced'), 'execution'))).to.eql([ 'itemControlParentCompletionRule' ]);
  });


  it('should give every group an icon', function() {

    // when
    var tabs = regroup([
      { id: 'general', groups: [ { id: 'general', entries: entries('id') } ] }
    ], shape('cmmn:HumanTask'), translate);

    // then
    expect(tab(tabs, 'general').icon).to.contain('<svg');
  });


  it('should show the add control action in each group of rules', function() {

    // given
    var original = entries('itemControlControlAction', 'itemControlRepetitionRule', 'itemControlReactivationIgnoreCondition');

    // when
    var tabs = regroup([
      { id: 'rules', groups: [ { id: 'itemControl', entries: original } ] }
    ], shape('cmmn:HumanTask'), translate);

    // then
    var repetition = group(tab(tabs, 'repetition'), 'repetition'),
        reactivation = group(tab(tabs, 'reactivation'), 'reactivation');

    expect(ids(repetition)).to.eql([ 'itemControlControlAction-repetition', 'itemControlRepetitionRule' ]);
    expect(ids(reactivation)).to.eql([
      'itemControlControlAction-reactivation', 'itemControlReactivationIgnoreCondition'
    ]);

    // the copy behaves as the original action
    expect(Object.getPrototypeOf(repetition.entries[0])).to.equal(original[0]);
  });


  it('should not show a group with only the add control action', function() {

    // when
    var tabs = regroup([
      { id: 'rules', groups: [ { id: 'itemControl', entries: entries('itemControlControlAction', 'itemControlRequiredRule') } ] }
    ], shape('cmmn:HumanTask'), translate);

    // then
    expect(tab(tabs, 'repetition')).not.to.exist;
    expect(tab(tabs, 'reactivation')).not.to.exist;
  });


  describe('per element type', function() {

    var original = [
      { id: 'general', groups: [
        { id: 'details', entries: entries(
          'taskSameDeployment', 'stageOverview-includeInStageOverview', 'stageOverview-displayOrder') }
      ] }
    ];

    it('should show the form of a human task in General', function() {

      // when
      var tabs = regroup(original, shape('cmmn:HumanTask'), translate);

      // then
      expect(ids(group(tab(tabs, 'general'), 'form'))).to.eql([ 'taskSameDeployment' ]);
    });


    it('should show the reference of a process task, named by its type', function() {

      // when
      var tabs = regroup(original, shape('cmmn:ProcessTask'), translate);

      // then
      var reference = group(tab(tabs, 'general'), 'reference');

      expect(reference.label).to.equal('Process');
      expect(ids(reference)).to.eql([ 'taskSameDeployment' ]);
    });


    it('should show the stage overview of a milestone in General', function() {

      // when
      var tabs = regroup(original, shape('cmmn:Milestone'), translate);

      // then
      expect(ids(group(tab(tabs, 'general'), 'common'))).to.eql([
        'stageOverview-includeInStageOverview', 'stageOverview-displayOrder'
      ]);
    });


    it('should show the stage overview of a stage in Details', function() {

      // when
      var tabs = regroup(original, shape('cmmn:Stage'), translate);

      // then
      expect(ids(group(tab(tabs, 'details'), 'stageDetails'))).to.eql([
        'stageOverview-includeInStageOverview', 'stageOverview-displayOrder'
      ]);
    });

  });


  describe('groups moved as they are', function() {

    it('should keep their label and visibility', function() {

      // given
      function enabled() {
        return true;
      }

      var listenerDetails = { id: 'listenerDetails', label: function() {}, enabled: enabled, entries: entries('listenerType') };

      // when
      var tabs = regroup([
        { id: 'listener', groups: [ listenerDetails ] }
      ], shape('cmmn:HumanTask'), translate);

      // then
      expect(group(tab(tabs, 'advanced'), 'listenerDetails')).to.equal(listenerDetails);
    });


    it('should put the listeners in the Advanced tab, after Execution, as Flowable Design does', function() {

      // given
      var taskListeners = { id: 'taskListeners', entries: entries('taskListeners-list') },
          lifecycleListeners = { id: 'lifecycleListeners', entries: entries('lifecycleListeners-list') };

      // when
      var tabs = regroup([
        { id: 'general', groups: [ { id: 'asynchronousContinuations', entries: entries('taskAsync') } ] },
        { id: 'listener', groups: [ taskListeners, lifecycleListeners ] }
      ], shape('cmmn:HumanTask'), translate);

      // then
      expect(tab(tabs, 'listener')).not.to.exist;
      expect(tab(tabs, 'advanced').groups.map(function(g) {
        return g.id;
      })).to.eql([ 'execution', 'taskListeners', 'lifecycleListeners' ]);
      expect(taskListeners.editInline).to.be.true;
    });


    it('should keep the visibility of the extensions tab', function() {

      // given
      function enabled() {
        return false;
      }

      // when
      var tabs = regroup([
        { id: 'extensions', enabled: enabled, groups: [ { id: 'extensions-element', entries: entries('extensions-element') } ] }
      ], shape('cmmn:HumanTask'), translate);

      // then
      expect(tab(tabs, 'extensions').enabled).to.equal(enabled);
    });

  });


  it('should keep fields no group takes in the group of their original tab', function() {

    // when
    var tabs = regroup([
      { id: 'general', groups: [ { id: 'details', label: 'Details', entries: entries('id', 'somethingNew') } ] },
      { id: 'rules', groups: [ { id: 'other', label: 'Other', entries: entries('otherRule') } ] }
    ], shape('cmmn:HumanTask'), translate);

    // then
    var rest = group(tab(tabs, 'general'), 'details');

    expect(rest.label).to.equal('Details');
    expect(ids(rest)).to.eql([ 'somethingNew' ]);

    expect(ids(group(tab(tabs, 'control'), 'other'))).to.eql([ 'otherRule' ]);
  });

});
