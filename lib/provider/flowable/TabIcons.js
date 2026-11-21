'use strict';

/**
 * Icons of the property groups in the panel's rail: 20 x 20 line icons drawn
 * with the current text color.
 */

function icon(paths) {
  return '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    paths +
  '</svg>';
}

module.exports = {

  // sliders
  general: icon(
    '<path d="M3 5h14M3 10h14M3 15h14"/>' +
    '<circle cx="7" cy="5" r="1.8" fill="currentColor"/>' +
    '<circle cx="13" cy="10" r="1.8" fill="currentColor"/>' +
    '<circle cx="8" cy="15" r="1.8" fill="currentColor"/>'
  ),

  // shield with a check mark
  rules: icon(
    '<path d="M10 2.5l6 2.5v4.5c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8V5z"/>' +
    '<path d="M7.5 10l1.8 1.8 3.4-3.6"/>'
  ),

  // arrows in and out
  variables: icon(
    '<path d="M3 7h13l-3-3"/>' +
    '<path d="M17 13H4l3 3"/>'
  ),

  // broadcast
  eventRegistry: icon(
    '<circle cx="10" cy="10" r="1.6" fill="currentColor"/>' +
    '<path d="M7 7a4.2 4.2 0 000 6M13 7a4.2 4.2 0 010 6"/>' +
    '<path d="M4.5 4.5a7.8 7.8 0 000 11M15.5 4.5a7.8 7.8 0 010 11"/>'
  ),

  // bell
  listener: icon(
    '<path d="M5 14V9a5 5 0 0110 0v5l1.5 1.5h-13z"/>' +
    '<path d="M8.5 17.5a1.6 1.6 0 003 0"/>'
  ),

  // person
  assignment: icon(
    '<circle cx="10" cy="6.5" r="3"/>' +
    '<path d="M4 17c.6-3.3 3-5 6-5s5.4 1.7 6 5"/>'
  ),

  // play button
  control: icon(
    '<circle cx="10" cy="10" r="7.5"/>' +
    '<path d="M8.5 7l4 3-4 3z"/>'
  ),

  // number sign, as Flowable's repetition marker
  repetition: icon(
    '<path d="M8 3.5l-1.5 13M13.5 3.5l-1.5 13M4 7.5h12.5M3.5 12.5h12.5"/>'
  ),

  // form
  advancedForm: icon(
    '<rect x="3.5" y="3" width="13" height="14" rx="1.5"/>' +
    '<path d="M6.5 7h7M6.5 10.5h7M6.5 14h4"/>'
  ),

  // information
  details: icon(
    '<circle cx="10" cy="10" r="7.5"/>' +
    '<path d="M10 9v5"/>' +
    '<circle cx="10" cy="6.3" r="0.9" fill="currentColor"/>'
  ),

  // wrench
  advanced: icon(
    '<path d="M12.6 3.3a4 4 0 00-4.8 5.2l-4.3 4.3a1.6 1.6 0 002.2 2.2l4.3-4.3a4 4 0 005.2-4.8l-2.3 2.3-2-.6-.6-2z"/>'
  ),

  // arrow turning back
  reactivation: icon(
    '<path d="M4.5 10.5a5.5 5.5 0 105.5-5.5H6.5"/>' +
    '<path d="M8.5 2.8L6.2 5l2.3 2.3"/>'
  ),

  // document
  definition: icon(
    '<path d="M5 2.5h7l3 3v12H5z"/>' +
    '<path d="M12 2.5v3h3M7.5 10h5M7.5 13h5"/>'
  ),

  // puzzle piece
  extensions: icon(
    '<path d="M4 6.5h3.2a2.3 2.3 0 114.6 0H15v3.2a2.3 2.3 0 110 4.6v3.2H4z"/>'
  )
};
