'use strict';

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is;

var forEach = require('lodash/forEach'),
    assign = require('lodash/assign');

var tabIcons = require('./TabIcons');


/**
 * The property groups of the panel, in the order and with the names Flowable
 * Design uses, and where each field of the panel goes.
 *
 * Fields are built by the parts into the panel's original groups (General,
 * Details, Item Control, ...). regroup() moves them into these groups by
 * entry id: a `section` collects entries into a new group of fields, `groups`
 * moves original groups as they are (with their own label and visibility), and
 * `tabGroups` moves every group of an original tab. Entries and groups that no
 * section takes stay reachable in the group of their original tab (FALLBACK).
 *
 * See docs/flowable-properties.md in jylups/cmmn-js-env for the inventory.
 */


function getDefinition(element) {
  var bo = element && element.businessObject;

  return bo && (bo.definitionRef || bo);
}

function isDefinition(type) {
  return function(element) {
    return is(getDefinition(element), type);
  };
}

function not(fn) {
  return function(element) {
    return !fn(element);
  };
}

var isHumanTask = isDefinition('cmmn:HumanTask'),
    isMilestone = isDefinition('cmmn:Milestone');


function referenceLabel(element, translate) {

  if (is(getDefinition(element), 'cmmn:ProcessTask')) {
    return translate('Process');
  }

  if (is(getDefinition(element), 'cmmn:CaseTask')) {
    return translate('Case');
  }

  if (is(getDefinition(element), 'cmmn:DecisionTask')) {
    return translate('Decision');
  }

  return translate('Reference');
}


// the settings of script, HTTP, mail and decision tasks, written as fields
var TASK_FIELD_IDS = [
  'script',
  'requestMethod', 'requestUrl', 'requestHeaders', 'requestSecureHeaders', 'requestBody', 'requestBodyEncoding',
  'requestTimeout', 'disallowRedirects', 'failStatusCodes', 'handleStatusCodes', 'ignoreException',
  'saveRequestVariables', 'saveResponseParameters', 'saveResponseParametersTransient', 'saveResponseVariableAsJson',
  'responseVariableName', 'resultVariablePrefix', 'httpActivityBehaviorClass',
  'to', 'from', 'cc', 'bcc', 'subject', 'headers', 'text', 'textVar', 'html', 'htmlVar', 'charset', 'attachments',
  'mailIgnoreException', 'exceptionVariableName',
  'decisionTaskThrowErrorOnNoHits', 'fallbackToDefaultTenant', 'sameDeployment'
].map(function(name) {
  return 'taskField-' + name;
}).concat([
  'taskHttp-requesthandler-class', 'taskHttp-requesthandler-delegateExpression',
  'taskHttp-responsehandler-class', 'taskHttp-responsehandler-delegateExpression'
]);

function taskFieldsLabel(element, translate) {
  var definition = getDefinition(element),
      type = definition && definition.get('flowable:type');

  if (is(definition, 'cmmn:DecisionTask')) {
    return translate('Decision Options');
  }

  return translate({ script: 'Script', http: 'HTTP Request', mail: 'Mail' }[type] || 'Settings');
}

