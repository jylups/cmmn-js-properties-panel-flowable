'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    getBusinessObject = ModelUtil.getBusinessObject,
    getDefinition = ModelUtil.getDefinition,
    isCasePlanModel = ModelUtil.isCasePlanModel;

var extensionElementsEntry = require('./implementation/ExtensionElements'),
    extensionElementUtil = require('./implementation/ExtensionElementUtil'),
    getAll = extensionElementUtil.getAll,
    getLast = extensionElementUtil.getLast,
    addExtension = extensionElementUtil.add,
    removeExtensions = extensionElementUtil.removeAll;

var EventListenerProps = require('./EventListenerProps'),
    isGenericEventListener = EventListenerProps.isGenericEventListener,
    getEventListenerType = EventListenerProps.getEventListenerType;

var TaskProps = require('./TaskProps'),
    isPlainTask = TaskProps.isPlainTask,
    getTaskType = TaskProps.getTaskType;

var forEach = require('lodash/forEach');


var START_CORRELATIONS = [ 'storeAsUniqueReferenceId', 'manualSubscription' ];


/**
 * What the element does with the event registry: 'case' for a case started
 * by an event, 'listener' for an event listener that waits for an event,
 * 'send' for a task that sends an event; undefined otherwise.
 */
function getKind(element) {

  if (isCasePlanModel(element)) {
    return 'case';
  }

  if (isGenericEventListener(element) && !getEventListenerType(element)) {
    return 'listener';
  }

  if (isPlainTask(element) && getTaskType(element) === 'send-event') {
    return 'send';
  }
}

module.exports.getKind = getKind;


/**
 * The element that holds the event registry extension elements: the case
 * of a case plan model, the definition otherwise.
 */
function getContainer(element) {

  if (isCasePlanModel(element)) {
    var bo = getBusinessObject(element);

    return bo && bo.$parent;
  }

  return getDefinition(element);
}


/**
 * A text field for the body of an extension element, which is removed when
 * the text is.
 */
function bodyField(id, label, type, cmmnFactory, translate, options) {

  options = options || {};

  return entryFactory.textField({
    id: id,
    label: translate(label),
    description: options.description && translate(options.description),
    modelProperty: id,

    get: function(element) {
      var extension = getLast(getContainer(element), type),
          values = {};

      values[id] = (extension && extension.get('body')) || '';

      return values;
    },

    set: function(element, values) {
      var container = getContainer(element),
          extension = getLast(container, type),
          body = values[id] || undefined;

      if (!body) {
        return removeExtensions(element, container, type);
      }

      if (extension) {
        return cmdHelper.updateProperties(extension, { body: body }, element);
      }

      return addExtension(element, container, cmmnFactory.create(type, { body: body }), cmmnFactory);
    },

    validate: options.validate
  });
}


/**
 * A list of extension elements of one type, and fields for the attributes
 * of the selected one.
 */
function parameterList(group, element, options, cmmnFactory, translate) {

  var id = options.id,
      type = options.type;

  var list = extensionElementsEntry(element, cmmnFactory, {
    id: id,
    label: translate(options.label),
    modelProperty: options.fields[0][0],
    idGeneration: false,
    resizable: true,
    getBusinessObject: getContainer,

    createExtensionElement: function(element, extensionElements) {
      var parameter = cmmnFactory.create(type, options.createAttributes || {});

      return cmdHelper.updateSemanticParent(parameter, extensionElements, 'values', element);
    },

    removeExtensionElement: function(element, extensionElements, value, idx, bo) {
      var parameter = getAll(bo, type)[idx];

      return cmdHelper.updateSemanticParent(parameter, null, 'values', element);
    },

    getExtensionElements: function(element) {
      return getAll(getContainer(element), type);
    },

    setOptionLabelValue: function(element, node, option, property, value, idx, bo) {
      option.text = options.optionLabel(getAll(bo, type)[idx] || {});
    }
  });

  group.entries.push(list);

  function getSelectedParameter(element, node) {
    var selection = list.getSelected(element, node);

    return selection && selection.idx > -1 ? getAll(getContainer(element), type)[selection.idx] : undefined;
  }

  function hideUnlessSelected(element, node) {
    return !getSelectedParameter(element, node);
  }

  forEach(options.fields, function(field) {

    var property = field[0],
        fieldId = id + '-' + property;

    if (field[2] === 'checkbox') {

      group.entries.push(entryFactory.checkbox({
        id: fieldId,
        label: translate(field[1]),
        modelProperty: fieldId,

        get: function(element, node) {
          var parameter = getSelectedParameter(element, node),
              values = {};

          values[fieldId] = !!parameter && String(parameter.get(property)) === 'true';

          return values;
        },

        set: function(element, values, node) {
          var update = {};

          update[property] = values[fieldId] ? 'true' : undefined;

          return cmdHelper.updateProperties(getSelectedParameter(element, node), update, element);
        },

        hideEntry: hideUnlessSelected
      }));

      return;
    }

    group.entries.push(entryFactory.textField({
      id: fieldId,
      label: translate(field[1]),
      modelProperty: fieldId,

      get: function(element, node) {
        var parameter = getSelectedParameter(element, node),
            values = {};

        values[fieldId] = (parameter && parameter.get(property)) || '';

        return values;
      },

      set: function(element, values, node) {
        var update = {};

        update[property] = values[fieldId] || undefined;

        return cmdHelper.updateProperties(getSelectedParameter(element, node), update, element);
      },

      hideEntry: hideUnlessSelected
    }));
  });
}

