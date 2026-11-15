'use strict';

var entryFactory = require('../../../factory/EntryFactory'),
    cmdHelper = require('../../../helper/CmdHelper');

var ModelUtil = require('@jylups/cmmn-js/lib/util/ModelUtil'),
    getDefinition = ModelUtil.getDefinition,
    is = ModelUtil.is;

var CmmnElementHelper = require('../../../helper/CmmnElementHelper'),
    isHumanTask = CmmnElementHelper.isHumanTask,
    isInOutBindingCapable = CmmnElementHelper.isInOutBindingCapable;

var forEach = require('lodash/forEach'),
    keys = require('lodash/keys'),
    uniq = require('lodash/uniq'),
    flatten = require('lodash/flatten');


/**
 * The attributes Flowable reads on a plain task, by its flowable:type.
 */
var TYPE_PROPERTIES = {
  'java': [
    'class', 'expression', 'delegateExpression',
    'resultVariableName', 'storeResultVariableAsTransient',
    'formKey', 'formFieldValidation'
  ],
  'script': [ 'scriptFormat', 'resultVariableName', 'autoStoreVariables', 'doNotIncludeVariables' ],
  'http': [ 'class', 'parallelInSameTransaction' ],
  'external-worker': [ 'topic', 'doNotIncludeVariables' ],
  'casePage': [
    'formKey', 'assignee', 'owner', 'candidateUsers', 'candidateGroups', 'label', 'icon', 'sameDeployment'
  ],
  'send-event': [],
  'mail': []
};

var ALL_TYPE_PROPERTIES = uniq(flatten(keys(TYPE_PROPERTIES).map(function(type) {
  return TYPE_PROPERTIES[type];
})));

var IMPLEMENTATIONS = [ 'class', 'expression', 'delegateExpression' ];


// helpers //////////////////////////////////////////////////////////////


/**
 * Whether the element stands for a plain task, which Flowable reads by
 * its flowable:type, not a human, case, process or decision task.
 */
function isPlainTask(element) {
  var definition = getDefinition(element);

  return !!definition && definition.$type === 'cmmn:Task';
}

module.exports.isPlainTask = isPlainTask;

function getTaskType(element) {
  var definition = getDefinition(element);

  return (definition && definition.get('flowable:type')) || '';
}

module.exports.getTaskType = getTaskType;

/**
 * The implementation attribute of a java task: the first one set, as
 * Flowable reads them, or class.
 */
function getImplementation(element) {
  var definition = getDefinition(element),
      implementation;

  forEach(IMPLEMENTATIONS, function(property) {
    if (!implementation && definition && definition.get('flowable:' + property) !== undefined) {
      implementation = property;
    }
  });

  return implementation || 'class';
}

function hideUnlessType(types) {
  return function(element) {
    return types.indexOf(getTaskType(element)) === -1;
  };
}

function update(element, properties) {
  return cmdHelper.updateProperties(getDefinition(element), properties, element);
}

/**
 * A text field for an attribute of the task definition; an empty value
 * removes the attribute.
 */
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

      values[id] = definition && definition.get(property);

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

/**
 * A checkbox for a boolean attribute of the task definition. An unset
 * attribute shows the default Flowable uses; choosing the default removes
 * the attribute.
 */
function checkbox(id, label, property, translate, options) {

  options = options || {};

  function getDefault(element) {
    var defaultValue = options.defaultValue;

    return typeof defaultValue === 'function' ? defaultValue(element) : !!defaultValue;
  }

  return entryFactory.checkbox({
    id: id,
    label: translate(label),
    modelProperty: id,

    get: function(element) {
      var definition = getDefinition(element),
          value = definition && definition.get(property),
          values = {};

      values[id] = typeof value === 'boolean' ? value : getDefault(element);

      return values;
    },

    set: function(element, values) {
      var value = !!values[id],
          properties = {};

      properties[property] = value === getDefault(element) ? undefined : value;

      return update(element, properties);
    },

    hideEntry: options.hideEntry
  });
}

function mustProvideValue(id, translate) {
  return function(element, values) {
    var validate = {};

    if (!values[id]) {
      validate[id] = translate('Must provide a value');
    }

    return validate;
  };
}


// implementation ///////////////////////////////////////////////////////


/**
 * The task type of a plain task and the attributes of that type.
 */
