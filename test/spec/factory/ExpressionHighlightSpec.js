'use strict';

var helper = require('lib/helper/ExpressionHighlightHelper');


describe('expression highlight', function() {

  function types(text) {
    return helper.tokenize(text).map(function(token) {
      return (token.type || 'text') + ':' + token.text;
    });
  }


  it('should split an expression', function() {

    // then
    expect(types('${vars:exists(\'total\') ? total : 0}')).to.eql([
      'delimiter:${',
      'function:vars:exists',
      'text:(',
      'string:\'total\'',
      'text:) ',
      'operator:?',
      'text: ',
      'variable:total',
      'text: ',
      'operator::',
      'text: ',
      'number:0',
      'delimiter:}'
    ]);
  });


  it('should know the keywords', function() {

    // then
    expect(types('${empty a and not b}')).to.eql([
      'delimiter:${',
      'keyword:empty',
      'text: ',
      'variable:a',
      'text: ',
      'keyword:and',
      'text: ',
      'keyword:not',
      'text: ',
      'variable:b',
      'delimiter:}'
    ]);
  });


  it('should leave the text around expressions plain', function() {

    // then
    expect(types('Claim #{id} of ${owner}')).to.eql([
      'text:Claim ',
      'delimiter:#{',
      'variable:id',
      'delimiter:}',
      'text: of ',
      'delimiter:${',
      'variable:owner',
      'delimiter:}'
    ]);
  });


  it('should keep a brace in a string and a nested map', function() {

    // then
    expect(types('${a == \'}\'}')).to.eql([
      'delimiter:${',
      'variable:a',
      'text: ',
      'operator:==',
      'text: ',
      'string:\'}\'',
      'delimiter:}'
    ]);

    expect(types('${{\'k\': 1}}').slice(-2)).to.eql([ 'text:}', 'delimiter:}' ]);
  });


  it('should escape the text', function() {

    // then
    expect(helper.highlight('<b> ${a < b}')).to.equal(
      '&lt;b&gt; <span class="cpp-code-delimiter">${</span>' +
      '<span class="cpp-code-variable">a</span> <span class="cpp-code-operator">&lt;</span> ' +
      '<span class="cpp-code-variable">b</span><span class="cpp-code-delimiter">}</span>'
    );
  });


  it('should keep the height of a last empty line', function() {

    // then
    expect(helper.highlight('a\n')).to.equal('a\n ');
    expect(helper.highlight('')).to.equal('');
  });

});
