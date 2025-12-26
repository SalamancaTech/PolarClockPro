## 2025-02-26 - [Debouncing Search Input]
**Learning:** The `renderAlarms` function clears and rebuilds the DOM on every call. It was being triggered on every keystroke in the search bar. This is a common performance pitfall.
**Action:** Implemented debouncing to limit `renderAlarms` calls to once every 300ms during typing.
