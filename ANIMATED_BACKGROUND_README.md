# 🎨 Animated Background Feature

## Quick Start

### Turn ON/OFF

Go to `config/ui.ts` and change:

```typescript
ANIMATED_BACKGROUND_ENABLED: true; // ON
ANIMATED_BACKGROUND_ENABLED: false; // OFF
```

That's it! No other changes needed.

## Customization

In `config/ui.ts`, you can adjust:

```typescript
ANIMATED_BACKGROUND_COLOR: "#2D82F3"; // Change color (any hex color)
ANIMATED_BACKGROUND_DOT_SIZE: 2; // Dot size (1-5 recommended)
ANIMATED_BACKGROUND_SPACING: 30; // Space between dots (20-50)
ANIMATED_BACKGROUND_SPEED: 0.0005; // Animation speed (0.0001-0.001)
```

## Examples

**Subtle effect:**

```typescript
ANIMATED_BACKGROUND_DOT_SIZE: 1;
ANIMATED_BACKGROUND_SPACING: 40;
ANIMATED_BACKGROUND_SPEED: 0.0003;
```

**Bold effect:**

```typescript
ANIMATED_BACKGROUND_DOT_SIZE: 3;
ANIMATED_BACKGROUND_SPACING: 25;
ANIMATED_BACKGROUND_SPEED: 0.0008;
```

**Different color (purple):**

```typescript
ANIMATED_BACKGROUND_COLOR: "#A855F7";
```

## How It Works

- **Canvas-based**: Uses HTML5 Canvas for smooth performance
- **Wave animation**: Dots move in sine/cosine wave patterns
- **Auto-responsive**: Adjusts to window size automatically
- **Non-intrusive**: Sits behind all content (z-index: 0)
- **Optimized**: Uses requestAnimationFrame for 60fps

## Files

- `components/ui/AnimatedBackground.tsx` - Main component
- `config/ui.ts` - Configuration (toggle & customize here)
- `app/layout.tsx` - Integration point
