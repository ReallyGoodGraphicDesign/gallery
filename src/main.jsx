import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import './variables.css';
import reportWebVitals from './reportWebVitals';

function measureScrollbarWidth() {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.top = '-9999px';
  probe.style.width = '100px';
  probe.style.height = '100px';
  probe.style.overflow = 'scroll'; // force a scrollbar in this element
  document.body.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth; // scrollbar width
  document.body.removeChild(probe);
  return Math.max(0, width);
}

function updateScrollbarCompensation() {
  const root = document.documentElement;
  const needsScroll = root.scrollHeight > root.clientHeight;
  // Cache a realistic scrollbar width (0 on overlay-scrollbar systems)
  const sbw = measureScrollbarWidth();
  root.style.setProperty('--sbw', `${sbw}px`);
  if (needsScroll) {
    // Scrollbar is present → remove pre-compensation
    root.classList.remove('no-scroll');
  } else {
    // No scrollbar → pre-compensate so a future scrollbar won't shift layout
    root.classList.add('no-scroll');
  }
}

// Run on load, resize, and after render ticks that may change height
window.addEventListener('load', updateScrollbarCompensation);
window.addEventListener('resize', updateScrollbarCompensation);
// Optional: observe DOM changes that can affect height (dynamic content)
const mo = new MutationObserver(() => {
  // micro-batch updates
  requestAnimationFrame(updateScrollbarCompensation);
});
mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });




const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

// Initial pass after first paint
requestAnimationFrame(updateScrollbarCompensation);