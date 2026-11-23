// More multi-line snippets for "bloque" mode (added to the ones in codeBlocks.ts). Real indentation; the app places it.
const more: Record<string, string[]> = {
  js: [
`const counts = {};
for (const word of text.toLowerCase().split(/\\s+/)) {
  counts[word] = (counts[word] || 0) + 1;
}
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);`,
`class EventBus {
  constructor() {
    this.handlers = new Map();
  }
  on(event, fn) {
    const list = this.handlers.get(event) || [];
    this.handlers.set(event, [...list, fn]);
  }
  emit(event, data) {
    (this.handlers.get(event) || []).forEach(fn => fn(data));
  }
}`,
`export function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}`,
`const unique = (items, key) => {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
};`],
  ts: [
`interface Todo {
  id: number;
  title: string;
  done: boolean;
}

function toggle(todos: Todo[], id: number): Todo[] {
  return todos.map(t => (t.id === id ? { ...t, done: !t.done } : t));
}`,
`async function retry<T>(fn: () => Promise<T>, times = 3): Promise<T> {
  for (let i = 0; i < times - 1; i++) {
    try {
      return await fn();
    } catch {
      await new Promise(r => setTimeout(r, 2 ** i * 100));
    }
  }
  return fn();
}`,
`enum Status {
  Idle = "idle",
  Loading = "loading",
  Done = "done",
}

const labels: Record<Status, string> = {
  [Status.Idle]: "en espera",
  [Status.Loading]: "cargando",
  [Status.Done]: "listo",
};`,
`export class Cache<K, V> {
  private store = new Map<K, { value: V; expires: number }>();

  set(key: K, value: V, ttl: number) {
    this.store.set(key, { value, expires: Date.now() + ttl });
  }

  get(key: K): V | undefined {
    const hit = this.store.get(key);
    return hit && hit.expires > Date.now() ? hit.value : undefined;
  }
}`],
  py: [
`from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

    def distance(self, other):
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5`,
`def binary_search(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
`import json

def load_config(path, defaults=None):
    try:
        with open(path) as f:
            return {**(defaults or {}), **json.load(f)}
    except FileNotFoundError:
        return defaults or {}`,
`def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]

for batch in chunks(list(range(10)), 3):
    print(batch)`],
  java: [
`public static boolean isPalindrome(String text) {
    String s = text.toLowerCase().replaceAll("[^a-z0-9]", "");
    int i = 0, j = s.length() - 1;
    while (i < j) {
        if (s.charAt(i++) != s.charAt(j--)) return false;
    }
    return true;
}`,
`public record Point(int x, int y) {
    public Point move(int dx, int dy) {
        return new Point(x + dx, y + dy);
    }
}`,
`List<String> lines = Files.readAllLines(Path.of("datos.txt"));
long count = lines.stream()
    .filter(line -> !line.isBlank())
    .count();
System.out.println("líneas: " + count);`,
`public int fib(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        int next = a + b;
        a = b;
        b = next;
    }
    return a;
}`],
  c: [
`void reverse(char *s) {
    int i = 0, j = strlen(s) - 1;
    while (i < j) {
        char tmp = s[i];
        s[i++] = s[j];
        s[j--] = tmp;
    }
}`,
`int max(const int *arr, int n) {
    int best = arr[0];
    for (int i = 1; i < n; i++)
        if (arr[i] > best) best = arr[i];
    return best;
}`,
`FILE *f = fopen("datos.txt", "r");
if (f == NULL) {
    perror("fopen");
    return 1;
}
char line[256];
while (fgets(line, sizeof line, f)) printf("%s", line);
fclose(f);`,
`typedef struct {
    double x, y;
} vec2;

