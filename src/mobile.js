export function openMobileMenu() {
  document.getElementById('mobileOverlay').classList.add('open');
  document.getElementById('bottomSheet').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Sync dark mode toggle state
  const isDark = document.body.classList.contains('dark');
  const toggle = document.getElementById('darkToggleSwitch');
  if (toggle) toggle.classList.toggle('active', isDark);
}

export function closeMobileMenu() {
  document.getElementById('mobileOverlay').classList.remove('open');
  document.getElementById('bottomSheet').classList.remove('open');
  document.body.style.overflow = '';
}

export function updateMobileDarkLabel() {
  const dark = document.body.classList.contains('dark');
  const iconEl = document.getElementById('mobileDarkIcon');
  const labelEl = document.getElementById('mobileDarkLabel');
  const toggle = document.getElementById('darkToggleSwitch');
  if (iconEl) {
    iconEl.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  if (labelEl) labelEl.textContent = dark ? 'Light Mode' : 'Dark Mode';
  if (toggle) toggle.classList.toggle('active', dark);
}

// Swipe-down to close bottom sheet
export function initBottomSheetGestures() {
  const sheet = document.getElementById('bottomSheet');
  if (!sheet) return;
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  sheet.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      sheet.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  sheet.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.style.transition = '';
    const diff = currentY - startY;
    if (diff > 80) {
      closeMobileMenu();
    } else {
      sheet.style.transform = '';
      if (sheet.classList.contains('open')) {
        sheet.style.transform = 'translateY(0)';
      }
    }
    sheet.style.transform = '';
    startY = 0;
    currentY = 0;
  }, { passive: true });
}
