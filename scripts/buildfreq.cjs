// Rebuilds src/data/freq/*.ts. Download the sources first, e.g. for es:
//   curl -L https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt -o <dir>/es.txt
// (pt uses pt_br). Then: node scripts/buildfreq.cjs <dir> src/data/freq
// Builds src/data/freq/<lang>.ts from FrequencyWords (CC BY-SA 4.0): 10k most frequent typeable words per language.
const fs = require('fs'), path = require('path')
const [src, out] = process.argv.slice(2)
const LANGS = { es: 'es', en: 'en', pt: 'pt_br', fr: 'fr', de: 'de', it: 'it', nl: 'nl', pl: 'pl' }
const SINGLE = { es: 'aeyou', en: 'ai', pt: 'aeoéà', fr: 'aày', de: '', it: 'aeèo', nl: '', pl: 'aiouwz' } // one-letter words that exist
// swear words and slurs never show up in a test (prefix match, so plurals and conjugations go too)
const BLOCK = {
  es: 'puta puto mierd cabr pendej joder coño verga chinga marica zorra culero cojon polla follar',
  en: 'fuck shit bitch cunt dick cock pussy slut whore nigg fag retard semen porn bastard asshole',
  pt: 'porra merda caralh puta foder fodi buceta viado cuzão bosta piranha',
  fr: 'merde putain salop connard conne enculé pute bite niquer bordel',
  de: 'scheiß scheiss fick arschloch hure schlampe fotze schwanz wichser',
  it: 'cazz merd puttan stronz vaffanc troia fott coglion',
  nl: 'kut kanker hoer klootzak godverdomme tering lul neuk',
  pl: 'kurw chuj pierd jeba jeb spierdal pizd',
}
fs.mkdirSync(out, { recursive: true })
for (const [lang, file] of Object.entries(LANGS)) {
  const seen = new Set(), words = []
  for (const line of fs.readFileSync(path.join(src, file + '.txt'), 'utf8').split('\n')) {
    const w = line.split(' ')[0]?.trim().toLowerCase()
    if (!w || !/^\p{L}+$/u.test(w) || seen.has(w)) continue
    if ([...w].length === 1 && !SINGLE[lang].includes(w)) continue
    if ((BLOCK[lang] + ' ' + BLOCK.en + ' semen').split(' ').some(b => w.startsWith(b))) continue // English swearing shows up in every language's subtitles
    seen.add(w); words.push(w)
    if (words.length === 10000) break
  }
  fs.writeFileSync(path.join(out, lang + '.ts'),
    `// ${lang}: 10,000 most frequent words, from FrequencyWords by Hermit Dave (OpenSubtitles 2018), CC BY-SA 4.0.\n` +
    `// https://github.com/hermitdave/FrequencyWords · filtered to letters only. Ordered by frequency.\nexport default '${words.join(' ')}'\n`)
  console.log(lang, words.length, '|', words.slice(0, 8).join(' '), '…', words.slice(4990, 4996).join(' '), '…', words.slice(-5).join(' '))
}
