'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    is = ModelUtil.is,
    getDefinition = ModelUtil.getDefinition;

var extensionElementUtil = require('./implementation/ExtensionElementUtil'),
    getAll = extensionElementUtil.getAll,
    getLast = extensionElementUtil.getLast,
    addExtension = extensionElementUtil.add,
    removeExtensions = extensionElementUtil.removeAll;

var TaskProps = require('./TaskProps'),
    isPlainTask = TaskProps.isPlainTask,
    getTaskType = TaskProps.getTaskType;

var parameterList = require('./EventRegistryProps').parameterList;

var forEach = require('lodash/forEach');


var FIELD = 'flowable:Field';

var EXPRESSION = /[$#]\{/;

var HTTP_METHODS = [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE' ];


/**
 * The settings Flowable reads from the fields (<flowable:field name="...">)
 * of a task, by task type. Each is [ name, label, kind, options ]; kind is
 * text (default), box (several lines), bool or select; options.id names the
 * entry when two types share a field name.
 */
var FIELDS = {
  script: [
    [ 'script', 'Script', 'box', { required: true } ]
  ],
  http: [
    [ 'requestMethod', 'Request Method', 'select', { required: true, values: HTTP_METHODS } ],
    [ 'requestUrl', 'Request URL', 'text', { required: true } ],
    [ 'requestHeaders', 'Request Headers', 'box', { description: 'One header per line, as Name: value' } ],
    [ 'requestSecureHeaders', 'Secure Request Headers', 'box', { description: 'Headers whose values are not logged' } ],
    [ 'requestBody', 'Request Body', 'box' ],
    [ 'requestBodyEncoding', 'Request Body Encoding' ],
    [ 'requestTimeout', 'Request Timeout', 'text', { description: 'In milliseconds' } ],
    [ 'disallowRedirects', 'Disallow Redirects', 'bool' ],
    [ 'failStatusCodes', 'Fail Status Codes', 'text', { description: 'Comma separated, such as 400, 5XX' } ],
    [ 'handleStatusCodes', 'Handle Status Codes', 'text', { description: 'Comma separated, such as 404, 4XX' } ],
    [ 'ignoreException', 'Ignore Exception', 'bool' ],
    [ 'saveRequestVariables', 'Save Request Variables', 'bool' ],
    [ 'saveResponseParameters', 'Save Response Status, Headers and Body', 'bool' ],
    [ 'saveResponseParametersTransient', 'Save Response as Transient Variables', 'bool' ],
    [ 'saveResponseVariableAsJson', 'Save Response Body as JSON', 'bool' ],
    [ 'responseVariableName', 'Response Variable Name' ],
    [ 'resultVariablePrefix', 'Result Variable Prefix' ],
    [ 'httpActivityBehaviorClass', 'Behavior Class', 'text', {
      description: 'A class that replaces the default HTTP behavior'
    } ]
  ],
  mail: [
    [ 'to', 'To', 'text', { description: 'Comma separated addresses' } ],
    [ 'from', 'From' ],
    [ 'cc', 'Cc' ],
    [ 'bcc', 'Bcc' ],
    [ 'subject', 'Subject' ],
    [ 'headers', 'Headers', 'box' ],
    [ 'text', 'Text', 'box' ],
    [ 'textVar', 'Text Variable' ],
    [ 'html', 'HTML', 'box' ],
    [ 'htmlVar', 'HTML Variable' ],
    [ 'charset', 'Charset' ],
    [ 'attachments', 'Attachments', 'text', { description: 'An expression giving files or data sources' } ],
    [ 'ignoreException', 'Ignore Exception', 'bool', { id: 'mailIgnoreException' } ],
    [ 'exceptionVariableName', 'Exception Variable Name' ]
  ],
  decision: [
    [ 'decisionTaskThrowErrorOnNoHits', 'Throw Error When No Rule Hits', 'bool' ],
    [ 'fallbackToDefaultTenant', 'Fallback to Default Tenant', 'bool' ],
    [ 'sameDeployment', 'Same Deployment', 'bool', { defaultValue: true } ]
  ]
};


function getFields(definition) {
  return getAll(definition, FIELD);
}

function getField(definition, name) {
  return getFields(definition).filter(function(field) {
    return field.name === name;
  })[0];
}

/**
 * The value of a field, however it is written: as stringValue or expression
 * attribute, or as string or expression child in either namespace.
 */
function getFieldValue(field) {

  if (!field) {
    return undefined;
  }

  var value = field.stringValue;

  [ 'expression', 'string' ].forEach(function(property) {
    if (typeof value === 'undefined') {
      value = field.get(property);
    }
  });

  [ 'expressionElement', 'cmmnString', 'cmmnExpression' ].forEach(function(property) {
    var child = field.get(property);

    if (typeof value === 'undefined' && child) {
      value = child.body;
    }
  });

  return value;
}


/**
 * Commands that set the value of a field: an expression is written as
 * <flowable:expression>, any other value as <flowable:string>; an empty value
 * removes the field.
 */
function setFieldValue(element, definition, name, value, cmmnFactory) {

  var field = getField(definition, name);

  if (!value) {

    if (!field) {
      return [];
    }

    var others = getFields(definition).filter(function(f) {
      return f.name === name;
    });

    return removeFieldsCommands(element, definition, others);
  }

  var properties = {
    stringValue: undefined,
    expression: undefined,
    string: undefined,
    expressionElement: undefined,
    cmmnString: undefined,
    cmmnExpression: undefined
  };

  if (EXPRESSION.test(value)) {
    properties.expressionElement = cmmnFactory.create('flowable:Expression', { body: value });
  } else {
    properties.string = value;
  }

  if (field) {
    return cmdHelper.updateProperties(field, properties, element);
  }

  properties.name = name;

  return addExtension(element, definition, cmmnFactory.create(FIELD, properties), cmmnFactory);
}

function removeFieldsCommands(element, definition, fields) {

  // remove all fields of the name, keeping the others
  if (fields.length === getFields(definition).length) {
    return removeExtensions(element, definition, FIELD);
  }

  return fields.map(function(field) {
    return cmdHelper.updateSemanticParent(field, null, 'values', element);
  });
}


function fieldEntry(type, spec, cmmnFactory, translate) {

  var name = spec[0],
      label = translate(spec[1]),
      kind = spec[2] || 'text',
      options = spec[3] || {},
      id = 'taskField-' + (options.id || name);

  var description = options.description && translate(options.description);

  function get(element) {
    var values = {},
        value = getFieldValue(getField(getDefinition(element), name));

    if (kind === 'bool') {
      values[id] = typeof value === 'undefined' ?
        !!options.defaultValue :
        String(value).trim().toLowerCase() === 'true';
    } else {
      values[id] = value || '';
    }

    return values;
  }

  function set(element, values) {
    var value = values[id];

    if (kind === 'bool') {
      value = !!value === !!options.defaultValue ? undefined : (value ? 'true' : 'false');
    }

    return setFieldValue(element, getDefinition(element), name, value, cmmnFactory);
  }

  function validate(element, values) {
    var result = {};

    if (options.required && !values[id]) {
      result[id] = translate('Must provide a value');
    }

    return result;
  }

  var common = {
    id: id,
    label: label,
    description: description,
    modelProperty: id,
    get: get,
    set: set,
    validate: validate
  };

  if (kind === 'bool') {
    return entryFactory.checkbox(common);
  }

  if (kind === 'box') {
    return entryFactory.textBox(common);
  }

  if (kind === 'select') {
    common.selectOptions = [ { name: '', value: '' } ].concat(options.values.map(function(value) {
      return { name: value, value: value };
    }));

    return entryFactory.selectBox(common);
  }

  return entryFactory.textField(common);
}


/**
 * A class or delegate expression of the request or response handler of an HTTP task.
 */
function handlerEntry(type, property, label, cmmnFactory, translate) {

  var id = 'taskHttp-' + type.replace('flowable:Http', '').toLowerCase() + '-' + property;

  return entryFactory.textField({
    id: id,
    label: translate(label),
    modelProperty: id,

    get: function(element) {
      var handler = getLast(getDefinition(element), type),
          values = {};

      values[id] = (handler && handler.get(property)) || '';

      return values;
    },

    set: function(element, values) {
      var definition = getDefinition(element),
          handler = getLast(definition, type),
          value = values[id] || undefined,
          properties = {};

      properties[property] = value;

      if (handler) {

        // a handler with neither class nor delegate expression is removed
        var other = property === 'class' ? 'delegateExpression' : 'class';

        if (!value && !handler.get(other)) {
          return removeExtensions(element, definition, type);
        }

        return cmdHelper.updateProperties(handler, properties, element);
      }

      if (!value) {
        return [];
      }

      return addExtension(element, definition, cmmnFactory.create(type, properties), cmmnFactory);
    }
  });
}


function mappingLabel(parameter) {
  return (parameter.source || parameter.sourceExpression || '?') + ' → ' +
    (parameter.target || parameter.targetExpression || '?');
}


/**
 * What Flowable reads from the fields and extension elements of script,
 * HTTP, mail, decision, service and external worker tasks.
 */
module.exports = function(group, element, cmmnFactory, translate) {

  var definition = getDefinition(element),
      type;

  if (is(definition, 'cmmn:DecisionTask')) {
    type = 'decision';
  } else if (isPlainTask(element)) {
    type = getTaskType(element);
  } else {
    return;
  }

  forEach(FIELDS[type] || [], function(spec) {
    group.entries.push(fieldEntry(type, spec, cmmnFactory, translate));
  });

  if (type === 'http') {
    group.entries.push(handlerEntry('flowable:HttpRequestHandler', 'class', 'Request Handler Class',
      cmmnFactory, translate));
    group.entries.push(handlerEntry('flowable:HttpRequestHandler', 'delegateExpression',
      'Request Handler Delegate Expression', cmmnFactory, translate));
    group.entries.push(handlerEntry('flowable:HttpResponseHandler', 'class', 'Response Handler Class',
      cmmnFactory, translate));
    group.entries.push(handlerEntry('flowable:HttpResponseHandler', 'delegateExpression',
      'Response Handler Delegate Expression', cmmnFactory, translate));
  }

  // fields injected into the class of a service task
  if (type === 'java') {
    parameterList(group, element, {
      id: 'taskClassFields',
      label: 'Class Fields',
      type: FIELD,
      createAttributes: { name: '' },
      fields: [
        [ 'name', 'Name' ],
        [ 'stringValue', 'String Value' ],
        [ 'expression', 'Expression' ]
      ],
      optionLabel: function(field) {
        var value = getFieldValue(field);

        return (field.name || '?') + ' = ' + (typeof value === 'undefined' ? '' : value);
      }
    }, cmmnFactory, translate);
  }

  // variables passed to the script, or to and from the external worker
  if (type === 'script' || type === 'external-worker') {
    parameterList(group, element, {
      id: 'taskInParameters',
      label: type === 'script' ? 'Input Variables' : 'Variables to the Worker',
      type: type === 'script' ? 'flowable:In' : 'flowable:ExternalWorkerInParameter',
      createAttributes: { source: '', target: '' },
      fields: [
        [ 'source', 'Source (Variable)' ],
        [ 'sourceExpression', 'Source Expression' ],
        [ 'target', 'Target' ]
      ],
      optionLabel: mappingLabel
    }, cmmnFactory, translate);
  }

  if (type === 'external-worker') {
    parameterList(group, element, {
      id: 'taskOutParameters',
      label: 'Variables from the Worker',
      type: 'flowable:ExternalWorkerOutParameter',
      createAttributes: { source: '', target: '' },
      fields: [
        [ 'source', 'Source (Worker Variable)' ],
        [ 'target', 'Target (Variable)' ],
        [ 'targetExpression', 'Target Expression' ]
      ],
      optionLabel: mappingLabel
    }, cmmnFactory, translate);
  }
};

module.exports.getFieldValue = getFieldValue;
