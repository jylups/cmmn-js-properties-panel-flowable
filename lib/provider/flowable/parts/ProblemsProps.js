'use strict';

var escapeHTML = require('../../../Utils').escapeHTML;


/**
 * A group with the problems of the selected element, from the `problems`
 * service of cmmn-js: what is lost on save or not shown first, then what
 * is kept but not recognised. Hidden when the element has none, or when
 * the editor has no `problems` service.
 *
 * @param {djs.model.Base} element
 * @param {Problems} [problems]
 * @param {Function} translate
 *
 * @return {Object} group
 */
module.exports = function(element, problems, translate) {

  function getProblems(element) {
    return problems ? problems.getProblems(element) : [];
  }

  return {
    id: 'problems',
    label: translate('Problems'),
    enabled: function(element) {
      return getProblems(element).length > 0;
    },
    entries: [
      {
        id: 'problems',
        html: '<ul class="cpp-problems"></ul>',
        get: function(element, node) {
          var target = node && node.querySelector('.cpp-problems');

          if (target) {
            target.innerHTML = getProblems(element).map(function(problem) {
              return '<li class="cpp-problem cpp-problem-' + escapeHTML(problem.severity) + '">' +
                escapeHTML(problem.message) +
              '</li>';
            }).join('');
          }

          return {};
        }
      }
    ]
  };
};
