'use strict';

var inherits = require('inherits');

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is;

var CmmnElementHelper = require('../../helper/CmmnElementHelper'),
    isCMMNEdge = CmmnElementHelper.isCMMNEdge,
    getCMMNElementRef = CmmnElementHelper.getCMMNElementRef;

var PropertiesActivator = require('../../PropertiesActivator');

// cmmn properties

// item properties
var caseProps = require('../cmmn/parts/CaseProps'),
    idProps = require('../cmmn/parts/IdProps'),
    nameProps = require('../cmmn/parts/NameProps'),
    documentationProps = require('../cmmn/parts/DocumentationProps');

// detail properties
var ifPartProps = require('../cmmn/parts/IfPartProps'),
    humanTaskProps = require('./parts/HumanTaskProps'),
    taskProps = require('./parts/TaskProps'),
    eventListenerProps = require('./parts/EventListenerProps'),
    eventRegistryProps = require('./parts/EventRegistryProps'),
    stageOverviewProps = require('./parts/StageOverviewProps'),
    criterionProps = require('./parts/CriterionProps'),
    onPartProps = require('../cmmn/parts/OnPartProps'),
    variableMapping = require('./parts/VariableMappingProps');

// plan item control properties
var planItemControlProps = require('../cmmn/parts/PlanItemControlProps'),
    repeatOnStandardEventProps = require('./parts/RepeatOnStandardEventProps'),
    repetitionRuleProps = require('./parts/RepetitionRuleProps'),
    itemControlRuleProps = require('./parts/ItemControlRuleProps');

// definition props
var definitionIdProps = require('../cmmn/parts/DefinitionIdProps'),
    definitionNameProps = require('../cmmn/parts/DefinitionNameProps'),
    definitionDocumentationProps = require('../cmmn/parts/DefinitionDocumentationProps'),
    callableProps = require('../cmmn/parts/CallableProps'),
    callableExtensionProps = require('./parts/CallableExtensionProps');

// listener
var taskListenerProps = require('./parts/TaskListenerProps'),
    lifecycleListenerProps = require('./parts/LifecycleListenerProps'),
    listenerDetailProps = require('./parts/ListenerDetailProps'),
    listenerFields = require('./parts/ListenerFieldInjectionProps');

// history time to live
var historyTimeToLive = require('./parts/HistoryTimeToLiveProps');

// the case and its start form
var caseStartProps = require('./parts/CaseStartProps');

// extensions
var extensionsProps = require('./parts/ExtensionsProps');

// problems of the model
var problemsProps = require('./parts/ProblemsProps'),
    flowableCheck = require('./FlowableCheck');


var getListenerLabel = function(listener, translate) {

  if (is(listener, 'flowable:TaskListener')) {
    return translate('Task Listener');
  }

  if (is(listener, 'flowable:PlanItemLifecycleListener')) {
    return translate('Lifecycle Listener');
  }

  if (is(listener, 'flowable:CaseLifecycleListener')) {
    return translate('Case Lifecycle Listener');
  }

  return '';
};


function createGeneralTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate, problems) {

  var problemsGroup = problemsProps(element, problems, translate);

  var generalGroup = {
    id: 'general',
    label: translate('General'),
    entries: []
  };

  caseProps(generalGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);
  idProps(generalGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);
  nameProps(generalGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);


  var caseGroup = {
    id: 'case',
    label: translate('Case'),
    entries: []
  };

  caseStartProps.caseProps(caseGroup, element, translate);


  var detailsGroup = {
    id: 'details',
    label: translate('Details'),
    entries: []
  };

  onPartProps(detailsGroup, element, cmmnFactory, elementRegistry, itemRegistry, translate);
  ifPartProps(detailsGroup, element, cmmnFactory, elementRegistry, itemRegistry, translate);
  criterionProps(detailsGroup, element, translate);
  humanTaskProps(detailsGroup, element, cmmnFactory, elementRegistry, itemRegistry, translate);
  callableProps(detailsGroup, element, cmmnFactory, elementRegistry, itemRegistry, translate);
  callableExtensionProps(detailsGroup, element, cmmnFactory, elementRegistry, itemRegistry, translate);
  taskProps.detailProps(detailsGroup, element, cmmnFactory, translate);
  eventListenerProps.eventListenerProps(detailsGroup, element, translate);
  stageOverviewProps(detailsGroup, element, translate);


  var implementationGroup = {
    id: 'taskImplementation',
    label: translate('Implementation'),
    entries: []
  };

  taskProps.implementationProps(implementationGroup, element, cmmnFactory, translate);


  var asyncGroup = {
    id: 'asynchronousContinuations',
    label: translate('Asynchronous Continuations'),
    entries: []
  };

  taskProps.asyncProps(asyncGroup, element, cmmnFactory, translate);


  var documentationGroup = {
    id: 'documentation',
    label: translate('Documentation'),
    entries: []
  };

  documentationProps(documentationGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);


  var startFormGroup = {
    id: 'startForm',
    label: translate('Start Form'),
    entries: []
  };

  caseStartProps.startFormProps(startFormGroup, element, translate);


  var historyTimeToLiveGroup = {
    id: 'historyConfiguration',
    label: translate('History Configuration'),
    entries: []
  };

  historyTimeToLive(historyTimeToLiveGroup, element, cmmnFactory, elementRegistry, itemRegistry, translate);

  return [
    problemsGroup,
    generalGroup,
    caseGroup,
    detailsGroup,
    implementationGroup,
    asyncGroup,
    documentationGroup,
    startFormGroup,
    historyTimeToLiveGroup
  ];
}


function createRulesTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate) {

  var itemControlGroup = {
    id: 'itemControl',
    label: translate('Item Control'),
    entries: []
  };

  planItemControlProps(itemControlGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);
  repeatOnStandardEventProps(itemControlGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);
  repetitionRuleProps(itemControlGroup, element, itemRegistry, translate);
  itemControlRuleProps.planItemControlRuleProps(itemControlGroup, element, cmmnFactory, translate);


  var defaultControlGroup = {
    id: 'defaultControl',
    label: translate('Default Control'),
    entries: []
  };

  planItemControlProps(defaultControlGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate, {
    isDefaultControl: true
  });
  repeatOnStandardEventProps(defaultControlGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate, {
    isDefaultControl: true
  });
  repetitionRuleProps(defaultControlGroup, element, itemRegistry, translate, {
    isDefaultControl: true
  });
  itemControlRuleProps.planItemControlRuleProps(defaultControlGroup, element, cmmnFactory, translate, {
    isDefaultControl: true
  });


  var defaultReactivationRuleGroup = {
    id: 'defaultReactivationRule',
    label: translate('Default Reactivation Rule'),
    entries: []
  };

  itemControlRuleProps.defaultReactivationRuleProps(defaultReactivationRuleGroup, element, cmmnFactory, translate);

  return [
    itemControlGroup,
    defaultControlGroup,
    defaultReactivationRuleGroup
  ];
}


function createVariablesTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate) {

  var variablesGroup = {
    id : 'variables',
    label : translate('Variables'),
    entries: []
  };

  variableMapping(variablesGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);

  return [
    variablesGroup
  ];
}


function createListenerTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate) {

  // Flowable reads task listeners and lifecycle listeners; the case
  // execution and variable listeners of the Camunda version are not offered
  var taskListenerGroup = {
    id: 'taskListeners',
    label: translate('Task Listeners'),
    entries: []
  };

  var taskListenerProvider = taskListenerProps(
    taskListenerGroup,
    element,
    cmmnFactory,
    elementRegistry,
    itemRegistry,
    cmmnRules,
    translate
  );


  var lifecycleListenerGroup = {
    id: 'lifecycleListeners',
    label: translate('Lifecycle Listeners'),
    entries: []
  };

  var planItemLifecycleListenerProvider = lifecycleListenerProps.planItemLifecycleListenerProps(
    lifecycleListenerGroup,
    element,
    cmmnFactory,
    translate
  );

  var caseLifecycleListenerProvider = lifecycleListenerProps.caseLifecycleListenerProps(
    lifecycleListenerGroup,
    element,
    cmmnFactory,
    translate
  );


  var listenerGroups = [
    taskListenerGroup,
    lifecycleListenerGroup
  ];

  var listenerProviders = [
    taskListenerProvider,
    planItemLifecycleListenerProvider,
    caseLifecycleListenerProvider
  ];

  // selecting a listener in one list deselects the listeners of the others
  listenerProviders.forEach(function(provider) {
    provider.register(listenerGroups);
  });


  function getSelectedListener(element, node) {

    var listener;

    listenerProviders.some(function(provider) {
      listener = provider.getSelectedListener(element, node);

      return listener;
    });

    return listener;
  }


  var listenerDetailsGroup = {
    id: 'listenerDetails',
    entries: [],
    enabled: function(element, node) {
      return getSelectedListener(element, node);
    },
    label: function(element, node) {
      var param = getSelectedListener(element, node);
      return getListenerLabel(param, translate);
    }
  };

  listenerDetailProps(
    listenerDetailsGroup,
    element,
    cmmnFactory,
    elementRegistry,
    itemRegistry,
    cmmnRules,
    translate,
    { getListener : getSelectedListener }
  );


  var listenerFieldsGroup = {
    id: 'listener-fields',
    label: translate('Field Injection'),
    entries: [],
    enabled: function(element, node) {
      return getSelectedListener(element, node);
    }
  };

  listenerFields(
    listenerFieldsGroup,
    element,
    cmmnFactory,
    elementRegistry,
    itemRegistry,
    cmmnRules,
    translate,
    { getListener : getSelectedListener }
  );


  return [
    taskListenerGroup,
    lifecycleListenerGroup,
    listenerDetailsGroup,
    listenerFieldsGroup
  ];
}


function createDefinitionTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate) {

  var detailsGroup = {
    id: 'definitionDetails',
    label: translate('Details'),
    entries: []
  };

  definitionIdProps(detailsGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);
  definitionNameProps(detailsGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);


  var documentationGroup = {
    id: 'definitionDocumentation',
    label: translate('Documentation'),
    entries: []
  };

  definitionDocumentationProps(documentationGroup, element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate);

  return [
    detailsGroup,
    documentationGroup
  ];
}


// Flowable Properties Provider /////////////////////////////////////


/**
 * A properties provider for Flowable related properties.
 *
 * @param {EventBus} eventBus
 * @param {CmmnFactory} cmmnFactory
 * @param {ElementRegistry} elementRegistry
 */
function FlowablePropertiesProvider(eventBus, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate, injector) {

  // the problems of the opened model, when the editor has them, with the
  // parts Flowable does not read
  var problems = injector && injector.get('problems', false);

  if (problems && problems.addCheck) {
    problems.addCheck(flowableCheck(translate));
  }

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var generalTab = {
      id: 'general',
      label: translate('General'),
      groups: createGeneralTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate, problems)
    };

    var rulesTab = {
      id: 'rules',
      label: translate('Rules'),
      groups: createRulesTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate)
    };

    var variablesTab = {
      id: 'variables',
      label: translate('Variables'),
      groups: createVariablesTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate)
    };

    var eventRegistryTab = {
      id: 'eventRegistry',
      label: translate('Event Registry'),
      groups: eventRegistryProps.eventRegistryGroups(element, cmmnFactory, translate)
    };

    var listenerTab = {
      id: 'listener',
      label: translate('Listener'),
      groups: createListenerTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate)
    };

    var definitionTab = {
      id: 'definition',
      label: translate('Definition'),
      groups: createDefinitionTabGroups(element, cmmnFactory, elementRegistry, itemRegistry, cmmnRules, translate)
    };

    // every extension of the element, read-only
    var extensionsGroups = extensionsProps(element, translate);

    var extensionsTab = {
      id: 'extensions',
      label: translate('Extensions'),
      groups: extensionsGroups,
      enabled: function() {
        return extensionsGroups.some(function(group) {
          return group.enabled();
        });
      }
    };

    return [
      generalTab,
      rulesTab,
      variablesTab,
      eventRegistryTab,
      listenerTab,
      definitionTab,
      extensionsTab
    ];

  };

  this.getHeaderLabel = function(element) {

    if (isCMMNEdge(element)) {
      element = getCMMNElementRef(element) || element;
    }

    return element.id;

  };
}

FlowablePropertiesProvider.$inject = [
  'eventBus',
  'cmmnFactory',
  'elementRegistry',
  'itemRegistry',
  'cmmnRules',
  'translate',
  'injector'
];

inherits(FlowablePropertiesProvider, PropertiesActivator);

module.exports = FlowablePropertiesProvider;
