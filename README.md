# Mondo

_Mondo_ is a general purpose plugin that adds plentiful of utilities to a standard [Obsidian](https://obsidian.md/) vault:

- **🏚️ Dashboard:** vault overview and quick activities
- **🎤 Dictation:** talk to your note to write its content
- **📝 Transcription:** generate a transcription file out of any Obsidian recording
- **🔈 Voiceover:** transform your note into an audio file
- **🕰️ Timestamps:** quickly add timestamps into your notes
- **🤖 Open in ChatGPT:** use your notes as templates for ChatGPT prompts
- **👫 Mondo IMS:** typed entities with strong relations
- **📈 Habits Tracker:** embed a streak tracking app in any note
- **⏱️ Training Timers:** embed a training trimer app in any note
- **📆 Daily Notes:** quick and timestamped annotations
- **🖌️ Journaling:** distraction-free journaling experience

> I'm developing this plugin to facilitate my life 🤘

# How to Install & Update

ObsidianMondo is under active development so you would install it as a _Beta Tester_ at your own risk. But it's fine, I use it for myself first and it works, even if it needs a lot of love still!

1. First, install the [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) that lets you install orther plugins directly from GitHub.

2. Open the _BRAT_ plugin preferences and click on "Add beta plugin"

3. Paste the following url:

```bash
https://github.com/marcopeg/obsidian-mondo
```

> I suggest you keep it updated to the latest version, but at this point feel free to install whatever available release.

# 🏚️ Dashboard

Run the command `Open Mondo dashboard` to open your vault's control center:

- **Quick Tasks** let you create new task-notes on the fly by typing or dictating your thoughs.
- **Relevant Notes** let you find your notes by frequency of utilization or history. And you can filter by _Entity Type (see the CRM feature)_-
- **CRM Entities Wall** wall let you jump to the various entities lists. Think \_"Obsidian bases on steroid".
- **Stats** show some numbers about your valut and offer some file based views of your stuff. Not only notes, but also images, audio and generic attachments across the whole vault.

# 📈 Habits Tracker

Tracking my daily habits is an important part of my self development plan, and i wantet it to be fully included into my Obsidian workflow.

I heep a "Habits.md" note where I put all my tracking blocks.

The default visualization is the **last 21-days streak**:

![source](./images/habit-tracker-streak.png)

but you can switch to the **calendar view** to have a bird-eye view of your entire calendar year:

![source](./images/habit-tracker-calendar.png)

You can add a block as many `habits` blocks you want:

![source](./images/habit-tracker-source.png)

👉 Be careful configuring a unique `key` for each block because the data is stored in the note's _frontmatter_ under that key.

# ⏱️ Training Timers

![Timer - single](./images/timer-single.png)

![Timer - single](./images/timer-source.png)

# 📆 Daily Notes (to refine)

Daily notes help jotting down quick information.

`Shift+Cmd+l` opens the **Daily Note** and generates a time-based section where you can quickly annotate a new thought.

Notes in your daily are automatically organized by day/time blocks and default to bullet lists so to facilitate note refactoring later on.

# 🎤 Dictation

> This feature requires an [OpenAI API Key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)

Dictation lets you write your note's content with your voice, by sending a recording to OpenAI Whisper for transcription.

Use the command `Start dictation`, or press the microphone button to initiate a dictation session. The resulting transcription is inserted at your cursor's position.

# 📝 Transcription

> This feature requires an [OpenAI API Key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)

Use the command `Start transcription` when over an _audio note_ to start the transcription process.

Once done, a new note with the full transcription and a reference to the original audio will be created and opened for you.

# 🔈 Voiceover

> This feature requires an [OpenAI API Key](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)

Use the command `Start voiceover` on a text note to produce the relative audio file and reproduce it.

The file will be automatically referenced into the note's _frontmatter_.

> You can use the _Voiceover_ also on a text-selection!

# 🤖 Open in ChatGPT

Take any note or text selection and use the command `Send to ChatGPT` to open the famous AI tool with a pre-compiled prompt.

# 🕰️ Timestamps

Run the command `Insert timestamp` to inject a pre-configured date-time text in your note, where your cursor is.

You can configure the template in the Mondo's settings.

Here is an example of a Heading level 2 timestamp template:

```Markdown
## YY/MM/DD hh:mm
```

# 👫 Mondo IMS

Mondo ships a powerful _Information Management System_ in which you can define your own entities and their relations to bring to life your tailored ERP/CRM/CMS of sort.

![Mondo IMS](./images/ims.png)

👉 Use the **IMS Presets** to experiment with common and community-curated systems!

# 📝 Journal (to refine)

Dealing with the modern world and its crazy pace can crash your soul. **Journaling** is a simple yet effective way to keep your thoughts, emotions, and hidden convinctions under control.

Hit `Shift+Cmd+j` and write anything that is personal.

> Let yourself go.  
> Don't think.  
> Just write.
