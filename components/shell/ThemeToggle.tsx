"use client";

export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("hero-lab-theme", dark ? "dark" : "light");
    } catch {}
  }
  return (
    <button type="button" className="btn-ghost" onClick={toggle} aria-label="라이트·다크 전환">
      테마
    </button>
  );
}
