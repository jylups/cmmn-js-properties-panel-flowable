'use strict';

var escapeHTML = require('./Utils').escapeHTML;

var domify = require('min-dom').domify,
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll,
    domRemove = require('min-dom').remove,
    domClasses = require('min-dom').classes,
    domClosest = require('min-dom').closest,
    domAttr = require('min-dom').attr,
    domDelegate = require('min-dom').delegate,
    domMatches = require('min-dom').matches;

var forEach = require('lodash/forEach'),
    filter = require('lodash/filter'),
    get = require('lodash/get'),
    keys = require('lodash/keys'),
    isEmpty = require('lodash/isEmpty'),
    isArray = require('lodash/isArray'),
    xor = require('lodash/xor'),
    debounce = require('lodash/debounce'),
    assign = require('lodash/assign');

var updateSelection = require('selection-update');

var HIDE_CLASS = 'cpp-hidden';
var COLLAPSED_CLASS = 'cpp-collapsed';
var DEBOUNCE_DELAY = 300;


function isToggle(node) {
  return node.type === 'checkbox' || node.type === 'radio';
}

function isSelect(node) {
  return node.type === 'select-one';
}

function isContentEditable(node) {
  return domAttr(node, 'contenteditable');
}

function getPropertyPlaceholders(node) {
  var selector = 'input[name], textarea[name], [data-value], [contenteditable]';
  var placeholders = domQueryAll(selector, node);
  if ((!placeholders || !placeholders.length) && domMatches(node, selector)) {
    placeholders = [ node ];
  }
  return placeholders;
}

/**
 * Return all active form controls.
 * This excludes the invisible controls unless all is true
 *
 * @param {Element} node
 * @param {Boolean} [all=false]
 */
function getFormControls(node, all) {
  var controls = domQueryAll('input[name], textarea[name], select[name], [contenteditable]', node);

  if (!controls || !controls.length) {
    controls = domMatches(node, 'option') ? [ node ] : controls;
  }

  if (!all) {
    controls = filter(controls, function(node) {
      return !domClosest(node, '.' + HIDE_CLASS);
    });
  }

  return controls;
}

function getFormControlValuesInScope(entryNode) {
  var values = {};

  var controlNodes = getFormControls(entryNode);

  forEach(controlNodes, function(controlNode) {
    var value = controlNode.value;

    var name = domAttr(controlNode, 'name') || domAttr(controlNode, 'data-name');

    // take toggle state into account for radio / checkboxes
    if (isToggle(controlNode)) {
      if (controlNode.checked) {
        if (!domAttr(controlNode, 'value')) {
          value = true;
        } else {
          value = controlNode.value;
        }
      } else {
        value = null;
      }
    } else
    if (isContentEditable(controlNode)) {
      value = controlNode.innerText;
    }

    if (value !== null) {
      // return the actual value
      // handle serialization in entry provider
      // (ie. if empty string should be serialized or not)
      values[name] = value;
    }
  });

  return values;

}

/**
 * Extract input values from entry node
 *
 * @param  {DOMElement} entryNode
 * @returns {Object}
 */
function getFormControlValues(entryNode) {

  var values;

  var listContainer = domQuery('[data-list-entry-container]', entryNode);
  if (listContainer) {
    values = [];
    var listNodes = listContainer.children || [];
    forEach(listNodes, function(listNode) {
      values.push(getFormControlValuesInScope(listNode));
    });
  }
  else {
    values = getFormControlValuesInScope(entryNode);
  }

  return values;
}

/**
 * Return true if the given form extracted value equals
 * to an old cached version.
 *
 * @param {Object} value
 * @param {Object} oldValue
 * @return {Boolean}
 */
function valueEqual(value, oldValue) {

  if (value && !oldValue) {
    return false;
  }

  var allKeys = keys(value).concat(keys(oldValue));

  return allKeys.every(function(key) {
    return value[key] === oldValue[key];
  });
}

/**
 * Return true if the given form extracted value(s)
 * equal an old cached version.
 *
 * @param {Array<Object>|Object} values
 * @param {Array<Object>|Object} oldValues
 * @return {Boolean}
 */
function valuesEqual(values, oldValues) {

  if (isArray(values)) {

    if (values.length !== oldValues.length) {
      return false;
    }

    return values.every(function(v, idx) {
      return valueEqual(v, oldValues[idx]);
    });
  }

  return valueEqual(values, oldValues);
}

/**
 * Return a mapping of { id: entry } for all entries in the given groups in the given tabs.
 *
 * @param {Object} tabs
 * @return {Object}
 */
function extractEntries(tabs) {
  return keyBy(flattenDeep(map(flattenDeep(map(tabs, 'groups')), 'entries')), 'id');
}

/**
 * Return a mapping of { id: group } for all groups in the given tabs.
 *
 * @param {Object} tabs
 * @return {Object}
 */
function extractGroups(tabs) {
  return keyBy(flattenDeep(map(tabs, 'groups')), 'id');
}

/**
 * A properties panel implementation.
 *
 * To use it provide a `propertiesProvider` component that knows
 * about which properties to display.
 *
 * Properties edit state / visibility can be intercepted
 * via a custom {@link PropertiesActivator}.
 *
 * @class
 * @constructor
 *
 * @param {Object} config
 * @param {EventBus} eventBus
 * @param {Modeling} modeling
 * @param {PropertiesProvider} propertiesProvider
 * @param {Canvas} canvas
 * @param {CommandStack} commandStack
 */
function PropertiesPanel(config, eventBus, modeling, propertiesProvider, commandStack, canvas) {

  this._eventBus = eventBus;
  this._modeling = modeling;
  this._commandStack = commandStack;
  this._canvas = canvas;
  this._propertiesProvider = propertiesProvider;

  this._init(config);
}

PropertiesPanel.$inject = [
  'config.propertiesPanel',
  'eventBus',
  'modeling',
  'propertiesProvider',
  'commandStack',
  'canvas' ];

module.exports = PropertiesPanel;


PropertiesPanel.prototype._init = function(config) {

  var eventBus = this._eventBus;

  // groups show their values read-only and are edited in a pop-up,
  // unless config.propertiesPanel.editInDialog is false
  this._editInDialog = !(config && config.editInDialog === false);

  // the group being edited in the pop-up: { groupId, element, stackIdx }
  this._editing = null;

  // the property search, kept while selecting other elements
  this._searchTerm = '';
  this._searchResults = [];

  var self = this;

  /**
   * Select the root element once it is added to the canvas
   */
  eventBus.on('root.added', function(e) {
    self.update(e.element);
  });

  eventBus.on('selection.changed', function(e) {
    var newElement = e.newSelection[0];

    self.update(newElement);
  });

  eventBus.on('elements.changed', function(e) {

    var current = self._current;
    var element = current && current.element;

    if (element) {
      if (e.elements.indexOf(element) !== -1) {
        self.update(element);
      }
    }
  });

  eventBus.on('diagram.destroy', function() {
    self.detach();
  });

  this._collapsed = false;

  this._container = domify('<div class="cpp-properties-panel"></div>');

  this._bindListeners(this._container);

  if (config && config.parent) {
    this.attachTo(config.parent);
  }
};


