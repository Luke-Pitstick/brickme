"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";


const BrickStud = () => (
  <span className="inline-block w-3 h-3 rounded-full bg-[#C4A8E0]/50 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1),0_1px_1px_rgba(255,255,255,0.5)]" />
);

const Navbar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const navLinks = [
    { href: "/Home", label: "Home" },
    { href: "/My_Builds", label: "My Builds" },
    { href: "/Test", label: "3D Viewer" },
  ];

  return (
    <nav className="sticky top-0 z-50">
      {/* Main bar */}
      <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_16px_rgba(155,120,200,0.12)] border-b border-[#E8DCF5]">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/Home" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 bg-gradient-to-br from-[#B388D9] to-[#9B6DC6] rounded-md shadow-[0_2px_8px_rgba(155,109,198,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center transition-transform group-hover:scale-110">
              <div className="grid grid-cols-2 gap-0.5">
                <BrickStud />
                <BrickStud />
                <BrickStud />
                <BrickStud />
              </div>
            </div>
            <svg viewBox="0 0 1366 768" className="w-30 h-24 text-[#9B6DC6] [&_.st0]:stroke-[#9B6DC6]" aria-label="BrickMe">
              <defs>
                <style>{`.st0{fill:none;stroke:currentColor;stroke-miterlimit:10;stroke-width:18px}`}</style>
              </defs>
              <line className="st0" x1="108" y1="216" x2="108" y2="576"/>
              <line className="st0" x1="396" y1="576" x2="108" y2="576"/>
              <line className="st0" x1="180" y1="216" x2="108" y2="216"/>
              <line className="st0" x1="180" y1="396" x2="180" y2="216"/>
              <line className="st0" x1="684" y1="396" x2="180" y2="396"/>
              <line className="st0" x1="396" y1="468" x2="396" y2="576"/>
              <line className="st0" x1="468" y1="468" x2="396" y2="468"/>
              <line className="st0" x1="468" y1="576" x2="468" y2="468"/>
              <line className="st0" x1="756" y1="576" x2="468" y2="576"/>
              <line className="st0" x1="324" y1="396" x2="324" y2="576"/>
              <line className="st0" x1="396" y1="396" x2="396" y2="432"/>
              <g>
                <line className="st0" x1="180" y1="450" x2="252" y2="450"/>
                <line className="st0" x1="252" y1="522" x2="252" y2="450"/>
                <line className="st0" x1="180" y1="450" x2="180" y2="522"/>
                <line className="st0" x1="252" y1="522" x2="180" y2="522"/>
              </g>
              <line className="st0" x1="468" y1="396" x2="468" y2="468"/>
              <line className="st0" x1="540" y1="396" x2="540" y2="576"/>
              <line className="st0" x1="468" y1="288" x2="468" y2="360"/>
              <line className="st0" x1="540" y1="288" x2="468" y2="288"/>
              <line className="st0" x1="540" y1="360" x2="540" y2="288"/>
              <line className="st0" x1="468" y1="360" x2="540" y2="360"/>
              <line className="st0" x1="684" y1="216" x2="684" y2="576"/>
              <line className="st0" x1="756" y1="216" x2="684" y2="216"/>
              <line className="st0" x1="756" y1="432" x2="756" y2="216"/>
              <line className="st0" x1="828" y1="360" x2="756" y2="432"/>
              <line className="st0" x1="900" y1="360" x2="828" y2="360"/>
              <line className="st0" x1="792" y1="468" x2="900" y2="360"/>
              <line className="st0" x1="900" y1="576" x2="792" y2="468"/>
              <line className="st0" x1="756" y1="576" x2="756.03" y2="504"/>
              <line className="st0" x1="828.03" y1="576.03" x2="756.03" y2="504.03"/>
              <line className="st0" x1="900" y1="576" x2="828.03" y2="576.03"/>
              <line className="st0" x1="864" y1="396" x2="864" y2="540"/>
              <line className="st0" x1="1260" y1="396" x2="864" y2="396"/>
              <line className="st0" x1="1260" y1="576" x2="900" y2="576"/>
              <line className="st0" x1="1260" y1="396" x2="1260" y2="576"/>
              <line className="st0" x1="1080" y1="396" x2="1080" y2="576"/>
              <line className="st0" x1="972" y1="396" x2="972" y2="450"/>
              <line className="st0" x1="936" y1="504" x2="936" y2="576"/>
              <line className="st0" x1="1008" y1="504" x2="1008" y2="576"/>
              <line className="st0" x1="1152" y1="522" x2="1260" y2="522"/>
              <line className="st0" x1="684" y1="450" x2="594" y2="450"/>
              <line className="st0" x1="594" y1="522" x2="594" y2="450"/>
              <line className="st0" x1="684" y1="522" x2="594" y2="522"/>
              <g>
                <line className="st0" x1="1152" y1="432" x2="1152" y2="468"/>
                <line className="st0" x1="1206" y1="432" x2="1152" y2="432"/>
                <line className="st0" x1="1206" y1="468" x2="1152" y2="468"/>
                <line className="st0" x1="1206" y1="432" x2="1206" y2="468"/>
              </g>
              <rect className="st0" x="486" y="270" width="36" height="18"/>
            </svg>
          </Link>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`relative px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-200
                      ${
                        isActive
                          ? "bg-[#F0E6FA] text-[#7B4DAF] shadow-[inset_0_1px_2px_rgba(155,109,198,0.15)]"
                          : "text-gray-500 hover:bg-[#F7F1FC] hover:text-[#9B6DC6]"
                      }`}
                  >
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#9B6DC6] rounded-full" />
                    )}
                  </Link>
                </li>
              );
            })}

            {/* Auth link */}
            <li>
              {user ? (
                <button
                  onClick={signOut}
                  className="px-4 py-2 rounded-lg text-sm font-bold tracking-wide text-gray-500 hover:bg-[#F7F1FC] hover:text-[#9B6DC6] transition-all duration-200"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/Login"
                  className={`relative px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-200
                    ${
                      pathname === "/Login"
                        ? "bg-[#F0E6FA] text-[#7B4DAF] shadow-[inset_0_1px_2px_rgba(155,109,198,0.15)]"
                        : "text-gray-500 hover:bg-[#F7F1FC] hover:text-[#9B6DC6]"
                    }`}
                >
                  Sign In
                </Link>
              )}
            </li>
          </ul>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-6 h-0.5 bg-[#9B6DC6] rounded transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#9B6DC6] rounded transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#9B6DC6] rounded transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 bg-white/95 backdrop-blur-md shadow-lg ${
          mobileOpen ? "max-h-64" : "max-h-0"
        }`}
      >
        <ul className="flex flex-col px-6 py-3 gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200
                    ${
                      isActive
                        ? "bg-[#F0E6FA] text-[#7B4DAF]"
                        : "text-gray-500 hover:bg-[#F7F1FC] hover:text-[#9B6DC6]"
                    }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            {user ? (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:bg-[#F7F1FC] hover:text-[#9B6DC6] transition-all duration-200"
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/Login"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:bg-[#F7F1FC] hover:text-[#9B6DC6] transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </li>
        </ul>
      </div>

      {/* Bottom accent line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D8C4F0] to-transparent" />
    </nav>
  );
};

export default Navbar;
