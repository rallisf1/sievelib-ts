import { describe, expect, it } from "vitest";
import { Parser } from "../src/parser.js";
import { FiltersSet } from "../src/factory.js";
import { quote, unquote } from "../src/tools.js";

describe("Sieve parser", () => {
  it("parses, walks, and serializes an extension-backed rule", () => {
    const p = new Parser();
    expect(p.parse('require ["fileinto", "copy"]; if header :contains "Subject" "hello" { fileinto :copy "Inbox"; }')).toBe(true);
    expect([...p.result[1].walk()].map(x => x.name)).toEqual(["if", "header", "fileinto"]);
    expect(p.toSieve()).toContain('fileinto :copy "Inbox";');
  });
  it("reports missing extension", () => { const p=new Parser(); expect(p.parse('fileinto "Inbox";')).toBe(false); expect(p.error).toContain("extension 'fileinto' not loaded"); });
  it("quotes Sieve strings", () => expect(unquote(quote('a"\\b'))).toBe('a"\\b'));
});
describe("FiltersSet", () => {
  it("builds and disables a filter", () => { const f=new FiltersSet("test"); f.addfilter("rule", [["Subject",":is","hi"]], [["fileinto","Inbox"]]); expect(f.toSieve()).toContain('require ["fileinto"];'); expect(f.disablefilter("rule")).toBe(true); expect(f.toSieve()).toContain("if false"); expect(f.enablefilter("rule")).toBe(true); });
});