PropertiesPanel.prototype.attachTo = function(parentNode) {

  if (!parentNode) {
    throw new Error('parentNode required');
  }

  // ensure we detach from the
  // previous, old parent
  this.detach();

  // unwrap jQuery if provided
  if (parentNode.get) {
    parentNode = parentNode.get(0);
  }

  if (typeof parentNode === 'string') {
    parentNode = domQuery(parentNode);
  }

  var container = this._container;

  parentNode.appendChild(container);

  this._emit('attach');
};

PropertiesPanel.prototype.detach = function() {

  var container = this._container,
      parentNode = container.parentNode;

  if (!parentNode) {
    return;
  }

  this._emit('detach');

  parentNode.removeChild(container);
};


/**
 * Select the given tab within the properties panel.
 *
 * @param {Object|String} tab
 */
PropertiesPanel.prototype.activateTab = function(tab) {

  var tabId = typeof tab === 'string' ? tab : tab.id;

  var current = this._current;

  var panelNode = current.panel;

  var allTabNodes = domQueryAll('.cpp-properties-tab', panelNode),
      allTabLinkNodes = domQueryAll('.cpp-properties-tab-link', panelNode);

  forEach(allTabNodes, function(tabNode) {
    var currentTabId = domAttr(tabNode, 'data-tab');

    domClasses(tabNode).toggle('cpp-active', tabId === currentTabId);
  });

  var activeLabel = '';

  forEach(allTabLinkNodes, function(tabLinkNode) {
    var tabLink = domQuery('[data-tab-target]', tabLinkNode),
        currentTabId = domAttr(tabLink, 'data-tab-target'),
        active = tabId === currentTabId;

    domClasses(tabLinkNode).toggle('cpp-active', active);

    domAttr(tabLink, 'aria-selected', active ? 'true' : 'false');
    domAttr(tabLink, 'tabindex', active ? '0' : '-1');

    if (active) {
      activeLabel = domAttr(tabLink, 'aria-label') || '';
    }
  });

  var titleNode = domQuery('[data-tab-title]', panelNode);

  if (titleNode) {
    titleNode.textContent = activeLabel;
  }
};


/**
 * Collapse the properties panel to its rail of group icons, or open it again.
 *
 * @param {boolean} collapsed
 */
PropertiesPanel.prototype.setCollapsed = function(collapsed) {

  collapsed = !!collapsed;

  if (this._collapsed === collapsed) {
    return;
  }

  this._collapsed = collapsed;

  this._updateCollapsed();

  this._emit('collapsed');
};

/**
 * @return {boolean} whether the panel shows only its rail of group icons
 */
PropertiesPanel.prototype.isCollapsed = function() {
  return this._collapsed;
};

PropertiesPanel.prototype._updateCollapsed = function() {

  var collapsed = this._collapsed;

  domClasses(this._container).toggle(COLLAPSED_CLASS, collapsed);

  var toggleNode = domQuery('[data-collapse-toggle]', this._container);

  if (toggleNode) {
    var label = collapsed ? 'Open properties' : 'Collapse properties';

    domAttr(toggleNode, 'aria-expanded', collapsed ? 'false' : 'true');
    domAttr(toggleNode, 'aria-label', label);
    domAttr(toggleNode, 'title', label);
  }
};


/**
 * Return the rail buttons of the tabs that are shown, in order.
 */
PropertiesPanel.prototype._getVisibleTabLinks = function() {

  var current = this._current;

  if (!current) {
    return [];
  }

  return filter(domQueryAll('.cpp-properties-tabs-links .cpp-properties-tab-link', current.panel), function(tabLinkNode) {
    return !domClasses(tabLinkNode).has(HIDE_CLASS);
  }).map(function(tabLinkNode) {
    return domQuery('[data-tab-target]', tabLinkNode);
  });
};

/**
 * Update the DOM representation of the properties panel
 */
PropertiesPanel.prototype.update = function(element) {
  var current = this._current;

  // no actual selection change
  var needsCreate = true;

  if (typeof element === 'undefined') {

    // use RootElement of BPMN diagram to generate properties panel if no element is selected
    element = this._canvas.getRootElement();
  }

  // an element without a business object, such as the implicit root of an
  // empty canvas, has no properties to show
  if (!element || !element.businessObject) {

    if (current) {
      domRemove(current.panel);
      this._current = null;
    }

    this._emit('changed');

    return;
  }

  var newTabs = this._propertiesProvider.getTabs(element);

  if (current && current.element === element) {
    // see if we can reuse the existing panel

    needsCreate = this._entriesChanged(current, newTabs);
    // needsCreate = false;
  }

  if (needsCreate) {

    if (current) {

      // get active tab from the existing panel before remove it
      var activeTabNode = domQuery('.cpp-properties-tab.cpp-active', current.panel);

      var activeTabId;
      if (activeTabNode) {
        activeTabId = domAttr(activeTabNode, 'data-tab');
      }

      // remove old panel
      domRemove(current.panel);

      // the new entries are shown or disabled for the new element once the
      // panel is created, not for the old one while it is created
      this._current = null;
    }

    this._current = this._create(element, newTabs);

    // the new rail's collapse button shows the current state
    this._updateCollapsed();

    // activate the saved active tab from the removed panel, if the new
    // element has it, or the first tab
    var hasActiveTab = activeTabId && (activeTabId === SEARCH_TAB || this._current.tabs.some(function(tab) {
      return tab.id === activeTabId;
    }));

    this.activateTab(hasActiveTab ? activeTabId : this._current.tabs[0]);
  }

  if (this._current) {
    // make sure correct tab contents are visible
    this._updateActivation(this._current);

  }

  var editing = this._editing;

  if (editing) {
    if (this._current && this._current.element === editing.element) {

      // the panel may have been created again
      this._showEditing();
    } else {
      this._editing = null;
    }
  }

  this._emit('changed');
};


/**
 * Show the property search and put the cursor in it.
 */
PropertiesPanel.prototype.openSearch = function() {

  var current = this._current;

  if (!current) {
    return;
  }

  this.setCollapsed(false);
  this.activateTab(SEARCH_TAB);

  var input = domQuery('[data-search-input]', current.panel);

  input.focus();
  input.select();
};

/**
 * Search the fields of the selected element by their label.
 *
 * @param {string} term
 *
 * @return {Array<Object>} the matches: { label, value, tabLabel, groupLabel }
 */
PropertiesPanel.prototype.search = function(term) {

  this._searchTerm = term || '';

  if (this._current) {
    this._renderSearch(this._current);
  }

  return this._searchResults.map(function(result) {
    return {
      label: result.label,
      value: result.value,
      tabLabel: result.tabLabel,
      groupLabel: result.groupLabel
    };
  });
};

