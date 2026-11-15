# Changelog

All notable changes to [cmmn-js-properties-panel-flowable](https://github.com/jylups/cmmn-js-properties-panel-flowable) are documented here. Versions up to `0.9.0` are those of [cmmn-js-properties-panel](https://github.com/bpmn-io/cmmn-js-properties-panel) by bpmn.io. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

* `FEAT`: edit the Flowable item control rules in the Rules tab ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44)): parent completion, completion neutral with its condition, and the reactivation conditions of the item control of a plan item and the default control of its definition, and the default reactivation rule of an event listener that reactivates the case
* `FEAT`: edit lifecycle listeners in the Listener tab ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44)): `flowable:planItemLifecycleListener` of tasks, stages, milestones and event listeners, and `flowable:caseLifecycleListener` of the case, selected through its case plan model; each with its source and target state, implementation and fields
* `FEAT`: edit the Flowable task attributes ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44)):
  * an Implementation group for a plain task: its `flowable:type` (java, script, HTTP, external worker, case page, send event, mail) and the fields of that type; a new type removes the attributes only the previous type uses
  * an Asynchronous Continuations group for every task: `async`, `exclusive`, `asyncLeave`, `asyncLeaveExclusive`
  * in Details: the blocking expression of every task, same deployment of human, case and process tasks, and the business key expression, inherit business key, inherit variables, id variable and fallback to default tenant of case and process tasks
* `FIX`: show only the attributes written in the model in the Extensions tab, not the defaults of the descriptor
* `FIX`: show and disable the entries of a newly selected element for that element; selecting a case, process or decision task after another task failed with `Cannot read properties of undefined (reading 'includes')`
* `CHORE`: use `flowable-cmmn-moddle@1.2.0-next.5`
* `FEAT`: add a read-only Extensions tab that shows every extension of the selected element and the elements it stands for (definition, item control, default control, sentry, case, on-part): attributes of other namespaces, typed or unknown, and extension elements, typed or generic, as a tree ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44))
* `CHORE`: test against `flowable-cmmn-moddle@1.2.0-next.4` and `@jylups/cmmn-moddle@6.1.0`
* `FIX`: show nothing for an element without a business object, such as the implicit root of an empty canvas, instead of failing with `bo.get is not a function` ([jylups/cmmn-js-env#42](https://github.com/jylups/cmmn-js-env/issues/42))
* `CHORE`: use `@jylups/cmmn-js` 0.21 or later, the maintained fork of `cmmn-js`
* `CHORE`: publish from GitHub releases with npm trusted publishing instead of a stored npm token; prereleases go to the `next` dist-tag
* `CHORE`: build and test on Node 24 and 26
* `CHORE`: bundle the tests with webpack 5; the tests no longer need `NODE_OPTIONS=--openssl-legacy-provider`
* `CHORE`: declare `diagram-js` (`>=4.0.0`) as a peer dependency; the panel uses its translate module
* `FIX`: include the translate module itself, not its module namespace, in the dependencies of the properties panel module
* `CHORE`: accept the `@jylups/cmmn-js` 0.22 prereleases as peer dependency, and test against `@jylups/cmmn-js@0.22.0-next.3` with `diagram-js@15`
* `FIX`: show and edit a field injection expression written as a `<flowable:expression>` child element, and keep it in that form
* `FIX`: show and edit a field injection value written as a `<string>` or `<expression>` child element in the CMMN namespace, and keep it in that form
* `FIX`: validate the ID of an element without a reference, which threw with `moddle@8`
* `CHORE`: test against `@jylups/cmmn-js@0.22.0-next.4` (on `@jylups/cmmn-moddle@6`) and `flowable-cmmn-moddle@1.2.0-next.2`

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
