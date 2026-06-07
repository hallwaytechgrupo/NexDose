# Design System Specification: The Clinical Ethereal

## 1. Overview & Creative North Star: "The Living Lab"
This design system moves away from the sterile, rigid grids of traditional medical software. Our Creative North Star is **"The Living Lab"**—a philosophy that balances the absolute technical rigor of IoT data with the soft, human-centric calm of a premium wellness space. 

We reject "template" layouts. Instead, we embrace **intentional asymmetry** and **tonal depth**. By overlapping translucent layers and utilizing high-contrast typography scales, we create a sense of professional authority that feels light, breathable, and advanced. The goal is to make the patient feel cared for and the technician feel empowered.

---

## 2. Colors: Tonal Architecture
Color is not just decoration; it is the structural foundation of this system. We move beyond flat color blocks to create a sense of atmosphere.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined strictly through background shifts. For example, a `surface-container-low` section should sit on a `surface` background to create a "silent" edge. 

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of frosted glass.
- **Background (`#F8FAFB`)**: The base canvas.
- **Surface-Container-Lowest (`#FFFFFF`)**: Used for the most "elevated" interactive elements like active cards.
- **Surface-Container-High (`#E6E8E9`)**: Used to "pocket" or group secondary information within a main section.

### The "Glass & Gradient" Rule
To achieve a signature premium feel, floating elements (modals, persistent pill-shaped navs) must use **Glassmorphism**:
- **Fill**: `surface_container_lowest` at 70% opacity.
- **Backdrop Blur**: 12px to 20px.
- **Signature Texture**: Use a subtle linear gradient on Primary CTAs, transitioning from `primary` (`#0058BC`) to `primary_container` (`#0070EB`) at a 135° angle to add "soul" and depth.

---

## 3. Typography: Editorial Authority
We utilize two distinct voices: **Manrope** for display-level authority and **Inter** for clinical precision.

- **Display & Headlines (Manrope):** Large, airy, and bold. Used to celebrate health milestones or high-level IoT status. The `display-lg` (3.5rem) should be used with generous letter-spacing (-0.02em) to feel editorial.
- **Body & Titles (Inter):** Geometric, neutral, and highly legible. This is the "technical" voice. 
- **Hierarchy as Identity:** Use `label-sm` (`#414755`) in all-caps with 5% letter-spacing for category headers to create a "technical ledger" aesthetic against the soft glass backgrounds.

---

## 4. Elevation & Depth: Tonal Layering
We replace traditional box-shadows with **Tonal Layering** and **Neumorphic Softness**.

- **The Layering Principle:** Depth is achieved by stacking. Place a `surface-container-lowest` card (Pure White) atop a `surface-container-low` section. The delta in luminance creates a natural lift.
- **Ambient Shadows:** For high-elevation elements (like a medication reminder modal), use an ultra-diffused shadow:
    - **Y-Offset**: 12px | **Blur**: 40px
    - **Color**: `on-surface` (`#191C1D`) at **4% opacity**.
- **The "Ghost Border" Fallback:** If a container sits on a background of the same luminance, use a "Ghost Border": `outline-variant` at **15% opacity**. Never use 100% opaque borders.
- **Neumorphism Integration:** For interactive state-driven elements (like a "Dispense" button), use a dual-light source shadow: a white highlight on the top-left and a soft `surface-dim` shadow on the bottom-right.

---

## 5. Components: Clinical Primitives

### Buttons
- **Primary**: A gradient-filled container (`primary` to `primary_container`) with a `xl` (1.5rem) border radius. No border.
- **Tertiary**: Text-only using `primary` color, but wrapped in a ghost-border container that only appears on hover.

### Input Fields & Chips
- **Fields**: Use `surface_container_low` as the fill. On focus, transition the background to `surface_container_lowest` and apply a soft `primary` glow (20% opacity).
- **Chips**: Pill-shaped (`full` radius). Use `secondary_fixed` for positive health status ("Stable") and `tertiary_fixed` for warnings ("Low Battery").

### Cards & Lists (The Divider Ban)
- **Rule**: Forbid the use of divider lines. 
- **Execution**: Separate list items using 8px of vertical white space. If items must be grouped, place them inside a nested `surface_container_high` wrapper with a `lg` (1rem) radius.

### Specialized IoT Components
- **Dosage Rings**: High-contrast `secondary` (Emerald) arcs against `surface_variant` tracks to show medication adherence.
- **Status Pills**: Use Glassmorphism with a `surface_tint` glow to indicate "Live" connectivity with IoT hardware.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical margins (e.g., 64px left, 48px right) in dashboard layouts to create a bespoke, high-end feel.
- **Do** use Line Art icons with a 20% opacity `primary` circular fill behind them to tie into the IoT aesthetic.
- **Do** lean into white space. If it feels "too empty," add more space.

### Don't
- **Don't** use pure black (`#000000`) for text. Use `on_surface` (`#191C1D`) to maintain the soft-tech aesthetic.
- **Don't** use "Standard" shadows. If it looks like a default Material Design shadow, it's too heavy.
- **Don't** use 1px lines to separate headers from content. Use a 40px `headline-lg` to `body-md` spatial jump instead.