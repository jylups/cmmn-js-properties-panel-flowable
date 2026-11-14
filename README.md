# cmmn-js-properties-panel-flowable

[![CI](https://github.com/jylups/cmmn-js-properties-panel-flowable/actions/workflows/CI.yml/badge.svg)](https://github.com/jylups/cmmn-js-properties-panel-flowable/actions/workflows/CI.yml)

This is a properties panel extension for [@jylups/cmmn-js](https://github.com/jylups/cmmn-js), with Flowable properties. It is based on [bpmn-io/cmmn-js-properties-panel](https://github.com/bpmn-io/cmmn-js-properties-panel).


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

Bootstrap [@jylups/cmmn-js](https://github.com/jylups/cmmn-js) with the properties panel and a [properties provider](./lib/provider):

```javascript
var CmmnJS = require('@jylups/cmmn-js/lib/Modeler'),
    propertiesPanelModule = require('cmmn-js-properties-panel-flowable'),
    propertiesProviderModule = require('cmmn-js-properties-panel-flowable/lib/provider/cmmn');

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

In order to be able to edit [Flowable](https://flowable.org) related properties, use the [flowable properties provider](./lib/provider/flowable).
In addition, you need to define the `flowable` namespace via [flowable-cmmn-moddle](https://github.com/jylups/flowable-cmmn-moddle).

```javascript
var CmmnJS = require('@jylups/cmmn-js/lib/Modeler'),
    propertiesPanelModule = require('cmmn-js-properties-panel-flowable'),
    // use Flowable properties provider
    propertiesProviderModule = require('cmmn-js-properties-panel-flowable/lib/provider/flowable');

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

* [Issue tracker](https://github.com/jylups/cmmn-js-env/issues)
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