"use client";

import React from "react";

const GridPattern = () => {
  return (
    <div
      className="absolute inset-0 -z-10 w-full h-full"
      style={{
        backgroundColor: "#F3F3F3",
        backgroundImage: `
          linear-gradient(0deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent),
          linear-gradient(90deg, transparent 24%, #E1E1E1 25%, #E1E1E1 26%, transparent 27%, transparent 74%, #E1E1E1 75%, #E1E1E1 76%, transparent 77%, transparent)
        `,
        backgroundSize: "55px 55px",
      }}
    />
  );
};

export default GridPattern;
