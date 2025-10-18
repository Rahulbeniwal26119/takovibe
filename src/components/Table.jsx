import React from "react";

export default function Table({
  title = "",
  description = "",
  headers = [],
  rows = []
}) {
  return (
    <div className="max-w-6xl mx-auto my-12 px-6 md:px-10">
      {/* Title and Description */}
      {(title || description) && (
        <div className="text-center mb-10">
          {title && (
            <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Container with Glow */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl">
        {/* Glow Border */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 via-pink-400/40 to-blue-500/40 blur-xl opacity-30"></div>

        {/* Table Container */}
        <div className="relative bg-[#0d1117] dark:bg-gray-900 rounded-3xl border border-gray-800/70 backdrop-blur-xl overflow-x-auto p-6 md:p-8">
          <table className="min-w-full border-collapse text-left text-gray-200">
            {/* Table Head */}
            {headers.length > 0 && (
              <thead>
                <tr className="bg-[#161b22] text-purple-300 uppercase text-sm tracking-widest border-b border-gray-800">
                  {headers.map((header, i) => (
                    <th
                      key={i}
                      className="px-6 py-4 font-semibold whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            {/* Table Body */}
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-[#1a1f27] transition-colors duration-200 border-b border-gray-800/50 last:border-none"
                  >
                    {row.map((cell, j) => (
                      <td key={j} className="px-6 py-5 align-top text-gray-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={headers.length || 1}
                    className="px-6 py-8 text-center text-gray-500 italic"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
