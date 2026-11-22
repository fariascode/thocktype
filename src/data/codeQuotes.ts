// One-line real-world snippets per language, for "cita" mode when a programming language is chosen
const snippets: Record<string, string[]> = {
  js: [
    'const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);',
    'document.querySelector("#btn").addEventListener("click", () => setOpen(!open));',
    'const res = await fetch(url); if (!res.ok) throw new Error(res.statusText); return res.json();',
    'export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };',
  ],
  ts: [
    'type User = { id: string; name: string; email?: string }; const users: User[] = [];',
    'function first<T>(list: T[]): T | undefined { return list.length ? list[0] : undefined; }',
    'export interface Props { title: string; onClose?: () => void; children: React.ReactNode }',
    'const byId = new Map<string, User>(users.map(u => [u.id, u]));',
  ],
  py: [
    'squares = [x * x for x in range(10) if x % 2 == 0]',
    'with open("data.txt", encoding="utf-8") as f: lines = [line.strip() for line in f]',
    'def fib(n: int) -> int: return n if n < 2 else fib(n - 1) + fib(n - 2)',
    'counts = {word: text.count(word) for word in set(text.split())}',
  ],
  java: [
    'List<String> names = users.stream().map(User::getName).collect(Collectors.toList());',
    'public static void main(String[] args) { System.out.println("Hola, mundo"); }',
    'Map<String, Integer> counts = new HashMap<>(); counts.merge(word, 1, Integer::sum);',
  ],
  c: [
    'for (int i = 0; i < n; i++) { sum += arr[i]; }',
    'char *buf = malloc(len + 1); if (buf == NULL) return -1;',
    'printf("%s tiene %d años\\n", name, age);',
  ],
  cpp: [
    'std::vector<int> v = {3, 1, 2}; std::sort(v.begin(), v.end());',
    'for (const auto& [key, value] : counts) std::cout << key << ": " << value << std::endl;',
    'auto ptr = std::make_unique<Node>(value); head = std::move(ptr);',
  ],
  cs: [
    'var adults = people.Where(p => p.Age >= 18).Select(p => p.Name).ToList();',
    'public record User(string Id, string Name, string? Email);',
    'Console.WriteLine($"Hola, {name}! Tienes {count} mensajes.");',
  ],
  go: [
    'func add(a int, b int) int { return a + b }',
    'if err != nil { return fmt.Errorf("leer archivo: %w", err) }',
    'for i, v := range nums { total += v * i }',
    'ch := make(chan int); go func() { ch <- 42 }(); fmt.Println(<-ch)',
  ],
  rs: [
    'fn main() { let v: Vec<i32> = (1..=5).map(|x| x * 2).collect(); println!("{:?}", v); }',
    'match value { Some(x) if x > 0 => x, _ => 0 }',
    'let file = File::open("data.txt")?; let reader = BufReader::new(file);',
  ],
  php: [
    '$names = array_map(fn($u) => $u["name"], $users);',
    'echo json_encode(["ok" => true, "count" => count($items)]);',
    'public function __construct(private string $name, private int $age) {}',
  ],
  rb: [
    'evens = (1..10).select { |n| n.even? }.map { |n| n * n }',
    'File.readlines("data.txt").each_with_index { |line, i| puts "#{i}: #{line}" }',
    'def greet(name = "mundo") = "Hola, #{name}"',
  ],
  kt: [
    'val adults = people.filter { it.age >= 18 }.map { it.name }',
    'data class User(val id: String, val name: String, val email: String? = null)',
    'fun main() { println("Hola, ${user?.name ?: "anónimo"}") }',
  ],
  swift: [
    'let adults = people.filter { $0.age >= 18 }.map(\\.name)',
    'guard let url = URL(string: path) else { return }',
    'struct ContentView: View { var body: some View { Text("Hola") } }',
  ],
  sql: [
    'SELECT name, COUNT(*) FROM users WHERE active = 1 GROUP BY name ORDER BY 2 DESC;',
    'UPDATE orders SET status = \'shipped\' WHERE id = 42;',
    'SELECT u.name, SUM(o.total) FROM users u JOIN orders o ON o.user_id = u.id GROUP BY u.name;',
  ],
  html: [
    '<a class="btn" href="/ranking">ver ranking</a>',
    '<input type="email" name="email" placeholder="tu correo" required>',
    '<img src="logo.png" alt="ThockType" width="120" height="40">',
  ],
  css: [
    '.card { display: grid; place-items: center; padding: 1rem; border-radius: 12px; }',
    '@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }',
    'button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgb(0 0 0 / .2); }',
  ],
  sh: [
    'git checkout -b feat/nueva && git commit -m "feat: algo nuevo" && git push',
    'grep -rn "TODO" src | wc -l',
    'docker run -d -p 8080:80 --name web nginx:latest',
    'find . -name "*.log" -mtime +7 -delete',
  ],
}
export default snippets
