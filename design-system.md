# AutoApply Design System — Neon Cyberpunk

## Fonts
```
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Space+Grotesk:wght@300;500;700&display=swap');
```
- Body / text: `'Space Grotesk', sans-serif`
- Labels, badges, monospace: `'JetBrains Mono', monospace`

## Colors
```css
--bg: #05030a;                          /* Page background */
--surface: #0c0914;                     /* Cards / panels */
--surface-accent: #161224;              /* Hover state / gap fills */
--cyan: #00ffff;                        /* Primary accent */
--magenta: #ff00ff;                     /* Secondary accent */
--yellow: #ffff00;                      /* Warning / relance */
--red: #ff3131;                         /* Error / refusé */
--text-main: #e0e0e0;                   /* Body text */
--text-dim: #888;                       /* Secondary text / labels */
--border: rgba(0, 255, 255, 0.2);       /* Default border (cyan tint) */
--border-magenta: rgba(255, 0, 255, 0.2);
--glow-cyan: 0 0 10px rgba(0, 255, 255, 0.4);
--glow-magenta: 0 0 10px rgba(255, 0, 255, 0.4);
```

## Background pattern
```css
background-color: #05030a;
background-image:
    radial-gradient(circle at 50% 50%, #1a0b2e 0%, transparent 80%),
    linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
    linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
background-size: 100% 100%, 100% 2px, 3px 100%;
```

## Scanline animation
```css
@keyframes scan { from { top: -100%; } to { top: 100%; } }
.scanline {
    position: fixed; top: 0; left: 0;
    width: 100%; height: 100px;
    background: linear-gradient(0deg, rgba(0, 255, 255, 0.05) 0%, transparent 100%);
    pointer-events: none; z-index: 100;
    animation: scan 8s linear infinite;
}
```

## Cards / Panels
```css
/* Standard surface panel */
.section-box {
    background: #0c0914;
    border: 1px solid rgba(0, 255, 255, 0.2);
    padding: 30px;
    position: relative;
}

/* Floating label on top of border */
.section-label {
    position: absolute; top: -10px; left: 20px;
    background: #05030a; padding: 0 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem; color: #00ffff; text-transform: uppercase;
}

/* Stat card with corner accent */
.stat-card {
    background: #0c0914;
    border: 1px solid rgba(0, 255, 255, 0.2);
    padding: 24px;
    position: relative; overflow: hidden;
}
.stat-card::after {
    content: ""; position: absolute; top: 0; right: 0;
    width: 10px; height: 10px;
    background: #00ffff;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
}
/* Magenta variant: */
.stat-card.magenta { border-color: rgba(255, 0, 255, 0.2); }
.stat-card.magenta::after { background: #ff00ff; }
```

## Typography
```css
/* Section label / metadata */
.label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem; color: #888;
    text-transform: uppercase; letter-spacing: 0.1em;
}

/* Large stat number */
.stat-value { font-size: 2.5rem; font-weight: 800; color: #fff; line-height: 1; }

/* Page title */
.title {
    font-size: 1.8rem; font-weight: 800;
    text-transform: uppercase; letter-spacing: -1px;
}

/* Cyan heading */
.title-cyan {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem; letter-spacing: 4px;
    color: #00ffff; text-transform: uppercase;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
}
```

## Status Badges
```css
.badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem; font-weight: 800;
    text-transform: uppercase; padding: 4px 10px;
    border: 1px solid; width: fit-content;
}
.badge.en-cours  { color: #00ffff;  border-color: #00ffff;  box-shadow: inset 0 0 5px rgba(0,255,255,0.2); }
.badge.relance   { color: #ffff00;  border-color: #ffff00;  box-shadow: inset 0 0 5px rgba(255,255,0,0.2); }
.badge.refuse    { color: #ff3131;  border-color: #ff3131;  box-shadow: inset 0 0 5px rgba(255,49,49,0.2); }
.badge.postule   { color: #ff00ff;  border-color: #ff00ff;  box-shadow: inset 0 0 5px rgba(255,0,255,0.2); }
.badge.accepte   { color: #00ff88;  border-color: #00ff88;  box-shadow: inset 0 0 5px rgba(0,255,136,0.2); }
```

## List / Table rows
```css
.list-container { display: flex; flex-direction: column; gap: 1px; background: #161224; }
.list-item {
    display: grid; grid-template-columns: 1.2fr 1.5fr 1fr;
    align-items: center; padding: 16px;
    background: #0c0914;
    transition: all 0.2s ease;
}
.list-item:hover { background: #161224; padding-left: 20px; }
.comp-name { font-weight: 700; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 0.5px; }
.job-title  { color: #888; font-size: 0.85rem; }
```

## Progress bar
```css
.progress-track {
    height: 12px; background: #161224;
    border: 1px solid rgba(0, 255, 255, 0.2);
    position: relative; overflow: hidden;
}
.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, transparent, #00ffff);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
    position: relative;
}
.progress-fill::after {
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 12px);
}
```

## Buttons
```css
/* Primary — cyan ghost */
.btn-primary {
    background: transparent;
    color: #00ffff; border: 1px solid #00ffff;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 2px;
    padding: 12px 24px; cursor: pointer;
    box-shadow: inset 0 0 20px rgba(0,255,255,0.05), 0 0 15px rgba(0,255,255,0.1);
    transition: all 0.2s;
}
.btn-primary:hover { background: rgba(0, 255, 255, 0.1); }

/* Destructive / danger */
.btn-danger {
    background: transparent;
    color: #ff3131; border: 1px solid #ff3131;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 2px;
    padding: 12px 24px; cursor: pointer;
    box-shadow: inset 0 0 20px rgba(255,49,49,0.05), 0 0 15px rgba(255,49,49,0.1);
    transition: all 0.2s;
}
.btn-danger:hover { background: rgba(255, 49, 49, 0.1); }
```

## Header / Nav pattern
```css
.header {
    margin-bottom: 32px;
    border-left: 4px solid #00ffff;
    padding-left: 16px;
    display: flex; justify-content: space-between; align-items: flex-end;
}
```

## Corner decorations
```css
.corner-deco { position: absolute; width: 20px; height: 20px; pointer-events: none; }
.top-right    { top: 0; right: 0;   border-top: 1px solid #ff00ff; border-right: 1px solid #ff00ff; }
.bottom-left  { bottom: 0; left: 0; border-bottom: 1px solid #ff00ff; border-left: 1px solid #ff00ff; }
```

## Modal overlay pattern
```css
.modal-overlay {
    position: fixed; inset: 0;
    background: rgba(5, 3, 10, 0.85);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
}
.modal {
    background: #0c0914;
    border: 1px solid rgba(0, 255, 255, 0.2);
    padding: 32px; max-width: 600px; width: 100%;
    position: relative;
}
```

## Form inputs
```css
input, select, textarea {
    background: #161224;
    border: 1px solid rgba(0, 255, 255, 0.2);
    color: #e0e0e0;
    font-family: 'Space Grotesk', sans-serif;
    padding: 10px 14px;
    font-size: 0.9rem;
    outline: none;
    width: 100%;
    transition: border-color 0.2s;
}
input:focus, select:focus, textarea:focus {
    border-color: #00ffff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.1);
}
input::placeholder { color: #555; }
label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem; color: #888;
    text-transform: uppercase; letter-spacing: 0.1em;
    display: block; margin-bottom: 6px;
}
```
