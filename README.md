# cmmn-js-properties-panel

[![CI](https://github.com/bpmn-io/cmmn-js-properties-panel/workflows/CI/badge.svg)](https://github.com/bpmn-io/cmmn-js-properties-panel/actions?query=workflow%3ACI)

This is properties panel extension for [cmmn-js](https://github.com/bpmn-io/cmmn-js).


## Features

The properties panel allows users to edit invisible CMMN properties in a convenient way.


## Usage

Provide two HTML elements, one for the properties panel and one for the CMMN diagram:

```html
<div class="modeler">
  <div id="canvas"></div>
  <div id="properties"></div>
</div>
```

Bootstrap [cmmn-js](https://github.com/bpmn-io/cmmn-js) with the properties panel and a [properties provider](https://github.com/bpmn-io/cmmn-js-properties-panel/tree/master/lib/provider):

```javascript
var CmmnJS = require('cmmn-js/lib/Modeler'),
    propertiesPanelModule = require('cmmn-js-properties-panel'),
    propertiesProviderModule = require('cmmn-js-properties-panel/lib/provider/cmmn');

var cmmnJS = new CmmnJS({
  additionalModules: [
    propertiesPanelModule,
    propertiesProviderModule
  ],
  container: '#canvas',
  propertiesPanel: {
    parent: '#properties'
  }
});
```


### Dynamic Attach/Detach

You may attach or detach the properties panel dynamically to any element on the page, too:

```javascript
var propertiesPanel = cmmnJS.get('propertiesPanel');

// detach the panel
propertiesPanel.detach();

// attach it to some other element
propertiesPanel.attachTo('#other-properties');
```


### Use with Flowable properties

In order to be able to edit [Flowable](https://flowable.org) related properties, use the [flowable properties provider](https://github.com/bpmn-io/cmmn-js-properties-panel/tree/master/lib/provider/flowable).
In addition, you need to define the `flowable` namespace via [flowable-cmmn-moddle](https://github.com/flowable/flowable-cmmn-moddle).

```javascript
var CmmnJS = require('cmmn-js/lib/Modeler'),
    propertiesPanelModule = require('cmmn-js-properties-panel'),
    // use Flowable properties provider
    propertiesProviderModule = require('cmmn-js-properties-panel/lib/provider/flowable');

// a descriptor that defines Flowable related CMMN 1.1 XML extensions
var flowableModdleDescriptor = require('flowable-cmmn-moddle/resources/flowable');

var cmmnJS = new CmmnJS({
  additionalModules: [
    propertiesPanelModule,
    propertiesProviderModule
  ],
  container: '#canvas',
  propertiesPanel: {
    parent: '#properties'
  },
  // make flowable prefix known for import, editing and export
  moddleExtensions: {
    flowable: flowableModdleDescriptor
  }
});

...
```


## Additional Resources

* [Issue tracker](https://github.com/bpmn-io/cmmn-js-properties-panel/issues)
* [Forum](https://forum.bpmn.io)


## Development

### Running the tests

```bash
npm install

export TEST_BROWSERS=Chrome
npm run all
```


## License

MIT