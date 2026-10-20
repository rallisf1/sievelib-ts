import { Command, FalseCommand, IfCommand, NotCommand, RequireCommand, getCommandInstance } from "./commands.js";
import { quote, unquote, unquoteArg } from "./tools.js";
import type { Parser } from "./parser.js";

export class FilterAlreadyExists extends Error {}
export interface Filter { name: string; content: Command; enabled: boolean; description?: string; }
export type FilterCondition = readonly unknown[];
export type FilterAction = readonly unknown[];

export class FiltersSet {
  requires: string[] = [];
  filters: Filter[] = [];
  readonly supportedTests = ["true", "false", "size", "exists", "envelope", "address", "body", "currentdate"];
  constructor(public name: string, public filterNamePretext = "# Filter: ", public filterDescPretext = "# Description: ") {}
  toString() { return this.toSieve(); }
  require(name: string) { const value = name.replace(/^"|"$/g, ""); if (value && !this.requires.includes(value)) this.requires.push(value); }
  private find(name: string) { return this.filters.find((filter) => filter.name === name); }
  filterExists(name: string) { return !!this.find(name); }
  filter_exists(name: string) { return this.filterExists(name); }
  private addString(command: Command, value: unknown) {
    if (Array.isArray(value)) command.checkNextArg("stringlist", value.map((item) => quote(String(item))));
    else command.checkNextArg("string", quote(String(value)));
  }
  private static splitMatchTag(tag: string): [string, boolean] { return tag.startsWith(":not") ? [`:${tag.slice(4)}`, true] : [tag, false]; }

  private create(conditions: FilterCondition[], actions: FilterAction[], matchtype = "anyof") {
    const control = new IfCommand(); const group = getCommandInstance(matchtype, control);
    for (const original of conditions) {
      let condition = [...original]; let name = String(condition[0]); let negated = false;
      if (name === "header" && condition.length === 4) { condition = condition.slice(1); name = ""; }
      else if (name.startsWith("not") && this.supportedTests.includes(name.slice(3))) { name = name.slice(3); negated = true; }
      let test: Command;
      if (name === "true" || name === "false") test = getCommandInstance(name, control);
      else if (name === "size") { test = getCommandInstance("size", control); test.checkNextArg("tag", String(condition[1])); test.checkNextArg("number", String(condition[2])); }
      else if (name === "exists") { test = getCommandInstance("exists", control); this.addString(test, condition.slice(1)); }
      else if (name === "envelope" || name === "address") {
        test = getCommandInstance(name, control, false); if (name === "envelope") this.require("envelope");
        const [tag, isNegated] = FiltersSet.splitMatchTag(String(condition[1])); negated ||= isNegated; test.checkNextArg("tag", tag);
        for (const value of condition.slice(2)) this.addString(test, value);
      } else if (name === "body") {
        test = getCommandInstance("body", control, false); this.require("body"); test.checkNextArg("tag", String(condition[1]));
        const [tag, isNegated] = FiltersSet.splitMatchTag(String(condition[2])); negated ||= isNegated; test.checkNextArg("tag", tag); this.addString(test, condition.slice(3));
      } else if (name === "currentdate") {
        test = getCommandInstance("currentdate", control, false); this.require("date"); let position = 1;
        if (condition[position] === ":zone") { test.checkNextArg("tag", ":zone"); this.addString(test, condition[position + 1]); position += 2; }
        const [tag, isNegated] = FiltersSet.splitMatchTag(String(condition[position++])); negated ||= isNegated;
        test.checkNextArg("tag", tag, true, false);
        if (tag === ":value") { this.require("relational"); this.addString(test, condition[position++]); }
        this.addString(test, condition[position++]); this.addString(test, condition.slice(position));
      } else {
        test = getCommandInstance("header", control); const [tag, isNegated] = FiltersSet.splitMatchTag(String(condition[1])); negated ||= isNegated;
        test.checkNextArg("tag", tag); this.addString(test, condition[0]); this.addString(test, condition[2]);
      }
      if (negated) { const not = new NotCommand(control); not.checkNextArg("test", test); test = not; }
      group.checkNextArg("test", test);
    }
    control.checkNextArg("test", group);
    for (const definition of actions) {
      const action = getCommandInstance(String(definition[0]), control, false); if (action.extension) this.require(action.extension);
      for (const value of definition.slice(1)) {
        if (typeof value === "number") action.checkNextArg("number", String(value), true, false);
        else if (Array.isArray(value)) action.checkNextArg("stringlist", value.map((item) => quote(String(item))), true, false);
        else if (String(value).startsWith(":")) { if (value === ":copy") this.require("copy"); if (value === ":create") this.require("mailbox"); action.checkNextArg("tag", String(value), true, false); }
        else action.checkNextArg("string", quote(String(value)), true, false);
      }
      control.addchild(action);
    }
    return control;
  }

