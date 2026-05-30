"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-gray-800 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 transition-colors"
    >
      Print / Save as PDF
    </button>
  );
}