vec2 add(vec2 a, vec2 b) {
    return (vec2){ a.x + b.x, a.y + b.y };
}`],
  cpp: [
`std::map<std::string, int> count_words(const std::string& text) {
    std::map<std::string, int> counts;
    std::istringstream in(text);
    std::string word;
    while (in >> word) counts[word]++;
    return counts;
}`,
`auto evens = std::vector<int>{};
std::copy_if(nums.begin(), nums.end(), std::back_inserter(evens),
             [](int n) { return n % 2 == 0; });`,
`class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Circle : public Shape {
public:
    explicit Circle(double r) : r(r) {}
    double area() const override { return 3.14159 * r * r; }
private:
    double r;
};`,
`int main() {
    std::vector<int> v = {5, 3, 8, 1};
    std::sort(v.begin(), v.end(), std::greater<>());
    for (int x : v) std::cout << x << ' ';
    return 0;
}`],
  cs: [
`public static bool IsPrime(int n)
{
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++)
    {
        if (n % i == 0) return false;
    }
    return true;
}`,
`public class Stack<T>
{
    private readonly List<T> items = new();

    public void Push(T item) => items.Add(item);

    public T Pop()
    {
        var last = items[^1];
        items.RemoveAt(items.Count - 1);
        return last;
    }
}`,
`var groups = orders
    .GroupBy(o => o.Customer)
    .Select(g => new { Customer = g.Key, Total = g.Sum(o => o.Amount) })
    .OrderByDescending(x => x.Total);`,
`try
{
    var text = await File.ReadAllTextAsync("datos.txt");
    Console.WriteLine(text.Length);
}
catch (FileNotFoundException ex)
{
    Console.WriteLine($"no existe: {ex.FileName}");
}`],
  go: [
`func reverse(s string) string {
\trunes := []rune(s)
\tfor i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
\t\trunes[i], runes[j] = runes[j], runes[i]
\t}
\treturn string(runes)
}`,
`type Stack[T any] struct {
\titems []T
}

func (s *Stack[T]) Push(v T) {
\ts.items = append(s.items, v)
}`,
`func worker(jobs <-chan int, results chan<- int) {
\tfor n := range jobs {
\t\tresults <- n * n
\t}
}`,
`counts := map[string]int{}
for _, word := range strings.Fields(text) {
\tcounts[strings.ToLower(word)]++
}
fmt.Println(len(counts), "palabras distintas")`],
  rs: [
`fn word_count(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    counts
}`,
`#[derive(Debug, Clone, PartialEq)]
enum Shape {
    Circle { r: f64 },
    Rect { w: f64, h: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { r } => std::f64::consts::PI * r * r,
            Shape::Rect { w, h } => w * h,
        }
    }
}`,
`fn parse_port(s: &str) -> Result<u16, String> {
    s.parse::<u16>().map_err(|e| format!("puerto inválido: {e}"))
}`,
`let evens: Vec<i32> = (1..=20)
    .filter(|n| n % 2 == 0)
    .map(|n| n * n)
    .collect();
println!("{:?}", evens);`],
  php: [
`function isPalindrome(string $s): bool {
    $clean = preg_replace('/[^a-z0-9]/', '', strtolower($s));
    return $clean === strrev($clean);
}`,
`$total = 0;
foreach ($cart as $item) {
    $total += $item['price'] * $item['qty'];
}
echo "Total: " . number_format($total, 2);`,
`enum Status: string {
    case Active = 'active';
    case Banned = 'banned';

    public function label(): string {
        return match ($this) {
            Status::Active => 'activo',
            Status::Banned => 'bloqueado',
        };
    }
}`,
`$users = array_filter($users, fn($u) => $u['active']);
usort($users, fn($a, $b) => $a['name'] <=> $b['name']);
foreach ($users as $user) {
    echo $user['name'] . PHP_EOL;
}`],
  rb: [
`def palindrome?(text)
  clean = text.downcase.gsub(/[^a-z0-9]/, "")
  clean == clean.reverse
end`,
`Point = Struct.new(:x, :y) do
  def distance(other)
    Math.sqrt((x - other.x)**2 + (y - other.y)**2)
  end
