"use client";
import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & { title?: string };

export default function Card({ title, children, className = "", ...props }: Props) {
  return (
    <div className={`border rounded-lg p-6 bg-white shadow-sm ${className}`} {...props}>
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {children}
    </div>
  );
}
