# ⏱️ How to Add and Configure Timers

This guide walks you through embedding Mondo's interactive timer blocks inside an Obsidian note. Start with a minimal timer, customize it with titles and colors, and finish with a full training plan featuring multi-step loops, audio cues, and reusable templates.

**Prerequisites:**
* Mondo is installed and enabled inside Obsidian.
* Your note is in a vault where the plugin can render Markdown code blocks.

## 1. Insert the Minimal Timer

1. Create or open any Markdown note.
2. Add a fenced code block that declares the `mondo` language and the `timer` block identifier.

````markdown
```mondo
timer
```
````

By default the minimal `timer` block runs a single work phase for **25 minutes** followed by a **5 minute** rest - [classic Pomodoro](https://en.wikipedia.org/wiki/Pomodoro_Technique), and then stops. 

Click the play button to start.

## 2. Set Explicit Work and Rest Durations

Control the work (`duration`) and rest (`rest`) phases by passing query parameters after `timer`. Both values are expressed in **seconds**:

````markdown
```mondo
timer?duration=10&rest=5
```
````

* `duration` is the work phase, here 10 seconds.
* `rest` is the recovery phase, here 5 seconds.

## 3. Add a Title, Color, and Loop Limit

Enhance the UI by setting optional props.

````markdown
```mondo
timer?duration=10&rest=5&title=Deep%20Work&color=#55aaff&loop=3
```
````

* `title` appears above the timer and should be URL encoded in query strings.
* `color` accepts any CSS color (`#RRGGBB`, `hsl()`, named colors) and tints the progress ring and buttons.
* `loop` caps how many times the timer repeats.

> By default `loop` is disable. Use `loop=true` for infinite repetition.

## 4. Combine Query Parameters with YAML

When the configuration grows, move structured settings into the body of the code block using YAML. Both syntax work and are equivalent.

````markdown
```mondo
timer?color=tomato
title: Focus Sprint
loop: 3
duration: 900
rest: 180
step: 60
heptic: audio
```
````

* `step` adds a soft cue every N seconds during work
* `heptic` controls audio/vibration feedback (`audio`, `vibration`, `both`, defaults to `none`).

## 5. Upgrade to a Multi-Step Plan

Switch the identifier to `time-plan` to orchestrate a sequence of steps with individual rest periods.

````markdown
```mondo
time-plan
title: Morning Gym
color: #4078FF
loop: 2
step: 10
heptic: both
steps:
  - title: Warmup
    duration: 300   # 5 min work
    rest: 60        # 1 min rest
  - title: Strength Circuit
    duration: 900
    rest: 180
  - title: Cooldown
    duration: 300
    rest: 0
```
````

Each entry under `steps` represents a work phase:

* `title` names the phase displayed inside the timer.
* `duration` sets the work length in seconds and must be greater than zero.
* `rest` defines the recovery break after the phase.

The timer cycles through each step, follows the configured rests, and repeats the entire plan twice because `loop=2`.
