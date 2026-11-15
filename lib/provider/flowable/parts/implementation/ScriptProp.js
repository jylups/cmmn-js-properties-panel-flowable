'use strict';

var cmdHelper = require('../../../../helper/CmdHelper'),
    entryFactory = require('../../../../factory/EntryFactory');


/**
 * The script of a listener, in the form Flowable reads: the listener has
 * type="script" and a <flowable:script> with a language, an optional result
 * variable and the script as its text.
 *
 * A script in the Camunda form, with scriptFormat and possibly an external
 * resource, is shown so it can be changed: editing it writes the Flowable
 * form.
 */
module.exports = function(element, translate, options) {


  var EXTERNAL_TYPE = 'external',
      INLINE_TYPE = 'inline';

  var languageProp = 'language',
      scriptFormatProp = 'scriptFormat',
      resultVariableProp = 'resultVariable',
      valueProp = 'value',
      resourceProp = 'resource';


  function getScriptType(script) {

    var external = script && script.get(resourceProp);

    if (external !== undefined) {
      return EXTERNAL_TYPE;
    }

    return INLINE_TYPE;
  }


  options = options || {};

  var getScript = options.getScript,
      getListener = options.getListener,
      reference = 'definitionRef';


  /**
   * Commands that update the script, and give the listener type="script",
   * without which Flowable does not run it.
   */
  function updateScript(element, node, update) {
    var script = getScript(element, node),
        listener = getListener && getListener(element, node),
        commands = [ cmdHelper.updateProperties(script, update, element) ];

    if (listener && listener.get('type') !== 'script') {
      commands.push(cmdHelper.updateProperties(listener, { type: 'script' }, element));
    }

    return commands;
  }

  var getValue = function(prop, modelProperty) {
    return function(element, node) {
      var script = getScript(element, node),
          value = {};

      value[modelProperty || prop] = (script && script.get(prop)) || undefined;

      return value;
    };
  };

  var setValue = function(prop, modelProperty, defaultValue) {
    return function(element, values, node) {
      var update = {};

      update[prop] = values[modelProperty || prop] || defaultValue;

      return updateScript(element, node, update);
    };
  };

  var hideEntry = function(expectedType) {
    return function(element, node) {
      var script = getScript(element, node);
      return !script || (expectedType && getScriptType(script) !== expectedType);
    };
  };

  var validate = function(prop) {
    return function(element, values) {
      var value = values[prop],
          validate = {};

      if (!value) {
        validate[prop] = translate('Must provide a value');
      }

      return validate;
    };
  };


  var languageEntry = entryFactory.textField({

    id: 'scriptLanguage',
    label: translate('Script Language'),
    description: translate('For example groovy or javascript'),
    modelProperty: 'scriptLanguage',
    reference: reference,

    get: function(element, node) {
      var script = getScript(element, node);

      return {
        scriptLanguage: (script && (script.get(languageProp) || script.get(scriptFormatProp))) || undefined
      };
    },

    // write the language as Flowable reads it, in place of a script format
    set: function(element, values, node) {
      var update = {};

      update[languageProp] = values.scriptLanguage || undefined;
      update[scriptFormatProp] = undefined;

      return updateScript(element, node, update);
    },

    hideEntry: hideEntry(),

    validate: function(element, values, node) {
      var listener = getListener && getListener(element, node);

      if (!values.scriptLanguage) {
        return { scriptLanguage: translate('Must provide a value') };
      }

      if (listener && listener.get('type') !== 'script') {
        return {
          scriptLanguage: {
            warning: translate('Flowable runs the script only with type="script"; editing the script adds it')
          }
        };
      }

      return {};
    }

  });


  // an external resource is of the Camunda form only; offered to change it
  // to an inline script
  var scriptTypeEntry = entryFactory.selectBox({

    id: 'scriptType',
    label: translate('Script Type'),
    modelProperty: 'type',
    reference: reference,
    selectOptions: [
      { value: INLINE_TYPE, name: translate('Inline Script') },
      { value: EXTERNAL_TYPE, name: translate('External Resource') }
    ],

    get: function(element, node) {

      var script = getScript(element, node);
      return {
        type: getScriptType(script)
      };

    },

    set: function(element, values, node) {

      var type = values.type || undefined,
          update = {};

      update[resourceProp] = type === EXTERNAL_TYPE ? '' : undefined;
      update[valueProp] = undefined;

      return updateScript(element, node, update);

    },

    hideEntry: hideEntry(EXTERNAL_TYPE)

  });


  var scriptValueEntry = entryFactory.textBox({

    id: 'scriptValue',
    label: translate('Script'),
    modelProperty: valueProp,
    reference: reference,

    get: getValue(valueProp),
    set: setValue(valueProp),
    hideEntry: hideEntry(INLINE_TYPE),
    validate: validate(valueProp)

  });


  var scriptResouceEntry = entryFactory.textField({

    id: 'scriptResource',
    label: translate('Resource'),
    description: translate('Not read by Flowable; choose an inline script'),
    modelProperty: resourceProp,
    reference: reference,

    get: getValue(resourceProp),
    set: setValue(resourceProp, resourceProp, ''),
    hideEntry: hideEntry(EXTERNAL_TYPE),
    validate: validate(resourceProp)

  });


  var resultVariableEntry = entryFactory.textField({

    id: 'scriptResultVariable',
    label: translate('Result Variable'),
    modelProperty: 'scriptResultVariable',
    reference: reference,

    get: getValue(resultVariableProp, 'scriptResultVariable'),
    set: setValue(resultVariableProp, 'scriptResultVariable'),
    hideEntry: hideEntry(INLINE_TYPE)

  });

  return [ languageEntry, scriptTypeEntry, scriptValueEntry, scriptResouceEntry, resultVariableEntry ];

};
