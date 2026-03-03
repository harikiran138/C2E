"use client";

import React from "react";

interface AuthBackgroundProps {
  children: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({
  children,
  className = "",
  fullScreen = false,
}) => {
  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden ${className}`}
    >
      {/* Pattern Background */}
      <div
        className="absolute inset-0 z-0"
        style={
          {
            width: "100%",
            height: "100%",
            "--s": "150px",
            "--c1": "#ff847c",
            "--c2": "#e84a5f",
            "--c3": "#fecea8",
            "--c4": "#99b898",
            background: `
            conic-gradient(
              from 45deg at 75% 75%,
              var(--c3) 90deg,
              var(--c1) 0 180deg,
              #0000 0
            ),
            conic-gradient(from -45deg at 25% 25%, var(--c3) 90deg, #0000 0),
            conic-gradient(from -45deg at 50% 100%, #0000 180deg, var(--c3) 0),
            conic-gradient(
              from -45deg,
              var(--c1) 90deg,
              var(--c2) 0 225deg,
              var(--c4) 0
            )
          `,
            backgroundSize: "var(--s) var(--s)",
          } as React.CSSProperties
        }
      />

      {/* Overlay for better readability of forms */}
      <div className="absolute inset-0 z-0 bg-black/20" />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex min-h-screen w-full",
          fullScreen ? "" : "flex-col items-center justify-center p-4",
        )}
      >
        {children}
      </div>
    </div>
  );
};

const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

export default AuthBackground;
