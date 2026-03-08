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
    { href: "/Create", label: "Create" },
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
            <span className="text-xl font-extrabold tracking-tight text-gray-800">
              Brick<span className="text-[#9B6DC6]">Me</span>
            </span>
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
