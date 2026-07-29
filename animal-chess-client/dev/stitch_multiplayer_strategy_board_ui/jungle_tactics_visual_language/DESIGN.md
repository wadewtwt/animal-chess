---
name: Jungle Tactics Visual Language
colors:
  surface: '#fffadf'
  surface-dim: '#e1dca9'
  surface-bright: '#fffadf'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf5c1'
  surface-container: '#f6f0bb'
  surface-container-high: '#f0eab6'
  surface-container-highest: '#eae4b1'
  on-surface: '#1e1c00'
  on-surface-variant: '#3f4a3c'
  inverse-surface: '#34310d'
  inverse-on-surface: '#f8f3be'
  outline: '#6f7a6b'
  outline-variant: '#becab9'
  surface-tint: '#006e1c'
  primary: '#006e1c'
  on-primary: '#ffffff'
  primary-container: '#4caf50'
  on-primary-container: '#003c0b'
  inverse-primary: '#78dc77'
  secondary: '#695f00'
  on-secondary: '#ffffff'
  secondary-container: '#f9e534'
  on-secondary-container: '#706500'
  tertiary: '#8b5000'
  on-tertiary: '#ffffff'
  tertiary-container: '#e18500'
  on-tertiary-container: '#4d2b00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#94f990'
  primary-fixed-dim: '#78dc77'
  on-primary-fixed: '#002204'
  on-primary-fixed-variant: '#005313'
  secondary-fixed: '#f9e534'
  secondary-fixed-dim: '#dbc90a'
  on-secondary-fixed: '#201c00'
  on-secondary-fixed-variant: '#4f4800'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#ffb870'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#fffadf'
  on-background: '#1e1c00'
  surface-variant: '#eae4b1'
typography:
  headline-xl:
    fontFamily: Quicksand
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  body-lg:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Quicksand
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-bold:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  container-margin: 16px
  gutter: 12px
---

## Brand & Style

This design system is built to evoke the energy of a high-stakes, yet lighthearted adventure. The brand personality is **vibrant, energetic, and tactile**, targeting a broad mobile gaming audience that values both strategic depth and immediate visual gratification.

The design style is a blend of **Modern Cartoon and Playful Skeuomorphism**. It departs from flat design by embracing "candy" textures, glossy finishes, and physical depth. Every interaction should feel "bouncy"—as if the UI is made of soft, high-quality vinyl or polished wood. The emotional goal is to make the player feel like they are interacting with a living, breathing toy set where every victory is celebrated with a burst of color and movement.

## Colors

The palette is rooted in a "Citrus & Jungle" theme, utilizing high-saturation tones to maintain a constant sense of excitement.

- **Primary (Leaf Green):** Used for positive actions, success states, and the primary "Tactics" branding.
- **Secondary (Sunny Yellow):** Reserved for highlights, currency, and attention-grabbing elements.
- **Accent (Playful Orange):** Used for destructive actions or critical "Call to Action" buttons that need to pop against the green.
- **Neutral (Soft Cream):** The base background color to ensure the UI remains warm and approachable, avoiding the sterile nature of pure white.
- **Surface:** Use Bright White for card bodies, but always pair with a thick 2px-4px border in a darkened version of the primary or secondary color to maintain the cartoon aesthetic.

## Typography

This design system exclusively utilizes **Quicksand** to achieve a soft, rounded, and friendly character. 

- **Headlines:** Must always be Bold (700). For level-up screens or major victories, headlines should utilize a 2pt stroke/outline in a darker tonal color to ensure legibility over busy game backgrounds.
- **Body Text:** Uses Medium (500) weight to maintain readability while appearing "thicker" than standard functional apps.
- **Micro-copy:** All labels and buttons use Bold weight to ensure they feel like part of the physical interface rather than just "text on top."
- **Readability:** On mobile, never drop below 14px for interactive labels. Ensure generous line-height to accommodate the rounded descenders of the font.

## Layout & Spacing

The layout follows a **Fluid Grid** model designed for "thumb-driven" ergonomics. 

- **Rhythm:** An 8px base unit drives all spacing. Larger gaps (20px+) are preferred between disparate UI groups to reinforce the "chunky" feel.
- **Safe Areas:** Implement a minimum 16px horizontal margin for all screen-edge elements to accommodate various mobile bezel types.
- **Reflow:** On tablets, the UI should not stretch to full width. Instead, use a max-width container for center-aligned modals and side-aligned panels for game stats to maintain the tight, compact feel of the mobile experience.

## Elevation & Depth

Depth in this design system is not achieved through realistic lighting, but through **Tonal Shadowing and Layering**.

- **Shadow Character:** Use large, soft ambient shadows with a slight color tint matching the background (e.g., a dark-green shadow if the button is on a light-green surface). Avoid pure black (#000) shadows; use 20-30% opacity of a deep navy or forest green.
- **Glossy Effects:** Top-level interactive elements (buttons, active chips) feature a "light-catch" inner glow at the top edge—a 1px or 2px semi-transparent white line to simulate a glossy candy finish.
- **Active State:** When pressed, elements should translate 4px downwards and lose their bottom "3D" border, mimicking a physical button being pushed into a socket.

## Shapes

The shape language is strictly **Pill-shaped (Level 3)**. 

Every corner is aggressively rounded to avoid any "sharp" or "aggressive" feelings. This applies to buttons, container cards, and even the ends of progress bars. For large containers like game menus, use `rounded-xl` (3rem) to create a soft, frame-like appearance that hugs the content.

## Components

- **Bouncy Buttons:** The core interactive element. Buttons must have a thick 4px to 6px bottom border (a darker shade of the button's color) to create a 3D "extruded" look. The label should be centered and bold.
- **Cards:** White or Cream surfaces with a 2px colored outline. Headers on cards should be a solid block of color (Green or Orange) with the top corners rounded to match the container.
- **Bubbly Progress Bars:** The track is a recessed, darker version of the background. The fill is a vibrant gradient (e.g., Light Green to Primary Green) with a "bubble" highlight running through the center.
- **Chips & Tags:** Small pill-shaped markers with high-contrast backgrounds. Use these for unit stats or "New" badges.
- **Input Fields:** Recessed "inset" appearance. Use a subtle inner shadow to make the input area look like it's carved into the surface of the UI.
- **Unit Portraits:** Circular or highly-rounded square frames with a thick "ring" border in a secondary color (Yellow) to denote selection.