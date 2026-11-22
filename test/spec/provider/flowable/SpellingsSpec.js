'use strict';

var TestHelper = require('../../../TestHelper');

var TestContainer = require('mocha-test-container-support');

/* global bootstrapModeler, inject */

var propertiesPanelModule = require('lib'),
    domQuery = require('min-dom').query,
    coreModule = require('@jylups/cmmn-js/lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    modelingModule = require('@jylups/cmmn-js/lib/features/modeling'),
    propertiesProviderModule = require('lib/provider/flowable'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');


describe('flowable - attribute spellings', function() {

  var diagramXML = require('./Spellings.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule, selectionModule, modelingModule,
      propertiesPanelModule,
      propertiesProviderModule
    ],
    moddleExtensions: { flowable: flowableModdlePackage }
  }));

  beforeEach(inject(function(propertiesPanel) {
    propertiesPanel.attachTo(container);
  }));


  var element;

  function select(id) {
    return inject(function(elementRegistry, selection) {
      element = elementRegistry.get(id);

      selection.select(element);
    })();
  }

  function definition() {
    return element.businessObject.definitionRef;
  }

  function control(id) {
    return domQuery('[data-entry="' + id + '"] input, [data-entry="' + id + '"] select', container);
  }

  function saveXML(done, check) {
    inject(function(cmmnjs) {
      cmmnjs.saveXML({ format: false }, function(err, xml) {
        try {
          expect(err).not.to.exist;
          check(xml);
          done();
        } catch (e) {
          done(e);
        }
      });
    })();
  }


  describe('flowable:autoComplete', function() {

    beforeEach(function() {
      select('PI_Stage');
    });


    it('should be read', function() {

      // then
      expect(control('stage-autoComplete').checked).to.be.true;
    });


    it('should be written as the CMMN attribute', function(done) {

      // when
      TestHelper.triggerEvent(control('stage-autoComplete'), 'click');
      TestHelper.triggerEvent(control('stage-autoComplete'), 'click');

      // then
      expect(definition().get('autoComplete')).to.be.true;
      expect(definition().get('flowable:autoComplete')).not.to.exist;

      saveXML(done, function(xml) {
        expect(xml).to.contain('<cmmn:stage id="Stage_1" name="Stage" autoComplete="true"');
        expect(xml).not.to.contain('flowable:autoComplete');
      });
    });


    it('should come back on undo', inject(function(commandStack) {

      // given
      TestHelper.triggerEvent(control('stage-autoComplete'), 'click');

      // when
      commandStack.undo();

      // then
      expect(definition().get('flowable:autoComplete')).to.equal('true');
    }));

  });


  describe('flowable:isBlocking', function() {

    beforeEach(function() {
      select('PI_Task');
    });


    it('should be read', function() {

      // then
      expect(control('taskIsBlocking').checked).to.be.false;
    });


    it('should be written as the CMMN attribute', function(done) {

      // when
      TestHelper.triggerEvent(control('taskIsBlocking'), 'click');
      TestHelper.triggerEvent(control('taskIsBlocking'), 'click');

      // then
      expect(definition().get('isBlocking')).to.be.false;
      expect(definition().get('flowable:isBlocking')).not.to.exist;

      saveXML(done, function(xml) {
        expect(xml).to.contain('isBlocking="false"');
        expect(xml).not.to.contain('flowable:isBlocking');
      });
    });

  });


  it('should read event listener attributes without prefix and write them with it', function(done) {

    // when
    select('PI_Signal');

    // then
    expect(control('eventListenerType').value).to.equal('signal');
    expect(control('eventListenerSignalRef').value).to.equal('go');

    saveXML(done, function(xml) {
      expect(xml).to.contain('flowable:signalRef="go"');
    });
  });


  describe('authorized roles', function() {

    beforeEach(function() {
      select('PI_User');
    });


    it('should show a comma list', function() {

      // then
      expect(control('eventListenerAuthorizedRoles').value).to.equal('manager,clerk');
    });


    it('should write a comma list', function(done) {

      // when
      TestHelper.triggerValue(control('eventListenerAuthorizedRoles'), 'manager, clerk , auditor', 'change');

      // then
      saveXML(done, function(xml) {
        expect(xml).to.contain('authorizedRoleRefs="manager,clerk,auditor"');
      });
    });

  });


  describe('on transaction of a task listener', function() {

    beforeEach(function() {
      select('PI_Task');

      TestHelper.triggerFormFieldSelection(0, domQuery('[data-entry="taskListeners"]', container));
    });


    it('should be shown', function() {

      // then
      expect(control('listenerOnTransaction').value).to.equal('committed');
    });


    it('should be changed', inject(function(commandStack) {

      // when
      TestHelper.triggerValue(control('listenerOnTransaction'), 'before-commit', 'change');

      // then
      var listener = definition().get('extensionElements').get('values')[0];

      expect(listener.get('onTransaction')).to.equal('before-commit');

      // when
      commandStack.undo();

      // then
      expect(listener.get('onTransaction')).to.equal('committed');
    }));

  });

});
