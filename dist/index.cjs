"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ActionCommand: () => ActionCommand,
  AddflagCommand: () => AddflagCommand,
  AddressCommand: () => AddressCommand,
  AllofCommand: () => AllofCommand,
  AnyofCommand: () => AnyofCommand,
  BadArgument: () => BadArgument,
  BadValue: () => BadValue,
  BodyCommand: () => BodyCommand,
  Client: () => Client,
  Command: () => Command,
  CommandError: () => CommandError,
  ControlCommand: () => ControlCommand,
  CurrentdateCommand: () => CurrentdateCommand,
  DateCommand: () => DateCommand,
  DiscardCommand: () => DiscardCommand,
  ElseCommand: () => ElseCommand,
  ElsifCommand: () => ElsifCommand,
  EnvelopeCommand: () => EnvelopeCommand,
  EnvironmentCommand: () => EnvironmentCommand,
  Error: () => Error2,
  ExistsCommand: () => ExistsCommand,
  ExtensionNotLoaded: () => ExtensionNotLoaded,
  FalseCommand: () => FalseCommand,
  FileintoCommand: () => FileintoCommand,
  FilterAlreadyExists: () => FilterAlreadyExists,
  FiltersSet: () => FiltersSet,
  HasflagCommand: () => HasflagCommand,
  HeaderCommand: () => HeaderCommand,
  IfCommand: () => IfCommand,
  KeepCommand: () => KeepCommand,
  Lexer: () => Lexer,
  NotCommand: () => NotCommand,
  NotifyCommand: () => NotifyCommand,
  ParseError: () => ParseError,
  Parser: () => Parser,
  RedirectCommand: () => RedirectCommand,
  RejectCommand: () => RejectCommand,
  RemoveflagCommand: () => RemoveflagCommand,
  RequireCommand: () => RequireCommand,
  Response: () => Response,
  SUPPORTED_AUTH_MECHS: () => SUPPORTED_AUTH_MECHS,
  SetCommand: () => SetCommand,
  SetflagCommand: () => SetflagCommand,
  SizeCommand: () => SizeCommand,
  StopCommand: () => StopCommand,
  TestCommand: () => TestCommand,
  TrueCommand: () => TrueCommand,
  UnknownCommand: () => UnknownCommand,
  VacationCommand: () => VacationCommand,
  addCommands: () => addCommands,
  add_commands: () => add_commands,
  getCommandInstance: () => getCommandInstance,
  get_command_instance: () => get_command_instance,
  isQuoted: () => isQuoted,
  loadedExtensions: () => loadedExtensions,
  parser_state: () => parser_state,
  quote: () => quote,
  resetExtensions: () => resetExtensions,
  unquote: () => unquote,
  unquoteArg: () => unquoteArg
});
module.exports = __toCommonJS(index_exports);

