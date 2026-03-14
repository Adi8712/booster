const s = document.getElementById('s'), p = document.getElementById('p'), r = document.getElementById('r');
const u = v => { s.value = v; p.textContent = Math.round(v * 100) + '%'; };
browser.storage.local.get({ boost: 1.0 }).then(x => u(x.boost));
s.addEventListener('input', e => { let v = parseFloat(e.target.value); u(v); browser.storage.local.set({ boost: v }) });
r.addEventListener('click', () => { u(1.0); browser.storage.local.set({ boost: 1.0 }) });
