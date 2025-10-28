# New Entity

focus on the Facts EntityLink for type=person. When clicking on "+" it should create a new fact note linked to the person (this works already). The note's file name should be "Untitled Fact". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Projects EntityLink for type=person. When clicking on "+" it should create a new `type=project` note linked to the person. The note's file name should be "Untitled Project". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Projects EntityLink for type=person. When clicking on "+" on the Meetings, the new note (it already works) file name should be "{date} with {person's "show" or "filename" attribute}. Also, the file name should pre selected so that it's easy for the user to modify it by typing the new value.

focus on the Projects EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `mondoState` that is a json document where different panels can edit and add their own keys. make it so the `mondoState` key gets created at the first need if not available.

focus on the Tasks EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `mondoState` that is a json document where different panels can edit and add their own keys. make it so the `mondoState` key gets created at the first need if not available.

focus on the Facts EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `mondoState` that is a json document where different panels can edit and add their own keys. make it so the `mondoState` key gets created at the first need if not available.

focus on the Meetings EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `mondoState` that is a json document where different panels can edit and add their own keys. make it so the `mondoState` key gets created at the first need if not available.

focus on the Facts EntityLink for type=project. When clicking on "+" it should create a new fact note linked to the person (this works already). The note's file name should be "Untitled Fact". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Meetings EntityLink for type=project. When clicking on "+" it should create a new meetings note linked to the person (this works already). The note's file name should be "{date} on {project's "show" or "filename" attribute}". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Facts EntityLink for type=task. When clicking on "+" it should create a new fact note linked to the task (this works already). The note's file name should be "Untitled Fact". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Tasks EntityLink for type=task. This panel should implement the same look as the Facts EntityLink. Fix the padding and spacing so to make it look consistent.

focus on the Tasks EntityLink for type=task. This panel should list sub-tasks. A sub-taks is a task that reference anothe task in the "task" property. Right now it looks like the linking is on "participants" but this is wrong and should be fixed. Make it also sure that when creating a new sub-task with "+" the link is made on the "task" property.

focus on the Tasks EntityLink for type=project. This panel should list a project's main tasks. A project task is a task that reference anothe task in the "project" property. Right now it looks like the linking is on "participants" but this is wrong and should be fixed. Make it also sure that when creating a new sub-task with "+" the link is made on the "project" property.

focus on the Fact EntityLink for type=fact. This panel should list a fact's sub-facts. A sub-fact is a fact that reference anothe fact in the "fact" property. Right now it looks like the linking is on "parent" but this is wrong and should be fixed. Make it also sure that when creating a new sub-fact with "+" the link is made on the "fact" property.

focus on the Facts EntityLink for type=fact. When clicking on "+" it should create a new fact note linked to the current fact (this works already). The note's file name should be "Untitled Fact". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Facts EntityLink for type=meeting. When clicking on "+" it should create a new fact note linked to the current meeging (this works already). The note's file name should be "Untitled Fact". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

add the EntityLink "Tasks" to the entity "meeting". it should list type=task entities linked to the meeting by the property "meeting". When creating a new entity "+", the default title should be "{date} for {atribute "show" or filename}. The new note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Facts EntityLink for type=company. When clicking on "+" it should create a new fact note linked to the current company (this works already). The note's file name should be "Untitled Fact". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

add the EntityLink "Tasks" to the entity "company". it should list type=task entities linked to the company by the property "company". When creating a new entity "+", the default title should be "Untitled Task. The new note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focs on the EntityLink "Teams" on the entity "company". This already lists the teams connected with the company. Add the button "+" to create a new team document (type=team). The default title should be "Untitled Team. The new note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focs on the EntityLink "Employees" on the entity "company". This already lists the persons connected with the company. Add the button "+" to create a new person document (type=person) linked to the company via "company" attribute. The default title should be "Untitled Person. The new note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the EntityLink that allows for drag and drop sorting; change the persist strategy so that they use the `mondoState` frontmatter key as "{panel}.order".

focus on the EntityLink "projects" of the entity type "team". Fix the UI so that it matches in padding and spacing the UI of the "facts" block for the entity type "person".

focus on the EntityLink "meetings" of the entity type "team". When creating a new meeting, the new note's title should be "{date/time} with {team "show" or filename}". The default title should be "Untitled Person. The new note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the EntityLink "tasks" of the entity type "person". right now the task title expands horizontally causing a scroll on small screens that makes it difficult to handle the drag and drop. fix the ui so that the task's title can break into multiple lines. keep each lines' content centered on vertical alignmenr.

focus on the EntityLink "tasks" across the various entities, fix the horizontal scrolling issue in the same way you did for the panel in the entity type=person, so that the task's title can break into multiple rows.

focus on any EntityLink panel that generate a list of items, i want to remove the padding around the list. the left/right borders of the list of item should touch the Card's body borders so to maximize the available space for rendering the contents.

focus on the Tasks EntityLink panel for type=task, it should be collapsed by default.

focus on all the EntityLink that exist in the project, those should be collapsed by default and should have no subtitle.

focus on the Teammates EntityLink on the entity "person". It should always be visible even if there are no items same for the other panels, and it should have the "+" button that generates a new document of type=person linked back to the team with title "Untitled Person". The new note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Teammates EntityLink on the entity "person". It should automatically hide if there is no "team" property in the document, or if it is null or empty.

focus on the dashboard, move the "create quick tasks" container into the title area of the QuickTasks list so that it is possible to quickly add tasks from there. Remove the "quick log entry" container - delete it completely from the repository".

