# Changelog

All notable changes to [cmmn-js-properties-panel-flowable](https://github.com/jylups/cmmn-js-properties-panel-flowable) are documented here. Versions up to `0.9.0` are those of [cmmn-js-properties-panel](https://github.com/bpmn-io/cmmn-js-properties-panel) by bpmn.io. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

* `FEAT`: variable mappings as rows with a delete button each, as Flowable Design ([Conscia-LLC/conscia-modeler#105](https://github.com/Conscia-LLC/conscia-modeler/issues/105)); a list of extension elements can show its items this way (`rowDelete: true`), its select keeping the state underneath
* `FEAT`: the reactivation groups explain case reactivation and link to Flowable's page on its rules ([Conscia-LLC/conscia-modeler#108](https://github.com/Conscia-LLC/conscia-modeler/issues/108)); a group's help can end with a link (`helpLink: { label, url }`, https only)

## 3.3.0

* `FEAT`: variable mappings edited on one screen, as Flowable Design ([Conscia-LLC/conscia-modeler#105](https://github.com/Conscia-LLC/conscia-modeler/issues/105)): on a wide screen the pop-up shows the In and Out lists, the selected mapping's fields and an explanation side by side; each list row reads "source → target"; mappings move up and down (the other extension elements keep their place); the fields are named Source variable, Source expression and Target variable
* `FEAT`: a list of extension elements can move its items (`moveExtensionElement`)

## 3.2.0

* `FEAT`: a plan item without an item control (or a definition without a default control) gets one with its first rule, as Flowable Design does ([Conscia-LLC/conscia-modeler#107](https://github.com/Conscia-LLC/conscia-modeler/issues/107)): impact on parent completion, completion neutral and the reactivation conditions are no longer greyed out without one

* `FEAT`: the model hierarchy as Flowable Design's tree ([Conscia-LLC/conscia-modeler#109](https://github.com/Conscia-LLC/conscia-modeler/issues/109)): more room per row (44 px on touch screens), branches that collapse and expand with a chevron, Expand all and Collapse all, an icon for each type (Font Awesome Free), the name and type as a tooltip, and the arrow keys of a tree; a newly selected element's branch opens (`collapseHierarchy(idOrAll, collapse)`)

* `FEAT`: reactivation conditions as Flowable Design shows them ([Conscia-LLC/conscia-modeler#108](https://github.com/Conscia-LLC/conscia-modeler/issues/108)): Direct activation condition, Ignore condition and Default condition, each True (a check) or an expression, with an explanation, and one row in the read view (True, False or the expression), for the item control's rule and the default reactivation rule
* `FEAT`: an entry can work out its read-view row itself (`summaryValue(element)`)

* `FEAT`: the Execution group as Flowable Design shows it ([Conscia-LLC/conscia-modeler#107](https://github.com/Conscia-LLC/conscia-modeler/issues/107)): Asynchronous and Leave asynchronously are a choice of No, Yes exclusive or Yes non-exclusive (written as `flowable:async` / `flowable:exclusive` and `flowable:asyncLeave` / `flowable:asyncLeaveExclusive`), instead of two pairs of checkboxes; Parent Completion is "Impact on parent completion", its types in words with a "Select…" placeholder and an explanation; the default control's parent completion moves to the Default Control group, so the Execution pop-up no longer shows its hint twice
* `FEAT`: a select option can be a placeholder (`placeholder: true`), which the read view shows as not set

* `FIX`: plan item rules as Flowable Design shows them ([Conscia-LLC/conscia-modeler#106](https://github.com/Conscia-LLC/conscia-modeler/issues/106)): Required, Manual activation and Repetition are True or False, as CMMN reads them (a rule without a condition always applies, no rule never does), with their condition next to them; an empty `<requiredRule/>` no longer reads as not set. Clearing a condition keeps the rule instead of removing it, and checking a rule or typing a condition creates the item or default control when there is none

* `FEAT`: variable mappings in the read view as Flowable Design shows them ([Conscia-LLC/conscia-modeler#104](https://github.com/Conscia-LLC/conscia-modeler/issues/104)): In and Out as Source / Target tables with the first four rows and a chevron for the rest, a long value cut short with its full text as a tooltip, and no longer the counts and the fields of one selected mapping
* `FEAT`: an entry can show a list as a table in the read view (`summaryTable(element)`), or stay out of the read view (`summary: false`)

## 3.1.0

* `FEAT`: with nothing selected, the panel shows the case the diagram draws, as Flowable Design's case diagram ([Conscia-LLC/conscia-modeler#101](https://github.com/Conscia-LLC/conscia-modeler/issues/101)): the title "Case Diagram", and under Common the model key (the case's id), the case's name and documentation, and the category (the file's target namespace), instead of the id, name and documentation of the drawing; the case's start settings (asynchronous start, initiator variable, potential starter users and groups) show there too
* `FEAT`: an entry's `reference` can be a function that returns the object to read and write

## 3.0.1

* `FIX`: cancelling an edit pop-up (Cancel or Escape) while a text field such as Name has the focus shows the old value again in the pop-up and the read view, and a later Finish no longer saves the cancelled text ([jylups/cmmn-js-env#97](https://github.com/jylups/cmmn-js-env/issues/97)); undo and redo keep the caret in a focused text field

## 3.0.0

The side bar of Flowable Design: a vertical rail of property groups, values shown read-only and edited in pop-ups, a property search and a model hierarchy, the fields of Flowable's engine attributes and task types, and the problems Flowable reports at deployment.

Breaking changes:

* the tabs are now Flowable Design's groups, with other ids: `general`, `assignment`, `variables`, `eventRegistry`, `control`, `repetition`, `advancedForm`, `details`, `advanced`, `listener`, `reactivation`, `definition`, `extensions` (`rules` is gone)
* group values are read-only, with an edit button that opens a pop-up; `propertiesPanel: { editInDialog: false }` keeps every field editable in place
* the fields of the Camunda version that Flowable does not read are removed (history time to live, follow-up date, case/process/decision binding, version and tenant, decision result mapping and result variable, repeat on standard event); models that have them get a note in the problems
* `PropertiesPanel` also takes the `injector`
* `@jylups/cmmn-js` 0.24 as dependency (0.22 to 0.24 as peer)

* `FEAT`: filled icons in the side bar's rail, as Flowable Design's: the property groups, search, model hierarchy and collapse use Font Awesome Free solid glyphs (CC BY 4.0), each required on its own so that only these are bundled
* `DEPS`: `@fortawesome/free-solid-svg-icons` 6.7.2

* `FEAT`: read the attributes Flowable reads in two spellings ([jylups/cmmn-js-env#87](https://github.com/jylups/cmmn-js-env/issues/87)): auto complete and blocking also from `flowable:autoComplete` and `flowable:isBlocking`, writing the CMMN attribute instead; authorized roles of user event listeners as the comma list Flowable reads; on transaction of task and lifecycle listeners
* `DEPS`: `flowable-cmmn-moddle` 1.5.0, which types `onTransaction` on task listeners
* `FEAT`: a model hierarchy in the rail, under the search: the case plan model, its stages and plan items as a tree with their types; clicking one selects it on the canvas (`openHierarchy()`, `selectFromHierarchy(id)`) ([jylups/cmmn-js-env#68](https://github.com/jylups/cmmn-js-env/issues/68))
* `FEAT`: the look of Flowable Design's side bar: white panel, slate colors, the header titled with the element type and the open group (such as "Human Task - General"), bold section names, labels with their values below ([jylups/cmmn-js-env#67](https://github.com/jylups/cmmn-js-env/issues/67))
* `FEAT`: report in the problems what the Flowable engine rejects at deployment, as errors ([jylups/cmmn-js-env#86](https://github.com/jylups/cmmn-js-env/issues/86)): fields on a case page or external worker task, a max instance count of 0, a display order that is not a whole number, a script task without a script, an HTTP task without request method or URL, and more than one reactivate event listener
* `CHORE`: remove the fields of the Camunda version that Flowable does not read, and report them in the problems as notes when a model has them ([jylups/cmmn-js-env#85](https://github.com/jylups/cmmn-js-env/issues/85)): history time to live, follow-up date, the case, process and decision binding, version and tenant, decision result mapping and result variable, and repeat on standard event; an external script resource is reported too
* `FEAT`: configure Flowable's task types and timer listeners ([jylups/cmmn-js-env#84](https://github.com/jylups/cmmn-js-env/issues/84)): the script of script tasks, the request fields and handlers of HTTP tasks, the fields of mail tasks, the options of decision tasks (written as `flowable:field`, a value as string, an expression as expression), class fields of service tasks, input variables of script tasks, variables to and from external workers, and the timer expression and start trigger of timer event listeners
* `FIX`: the HTTP task's "Behavior Class" wrote `flowable:class`, which Flowable ignores; it now writes the field `httpActivityBehaviorClass`
* `FEAT`: job category (`flowable:jobCategory`) and multi-line name (`flowable:element-name`) of plan item definitions
* `DEPS`: `flowable-cmmn-moddle` 1.4.0, which types `flowable:jobCategory`
* `FEAT`: fields for the open-source engine attributes that had none ([jylups/cmmn-js-env#65](https://github.com/jylups/cmmn-js-env/issues/65)): owner, category, task ID and task completer variables and form field validation of human tasks; blocking of tasks; auto complete of stages and the case plan model; stage overview, author and lifecycle listeners of the case plan model; the key (externalRef) of the process or decision a task refers to; the text format of text annotations; variable aggregations of a repetition rule; and the item control of event listeners (required, repetition, completion neutral, parent completion, reactivation)
* `FEAT`: search the fields of the selected element by their label, from the "Search for a property" link or the magnifier in the rail, as in Flowable Design; results show the field's group and value, and their edit button opens the field in its group's pop-up (`openSearch()`, `search(term)`, `openSearchResult(index)`) ([jylups/cmmn-js-env#64](https://github.com/jylups/cmmn-js-env/issues/64))
* `FIX`: typing in a field could apply its change to no field when another delegated input handler ran in between
* `FEAT`: show each group's values read-only (`<not set>` when empty) with an edit button that opens the group's fields in a pop-up with Cancel and Finish, as Flowable Design does; Cancel takes the changes back. Groups can carry a `description` shown as help in the pop-up, and `editInline: true` keeps a group editable in place (listeners). Turn it off with `propertiesPanel: { editInDialog: false }` ([jylups/cmmn-js-env#63](https://github.com/jylups/cmmn-js-env/issues/63))
* `FEAT`: group the fields as Flowable Design does: General, Assignment, Variable Mapping, Event Registry, Control, Repetition, Advanced Form, Details, Advanced, Listeners, Reactivation, Definition and Extensions, with Flowable's sections inside them (Common, Form, Process, Execution, ...); the add item control action shows in each group of rules ([jylups/cmmn-js-env#62](https://github.com/jylups/cmmn-js-env/issues/62))
* `FEAT`: show the property groups as a vertical rail of icons on the left of the panel, in the style of Flowable Design, instead of tabs along the top; arrow keys move between groups, and the panel can be collapsed to its rail (`setCollapsed()`, `isCollapsed()`, `propertiesPanel.collapsed` event) ([jylups/cmmn-js-env#61](https://github.com/jylups/cmmn-js-env/issues/61))
* `FEAT`: tabs take an optional `icon` (SVG markup); tabs without one show the first letter of their label
* `CHORE`: drop the `scroll-tabs` dependency

## 2.1.1

* `CHORE`: accept `@jylups/cmmn-js` 0.23 as peer dependency too (`^0.22.0 || ^0.23.0`), and use `@jylups/cmmn-js@0.23.0` ([jylups/cmmn-js-env#57](https://github.com/jylups/cmmn-js-env/issues/57))

## 2.1.0

* `CHORE`: use `flowable-cmmn-moddle@1.3.0`, which has the case's `async` and the case plan model's `sameDeployment`
* `FEAT`: edit the case and its start form with the case plan model selected ([jylups/cmmn-js-env#54](https://github.com/jylups/cmmn-js-env/issues/54)): a Case group with asynchronous start, initiator variable and candidate starter users and groups, and a Start Form group with form key, form field validation and same deployment

## 2.0.0

* `CHORE`: require `@jylups/cmmn-js` 0.22 as peer dependency, and use `@jylups/cmmn-js@0.22.0` and `flowable-cmmn-moddle@1.2.0`
* `CHORE`: use `flowable-cmmn-moddle@1.2.0-next.9`
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
* The peer dependency is now `@jylups/cmmn-js` (`^0.22.0`) instead of `cmmn-js`, and the panel loads its helpers from `@jylups/cmmn-js/lib`. Applications that use `cmmn-js` from bpmn.io must switch to `@jylups/cmmn-js` 0.22, whose `problems` service the Problems group uses.

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
