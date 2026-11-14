# Changelog

All notable changes to [cmmn-js-properties-panel-flowable](https://github.com/jylups/cmmn-js-properties-panel-flowable) are documented here. Versions up to `0.9.0` are those of [cmmn-js-properties-panel](https://github.com/bpmn-io/cmmn-js-properties-panel) by bpmn.io. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

* `CHORE`: use `@jylups/cmmn-js` 0.21 or later, the maintained fork of `cmmn-js`
* `CHORE`: publish from GitHub releases with npm trusted publishing instead of a stored npm token; prereleases go to the `next` dist-tag
* `CHORE`: build and test on Node 24 and 26
* `CHORE`: bundle the tests with webpack 5; the tests no longer need `NODE_OPTIONS=--openssl-legacy-provider`
* `CHORE`: declare `diagram-js` (`>=4.0.0`) as a peer dependency; the panel uses its translate module
* `FIX`: include the translate module itself, not its module namespace, in the dependencies of the properties panel module
* `CHORE`: accept the `@jylups/cmmn-js` 0.22 prereleases as peer dependency, and test against `@jylups/cmmn-js@0.22.0-next.3` with `diagram-js@15`

### Breaking Changes

* The peer dependency is now `@jylups/cmmn-js` (`>=0.21.0 <1.0`) instead of `cmmn-js`, and the panel loads its helpers from `@jylups/cmmn-js/lib`. Applications that use `cmmn-js` from bpmn.io must switch to `@jylups/cmmn-js`.

## 0.9.0

* `FEAT`: add localization support ([#71](https://github.com/bpmn-io/cmmn-js-properties-panel/pull/71))
* `FIX`: always past plain text ([#70](https://github.com/bpmn-io/cmmn-js-properties-panel/pull/70))

## 0.8.3

* `FIX`: paste always as plain text ([#70](https://github.com/bpmn-io/cmmn-js-properties-panel/pull/70))

## 0.8.2

* `FIX`: deprecate placeholders in IDs ([#69](https://github.com/bpmn-io/cmmn-js-properties-panel/pull/69))

## 0.8.1

* `FIX`: support line breaks in Entry Field Description ([#65](https://github.com/bpmn-io/cmmn-js-properties-panel/pull/65))

## 0.8.0

* `FEAT`: sanitize entities when building HTML ([#63](https://github.com/bpmn-io/cmmn-js-properties-panel/issues/63))

## 0.7.2

* `CHORE`: move `npm-run-all` to dev-dependencies

## 0.7.1

* `CHORE`: update to `npm-run-all@4.1.5`

## 0.7.0

* `CHORE`: mark as compatible with `cmmn-js@0.16`
* `FIX`: don't restrict properties panel height unnecessarily ([#61](https://github.com/bpmn-io/cmmn-js-properties-panel/issues/61))

## 0.6.0

* `FEAT`: provide pre-built styles
* `CHORE`: bump dependency versions
* `CHORE`: migrate to `lodash@4`

## ...

Check `git log` for earlier history.
