'use strict';

var getBusinessObject = require('@jylups/cmmn-js/lib/util/ModelUtil').getBusinessObject;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isPlanItemLifecycleListenerCapable = CmmnElementHelper.isPlanItemLifecycleListenerCapable,
    isCaseLifecycleListenerCapable = CmmnElementHelper.isCaseLifecycleListenerCapable;

var listenerElements = require('./implementation/ListenerElements');


/**
 * The transition of a lifecycle listener, as shown in the list.
 */
function getTransitionLabel(listener) {
  var sourceState = listener && listener.get('sourceState'),
      targetState = listener && listener.get('targetState');

  return (sourceState || '*') + ' → ' + (targetState || '*');
}


function addListeners(group, listenerProps) {

  if (listenerProps.entries && listenerProps.entries.length) {
    group.entries = group.entries.concat(listenerProps.entries);
  }

  return {
    register: listenerProps.register,
    getSelectedListener: listenerProps.getSelectedListener
  };
}


/**
 * Lifecycle listeners of the definition of a plan item, notified when the
 * plan item instance changes its state.
 */
module.exports.planItemLifecycleListenerProps = function(group, element, cmmnFactory, translate) {

  return addListeners(group, listenerElements(element, cmmnFactory, translate, {
    id: 'planItemLifecycleListeners',
    label: translate('Lifecycle Listener'),
    type: 'flowable:PlanItemLifecycleListener',
    isApplicable: isPlanItemLifecycleListenerCapable,
    getOptionLabel: getTransitionLabel
  }));
};


/**
 * Lifecycle listeners of the case of a case plan model, notified when the
 * case instance changes its state.
 */
module.exports.caseLifecycleListenerProps = function(group, element, cmmnFactory, translate) {

  return addListeners(group, listenerElements(element, cmmnFactory, translate, {
    id: 'caseLifecycleListeners',
    label: translate('Case Lifecycle Listener'),
    type: 'flowable:CaseLifecycleListener',
    isApplicable: isCaseLifecycleListenerCapable,
    getOptionLabel: getTransitionLabel,

    // the listeners belong to the case, not to its case plan model
    getContainer: function(element) {
      var bo = getBusinessObject(element);

      return bo && bo.$parent;
    }
  }));
};
