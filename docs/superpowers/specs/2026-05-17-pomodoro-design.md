# Desktop Pomodoro Timer - Design Spec

## Tech Stack
- **Runtime**: Electron (vanilla, no framework)
- **UI**: Pure HTML + CSS + JavaScript
- **Notifications**: Electron Notification API + HTML5 Audio

## Project Structure

```
pomodoro/
├── main.js          # Electron main process
├── preload.js       # Preload script for secure IPC
├── renderer/
│   ├── index.html   # Main UI
│   ├── style.css    # Modern card-style glassmorphism theme
│   └── app.js       # Timer logic and UI controller
├── assets/
│   └── bell.mp3     # Notification sound
└── package.json
```

## UI Layout

Single-page application with these zones:
- **Circular progress ring** (SVG circle, fills as time elapses)
- **Timer digits** (large bold MM:SS display)
- **Phase label** (工作中 / 休息中 / 长休息)
- **Control buttons** (Start / Pause / Reset)
- **Settings panel** (slide-out overlay triggered by ⚙ button)

### Color Scheme
- Work phase: warm red/orange gradient
- Break phase: cool blue/green gradient
- Cards: frosted glass effect (backdrop-filter: blur)

## State Machine

```
Idle → Working → Break → Working → ... (auto-cycle)
Any state → Paused (on pause button)
Any state → Idle (on reset)
```

- Every 4 pomodoros → long break (default 15 min)
- State transitions trigger desktop notification + sound

## Timer Configuration

| Setting | Default | Range |
|---------|---------|-------|
| Work duration | 25 min | 1-60 |
| Short break | 5 min | 1-30 |
| Long break | 15 min | 1-60 |
| Pomodoros before long break | 4 | 2-10 |

Settings persisted via `localStorage`.

## Notifications
- Desktop Notification API: "工作完成！该休息了" / "休息结束，继续工作"
- Sound: `bell.mp3` played via HTML5 Audio element
- Different sounds for work-end vs break-end

## Implementation Notes
- Timer runs in renderer process using `setInterval` with 1s ticks
- Progress ring uses SVG `stroke-dasharray` / `stroke-dashoffset` animation
- Phase auto-transition: work ends → auto-start break → auto-start next work
- `localStorage` for settings persistence
- No external dependencies beyond Electron itself
