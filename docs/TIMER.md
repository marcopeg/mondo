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

### Multi‑step Time Plan (YAML array)

```

```crm
time-plan
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

- Each item is a step: `title`, `duration` (or `time`) and an optional `pause` (or `rest`).
- The UI will show the current step title; during rest it shows "rest" and, if available, the next step title.

### Combine inline query + YAML

```

```crm
time-plan?title=Morning%20Plan&loop=2
- title: Sprint
  time: 1200
  rest: 120
- title: Review
  duration: 600
  pause: 0
```

```

- Inline query sets block-level options (`title`, `loop`).
- YAML array defines steps.

## All options

You can pass these as inline query parameters (e.g., `timer?duration=25`) or as key/value lines in the YAML body. For `time-plan`, steps are provided as a YAML array.

- `title` (string): Displayed title above the timer. Defaults to `"time plan"` for `time-plan` and `"work"` for `timer`.
- `color` (string): Any CSS color (e.g., `#55aaff`, `hsl(210, 90%, 56%)`). Tints the ring and accents.
- `duration` (number, seconds): Work duration for `timer` mode. Ignored per-step in `time-plan`.
- `interval` (number, seconds): Rest duration for `timer` mode. In `time-plan`, rest is per-step via `pause`/`rest`.
- `step` (number, seconds): Optional cadence for short beeps during work (ignored in the final 3 seconds of a phase). Set to `0` or omit to disable.
- `loop` (string | number): Controls repeating behavior after a cycle completes.
  - Omit, `""`, or `"true"` → infinite looping
  - `"false"` → no looping (stop at the end)
  - numeric string (e.g., `"3"`) → finite number of loops
- `heptic` (string): Feedback mode for audio/vibration cues.
  - `"audio"` | `"vibration"` | `"both"` (default: `"audio"`)

### `time-plan` steps

Provide an array of objects in YAML. Each step supports:

- `title` (string)
- `duration` or `time` (number, seconds) — required, must be > 0
- `pause` or `rest` (number, seconds) — optional rest after the step

Example:

```

- title: Pomodoro 1
  duration: 1500
  pause: 300
- title: Pomodoro 2
  time: 1500
  rest: 300

```

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
- No audio: Some platforms block auto‑play. Interact with the page first (click start) and ensure `heptic` includes `audio`.
- No vibration: Desktop browsers may not support `navigator.vibrate`. Use `heptic=audio` or `heptic=both` for audio feedback.
- Screen turning off: Wake Lock is best‑effort and may not be available on your platform.

## Tips

- Use `color` to differentiate timers visually.
- For smooth pacing, try `step=60` to get a short cue every minute during work.
- In `time-plan`, omit `pause` to immediately progress to the next step without a rest.
```
