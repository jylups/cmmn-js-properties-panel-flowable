'use strict';

var forEach = require('lodash/forEach'),
    isArray = require('lodash/isArray'),
    isObject = require('lodash/isObject');

var is = require('@jylups/cmmn-js/lib/util/ModelUtil').is,
    getBusinessObject = require('@jylups/cmmn-js/lib/util/ModelUtil').getBusinessObject;

var escapeHTML = require('../../../Utils').escapeHTML;

/**
 * Deepest level of nested extension elements that is shown.
 */
var MAX_DEPTH = 10;


/**
 * Groups of a read-only "Extensions" tab: for the selected element and the
 * model elements it stands for (definition, item control, default control,
 * sentry, case, on-part), the attributes of other namespaces and the
 * extension elements, typed or generic, as a tree. Nothing of a model's
 * extensions stays hidden in the panel.
 *
 * @param {djs.model.Base} element
 * @param {Function} translate
 *
 * @return {Array<Object>} groups
 */
module.exports = function(element, translate) {

  // the groups and entries stay the same while the element is selected, so
  // the panel keeps its DOM; each update renders the extensions again
  return getSources(element, translate).map(function(source) {

    return {
      id: 'extensions-' + source.key,
      label: source.label,
      enabled: function() {
        return hasExtensions(source.bo);
      },
      entries: [
        {
          id: 'extensions-' + source.key,
          html: '<div class="cpp-extensions"></div>',
          get: function(element, node) {
            var target = node && node.querySelector('.cpp-extensions');

            if (target) {
              target.innerHTML = render(source.bo);
            }

            return {};
          }
        }
      ]
    };
  });
};

/**
 * Whether the element has extension attributes or elements.
 */
function hasExtensions(bo) {
  return getExtensionAttributes(bo).length > 0 || getExtensionElements(bo).length > 0;
}

module.exports.hasExtensions = hasExtensions;

/**
 * The HTML of the extensions of the element.
 */
function render(bo) {
  return renderAttributes(getExtensionAttributes(bo)) +
    renderElements(getExtensionElements(bo).map(function(extensionElement) {
      return describe(extensionElement, 0);
    }));
}

module.exports.getSources = getSources;
module.exports.describe = describe;


// sources //////////////////////////////////////////////////////////////


/**
 * The model elements whose extensions are shown for the given element.
 */
function getSources(element, translate) {

  var bo = getBusinessObject(element),
      sources = [];

  function add(key, label, sourceBo) {
    if (sourceBo && sources.every(function(source) { return source.bo !== sourceBo; })) {
      sources.push({ key: key, label: label, bo: sourceBo });
    }
  }

  if (!bo) {
    return sources;
  }

  // connectors: the on-part or association they stand for
  if (is(bo, 'cmmndi:CMMNEdge')) {
    add('element', translate('Connector'), bo.cmmnElementRef);
    return sources;
  }

  // the diagram: the definitions
  if (is(bo, 'cmmndi:CMMNDiagram')) {
    var definitions = bo.$parent && bo.$parent.$parent;

    if (is(definitions, 'cmmn:Definitions')) {
      add('definitions', translate('Definitions'), definitions);
    }

    return sources;
  }

  // a case plan model also shows its case
  if (is(bo, 'cmmn:Stage') && is(bo.$parent, 'cmmn:Case')) {
    add('case', translate('Case'), bo.$parent);
    add('element', translate('Case Plan Model'), bo);
    add('defaultControl', translate('Default Control'), bo.defaultControl);
    return sources;
  }

  add('element', getLabel(bo, translate), bo);

  add('itemControl', translate('Item Control'), bo.itemControl);

  var definition = bo.definitionRef;

  if (definition) {
    add('definition', translate('Definition'), definition);
    add('defaultControl', translate('Default Control'), definition.defaultControl);
  }

  if (is(bo, 'cmmn:Criterion')) {
    add('sentry', translate('Sentry'), bo.sentryRef);
  }

  return sources;
}

function getLabel(bo, translate) {

  if (is(bo, 'cmmn:PlanItem')) {
    return translate('Plan Item');
  }

  if (is(bo, 'cmmn:DiscretionaryItem')) {
    return translate('Discretionary Item');
  }

  if (is(bo, 'cmmn:Criterion')) {
    return translate('Criterion');
  }

  return translate('Element');
}


// extensions ///////////////////////////////////////////////////////////


/**
 * Attributes of the element that belong to another namespace than the
 * element: typed extension properties with a value, and unknown attributes.
 *
 * @return {Array<Array<string>>} [ name, value ] pairs
 */
