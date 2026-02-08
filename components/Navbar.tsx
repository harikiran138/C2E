"use client";

import React from "react";
import { Home, Briefcase, Phone, LogIn } from "lucide-react";
import { NavBar } from "./ui/navbar";

export default function Navbar() {
  const navLinks = [
    { name: "Home", url: "/", icon: Home },
    { name: "About", url: "/#about", icon: Briefcase },
    { name: "Services", url: "/#services", icon: Phone },
    { name: "Login", url: "/institution/login", icon: LogIn },
  ];

  return <NavBar items={navLinks} />;
}
