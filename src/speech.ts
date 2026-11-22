// Dictation: reads text aloud with the browser's built-in voices (no audio files, works offline on most systems)
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string, lang: string, rate = 0.9) {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel() // a new chunk replaces whatever is still being read
  const u = new SpeechSynthesisUtterance(text)
  const tags: Record<string, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', nl: 'nl-NL', pl: 'pl-PL' }
  u.lang = tags[lang] ?? 'es-ES'
  // prefer a local voice of the right language; the browser picks one if none matches
  const voices = synth.getVoices().filter(v => v.lang.toLowerCase().startsWith(u.lang.slice(0, 2)))
  u.voice = voices.find(v => v.localService) ?? voices[0] ?? null
  u.rate = rate
  synth.speak(u)
}
export const stopSpeaking = () => { if (canSpeak()) window.speechSynthesis.cancel() }
