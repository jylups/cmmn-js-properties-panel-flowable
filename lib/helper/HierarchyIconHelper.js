'use strict';

var escapeHTML = require('../Utils').escapeHTML;

// the line icons the canvas and the palette draw for Flowable's task and
// event listener types; older cmmn-js versions don't have them
var TYPE_ICONS = require('@jylups/cmmn-js/lib/draw/CmmnRenderer').TYPE_ICONS || { task: {}, listener: {} };

// the icons of the palette's CMMN types, from the cmmn font
var FONT_ICONS = {
  'cmmn:CasePlanModel': 'case-plan-model',
  'cmmn:Stage': 'stage-expanded',
  'cmmn:PlanFragment': 'plan-fragment-expanded',
  'cmmn:HumanTask': 'human-blocking-task',
  'cmmn:CaseTask': 'case-task',
  'cmmn:ProcessTask': 'process-task',
  'cmmn:DecisionTask': 'decision-task',
  'cmmn:Task': 'task',
  'cmmn:Milestone': 'milestone',
  'cmmn:EventListener': 'event-listener',
  'cmmn:TimerEventListener': 'timer-event-listener',
  'cmmn:UserEventListener': 'user-event-listener',
  'cmmn:CaseFileItem': 'case-file-item'
};

// the cmmn font has a discretionary variant of these
var DISCRETIONARY = {
  'stage-expanded': true,
  'plan-fragment-expanded': true,
  'human-blocking-task': true,
  'case-task': true,
  'process-task': true,
  'decision-task': true
};


/**
 * The icon of an element's type in the model hierarchy: the same as the
 * palette's for that type, so that a type looks the same in both places.
 *
 * CMMN's types use the cmmn font's icons (cmmn-js's cmmn-font CSS must be
 * loaded, as it is for the palette); Flowable's task types (flowable:type) and
 * event listener types (flowable:eventType, or an event of the event registry)
 * use the line icons the canvas draws for them.
 *
 * @param {ModdleElement} definition the element's definition (or the element)
 * @param {boolean} [discretionary] whether it is a discretionary item
 *
 * @return {string} the icon's markup
 */
module.exports.hierarchyIcon = function(definition, discretionary) {

  var type = (definition && definition.$type) || '';

  var parent = definition && definition.$parent;

  // the case plan model is a stage of its case
  if (parent && parent.$type === 'cmmn:Case' && parent.casePlanModel === definition) {
    type = 'cmmn:CasePlanModel';
  }

  var line = lineIcon(definition, type);

  if (line) {
    return line;
  }

  var name = FONT_ICONS[type] || FONT_ICONS['cmmn:Task'];

  // the palette shows a plan fragment as a discretionary one
  if (name === 'plan-fragment-expanded' || (discretionary && DISCRETIONARY[name])) {
    name += '-discretionary';
  }

  return '<span class="cpp-hierarchy-font-icon cmmn-icon-' + escapeHTML(name) + '"></span>';
};


/**
 * The line icon of a Flowable task or event listener type, in a rounded square
 * (a task) or a circle (an event listener), as the palette shows them.
 */
function lineIcon(definition, type) {

  var get = function(name) {
    return definition && definition.get && definition.get(name);
  };

  if (type === 'cmmn:Task') {
    var taskIcon = TYPE_ICONS.task[get('flowable:type')];

    return taskIcon && lineSvg(taskIcon, false);
  }

  if (type === 'cmmn:EventListener') {
    var listenerIcon = TYPE_ICONS.listener[get('flowable:eventType')] ||
      (waitsForRegistryEvent(get('extensionElements')) && TYPE_ICONS.listener.registry);

    return listenerIcon && lineSvg(listenerIcon, true);
  }
}

function waitsForRegistryEvent(extensionElements) {
  var values = (extensionElements && extensionElements.get('values')) || [];

  return values.some(function(value) {
    return (value.$type || '').toLowerCase() === 'flowable:eventtype';
  });
}

function lineSvg(d, circle) {
  return '<svg class="cpp-hierarchy-line-icon" viewBox="0 0 16 16" width="16" height="16" ' +
      'aria-hidden="true" focusable="false" fill="none" stroke="currentColor" ' +
      'stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round">' +
    (circle ?
      '<circle cx="8" cy="8" r="7.3"/>' :
      '<rect x="0.7" y="0.7" width="14.6" height="14.6" rx="2.5"/>') +
    '<path transform="translate(3.5 3.5) scale(0.5625)" stroke-width="1.6" d="' + escapeHTML(d) + '"/>' +
  '</svg>';
}


// the palette's names of Flowable's task and event listener types
var TASK_LABELS = {
  java: 'Service Task',
  script: 'Script Task',
  http: 'HTTP Task',
  mail: 'Email Task',
  casePage: 'Case Page',
  'send-event': 'Send Event Task',
  'external-worker': 'External Worker Task'
};

var LISTENER_LABELS = {
  signal: 'Signal Event Listener',
  variable: 'Variable Event Listener',
  intent: 'Intent Event Listener',
  reactivate: 'Reactivate Event Listener'
};


/**
 * The name of an element's type in the model hierarchy: the palette's name of
 * a Flowable task or event listener type, or the given CMMN type name.
 *
 * @param {ModdleElement} definition
 * @param {string} cmmnLabel the name of its CMMN type
 *
 * @return {string}
 */
module.exports.hierarchyTypeLabel = function(definition, cmmnLabel) {

  var type = definition && definition.$type,
      get = function(name) {
        return definition.get && definition.get(name);
      };

  if (type === 'cmmn:Task') {
    return TASK_LABELS[get('flowable:type')] || cmmnLabel;
  }

  if (type === 'cmmn:EventListener') {
    return LISTENER_LABELS[get('flowable:eventType')] || cmmnLabel;
  }

  return cmmnLabel;
};
