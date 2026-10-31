# BirthTimer

BirthTimer is a small static web app that helps you celebrate more than just birthdays.

It lets you enter a birth date and time, then shows your age in multiple time units (seconds, minutes, hours, days, weeks, months, years) and highlights upcoming milestone dates such as 1, 10, 1000 seconds, or each rounded x-iversary.

The page also supports exporting milestones to an `.ics` calendar file and sharing the list via social networks.

The interface includes a concise age summary, an upcoming-milestone timeline, a light/dark theme toggle, and native sharing/copy-link actions where supported.

**Live demo:** https://www.ahahah.eu/birthtimer/

## Project structure
- `src/index.html` — page layout and semantic sections
- `src/styles.css` — responsive styling and polished UI
- `src/app.js` — age calculation, milestone generation, translation handling, sharing and calendar export
- `src/lang.json` — translations

## Notes
This project is intentionally lightweight: no backend, no build step, just static HTML/CSS/JS.