/**
 * Go to a search result: open its group's pop-up, or its group, and put the cursor in the field.
 *
 * @param {number} index
 */
PropertiesPanel.prototype.openSearchResult = function(index) {

  var result = this._searchResults[index];

  if (!result) {
    return;
  }

  var groupNode = domClosest(result.control, '[data-group]');

  this.activateTab(result.tabId);

  if (groupNode && domClasses(groupNode).has('cpp-read-view')) {
    this.openGroup(domAttr(groupNode, 'data-group'));

    // back to the results when the pop-up closes
    this._editing.fromSearch = true;
  } else if (result.control.scrollIntoView) {
    result.control.scrollIntoView({ block: 'center' });
  }

  result.control.focus();
};

PropertiesPanel.prototype._renderSearch = function(current) {

  var resultsNode = domQuery('[data-search-results]', current.panel);

  if (!resultsNode) {
    return;
  }

  var term = this._searchTerm.trim().toLowerCase(),
      results = [];

  if (term) {
    forEach(current.tabs, function(tab) {

      var tabNode = domQuery('[data-tab="' + tab.id + '"]', current.panel);

      if (!tabNode || domClasses(tabNode).has(HIDE_CLASS)) {
        return;
      }

      forEach(domQueryAll('.cpp-properties-group', tabNode), function(groupNode) {

        if (domClasses(groupNode).has(HIDE_CLASS)) {
          return;
        }

        var groupLabel = (domQuery('.group-label', groupNode) || {}).textContent || '';

        forEach(domQueryAll('.cpp-properties-entry', groupNode), function(entryNode) {

          if (domClasses(entryNode).has(HIDE_CLASS)) {
            return;
          }

          forEach(summarizeEntry(entryNode), function(row) {
            if (row.label.toLowerCase().indexOf(term) !== -1) {
              results.push(assign({ tabId: tab.id, tabLabel: tab.label, groupLabel: groupLabel }, row));
            }
          });
        });
      });
    });
  }

  this._searchResults = results;

  resultsNode.innerHTML = '';

  if (!term) {
    resultsNode.appendChild(domify('<p class="cpp-search-hint">Type part of a property name.</p>'));
    return;
  }

  if (!results.length) {
    var none = domify('<p class="cpp-search-hint"></p>');

    none.textContent = 'No property matches "' + this._searchTerm.trim() + '".';

    resultsNode.appendChild(none);
    return;
  }

  forEach(results, function(result, index) {

    var label = escapeHTML(result.label);

    var resultNode = domify(
      '<div class="cpp-search-result" role="listitem">' +
        '<div class="cpp-search-where"></div>' +
        '<dl class="cpp-group-summary"><div class="cpp-summary-row"><dt></dt><dd></dd></div></dl>' +
        '<button type="button" class="cpp-group-edit" data-search-open="' + index + '" ' +
          'title="Edit ' + label + '" aria-label="Edit ' + label + '">' + EDIT_ICON + '</button>' +
      '</div>');

    domQuery('.cpp-search-where', resultNode).textContent =
      result.groupLabel && result.groupLabel !== result.tabLabel ?
        result.tabLabel + ' \u203a ' + result.groupLabel :
        result.tabLabel;

    domQuery('dt', resultNode).textContent = result.label;
    domQuery('dd', resultNode).textContent = result.value;

    domClasses(domQuery('.cpp-summary-row', resultNode)).toggle('cpp-summary-empty', !!result.empty);

    resultsNode.appendChild(resultNode);
  });
};


/**
 * Open the pop-up to edit the fields of a group.
 *
 * @param {string} groupId
 */
PropertiesPanel.prototype.openGroup = function(groupId) {

  var current = this._current;

  if (!current) {
    return;
  }

  var groupNode = domQuery('[data-group="' + groupId + '"].cpp-read-view', current.panel);

  if (!groupNode) {
    return;
  }

  if (this._editing) {
    this.closeGroup(true);
  }

  this._editing = {
    groupId: groupId,
    element: current.element,

    // to take back the changes on cancel
    stackIdx: this._commandStack._stackIdx
  };

  this._showEditing();

  var firstControl = filter(domQueryAll(CONTROL_SELECTOR, groupNode), isShownControl)[0];

  if (firstControl) {
    firstControl.focus();
  }

  this._emit('groupOpened');
};

/**
 * Close the pop-up of the group being edited.
 *
 * @param {boolean} keep whether to keep the changes (Finish) or take them back (Cancel)
 */
PropertiesPanel.prototype.closeGroup = function(keep) {

  var editing = this._editing,
      current = this._current;

  if (!editing) {
    return;
  }

  // apply what is still being typed
  if (this._debouncedChange) {
    this._debouncedChange.flush();
  }

  this._editing = null;

  this._hideEditing();

  if (!keep) {
    var commandStack = this._commandStack;

    while (commandStack._stackIdx > editing.stackIdx && commandStack.canUndo()) {
      commandStack.undo();
    }
  }

  current = this._current;

  if (current && current.element === editing.element) {

    // show the values of the model again, also where a change was not applied
    this._updateActivation(current);

    if (editing.fromSearch) {
      this.openSearch();
    } else {
      var editButton = domQuery('[data-group="' + editing.groupId + '"] [data-group-edit]', current.panel);

      if (editButton) {
        editButton.focus();
      }
    }
  }

  this._emit('groupClosed');
};

/**
 * @return {string|null} the id of the group being edited in the pop-up
 */
PropertiesPanel.prototype.getEditedGroup = function() {
  return this._editing ? this._editing.groupId : null;
};

PropertiesPanel.prototype._showEditing = function() {

  var editing = this._editing,
      current = this._current,
      panelNode = current.panel;

  var groupNode = domQuery('[data-group="' + editing.groupId + '"]', panelNode);

  if (!groupNode) {
    this._editing = null;
    return;
  }

  forEach(domQueryAll('.cpp-editing', panelNode), function(node) {
    if (node !== groupNode) {
      domClasses(node).remove('cpp-editing');
    }
  });

  var element = current.element,
      bo = element.businessObject,
      definition = bo && (bo.definitionRef || bo),
      name = definition && definition.name;

  domQuery('[data-dialog-title]', groupNode).textContent = typeLabel(definition);
  domQuery('[data-dialog-subtitle]', groupNode).textContent = name ? name + ' (' + element.id + ')' : element.id;

  // the group's tab must be open for the pop-up to show
  var tabNode = domClosest(groupNode, '[data-tab]');

  if (tabNode && !domClasses(tabNode).has('cpp-active')) {
    this.activateTab(domAttr(tabNode, 'data-tab'));
  }

  domClasses(groupNode).add('cpp-editing');
  domClasses(groupNode).remove('group-closed');
  domAttr(groupNode, 'role', 'dialog');
  domAttr(groupNode, 'aria-modal', 'true');

  domClasses(panelNode).add('cpp-dialog-open');
};

