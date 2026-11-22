// "wiki" mode: the intro of a random Wikipedia article, cleaned so every character can be typed on a normal keyboard.
const MAX_WORDS = 60, MIN_WORDS = 22
const TYPEABLE = /^[\p{Script=Latin}0-9.,;:¿?¡!'"%/-]+$/u

export function cleanExtract(text: string): string[] | null {
  if (/puede referirse a|may refer to|desambiguaci/i.test(text)) return null
  let t = text
  while (/\([^()]*\)/.test(t)) t = t.replace(/\s*\([^()]*\)/g, '') // dates, pronunciations, translations
  t = t.replace(/[“”«»„]/g, '"').replace(/[‘’ʼ]/g, "'").replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/\s+/g, ' ')
  const words = t.split(' ').filter(w => w && TYPEABLE.test(w)) // words in other scripts are dropped
  // stop at the end of a sentence near the limit
  let end = Math.min(words.length, MAX_WORDS)
  for (let i = end; i > MIN_WORDS; i--) if (/[.!?]$/.test(words[i - 1])) { end = i; break }
  const out = words.slice(0, end)
  return out.length >= MIN_WORDS ? out : null
}

export type Article = { words: string[]; by: string; url: string }

// five random articles per request; the first one long enough wins (a few tries for stub-heavy days)
export async function randomArticle(lang: string): Promise<Article | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=random&grnnamespace=0&grnlimit=5`
      + '&prop=extracts|info&inprop=url&exintro=1&explaintext=1&exlimit=5'
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const pages = Object.values((await res.json())?.query?.pages ?? {}) as { title: string; extract?: string; fullurl: string }[]
    for (const p of pages) {
      const words = p.extract ? cleanExtract(p.extract) : null
      if (words) return { words, by: `${p.title} · Wikipedia`, url: p.fullurl }
    }
  }
  return null
}
