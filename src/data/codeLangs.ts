// Tokens per programming language: keywords, built-ins, common identifiers and the symbols each one uses.
// Whitespace-separated; duplicates are removed on load.
const langs: Record<string, string> = {
  js: `
const let var function return if else for while do switch case break continue new this class extends super
import export from default async await try catch finally throw typeof instanceof null undefined true false
=> === !== && || ?? ?. ... {} [] () ; , . = += -= ++ --
console.log document querySelector addEventListener fetch then JSON.parse JSON.stringify Object.keys
Array.isArray map filter reduce forEach find some every includes push pop slice splice join split
length Math.max Math.min Math.floor Math.round Math.random setTimeout clearTimeout setInterval
Promise.all resolve reject Date.now localStorage window event target value key index item items list
user data result error response options config state props id name count total i j x y`,
  ts: `
const let function return if else for of in while class interface type enum implements extends readonly
public private protected static abstract import export from as async await keyof typeof infer never unknown
any void string number boolean null undefined true false Record Partial Pick Omit Required Readonly
Promise<void> Array<string> Map<string, number> Set<number> => : ? | & <T> extends T[] {} [] () ;
console.log JSON.parse map filter reduce find includes Object.entries Object.keys length push
props state user data result error id name value items config options type Props State User`,
  py: `
def return if elif else for in while break continue pass class import from as with try except finally
raise lambda yield global nonlocal assert del not and or is None True False self cls __init__ __name__
print len range enumerate zip map filter sorted list dict set tuple str int float bool open input
isinstance append extend pop keys values items get join split strip format f"" .upper() .lower()
[] {} () : , . = == != += -= ** // % -> @property @staticmethod
if __name__ == "__main__": main() numpy pandas requests json os sys path data result item value count`,
  java: `
public private protected static final abstract class interface extends implements new return if else
for while do switch case break continue try catch finally throw throws void int long double float
boolean char byte short String Integer List ArrayList Map HashMap Set HashSet Optional Stream
System.out.println main args this super null true false import package @Override @Autowired
.size() .get() .put() .add() .stream() .map() .filter() .collect() Collectors.toList() equals hashCode
toString length charAt substring {} [] () ; . = == != && || ++ -> :: < >
user id name value list map result items count index Exception RuntimeException`,
  c: `
int char float double long short unsigned signed void const static extern struct union enum typedef
sizeof return if else for while do switch case break continue goto default NULL
#include <stdio.h> <stdlib.h> <string.h> #define printf scanf malloc calloc realloc free memcpy memset
strlen strcpy strcmp fopen fclose fprintf fgets size_t uint8_t int32_t main argc argv
* & -> . [] {} () ; , = == != += -= ++ -- << >> && || ! % %d %s \\n
buf len ptr node next head count i j n result value`,
  cpp: `
int char double float bool void auto const constexpr static class struct public private protected
virtual override template typename namespace using return if else for while switch case break
new delete nullptr true false this try catch throw std::vector std::string std::map std::unordered_map
std::cout std::endl std::cin std::move std::make_unique std::shared_ptr std::unique_ptr std::sort
#include <iostream> <vector> push_back emplace_back size begin end find insert erase at
:: -> << >> & * {} [] () <> ; = == != ++ && || const& auto&
main argc argv value result node item count i j n`,
  cs: `
public private protected internal static readonly const class interface struct record enum namespace
using new return if else for foreach in while switch case break continue try catch finally throw
void int long double decimal bool string var object null true false this base async await Task
List<int> Dictionary<string, int> IEnumerable<T> Console.WriteLine string.Join .Count .Add() .Where()
.Select() .ToList() .FirstOrDefault() Linq get; set; => ?? ?. {} [] () ; = == != && ||
Main args Program value result items user id name`,
  go: `
package main import func return if else for range switch case default break continue go defer
select chan map struct interface type var const nil true false make new len cap append copy delete
fmt.Println fmt.Printf fmt.Sprintf errors.New err != nil string int int64 float64 bool byte rune
error context.Context http.HandleFunc json.Marshal strings.Split strconv.Itoa time.Now
:= <- ... {} [] () ; , . = == != && || ++
ctx w r req res data result value items user id name i n`,
  rs: `
fn let mut const static struct enum impl trait pub use mod crate self Self super return if else
match loop while for in break continue as move ref where async await dyn Box Rc Arc RefCell
Vec String &str Option Some None Result Ok Err i32 i64 u8 u32 u64 usize f64 bool char
println! vec! format! panic! unwrap expect ? clone iter map filter collect len push to_string
#[derive(Debug)] -> => :: & &mut {} [] () ; = == != && || .. ..=
self value result items data name id count i n`,
  php: `
<?php function return if else elseif foreach as for while switch case break continue class
public private protected static new extends implements interface namespace use try catch throw
echo print array null true false isset empty unset count strlen str_replace explode implode
json_encode json_decode array_map array_filter in_array $this $data $result $value $items $user
$id $name $request $response -> => :: . .= == === != !== && || ?? [] () {} ;`,
  rb: `
def end class module if elsif else unless while until for in do return yield self nil true false
require attr_accessor attr_reader puts print p each map select reject reduce each_with_index
times upto include? empty? nil? to_s to_i to_a length size push pop first last join split
private protected begin rescue ensure raise lambda proc :symbol @name @value @items
|x| |item| => -> && || == != += << {} [] () . ,
user data result value items name id count`,
  kt: `
fun val var return if else when for in while do break continue class object data sealed open
override private public internal companion interface enum import package null true false this it
String Int Long Double Boolean List MutableList Map listOf mutableListOf mapOf setOf println
let apply also run with map filter forEach first firstOrNull isEmpty size toString
suspend launch async coroutineScope ?. ?: !! -> :: .. {} [] () : = == !=
value result items user id name data count`,
  swift: `
func let var return if else guard switch case default for in while repeat break continue class
struct enum protocol extension import init self Self nil true false try catch throw throws async
await String Int Double Bool Array Dictionary Optional print map filter reduce forEach count
isEmpty append first last @State @Published @MainActor some View var body: some View
-> ?? ?. ! { } [] () : = == != && ||
value result items user id name data index`,
  sql: `
SELECT FROM WHERE AND OR NOT IN IS NULL LIKE BETWEEN ORDER BY GROUP HAVING LIMIT OFFSET AS
JOIN LEFT RIGHT INNER OUTER ON UNION DISTINCT INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE
ALTER DROP INDEX PRIMARY KEY FOREIGN REFERENCES DEFAULT UNIQUE CHECK CONSTRAINT VIEW
COUNT(*) SUM AVG MIN MAX COALESCE NOW() CAST CASE WHEN THEN ELSE END EXISTS WITH
users orders products id name email created_at user_id total price status * = <> >= <= , ; ()`,
  html: `
<!DOCTYPE html> <html> <head> <body> <title> <meta> <link> <script> <style> <div> <span> <p>
<a> <img> <ul> <ol> <li> <h1> <h2> <h3> <header> <main> <footer> <nav> <section> <article>
<form> <input> <button> <label> <select> <option> <textarea> <table> <tr> <td> <th> </div>
</p> </a> </li> </ul> </button> class="" id="" href="" src="" alt="" type="" name="" value=""
charset="utf-8" rel="stylesheet" placeholder="" disabled required <br> <hr> &nbsp;`,
  css: `
display: flex; grid; block; none; position: relative; absolute; fixed; sticky; top: left: right:
bottom: margin: padding: width: height: max-width: min-height: color: background: border:
border-radius: font-size: font-weight: line-height: gap: align-items: center; justify-content:
transition: transform: opacity: z-index: overflow: hidden; cursor: pointer; box-shadow:
:root --color var(--accent) calc() rem em px % vh vw 1fr repeat() @media :hover ::before
.card .btn #app * > + ~ {} ; ! !important`,
  sh: `
#!/bin/bash echo cd ls pwd mkdir rm cp mv cat grep sed awk find xargs chmod chown sudo export
source alias if then else fi for in do done while case esac function return exit read local
git add commit push pull status log checkout branch merge clone npm install run build docker
curl wget ssh tar -rf -la -v -p | > >> < && || $ $1 $@ $HOME $PATH "$var" ~/ ./ ../ 2>&1 /dev/null`,
}
export default langs