PropertiesPanel.prototype._hideEditing = function() {

  var current = this._current;

  if (!current) {
    return;
  }

  forEach(domQueryAll('.cpp-editing', current.panel), function(groupNode) {
    domClasses(groupNode).remove('cpp-editing');
    groupNode.removeAttribute('role');
    groupNode.removeAttribute('aria-modal');
  });

  domClasses(current.panel).remove('cpp-dialog-open');
};

/**
 * Show the values of the read-only groups.
 */
PropertiesPanel.prototype._updateSummaries = function(current) {

  forEach(domQueryAll('.cpp-properties-group.cpp-read-view', current.panel), function(groupNode) {

    var summaryNode = domQuery('[data-group-summary]', groupNode);

    summaryNode.innerHTML = '';

    forEach(domQueryAll('.cpp-properties-entry', groupNode), function(entryNode) {

      if (domClasses(entryNode).has(HIDE_CLASS)) {
        return;
      }

      forEach(summarizeEntry(entryNode), function(row) {
        var rowNode = domify('<div class="cpp-summary-row"><dt></dt><dd></dd></div>');

        domQuery('dt', rowNode).textContent = row.label;
        domQuery('dd', rowNode).textContent = row.value;

        domClasses(rowNode).toggle('cpp-summary-empty', !!row.empty);
        domClasses(rowNode).toggle('cpp-summary-invalid', !!row.invalid);

        summaryNode.appendChild(rowNode);
      });
    });
  });
};


/**
 * Returns true if one of two groups has different entries than the other.
 *
 * @param  {Object} current
 * @param  {Object} newTabs
 * @return {Booelan}
 */
PropertiesPanel.prototype._entriesChanged = function(current, newTabs) {

  var oldEntryIds = keys(current.entries),
      newEntryIds = keys(extractEntries(newTabs));

  return !isEmpty(xor(oldEntryIds, newEntryIds));
};

PropertiesPanel.prototype._emit = function(event) {
  this._eventBus.fire('propertiesPanel.' + event, { panel: this, current: this._current });
};

PropertiesPanel.prototype._bindListeners = function(container) {

  var self = this;

  // handles a change for a given event
  var handleChange = function handleChange(event) {

    // see if we handle a change inside a [data-entry] element.
    // if not, drop out
    var node = domClosest(event.delegateTarget, '[data-entry]'),
        entryId, entry;

    // change from outside a [data-entry] element, simply ignore
    if (!node) {
      return;
    }

    entryId = domAttr(node, 'data-entry');
    entry = self.getEntry(entryId);

    var values = getFormControlValues(node);

    if (event.type === 'change') {

      // - if the "data-on-change" attribute is present and a value is changed,
      //   then the associated action is performed.
      // - if the associated action returns "true" then an update to the business
      //   object is done
      // - if it does not return "true", then only the DOM content is updated
      var onChangeAction = event.delegateTarget.getAttribute('data-on-change');

      if (onChangeAction) {
        var isEntryDirty = self.executeAction(entry, node, onChangeAction, event);

        if (!isEntryDirty) {
          return self.update(self._current.element);
        }
      }
    }
    self.applyChanges(entry, values, node);
    self.updateState(entry, node);
  };

  // debounce update only elements that are target of key events,
  // i.e. INPUT and TEXTAREA. SELECTs will trigger an immediate update anyway.
  // typing applies after a pause; closing a pop-up applies it at once (flush)
  self._debouncedChange = debounce(handleChange, DEBOUNCE_DELAY);

  domDelegate.bind(container, 'input, textarea, [contenteditable]', 'input', function(event) {

    // other delegated handlers change the shared event's delegateTarget
    // before the change applies, so keep what this one needs
    self._debouncedChange({
      type: event.type,
      target: event.target,
      delegateTarget: event.delegateTarget
    });
  });
  domDelegate.bind(container, 'input, textarea, select, [contenteditable]', 'change', handleChange);

  // paste as plain text only
  domDelegate.bind(container, '[contenteditable]', 'paste', handlePaste);

  function handlePaste(event) {
    var text = (event.clipboardData || window.clipboardData).getData('text');
    document.execCommand('insertText', false, text);

    event.preventDefault();
  }

  domDelegate.bind(container, '[data-action]', 'click', function onClick(event) {

    // triggers on all inputs
    var inputNode = event.delegateTarget;
    var entryNode = domClosest(inputNode, '[data-entry]');

    var actionId = domAttr(inputNode, 'data-action'),
        entryId = domAttr(entryNode, 'data-entry');

    var entry = self.getEntry(entryId);

    var isEntryDirty = self.executeAction(entry, entryNode, actionId, event);

    if (isEntryDirty) {
      var values = getFormControlValues(entryNode);

      self.applyChanges(entry, values, entryNode, isEntryDirty.force);
    }

    self.updateState(entry, entryNode);
  });

  function handleInput(event, element) {
    // triggers on all inputs
    var inputNode = event.delegateTarget;

    var entryNode = domClosest(inputNode, '[data-entry]');

    // only work on data entries
    if (!entryNode) {
      return;
    }

    var eventHandlerId = domAttr(inputNode, 'data-blur'),
        entryId = domAttr(entryNode, 'data-entry');

    var entry = self.getEntry(entryId);

    var isEntryDirty = self.executeAction(entry, entryNode, eventHandlerId, event);

    if (isEntryDirty) {
      var values = getFormControlValues(entryNode);

      self.applyChanges(entry, values, entryNode);
    }

    self.updateState(entry, entryNode);
  }

  domDelegate.bind(container, '[data-blur]', 'blur', handleInput, true);

  // make tab links interactive
  domDelegate.bind(container, '.cpp-properties-tabs-links [data-tab-target]', 'click', function(event) {
    event.preventDefault();

    var delegateTarget = event.delegateTarget;

    var tabId = domAttr(delegateTarget, 'data-tab-target');

    // activate tab on link click
    self.activateTab(tabId);

    // a click on a group of the collapsed panel opens it
    self.setCollapsed(false);
  });

  // move between the groups of the rail with the arrow keys
  domDelegate.bind(container, '.cpp-properties-tabs-links [data-tab-target]', 'keydown', function(event) {

    var links = self._getVisibleTabLinks(),
        index = links.indexOf(event.delegateTarget),
        next;

    switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      next = links[(index + 1) % links.length];
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      next = links[(index - 1 + links.length) % links.length];
      break;
    case 'Home':
      next = links[0];
      break;
    case 'End':
      next = links[links.length - 1];
      break;
    default:
      return;
    }

    event.preventDefault();

    self.activateTab(domAttr(next, 'data-tab-target'));

    next.focus();
  });

  // search for a property
  domDelegate.bind(container, '[data-search-link]', 'click', function(event) {
    event.preventDefault();

    self.openSearch();
  });

  domDelegate.bind(container, '.cpp-properties-rail-tools [data-tab-target]', 'click', function(event) {
    event.preventDefault();

    self.openSearch();
  });

  domDelegate.bind(container, '[data-search-input]', 'input', function(event) {
    self.search(event.delegateTarget.value);
  });

  domDelegate.bind(container, '[data-search-input]', 'keydown', function(event) {

    if (event.key === 'Enter') {
      event.preventDefault();

      self.openSearchResult(0);
    }

    if (event.key === 'ArrowDown') {
      var first = domQuery('[data-search-open]', self._container);

      if (first) {
        event.preventDefault();
        first.focus();
      }
    }

    if (event.key === 'Escape' && !self._editing && event.delegateTarget.value) {
      event.preventDefault();
      event.stopPropagation();

      event.delegateTarget.value = '';
      self.search('');
    }
  });

  domDelegate.bind(container, '[data-search-open]', 'click', function(event) {
    event.preventDefault();

    self.openSearchResult(parseInt(domAttr(event.delegateTarget, 'data-search-open'), 10));
  });

  // edit a group in the pop-up
  domDelegate.bind(container, '[data-group-edit]', 'click', function(event) {
    event.preventDefault();
    event.stopPropagation();

    self.openGroup(domAttr(domClosest(event.delegateTarget, '[data-group]'), 'data-group'));
  });

  domDelegate.bind(container, '[data-group-finish]', 'click', function(event) {
    event.preventDefault();

    self.closeGroup(true);
  });

  domDelegate.bind(container, '[data-group-cancel]', 'click', function(event) {
    event.preventDefault();

    self.closeGroup(false);
  });

  container.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && self._editing) {
      event.preventDefault();

      self.closeGroup(false);
    }
  });

  domDelegate.bind(container, '[data-collapse-toggle]', 'click', function(event) {
    event.preventDefault();

    self.setCollapsed(!self._collapsed);
  });

};

