'use strict';

var ListenerEventTypeProp = require('./implementation/ListenerEventTypeProp'),
    ListenerDelegateProp = require('./implementation/ListenerDelegateProp'),
    LifecycleTransitionProp = require('./implementation/LifecycleTransitionProp');

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isTaskListenerCapable = CmmnElementHelper.isTaskListenerCapable,
    isPlanItemLifecycleListenerCapable = CmmnElementHelper.isPlanItemLifecycleListenerCapable,
    isCaseLifecycleListenerCapable = CmmnElementHelper.isCaseLifecycleListenerCapable;

module.exports = function(group, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate, options) {


  options = options || {};

  var getListener = options.getListener;


  if (!isTaskListenerCapable(element) &&
      !isPlanItemLifecycleListenerCapable(element) &&
      !isCaseLifecycleListenerCapable(element)) {
    return;
  }

  group.entries = group.entries.concat(ListenerEventTypeProp(element, translate, {
    getListener: getListener
  }));

  group.entries = group.entries.concat(LifecycleTransitionProp(element, translate, {
    getListener: getListener
  }));


  group.entries = group.entries.concat(ListenerDelegateProp(element, cmmnFactory, translate, {
    getListener: getListener
  }));

  // when the listener runs in the transaction: Flowable reads it on task and lifecycle listeners
  group.entries.push(entryFactory.selectBox({
    id: 'listenerOnTransaction',
    label: translate('On Transaction'),
    modelProperty: 'onTransaction',
    selectOptions: [
      { name: translate('When the event happens'), value: '' },
      { name: 'committed', value: 'committed' },
      { name: 'rolled-back', value: 'rolled-back' },
      { name: 'before-commit', value: 'before-commit' }
    ],

    get: function(element, node) {
      var listener = getListener(element, node);

      return { onTransaction: (listener && listener.get('onTransaction')) || '' };
    },

    set: function(element, values, node) {
      return cmdHelper.updateProperties(getListener(element, node), {
        onTransaction: values.onTransaction || undefined
      }, element);
    },

    hideEntry: function(element, node) {
      var listener = getListener(element, node);

      return !listener || !(is(listener, 'flowable:TaskListener') || is(listener, 'flowable:LifecycleListener'));
    }
  }));

};
