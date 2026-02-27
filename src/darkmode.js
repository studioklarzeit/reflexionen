export function toggleDarkMode() {
  const dark = document.body.classList.toggle('dark');
  localStorage.setItem('klarzeit_dark', dark ? '1' : '0');
  document.getElementById('darkToggle').textContent = dark ? '☀' : '☾';
}

export function initDarkMode() {
  if (localStorage.getItem('klarzeit_dark') === '1') {
    document.body.classList.add('dark');
    document.getElementById('darkToggle').textContent = '☀';
  }
}