function mappingLabel(parameter) {
  return (parameter.source || parameter.sourceExpression || '?') + ' → ' +
    (parameter.target || parameter.targetExpression || '?');
}


/**
 * The groups of the Event Registry tab.
 */
module.exports.eventRegistryGroups = function(element, cmmnFactory, translate) {

  var kind = getKind(element);

  var eventGroup = {
        id: 'eventRegistryEvent',
        label: translate('Event'),
        entries: []
      },
      correlationGroup = {
        id: 'eventRegistryCorrelation',
        label: translate('Correlation Parameters'),
        entries: []
      },
      payloadGroup = {
        id: 'eventRegistryPayload',
        label: translate('Payload Mapping'),
        entries: []
      };

  var groups = [ eventGroup, correlationGroup, payloadGroup ];

  if (!kind) {
    return groups;
  }

  eventGroup.entries.push(bodyField('eventRegistryEventType', 'Event Key', 'flowable:EventType', cmmnFactory, translate, {
    description: kind === 'case' ?
      'Starts the case when this event is received' :
      kind === 'listener' ? 'The event the event listener waits for' : 'The event the task sends',
    validate: function(element, values) {
      return values.eventRegistryEventType || kind === 'case' ?
        {} : { eventRegistryEventType: translate('Must provide a value') };
    }
  }));

  if (kind === 'case') {

    eventGroup.entries.push(entryFactory.selectBox({
      id: 'eventRegistryStartCorrelation',
      label: translate('Start Correlation'),
      modelProperty: 'eventRegistryStartCorrelation',
      selectOptions: [ { name: '', value: '' } ].concat(START_CORRELATIONS.map(function(value) {
        return { name: value, value: value };
      })),

      get: function(element) {
        var extension = getLast(getContainer(element), 'flowable:StartEventCorrelationConfiguration');

        return { eventRegistryStartCorrelation: (extension && extension.get('body')) || '' };
      },

      set: function(element, values) {
        var container = getContainer(element),
            type = 'flowable:StartEventCorrelationConfiguration',
            extension = getLast(container, type),
            body = values.eventRegistryStartCorrelation || undefined;

        if (!body) {
          return removeExtensions(element, container, type);
        }

        if (extension) {
          return cmdHelper.updateProperties(extension, { body: body }, element);
        }

        return addExtension(element, container, cmmnFactory.create(type, { body: body }), cmmnFactory);
      }
    }));
  }

  if (kind === 'send') {

    eventGroup.entries.push(bodyField('eventRegistryChannelKey', 'Channel Key', 'flowable:ChannelKey', cmmnFactory,
      translate, {
        description: 'Channels to send on, comma separated or an expression'
      }));

    eventGroup.entries.push(entryFactory.checkbox({
      id: 'eventRegistrySystemChannel',
      label: translate('Send on System Channel'),
      modelProperty: 'eventRegistrySystemChannel',

      get: function(element) {
        return { eventRegistrySystemChannel: !!getLast(getContainer(element), 'flowable:SystemChannel') };
      },

      set: function(element, values) {
        var container = getContainer(element);

        if (!values.eventRegistrySystemChannel) {
          return removeExtensions(element, container, 'flowable:SystemChannel');
        }

        return addExtension(element, container, cmmnFactory.create('flowable:SystemChannel'), cmmnFactory);
      }
    }));

    // variables to the payload of the sent event
    parameterList(payloadGroup, element, {
      id: 'eventInParameters',
      label: 'Event Payload from Variables',
      type: 'flowable:EventInParameter',
      createAttributes: { source: '', target: '' },
      fields: [
        [ 'source', 'Source (Variable or Expression)' ],
        [ 'target', 'Target (Payload Field)' ]
      ],
      optionLabel: mappingLabel
    }, cmmnFactory, translate);

    return groups;
  }

  parameterList(correlationGroup, element, {
    id: 'eventCorrelationParameters',
    label: 'Correlation Parameters',
    type: 'flowable:EventCorrelationParameter',
    createAttributes: { name: '', value: '' },
    fields: [
      [ 'name', 'Name (Payload Field)' ],
      [ 'value', 'Value' ]
    ],
    optionLabel: function(parameter) {
      return (parameter.name || '?') + ' = ' + (parameter.value || '?');
    }
  }, cmmnFactory, translate);

  // payload of the received event to variables
  parameterList(payloadGroup, element, {
    id: 'eventOutParameters',
    label: 'Variables from Event Payload',
    type: 'flowable:EventOutParameter',
    createAttributes: { source: '', target: '' },
    fields: [
      [ 'source', 'Source (Payload Field)' ],
      [ 'target', 'Target (Variable)' ],
      [ 'transient', 'Transient', 'checkbox' ]
    ],
    optionLabel: mappingLabel
  }, cmmnFactory, translate);

  return groups;
};
