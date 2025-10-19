# Timer and Time Plan Blocks

This plugin provides two code blocks you can embed in notes to run focused timers:

- `timer`: a simple focus/rest timer
- `time-plan`: a multi-step plan (work steps with optional per-step rests)

Both render the same UI component and accept similar props. You can pass props via inline query params (after `?`) and/or YAML body.

> Tip: You can also set a custom accent color for the circle via `color`.

## Quick examples

### Simple Focus Timer (work + rest)

````
```crm
timer?duration=25&interval=5
````

```

- Starts a 25-minute work session.
- If `interval` > 0, switches to rest for that many seconds after work ends.
- Loops depend on the `loop` option (see Looping below).

### Simple timer with custom title and color

```

```crm
timer?duration=20&interval=0&title=Deep%20Work&color=#55aaff
```

```

### Timer with sound + vibration cues

```

```crm
timer?duration=15&interval=5&heptic=both
```

```

- Plays a chime when you start, a cue when it is time to rest, and minute beeps if `step` is configured.
- `heptic=both` enables tones and vibrations (where supported) and is the default. Use `heptic=sound` to play tones without vibration.

### Multi‑step Time Plan

```

```crm
time-plan
title: Gym Session
steps:
  - title: Warmup
    duration: 300   # 5 min work
    pause: 60       # 1 min rest
  - title: Focus Block 1
    duration: 1500  # 25 min work
    pause: 300      # 5 min rest
  - title: Focus Block 2
    duration: 1500
    pause: 0
```

```

- `title`: The overall plan title (e.g., "Gym Session")
- `steps`: An array of steps, each with:
  - `title` (string): Step name
  - `duration` or `time` (number, seconds): Work duration
  - `pause` or `rest` (number, seconds, optional): Rest after the step
- The UI shows the current step title; during rest it shows "rest" and the next step title.

### Combine inline query + YAML

```

```crm
time-plan?loop=2&color=#55aaff
title: Morning Plan
steps:
  - title: Sprint
    time: 1200
    rest: 120
  - title: Review
    duration: 600
    pause: 0
```

````

- Inline query sets block-level options (`loop`, `color`).
- YAML body defines the plan title and steps array.

## All options

You can pass these as inline query parameters (e.g., `timer?duration=25`) or as key/value lines in the YAML body. For `time-plan`, define `steps` as a YAML array.

- `title` (string): Displayed title above the timer. For `time-plan`, this is the overall plan title (e.g., "Gym Session"). Defaults to `"time plan"` for `time-plan` and `"work"` for `timer`.
- `color` (string): Any CSS color (e.g., `#55aaff`, `hsl(210, 90%, 56%)`). Tints the ring and accents.
- `duration` (number, seconds): Work duration for `timer` mode. Ignored for `time-plan` (use per-step durations instead).
- `interval` (number, seconds): Rest duration for `timer` mode. In `time-plan`, rest is per-step via `pause`/`rest`.
- `step` (number, seconds): Optional cadence for short beeps during work (ignored in the final 3 seconds of a phase). Defaults to `10`. Set to `0` to disable.
- `loop` (string | number): Controls repeating behavior after a cycle completes.
  - Omit, `""`, or `"true"` → infinite looping
  - `"false"` → no looping (stop at the end)
  - numeric string (e.g., `"3"`) → finite number of loops
- `heptic` (string): Feedback mode for audio/vibration cues (default: `"both"`).
  - `"audio"` (alias: `"sound"`) — play tones only
  - `"vibration"` — vibration only (if supported by the device)
  - `"both"` — play tones and vibrate (default)
  - `"none"` — disable all audio and vibration cues

### `time-plan` steps

For `time-plan` blocks, provide a `steps` array in YAML. Each step supports:

- `title` (string): Name of the step
- `duration` or `time` (number, seconds) — required, must be > 0
- `pause` or `rest` (number, seconds) — optional rest after the step

Example:

```yaml
title: Training Session
steps:
  - title: Pomodoro 1
    duration: 1500
    pause: 300
  - title: Pomodoro 2
    time: 1500
    rest: 300
````

## Behavior details

### Labels

- While working: shows the step title (or "go" in simple timer).
- While resting: shows `"rest"` and, for `time-plan`, the next step title.

### Progress ring

- `progress` counts down from 1 → 0 for the current phase.

### Countdown and elapsed

- The large value shows remaining time for the current/next work phase when idle. While running it shows the current phase’s remaining time.
- Below, when running, a chronograph shows total accumulated work time across the session (hours:minutes:seconds.milliseconds).

### Audio/vibration cues

- Final 3 seconds of any phase: short beep once per second.
- Optional step cadence (`step`): short beep every N seconds during work, muted during the final 3 seconds.
- On transition to rest: a rest cue.
- On step change or loop restart: a chime.

### Looping

- `loop=false`: stop at the end of the final phase/step.
- `loop=true` or omitted: continue indefinitely.
- `loop=N` (e.g., 3): repeat N times. A loop increments after finishing a full work cycle (in `time-plan`, it’s after the last step’s rest or end; in simple timer, after work+rest).

## Troubleshooting

- The button is disabled: Ensure `duration` is > 0 (for `timer`) or your first plan step has `duration` > 0.
- No audio: Make sure your device isn’t muted. Mobile browsers may require an initial tap before sounds are allowed, but the timer automatically resumes audio playback once you start it. Confirm `heptic` is not `none` and is set to `audio`, `sound`, or `both`.
- No vibration: Desktop browsers may not support `navigator.vibrate`. Use `heptic=audio` or `heptic=both` for audio feedback, and avoid `heptic=none`.
- Screen turning off: Wake Lock is best‑effort and may not be available on your platform.

## Tips

- Use `color` to differentiate timers visually.
- For smooth pacing, try `step=60` to get a short cue every minute during work.
- In `time-plan`, omit `pause` to immediately progress to the next step without a rest.

```

```
