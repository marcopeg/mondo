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