PropertiesPanel.prototype.updateState = function(entry, entryNode) {
  this.updateShow(entry, entryNode);
  this.updateDisable(entry, entryNode);
};

/**
 * Update the visibility of the entry node in the DOM
 */
PropertiesPanel.prototype.updateShow = function(entry, node) {

  var current = this._current;

  if (!current) {
    return;
  }

  domClasses(node).remove(HIDE_CLASS);

  if (typeof entry.hideEntry === 'function') {

    var shouldHideEntry = entry.hideEntry(current.element, node);
    if (shouldHideEntry) {
      domClasses(node).add(HIDE_CLASS);
    }

  }

  var showNodes = domQueryAll('[data-show]', node) || [];

  forEach(showNodes, function(showNode) {

    var expr = domAttr(showNode, 'data-show');
    var fn = get(entry, expr);
    if (fn) {
      var scope = domClosest(showNode, '[data-scope]') || node;
      var shouldShow = fn(current.element, node, showNode, scope) || false;
      var hasClass = domClasses(showNode).has(HIDE_CLASS);
      if (shouldShow) {
        if (hasClass) {
          domClasses(showNode).remove(HIDE_CLASS);
        }
      } else {
        domClasses(showNode).add(HIDE_CLASS);
      }
    }
  });
};

/**
 * Evaluates a given function. If it returns true, then the
 * node is marked as "disabled".
 */
PropertiesPanel.prototype.updateDisable = function(entry, node) {
  var current = this._current;

  if (!current) {
    return;
  }

  var nodes = domQueryAll('[data-disable]', node) || [];

  forEach(nodes, function(currentNode) {
    var expr = domAttr(currentNode, 'data-disable');
    var fn = get(entry, expr);
    if (fn) {
      var scope = domClosest(currentNode, '[data-scope]') || node;
      var shouldDisable = fn(current.element, node, currentNode, scope) || false;
      domAttr(currentNode, 'disabled', shouldDisable ? '' : null);
    }
  });
};

PropertiesPanel.prototype.executeAction = function(entry, entryNode, actionId, event) {
  var current = this._current;

  if (!current) {
    return;
  }

  var fn = get(entry, actionId);
  if (fn) {
    var scopeNode = domClosest(event.target, '[data-scope]') || entryNode;
    return fn.apply(entry, [ current.element, entryNode, event, scopeNode ]);
  }
};

/**
 * Apply changes to the business object by executing a command
 */
PropertiesPanel.prototype.applyChanges = function(entry, values, containerElement, force) {

  var element = this._current.element;

  // ensure we only update the model if we got dirty changes
  if (!force && valuesEqual(values, entry.oldValues)) {
    return;
  }

  var command = entry.set(element, values, containerElement);

  var commandToExecute;

  if (isArray(command)) {
    if (command.length) {
      commandToExecute = {
        cmd: 'properties-panel.multi-command-executor',
        context: flattenDeep(command)
      };
    }
  } else {
    commandToExecute = command;
  }

  if (commandToExecute) {
    this._commandStack.execute(commandToExecute.cmd, commandToExecute.context || { element : element });
  } else {
    this.update(element);
  }
};


/**
 * apply validation results in the DOM and show or remove a message near the entry node.
 */
PropertiesPanel.prototype.applyValidationResults = function(validationResults, entryNode) {

  validationResults = validationResults || {};

  var controlNodes = getFormControls(entryNode, true);

  forEach(controlNodes, function(controlNode) {

    var name = domAttr(controlNode, 'name') || domAttr(controlNode, 'data-name'),
        message = validationResults[name],
        messageNode = domQuery('.cpp-validation-message', controlNode.parentNode);

    domClasses(controlNode).remove('invalid');
    domClasses(controlNode).remove('warning');


    if (messageNode) {
      domClasses(messageNode).remove('cpp-error-message');
      domClasses(messageNode).remove('cpp-warning-message');

      if (!message) {
        controlNode.parentNode.removeChild(messageNode);
      }
    }


    if (message) {

      if (!messageNode) {
        messageNode = domify('<div></div>');
        domClasses(messageNode).add('cpp-validation-message');

        // insert messageNode after controlNode
        controlNode.parentNode.insertBefore(messageNode, controlNode.nextSibling);
      }


      if (typeof message === 'string' || message.error) {
        message = message.error || message;

        domClasses(controlNode).add('invalid');
        domClasses(messageNode).add('cpp-error-message');
      }
      else {
        message = message.warning;

        domClasses(controlNode).add('warning');
        domClasses(messageNode).add('cpp-warning-message');
      }

      messageNode.textContent = message;

    }

  });

};


/**
 * Check if the entry contains valid input
 */
PropertiesPanel.prototype.validate = function(entry, values, entryNode) {
  var self = this;

  var current = this._current;

  entryNode = entryNode || domQuery('[data-entry="' + entry.id + '"]', current.panel);

  if (values instanceof Array) {
    var listContainer = domQuery('[data-list-entry-container]', entryNode),
        listEntryNodes = listContainer.children || [];

    // create new elements
    for (var i = 0; i < values.length; i++) {
      var listValue = values[i];

      if (entry.validateListItem) {

        var validationResults = entry.validateListItem(current.element, listValue, entryNode, i),
            listEntryNode = listEntryNodes[i];

        self.applyValidationResults(validationResults, listEntryNode);
      }
    }
  }
  else {
    if (entry.validate) {
      this.validationResults = entry.validate(current.element, values, entryNode);

      self.applyValidationResults(this.validationResults, entryNode);
    }
  }

};

