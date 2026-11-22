'use strict';

var glyph = require('../../helper/IconHelper').glyph;

/**
 * Icons of the property groups in the panel's rail: filled glyphs, as in
 * Flowable Design's side bar, from Font Awesome Free (solid). Each icon is
 * required on its own, so that only these are bundled.
 *
 * Font Awesome Free by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (icons: CC BY 4.0)
 */
module.exports = {
  general: glyph(require('@fortawesome/free-solid-svg-icons/faSliders').faSliders, 18),
  assignment: glyph(require('@fortawesome/free-solid-svg-icons/faUser').faUser, 18),
  variables: glyph(require('@fortawesome/free-solid-svg-icons/faRightLeft').faRightLeft, 18),
  eventRegistry: glyph(require('@fortawesome/free-solid-svg-icons/faTowerBroadcast').faTowerBroadcast, 18),
  control: glyph(require('@fortawesome/free-solid-svg-icons/faCirclePlay').faCirclePlay, 18),
  repetition: glyph(require('@fortawesome/free-solid-svg-icons/faHashtag').faHashtag, 18),
  advancedForm: glyph(require('@fortawesome/free-solid-svg-icons/faRectangleList').faRectangleList, 18),
  details: glyph(require('@fortawesome/free-solid-svg-icons/faCircleInfo').faCircleInfo, 18),
  advanced: glyph(require('@fortawesome/free-solid-svg-icons/faWrench').faWrench, 18),
  listener: glyph(require('@fortawesome/free-solid-svg-icons/faBell').faBell, 18),
  reactivation: glyph(require('@fortawesome/free-solid-svg-icons/faRotateLeft').faRotateLeft, 18),
  definition: glyph(require('@fortawesome/free-solid-svg-icons/faFileLines').faFileLines, 18),
  extensions: glyph(require('@fortawesome/free-solid-svg-icons/faPuzzlePiece').faPuzzlePiece, 18)
};