function getExtensionAttributes(bo) {

  var descriptor = bo.$descriptor,
      prefix = descriptor && descriptor.ns && descriptor.ns.prefix,
      attributes = [];

  forEach((descriptor && descriptor.properties) || [], function(property) {

    if (!property.isAttr || property.ns.prefix === prefix) {
      return;
    }

    var value = getOwnValue(bo, property);

    if (value !== undefined && value !== null) {
      attributes.push([ property.ns.name, toText(value) ]);
    }
  });

  return attributes.concat(getUnknownAttributes(bo));
}

/**
 * Attributes the model has no property for, without namespace declarations.
 */
function getUnknownAttributes(bo) {

  var attributes = [];

  forEach(bo.$attrs || {}, function(value, name) {
    if (name !== 'xmlns' && name.indexOf('xmlns:') !== 0) {
      attributes.push([ name, toText(value) ]);
    }
  });

  return attributes;
}

/**
 * The value of a property as set on the element, not the default the
 * descriptor declares.
 */
function getOwnValue(element, property) {
  return Object.prototype.hasOwnProperty.call(element, property.name) ? element[property.name] : undefined;
}

function getExtensionElements(bo) {
  var extensionElements = bo.extensionElements;

  return (extensionElements && extensionElements.values) || [];
}


/**
 * Describe an element as { name, attributes, text, children }, with its
 * name as written in XML.
 */
function describe(element, depth) {

  var descriptor = element.$descriptor;

  if (!descriptor || descriptor.isGeneric) {
    return describeGeneric(element, depth);
  }

  var prefix = descriptor.ns.prefix,
      result = {
        name: xmlName(descriptor.ns),
        attributes: [],
        text: undefined,
        children: []
      };

  forEach(descriptor.properties, function(property) {

    var value = getOwnValue(element, property);

    if (value === undefined || value === null || (isArray(value) && !value.length)) {
      return;
    }

    if (property.isAttr) {
      result.attributes.push([
        property.ns.prefix === prefix ? property.ns.localName : property.ns.name,
        property.isReference ? value.id : toText(value)
      ]);
      return;
    }

    if (property.isBody) {
      result.text = toText(value);
      return;
    }

    if (property.isReference) {
      return;
    }

    forEach(isArray(value) ? value : [ value ], function(child) {

      if (isObject(child) && child.$type) {
        if (depth < MAX_DEPTH) {
          result.children.push(describe(child, depth + 1));
        }
      } else {

        // a simple value written as an element, e.g. <flowable:string>
        result.children.push({
          name: xmlName(property.ns),
          attributes: [],
          text: toText(child),
          children: []
        });
      }
    });
  });

  result.attributes = result.attributes.concat(getUnknownAttributes(element));

  return result;
}

function describeGeneric(element, depth) {

  var result = {
    name: element.$type,
    attributes: [],
    text: element.$body,
    children: []
  };

  forEach(Object.keys(element), function(key) {
    var value = element[key];

    if (key.charAt(0) !== '$' && !isObject(value)) {
      result.attributes.push([ key, toText(value) ]);
    }
  });

  if (depth < MAX_DEPTH) {
    forEach(element.$children || [], function(child) {
      result.children.push(describe(child, depth + 1));
    });
  }

  return result;
}

/**
 * The XML name of a type or property: its prefix and its local name with a
 * lower case first letter, as the Flowable package aliases its types.
 */
function xmlName(ns) {
  var localName = ns.localName;

  return ns.prefix + ':' + localName.charAt(0).toLowerCase() + localName.slice(1);
}

function toText(value) {
  return isObject(value) && value.id ? value.id : String(value);
}


// rendering ////////////////////////////////////////////////////////////


function renderAttributes(attributes) {

  if (!attributes.length) {
    return '';
  }

  return '<dl class="cpp-extensions-attributes">' +
    attributes.map(function(attribute) {
      return '<dt>' + escapeHTML(attribute[0]) + '</dt><dd>' + escapeHTML(attribute[1]) + '</dd>';
    }).join('') +
  '</dl>';
}

function renderElements(descriptions) {

  if (!descriptions.length) {
    return '';
  }

  return '<ul class="cpp-extensions-elements">' +
    descriptions.map(renderElement).join('') +
  '</ul>';
}

function renderElement(description) {

  var text = description.text;

  return '<li>' +
    '<span class="cpp-extensions-name">' + escapeHTML(description.name) + '</span>' +
    renderAttributes(description.attributes) +
    (text !== undefined && String(text).trim() ?
      '<pre class="cpp-extensions-text">' + escapeHTML(String(text).trim()) + '</pre>' : '') +
    renderElements(description.children) +
  '</li>';
}
