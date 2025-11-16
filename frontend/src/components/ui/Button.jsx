import * as React from "react";

export function Button({ className, children, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