  addfilter(name: string, conditions: FilterCondition[], actions: FilterAction[], matchtype = "anyof") { if (this.find(name)) throw new FilterAlreadyExists(); this.filters.push({ name, content: this.create(conditions, actions, matchtype), enabled: true }); }
  updatefilter(oldname: string, newname: string, conditions: FilterCondition[], actions: FilterAction[], matchtype = "anyof") {
    const filter = this.find(oldname); if (!filter) return false; if (oldname !== newname && this.find(newname)) throw new FilterAlreadyExists();
    const enabled = filter.enabled; filter.name = newname; filter.content = this.create(conditions, actions, matchtype); filter.enabled = true; if (!enabled) this.disablefilter(newname); return true;
  }
  replacefilter(oldname: string, content: Command, newname = oldname, description?: string) { const filter = this.find(oldname); if (!filter) return false; if (oldname !== newname && this.find(newname)) throw new FilterAlreadyExists(); filter.name = newname; filter.content = content; if (description !== undefined) filter.description = description; return true; }
  getfilter(name: string) { const filter = this.find(name); return filter?.enabled === false ? filter.content.children[0] : filter?.content; }
  removefilter(name: string) { const index = this.filters.findIndex((filter) => filter.name === name); if (index < 0) return false; this.filters.splice(index, 1); return true; }
  isFilterDisabled(name: string) { const filter = this.find(name); return !filter || !filter.enabled; }
  is_filter_disabled(name: string) { return this.isFilterDisabled(name); }
  enablefilter(name: string) { const filter = this.find(name); if (!filter || filter.enabled) return false; filter.content = filter.content.children[0]; filter.enabled = true; return true; }
  disablefilter(name: string) { const filter = this.find(name); if (!filter || !filter.enabled) return false; const wrapper = new IfCommand(); wrapper.checkNextArg("test", new FalseCommand(wrapper)); wrapper.addchild(filter.content); filter.content = wrapper; filter.enabled = false; return true; }
  movefilter(name: string, direction: "up" | "down") { const index = this.filters.findIndex((filter) => filter.name === name); const target = direction === "up" ? index - 1 : index + 1; if (index < 0 || target < 0 || target >= this.filters.length) return false; [this.filters[index], this.filters[target]] = [this.filters[target], this.filters[index]]; return true; }
  fromParserResult(parser: Parser) {
    let unnamed = 1;
    for (const command of parser.result) {
      if (command.name === "require") { for (const extension of (Array.isArray(command.arguments.capabilities) ? command.arguments.capabilities : [command.arguments.capabilities]) as string[]) this.require(extension); continue; }
      let name = `Unnamed rule ${unnamed++}`; let description = "";
      for (const comment of command.hashComments) { if (comment.startsWith(this.filterNamePretext)) name = comment.slice(this.filterNamePretext.length); if (comment.startsWith(this.filterDescPretext)) description = comment.slice(this.filterDescPretext.length); }
      this.filters.push({ name, description, content: command, enabled: !(command instanceof IfCommand && command.arguments.test instanceof FalseCommand) });
    }
  }
  get_filter_matchtype(name: string) { const filter = this.getfilter(name); if (!filter) return null; for (const node of filter.walk()) if (node.name === "allof" || node.name === "anyof") return node.name; return null; }
  private conditionTuple(node: Command): unknown[] {
    const args = node.argsAsTuple();
    if (node.name === "header") return [unquoteArg(node.arguments["header-names"] as string | string[]), node.arguments["match-type"] ?? ":is", unquoteArg(node.arguments["key-list"] as string | string[])];
    if (node.name === "address") return ["address", node.arguments["match-type"] ?? ":is", unquoteArg(node.arguments["header-list"] as string | string[]), unquoteArg(node.arguments["key-list"] as string | string[])];
    if (node.name === "envelope") return ["envelope", node.arguments["match-type"] ?? ":is", ...(Array.isArray(unquoteArg(node.arguments["header-list"] as string | string[])) ? unquoteArg(node.arguments["header-list"] as string | string[]) as string[] : [unquote(node.arguments["header-list"] as string)]), ...(Array.isArray(unquoteArg(node.arguments["key-list"] as string | string[])) ? unquoteArg(node.arguments["key-list"] as string | string[]) as string[] : [unquote(node.arguments["key-list"] as string)])];
    return args;
  }
  get_filter_conditions(name: string) {
    const filter = this.getfilter(name); if (!filter) return null; const result: unknown[][] = []; const negated = new Set<Command>();
    for (const node of filter.walk()) {
      if (node.name === "not" && node.arguments.test instanceof Command) negated.add(node.arguments.test);
      if (!["header", "size", "exists", "body", "envelope", "address", "currentdate", "true", "false"].includes(node.name)) continue;
      const args = this.conditionTuple(node);
      if (negated.has(node)) {
        if (["exists", "size", "true", "false"].includes(node.name)) args[0] = `not${args[0]}`;
        else { const index = node.name === "body" ? 2 : node.name === "currentdate" && args[1] === ":zone" ? 3 : 1; args[index] = `:not${String(args[index]).slice(1)}`; }
      }
      result.push(args);
    }
    return result;
  }
  get_filter_actions(name: string) { const filter = this.getfilter(name); return filter ? [...filter.walk()].filter((node) => node.type === "action").map((node) => node.argsAsTuple()) : null; }
  toSieve() {
    let output = ""; if (this.requires.length) { const require = new RequireCommand(); require.checkNextArg("stringlist", this.requires); output += `${require.toSieve()}\n`; }
    for (const filter of this.filters) { output += `${this.filterNamePretext}${filter.name.replace(/\r?\n/g, " ")}\n`; if (filter.description) output += `${this.filterDescPretext}${filter.description.replace(/\r?\n/g, " ")}\n`; output += filter.content.toSieve(); }
    return output;
  }
  tosieve() { return this.toSieve(); }
}
