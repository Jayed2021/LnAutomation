# ERP System Color Scheme

This document outlines the professional color palette used throughout the ERP system using default Tailwind CSS colors.

## Implementation

The application uses **default Tailwind CSS color palette** for consistency and proper rendering. All colors use standard Tailwind utility classes.

## Primary Colors

### Blue (Tailwind blue-*)
- **Main shades**: `blue-50`, `blue-100`, `blue-600`, `blue-700`
- **Usage**: Primary actions, navigation highlights, informational elements
- **Examples**:
  - Active navigation items: `bg-gray-800 border-l-4 border-blue-600`
  - Primary buttons and user avatar: `bg-blue-600`
  - Stock/inventory card icons: `bg-blue-100`, `text-blue-600`
  - Order status information

### Emerald (Tailwind emerald-*)
- **Main shades**: `emerald-50`, `emerald-100`, `emerald-600`
- **Usage**: Success states, positive metrics, financial growth
- **Examples**:
  - Inventory value indicators: `bg-emerald-100`, `text-emerald-600`
  - Success messages and completed status
  - Profit/revenue displays

### Amber (Tailwind amber-*)
- **Main shades**: `amber-50`, `amber-100`, `amber-200`, `amber-600`
- **Usage**: Warnings, pending states, attention needed
- **Examples**:
  - Low stock alerts: `bg-amber-50 border-amber-200`, `text-amber-600`
  - Pending approvals
  - Active returns card icon

### Red (Tailwind red-*)
- **Main shades**: `red-50`, `red-100`, `red-600`, `red-700`
- **Usage**: Errors, critical alerts, logout actions
- **Examples**:
  - Error messages
  - Logout button: `bg-red-600 hover:bg-red-700`
  - Failed operations

### Teal (Tailwind teal-*)
- **Main shades**: `teal-50`, `teal-100`, `teal-200`, `teal-600`
- **Usage**: Secondary accents, logistics
- **Examples**:
  - Pending purchase orders: `bg-teal-50 border-teal-200`, `text-teal-600`
  - Shipping/courier information

### Gray (Tailwind gray-*)
- **Main shades**: `gray-100`, `gray-200`, `gray-400`, `gray-500`, `gray-600`, `gray-700`, `gray-800`, `gray-900`
- **Usage**: Layout structure, neutral information, text hierarchy
- **Examples**:
  - Sidebar background: `bg-gray-900`
  - Sidebar borders: `border-gray-800`
  - Body background: `bg-gray-100`
  - Text colors: `text-gray-400`, `text-gray-500`, `text-gray-600`, `text-gray-900`

## Navigation Colors

### Sidebar
- **Background**: `bg-gray-900` (dark gray)
- **Text**: `text-white`
- **Borders**: `border-gray-800`
- **Hover state**: `hover:bg-gray-800`
- **Active item**: `bg-gray-800 border-l-4 border-blue-600`
- **Active submenu**: `bg-gray-700 text-blue-400`
- **User avatar**: `bg-blue-600`
- **Logout button**: `bg-red-600 hover:bg-red-700`

### Header
- **Background**: `bg-white`
- **Border**: `border-gray-200`
- **Text**: `text-gray-900`, `text-gray-500`
- **Button hover**: `hover:bg-gray-100`

## Background Colors

- **Blue backgrounds**: `bg-blue-100` (light), `bg-blue-50` (lighter)
- **Emerald backgrounds**: `bg-emerald-100`, `bg-emerald-50`
- **Amber backgrounds**: `bg-amber-100`, `bg-amber-50`
- **Red backgrounds**: `bg-red-100`, `bg-red-50`
- **Teal backgrounds**: `bg-teal-100`, `bg-teal-50`
- **Gray backgrounds**: `bg-gray-50`, `bg-gray-100`, `bg-gray-800`, `bg-gray-900`

## Text Colors

- **Dark headings**: `text-gray-900`
- **Body text**: `text-gray-600`
- **Muted text**: `text-gray-400`, `text-gray-500`, or `text-muted-foreground`
- **White text**: `text-white` (on dark backgrounds)
- **Accent text**: `text-blue-600`, `text-emerald-600`, `text-amber-600`, `text-teal-600`, etc.

## Border Colors

- **Default borders**: `border-gray-200`, `border-gray-300`, `border-gray-800`
- **Colored borders**: `border-blue-600`, `border-amber-200`, `border-teal-200`, etc.

## Module-Specific Colors

### Dashboard
- **Total Stock Card**: `bg-blue-100` icon background, `text-blue-600` icon
- **Inventory Value Card**: `bg-emerald-100` icon background, `text-emerald-600` icon
- **Pending Orders Card**: `bg-blue-100` icon background, `text-blue-600` icon
- **Active Returns Card**: `bg-amber-100` icon background, `text-amber-600` icon
- **Low Stock Alerts**: `bg-amber-50 border-amber-200`, `text-amber-600`
- **Recent Orders**: Standard card styling
- **Pending POs**: `bg-teal-50 border-teal-200`, `text-teal-600`

## Colors NOT Used

The following colors are intentionally **excluded** for a professional appearance:
- ❌ Purple/Violet (`purple-*`, `violet-*`)
- ❌ Indigo (`indigo-*`)
- ❌ Pink/Rose (`pink-*`, `rose-*`)
- ❌ Fuchsia (`fuchsia-*`)

## Configuration

### Tailwind Config
The `tailwind.config.js` uses `extend` to preserve all default Tailwind colors while adding custom semantic colors for the design system.

### CSS Variables
Custom CSS variables in `index.css` are used only for semantic tokens like `--background`, `--foreground`, `--muted`, etc. They do NOT override Tailwind's default color palette.

## Usage Guidelines

1. **Always use default Tailwind classes**: `bg-blue-600`, `text-emerald-600`, etc.
2. **Never use custom color variables**: Avoid `bg-blue`, `text-emerald` without shade numbers
3. **Consistent shades**:
   - Icon backgrounds: `*-100` (e.g., `bg-blue-100`)
   - Icon colors: `*-600` (e.g., `text-blue-600`)
   - Hover states: `*-700` (darker) or `*-50` (lighter backgrounds)
   - Borders: `*-200` for subtle, `*-600` for prominent
4. **Contrast**: Ensure sufficient contrast (WCAG AA minimum)
5. **Meaning**: Colors convey meaning (emerald = success, red = error, amber = warning)

## Common Patterns

```jsx
// Card icon with background
<div className="p-3 bg-blue-100 rounded-lg">
  <Icon className="w-8 h-8 text-blue-600" />
</div>

// Alert/notification box
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
  <p className="text-amber-600">Warning message</p>
</div>

// Sidebar active state
<Link className="bg-gray-800 border-l-4 border-blue-600">
  Active Menu Item
</Link>

// Button variants
<button className="bg-blue-600 hover:bg-blue-700 text-white">Primary</button>
<button className="bg-red-600 hover:bg-red-700 text-white">Danger</button>
<button className="bg-emerald-600 hover:bg-emerald-700 text-white">Success</button>
```
