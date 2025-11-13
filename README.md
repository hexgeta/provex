# ProveX - The Future of Disintermediation

A pure static HTML/CSS/JS website showcasing the MrProve token and PrivateProver technology.

## Features

- 100% offline capable - zero external dependencies
- Embedded Avenir fonts (Regular, Book, Heavy, Black)
- Animated particle background
- Smooth scroll animations
- Fully responsive design
- No build process required

## Structure

```
provex/
├── index.html          # Main HTML file with SEO metadata
├── styles.css          # Global CSS styles
├── script.js           # JavaScript for animations and interactions
└── public/
    ├── fonts/          # Avenir font family (TTF files)
    │   └── Avenir/
    │       ├── Avenir Regular/
    │       ├── Avenir Book/
    │       ├── Avenir Heavy/
    │       └── Avenir Black/
    ├── favicon.svg     # Site icon (SVG)
    ├── favicon.png     # PNG fallback icon
    └── opengraph-image.png  # Social media preview image
```

## SEO Features

- Comprehensive meta tags (title, description, keywords)
- Open Graph tags for Facebook/LinkedIn sharing
- Twitter Card tags for Twitter sharing
- Structured data (JSON-LD) for search engines
- Semantic HTML5 markup
- Accessible ARIA labels
- Fast-loading embedded fonts
- Mobile-responsive design

## Usage

Simply open `index.html` in any modern web browser. No server or build process required.

For local development:

```bash
# Option 1: Open directly
open index.html

# Option 2: Use a local server (recommended)
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Deployment

Upload the entire directory to any static hosting service:

- GitHub Pages
- Netlify
- Vercel
- Any web server

## License

All rights reserved.
