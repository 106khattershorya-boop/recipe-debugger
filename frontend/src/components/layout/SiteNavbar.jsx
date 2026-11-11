import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import BrandMark from "@/components/branding/BrandMark.jsx";

const navigation = [
  { label: "Home", to: "/" },
  { label: "Explore recipes", to: "/explore" },
  { label: "How it works", to: "/how-it-works" },
  { label: "About", to: "/about" },
];

function getSavedTheme() {
  try {
    const saved = localStorage.getItem("flavolens-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Continue with the device preference if browser storage is unavailable.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function SiteNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getSavedTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem("flavolens-theme", theme);
    } catch {
      // The theme still works for this visit if storage is unavailable.
    }
  }, [theme]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#244b3b]/10 bg-[#f4f0e7]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          to="/"
          aria-label="FlavoLens, Recipe Debugger home"
          onClick={closeMenu}
        >
          <BrandMark />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-[13px] font-medium text-[#5e6259] transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid size-10 place-items-center rounded-full border border-[#244b3b]/15 bg-white/70 text-primary transition hover:bg-[#eae5d9]"
          >
            {theme === "dark" ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
          </button>

          <div className="hidden lg:block">
            <Button
              asChild
              className="rounded-full px-5 normal-case tracking-normal"
            >
              <Link to="/debugger">
                Try AI Debugger
                <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </Button>
          </div>

          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-[#244b3b]/15 text-primary lg:hidden"
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X size={19} aria-hidden="true" />
            ) : (
              <Menu size={19} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[#244b3b]/10 bg-[#f4f0e7] px-5 py-4 lg:hidden"
        >
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[#454a43] hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
            <Button
              asChild
              className="mt-2 w-full rounded-full normal-case tracking-normal"
            >
              <Link to="/debugger" onClick={closeMenu}>
                Try AI Debugger
                <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

export default SiteNavbar;