// Create a DevTools panel named "devProxy"
// This runs when DevTools opens and registers our panel
chrome.devtools.panels.create(
  'devProxy',
  'icons/icon16.png',
  'panel.html',
  (panel) => {
    console.log('devProxy panel created');
  }
);