Focus on the Quick Tasks list in the dashboard. It looks like the date that is associated with each entry is wrong. the date should be picked by the attribute "date" of the note, falling back into parsing the fileName that should already be in a date format.

Focus on the Dashboard, the Mondo Entities part. Discard the quick entity component and implement a tiles wall inspired by Windows' Cortana style: flat tiles with centered icons and text. Don't use the ui/Button. Implement a custom EntityTiles component inside the dashboard area so to link to each EntityTab. The tiles should be squared and on mobile i envision 2 tiles per row.

Focus on the /entities/index.ts - this file should export a configuration object that contains the entites list, but that has other information as well:

- tiles.order[]: should list the entites keys so that this order is implemented in the dashboard tiles.
- relevantNotes.filter.order[]: should list the entities keys so that this order is implemented in the list of type filters in the dashboard's Relevant Notes.

when creating a entity=log from the Entity Tab the title should follow the format "{date} {time}" and it should be pre-selected so that the user can confirm with "enter" or just edit to change it. the body should be empty.

Focus on the QuickTaks in the dashboard. when selecting the option "log" to turn a quick tast into a log note, the newly created note should inherith the log's date an time as both title and attributes.

---

This is the current configuration of a BacklinksPanel for listing the projects that are associated with a type=person:

```
{
    type: "backlinks",
    targetType: "project",
    properties: ["participants"],
    ...
}
```

Focus on how to find the related notes.
Right now we use the combo `targetType` and `properties` to find backlinks to the current note.

This works in most usecase where the backlink is direct (the target note links directly back in one of the `properties`).

But there are usecases in which the connection is **indirect** linke in backlinking the projects or teammates:

PROJECTS:

- any type=project with direct backlink to the note
- any type=project that backlinks to any of the listed "teams" through the team's property "project"

TEAMMATES:

- any type=person that has at least one of the current note's "team" in its attribute "team"

Those are 2 of the most complex usecases.

Devise a configuration structure that allows to define these and similar usecases.

Do not modify any code for now, write your proposal into the `docs/BACKLINKS_INDIRECT.md` file so that we can reason about it together.

---

Add another feature to this proposal. For the meetings, as an example, I need to be able to separate meetings with multiple people from 1o1 (meetings with one single person).

So in the queries dsl I'd need some level of constraints, or a filter AFTER the initial selection of candidate notes.

It could be another first-level parameter "filter".

So that "queries" is used to find notes, "filter" to reduce the selection, "sort" to define the sorting strategy..

example of filter needs:

- only notes where "participants.length" > 2
- only notes where "participants.length" = 1, and participants.[] = @this // @this is the reference to the same note same as we do in the create note templating system

Improve on the BACKLINKS_INDIRECT.md plan; do not write code outside of this document.

---

Rename the key "queries" into "find" so that we have:

- find: select notes
- filter: reduces selection
- sort: applies orders to the final selection

"find.query" is the current "queries" and should still be an array.

"find.combine" should be the current "combine" key (i see union). Make sure you thoroughly document what this does and the possible values.

Refine the plan document

---

Refactor the configuration of a backlink items as:

{
type: "backlinks",
desc: "Description useful to the developer but never visible in the app",
config: {
...rest of the configuration goes here so it is collapsible
}
}

IMPORTANT:

- no need to make it bacward compatible
- go through the existing entities and update the configuration.

---

focus on the #file:BacklinksLinks.tsx .

Refactor the key used to store the state of the backlinks panel in the mondoState object.

each backlinks item must define a "key" property (need to add it to the definition)

the template for the state key becomes then "backlinks:{key}"

NOTE: we need to assign keys to every current utilization of the backlings in the entities definition files.

---

refactor #file:role.ts links following the examples in #file:person.ts and #file:company.ts . add the following panels:

- Members (persons linked to the role)
- Projects (directly linked via "role" attribute)
- standard backlinks

---

refactor #file:location.ts links following the examples in:

- #file:person.ts
- #file:company.ts
- #file:role.ts

add the following panels:

- People (persons linked to the location, expanded by default)
- Companies (linked to the location, expanded by default)
- Teams (linked to the location, expanded by default)
- Gears (linked to the location, expanded by default)
- Restaurants (linked to the location, expanded by default)
- Projects (directly linked via "role" attribute)
- standard backlinks

---

Focus on the `/src/entities` folder that as of now exposes the full configuration for the Mondo.

I want to move the entire configuration into one single JSON file structured as:

```json
{
    "titles": {
        "order": [ ...entity types for the order of the tiles...],
    }
    "relevantNotes": {
        "filter": {
            "order": [[ ...entity types for the order of the filters...]]
        }
    },
    "entities": {
        "person": {
            "name": "People",
            "icon": "user",
            ...the other props of a type
        }
    }
}
```

This first step of refactoring should place one single `/src/mondo-config.json` that is read to setup the mondo at boot time.

You should convert all the current entites files into this single json.

Fix the logic so that the configuration is read from this file and not from the entities as it is now.

---

explain me what the mondo-configuration `entity.{key}.aliases` do and what is the consequence if we remove it

---

explain me what the mondo-configuration `entity.{key}.dashboard` do and what is the consequence if we remove it

---

add a new settings with the note picker to pick up a note to be used as source of the configuration for the mondo.

when this note is set, the frontmatter of such note takes over the hardcoded configuration.

the system must be able to validate it and prevent using it if it contains any error. every time the content of this file changes the system should re-validate and re-load the configuration.

in case of a bad configuration, a detailed error log should be created in the same folder as the config file with the filename following the template "YYMMDDhhmmss-mondo-config-error.md" to help the use fix the configuration issue.
