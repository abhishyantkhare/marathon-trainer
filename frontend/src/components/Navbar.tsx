"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🏃</span>
              <span className="font-bold text-xl text-marathon-primary">
                Marathon Tracker
              </span>
            </Link>

            <div className="hidden md:flex ml-10 space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-marathon-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/plan"
                className="text-gray-700 hover:text-marathon-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Training Plan
              </Link>
              <Link
                href="/runs"
                className="text-gray-700 hover:text-marathon-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Runs
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  {user.profile_picture ? (
                    <Image
                      src={user.profile_picture}
                      alt={user.name || "User"}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-marathon-primary flex items-center justify-center text-white font-semibold">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="md:hidden">
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/plan"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Training Plan
                      </Link>
                      <Link
                        href="/runs"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Runs
                      </Link>
                      <hr className="my-1" />
                    </div>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
