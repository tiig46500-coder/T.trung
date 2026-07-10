/**
 * Speech Synthesis TTS utility for Chinese and Vietnamese voice output.
 */

export function speakChinese(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // Cancel any active speech first
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";

  // Try to find a premium Chinese voice if available
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find(
    (voice) => voice.lang.includes("zh") || voice.lang.includes("ZH")
  );
  if (zhVoice) {
    utterance.voice = zhVoice;
  }
  
  utterance.rate = 0.8; // Speak slightly slower for learning clarity
  window.speechSynthesis.speak(utterance);
}

export function speakVietnamese(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";

  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(
    (voice) => voice.lang.includes("vi") || voice.lang.includes("VI")
  );
  if (viVoice) {
    utterance.voice = viVoice;
  }

  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}
