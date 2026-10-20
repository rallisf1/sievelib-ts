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

// src/managesieve.ts
var managesieve_exports = {};
__export(managesieve_exports, {
  Client: () => Client,
  Error: () => Error2,
  Response: () => Response,
  SUPPORTED_AUTH_MECHS: () => SUPPORTED_AUTH_MECHS
});
module.exports = __toCommonJS(managesieve_exports);
var import_node_net = __toESM(require("net"), 1);
var import_node_tls = __toESM(require("tls"), 1);

// src/tools.ts
var quote = (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// src/managesieve.ts
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
  Client,
  Error,
  Response,
  SUPPORTED_AUTH_MECHS
});
//# sourceMappingURL=managesieve.cjs.map