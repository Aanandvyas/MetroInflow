import * as React from "react";

export function Card({ className, ...props }) {
  return (
    <div
      className={`rounded-lg border bg-white text-gray-900 shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={`p-4 border-b ${className}`} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={`p-4 ${className}`} {...props} />;
}
