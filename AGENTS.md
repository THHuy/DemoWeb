# Frontend Development Rules

## Tech Stack

Always use:

* Next.js (latest version in project)
* Tailwind CSS v4
* shadcn/ui
* Motion
* Aceternity UI
* Magic UI
* TypeScript
* ESLint
* Responsive Design
* SEO Best Practices

---

## UI Guidelines

* Use shadcn/ui components whenever possible.
* Use Tailwind CSS v4 utilities only.
* Avoid custom CSS unless absolutely necessary.
* Use Motion for animations.
* Use Aceternity UI and Magic UI components for premium visual effects.
* Prefer modern SaaS-style layouts.
* Ensure full mobile responsiveness.
* Support dark mode by default.
* Follow accessibility best practices (WCAG).

---

## Component Rules

* Create reusable components.
* Keep components small and focused.
* Use Server Components when possible.
* Use Client Components only when necessary.
* Avoid unnecessary re-renders.
* Use proper TypeScript typing.
* Use loading states and skeletons.

---

## Design Style

Target design quality similar to:

* Vercel
* Linear
* Stripe
* Notion
* Raycast

Use:

* Smooth animations
* Clean typography
* Modern spacing system
* Card-based layouts
* Subtle gradients
* Premium interactions

---

## SEO Rules

* Use metadata API.
* Generate proper title and description.
* Use semantic HTML.
* Optimize images.
* Implement Open Graph tags.
* Implement structured data where appropriate.

---

## Animation Rules

Use Motion for:

* Page transitions
* Scroll reveal
* Hover effects
* Stagger animations
* Loading transitions

Animations should be smooth and subtle.

Avoid excessive animations.

---

## Critical Next.js Rule

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.

Before generating or modifying code:

1. Read the relevant documentation inside:

   node_modules/next/dist/docs/

2. Verify APIs against the installed Next.js version.

3. Follow the project's actual file structure.

4. Respect deprecation warnings.

5. Never assume older App Router behavior is still valid.

6. Never generate code based solely on training data.

7. If documentation exists locally, prefer it over prior knowledge.

<!-- END:nextjs-agent-rules -->

---

## Code Quality Rules

* Use strict TypeScript.
* Avoid any.
* Use async/await.
* Handle errors properly.
* Keep code production-ready.
* Prefer clean architecture.
* Follow Next.js best practices.
* Generate maintainable code.
