# ⏱️ How to Add and Configure Timers

This guide walks you through embedding Mondo's interactive timer blocks inside an Obsidian note. Start with a minimal timer, customize it with titles and colors, and finish with a full training plan featuring multi-step loops, audio cues, and reusable templates.

> **Prerequisites**
>
> * Mondo is installed and enabled inside Obsidian.
> * Your note is in a vault where the plugin can render Markdown code blocks.

## 1. Insert the Minimal Timer

1. Create or open any Markdown note.
2. Add a fenced code block that declares the `mondo` language and the `timer` block identifier.

````markdown
```mondo
timer
```
````

By default the timer runs a single work phase for **25 minutes** followed by a **5 minute** rest, looping forever. Click the play button to start; the loop counter updates as phases complete.

## 2. Set Explicit Work and Rest Durations

Control the work (`duration`) and rest (`interval`) phases by passing query parameters after `timer`. Both values are expressed in **seconds**:

````markdown
```mondo
timer?duration=10&interval=5
```
````

* `duration` is the work phase in seconds (here, 10 seconds).
* `interval` is the rest phase in seconds.

## 3. Add a Title, Color, and Loop Limit

Enhance the UI by setting optional props.

````markdown
```mondo
timer?duration=10&interval=5&title=Deep%20Work&color=#55aaff&loop=3
```
````

* `title` appears above the timer and should be URL encoded in query strings.
* `color` accepts any CSS color (`#RRGGBB`, `hsl()`, named colors) and tints the progress ring and buttons.
* `loop` caps how many times the timer repeats. Use `loop=false` to stop after one work/rest cycle or omit it for infinite loops. (Defaults to `true` so infinite repetition)

## 4. Combine Query Parameters with YAML

When the configuration grows, move structured settings into the body of the code block using YAML. Both syntax work and are equivalent.

````markdown
```mondo
timer?color=tomato
loop: 3
interval: 180
duration: 900
title: Focus Sprint
step: 60
heptic: audio
```
````

* Lines inside the block are parsed as YAML key/value pairs.
* `step` adds a soft cue every N seconds during work
* `heptic` controls audio/vibration feedback (`audio`, `vibration`, `both`, or `none`).

## 5. Upgrade to a Multi-Step Plan

Switch the identifier to `time-plan` to orchestrate a sequence of steps with individual rest periods.

````markdown
```mondo
time-plan?loop=2&color=#4078FF
title: Morning Gym
steps:
  - title: Warmup
    duration: 300   # 5 min work
    pause: 60       # 1 min rest
  - title: Strength Circuit
    duration: 900
    pause: 180
  - title: Cooldown
    duration: 300
    rest: 0
```
````

Each entry under `steps` represents a work phase:

* `title` names the phase displayed inside the timer.
* `duration` (or `time`) sets the work length in seconds and must be greater than zero.
* `pause` or `rest` defines the recovery break after the phase.

The timer cycles through each step, follows the configured rests, and repeats the entire plan twice because `loop=2`.

## 6. Reference Templates in Note Frontmatter

Create reusable plans by storing timer definitions in frontmatter and referencing them with the `{{mondo}}` templating syntax or by copying YAML snippets. Example frontmatter:

```yaml
---
type: workout
mondo:
  timers:
    - id: morning-gym
      title: Morning Gym
      color: "#4078FF"
      steps:
        - { title: Warmup, duration: 300, pause: 60 }
        - { title: Strength Circuit, duration: 900, pause: 180 }
        - { title: Cooldown, duration: 300, rest: 0 }
---
```

Inside the note body you can insert:

````markdown
```mondo
time-plan
title: {{mondo.timers.morning-gym.title}}
color: {{mondo.timers.morning-gym.color}}
steps: {{mondo.timers.morning-gym.steps}}
```
````

Mondo resolves the template variables before rendering, letting you maintain the canonical configuration in frontmatter while keeping the body concise.

## 7. Advanced Options Checklist

| Option | Applies to | Description |
| ------ | ---------- | ----------- |
| `loop` | `timer`, `time-plan` | `false` stops after one pass, a number repeats N times, omit for infinite. |
| `heptic` | Both | `audio`, `vibration`, `both` (default), or `none` for feedback control. |
| `step` | Both | Interval (seconds) for work-phase cadence beeps; set `0` to disable. |
| `nextTitle` | `timer` | Override the "rest" label shown between loops. |
| `color` | Both | Custom accent color for the ring, progress track, and buttons. |
| `mute` | Both | Set to `true` to silence all audio cues while keeping vibration (if allowed). |

> For a full parameter reference and behavioral details, see [`docs/TIMER.md`](../docs/TIMER.md).

## 8. Troubleshooting

* **Timer will not start:** Ensure `duration` > 0 for `timer` blocks and that the first `time-plan` step specifies a positive `duration`/`time` value.
* **No sound or vibration:** Desktop browsers may require an initial click. Confirm `heptic` isn’t `none`, device sound is enabled, and permissions allow vibration.
* **Template values render literally:** Check that the frontmatter keys match the template path (`{{mondo.timers...}}`). Re-open the note to force a re-render if you just updated frontmatter.
* **Color looks muted:** The UI blends your color with the current theme. Choose a brighter shade or provide a valid hex code.

## 9. Next Steps

* Duplicate and adapt the YAML snippets for different routines (study, workouts, meetings).
* Pair timers with related notes using standard Obsidian links or Mondo entity templates.
* Explore automation by combining timers with Mondo commands or quick-add workflows.

You now have everything needed to embed timers that range from one-off focus sessions to fully scripted training plans.
