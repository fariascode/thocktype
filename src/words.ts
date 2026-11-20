// shortcut: small built-in lists, move to JSON files per language when adding more languages
const es = `de la que el en y a los se del las un por con no una su para es al lo como más o pero sus le ha me si sin sobre este ya entre cuando todo esta ser son dos también fue había era muy años hasta desde está mi porque qué sólo han yo hay vez puede todos así nos ni parte tiene él uno donde bien tiempo mismo ese ahora cada e vida otro después te otros aunque esa eso hace otra gobierno tan durante siempre día tanto ella tres sí dijo sido gran país según menos mundo año antes estado contra sino forma caso nada hacer general estaba poco estos presidente mayor ante unos les algo hacia casa ellos ayer hecho primera mucho mientras además quien momento millones esto españa hombre están pues hoy lugar madrid nacional trabajo otras mejor nuevo decir algunos entonces todas días debe política cómo casi toda tal luego pasado primer medio va estas sea tenía nunca poder aquí ver veces embargo partido personas grupo cuenta pueden tienen misma nueva cual fueron mujer frente josé tras cosas fin ciudad he social manera tener sistema será historia muchos juan tipo cuatro dentro nuestro punto dice ello cualquier noche aún agua parece haber situación fuera bajo grandes nuestra ejemplo acuerdo habían usted estados hizo nadie países horas posible tarde ley importante guerra desarrollo proceso realidad sentido lado mí tu cambio allí mano eran estar san número sociedad unas centro padre gente final relación cuerpo obra incluso través último madre mis modo problema cinco carlos hombres información ojos muerte nombre algunas público mujeres siglo todavía meses mañana esos nosotros hora muchas pueblo alguna dar problemas don da tú derecho verdad maría unidos podría sería junto cabeza aquel luis cuanto tierra equipo segundo director dicho cierto casos manos nivel podía familia largo partir falta llegar propio ministro cosa primero seguridad hemos mal trata algún tuvo respecto semana varios real sé voz paso señor mil quiere habría lucha tecla rápido escribir teclado palabra niño año corazón canción música`
const en = `the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold govern around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line keyboard quick type speed letter music light night water city`
const code = `const let var function return if else for while switch case break continue import export from default class extends new this null undefined true false async await try catch finally throw typeof instanceof => {} [] () ; === !== && || ?? ?. ++ -- += console.log() map() filter() reduce() forEach() push() length props state useState() useEffect() def print() self lambda None True False int str list dict len() range() public static void main() string bool <div> </div> npm git commit merge`

const lists: Record<string, string[]> = { es: es.split(' '), en: en.split(' '), code: code.split(' ') }

export const LANGS = { es: 'español', en: 'english', code: 'código' } as const
export type Lang = keyof typeof LANGS

// shortcut: a handful of quotes per language, move to a JSON file when the collection grows
const quotes: Record<Lang, { text: string; by: string }[]> = {
  es: [
    { text: 'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.', by: 'Miguel de Cervantes' },
    { text: 'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.', by: 'Gabriel García Márquez' },
    { text: 'Caminante, no hay camino, se hace camino al andar.', by: 'Antonio Machado' },
    { text: 'Podrán cortar todas las flores, pero no podrán detener la primavera.', by: 'Pablo Neruda' },
    { text: 'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.', by: 'Gabriel García Márquez' },
    { text: 'Andábamos sin buscarnos, pero sabiendo que andábamos para encontrarnos.', by: 'Julio Cortázar' },
    { text: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.', by: 'Miguel de Cervantes' },
  ],
  en: [
    { text: 'The only way to do great work is to love what you do. If you have not found it yet, keep looking. Do not settle.', by: 'Steve Jobs' },
    { text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.', by: 'Charles Dickens' },
    { text: 'Simplicity is prerequisite for reliability.', by: 'Edsger Dijkstra' },
    { text: 'Do not go where the path may lead, go instead where there is no path and leave a trail.', by: 'Ralph Waldo Emerson' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', by: 'Will Durant' },
    { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', by: 'Martin Fowler' },
  ],
  code: [
    { text: 'const sum = (a, b) => a + b; console.log(sum(2, 3));', by: 'javascript' },
    { text: 'for (let i = 0; i < items.length; i++) { if (items[i].done) count++; }', by: 'javascript' },
    { text: 'def fib(n): return n if n < 2 else fib(n - 1) + fib(n - 2)', by: 'python' },
    { text: 'const [state, setState] = useState(0); useEffect(() => { document.title = `${state}`; }, [state]);', by: 'react' },
    { text: 'SELECT name, COUNT(*) FROM users WHERE active = 1 GROUP BY name ORDER BY 2 DESC;', by: 'sql' },
    { text: 'git checkout -b feat/nueva && git commit -m "feat: algo nuevo" && git push', by: 'shell' },
  ],
}

export function randomQuote(lang: Lang) {
  const q = quotes[lang][Math.floor(Math.random() * quotes[lang].length)]
  return { words: q.text.split(' '), by: q.by }
}

const pick =<T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export type WordOpts = { punct?: boolean; numbers?: boolean }

// punct: capitals + punctuation (ignored for code, which already has symbols); numbers: mixes in numbers
export function randomWords(lang: Lang, n: number, { punct = false, numbers = false }: WordOpts = {}): string[] {
  const list = lists[lang]
  const out: string[] = []
  let capNext = true
  for (let i = 0; i < n; i++) {
    let w = pick(list)
    if (numbers && Math.random() < 0.12) w = String(Math.floor(Math.random() * 10 ** (1 + Math.floor(Math.random() * 4))))
    if (punct && lang !== 'code') {
      if (capNext) w = w[0].toUpperCase() + w.slice(1)
      capNext = false
      const r = Math.random()
      if (r < 0.1) { w += pick(['.', '.', '?', '!']); capNext = true }
      else if (r < 0.2) w += pick([',', ',', ';', ':'])
      if (lang === 'es' && w.endsWith('?')) w = '¿' + w
    }
    out.push(w)
  }
  return out
}
