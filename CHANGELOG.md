# Changelog

All notable changes to [cmmn-js-properties-panel-flowable](https://github.com/jylups/cmmn-js-properties-panel-flowable) are documented here. Versions up to `0.9.0` are those of [cmmn-js-properties-panel](https://github.com/bpmn-io/cmmn-js-properties-panel) by bpmn.io. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

* `FEAT`: edit the remaining Flowable attributes ([jylups/cmmn-js-env#50](https://github.com/jylups/cmmn-js-env/issues/50)):
  * in Details of a stage or milestone: include in stage overview, display order and business status, the milestone variable of a milestone, and the auto complete condition of a stage or the case plan model
  * in the Rules tab, for the repetition rule of the item control and the default control: counter variable, ignore counter variable, max instance count, and the collection, element and element index variables
  * in Details of a criterion: the trigger mode of its sentry, and for an exit criterion the exit event type (on a stage or the case plan model) and the exit type (on a plan item)
* `CHORE`: use `@jylups/cmmn-js@0.22.0-next.9` and `flowable-cmmn-moddle@1.2.0-next.8`
* `FEAT`: edit the target expression, the source and target variable types and transient of in and out mappings, as Flowable reads them ([jylups/cmmn-js-env#49](https://github.com/jylups/cmmn-js-env/issues/49))
* `FEAT`: report the parts of a model Flowable does not read (case execution listeners, variable listeners, and the business key, all variables and local of in and out mappings) as problems, with the `problems` service of `@jylups/cmmn-js`; they are kept on save ([jylups/cmmn-js-env#49](https://github.com/jylups/cmmn-js-env/issues/49))
* `FEAT`: remove what Flowable does not read from the panel: the Case Execution Listeners and Variable Listeners groups, the Business Key checkbox of case and process tasks, and the All mapping type and Local checkbox of in and out mappings ([jylups/cmmn-js-env#49](https://github.com/jylups/cmmn-js-env/issues/49))
* `CHORE`: test against `@jylups/cmmn-js@0.22.0-next.8`
* `FEAT`: show the problems of the selected element, from the `problems` service of `@jylups/cmmn-js`, in a Problems group at the top of the General tab ([jylups/cmmn-js-env#47](https://github.com/jylups/cmmn-js-env/issues/47))
* `CHORE`: use `flowable-cmmn-moddle@1.2.0-next.7`
* `FIX`: write a script listener the way Flowable reads it: `type="script"` and a `<flowable:script>` with its `language`, script and optional `resultVariable`; a script in the Camunda form (`scriptFormat`, no `type`) is shown and is changed to the Flowable form when edited, with a warning until then ([jylups/cmmn-js-env#45](https://github.com/jylups/cmmn-js-env/issues/45))
* `FEAT`: edit event listeners and the event registry ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44)):
  * in Details: the kind of a generic event listener (signal, variable, intent, reactivate, or an event registry event) with its signal or variable and change type, and the available condition of every event listener
  * an Event Registry tab for a case started by an event, an event listener that waits for an event and a send event task: the event key, the start correlation of the case, the channel key and system channel of the task, the correlation parameters and the payload mapping
* `FEAT`: edit the Flowable item control rules in the Rules tab ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44)): parent completion, completion neutral with its condition, and the reactivation conditions of the item control of a plan item and the default control of its definition, and the default reactivation rule of an event listener that reactivates the case
* `FEAT`: edit lifecycle listeners in the Listener tab ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44)): `flowable:planItemLifecycleListener` of tasks, stages, milestones and event listeners, and `flowable:caseLifecycleListener` of the case, selected through its case plan model; each with its source and target state, implementation and fields
* `FEAT`: edit the Flowable task attributes ([jylups/cmmn-js-env#44](https://github.com/jylups/cmmn-js-env/issues/44)):
  * an Implementation group for a plain task: its `flowable:type` (java, script, HTTP, external worker, case page, send event, mail) and the fields of that type; a new type removes the attributes only the previous type uses
  * an Asynchronous Continuations group for every task: `async`, `exclusive`, `asyncLeave`, `asyncLeaveExclusive`
  * in Details: the blocking expression of every task, same deployment of human, case and process tasks, and the business key expression, inherit business key, inherit variables, id variable and fallback to default tenant of case and process tasks
* `FIX`: show only the attributes written in the model in the Extensions tab, not the defaults of the descriptor
* `FIX`: show and disable the entries of a newly selected element for that element; selecting a case, process or decision task after another task failed with `Cannot read properties of undefined (reading 'includes')`
* `CHORE`: use `flowable-cmmn-moddle@1.2.0-next.6`
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

* The panel no longer offers case execution listeners, variable listeners, the Business Key checkbox of case and process tasks, or the All mapping type and Local checkbox of in and out mappings; Flowable reads none of them. Models that have them keep them on save, and they are reported as problems. Use lifecycle listeners, variable event listeners, and the business key expression, inherit business key and inherit variables of the task instead.
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