PropertiesPanel.prototype.getEntry = function(id) {
  return this._current && this._current.entries[id];
};

var flattenDeep = require('lodash/flattenDeep'),
    keyBy = require('lodash/keyBy'),
    map = require('lodash/map');

PropertiesPanel.prototype._create = function(element, tabs) {

  if (!element) {
    return null;
  }

  var containerNode = this._container;

  var panelNode = this._createPanel(element, tabs);

  containerNode.appendChild(panelNode);

  var entries = extractEntries(tabs);
  var groups = extractGroups(tabs);

  return {
    tabs: tabs,
    groups: groups,
    entries: entries,
    element: element,
    panel: panelNode
  };
};

PropertiesPanel.prototype._bindTemplate = function(element, entry, values, entryNode, idx) {

  var eventBus = this._eventBus;

  function isPropertyEditable(entry, propertyName) {
    return eventBus.fire('propertiesPanel.isPropertyEditable', {
      entry: entry,
      propertyName: propertyName,
      element: element
    });
  }

  var inputNodes = getPropertyPlaceholders(entryNode);

  forEach(inputNodes, function(node) {

    var name,
        newValue,
        editable;

    // we deal with an input element
    if ('value' in node || isContentEditable(node) === 'true') {
      name = domAttr(node, 'name') || domAttr(node, 'data-name');
      newValue = values[name];

      editable = isPropertyEditable(entry, name);
      if (editable && entry.editable) {
        editable = entry.editable(element, entryNode, node, name, newValue, idx);
      }

      domAttr(node, 'readonly', editable ? null : '');
      domAttr(node, 'disabled', editable ? null : '');

      if (entry.setControlValue) {
        entry.setControlValue(element, entryNode, node, name, newValue, idx);
      } else if (isToggle(node)) {
        setToggleValue(node, newValue);
      } else if (isSelect(node)) {
        setSelectValue(node, newValue);
      } else {
        setInputValue(node, newValue);
      }
    }

    // we deal with some non-editable html element
    else {
      name = domAttr(node, 'data-value');
      newValue = values[name];
      if (entry.setControlValue) {
        entry.setControlValue(element, entryNode, node, name, newValue, idx);
      }
      else {
        setTextValue(node, newValue);
      }
    }
  });
};

// TODO(nikku): WTF freaking name? Change / clarify.
PropertiesPanel.prototype._updateActivation = function(current) {
  var self = this;

  var eventBus = this._eventBus;

  var element = current.element;

  function isEntryVisible(entry) {
    return eventBus.fire('propertiesPanel.isEntryVisible', {
      entry: entry,
      element: element
    });
  }

  function isGroupVisible(group, element, groupNode) {
    if (typeof group.enabled === 'function') {
      return group.enabled(element, groupNode);
    } else {
      return true;
    }
  }

  function isTabVisible(tab, element) {
    if (typeof tab.enabled === 'function') {
      return tab.enabled(element);
    } else {
      return true;
    }
  }

  function toggleVisible(node, visible) {
    domClasses(node).toggle(HIDE_CLASS, !visible);
  }

  // check whether the active tab is visible
  // if not: set the first visible tab as active tab
  function checkActiveTabVisibility() {
    var activeVisible = domQuery('.cpp-properties-tab.cpp-active:not(.' + HIDE_CLASS + ')', current.panel);

    if (activeVisible) {
      return;
    }

    var firstVisible = filter(current.tabs, function(tab) {
      var tabNode = domQuery('[data-tab=' + tab.id + ']', current.panel);

      return !domClasses(tabNode).has(HIDE_CLASS);
    })[0];

    self.activateTab(firstVisible || current.tabs[0]);
  }

  function updateLabel(element, selector, text) {
    var labelNode = domQuery(selector, element);

    if (!labelNode) {
      return;
    }

    labelNode.textContent = text;
  }

  var panelNode = current.panel;

  forEach(current.tabs, function(tab) {

    var tabNode = domQuery('[data-tab=' + tab.id + ']', panelNode);
    var tabLinkNode = domQuery('[data-tab-target=' + tab.id + ']', panelNode).parentNode;

    var tabVisible = false;

    forEach(tab.groups, function(group) {

      var groupVisible = false;

      var groupNode = domQuery('[data-group=' + group.id + ']', tabNode);

      forEach(group.entries, function(entry) {

        var entryNode = domQuery('[data-entry="' + entry.id + '"]', groupNode);

        var entryVisible = isEntryVisible(entry);

        groupVisible = groupVisible || entryVisible;

        toggleVisible(entryNode, entryVisible);

        var values = 'get' in entry ? entry.get(element, entryNode) : {};

        if (values instanceof Array) {
          var listEntryContainer = domQuery('[data-list-entry-container]', entryNode);
          var existingElements = listEntryContainer.children || [];

          for (var i = 0; i < values.length; i++) {
            var listValue = values[i];
            var listItemNode = existingElements[i];
            if (!listItemNode) {
              listItemNode = domify(entry.createListEntryTemplate(listValue, i, listEntryContainer));
              listEntryContainer.appendChild(listItemNode);
            }
            domAttr(listItemNode, 'data-index', i);

            self._bindTemplate(element, entry, listValue, listItemNode, i);
          }

          var entriesToRemove = existingElements.length - values.length;

          for (var j = 0; j < entriesToRemove; j++) {
            // remove orphaned element
            listEntryContainer.removeChild(listEntryContainer.lastChild);
          }

        } else {
          self._bindTemplate(element, entry, values, entryNode);
        }

        // update conditionally visible elements
        self.updateState(entry, entryNode);
        self.validate(entry, values, entryNode);

        // remember initial state for later dirty checking
        entry.oldValues = getFormControlValues(entryNode);
      });

      if (typeof group.label === 'function') {
        updateLabel(groupNode, '.group-label', group.label(element, groupNode));
      }

      groupVisible = groupVisible && isGroupVisible(group, element, groupNode);

      tabVisible = tabVisible || groupVisible;

      toggleVisible(groupNode, groupVisible);
    });

    tabVisible = tabVisible && isTabVisible(tab, element);

    toggleVisible(tabNode, tabVisible);
    toggleVisible(tabLinkNode, tabVisible);
  });

  checkActiveTabVisibility();

  // inject elements id into header
  var propertiesProvider = self._propertiesProvider,
      labelId = element.id;

  if (propertiesProvider.getHeaderLabel) {
    labelId = propertiesProvider.getHeaderLabel(element);
  }

  updateLabel(panelNode, '[data-label-id]', labelId || '');

  self._updateSummaries(current);

  // the search shows the current values
  var searchInput = domQuery('[data-search-input]', panelNode);

  if (searchInput && searchInput.value !== self._searchTerm) {
    searchInput.value = self._searchTerm;
  }

  self._renderSearch(current);
};

