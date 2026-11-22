'use strict';

/**
 * SVG markup of a filled glyph of an icon definition such as Font Awesome's
 * ({ icon: [ width, height, ligatures, unicode, path ] }), drawn in the
 * current text color.
 *
 * @param {Object} definition
 * @param {number} [size=16]
 *
 * @return {string}
 */
module.exports.glyph = function(definition, size) {

  var icon = definition.icon,
      width = icon[0],
      height = icon[1],
      path = icon[4];

  size = size || 16;

  return '<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + size + '" height="' + size + '" ' +
    'aria-hidden="true" focusable="false" fill="currentColor">' +
    '<path d="' + (Array.isArray(path) ? path.join(' ') : path) + '"/>' +
  '</svg>';
};