var TABS = [
  {
    id: 'general',
    label: 'General',
    items: [
      { groups: [ 'problems' ] },
      {
        section: 'common',
        label: 'Common',
        description: 'Every CMMN element has an id, a name and documentation. The id identifies the element ' +
          'and is how other parts of the model refer to it; the name is shown in the diagram; the ' +
          'documentation describes the element in free text.',
        ids: [
          'caseKey', 'caseDiagramName', 'caseDiagramDocumentation', 'caseCategory',
          'caseId', 'caseName', 'id', 'name', 'elementName', 'textFormat', 'documentation',
          'dueDate', 'priority', 'category',
          'stageOverview-businessStatus',
          'milestone-milestoneVariable',
          { id: 'stageOverview-includeInStageOverview', when: isMilestone },
          { id: 'stageOverview-displayOrder', when: isMilestone }
        ]
      },
      {
        section: 'form',
        label: 'Form',
        ids: [
          'formKey',
          { id: 'taskSameDeployment', when: isHumanTask },
          'taskFormKey', 'taskCasePageSameDeployment', 'taskLabel', 'taskIcon',
          'startForm-formKey', 'startForm-sameDeployment'
        ]
      },
      {
        section: 'reference',
        label: referenceLabel,
        ids: [
          'callableRefType', 'callableReference', 'callableExternalRef', 'callableReferenceExpression',
          { id: 'taskSameDeployment', when: not(isHumanTask) },
          'childFallbackToDefaultTenant',
          'childBusinessKey', 'childInheritBusinessKey', 'childInheritVariables', 'childIdVariableName'
        ]
      },
      {
        section: 'implementation',
        label: 'Implementation',
        ids: [
          'taskType', 'taskImplementation', 'taskClass', 'taskExpression', 'taskDelegateExpression',
          'taskParallelInSameTransaction', 'taskScriptFormat', 'taskAutoStoreVariables',
          'taskTopic', 'taskDoNotIncludeVariables',
          'taskResultVariableName', 'taskStoreResultVariableAsTransient'
        ]
      },
      {
        section: 'taskFields',
        label: taskFieldsLabel,
        ids: TASK_FIELD_IDS
      },
      {
        section: 'classFields',
        label: 'Class Fields',
        ids: [ 'taskClassFields', 'taskClassFields-name', 'taskClassFields-stringValue', 'taskClassFields-expression' ]
      },
      {
        section: 'timer',
        label: 'Timer',
        ids: [ 'timer-expression', 'timer-startTriggerSource', 'timer-startTriggerEvent' ]
      },
      {
        section: 'event',
        label: 'Event',
        ids: [
          'eventListenerType', 'eventListenerSignalRef',
          'eventListenerVariableName', 'eventListenerVariableChangeType', 'eventListenerAuthorizedRoles'
        ]
      },
      {
        section: 'sentry',
        label: 'Sentry',
        ids: [ 'ifPartCondition', 'sentry-triggerMode' ]
      },
      {
        section: 'onPart',
        label: 'Connector',
        ids: [ 'onPartStandardEvent', 'onPartIsStandardEventVisible' ]
      }
    ]
  },
  {
    id: 'assignment',
    label: 'Assignment',
    items: [
      {
        section: 'assignment',
        label: 'Assignment',
        ids: [
          'assignee', 'owner', 'taskAssignee', 'taskOwner',
          'candidateUsers', 'taskCandidateUsers',
          'candidateGroups', 'taskCandidateGroups',
          'case-candidateStarterUsers', 'case-candidateStarterGroups'
        ]
      }
    ]
  },
  {
    id: 'variables',
    label: 'Variable Mapping',
    items: [
      { groups: [ 'variables' ] },
      {
        section: 'taskVariables',
        label: 'Variables',
        ids: [
          'taskInParameters', 'taskInParameters-source', 'taskInParameters-sourceExpression', 'taskInParameters-target',
          'taskOutParameters', 'taskOutParameters-source', 'taskOutParameters-target', 'taskOutParameters-targetExpression'
        ]
      }
    ]
  },
  {
    id: 'eventRegistry',
    label: 'Event Registry',
    items: [
      { groups: [ 'eventRegistryEvent', 'eventRegistryCorrelation', 'eventRegistryPayload' ] }
    ]
  },
  {
    id: 'control',
    label: 'Control',
    items: [
      {
        section: 'controlRules',
        label: 'Item Control',
        ids: [
          'itemControlControlAction',
          'itemControlRequiredRuleEnabled', 'itemControlRequiredRule', 'itemControlManualActivationRuleEnabled', 'itemControlManualActivationRule',
          'itemControlCompletionNeutral', 'itemControlCompletionNeutralCondition'
        ]
      },
      {
        section: 'defaultControlRules',
        label: 'Default Control',
        ids: [
          'defaultControlControlAction',
          'defaultControlRequiredRuleEnabled', 'defaultControlRequiredRule', 'defaultControlManualActivationRuleEnabled', 'defaultControlManualActivationRule',
          'defaultControlCompletionNeutral', 'defaultControlCompletionNeutralCondition'
        ]
      }
    ]
  },
  {
    id: 'repetition',
    label: 'Repetition',
    items: [
      {
        section: 'repetition',
        label: 'Repetition',
        ids: [
          { id: 'itemControlControlAction', copy: true },
          'itemControlRepetitionRuleEnabled', 'itemControlRepetitionRule',
          'itemControl-repetition-counterVariable', 'itemControl-repetition-ignoreCounterVariable',
          'itemControl-repetition-maxInstanceCount', 'itemControl-repetition-collectionVariable',
          'itemControl-repetition-elementVariable', 'itemControl-repetition-elementIndexVariable'
        ]
      },
      {
        section: 'defaultRepetition',
        label: 'Default Repetition',
        ids: [
          { id: 'defaultControlControlAction', copy: true },
          'defaultControlRepetitionRuleEnabled', 'defaultControlRepetitionRule',
          'defaultControl-repetition-counterVariable', 'defaultControl-repetition-ignoreCounterVariable',
          'defaultControl-repetition-maxInstanceCount', 'defaultControl-repetition-collectionVariable',
          'defaultControl-repetition-elementVariable', 'defaultControl-repetition-elementIndexVariable'
        ]
      },
      {
        groups: [
          'variableAggregations', 'variableAggregationDetails', 'variableAggregationVariables',
          'defaultControl-variableAggregations', 'defaultControl-variableAggregationDetails',
          'defaultControl-variableAggregationVariables'
        ],

        // a list and the details of its selected item: edited in place
        editInline: true
      }
    ]
  },
  {
    id: 'advancedForm',
    label: 'Advanced Form',
    items: [
      {
        section: 'formValidation',
        label: 'Validation',
        ids: [ 'formFieldValidation', 'taskFormFieldValidation', 'startForm-formFieldValidation' ]
      }
    ]
  },
  {
    id: 'details',
    label: 'Details',
    items: [
      {
        section: 'stageDetails',
        label: 'Details',
        ids: [
          'stage-autoComplete', 'stage-autoCompleteCondition',
          { id: 'stageOverview-includeInStageOverview', when: not(isMilestone) },
          { id: 'stageOverview-displayOrder', when: not(isMilestone) },
          'definitions-author'
        ]
      }
    ]
  },
  {
    id: 'advanced',
    label: 'Advanced',
    items: [
      {
        section: 'execution',
        label: 'Execution',
        ids: [
          'case-async',
          'taskAsync', 'taskExclusive', 'taskAsyncLeave', 'taskAsyncLeaveExclusive',
          'taskIsBlocking', 'taskBlockingExpression',
          'itemControlParentCompletionRule', 'defaultControlParentCompletionRule',
          'taskIdVariableName', 'taskCompleterVariableName',
          'jobCategory',
          'eventListenerAvailableCondition',
          'exitCriterion-exitType', 'exitCriterion-exitEventType'
        ]
      },
      {
        section: 'caseStart',
        label: 'Case',
        ids: [ 'case-initiatorVariableName' ]
      }
    ]
  },
  {
    id: 'listener',
    label: 'Listeners',
    items: [
      {
        groups: [ 'taskListeners', 'lifecycleListeners', 'listenerDetails', 'listener-fields' ],

        // a list and the details of its selected item: edited in place
        editInline: true
      }
    ]
  },
  {
    id: 'reactivation',
    label: 'Reactivation',
    items: [
      {
        section: 'reactivation',
        label: 'Reactivation',
        ids: [
          { id: 'itemControlControlAction', copy: true },
          'itemControlReactivationActivateCondition',
          'itemControlReactivationIgnoreCondition',
          'itemControlReactivationDefaultCondition'
        ]
      },
      {
        section: 'defaultReactivation',
        label: 'Default Reactivation',
        ids: [
          { id: 'defaultControlControlAction', copy: true },
          'defaultControlReactivationActivateCondition',
          'defaultControlReactivationIgnoreCondition',
          'defaultControlReactivationDefaultCondition'
        ]
      },
      { groups: [ 'defaultReactivationRule' ] }
    ]
  },
  {
    id: 'definition',
    label: 'Definition',
    items: [
      { groups: [ 'definitionDetails', 'definitionDocumentation' ] }
    ]
  },
  {
    id: 'extensions',
    label: 'Extensions',
    items: [
      { tabGroups: 'extensions' }
    ]
  }
];

