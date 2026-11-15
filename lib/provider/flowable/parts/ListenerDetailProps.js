'use strict';

var ListenerEventTypeProp = require('./implementation/ListenerEventTypeProp'),
    ListenerDelegateProp = require('./implementation/ListenerDelegateProp'),
    LifecycleTransitionProp = require('./implementation/LifecycleTransitionProp');

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

};
