import React from "react";

export default function Image({
  src = "",
  alt = "",
  caption = "",
  credit = "",
  className = "",
  rounded = true,
  shadow = true,
  bordered = true,
  maxWidth = "max-w-4xl",
}) {
  return (
    <div className={`my-10 flex justify-center`}>
      <figure
        className={`relative ${maxWidth} w-full flex flex-col items-center text-center transition-all duration-300 ${className}`}
      >
        {/* Glow Effect */}
        {shadow && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-400/30 to-blue-500/30 blur-xl opacity-20 rounded-3xl"></div>
        )}

        {/* Image Container */}
        <div
          className={`relative w-full overflow-hidden ${
            rounded ? "rounded-3xl" : ""
          } ${bordered ? "border border-gray-200 dark:border-gray-700" : ""}`}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-auto object-cover transition-transform duration-500 hover:scale-[1.02]"
            loading="lazy"
          />
        </div>

        {/* Caption */}
        {(caption || credit) && (
          <figcaption className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-prose">
            {caption && <span>{caption}</span>}
            {credit && (
              <>
                {" "}
                <span className="block text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {credit}
                </span>
              </>
            )}
          </figcaption>
        )}
      </figure>
    </div>
  );
}