end`,
`totals = orders.group_by(&:customer).transform_values do |list|
  list.sum(&:amount)
end
totals.sort_by { |_, total| -total }.first(3).each do |name, total|
  puts "#{name}: #{total}"
end`,
`File.open("log.txt", "a") do |file|
  file.puts "#{Time.now} inicio"
end`],
  kt: [
`fun isPalindrome(text: String): Boolean {
    val clean = text.lowercase().filter { it.isLetterOrDigit() }
    return clean == clean.reversed()
}`,
`sealed class Result<out T> {
    data class Ok<T>(val value: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
}`,
`val totals = orders
    .groupBy { it.customer }
    .mapValues { (_, list) -> list.sumOf { it.amount } }
    .toList()
    .sortedByDescending { it.second }`,
`suspend fun loadAll(ids: List<Int>): List<User> = coroutineScope {
    ids.map { id ->
        async { api.getUser(id) }
    }.awaitAll()
}`],
  swift: [
`func isPalindrome(_ text: String) -> Bool {
    let clean = text.lowercased().filter { $0.isLetter || $0.isNumber }
    return clean == String(clean.reversed())
}`,
`enum Direction {
    case north, south, east, west

    var opposite: Direction {
        switch self {
        case .north: return .south
        case .south: return .north
        case .east: return .west
        case .west: return .east
        }
    }
}`,
`struct User: Codable {
    let id: Int
    let name: String
}

let user = try JSONDecoder().decode(User.self, from: data)
print(user.name)`,
`let totals = Dictionary(grouping: orders, by: \\.customer)
    .mapValues { $0.reduce(0) { $0 + $1.amount } }`],
  sql: [
`SELECT category, AVG(price) AS avg_price
FROM products
WHERE stock > 0
GROUP BY category
ORDER BY avg_price DESC
LIMIT 5;`,
`INSERT INTO users (name, email)
VALUES ('Ana', 'ana@example.com'),
       ('Luis', 'luis@example.com')
ON CONFLICT (email) DO NOTHING;`,
`WITH monthly AS (
  SELECT date_trunc('month', created_at) AS month, SUM(total) AS revenue
  FROM orders
  GROUP BY 1
)
SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) AS change
FROM monthly;`,
`UPDATE products
SET price = price * 1.10
WHERE category = 'teclados'
  AND price < 100;`],
  html: [
`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Mi página</title>
  </head>
  <body>
    <h1>Hola</h1>
  </body>
</html>`,
`<ul class="tareas">
  <li><input type="checkbox" checked> comprar teclado</li>
  <li><input type="checkbox"> practicar 30 minutos</li>
</ul>`,
`<table>
  <tr>
    <th>nombre</th>
    <th>wpm</th>
  </tr>
  <tr>
    <td>Ana</td>
    <td>120</td>
  </tr>
</table>`,
`<button type="button" class="btn" aria-label="cerrar" onclick="cerrar()">
  <svg width="16" height="16" aria-hidden="true"></svg>
</button>`],
  css: [
`:root {
  --bg: #101113;
  --text: #ededed;
  --accent: #c9a7ff;
}

body {
  background: var(--bg);
  color: var(--text);
}`,
`.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: transform 120ms ease;
}

.btn:hover {
  transform: translateY(-1px);
}`,
`.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}`,
`@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.card {
  animation: fade-in 300ms ease-out both;
}`],
  sh: [
`#!/bin/bash
set -euo pipefail

for dir in */; do
  echo "\${dir%/}: $(ls "$dir" | wc -l) archivos"
done`,
`if [ -z "$1" ]; then
  echo "uso: $0 <archivo>"
  exit 1
fi
wc -l "$1"`,
`count=0
while read -r line; do
  [[ "$line" == *ERROR* ]] && count=$((count + 1))
done < app.log
echo "errores: $count"`,
`deploy() {
  npm run build && git push origin main
  echo "desplegado a las $(date +%H:%M)"
}`],
}
export default more