module.exports.implementationProps = function(group, element, cmmnFactory, translate) {

  if (!isPlainTask(element)) {
    return;
  }

  group.entries.push(entryFactory.selectBox({
    id: 'taskType',
    label: translate('Task Type'),
    modelProperty: 'taskType',
    selectOptions: [
      { name: '', value: '' },
      { name: translate('Java'), value: 'java' },
      { name: translate('Script'), value: 'script' },
      { name: translate('HTTP'), value: 'http' },
      { name: translate('External Worker'), value: 'external-worker' },
      { name: translate('Case Page'), value: 'casePage' },
      { name: translate('Send Event'), value: 'send-event' },
      { name: translate('Mail'), value: 'mail' }
    ],

    get: function(element) {
      return { taskType: getTaskType(element) };
    },

    // a new type removes the attributes only the previous type uses
    set: function(element, values) {
      var type = values.taskType || undefined,
          kept = TYPE_PROPERTIES[type] || [],
          definition = getDefinition(element),
          properties = { 'flowable:type': type };

      forEach(ALL_TYPE_PROPERTIES, function(property) {
        var name = 'flowable:' + property;

        if (kept.indexOf(property) === -1 && definition.get(name) !== undefined) {
          properties[name] = undefined;
        }
      });

      return update(element, properties);
    }
  }));


  // java: class, expression or delegate expression
  group.entries.push(entryFactory.selectBox({
    id: 'taskImplementation',
    label: translate('Implementation'),
    modelProperty: 'taskImplementation',
    selectOptions: [
      { name: translate('Java Class'), value: 'class' },
      { name: translate('Expression'), value: 'expression' },
      { name: translate('Delegate Expression'), value: 'delegateExpression' }
    ],

    get: function(element) {
      return { taskImplementation: getImplementation(element) };
    },

    set: function(element, values) {
      var implementation = values.taskImplementation,
          definition = getDefinition(element),
          properties = {};

      forEach(IMPLEMENTATIONS, function(property) {
        var name = 'flowable:' + property;

        if (property === implementation) {
          properties[name] = definition.get(name) || '';
        } else {
          properties[name] = undefined;
        }
      });

      return update(element, properties);
    },

    hideEntry: hideUnlessType([ 'java' ])
  }));

  forEach([
    [ 'taskClass', 'Java Class', 'class' ],
    [ 'taskExpression', 'Expression', 'expression' ],
    [ 'taskDelegateExpression', 'Delegate Expression', 'delegateExpression' ]
  ], function(entry) {
    group.entries.push(textField(entry[0], entry[1], 'flowable:' + entry[2], translate, {
      validate: mustProvideValue(entry[0], translate),
      hideEntry: function(element) {
        return getTaskType(element) !== 'java' || getImplementation(element) !== entry[2];
      }
    }));
  });

  // http: a custom behavior class
  group.entries.push(textField('taskHttpClass', 'Behavior Class', 'flowable:class', translate, {
    hideEntry: hideUnlessType([ 'http' ])
  }));

  group.entries.push(checkbox('taskParallelInSameTransaction', 'Parallel in Same Transaction',
    'flowable:parallelInSameTransaction', translate, {
      hideEntry: hideUnlessType([ 'http' ])
    }));

  // script
  group.entries.push(textField('taskScriptFormat', 'Script Format', 'flowable:scriptFormat', translate, {
    validate: mustProvideValue('taskScriptFormat', translate),
    hideEntry: hideUnlessType([ 'script' ])
  }));

  group.entries.push(checkbox('taskAutoStoreVariables', 'Auto Store Variables',
    'flowable:autoStoreVariables', translate, {
      hideEntry: hideUnlessType([ 'script' ])
    }));

  // external worker
  group.entries.push(textField('taskTopic', 'Topic', 'flowable:topic', translate, {
    validate: mustProvideValue('taskTopic', translate),
    hideEntry: hideUnlessType([ 'external-worker' ])
  }));

  group.entries.push(checkbox('taskDoNotIncludeVariables', 'Do Not Include Variables',
    'flowable:doNotIncludeVariables', translate, {
      hideEntry: hideUnlessType([ 'script', 'external-worker' ])
    }));

  // java and script: result
  group.entries.push(textField('taskResultVariableName', 'Result Variable', 'flowable:resultVariableName', translate, {
    hideEntry: hideUnlessType([ 'java', 'script' ])
  }));

  group.entries.push(checkbox('taskStoreResultVariableAsTransient', 'Store Result Variable as Transient',
    'flowable:storeResultVariableAsTransient', translate, {
      hideEntry: hideUnlessType([ 'java' ])
    }));

  // java and case page: form
  group.entries.push(textField('taskFormKey', 'Form Key', 'flowable:formKey', translate, {
    hideEntry: hideUnlessType([ 'java', 'casePage' ])
  }));

  group.entries.push(textField('taskFormFieldValidation', 'Form Field Validation', 'flowable:formFieldValidation',
    translate, {
      description: 'true, false or an expression',
      hideEntry: hideUnlessType([ 'java' ])
    }));

  // case page
  forEach([
    [ 'taskLabel', 'Label', 'label' ],
    [ 'taskIcon', 'Icon', 'icon' ],
    [ 'taskAssignee', 'Assignee', 'assignee' ],
    [ 'taskOwner', 'Owner', 'owner' ],
    [ 'taskCandidateUsers', 'Candidate Users', 'candidateUsers' ],
    [ 'taskCandidateGroups', 'Candidate Groups', 'candidateGroups' ]
  ], function(entry) {
    group.entries.push(textField(entry[0], entry[1], 'flowable:' + entry[2], translate, {
      hideEntry: hideUnlessType([ 'casePage' ])
    }));
  });

  group.entries.push(checkbox('taskCasePageSameDeployment', 'Same Deployment', 'flowable:sameDeployment', translate, {
    defaultValue: true,
    hideEntry: hideUnlessType([ 'casePage' ])
  }));
};


