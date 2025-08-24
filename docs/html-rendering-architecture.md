# CMMN-JS Properties Panel Flowable - HTML Rendering Architecture

## Overview

This document explains how the cmmn-js-properties-panel-flowable library generates HTML forms from CMMN XML elements and converts XML data into interactive property panels.

## XML to JSON Object Conversion

The XML to JSON conversion process occurs through the CMMN.js modeler infrastructure:

### 1. XML Import Process
**Location**: `app/index.js:36-56`
```javascript
cmmnModeler.importXML(xml, function(err) {
  // XML is parsed and converted to business objects
});
```

### 2. Moddle Extensions Integration
**Location**: `app/index.js:27-29`
```javascript
moddleExtensions: {
  flowable: flowableModdleDescriptor
}
```
- Uses `flowable-cmmn-moddle` package to understand Flowable-specific XML attributes
- Extends base CMMN model with Flowable extensions like `flowable:assignee`, `flowable:formKey`, etc.

### 3. Business Object Creation
- XML elements become JavaScript business objects
- Properties accessible via `.get()` and `.set()` methods
- Example: `businessObject.get('flowable:assignee')` retrieves assignee from XML

## HTML Generation Architecture

### 1. Properties Provider Structure
**Location**: `FlowablePropertiesProvider.js:329-369`

The provider creates a tab-based structure:

```javascript
getTabs: function(element) {
  return [
    generalTab,      // Basic properties (ID, name, documentation)
    rulesTab,        // Item control and rules
    variablesTab,    // Variable mapping
    listenerTab,     // Event listeners  
    definitionTab    // Case definition properties
  ];
}
```

Each tab contains groups, and each group contains entries that represent form fields.

### 2. Entry Factory System
**Location**: `EntryFactory.js`

Factory pattern creates different types of form entries:

```javascript
// Text input field
EntryFactory.textField({
  id: 'assignee',
  label: 'Assignee',
  modelProperty: 'assignee',
  reference: 'definitionRef'
});

// Checkbox field  
EntryFactory.checkbox({...});

// Select dropdown
EntryFactory.selectBox({...});
```

### 3. HTML Template Generation
**Location**: `TextInputEntryFactory.js:38-52`

Generates actual HTML strings:

```javascript
resource.html = 
  '<label for="camunda-' + resource.id + '">' + escapeHTML(label) + '</label>' +
  '<div class="cpp-field-wrapper">' +
    '<input id="camunda-' + escapeHTML(resource.id) + '" type="text" name="' + escapeHTML(options.modelProperty) + '" />' +
    '<button class="clear" data-action="clear" data-show="canClear">' +
      '<span>X</span>' +
    '</button>' +
  '</div>';
```

### 4. Properties Panel Rendering
**Location**: `PropertiesPanel.js`

#### Core Methods:

- **`_createPanel()`** (lines 831-1156): Builds overall panel structure with tabs and groups
- **`_bindTemplate()`** (lines 855-911): Connects form inputs to business object properties  
- **`update()`** (lines 408-458): Refreshes panel when element selection changes
- **`_updateActivation()`** (lines 914-1057): Updates form values and visibility

## Data Flow Process

### 1. Element Selection Trigger
```
User clicks CMMN element → PropertiesPanel.update() called
```

### 2. Properties Provider Query
```javascript
var newTabs = this._propertiesProvider.getTabs(element);
```

### 3. Entry Generation
For each tab → group → entry:
```javascript
// HumanTaskProps.js example
group.entries.push(entryFactory.textField({
  id: 'assignee',
  label: translate('Assignee'),
  modelProperty: 'assignee',
  reference: 'definitionRef'
}));
```

### 4. HTML Generation and DOM Insertion
```javascript
// PropertiesPanel.js:_createPanel()
var entryNode = domify('<div class="cpp-properties-entry" data-entry="' + escapeHTML(entry.id) + '"></div>');
entryNode.appendChild(html); // Generated from entry factory
groupNode.appendChild(entryNode);
```

### 5. Data Binding
**Location**: `PropertiesPanel.js:_bindTemplate()` (lines 855-911)

```javascript
// Bind form values to business object properties
var values = entry.get(element, entryNode);
setInputValue(node, values[propertyName]);

// Set up change handlers
entry.set(element, values, containerElement);
```

## Key Components

### Business Object Integration
**Location**: `EntryFactory.js:34-42`

```javascript
function getReferencedObject(element, reference) {
  var bo = getBusinessObject(element);
  if (reference) {
    return bo && bo.get(reference);
  }
  return bo;
}
```

### Command Execution
**Location**: `CmdHelper.js`

Changes to form inputs trigger command execution:
```javascript
return cmdHelper.updateProperties(bo, res, element);
```

### Event Handling
**Location**: `PropertiesPanel.js:480-601`

Form changes are handled through event delegation:
```javascript
domDelegate.bind(container, 'input, textarea, select, [contenteditable]', 'change', handleChange);
```

## Flowable-Specific Extensions

### Supported Properties
As defined in various parts files:

- **Human Tasks**: `flowable:assignee`, `flowable:candidateUsers`, `flowable:candidateGroups`, `flowable:formKey`
- **Process Tasks**: `flowable:processBinding`, `flowable:processVersion`, `flowable:processTenantId`
- **Case Elements**: `flowable:historyTimeToLive`, `flowable:initiatorVariableName`
- **Listeners**: `flowable:caseExecutionListener`, `flowable:taskListener`, `flowable:variableListener`

### Property Mapping
XML attributes map directly to form fields:
```xml
<!-- XML -->
<humanTask flowable:assignee="john.doe" flowable:formKey="userForm">

<!-- Becomes form fields -->
<input name="assignee" value="john.doe" />
<input name="formKey" value="userForm" />
```

## Architecture Benefits

1. **Separation of Concerns**: Properties provider defines what fields to show, entry factory handles HTML generation
2. **Extensibility**: New property types can be added by creating new entry factories
3. **Data Binding**: Automatic synchronization between form inputs and business objects
4. **Command Pattern**: All changes go through command stack for undo/redo support
5. **Event-Driven**: Reactive updates when model changes occur

## File Structure Summary

```
cmmn-js-properties-panel-flowable/
├── lib/
│   ├── PropertiesPanel.js           # Main panel orchestration
│   ├── provider/flowable/
│   │   ├── FlowablePropertiesProvider.js  # Tab/group structure
│   │   └── parts/                   # Individual property implementations
│   │       ├── HumanTaskProps.js
│   │       ├── VariableMappingProps.js
│   │       └── ...
│   ├── factory/
│   │   ├── EntryFactory.js          # Entry creation facade
│   │   ├── TextInputEntryFactory.js # HTML generation
│   │   └── ...
│   └── helper/
│       └── CmdHelper.js             # Command execution utilities
```

This architecture provides a robust foundation for creating dynamic, data-bound property panels that seamlessly integrate with CMMN business objects and support the full range of Flowable extensions.