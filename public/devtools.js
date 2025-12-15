// Create a DevTools panel named "DevProxy"
// This runs when DevTools opens and registers our panel
chrome.devtools.panels.create(
  'DevProxy',
  'icons/icon16.png',
  'panel.html',
  (panel) => {
    console.log('DevProxy panel created');
  }
);
