"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { NavItem } from "@/types";

export function DashboardSidebar({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNav = (route: string) => {
    setMobileOpen(false);
    router.push(route);
  };

  const isActive = (route: string) => pathname === route;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-5 p-3 border-round-md cursor-pointer md:hidden surface-800 border-1 border-700 text-400 hover:text-100"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <i className="pi pi-bars text-xl"></i>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black-alpha-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile full-screen menu */}
      <div
        className={`fixed inset-0 z-50 transition-duration-300 transition-transform md:hidden surface-900 ${
          mobileOpen ? "" : "-translate-x-full"
        }`}
      >
        <div className="flex align-items-center justify-content-between p-4 border-bottom border-700">
          <span className="text-xl font-semibold text-100">Menu</span>
          <button
            className="p-3 border-none cursor-pointer text-400 hover:text-100"
            onClick={() => setMobileOpen(false)}
          >
            <i className="pi pi-times text-xl"></i>
          </button>
        </div>
        <nav className="p-4 flex flex-column gap-1">
          {items.map((item) => (
            <button
              key={item.route}
              className={`flex align-items-center gap-3 w-full px-4 py-3 border-round-md text-left cursor-pointer transition-colors ${
                isActive(item.route)
                  ? "bg-primary text-white"
                  : "text-400 hover:surface-700"
              }`}
              onClick={() => handleNav(item.route)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-column h-screen surface-800 border-right border-700 transition-all transition-duration-300 sticky top-0 ${
          collapsed ? "w-4rem" : "w-14rem"
        }`}
      >
        {/* Logo */}
        <div className="flex align-items-center h-14 px-3 border-bottom border-700">
          {!collapsed && (
            <span className="text-lg font-semibold text-100 truncate">CRM</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
          {items.map((item) => (
            <Link
              key={item.route}
              href={item.route}
              title={collapsed ? item.label : undefined}
              className={`flex align-items-center gap-3 mx-2 px-3 py-3 border-round-md text-sm transition-colors no-underline ${
                collapsed ? "justify-content-center" : ""
              } ${
                isActive(item.route)
                  ? "bg-primary text-white"
                  : "text-400 hover:surface-700"
              }`}
            >
              <i className={item.icon}></i>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse button */}
        <div className="p-2 border-top border-700">
          <button
            className="flex align-items-center justify-content-center w-full py-2 text-400 hover:text-100 transition-colors cursor-pointer border-none"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i
              className={`pi text-sm ${
                collapsed ? "pi-angle-double-right" : "pi-angle-double-left"
              }`}
            ></i>
          </button>
        </div>
      </aside>
    </>
  );
}
