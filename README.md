# Langsplain

[![Test](https://github.com/adamwesterby/langsplain/actions/workflows/tests.yml/badge.svg)](https://github.com/adamwesterby/langsplain/actions/workflows/tests.yml)

An interactive educational web application that explains how modern decoder-only transformer LLMs work, with visual diagrams and hands-on demos.

## Features

- **Three Learning Sections**: Architecture, Training, and Inference tabs in Home view
- **Section Diagrams**: Clickable diagrams with beginner + technical explanations
- **Guided Tour**: Step-by-step walkthrough across all three sections
- **Architecture Demos**: Attention, MOE routing, and token flow animation
- **Training Demos**: Gradient descent playground and loss/perplexity learning loop
- **Inference Demos**: Sampling controls, KV cache simulation, autoregressive generation loop
- **Glossary**: Searchable reference of key terms
- **Responsive Design**: Works on desktop, tablet, and mobile

## Quick Start

### Option 1: Local Server (Recommended)

Since the app uses ES6 modules, you'll need a local server:

```bash
# Using Python 3
cd langsplain
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

### Option 2: VS Code Live Server

If you use VS Code, install the "Live Server" extension and click "Go Live" in the status bar.

## Automated Testing

Install test dependencies once:

```bash
npm install
```

Run all tests:

```bash
npm test
```

Run only unit/DOM tests (Vitest):

```bash
npm run test:unit
```

Run only browser smoke tests (Playwright):

```bash
npm run test:e2e
```

Test strategy:
- **Unit/DOM tests** (Vitest + jsdom): deterministic logic and UI controller behavior (`math-utils`, `tokenizer`, section switching).
- **E2E smoke tests** (Playwright, Chromium): high-value user flows (navigation, section switching, demos/modals, guided tour, mobile viewport).

## Project Structure

```
langsplain/
├── .github/workflows/tests.yml # CI test workflow
├── index.html          # Main HTML structure
├── style.css           # All styles (dark mode, responsive)
├── app.js              # Main app logic + section state management
├── package.json        # Test scripts and dev dependencies
├── playwright.config.js # Playwright smoke test config
├── vitest.config.js    # Vitest unit/DOM test config
├── modules/
│   ├── diagram.js      # Architecture diagram with D3.js
│   ├── training-diagram.js   # Training loop diagram
│   ├── inference-diagram.js  # Inference pipeline diagram
│   ├── section-switcher.js   # Section tabs behavior
│   ├── attention-demo.js   # Attention visualization
│   ├── moe-demo.js     # MOE routing simulation
│   ├── gradient-demo.js    # Gradient descent visualization
│   ├── loss-demo.js        # Loss/perplexity training visualization
│   ├── sampling-demo.js    # Sampling strategies visualization
│   ├── kv-cache-demo.js    # KV cache visualization
│   ├── generation-demo.js  # Autoregressive decode visualization
│   ├── tour.js         # Guided tour system
│   ├── tokenizer.js    # BPE-style tokenization
│   └── math-utils.js   # Softmax, matrix operations
├── tests/
│   ├── unit/           # Unit tests for deterministic logic
│   ├── dom/            # DOM tests for section state/ARIA
│   └── e2e/            # Playwright smoke tests
└── README.md
```

## Technology

- **Pure Vanilla JS** with ES6 modules
- **D3.js v7** for SVG diagram and data visualization
- **Anime.js** for smooth animations
- **No build step required** - just static files

## How It Works

### Toy Model Specifications

The demos use a simplified transformer for visualization:

- Embedding dimension: 64 (real models use 4096-8192)
- Attention heads: 4 per layer
- Layers: 3 (real models have 32-96)
- Vocabulary: ~200 common words + characters
- MOE experts: 8 with top-2 routing

### Key Concepts Covered

1. **Architecture** - tokenization, embeddings, attention, FFN/MOE, output projection
2. **Training** - data prep, cross-entropy loss, backpropagation, optimizer updates, alignment stages
3. **Inference** - prefill vs decode, KV cache reuse, sampling policies, stop conditions, detokenization

## Deployment

### GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

Enable GitHub Pages in repository settings → Pages → Source: main branch.

### Vercel

```bash
npx vercel --prod
```

### Netlify

Drag and drop the folder to Netlify, or use the CLI:

```bash
npx netlify deploy --prod
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Learning Resources

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) - Original transformer paper
- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) - Visual guide
- [Switch Transformers](https://arxiv.org/abs/2101.03961) - MOE paper
- [Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html) - Video course

## License

MIT License - feel free to use for educational purposes.
