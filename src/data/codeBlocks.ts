// Multi-line snippets for "bloque" mode, and each language's keywords (shown a little brighter while you type).
// Indentation here is real; the app places it automatically, you only type the code and Enter.
const blocks: Record<string, { kw: string; code: string[] }> = {
  js: { kw: 'const let function return if else for of while async await new class export import from try catch', code: [
`function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}`,
`async function loadUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error(res.statusText);
  const user = await res.json();
  return { ...user, name: user.name.trim() };
}`] },
  ts: { kw: 'const let function return if else type interface export import from async await extends keyof', code: [
`type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function parse(input: string): Result<number> {
  const n = Number(input);
  if (Number.isNaN(n)) return { ok: false, error: "no es un número" };
  return { ok: true, value: n };
}`,
`export function groupBy<T, K extends keyof T>(items: T[], key: K) {
  const map = new Map<T[K], T[]>();
  for (const item of items) {
    const list = map.get(item[key]) ?? [];
    map.set(item[key], [...list, item]);
  }
  return map;
}`] },
  py: { kw: 'def return if elif else for in while import from class with as try except not and or None True False', code: [
`def word_count(path):
    counts = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            for word in line.lower().split():
                counts[word] = counts.get(word, 0) + 1
    return sorted(counts.items(), key=lambda kv: -kv[1])`,
`class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if not self.items:
            raise IndexError("pila vacía")
        return self.items.pop()`] },
  java: { kw: 'public private static final class void int return if else for new String', code: [
`public static int binarySearch(int[] arr, int target) {
    int lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
`public class Counter {
    private int count = 0;

    public void increment() {
        count++;
    }

    public int get() {
        return count;
    }
}`] },
  c: { kw: 'int char void return if else for while struct const sizeof NULL', code: [
`int sum(const int *arr, int n) {
    int total = 0;
    for (int i = 0; i < n; i++) {
        total += arr[i];
    }
    return total;
}`,
`struct node {
    int value;
    struct node *next;
};

void push(struct node **head, int value) {
    struct node *n = malloc(sizeof *n);
    n->value = value;
    n->next = *head;
    *head = n;
}`] },
  cpp: { kw: 'int auto const return if else for while class struct public private template typename std', code: [
`template <typename T>
T max_of(const std::vector<T>& v) {
    T best = v.front();
    for (const auto& x : v) {
        if (x > best) best = x;
    }
    return best;
}`,
`class Timer {
public:
    void start() { begin = clock::now(); }
    double ms() const {
        return std::chrono::duration<double, std::milli>(clock::now() - begin).count();
    }
private:
    using clock = std::chrono::steady_clock;
    clock::time_point begin;
};`] },
  cs: { kw: 'public private static class void int string var return if else foreach in new async await', code: [
`public static Dictionary<string, int> CountWords(string text)
{
    var counts = new Dictionary<string, int>();
    foreach (var word in text.ToLower().Split(' '))
    {
        counts[word] = counts.GetValueOrDefault(word) + 1;
    }
    return counts;
}`,
`public async Task<User?> GetUserAsync(int id)
{
    var response = await http.GetAsync($"/api/users/{id}");
    if (!response.IsSuccessStatusCode) return null;
    return await response.Content.ReadFromJsonAsync<User>();
}`] },
  go: { kw: 'func return if else for range package import var type struct err nil', code: [
`func readLines(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return strings.Split(string(data), "\\n"), nil
}`,
`type Server struct {
	addr string
	mux  *http.ServeMux
}

func (s *Server) Start() error {
	s.mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	return http.ListenAndServe(s.addr, s.mux)
}`] },
  rs: { kw: 'fn let mut return if else for in match impl struct pub use Some None Ok Err self', code: [
`fn average(nums: &[f64]) -> Option<f64> {
    if nums.is_empty() {
        return None;
    }
    let sum: f64 = nums.iter().sum();
    Some(sum / nums.len() as f64)
}`,
`impl Stack {
    pub fn push(&mut self, value: i32) {
        self.items.push(value);
    }

    pub fn pop(&mut self) -> Option<i32> {
        self.items.pop()
    }
}`] },
  php: { kw: 'function return if else foreach as public private class new echo', code: [
`function slugify(string $text): string {
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}`,
`class UserRepository {
    public function __construct(private PDO $db) {}

    public function find(int $id): ?array {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }
}`] },
  rb: { kw: 'def end class if else unless return do each map self', code: [
`def word_count(text)
  text.downcase.split.each_with_object(Hash.new(0)) do |word, counts|
    counts[word] += 1
  end
end`,
`class Stack
  def initialize
    @items = []
  end

  def push(item)
    @items.push(item)
    self
  end
end`] },
  kt: { kw: 'fun val var return if else when for in class data object null', code: [
`fun fizzBuzz(n: Int): String = when {
    n % 15 == 0 -> "FizzBuzz"
    n % 3 == 0 -> "Fizz"
    n % 5 == 0 -> "Buzz"
    else -> n.toString()
}`,
`data class User(val id: Int, val name: String)

fun List<User>.namesById(): Map<Int, String> {
    return associate { user ->
        user.id to user.name
    }
}`] },
  swift: { kw: 'func let var return if else guard for in struct class some View', code: [
`func average(_ nums: [Double]) -> Double? {
    guard !nums.isEmpty else { return nil }
    let total = nums.reduce(0, +)
    return total / Double(nums.count)
}`,
`struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Toques: \\(count)") {
            count += 1
        }
    }
}`] },
  sql: { kw: 'SELECT FROM WHERE JOIN ON GROUP BY ORDER HAVING AS AND LIMIT', code: [
`SELECT u.name, COUNT(o.id) AS orders
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.name
HAVING COUNT(o.id) > 2
ORDER BY orders DESC;`,
`CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`] },
  html: { kw: '', code: [
`<form class="login">
  <label>correo
    <input type="email" name="email" required>
  </label>
  <button type="submit">entrar</button>
</form>`,
`<nav class="menu">
  <a href="/">inicio</a>
  <a href="/blog">blog</a>
  <a href="/contacto">contacto</a>
</nav>`] },
  css: { kw: '', code: [
`.card {
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--surface);
}`,
`@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .sidebar {
    display: none;
  }
}`] },
  sh: { kw: 'if then else fi for in do done function return echo local', code: [
`for file in *.log; do
  if [ -s "$file" ]; then
    gzip "$file"
    echo "comprimido: $file"
  fi
done`,
`backup() {
  local dest="$HOME/backups/$(date +%F)"
  mkdir -p "$dest"
  cp -r ./src "$dest"
  echo "respaldo en $dest"
}`] },
}
export default blocks