PropertiesPanel.prototype._createPanel = function(element, tabs) {
  var self = this;

  var panelNode = domify('<div class="cpp-properties"></div>'),
      railNode = domify('<nav class="cpp-properties-rail" aria-label="Property groups"></nav>'),
      contentNode = domify('<div class="cpp-properties-content"></div>'),
      collapseNode = domify(
        '<button type="button" class="cpp-properties-collapse" data-collapse-toggle>' +
          COLLAPSE_ICON +
        '</button>'),
      headerNode = domify('<div class="cpp-properties-header">' +
        '<button type="button" class="cpp-search-link" data-search-link>' +
          'Search for a property' + SEARCH_ICON +
        '</button>' +
        '<div class="group-title" data-tab-title></div>' +
        '<div class="label" data-label-id></div>' +
      '</div>'),
      searchLinkNode = domify(
        '<ul class="cpp-properties-rail-tools">' +
          '<li class="cpp-properties-tab-link" role="presentation">' +
            '<button type="button" role="tab" data-tab-target="' + SEARCH_TAB + '" id="cpp-tab-' + SEARCH_TAB + '" ' +
              'aria-controls="cpp-tabpanel-' + SEARCH_TAB + '" aria-selected="false" tabindex="-1" ' +
              'aria-label="Search Property" title="Search Property">' +
              '<span class="cpp-properties-tab-icon" aria-hidden="true">' + SEARCH_ICON + '</span>' +
            '</button>' +
          '</li>' +
        '</ul>'),
      searchTabNode = domify(
        '<div class="cpp-properties-tab cpp-properties-search" data-tab="' + SEARCH_TAB + '" role="tabpanel" ' +
            'id="cpp-tabpanel-' + SEARCH_TAB + '" aria-labelledby="cpp-tab-' + SEARCH_TAB + '">' +
          '<div class="cpp-search-field">' +
            '<input type="search" data-search-input placeholder="Search for a property" ' +
              'aria-label="Search for a property" autocomplete="off" />' +
          '</div>' +
          '<div class="cpp-search-results" data-search-results role="list"></div>' +
        '</div>'),
      tabLinksNode = domify('<ul class="cpp-properties-tabs-links" role="tablist" aria-orientation="vertical"></ul>'),
      tabContainerNode = domify('<div class="cpp-properties-tabs-container"></div>');

  contentNode.appendChild(headerNode);

  forEach(tabs, function(tab, tabIndex) {

    if (!tab.id) {
      throw new Error('tab must have an id');
    }

    var id = escapeHTML(tab.id),
        label = escapeHTML(tab.label);

    var tabNode = domify('<div class="cpp-properties-tab" data-tab="' + id + '" role="tabpanel" ' +
          'id="cpp-tabpanel-' + id + '" aria-labelledby="cpp-tab-' + id + '"></div>'),
        tabLinkNode = domify('<li class="cpp-properties-tab-link" role="presentation">' +
          '<button type="button" role="tab" data-tab-target="' + id + '" id="cpp-tab-' + id + '" ' +
            'aria-controls="cpp-tabpanel-' + id + '" aria-selected="false" tabindex="-1" ' +
            'aria-label="' + label + '" title="' + label + '">' +
            '<span class="cpp-properties-tab-icon" aria-hidden="true">' + tabIcon(tab) + '</span>' +
          '</button>' +
        '</li>');

    var groups = tab.groups;

    forEach(groups, function(group) {

      if (!group.id) {
        throw new Error('group must have an id');
      }

      var groupNode = domify('<div class="cpp-properties-group" data-group="' + escapeHTML(group.id) + '">' +
          '<span class="group-toggle"></span>' +
          '<span class="group-label">' + escapeHTML(group.label) + '</span>' +
        '</div>');

      // TODO(nre): use event delegation to handle that...
      groupNode.querySelector('.group-toggle').addEventListener('click', function(evt) {
        domClasses(groupNode).toggle('group-closed');
        evt.preventDefault();
        evt.stopPropagation();
      });
      groupNode.addEventListener('click', function(evt) {
        if (!evt.defaultPrevented && domClasses(groupNode).has('group-closed')) {
          domClasses(groupNode).remove('group-closed');
        }
      });

      forEach(group.entries, function(entry) {

        if (!entry.id) {
          throw new Error('entry must have an id');
        }

        var html = entry.html;

        if (typeof html === 'string') {
          html = domify(html);
        }

        // unwrap jquery
        if (html.get) {
          html = html.get(0);
        }

        var entryNode = domify('<div class="cpp-properties-entry" data-entry="' + escapeHTML(entry.id) + '"></div>');

        forEach(entry.cssClasses || [], function(cssClass) {
          domClasses(entryNode).add(cssClass);
        });

        entryNode.appendChild(html);

        groupNode.appendChild(entryNode);

        // update conditionally visible elements
        self.updateState(entry, entryNode);
      });

      if (self._editInDialog && group.editInline !== true && domQuery(CONTROL_SELECTOR, groupNode)) {
        makeEditableInDialog(groupNode, group);
      }

      tabNode.appendChild(groupNode);
    });

    tabLinksNode.appendChild(tabLinkNode);
    tabContainerNode.appendChild(tabNode);
  });

  railNode.appendChild(tabLinksNode);
  railNode.appendChild(searchLinkNode);
  railNode.appendChild(collapseNode);

  tabContainerNode.appendChild(searchTabNode);

  contentNode.appendChild(tabContainerNode);

  panelNode.appendChild(railNode);
  panelNode.appendChild(contentNode);

  return panelNode;
};


var CONTROL_SELECTOR = 'input:not([data-search-input]), select, textarea, [contenteditable]';

var SEARCH_TAB = 'cpp-search';

var SEARCH_ICON =
  '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
    '<circle cx="8.5" cy="8.5" r="5.5"/>' +
    '<path d="M12.5 12.5l4.5 4.5"/>' +
  '</svg>';

var NOT_SET = '<not set>';

var EDIT_ICON =
  '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false" fill="none" ' +
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M13.5 3.5l3 3L7 16H4v-3z"/>' +
    '<path d="M11.5 5.5l3 3"/>' +
  '</svg>';

var CLOSE_ICON =
  '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
    '<path d="M5 5l10 10M15 5L5 15"/>' +
  '</svg>';

/**
 * Show a group's values read-only, with a button that opens its fields in a pop-up.
 */