// src/tools.ts
var quoted = /^"(?:[^"\\]|\\.)*"$/s;
var isQuoted = (value) => quoted.test(value);
var quote = (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
var unquote = (value) => isQuoted(value) ? value.slice(1, -1).replace(/\\(.)/gs, "$1") : value;
var unquoteArg = (value) => Array.isArray(value) ? value.map(unquote) : unquote(value);

// src/commands.ts
var CommandError = class extends Error {
};
var UnknownCommand = class extends CommandError {
  constructor(name) {
    super(`unknown command '${name}'`);
  }
};
var BadArgument = class extends CommandError {
  constructor(command, seen, expected) {
    super(`bad argument ${String(seen)} for command ${command} (${String(expected)} expected)`);
  }
};
var BadValue = class extends CommandError {
  constructor(arg, value) {
    super(`bad value ${String(value)} for argument ${arg}`);
  }
};
var ExtensionNotLoaded = class extends CommandError {
  constructor(name) {
    super(`extension '${name}' not loaded`);
  }
};
var loadedExtensions = [];
function resetExtensions() {
  loadedExtensions = [];
}
var comparator = { name: "comparator", type: ["tag"], values: [":comparator"], extraArg: { type: ["string"], values: ['"i;octet"', '"i;ascii-casemap"'] } };
var addressPart = { name: "address-part", type: ["tag"], values: [":localpart", ":domain", ":all"] };
var matchType = { name: "match-type", type: ["tag"], values: [":is", ":contains", ":matches"], extensionValues: { ":count": "relational", ":value": "relational", ":regex": "regex" }, extraArg: { type: ["string"], values: ['"gt"', '"ge"', '"lt"', '"le"', '"eq"', '"ne"'], validFor: [":count", ":value"] } };
var Command = class _Command {
  static argsDefinition = [];
  static type = "action";
  static acceptChildren = false;
  static variableArgs = false;
  static nonDeterministic = false;
  static extension;
  static mustFollow;
  parent;
  arguments = {};
  extraArguments = {};
  children = [];
  hashComments = [];
  nextArgPos = 0;
  requiredArgs = -1;
  requiredCount = 0;
  curArg;
  constructor(parent) {
    this.parent = parent;
  }
  get name() {
    return this.constructor.name.replace(/Command$/, "").toLowerCase();
  }
  get defs() {
    return this.constructor.argsDefinition;
  }
  get type() {
    return this.constructor.type;
  }
  get acceptChildren() {
    return this.constructor.acceptChildren;
  }
  get variableArgs() {
    return this.constructor.variableArgs;
  }
  get nonDeterministic() {
    return this.constructor.nonDeterministic;
  }
  get extension() {
    return this.constructor.extension;
  }
  get mustFollow() {
    return this.constructor.mustFollow;
  }
  repr() {
    return `${this.name} (type: ${this.type})`;
  }
  addchild(child) {
    if (!this.acceptChildren) return false;
    this.children.push(child);
    return true;
  }
  completeCb() {
    if (this.name === "require") {
      const a = this.arguments.capabilities;
      for (const v of Array.isArray(a) ? a : [a]) {
        const x = unquote(v);
        if (!loadedExtensions.includes(x)) loadedExtensions.push(x);
      }
    }
  }
  reassignArguments() {
    const defs = this.defs;
    if (this.nonDeterministic && defs.length === 2 && defs[0].name in this.arguments && !(defs[1].name in this.arguments)) {
      this.arguments[defs[1].name] = this.arguments[defs[0].name];
      delete this.arguments[defs[0].name];
      this.requiredCount = 1;
    }
  }
  iscomplete(type, value) {
    if (this.variableArgs) return false;
    if (this.requiredArgs < 0) this.requiredArgs = this.defs.filter((x) => x.required).length;
    return (!this.curArg || !this.curArg.extraArg || this.curArg.extraArg.validFor && type && this.curArg.extraArg.type.includes(type) && !this.curArg.extraArg.validFor.includes(String(value))) && this.requiredCount === this.requiredArgs;
  }
  validValue(arg, value, check = true) {
    const v = String(value).toLowerCase();
    if (!arg.values && !arg.extensionValues) return true;
    if (arg.values?.includes(v)) return true;
    const e = arg.extensionValues?.[v];
    if (e) {
      if (check && !loadedExtensions.includes(e)) throw new ExtensionNotLoaded(e);
      return true;
    }
    return false;
  }
  checkNextArg(type, value, add = true, checkExtension = true) {
    if (!this.defs.length || this.iscomplete(type, value) && this.nextArgPos >= this.defs.length) return false;
    if (this.curArg?.extraArg) {
      const e = this.curArg.extraArg;
      if (e.type.includes(type) && (!e.values || e.values.includes(String(value)))) {
        if (add) this.extraArguments[this.curArg.name] = value;
        this.curArg = void 0;
        return true;
      }
      throw new BadValue(this.curArg.name, value);
    }
    for (let pos = this.nextArgPos; pos < this.defs.length; pos++) {
      const arg = this.defs[pos];
      if (arg.required) {
        if (arg.type[0] === "testlist") {
          if (type !== "test") throw new BadArgument(this.name, value, arg.type);
          if (add) (this.arguments[arg.name] ??= []).push(value);
          return true;
        }
        if (!arg.type.includes(type) && !(type === "string" && arg.type.includes("stringlist"))) throw new BadArgument(this.name, value, arg.type);
        if (!this.validValue(arg, value, checkExtension)) throw new BadArgument(this.name, value, arg.type);
        this.curArg = arg;
        this.requiredCount++;
        this.nextArgPos = pos + 1;
        if (add) this.arguments[arg.name] = value;
        return true;
      }
      if (arg.type.includes(type) && this.validValue(arg, value, checkExtension)) {
        if (arg.extension && checkExtension && !loadedExtensions.includes(arg.extension)) throw new ExtensionNotLoaded(arg.extension);
        if (arg.type.includes("tag") && arg.name in this.arguments) throw new BadArgument(this.name, value, `a single ${arg.name}`);
        if (arg.extraArg && (!arg.extraArg.validFor || arg.extraArg.validFor.includes(String(value)))) this.curArg = arg;
        if (add) this.arguments[arg.name] = value;
        if (!arg.type.includes("tag")) this.nextArgPos = pos + 1;
        return true;
      }
    }
    return false;
  }
  argsAsTuple() {
    const out = [this.name];
    for (const d of this.defs) {
      if (!(d.name in this.arguments)) continue;
      let v = this.arguments[d.name];
      let t = d.type;
      if (t.includes("tag")) {
        out.push(v);
        if (!(d.name in this.extraArguments)) continue;
        v = this.extraArguments[d.name];
        t = d.extraArg.type;
      }
      out.push(t.includes("string") || t.includes("stringlist") ? unquoteArg(v) : v);
    }
    return out;
  }
  args_as_tuple() {
    return this.argsAsTuple();
  }
  walk() {
    const self = this;
    return (function* () {
      yield self;
      for (const d of self.defs) {
        const v = self.arguments[d.name];
        if (Array.isArray(v) && d.type[0] === "testlist") for (const c of v) yield* c.walk();
        else if (v instanceof _Command) yield* v.walk();
      }
      for (const c of self.children) yield* c.walk();
    })();
  }
  toSieve(indent = 0) {
    let s = `${" ".repeat(indent)}${this.name}`;
    for (const d of this.defs) {
      if (!(d.name in this.arguments)) continue;
      let v = this.arguments[d.name];
      let t = d.type;
      if (t.includes("tag")) {
        s += ` ${v}`;
        if (!(d.name in this.extraArguments)) continue;
        v = this.extraArguments[d.name];
        t = d.extraArg.type;
      }
      s += " ";
      if (Array.isArray(v)) {
        s += d.type[0] === "testlist" ? `(${v.map((x) => x.toSieve(0).trim().replace(/;$/, "")).join(", ")})` : `[${v.map((x) => isQuoted(x) ? x : quote(x)).join(", ")}]`;
      } else if (v instanceof _Command) s += v.toSieve(0).trim().replace(/;$/, "");
      else s += t.includes("string") ? String(v) : String(v);
    }
    if (!this.acceptChildren) return this.type === "test" ? s : `${s};
`;
    if (this.type !== "control") return s;
    return `${s} {
${this.children.map((c) => c.toSieve(indent + 4)).join("")}${" ".repeat(indent)}}
`;
  }
  tosieve(indent = 0) {
    return this.toSieve(indent);
  }
};
var ControlCommand = class extends Command {
  static type = "control";
};
var ActionCommand = class extends Command {
  static type = "action";
};
var TestCommand = class extends Command {
  static type = "test";
};
function concrete(name, base, defs = [], options = {}) {
  const C = class extends base {
    static argsDefinition = defs;
    static acceptChildren = options.acceptChildren ?? false;
    static variableArgs = options.variableArgs ?? false;
    static nonDeterministic = options.nonDeterministic ?? false;
    static extension = options.extension;
    static mustFollow = options.mustFollow;
  };
  Object.defineProperty(C, "name", { value: `${name[0].toUpperCase()}${name.slice(1)}Command` });
  return C;
}
var RequireCommand = concrete("require", ControlCommand, [{ name: "capabilities", type: ["string", "stringlist"], required: true }]);
var IfCommand = concrete("if", ControlCommand, [{ name: "test", type: ["test"], required: true }], { acceptChildren: true });
var ElsifCommand = concrete("elsif", ControlCommand, [{ name: "test", type: ["test"], required: true }], { acceptChildren: true, mustFollow: ["if", "elsif"] });
var ElseCommand = concrete("else", ControlCommand, [], { acceptChildren: true, mustFollow: ["if", "elsif"] });
var StopCommand = concrete("stop", ActionCommand);
var FileintoCommand = concrete("fileinto", ActionCommand, [{ name: "copy", type: ["tag"], values: [":copy"], extension: "copy" }, { name: "create", type: ["tag"], values: [":create"], extension: "mailbox" }, { name: "flags", type: ["tag"], values: [":flags"], extraArg: { type: ["string", "stringlist"] }, extension: "imap4flags" }, { name: "mailbox", type: ["string"], required: true }], { extension: "fileinto" });
var RedirectCommand = concrete("redirect", ActionCommand, [{ name: "copy", type: ["tag"], values: [":copy"], extension: "copy" }, { name: "address", type: ["string"], required: true }]);
var RejectCommand = concrete("reject", ActionCommand, [{ name: "text", type: ["string"], required: true }], { extension: "reject" });
var KeepCommand = concrete("keep", ActionCommand, [{ name: "flags", type: ["tag"], values: [":flags"], extraArg: { type: ["string", "stringlist"] }, extension: "imap4flags" }]);
var DiscardCommand = concrete("discard", ActionCommand);
var flagDefs = [{ name: "variable-name", type: ["string"] }, { name: "list-of-flags", type: ["string", "stringlist"], required: true }];
var SetflagCommand = concrete("setflag", ActionCommand, flagDefs, { extension: "imap4flags", nonDeterministic: true });
var AddflagCommand = concrete("addflag", ActionCommand, flagDefs, { extension: "imap4flags", nonDeterministic: true });
var RemoveflagCommand = concrete("removeflag", ActionCommand, flagDefs, { extension: "imap4flags", nonDeterministic: true });
var NotifyCommand = concrete("notify", ActionCommand, [{ name: "from", type: ["tag"], values: [":from"], extraArg: { type: ["string"] } }, { name: "importance", type: ["tag"], values: [":importance"], extraArg: { type: ["string"] } }, { name: "options", type: ["tag"], values: [":options"], extraArg: { type: ["stringlist"] } }, { name: "message", type: ["tag"], values: [":message"], extraArg: { type: ["string"] } }, { name: "method", type: ["string"], required: true }], { extension: "enotify" });
var addr = [comparator, addressPart, matchType, { name: "header-list", type: ["string", "stringlist"], required: true }, { name: "key-list", type: ["string", "stringlist"], required: true }];
var AddressCommand = concrete("address", TestCommand, addr);
var EnvelopeCommand = concrete("envelope", TestCommand, addr, { extension: "envelope" });
var HeaderCommand = concrete("header", TestCommand, [comparator, matchType, { name: "header-names", type: ["string", "stringlist"], required: true }, { name: "key-list", type: ["string", "stringlist"], required: true }]);
var ExistsCommand = concrete("exists", TestCommand, [{ name: "header-names", type: ["string", "stringlist"], required: true }]);
var TrueCommand = concrete("true", TestCommand);
var FalseCommand = concrete("false", TestCommand);
var AllofCommand = concrete("allof", TestCommand, [{ name: "tests", type: ["testlist"], required: true }], { acceptChildren: true, variableArgs: true });
var AnyofCommand = concrete("anyof", TestCommand, [{ name: "tests", type: ["testlist"], required: true }], { acceptChildren: true, variableArgs: true });
var NotCommand = concrete("not", TestCommand, [{ name: "test", type: ["test"], required: true }], { acceptChildren: true });
var SizeCommand = concrete("size", TestCommand, [{ name: "comparator", type: ["tag"], values: [":over", ":under"], required: true }, { name: "limit", type: ["number"], required: true }]);
var BodyCommand = concrete("body", TestCommand, [comparator, matchType, { name: "body-transform", type: ["tag"], values: [":raw", ":content", ":text"], extraArg: { type: ["stringlist"], validFor: [":content"] } }, { name: "key-list", type: ["string", "stringlist"], required: true }], { extension: "body" });
var HasflagCommand = concrete("hasflag", TestCommand, [comparator, matchType, { name: "variable-list", type: ["string", "stringlist"] }, { name: "list-of-flags", type: ["string", "stringlist"], required: true }], { extension: "imap4flags", nonDeterministic: true });
var DateCommand = concrete("date", TestCommand, [{ name: "zone", type: ["tag"], values: [":zone", ":originalzone"], extraArg: { type: ["string"], validFor: [":zone"] } }, comparator, matchType, { name: "header-name", type: ["string"], required: true }, { name: "date-part", type: ["string"], required: true }, { name: "key-list", type: ["string", "stringlist"], required: true }], { extension: "date" });
var CurrentdateCommand = concrete("currentdate", TestCommand, [{ name: "zone", type: ["tag"], values: [":zone"], extraArg: { type: ["string"] } }, comparator, matchType, { name: "date-part", type: ["string"], required: true }, { name: "key-list", type: ["string", "stringlist"], required: true }], { extension: "date" });
var EnvironmentCommand = concrete("environment", TestCommand, [comparator, matchType, { name: "name", type: ["string"], required: true }, { name: "key-list", type: ["string", "stringlist"], required: true }], { extension: "environment" });
var VacationCommand = concrete("vacation", ActionCommand, [{ name: "subject", type: ["tag"], values: [":subject"], extraArg: { type: ["string"] } }, { name: "days", type: ["tag"], values: [":days"], extraArg: { type: ["number"] } }, { name: "seconds", type: ["tag"], extensionValues: { ":seconds": "vacation-seconds" }, extraArg: { type: ["number"] } }, { name: "from", type: ["tag"], values: [":from"], extraArg: { type: ["string"] } }, { name: "addresses", type: ["tag"], values: [":addresses"], extraArg: { type: ["string", "stringlist"] } }, { name: "handle", type: ["tag"], values: [":handle"], extraArg: { type: ["string"] } }, { name: "mime", type: ["tag"], values: [":mime"] }, { name: "reason", type: ["string"], required: true }], { extension: "vacation" });
var SetCommand = concrete("set", ActionCommand, [{ name: "case", type: ["tag"], values: [":lower", ":upper"] }, { name: "first-case", type: ["tag"], values: [":lowerfirst", ":upperfirst"] }, { name: "quotewildcard", type: ["tag"], values: [":quotewildcard"] }, { name: "encoding", type: ["tag"], extensionValues: { ":quoteregex": "regex", ":encodeurl": "enotify" } }, { name: "length", type: ["tag"], values: [":length"] }, { name: "name", type: ["string"], required: true }, { name: "value", type: ["string"], required: true }], { extension: "variables" });
var registry = /* @__PURE__ */ new Map();
for (const x of [RequireCommand, IfCommand, ElsifCommand, ElseCommand, StopCommand, FileintoCommand, RedirectCommand, RejectCommand, KeepCommand, DiscardCommand, SetflagCommand, AddflagCommand, RemoveflagCommand, NotifyCommand, AddressCommand, EnvelopeCommand, HeaderCommand, ExistsCommand, TrueCommand, FalseCommand, AllofCommand, AnyofCommand, NotCommand, SizeCommand, BodyCommand, HasflagCommand, DateCommand, CurrentdateCommand, EnvironmentCommand, VacationCommand, SetCommand]) registry.set(x.name.replace(/Command$/, "").toLowerCase(), x);
function addCommands(cmds) {
  for (const c of Array.isArray(cmds) ? cmds : [cmds]) registry.set(c.name.replace(/Command$/, "").toLowerCase(), c);
}
function getCommandInstance(name, parent, checkexists = true) {
  const C = registry.get(name.toLowerCase());
  if (!C) throw new UnknownCommand(name);
  const c = new C(parent);
  if (checkexists && c.extension && !loadedExtensions.includes(c.extension)) throw new ExtensionNotLoaded(c.extension);
  return c;
}
var parser_state = {
  get loaded_extensions() {
    return loadedExtensions;
  },
  set loaded_extensions(value) {
    loadedExtensions = value;
  }
};
var add_commands = addCommands;
var get_command_instance = getCommandInstance;

// src/parser.ts
var ParseError = class extends Error {
  constructor(message) {
    super(`parsing error: ${message}`);
  }
};
var tokenRE = /\s+|#.*$|\/\*[\s\S]*?\*\/|text:[\s\S]*?\r?\n\.\r?$|"(?:[^"\\]|\\.)*"|[A-Za-z_][\w]*|:[A-Za-z_][\w]*|\d+[KMGkmg]?|[\[\](){};,]/gmy;
var Lexer = class {
  scan(text) {
    const out = [];
    let at = 0;
    for (const m of text.matchAll(tokenRE)) {
      if (m.index !== at) throw new ParseError(`unknown token ${text.slice(at, m.index).split(/\s/)[0]}`);
      at = m.index + m[0].length;
      const x = m[0];
      if (/^\s+$/.test(x) || x.startsWith("/*")) continue;
      let type = "identifier";
      if (x.startsWith("#")) type = "hash_comment";
      else if (x.startsWith('"') || x.startsWith("text:")) type = x.startsWith("text:") ? "multiline" : "string";
      else if (x.startsWith(":")) type = "tag";
      else if (/^\d/.test(x)) type = "number";
      else if ("[](){};,".includes(x)) type = { "[": "left_bracket", "]": "right_bracket", "(": "left_parenthesis", ")": "right_parenthesis", "{": "left_cbracket", "}": "right_cbracket", ";": "semicolon", ",": "comma" }[x];
      out.push({ type, value: x, start: m.index });
    }
    if (at !== text.length) throw new ParseError(`unknown token ${text.slice(at).split(/\s/)[0]}`);
    return out;
  }
};
var Parser = class {
  constructor(debug = false) {
    this.debug = debug;
  }
  debug;
  result = [];
  error;
  errorPos;
  lexer = new Lexer();
  tokens = [];
  pos = 0;
  comments = [];
  current() {
    return this.tokens[this.pos];
  }
  take(type) {
    const t = this.current();
    if (!t) throw new ParseError(`end of script reached while ${type ?? "token"} expected`);
    if (type && t.type !== type) throw new ParseError(`${t.type} found while ${type} expected near '${t.value}'`);
    this.pos++;
    return t;
  }
  extensionError(e, text) {
    const t = this.current() ?? this.tokens.at(-1);
    const before = t ? text.slice(0, t.start) : text;
    const line = before.split("\n").length;
    this.error = `line ${line}: ${e instanceof Error ? e.message : String(e)}`;
    this.errorPos = [line, t ? t.start - (before.lastIndexOf("\n") + 1) : 0, t?.value.length ?? 0];
  }
  parseValue(cmd) {
    const t = this.current();
    if (!t) return false;
    if (t.type === "left_bracket") {
      this.pos++;
      const list = [];
      if (this.current()?.type === "right_bracket") throw new ParseError("right_bracket found while string expected");
      while (true) {
        list.push(this.take("string").value);
        if (this.current()?.type === "right_bracket") {
          this.pos++;
          break;
        }
        this.take("comma");
      }
      return cmd.checkNextArg("stringlist", list);
    }
    if (["string", "multiline", "number", "tag"].includes(t.type)) {
      this.pos++;
      return cmd.checkNextArg(t.type, t.value);
    }
    return false;
  }
  parseTest(parent) {
    const name = this.take("identifier").value;
    const cmd = getCommandInstance(name, parent);
    if (cmd.type !== "test") throw new ParseError(`Expected test command, '${name}' found instead`);
    if (name === "allof" || name === "anyof") {
      this.take("left_parenthesis");
      if (this.current()?.type === "right_parenthesis") throw new ParseError("right_parenthesis found while identifier expected");
      while (true) {
        cmd.checkNextArg("test", this.parseTest(cmd));
        if (this.current()?.type === "right_parenthesis") {
          this.pos++;
          break;
        }
        this.take("comma");
      }
      return cmd;
    }
    if (name === "not") {
      cmd.checkNextArg("test", this.parseTest(cmd));
      return cmd;
    }
    while (this.current() && !["semicolon", "left_cbracket", "right_cbracket", "comma", "right_parenthesis"].includes(this.current().type)) {
      this.parseValue(cmd);
    }
    if (cmd.nonDeterministic) cmd.reassignArguments();
    if (!cmd.iscomplete()) throw new ParseError(`missing argument for command ${cmd.name}`);
    return cmd;
  }
  parseCommand(parent) {
    const name = this.take("identifier").value;
    const cmd = getCommandInstance(name, parent);
    if (cmd.type === "test") throw new ParseError(`${cmd.name} may not appear as a first command`);
    if (cmd.mustFollow) {
      const previous = parent ? parent.children.at(-1) : this.result.at(-1);
      if (!previous || !cmd.mustFollow.includes(previous.name)) throw new ParseError(`the ${cmd.name} command must follow an ${cmd.mustFollow.join(" or ")} command`);
    }
    if ((cmd.name === "if" || cmd.name === "elsif") && cmd.defs.length) {
      cmd.checkNextArg("test", this.parseTest(cmd));
    } else {
      while (this.current() && !["semicolon", "left_cbracket", "right_cbracket"].includes(this.current().type)) {
        if (!this.parseValue(cmd)) break;
      }
    }
    if (cmd.nonDeterministic) cmd.reassignArguments();
    if (!cmd.iscomplete()) throw new ParseError(`missing argument for command ${cmd.name}`);
    if (cmd.acceptChildren && cmd.type === "control") {
      this.take("left_cbracket");
      while (this.current()?.type !== "right_cbracket") {
        if (!this.current()) throw new ParseError("end of script reached while right_cbracket expected");
        cmd.addchild(this.parseCommand(cmd));
      }
      this.pos++;
    } else this.take("semicolon");
    cmd.completeCb();
    return cmd;
  }
  parse(input) {
    let text = "";
    this.result = [];
    this.error = void 0;
    this.pos = 0;
    this.comments = [];
    resetExtensions();
    try {
      text = typeof input === "string" ? input : new TextDecoder("utf-8", { fatal: true }).decode(input);
      this.tokens = this.lexer.scan(text);
      while (this.pos < this.tokens.length) {
        while (this.current()?.type === "hash_comment") this.comments.push(this.take().value.trim());
        const c = this.parseCommand();
        c.hashComments = this.comments;
        this.comments = [];
        this.result.push(c);
      }
      return true;
    } catch (e) {
      this.extensionError(e, text);
      return false;
    }
  }
  toSieve() {
    return this.result.map((x) => x.toSieve()).join("");
  }
  dump() {
    return this.result.map((x) => x.repr()).join("\n");
  }
};

// src/factory.ts
var FilterAlreadyExists = class extends Error {
};
var FiltersSet = class _FiltersSet {
  constructor(name, filterNamePretext = "# Filter: ", filterDescPretext = "# Description: ") {
    this.name = name;
    this.filterNamePretext = filterNamePretext;
    this.filterDescPretext = filterDescPretext;
  }
  name;
  filterNamePretext;
  filterDescPretext;
  requires = [];
  filters = [];
  supportedTests = ["true", "false", "size", "exists", "envelope", "address", "body", "currentdate"];
  toString() {
    return this.toSieve();
  }
  require(name) {
    const value = name.replace(/^"|"$/g, "");
    if (value && !this.requires.includes(value)) this.requires.push(value);
  }
  find(name) {
    return this.filters.find((filter) => filter.name === name);
  }
  filterExists(name) {
    return !!this.find(name);
  }
  filter_exists(name) {
    return this.filterExists(name);
  }
  addString(command, value) {
    if (Array.isArray(value)) command.checkNextArg("stringlist", value.map((item) => quote(String(item))));
    else command.checkNextArg("string", quote(String(value)));
  }
  static splitMatchTag(tag) {
    return tag.startsWith(":not") ? [`:${tag.slice(4)}`, true] : [tag, false];
  }
  create(conditions, actions, matchtype = "anyof") {
    const control = new IfCommand();
    const group = getCommandInstance(matchtype, control);
    for (const original of conditions) {
      let condition = [...original];
      let name = String(condition[0]);
      let negated = false;
      if (name === "header" && condition.length === 4) {
        condition = condition.slice(1);
        name = "";
      } else if (name.startsWith("not") && this.supportedTests.includes(name.slice(3))) {
        name = name.slice(3);
        negated = true;
      }
      let test;
      if (name === "true" || name === "false") test = getCommandInstance(name, control);
      else if (name === "size") {
        test = getCommandInstance("size", control);
        test.checkNextArg("tag", String(condition[1]));
        test.checkNextArg("number", String(condition[2]));
      } else if (name === "exists") {
        test = getCommandInstance("exists", control);
        this.addString(test, condition.slice(1));
      } else if (name === "envelope" || name === "address") {
        test = getCommandInstance(name, control, false);
        if (name === "envelope") this.require("envelope");
        const [tag, isNegated] = _FiltersSet.splitMatchTag(String(condition[1]));
        negated ||= isNegated;
        test.checkNextArg("tag", tag);
        for (const value of condition.slice(2)) this.addString(test, value);
      } else if (name === "body") {
        test = getCommandInstance("body", control, false);
        this.require("body");
        test.checkNextArg("tag", String(condition[1]));
        const [tag, isNegated] = _FiltersSet.splitMatchTag(String(condition[2]));
        negated ||= isNegated;
        test.checkNextArg("tag", tag);
        this.addString(test, condition.slice(3));
      } else if (name === "currentdate") {
        test = getCommandInstance("currentdate", control, false);
        this.require("date");
        let position = 1;
        if (condition[position] === ":zone") {
          test.checkNextArg("tag", ":zone");
          this.addString(test, condition[position + 1]);
          position += 2;
        }
        const [tag, isNegated] = _FiltersSet.splitMatchTag(String(condition[position++]));
        negated ||= isNegated;
        test.checkNextArg("tag", tag, true, false);
        if (tag === ":value") {
          this.require("relational");
          this.addString(test, condition[position++]);
        }
        this.addString(test, condition[position++]);
        this.addString(test, condition.slice(position));
      } else {
        test = getCommandInstance("header", control);
        const [tag, isNegated] = _FiltersSet.splitMatchTag(String(condition[1]));
        negated ||= isNegated;
        test.checkNextArg("tag", tag);
        this.addString(test, condition[0]);
        this.addString(test, condition[2]);
      }
      if (negated) {
        const not = new NotCommand(control);
        not.checkNextArg("test", test);
        test = not;
      }
      group.checkNextArg("test", test);
    }
    control.checkNextArg("test", group);
    for (const definition of actions) {
      const action = getCommandInstance(String(definition[0]), control, false);
      if (action.extension) this.require(action.extension);
      for (const value of definition.slice(1)) {
        if (typeof value === "number") action.checkNextArg("number", String(value), true, false);
        else if (Array.isArray(value)) action.checkNextArg("stringlist", value.map((item) => quote(String(item))), true, false);
        else if (String(value).startsWith(":")) {
          if (value === ":copy") this.require("copy");
          if (value === ":create") this.require("mailbox");
          action.checkNextArg("tag", String(value), true, false);
        } else action.checkNextArg("string", quote(String(value)), true, false);
      }
      control.addchild(action);
    }
    return control;
  }
  addfilter(name, conditions, actions, matchtype = "anyof") {
    if (this.find(name)) throw new FilterAlreadyExists();
    this.filters.push({ name, content: this.create(conditions, actions, matchtype), enabled: true });
  }
  updatefilter(oldname, newname, conditions, actions, matchtype = "anyof") {
    const filter = this.find(oldname);
    if (!filter) return false;
    if (oldname !== newname && this.find(newname)) throw new FilterAlreadyExists();
    const enabled = filter.enabled;
    filter.name = newname;
    filter.content = this.create(conditions, actions, matchtype);
    filter.enabled = true;
    if (!enabled) this.disablefilter(newname);
    return true;
  }
  replacefilter(oldname, content, newname = oldname, description) {
    const filter = this.find(oldname);
    if (!filter) return false;
    if (oldname !== newname && this.find(newname)) throw new FilterAlreadyExists();
    filter.name = newname;
    filter.content = content;
    if (description !== void 0) filter.description = description;
    return true;
  }
  getfilter(name) {
    const filter = this.find(name);
    return filter?.enabled === false ? filter.content.children[0] : filter?.content;
  }
  removefilter(name) {
    const index = this.filters.findIndex((filter) => filter.name === name);
    if (index < 0) return false;
    this.filters.splice(index, 1);
    return true;
  }
  isFilterDisabled(name) {
    const filter = this.find(name);
    return !filter || !filter.enabled;
  }
  is_filter_disabled(name) {
    return this.isFilterDisabled(name);
  }
  enablefilter(name) {
    const filter = this.find(name);
    if (!filter || filter.enabled) return false;
    filter.content = filter.content.children[0];
    filter.enabled = true;
    return true;
  }
  disablefilter(name) {
    const filter = this.find(name);
    if (!filter || !filter.enabled) return false;
    const wrapper = new IfCommand();
    wrapper.checkNextArg("test", new FalseCommand(wrapper));
    wrapper.addchild(filter.content);
    filter.content = wrapper;
    filter.enabled = false;
    return true;
  }
  movefilter(name, direction) {
    const index = this.filters.findIndex((filter) => filter.name === name);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= this.filters.length) return false;
    [this.filters[index], this.filters[target]] = [this.filters[target], this.filters[index]];
    return true;
  }
  fromParserResult(parser) {
    let unnamed = 1;
    for (const command of parser.result) {
      if (command.name === "require") {
        for (const extension of Array.isArray(command.arguments.capabilities) ? command.arguments.capabilities : [command.arguments.capabilities]) this.require(extension);
        continue;
      }
      let name = `Unnamed rule ${unnamed++}`;
      let description = "";
      for (const comment of command.hashComments) {
        if (comment.startsWith(this.filterNamePretext)) name = comment.slice(this.filterNamePretext.length);
        if (comment.startsWith(this.filterDescPretext)) description = comment.slice(this.filterDescPretext.length);
      }
      this.filters.push({ name, description, content: command, enabled: !(command instanceof IfCommand && command.arguments.test instanceof FalseCommand) });
    }
  }
  get_filter_matchtype(name) {
    const filter = this.getfilter(name);
    if (!filter) return null;
    for (const node of filter.walk()) if (node.name === "allof" || node.name === "anyof") return node.name;
    return null;
  }
  conditionTuple(node) {
    const args = node.argsAsTuple();
    if (node.name === "header") return [unquoteArg(node.arguments["header-names"]), node.arguments["match-type"] ?? ":is", unquoteArg(node.arguments["key-list"])];
    if (node.name === "address") return ["address", node.arguments["match-type"] ?? ":is", unquoteArg(node.arguments["header-list"]), unquoteArg(node.arguments["key-list"])];
    if (node.name === "envelope") return ["envelope", node.arguments["match-type"] ?? ":is", ...Array.isArray(unquoteArg(node.arguments["header-list"])) ? unquoteArg(node.arguments["header-list"]) : [unquote(node.arguments["header-list"])], ...Array.isArray(unquoteArg(node.arguments["key-list"])) ? unquoteArg(node.arguments["key-list"]) : [unquote(node.arguments["key-list"])]];
    return args;
  }
  get_filter_conditions(name) {
    const filter = this.getfilter(name);
    if (!filter) return null;
    const result = [];
    const negated = /* @__PURE__ */ new Set();
    for (const node of filter.walk()) {
      if (node.name === "not" && node.arguments.test instanceof Command) negated.add(node.arguments.test);
      if (!["header", "size", "exists", "body", "envelope", "address", "currentdate", "true", "false"].includes(node.name)) continue;
      const args = this.conditionTuple(node);
      if (negated.has(node)) {
        if (["exists", "size", "true", "false"].includes(node.name)) args[0] = `not${args[0]}`;
        else {
          const index = node.name === "body" ? 2 : node.name === "currentdate" && args[1] === ":zone" ? 3 : 1;
          args[index] = `:not${String(args[index]).slice(1)}`;
        }
      }
      result.push(args);
    }
    return result;
  }
  get_filter_actions(name) {
    const filter = this.getfilter(name);
    return filter ? [...filter.walk()].filter((node) => node.type === "action").map((node) => node.argsAsTuple()) : null;
  }
  toSieve() {
    let output = "";
    if (this.requires.length) {
      const require2 = new RequireCommand();
      require2.checkNextArg("stringlist", this.requires);
      output += `${require2.toSieve()}
`;
    }
    for (const filter of this.filters) {
      output += `${this.filterNamePretext}${filter.name.replace(/\r?\n/g, " ")}
`;
      if (filter.description) output += `${this.filterDescPretext}${filter.description.replace(/\r?\n/g, " ")}
`;
      output += filter.content.toSieve();
    }
    return output;
  }
  tosieve() {
    return this.toSieve();
  }
};

