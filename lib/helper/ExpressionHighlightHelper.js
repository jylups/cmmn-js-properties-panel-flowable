'use strict';

var escapeHTML = require('../Utils').escapeHTML;

/**
 * Syntax colours for Flowable's expressions (JUEL), as Flowable Design's code
 * editor shows them: the text between `${` / `#{` and `}` is split into
 * strings, numbers, keywords, functions (such as `vars:exists`), variables and
 * operators; the text around an expression stays plain.
 *
 * Conscia-LLC/conscia-modeler#105
 */

var KEYWORDS = [
  'and', 'or', 'not', 'eq', 'ne', 'lt', 'gt', 'le', 'ge',
  'div', 'mod', 'empty', 'instanceof', 'true', 'false', 'null'
];

var IDENTIFIER_START = /[A-Za-z_$]/,
    IDENTIFIER_PART = /[\w$]/,
    DIGIT = /[0-9]/,
    OPERATOR = /[=!<>+\-*/%?:&|]/;

function span(type, text) {
  return '<span class="cpp-code-' + type + '">' + escapeHTML(text) + '</span>';
}

function readIdentifier(text, start) {
  var end = start + 1;

  while (end < text.length && IDENTIFIER_PART.test(text.charAt(end))) {
    end++;
  }

  return end;
}

function skipSpaces(text, idx) {
  while (idx < text.length && /\s/.test(text.charAt(idx))) {
    idx++;
  }

  return idx;
}

/**
 * The tokens of a text, each as { type, text }; type is null for plain text.
 *
 * @param {string} text
 * @return {Array<Object>}
 */
function tokenize(text) {
  var tokens = [],
      idx = 0,
      inExpression = false,
      depth = 0;

  function push(type, value) {
    var last = tokens[tokens.length - 1];

    // plain text in one piece
    if (!type && last && !last.type) {
      last.text += value;
    } else {
      tokens.push({ type: type, text: value });
    }
  }

  text = text || '';

  while (idx < text.length) {
    var ch = text.charAt(idx),
        end;

    if (!inExpression) {
      var next = text.slice(idx).search(/[$#]\{/);

      if (next === -1) {
        push(null, text.slice(idx));
        break;
      }

      if (next > 0) {
        push(null, text.substr(idx, next));
      }

      push('delimiter', text.substr(idx + next, 2));
      idx += next + 2;
      inExpression = true;
      depth = 0;
      continue;
    }

    if (ch === '\'' || ch === '"') {
      end = idx + 1;

      while (end < text.length && text.charAt(end) !== ch) {
        end += text.charAt(end) === '\\' ? 2 : 1;
      }

      end = Math.min(end + 1, text.length);
      push('string', text.slice(idx, end));
      idx = end;
    }

    else if (DIGIT.test(ch)) {
      end = idx + 1;

      while (end < text.length && /[0-9.eE]/.test(text.charAt(end))) {
        end++;
      }

      push('number', text.slice(idx, end));
      idx = end;
    }

    else if (IDENTIFIER_START.test(ch)) {
      end = readIdentifier(text, idx);

      // a function with its prefix, such as vars:exists(
      var call = end;

      if (text.charAt(call) === ':' && IDENTIFIER_START.test(text.charAt(call + 1))) {
        call = readIdentifier(text, call + 1);
      }

      var word = text.slice(idx, end);

      if (text.charAt(skipSpaces(text, call)) === '(') {
        push('function', text.slice(idx, call));
        idx = call;
      } else {
        push(KEYWORDS.indexOf(word) !== -1 ? 'keyword' : 'variable', word);
        idx = end;
      }
    }

    else if (ch === '{') {
      depth++;
      push(null, ch);
      idx++;
    }

    else if (ch === '}') {
      if (depth === 0) {
        push('delimiter', ch);
        inExpression = false;
      } else {
        depth--;
        push(null, ch);
      }

      idx++;
    }

    else if (OPERATOR.test(ch)) {
      end = idx + 1;

      while (end < text.length && OPERATOR.test(text.charAt(end)) && text.charAt(end) !== '?') {
        end++;
      }

      push('operator', text.slice(idx, end));
      idx = end;
    }

    else {
      push(null, ch);
      idx++;
    }
  }

  return tokens;
}

/**
 * A text as HTML with its expressions' syntax coloured.
 *
 * @param {string} text
 * @return {string}
 */
function highlight(text) {
  var html = tokenize(text).map(function(token) {
    return token.type ? span(token.type, token.text) : escapeHTML(token.text);
  }).join('');

  // a last empty line keeps its height, as in the text area
  return /\n$/.test(text || '') ? html + ' ' : html;
}


module.exports = {
  tokenize: tokenize,
  highlight: highlight
};
