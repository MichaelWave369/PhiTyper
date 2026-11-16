# Φ PhiTyper Dojo

**Find your flow. Master the keys.** A free, no-login typing dojo built with React and Vite, and deployed through GitHub Actions to GitHub Pages.

**Play:** https://michaelwave369.github.io/PhiTyper/ (after Pages deployment succeeds)

## Training modes

- **Belt Dojo:** nine progressive lessons from home row to black belt. Meet each stage's WPM and accuracy targets.
- **Speed Sprint:** a 60-second typing race.
- **Zen Garden:** relaxed typing without a timer.
- **Boss Rush:** a 45-second challenge.
- **Typing Kombat:** three-round arcade combat. Type complete words to throw punches, build combo bonuses, avoid timed enemy attacks, and unleash Φ Burst with Enter when special energy reaches 100%.
- **Visual keyboard:** next-key highlighting for US QWERTY.
- **Live metrics:** WPM, keystroke accuracy, combo, and progress.
- **Optional sound:** off by default; sound is synthesized in the browser.
- **Private local progress:** belt unlocks, attempts and best records live in localStorage. No backend, analytics, advertisements or sign-in.

## Local development

Requires Node.js 22 or newer.

~~~sh
npm install
npm run dev
npm test
npm run build
~~~

## GitHub Pages setup

1. Go to repository Settings > Pages.
2. Set the Build and deployment source to **GitHub Actions**.
3. Merge tested changes into main. The Publish PhiTyper workflow validates and publishes dist.
4. Open https://michaelwave369.github.io/PhiTyper/

Vite uses the repository-specific base path /PhiTyper/ so bundled assets work correctly on project Pages. The Quality checks workflow runs on pull requests.

## Design notes

Requires a keyboard (physical or on-screen) and a modern browser. US QWERTY is the only visual keyboard layout in this first version, although typing itself uses standard browser input. Typing Kombat's enemy rules are deterministic, and its victory record is stored locally in your browser. The game has no online leaderboard or anti-cheat system. Progress is per browser and is lost when site data is cleared.

MIT licensed. Learning should be free, and the dojo is open to everybody.
