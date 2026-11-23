'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject */

var coreModule = require('@jylups/cmmn-js/lib/core'),
    flowableModdlePackage = require('flowable-cmmn-moddle/resources/flowable');

var getCaseVariables = require('lib/helper/CaseVariablesHelper').getCaseVariables;


describe('case variables', function() {

  beforeEach(bootstrapModeler(require('./CaseVariables.cmmn'), {
    modules: [ coreModule ],
    moddleExtensions: { flowable: flowableModdlePackage }
  }));


  it('should list the variables the case reads and writes, sorted', inject(function(elementRegistry) {

    // when
    var names = getCaseVariables(elementRegistry.get('PI_Process').businessObject);

    // then
    expect(names).to.eql([
      'approved',
      'claimId',
      'decision',
      'initiator',
      'items',
      'reviewer',
      'taskId'
    ]);
  }));

});
