import React from "react";

export default function PublicBusinessLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      {modal}
    </div>
  );
}