// src/managesieve.ts
var import_node_net = __toESM(require("net"), 1);
var import_node_tls = __toESM(require("tls"), 1);
var SUPPORTED_AUTH_MECHS = ["PLAIN", "LOGIN", "OAUTHBEARER", "XOAUTH2"];
var Error2 = class extends globalThis.Error {
};
var Response = class extends globalThis.Error {
  constructor(code, data) {
    super(`${code} ${data}`);
    this.code = code;
    this.data = data;
  }
  code;
  data;
};
var CRLF = Buffer.from("\r\n");
var Client = class _Client {
  constructor(srvaddr, srvport = 4190, srvhostname = srvaddr, debug = false) {
    this.srvaddr = srvaddr;
    this.srvport = srvport;
    this.srvhostname = srvhostname;
    this.debug = debug;
  }
  srvaddr;
  srvport;
  srvhostname;
  debug;
  static readTimeout = 5e3;
  socket;
  authenticated = false;
  errcode = "";
  errmsg = "";
  chunks = [];
  available = 0;
  ended;
  wake;
  capabilitiesMap = /* @__PURE__ */ new Map();
  log(value) {
    if (this.debug) console.debug("DEBUG:", value);
  }
  finish(error) {
    this.ended ??= error;
    this.wake?.();
    this.wake = void 0;
  }
  attach(socket) {
    this.chunks = [];
    this.available = 0;
    this.ended = void 0;
    socket.on("data", (chunk) => {
      this.log(chunk);
      this.chunks.push(Buffer.from(chunk));
      this.available += chunk.length;
      this.wake?.();
      this.wake = void 0;
    });
    socket.once("end", () => this.finish(new Error2("Connection closed by server")));
    socket.once("close", () => this.finish(new Error2("Connection closed by server")));
    socket.once("error", (error) => this.finish(error));
    socket.setTimeout(_Client.readTimeout, () => socket.destroy(new Error2("Failed to read data from server")));
  }
  async waitForData() {
    if (this.available) return;
    if (this.ended) throw this.ended;
    await new Promise((resolve) => {
      this.wake = resolve;
    });
    if (!this.available && this.ended) throw this.ended;
  }
  async readBytes(length) {
    const output = Buffer.allocUnsafe(length);
    let offset = 0;
    while (offset < length) {
      await this.waitForData();
      const chunk = this.chunks[0];
      const count = Math.min(length - offset, chunk.length);
      chunk.copy(output, offset, 0, count);
      offset += count;
      this.available -= count;
      if (count === chunk.length) this.chunks.shift();
      else this.chunks[0] = chunk.subarray(count);
    }
    return output;
  }
  async readLine() {
    const parts = [];
    while (true) {
      await this.waitForData();
      const chunk = this.chunks[0];
      const found = chunk.indexOf(CRLF);
      if (found >= 0) {
        parts.push(await this.readBytes(found));
        await this.readBytes(2);
        return parts.length === 1 ? parts[0] : Buffer.concat(parts);
      }
      parts.push(await this.readBytes(chunk.length));
    }
  }
  async open(implicitTls) {
    const socket = implicitTls ? import_node_tls.default.connect({ host: this.srvaddr, port: this.srvport, servername: this.srvhostname }) : import_node_net.default.connect({ host: this.srvaddr, port: this.srvport });
    await new Promise((resolve, reject) => {
      socket.once(implicitTls ? "secureConnect" : "connect", resolve);
      socket.once("error", reject);
    });
    this.socket = socket;
    this.attach(socket);
  }
  async upgradeTls() {
    if (!this.socket) throw new Error2("Not connected");
    const socket = import_node_tls.default.connect({ socket: this.socket, servername: this.srvhostname });
    await new Promise((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    this.socket = socket;
    this.attach(socket);
  }
  async write(data) {
    if (!this.socket) throw new Error2("Not connected");
    await new Promise((resolve, reject) => this.socket.write(data, (error) => error ? reject(error) : resolve()));
  }
  static encodeArgument(value) {
    if (/[\r\n\0]/.test(value)) throw new Error2(`Invalid character in argument: ${JSON.stringify(value)}`);
    return quote(value);
  }
  async readLiteral(length) {
    const literal = await this.readBytes(length);
    if (!literal.subarray(Math.max(0, literal.length - 2)).equals(CRLF)) {
      const terminator = await this.readLine();
      if (terminator.length) throw new Error2("Invalid literal termination");
    }
    return literal;
  }
  async parseError(data) {
    this.errcode = "";
    this.errmsg = "";
    const match = /^(?:\((?<code>(?:[^)"]|"(?:[^"\\]|\\.)*")*)\)\s*)?(?:(?:"(?<quoted>(?:[^"\\]|\\.)*)")|(?:\{(?<size>\d+)\+?\}))?$/.exec(data);
    if (!match?.groups) throw new Error2("Bad error message");
    this.errcode = match.groups.code ?? "";
    if (match.groups.quoted !== void 0) this.errmsg = match.groups.quoted.replace(/\\(.)/gs, "$1");
    else if (match.groups.size !== void 0) this.errmsg = (await this.readLiteral(Number(match.groups.size))).toString("utf8");
  }
  async readResponse() {
    const body = [];
    while (true) {
      const line = await this.readLine();
      const text = line.toString("utf8");
      const literal = /^\{(\d+)\+?\}$/.exec(text);
      if (literal) {
        const value = await this.readLiteral(Number(literal[1]));
        body.push(value);
        if (!value.subarray(Math.max(0, value.length - 2)).equals(CRLF)) body.push(CRLF);
        continue;
      }
      const status = /^(OK|NO|BYE)(?:\s*(.*))?$/.exec(text);
      if (status) {
        if (status[1] === "BYE") throw new Error2("Connection closed by server");
        if (status[1] === "NO") await this.parseError(status[2] ?? "");
        return { code: status[1], data: status[2] ?? "", body: Buffer.concat(body) };
      }
      if (line.length) body.push(line, CRLF);
    }
  }
  async send(name, args = []) {
    const values = args.map((arg) => typeof arg === "number" ? String(arg) : Buffer.isBuffer(arg) ? arg.toString("utf8") : _Client.encodeArgument(arg));
    const command = Buffer.from(`${name}${values.length ? ` ${values.join(" ")}` : ""}\r
`, "utf8");
    this.log(command);
    await this.write(command);
    return this.readResponse();
  }
  async getCapabilities() {
    const response = await this.readResponse();
    if (response.code !== "OK") return false;
    this.capabilitiesMap.clear();
    for (const line of response.body.toString("utf8").split("\r\n")) {
      const match = /^"((?:[^"\\]|\\.)*)"(?:\s+"((?:[^"\\]|\\.)*)")?$/.exec(line);
      if (match) this.capabilitiesMap.set(match[1].replace(/\\(.)/g, "$1"), (match[2] ?? "").replace(/\\(.)/g, "$1"));
    }
    return true;
  }
  getImplementation() {
    return this.capabilitiesMap.get("IMPLEMENTATION");
  }
  getSaslMechanisms() {
    return (this.capabilitiesMap.get("SASL") ?? "").split(/\s+/).filter(Boolean);
  }
  hasTlsSupport() {
    return this.capabilitiesMap.has("STARTTLS");
  }
  getSieveCapabilities() {
    return (this.capabilitiesMap.get("SIEVE") ?? "").split(/\s+/).filter(Boolean);
  }
  get_implementation() {
    return this.getImplementation();
  }
  get_sasl_mechanisms() {
    return this.getSaslMechanisms();
  }
  has_tls_support() {
    return this.hasTlsSupport();
  }
  get_sieve_capabilities() {
    return this.getSieveCapabilities();
  }
  async connect(login, password, authzId = "", starttls = false, ssl = false, authmech) {
    if (authmech && !SUPPORTED_AUTH_MECHS.includes(authmech)) throw new Error2(`Unsupported authentication mechanism: ${authmech}`);
    await this.open(ssl);
    if (!await this.getCapabilities()) throw new Error2("Failed to read capabilities from server");
    if (!ssl && starttls) {
      if (!this.hasTlsSupport()) throw new Error2("STARTTLS not supported by the server");
      if ((await this.send("STARTTLS")).code !== "OK") return false;
      await this.upgradeTls();
      if (!await this.getCapabilities()) throw new Error2("Failed to read capabilities from server");
    }
    for (const mechanism of authmech ? [authmech] : SUPPORTED_AUTH_MECHS) {
      if (!this.getSaslMechanisms().includes(mechanism)) continue;
      let response;
      if (mechanism === "LOGIN") {
        await this.write(Buffer.from(`AUTHENTICATE LOGIN\r
"${Buffer.from(login).toString("base64")}"\r
"${Buffer.from(password).toString("base64")}"\r
`));
        response = await this.readResponse();
      } else {
        const payload = mechanism === "PLAIN" ? `${authzId}\0${login}\0${password}` : mechanism === "XOAUTH2" ? `user=${login},auth=Bearer ${password}` : `n,a=${login},auth=Bearer ${password}`;
        response = await this.send("AUTHENTICATE", [mechanism, Buffer.from(payload).toString("base64")]);
      }
      this.authenticated = response.code === "OK";
      return this.authenticated;
    }
    this.errmsg = "No suitable mechanism found";
    return false;
  }
  requireAuthentication() {
    if (!this.authenticated) throw new Error2("Authentication required");
  }
  literal(content) {
    const bytes = Buffer.from(content.replace(/\r?\n/g, "\r\n"));
    return Buffer.concat([Buffer.from(`{${bytes.length}+}\r
`), bytes]);
  }
  async logout() {
    const reply = await this.send("LOGOUT");
    this.socket?.end();
    return reply.code === "OK";
  }
  async capability() {
    const reply = await this.send("CAPABILITY");
    return reply.code === "OK" ? reply.body.toString("utf8") : null;
  }
  async havespace(name, size) {
    this.requireAuthentication();
    return (await this.send("HAVESPACE", [name, size])).code === "OK";
  }
  async listscripts() {
    this.requireAuthentication();
    const reply = await this.send("LISTSCRIPTS");
    if (reply.code !== "OK") return null;
    let active;
    const scripts = [];
    for (const line of reply.body.toString("utf8").split("\r\n")) {
      const match = /^"((?:[^"\\]|\\.)*)"(?:\s+(ACTIVE))?$/i.exec(line);
      if (!match) continue;
      const name = match[1].replace(/\\(.)/g, "$1");
      if (match[2]) active = name;
      else scripts.push(name);
    }
    return [active, scripts];
  }
  async getscript(name) {
    this.requireAuthentication();
    const reply = await this.send("GETSCRIPT", [name]);
    return reply.code === "OK" ? reply.body.toString("utf8").replace(/\r\n/g, "\n").replace(/\n$/, "") : null;
  }
  async putscript(name, content) {
    this.requireAuthentication();
    return (await this.send("PUTSCRIPT", [name, this.literal(content)])).code === "OK";
  }
  async deletescript(name) {
    this.requireAuthentication();
    return (await this.send("DELETESCRIPT", [name])).code === "OK";
  }
  async setactive(name) {
    this.requireAuthentication();
    return (await this.send("SETACTIVE", [name])).code === "OK";
  }
  async checkscript(content) {
    this.requireAuthentication();
    if (!this.capabilitiesMap.has("VERSION")) throw new Error2("server does not support CHECKSCRIPT command");
    return (await this.send("CHECKSCRIPT", [this.literal(content)])).code === "OK";
  }
  async renamescript(oldname, newname) {
    this.requireAuthentication();
    if (this.capabilitiesMap.has("VERSION")) return (await this.send("RENAMESCRIPT", [oldname, newname])).code === "OK";
    const listing = await this.listscripts();
    if (!listing) return false;
    const [active, scripts] = listing;
    if (oldname !== active && !scripts.includes(oldname)) {
      this.errmsg = "Old script does not exist";
      return false;
    }
    if (scripts.includes(newname)) {
      this.errmsg = "New script already exists";
      return false;
    }
    const content = await this.getscript(oldname);
    return content !== null && await this.putscript(newname, content) && (!active || active !== oldname || await this.setactive(newname)) && await this.deletescript(oldname);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ActionCommand,
  AddflagCommand,
  AddressCommand,
  AllofCommand,
  AnyofCommand,
  BadArgument,
  BadValue,
  BodyCommand,
  Client,
  Command,
  CommandError,
  ControlCommand,
  CurrentdateCommand,
  DateCommand,
  DiscardCommand,
  ElseCommand,
  ElsifCommand,
  EnvelopeCommand,
  EnvironmentCommand,
  Error,
  ExistsCommand,
  ExtensionNotLoaded,
  FalseCommand,
  FileintoCommand,
  FilterAlreadyExists,
  FiltersSet,
  HasflagCommand,
  HeaderCommand,
  IfCommand,
  KeepCommand,
  Lexer,
  NotCommand,
  NotifyCommand,
  ParseError,
  Parser,
  RedirectCommand,
  RejectCommand,
  RemoveflagCommand,
  RequireCommand,
  Response,
  SUPPORTED_AUTH_MECHS,
  SetCommand,
  SetflagCommand,
  SizeCommand,
  StopCommand,
  TestCommand,
  TrueCommand,
  UnknownCommand,
  VacationCommand,
  addCommands,
  add_commands,
  getCommandInstance,
  get_command_instance,
  isQuoted,
  loadedExtensions,
  parser_state,
  quote,
  resetExtensions,
  unquote,
  unquoteArg
});
//# sourceMappingURL=index.cjs.map