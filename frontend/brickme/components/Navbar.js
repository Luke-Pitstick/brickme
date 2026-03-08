import React from "react";
import Link from "next/link";


const Navbar = () => {
  return (
    <>
      <div className="w-full h-20 bg-[#F6AF65] sticky top-0">
        <div className="container mx-auto px-4 h-full">
          <div className="flex justify-between items-center h-full">
            <ul className="hidden md:flex gap-x-6 text-purple-700 font-semibold">
              <li>
                <Link href="/Home">
                  <p>Home</p>
                </Link>
              </li>
              <li>
                <Link href="/My_Builds">
                  <p>My Builds</p>
                </Link>
              </li>
              <li>
                <Link href="/Create">
                  <p>Create</p>
                </Link>
              </li>
              <li>
                <Link href="/Login">
                  <p>Login</p>
                </Link>
              </li>
              <li>
                <Link href="/Test">
                  <p>Test</p>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;