// asynchronous continuations ///////////////////////////////////////////


/**
 * Asynchronous start and leave of every task.
 */
module.exports.asyncProps = function(group, element, cmmnFactory, translate) {

  if (!is(getDefinition(element), 'cmmn:Task')) {
    return;
  }

  function isSet(property) {
    return function(element) {
      var definition = getDefinition(element);

      return !!(definition && definition.get(property));
    };
  }

  group.entries.push(checkbox('taskAsync', 'Asynchronous', 'flowable:async', translate));

  group.entries.push(checkbox('taskExclusive', 'Exclusive', 'flowable:exclusive', translate, {
    hideEntry: function(element) {
      return !isSet('flowable:async')(element);
    }
  }));

  group.entries.push(checkbox('taskAsyncLeave', 'Asynchronous Leave', 'flowable:asyncLeave', translate));

  group.entries.push(checkbox('taskAsyncLeaveExclusive', 'Exclusive Leave', 'flowable:asyncLeaveExclusive',
    translate, {
      hideEntry: function(element) {
        return !isSet('flowable:asyncLeave')(element);
      }
    }));
};


// details //////////////////////////////////////////////////////////////


/**
 * Blocking expression of every task, same deployment of human, case and
 * process tasks, and the child attributes of case and process tasks.
 */
module.exports.detailProps = function(group, element, cmmnFactory, translate) {

  if (!is(getDefinition(element), 'cmmn:Task')) {
    return;
  }

  group.entries.push(textField('taskBlockingExpression', 'Blocking Expression', 'flowable:isBlockingExpression',
    translate, {
      description: 'Decides at runtime whether the task is blocking'
    }));

  var humanTask = isHumanTask(element),
      childTask = isInOutBindingCapable(element);

  if (humanTask || childTask) {

    // Flowable deploys the form of a human task from the same deployment
    // by default, the case or process of a child task not
    group.entries.push(checkbox('taskSameDeployment', 'Same Deployment', 'flowable:sameDeployment', translate, {
      defaultValue: humanTask
    }));
  }

  if (!childTask) {
    return;
  }

  group.entries.push(textField('childBusinessKey', 'Business Key Expression', 'flowable:businessKey', translate));

  group.entries.push(checkbox('childInheritBusinessKey', 'Inherit Business Key', 'flowable:inheritBusinessKey',
    translate));

  group.entries.push(checkbox('childInheritVariables', 'Inherit Variables', 'flowable:inheritVariables', translate));

  group.entries.push(textField('childIdVariableName', 'Id Variable', 'flowable:idVariableName', translate, {
    description: 'Stores the id of the started case or process instance'
  }));

  group.entries.push(checkbox('childFallbackToDefaultTenant', 'Fallback to Default Tenant',
    'flowable:fallbackToDefaultTenant', translate));
};
