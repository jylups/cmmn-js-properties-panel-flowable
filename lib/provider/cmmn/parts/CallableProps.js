'use strict';

var cmdHelper = require('../../../helper/CmdHelper'),
    entryFactory = require('../../../factory/EntryFactory');

var isCallable = require('../../../helper/CmmnElementHelper').isCallable;

var getBusinessObject = require('@jylups/cmmn-js/lib/util/ModelUtil').getBusinessObject,
    getDefinition = require('@jylups/cmmn-js/lib/util/ModelUtil').getDefinition;


var ATTR_DECL = {
  'cmmn:CaseTask': {
    'ref': 'caseRef',
    'expression': 'caseRefExpression'
  },

  'cmmn:ProcessTask': {
    'ref': 'processRef',
    'expression': 'processRefExpression'
  },

  'cmmn:DecisionTask': {
    'ref': 'decisionRef',
    'expression': 'decisionRefExpression'
  }
};

var KIND_LABELS = {
  'case': 'Case',
  process: 'Process',
  decision: 'Decision'
};


function isExpression(text) {
  return /[$#]\{/.test(text);
}

/**
 * The Process, Case or Decision reference of a task (jylups/cmmn-js-env#98):
 * the key of the model to start, kept as the reference expression, which
 * may also be an expression that gives the key.
 */
function modelReference(element, expAttr, cmmnFactory, translate) {

  var kind = callableKind(getDefinition(element)),
      kindLabel = KIND_LABELS[kind];

  var keyOf = function(bo) {
    var expression = bo && bo.get(expAttr);

    return ((expression && expression.get('body')) || '').trim();
  };

  return entryFactory.modelReference({
    id: 'callableModelReference',
    label: translate(kindLabel + ' reference'),
    kind: kind,
    kindLabel: translate(kindLabel),
    taskLabel: translate(kindLabel + ' task'),
    modelProperty: expAttr,
    reference: 'definitionRef',

    get: function(element, node, bo) {
      var values = {};

      values[expAttr] = keyOf(bo);

      return values;
    },

    set: function(element, values, node, bo) {
      var key = (values[expAttr] || '').trim(),
          expression = bo.get(expAttr),
          update = {};

      if (expression) {
        return cmdHelper.updateProperties(expression, { body: key || undefined }, element);
      }

      if (!key) {
        return null;
      }

      update[expAttr] = cmmnFactory.create('cmmn:Expression', { body: key });

      return cmdHelper.updateProperties(bo, update, element);
    },

    validate: function(element, values) {
      var validation = {};

      if (!(values[expAttr] || '').trim()) {
        validation[expAttr] = translate('A model reference is required');
      }

      return validation;
    },

    // the read view: the model's name and key, which open it (see PropertiesPanel)
    summaryValue: function(element, panel) {
      var key = keyOf(getDefinition(element)),
          summary = { label: translate(kindLabel + ' reference'), value: key, required: true };

      if (!key || isExpression(key)) {
        summary.expression = !!key;
        return summary;
      }

      var info = (panel && panel.referencedModelInfo && panel.referencedModelInfo(kind, key)) || {};

      summary.value = info.name && info.name !== key ? info.name + ' (' + key + ')' : key;
      summary.icon = kind;

      if (info.canOpen) {
        summary.open = { kind: kind, key: key };
      }

      return summary;
    }
  });
}

// what a callable task starts, for the values to pick (#90)
var CALLABLE_KINDS = {
  'cmmn:CaseTask': 'case',
  'cmmn:ProcessTask': 'process',
  'cmmn:DecisionTask': 'decision'
};

function callableKind(definition) {
  var bo = getBusinessObject(definition);

  return bo && CALLABLE_KINDS[bo.$type];
}


module.exports = function(group, element, cmmnFactory, elementRegistry, itemRegistry, translate) {

  if (!isCallable(element)) {
    return;
  }


  function getAttribute(element, prop) {
    var bo = getBusinessObject(element),
        type = bo && bo.$type;
    return (ATTR_DECL[type] || {})[prop];
  }


  var validate = function(prop) {
    return function(element, values, node, bo) {
      var attr = getAttribute(bo, prop),
          validate = {};

      if (!values[attr]) {
        validate[attr] = translate('Must provide a value');
      }

      return validate;
    };
  };


  var definition = getDefinition(element),
      refAttr = getAttribute(definition, 'ref'),
      expAttr = getAttribute(definition, 'expression');

  // Flowable keeps the key of the model to start as the reference
  // expression: a reference as in Flowable Design (jylups/cmmn-js-env#98).
  // A task that uses CMMN's reference to an element of the file keeps the
  // fields below.
  if (definition && definition.get(refAttr) === undefined) {
    group.entries.push(modelReference(element, expAttr, cmmnFactory, translate));
    return;
  }

  group.entries.push(entryFactory.selectBox({

    id: 'callableRefType',
    label: translate('Type'),
    selectOptions: [
      { name: translate('Reference'), value: 'ref' },
      { name: translate('Expression'), value: 'expression' }
    ],
    modelProperty: 'type',
    reference: 'definitionRef',

    get: function(element, node, bo) {

      var refAttr = getAttribute(bo, 'ref'),
          expAttr = getAttribute(bo, 'expression'),
          ref = bo && bo.get(refAttr),
          expression = bo && bo.get(expAttr);

      return {
        type: (ref || !expression) ? 'ref' : 'expression'
      };

    },

    set: function(element, values, node, bo) {

      var refAttr = getAttribute(bo, 'ref'),
          expAttr = getAttribute(bo, 'expression'),
          type = values.type,
          update = {};

      update[refAttr] = type === 'ref' ? '' : undefined;
      update[expAttr] = type === 'expression' ? cmmnFactory.create('cmmn:Expression') : undefined;

      return cmdHelper.updateProperties(bo, update, element);

    }

  }));


  group.entries.push(entryFactory.textField({

    id: 'callableReference',
    label: translate('Reference'),
    reference: 'definitionRef',
    modelProperty: getAttribute(getDefinition(element), 'ref'),

    validate: validate('ref'),

    disabled: function(element) {

      var definition = getDefinition(element),
          refAttr = getAttribute(definition, 'ref'),
          refExpAttr = getAttribute(definition, 'expression'),
          ref = definition && definition.get(refAttr),
          expression = definition && definition.get(refExpAttr);

      return !ref && expression;

    }

  }));


  // a process task or decision task may refer to a process or decision
  // element of the file, whose externalRef is the key Flowable starts
  // refAttr: see above

  if (refAttr === 'processRef' || refAttr === 'decisionRef') {

    var collection = refAttr === 'processRef' ? 'processes' : 'decisions';

    // the process or decision element of the file with the referenced id
    var getReferenced = function(element) {
      var definition = getDefinition(element),
          ref = definition && definition.get(refAttr),
          definitions = definition;

      while (definitions && definitions.$type !== 'cmmn:Definitions') {
        definitions = definitions.$parent;
      }

      if (!ref || !definitions) {
        return null;
      }

      return (definitions.get(collection) || []).filter(function(candidate) {
        return candidate.id === ref;
      })[0] || null;
    };

    group.entries.push(entryFactory.textField({

      id: 'callableExternalRef',
      label: refAttr === 'processRef' ? translate('Process Key') : translate('Decision Key'),
      description: translate('The external reference of the referenced element, which Flowable starts'),
      modelProperty: 'externalRef',
      pick: refAttr === 'processRef' ? 'process' : 'decision',

      get: function(element) {
        var referenced = getReferenced(element);

        return { externalRef: (referenced && referenced.get('externalRef')) || '' };
      },

      set: function(element, values) {
        return cmdHelper.updateProperties(getReferenced(element), {
          externalRef: values.externalRef || undefined
        }, element);
      },

      hideEntry: function(element) {
        return !getReferenced(element);
      }
    }));
  }


  group.entries.push(entryFactory.textField({

    id: 'callableReferenceExpression',
    label: translate('Expression'),
    reference: 'definitionRef',
    modelProperty: getAttribute(getDefinition(element), 'expression'),

    // the key of the model to start, or an expression that gives it (#90)
    pick: callableKind(getDefinition(element)),

    validate: validate('expression'),

    get: function(element, node, bo) {

      var attr = getAttribute(bo, 'expression'),
          expression = bo.get(attr),
          value = {};

      value[attr] = expression && expression.get('body');

      return value;

    },

    set: function(element, values, node, bo) {

      var attr = getAttribute(bo, 'expression'),
          expression = bo.get(attr),
          value = values[attr] || undefined;

      return cmdHelper.updateProperties(expression, { body: value }, element);

    },

    disabled: function(element) {

      var definition = getDefinition(element),
          refAttr = getAttribute(definition, 'ref'),
          refExpAttr = getAttribute(definition, 'expression'),
          ref = definition && definition.get(refAttr),
          expression = definition && definition.get(refExpAttr);

      return ref || !expression;

    }

  }));


};
