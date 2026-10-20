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
export {
  ActionCommand,
  AddflagCommand,
  AddressCommand,
  AllofCommand,
  AnyofCommand,
  BadArgument,
  BadValue,
  BodyCommand,
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
  ExistsCommand,
  ExtensionNotLoaded,
  FalseCommand,
  FileintoCommand,
  HasflagCommand,
  HeaderCommand,
  IfCommand,
  KeepCommand,
  NotCommand,
  NotifyCommand,
  RedirectCommand,
  RejectCommand,
  RemoveflagCommand,
  RequireCommand,
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
  loadedExtensions,
  parser_state,
  resetExtensions
};
//# sourceMappingURL=commands.js.map