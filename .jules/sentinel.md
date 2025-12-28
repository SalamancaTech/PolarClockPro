## 2024-05-23 - Stored XSS in Alarms
**Vulnerability:** User input for Alarm Label, Group Name, and Description was injected directly into the DOM using `innerHTML` without sanitization. This allowed Stored XSS via `localStorage`.
**Learning:** In "vanilla" JS apps without a framework like React/Vue that auto-escapes, manual `innerHTML` usage is a high-risk pattern.
**Prevention:** Always use a sanitization helper (like `escapeHTML`) before injecting user-controlled strings into HTML templates, or prefer `textContent` / `innerText` where possible.