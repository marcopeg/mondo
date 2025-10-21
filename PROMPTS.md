# New Entity

focus on the Facts EntityLink for type=person. When clicking on "+" it should create a new fact note linked to the person (this works already). The note's file name should be "Untitled Fact". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Projects EntityLink for type=person. When clicking on "+" it should create a new `type=project` note linked to the person. The note's file name should be "Untitled Project". The note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the Projects EntityLink for type=person. When clicking on "+" on the Meetings, the new note (it already works) file name should be "{date} with {person's "show" or "filename" attribute}. Also, the file name should pre selected so that it's easy for the user to modify it by typing the new value.

focus on the Projects EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `crmState` that is a json document where different panels can edit and add their own keys. make it so the `crmState` key gets created at the first need if not available.

focus on the Tasks EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `crmState` that is a json document where different panels can edit and add their own keys. make it so the `crmState` key gets created at the first need if not available.

focus on the Facts EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `crmState` that is a json document where different panels can edit and add their own keys. make it so the `crmState` key gets created at the first need if not available.

focus on the Meetings EntityLink for type=person. When collapsing or expanding the panel, the state for this particular panel should be persisted in the note's frontmatter in a key named `crmState` that is a json document where different panels can edit and add their own keys. make it so the `crmState` key gets created at the first need if not available.

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

focus on the EntityLink that allows for drag and drop sorting; change the persist strategy so that they use the `crmState` frontmatter key as "{panel}.order".

focus on the EntityLink "projects" of the entity type "team". Fix the UI so that it matches in padding and spacing the UI of the "facts" block for the entity type "person".

focus on the EntityLink "meetings" of the entity type "team". When creating a new meeting, the new note's title should be "{date/time} with {team "show" or filename}". The default title should be "Untitled Person. The new note's file name content should be slected so that it's easy for the user to modify it by typing the new value.

focus on the EntityLink "tasks" of the entity type "person". right now the task title expands horizontally causing a scroll on small screens that makes it difficult to handle the drag and drop. fix the ui so that the task's title can break into multiple lines. keep each lines' content centered on vertical alignmenr.

focus on the EntityLink "tasks" across the various entities, fix the horizontal scrolling issue in the same way you did for the panel in the entity type=person, so that the task's title can break into multiple rows.

focus on any EntityLink panel that generate a list of items, i want to remove the padding around the list. the left/right borders of the list of item should touch the Card's body borders so to maximize the available space for rendering the contents.

focus on the Tasks EntityLink panel for type=task, it should be collapsed by default.
