'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    is = ModelUtil.is,
    getDefinition = ModelUtil.getDefinition;

var forEach = require('lodash/forEach');


/**
 * The attributes Flowable reads for each kind of generic event listener.
 */
var TYPE_PROPERTIES = {
  signal: [ 'signalRef' ],
  variable: [ 'variableName', 'variableChangeType' ],
  intent: [],
  reactivate: []
};

var VARIABLE_CHANGE_TYPES = [ 'all', 'create', 'update', 'update-create', 'delete' ];


/**
 * Whether the element stands for a generic event listener, not a user or
 * timer event listener.
 */
function isGenericEventListener(element) {
  var definition = getDefinition(element);

  return !!definition && definition.$type === 'cmmn:EventListener';
}

module.exports.isGenericEventListener = isGenericEventListener;


/**
 * The kind of a generic event listener; empty for one that waits for an
 * event registry event.
 */
function getEventListenerType(element) {
  var definition = getDefinition(element);

  return (definition && definition.get('flowable:eventType')) || '';
}

module.exports.getEventListenerType = getEventListenerType;


function update(element, properties) {
  return cmdHelper.updateProperties(getDefinition(element), properties, element);
}

function textField(id, label, property, translate, options) {

  options = options || {};

  return entryFactory.textField({
    id: id,
    label: translate(label),
    description: options.description && translate(options.description),
    modelProperty: id,

    get: function(element) {
      var definition = getDefinition(element),
          values = {};

      values[id] = (definition && definition.get(property)) || '';

      return values;
    },

    set: function(element, values) {
      var properties = {};

      properties[property] = values[id] || undefined;

      return update(element, properties);
    },

    validate: options.validate,
    hideEntry: options.hideEntry
  });
}

function hideUnlessType(type) {
  return function(element) {
    return getEventListenerType(element) !== type;
  };
}


/**
 * The kind of a generic event listener and its attributes, and the
 * available condition of every event listener.
 */
module.exports.eventListenerProps = function(group, element, translate) {

  if (!is(getDefinition(element), 'cmmn:EventListener')) {
    return;
  }

  if (isGenericEventListener(element)) {

    group.entries.push(entryFactory.selectBox({
      id: 'eventListenerType',
      label: translate('Listener Type'),
      description: translate('Waits for an event of the event registry when empty'),
      modelProperty: 'eventListenerType',
      selectOptions: [
        { name: '', value: '' },
        { name: translate('Signal'), value: 'signal' },
        { name: translate('Variable'), value: 'variable' },
        { name: translate('Intent'), value: 'intent' },
        { name: translate('Reactivate'), value: 'reactivate' }
      ],

      get: function(element) {
        return { eventListenerType: getEventListenerType(element) };
      },

      // a new kind removes the attributes only the previous kind uses
      set: function(element, values) {
        var type = values.eventListenerType || undefined,
            kept = TYPE_PROPERTIES[type] || [],
            definition = getDefinition(element),
            properties = { 'flowable:eventType': type };

        forEach(TYPE_PROPERTIES, function(names) {
          forEach(names, function(name) {
            if (kept.indexOf(name) === -1 && definition.get('flowable:' + name) !== undefined) {
              properties['flowable:' + name] = undefined;
            }
          });
        });

        return update(element, properties);
      }
    }));

    group.entries.push(textField('eventListenerSignalRef', 'Signal', 'flowable:signalRef', translate, {
      hideEntry: hideUnlessType('signal'),
      validate: function(element, values) {
        return values.eventListenerSignalRef || getEventListenerType(element) !== 'signal' ?
          {} : { eventListenerSignalRef: translate('Must provide a value') };
      }
    }));

    group.entries.push(textField('eventListenerVariableName', 'Variable Name', 'flowable:variableName', translate, {
      hideEntry: hideUnlessType('variable'),
      validate: function(element, values) {
        return values.eventListenerVariableName || getEventListenerType(element) !== 'variable' ?
          {} : { eventListenerVariableName: translate('Must provide a value') };
      }
    }));

    group.entries.push(entryFactory.selectBox({
      id: 'eventListenerVariableChangeType',
      label: translate('Variable Change Type'),
      modelProperty: 'eventListenerVariableChangeType',
      selectOptions: [ { name: '', value: '' } ].concat(VARIABLE_CHANGE_TYPES.map(function(type) {
        return { name: type, value: type };
      })),

      get: function(element) {
        var definition = getDefinition(element);

        return { eventListenerVariableChangeType: (definition && definition.get('flowable:variableChangeType')) || '' };
      },

      set: function(element, values) {
        return update(element, { 'flowable:variableChangeType': values.eventListenerVariableChangeType || undefined });
      },

      hideEntry: hideUnlessType('variable')
    }));
  }

  // the roles that may trigger a user event listener: Flowable reads a comma list,
  // which is kept as written
  if (is(getDefinition(element), 'cmmn:UserEventListener')) {
    group.entries.push(entryFactory.textField({
      id: 'eventListenerAuthorizedRoles',
      label: translate('Authorized Roles'),
      description: translate('Roles that may trigger the listener, comma separated'),
      modelProperty: 'eventListenerAuthorizedRoles',

      get: function(element) {
        var roles = getDefinition(element).get('authorizedRoleRefs');

        if (Array.isArray(roles)) {
          roles = roles.map(function(role) {
            return role && (role.id || role);
          }).join(',');
        }

        return { eventListenerAuthorizedRoles: roles || '' };
      },

      set: function(element, values) {
        var roles = (values.eventListenerAuthorizedRoles || '').split(',').map(function(role) {
          return role.trim();
        }).filter(function(role) {
          return role;
        }).join(',');

        return update(element, { authorizedRoleRefs: roles || undefined });
      }
    }));
  }

  group.entries.push(textField('eventListenerAvailableCondition', 'Available Condition',
    'flowable:availableCondition', translate, {
      description: 'Expression that makes the event listener available'
    }));
};
