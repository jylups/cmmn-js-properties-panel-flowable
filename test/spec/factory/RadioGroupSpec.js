'use strict';

var entryFactory = require('lib/factory/EntryFactory'),
    domify = require('min-dom').domify,
    domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll;


describe('factory - radio group', function() {

  var entry = entryFactory.radioGroup({
    id: 'size',
    label: 'Size',
    modelProperty: 'size',
    description: 'How big it is',
    choices: [
      { value: 'small', name: 'Small' },
      { value: 'large', name: 'Large <big>' }
    ]
  });

  var html = domify('<div>' + entry.html + '</div>');


  it('should show a labelled group with one radio button per choice', function() {

    // then
    var group = domQuery('[role=radiogroup]', html),
        radios = domQueryAll('input[type=radio]', group);

    expect(group.getAttribute('aria-label')).to.equal('Size');
    expect(domQuery('.cpp-radio-group-label', html).textContent).to.equal('Size');
    expect(radios.length).to.equal(2);
    expect(radios[0].name).to.equal('size');
    expect(radios[1].value).to.equal('large');
    expect(domQuery('label[for="flowable-size-large"]', html).textContent).to.equal('Large <big>');
    expect(domQuery('.cpp-field-description', html).textContent).to.equal('How big it is');
  });


  it('should read and write its model property by default', function() {

    // given
    var bo = {
      size: 'large',
      get: function(name) {
        return this[name];
      }
    };

    // then
    expect(entry.modelProperty).to.equal('size');
    expect(entry.get({ businessObject: bo })).to.eql({ size: 'large' });
  });

});
