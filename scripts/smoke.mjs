import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

// A production bundle can compile while failing at runtime.
// Render the actual root React component to catch missing imports and JSX ReferenceErrors.
const server = await createServer({
  configFile: 'vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
});
try {
  const { default: App } = await server.ssrLoadModule('/src/App.jsx');
  const html = renderToString(React.createElement(App));
  assert.match(html, /PhiTyper/);
  assert.match(html, /START TYPING/);
  assert.match(html, /Nine belts/);
  // Render the actual arcade root as well, including all JSX used by the new mode.
  const { default: Kombat } = await server.ssrLoadModule('/src/Kombat.jsx');
  const arcade = renderToString(React.createElement(Kombat));
  assert.match(arcade, /THE THREE TRIALS/);
  assert.match(arcade, /START FIGHT/);
  const { default: PrecisionInsights } = await server.ssrLoadModule('/src/PrecisionInsights.jsx');
  const { emptyPrecision } = await server.ssrLoadModule('/src/precision.js');
  const insights = renderToString(React.createElement(PrecisionInsights, {
    profile: emptyPrecision(), drill: { focus: ['a','s','d'], variation: 0 },
    onNewDrill: () => {}
  }));
  assert.match(insights, /ACCURACY HEATMAP/);
  console.log('React app render smoke test passed.');
} finally {
  await server.close();
}
