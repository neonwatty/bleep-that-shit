// Simple vanilla JS component
export function HelloComponent() {
  const el = document.createElement("div");
  el.textContent = "Hello from HelloComponent!";
  el.style.padding = "1rem";
  el.style.background = "#e0f7fa";
  el.style.borderRadius = "8px";
  el.style.margin = "1rem 0";
  return el;
}

// Optionally, auto-inject into body for demo
export function mountHelloComponent() {
  document.body.appendChild(HelloComponent());
}