/**
 * Where the entries and groups of an original tab go when no section takes them.
 */
var FALLBACK = {
  general: 'general',
  rules: 'control',
  variables: 'variables',
  eventRegistry: 'eventRegistry',
  listener: 'listener',
  definition: 'definition',
  extensions: 'extensions'
};


/**
 * Move the fields of the panel's original tabs into Flowable's groups.
 *
 * @param {Array<Object>} originalTabs the tabs built by the parts
 * @param {djs.model.Base} element
 * @param {Function} translate
 *
 * @return {Array<Object>} tabs in Flowable's order; tabs without fields are left out
 */
module.exports = function regroup(originalTabs, element, translate) {

  var entries = {},
      groups = {},
      tabsById = {},
      usedEntries = {},
      usedGroups = {};

  forEach(originalTabs, function(tab) {
    tabsById[tab.id] = tab;

    forEach(tab.groups, function(group) {
      groups[group.id] = { group: group, tab: tab };

      forEach(group.entries, function(entry) {
        entries[entry.id] = entry;
      });
    });
  });

  function useGroup(group) {
    usedGroups[group.id] = true;

    forEach(group.entries, function(entry) {
      usedEntries[entry.id] = true;
    });

    return group;
  }

  function collect(section) {

    var collected = [];

    forEach(section.ids, function(spec) {

      if (typeof spec === 'string') {
        spec = { id: spec };
      }

      var entry = entries[spec.id];

      if (!entry || (spec.when && !spec.when(element))) {
        return;
      }

      if (spec.copy) {

        // the same action shown in a second group
        collected.push(assign(Object.create(entry), { id: entry.id + '-' + section.section }));

        return;
      }

      if (usedEntries[spec.id]) {
        return;
      }

      usedEntries[spec.id] = true;

      collected.push(entry);
    });

    // a copied action alone is no section
    var own = collected.filter(function(entry) {
      return entries[entry.id] === entry;
    });

    return own.length ? collected : [];
  }

  var tabs = TABS.map(function(definition) {

    var tab = {
      id: definition.id,
      label: translate(definition.label),
      icon: tabIcons[definition.id],
      groups: []
    };

    forEach(definition.items, function(item) {

      if (item.section) {

        var sectionEntries = collect(item);

        if (sectionEntries.length) {
          tab.groups.push({
            id: item.section,
            label: typeof item.label === 'function' ? item.label(element, translate) : translate(item.label),
            description: item.description && translate(item.description),
            entries: sectionEntries
          });
        }
      }

      forEach(item.groups, function(groupId) {
        var original = groups[groupId];

        if (original && !usedGroups[groupId]) {
          tab.groups.push(useGroup(original.group));

          if (item.editInline) {
            original.group.editInline = true;
          }
        }
      });

      if (item.tabGroups) {
        var originalTab = tabsById[item.tabGroups];

        if (originalTab) {
          forEach(originalTab.groups, function(group) {
            if (!usedGroups[group.id]) {
              tab.groups.push(useGroup(group));
            }
          });

          if (originalTab.enabled) {
            tab.enabled = originalTab.enabled;
          }
        }
      }
    });

    return tab;
  });

  // everything no section took stays in the group of its original tab
  forEach(groups, function(original, groupId) {

    var group = original.group;

    if (usedGroups[groupId]) {
      return;
    }

    var rest = (group.entries || []).filter(function(entry) {
      return !usedEntries[entry.id];
    });

    if (!rest.length) {
      return;
    }

    var target = FALLBACK[original.tab.id] || 'general';

    var tab = tabs.filter(function(t) {
      return t.id === target;
    })[0];

    tab.groups.push(assign({}, group, { entries: rest }));
  });

  return tabs.filter(function(tab) {
    return tab.groups.length;
  });
};

module.exports.TABS = TABS;
