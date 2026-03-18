globalThis.browser = globalThis.browser || globalThis.chrome;
const s = document.getElementById("s"),
  p = document.getElementById("p"),
  r = document.getElementById("r");
const percentSpan = document.createElement("span");
percentSpan.textContent = "%";
p.appendChild(percentSpan);

const u = (v) => {
  s.value = v;
  p.firstChild.nodeValue = Math.round(v * 100);
};

browser.tabs.query({ active: true, currentWindow: true }).then((t) => {
  if (!t[0]) return;
  const tid = t[0].id;
  browser.runtime.sendMessage({ type: "GET", tid }).then((x) => u(x.b));

  s.addEventListener("input", (e) => {
    let v = parseFloat(e.target.value);
    u(v);
    browser.runtime.sendMessage({ type: "SET", tid, b: v });
  });

  r.addEventListener("click", () => {
    u(1.0);
    browser.runtime.sendMessage({ type: "SET", tid, b: 1.0 });
  });
});
