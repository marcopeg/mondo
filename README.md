# obsidian-crm

Personal CRM as Obsidian Plugin, provides visualization and navigation facilities that enable fast notes taking on a known set of entities, enabling scenarios like people management.

> I'm developing it with the goal of making my Engineering Manager experience meaningful.

# 👩‍💻 CRM

Add the attribute `type` to any note in your vault to enable the strong typing and implicit relationships.

## Types

### fact

A _Fact_ represents a minimal unit of information in your system.
Usually a _Fact_ adds context to some other type of note, to which are linked.

This is an example of a _Fact_ that is related to a _Company_.

```frontmatter
type: fact
company:
  - [[CocaCola]]
```

### task

### person

### role

### team

### company

### meeting

# 📆 Daily Notes

Daily notes help jotting down quick information.

`Shift+Cmd+l` opens the **Daily Note** and generates a time-based section where you can quickly annotate a new thought.

Notes in your daily are automatically organized by day/time blocks and default to bullet lists so to facilitate note refactoring later on.

# 📝 Journal

Dealing with the modern world and its crazy pace can crash your soul. **Journaling** is a simple yet effective way to keep your thoughts, emotions, and hidden convinctions under control.

Hit `Shift+Cmd+j` and write anything that is personal.

> Let yourself go.  
> Don't think.  
> Just write.

# How to Install & Update

ObsidianCRM is under active development so you would install it as a _Beta Tester_ at your own risk. But it's fine, I use it for myself first and it works, even if it needs a lot of love still!

1. First, install the [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) that lets you install orther plugins directly from GitHub.

2. Open the BRAT plugin preferences and click on "Add beta plugin"

3. Paste the following url:

```bash
https://github.com/marcopeg/obsidian-crm
```

I suggest you keep it updated to the latest version, but at this point feel free to install whatever available release.