function makeEditableInDialog(groupNode, group) {

  var label = escapeHTML(typeof group.label === 'string' ? group.label : group.id);

  var firstEntry = domQuery('.cpp-properties-entry', groupNode);

  var editNode = domify(
        '<button type="button" class="cpp-group-edit" data-group-edit ' +
          'title="Edit ' + label + '" aria-label="Edit ' + label + '">' + EDIT_ICON + '</button>'),
      summaryNode = domify('<dl class="cpp-group-summary" data-group-summary></dl>'),
      headerNode = domify(
        '<div class="cpp-dialog-header">' +
          '<div class="cpp-dialog-title" data-dialog-title></div>' +
          '<div class="cpp-dialog-subtitle" data-dialog-subtitle></div>' +
          '<button type="button" class="cpp-dialog-close" data-group-cancel aria-label="Cancel" title="Cancel">' +
            CLOSE_ICON +
          '</button>' +
        '</div>'),
      footerNode = domify(
        '<div class="cpp-dialog-footer">' +
          '<button type="button" class="cpp-dialog-cancel" data-group-cancel>Cancel</button>' +
          '<button type="button" class="cpp-dialog-finish" data-group-finish>Finish</button>' +
        '</div>');

  groupNode.insertBefore(headerNode, groupNode.firstChild);
  groupNode.insertBefore(editNode, firstEntry);
  groupNode.insertBefore(summaryNode, firstEntry);

  if (group.description) {
    var helpNode = domify('<div class="cpp-dialog-help" role="note"></div>');

    helpNode.textContent = group.description;

    groupNode.appendChild(helpNode);

    domClasses(groupNode).add('cpp-has-help');
  }

  groupNode.appendChild(footerNode);

  domClasses(groupNode).add('cpp-read-view');
}

function isShownControl(control) {
  return control.type !== 'hidden' && !domClosest(control, '.' + HIDE_CLASS, true);
}

function cleanLabel(text) {
  return (text || '').replace(/\s+/g, ' ').trim().replace(/:$/, '');
}

/**
 * The label of a form control: the label for it, around it, or the one before it.
 */
function controlLabel(control, entryNode) {

  var labels = domQueryAll('label', entryNode),
      i;

  if (control.id) {
    for (i = 0; i < labels.length; i++) {
      if (domAttr(labels[i], 'for') === control.id) {
        return cleanLabel(labels[i].textContent);
      }
    }
  }

  var around = domClosest(control, 'label');

  if (around) {
    return cleanLabel(around.textContent);
  }

  var isToggleControl = control.type === 'checkbox' || control.type === 'radio',
      found;

  for (i = 0; i < labels.length; i++) {

    // eslint-disable-next-line no-bitwise
    var before = !!(labels[i].compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING);

    if (isToggleControl ? !before && !found : before) {
      found = labels[i];
    }
  }

  return cleanLabel(found ? found.textContent : '');
}

/**
 * The rows that show the values of an entry: { label, value, empty, invalid }.
 */
function summarizeEntry(entryNode) {

  var rows = [],
      radios = {};

  // a list of items
  var list = domQuery('.cpp-element-list select', entryNode);

  if (list) {
    var count = list.options.length;

    return [ {
      label: controlLabel(list, entryNode),
      value: count ? (count === 1 ? '1 item' : count + ' items') : NOT_SET,
      empty: !count,
      control: list
    } ];
  }

  forEach(filter(domQueryAll(CONTROL_SELECTOR, entryNode), isShownControl), function(control) {

    var value, label = controlLabel(control, entryNode);

    if (control.type === 'radio') {
      if (radios[control.name]) {
        return;
      }

      radios[control.name] = true;

      var checked = domQuery('input[type=radio][name="' + control.name + '"]:checked', entryNode);

      value = checked ? controlLabel(checked, entryNode) : '';
      label = cleanLabel((domQuery('label', entryNode) || {}).textContent) || label;
    } else
    if (control.type === 'checkbox') {
      value = control.checked ? 'True' : 'False';
    } else
    if (control.tagName === 'SELECT') {
      var option = control.options[control.selectedIndex];

      // an option with text, also an empty one that says what empty means
      value = option ? option.textContent : '';
    } else
    if (domAttr(control, 'contenteditable')) {
      value = control.innerText;
    } else {
      value = control.value;
    }

    value = (value || '').trim();

    if (!label) {
      return;
    }

    rows.push({
      label: label,
      value: value || NOT_SET,
      empty: !value,
      invalid: domClasses(control).has('invalid'),
      control: control
    });
  });

  return rows;
}

/**
 * The name of an element's type, such as "Process Task".
 */
function typeLabel(definition) {

  var type = (definition && definition.$type || '').replace(/^[^:]*:/, '');

  return type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

var COLLAPSE_ICON =
  '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

/**
 * The icon of a tab: its `icon` (SVG markup from the properties provider)
 * or the first letter of its label.
 */
function tabIcon(tab) {

  if (tab.icon) {
    return tab.icon;
  }

  var letter = (tab.label || tab.id || '?').charAt(0).toUpperCase();

  return '<span class="cpp-properties-tab-letter">' + escapeHTML(letter) + '</span>';
}



function setInputValue(node, value) {

  var contentEditable = isContentEditable(node);

  var oldValue = contentEditable ? node.innerText : node.value;

  var selection;

  // prevents input fields from having the value 'undefined'
  if (value === undefined) {
    value = '';
  }

  if (oldValue === value) {
    return;
  }

  // update selection on undo/redo
  if (document.activeElement === node) {
    selection = updateSelection(getSelection(node), node.value, value);
  }

  if (contentEditable) {
    node.innerText = value;
  } else {
    node.value = value;
  }

  if (selection) {
    setSelection(node, selection);
  }
}

function setSelectValue(node, value) {
  if (value !== undefined) {
    node.value = value;
  }
}

function setToggleValue(node, value) {
  var nodeValue = node.value;

  node.checked = (value === nodeValue) || (!domAttr(node, 'value') && value);
}

function setTextValue(node, value) {
  node.textContent = value;
}


function getSelection(node) {

  return isContentEditable(node) ? getContentEditableSelection(node) : {
    start: node.selectionStart,
    end: node.selectionEnd
  };
}

function getContentEditableSelection(node) {

  var selection = window.getSelection();

  var focusNode = selection.focusNode,
      focusOffset = selection.focusOffset,
      anchorOffset = selection.anchorOffset;

  if (!focusNode) {
    throw new Error('not selected');
  }

  // verify we have selection on the current element
  if (!node.contains(focusNode)) {
    throw new Error('not selected');
  }

  return {
    start: Math.min(focusOffset, anchorOffset),
    end: Math.max(focusOffset, anchorOffset)
  };
}

function setSelection(node, selection) {
  if (isContentEditable(node)) {
    setContentEditableSelection(node, selection);
  } else {
    node.selectionStart = selection.start;
    node.selectionEnd = selection.end;
  }
}

function setContentEditableSelection(node, selection) {

  var focusNode,
      domRange,
      domSelection;

  focusNode = node.firstChild || node,
  domRange = document.createRange();
  domRange.setStart(focusNode, selection.start);
  domRange.setEnd(focusNode, selection.end);

  domSelection = window.getSelection();
  domSelection.removeAllRanges();
  domSelection.addRange(domRange);
}
