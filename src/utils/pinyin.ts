import React from "react";

/**
 * Dynamically colors pinyin string by analyzing vowels with tone marks.
 * Returns an array of React spans with specific Tailwind colors.
 * - Tone 1 (ā, ē, ī, ō, ū, ǖ): Red (text-rose-500)
 * - Tone 2 (á, é, í, ó, ú, ǘ): Orange/Yellow (text-amber-500)
 * - Tone 3 (ǎ, ě, ǐ, ǒ, ǔ, ǚ): Green (text-emerald-500)
 * - Tone 4 (à, è, ì, ò, ù, ǜ): Blue (text-blue-500)
 * - Neutral (others): Gray (text-slate-400)
 */
export function renderToneColoredPinyin(pinyin: string): React.ReactNode {
  if (!pinyin) return "";
  
  // Split by words/whitespace, keeping spacers
  const syllables = pinyin.split(/(\s+|[,.!?;:()]+)/);

  return React.createElement(
    "span",
    { className: "inline-flex gap-x-1.5 flex-wrap" },
    ...syllables.map((syllable, index) => {
      if (!syllable) return null;
      if (/^\s+$/.test(syllable) || /^[,.!?;:()]+$/.test(syllable)) {
        return React.createElement(
          "span",
          { key: index, className: "text-slate-400 font-medium" },
          syllable
        );
      }

      let tone = 5;
      // Test syllable for specific unicode vowels with tone marks
      if (/[āēīōūǖĀĒĪŌŪǕ]/.test(syllable)) {
        tone = 1;
      } else if (/[áéíóúǘÁÉÍÓÚǗ]/.test(syllable)) {
        tone = 2;
      } else if (/[ǎěǐǒǔǚǍĚǏǑǓǙ]/.test(syllable)) {
        tone = 3;
      } else if (/[àèìòùǜÀÈÌÒÙǛ]/.test(syllable)) {
        tone = 4;
      }

      const colorClass = 
        tone === 1 ? "text-rose-500 font-extrabold" :
        tone === 2 ? "text-amber-500 font-extrabold" :
        tone === 3 ? "text-emerald-500 font-extrabold" :
        tone === 4 ? "text-blue-500 font-extrabold" :
        "text-slate-400 font-bold";

      return React.createElement(
        "span",
        {
          key: index,
          className: `${colorClass} transition duration-200 hover:scale-105 inline-block`
        },
        syllable
      );
    })
  );
}
