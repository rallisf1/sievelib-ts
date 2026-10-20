import net from "node:net";
import tls from "node:tls";
import { EventEmitter } from "node:events";
import { quote } from "./tools.js";

export const SUPPORTED_AUTH_MECHS = ["PLAIN", "LOGIN", "OAUTHBEARER", "XOAUTH2"] as const;
export class Error extends globalThis.Error {}
export class Response extends globalThis.Error { constructor(public code: string, public data: string) { super(`${code} ${data}`); } }

interface BunNativeSocket {
  write(data: Uint8Array): number;
  end(): void;
  close(): void;
  timeout(seconds: number): void;
  upgradeTLS(options: { socket: BunSocketHandler; tls: { serverName: string; rejectUnauthorized: true } }): [BunNativeSocket, BunNativeSocket];
}

interface BunSocketHandler {
  data(socket: BunNativeSocket, data: Uint8Array): void;
  end(socket: BunNativeSocket): void;
  close(socket: BunNativeSocket, error?: globalThis.Error): void;
  error(socket: BunNativeSocket, error: globalThis.Error): void;
  timeout(socket: BunNativeSocket): void;
}

interface BunRuntime {
  version?: string;
  connect(options: {
    hostname: string;
    port: number;
    tls?: boolean | { serverName: string; rejectUnauthorized: true };
    socket: BunSocketHandler;
  }): Promise<BunNativeSocket>;
}

type Socket = net.Socket | tls.TLSSocket | BunSocket;
type Reply = { code: string; data: string; body: Buffer };
const CRLF = Buffer.from("\r\n");

/**
 * Adapts Bun's native TCP API to the small Node socket surface used by Client.
 * Bun's native upgradeTLS avoids the incompatible node:tls wrapping path.
 */
class BunSocket extends EventEmitter {
  private native?: BunNativeSocket;
  private buffered: Buffer[] = [];
  private timeout?: ReturnType<typeof setTimeout>;
  private timeoutHandler?: () => void;
  private terminalError?: globalThis.Error;

  constructor() { super(); }

  private handler(): BunSocketHandler {
    return {
      data: (_socket, data) => {
        const chunk = Buffer.from(data);
        this.resetTimeout();
        if (this.listenerCount("data")) this.emit("data", chunk); else this.buffered.push(chunk);
      },
      end: () => this.emit("end"),
      close: (_socket, error) => {
        if (error) this.emitError(error);
        this.emit("close");
      },
      error: (_socket, error) => this.emitError(error),
      timeout: () => this.timeoutHandler?.(),
    };
  }

  static async connect(runtime: BunRuntime, hostname: string, port: number, servername: string, tls: boolean) {
    const socket = new BunSocket();
    socket.native = await runtime.connect({ hostname, port, tls: tls ? { serverName: servername, rejectUnauthorized: true } : false, socket: socket.handler() });
    return socket;
  }

  activate() {
    for (const chunk of this.buffered.splice(0)) this.emit("data", chunk);
    if (this.terminalError) this.emitError(this.terminalError);
  }

  write(data: Uint8Array, callback?: (error?: globalThis.Error | null) => void) {
    this.resetTimeout();
    const written = this.native?.write(data) ?? -1;
    const error = written < 0 ? new Error("Connection closed by server") : undefined;
    queueMicrotask(() => callback?.(error));
    return written >= 0;
  }

  end() { this.clearTimeout(); this.native?.end(); }
  destroy(error?: globalThis.Error) { this.clearTimeout(); this.native?.close(); if (error) this.emitError(error); }
  setTimeout(milliseconds: number, callback: () => void) {
    this.timeoutHandler = callback;
    this.resetTimeout(milliseconds);
    return this;
  }

  upgradeTls(servername: string) {
    if (!this.native) throw new Error("Not connected");
    this.clearTimeout();
    // The raw handle is detached by Bun during the upgrade. Its later close
    // notification must not be interpreted as the upgraded TLS connection
    // closing.
    this.removeAllListeners();
    const upgraded = new BunSocket();
    const [, secure] = this.native.upgradeTLS({ socket: upgraded.handler(), tls: { serverName: servername, rejectUnauthorized: true } });
    upgraded.native = secure;
    return upgraded;
  }

  private resetTimeout(milliseconds?: number) {
    if (!this.timeoutHandler) return;
    this.clearTimeout();
    this.timeout = setTimeout(() => this.timeoutHandler?.(), milliseconds ?? Client.readTimeout);
  }
  private clearTimeout() { if (this.timeout) clearTimeout(this.timeout); this.timeout = undefined; }
  private emitError(error: globalThis.Error) {
    this.terminalError ??= error;
    if (this.listenerCount("error")) this.emit("error", error);
  }
}

function bunRuntime(): BunRuntime | undefined {
  const candidate = (globalThis as typeof globalThis & { Bun?: Partial<BunRuntime> }).Bun;
  return typeof candidate?.connect === "function" ? candidate as BunRuntime : undefined;
}

function supportsSecureBunTlsUpgrade(runtime: BunRuntime) {
  const match = /^(\d+)\.(\d+)/.exec(runtime.version ?? "");
  return !!match && (Number(match[1]) > 1 || (Number(match[1]) === 1 && Number(match[2]) >= 4));
}

/** Async RFC 5804 client. All network operations return promises. */
export class Client {
  static readTimeout = 5_000;
  socket?: Socket;
  authenticated = false;
  errcode = "";
  errmsg = "";
  private chunks: Buffer[] = [];
  private available = 0;
  private ended?: globalThis.Error;
  private wake?: () => void;
  private capabilitiesMap = new Map<string, string>();

  constructor(public srvaddr: string, public srvport = 4190, public srvhostname = srvaddr, public debug = false) {}
  private log(value: unknown) { if (this.debug) console.debug("DEBUG:", value); }
  private finish(error: globalThis.Error) { this.ended ??= error; this.wake?.(); this.wake = undefined; }

  private attach(socket: Socket) {
    this.chunks = []; this.available = 0; this.ended = undefined;
    const events = socket as unknown as EventEmitter;
    events.on("data", (chunk: Buffer) => { this.log(chunk); this.chunks.push(Buffer.from(chunk)); this.available += chunk.length; this.wake?.(); this.wake = undefined; });
    events.once("end", () => this.finish(new Error("Connection closed by server")));
    events.once("close", () => this.finish(new Error("Connection closed by server")));
    events.once("error", (error: globalThis.Error) => this.finish(error));
    socket.setTimeout(Client.readTimeout, () => socket.destroy(new Error("Failed to read data from server")));
    if (socket instanceof BunSocket) socket.activate();
  }
  private async waitForData() {
    if (this.available) return;
    if (this.ended) throw this.ended;
    await new Promise<void>((resolve) => { this.wake = resolve; });
    if (!this.available && this.ended) throw this.ended;
  }
  private async readBytes(length: number): Promise<Buffer> {
    const output = Buffer.allocUnsafe(length); let offset = 0;
    while (offset < length) {
      await this.waitForData(); const chunk = this.chunks[0]; const count = Math.min(length - offset, chunk.length);
      chunk.copy(output, offset, 0, count); offset += count; this.available -= count;
      if (count === chunk.length) this.chunks.shift(); else this.chunks[0] = chunk.subarray(count);
    }
    return output;
  }
  private async readLine(): Promise<Buffer> {
    const parts: Buffer[] = [];
    while (true) {
      await this.waitForData(); const chunk = this.chunks[0]; const found = chunk.indexOf(CRLF);
      if (found >= 0) { parts.push(await this.readBytes(found)); await this.readBytes(2); return parts.length === 1 ? parts[0] : Buffer.concat(parts); }
      parts.push(await this.readBytes(chunk.length));
    }
  }
  private async open(implicitTls: boolean) {
    const bun = bunRuntime();
    // Bun's native plain TCP implementation avoids the node:net compatibility
    // layer. TLS sockets continue to use node:tls unless a STARTTLS upgrade is
    // needed below.
    if (bun && !implicitTls) {
      this.socket = await BunSocket.connect(bun, this.srvaddr, this.srvport, this.srvhostname, implicitTls);
      this.attach(this.socket);
      return;
    }
    const socket: Socket = implicitTls ? tls.connect({ host: this.srvaddr, port: this.srvport, servername: this.srvhostname }) : net.connect({ host: this.srvaddr, port: this.srvport });
    await new Promise<void>((resolve, reject) => { socket.once(implicitTls ? "secureConnect" : "connect", resolve); socket.once("error", reject); });
    this.socket = socket; this.attach(socket);
  }
  private async upgradeTls() {
    if (!this.socket) throw new Error("Not connected");
    if (this.socket instanceof BunSocket) {
      const bun = bunRuntime();
      if (!bun || !supportsSecureBunTlsUpgrade(bun)) {
        throw new Error("Bun 1.4.0 or later is required for secure ManageSieve STARTTLS connections");
      }
      this.socket = this.socket.upgradeTls(this.srvhostname);
      this.attach(this.socket);
      return;
    }
    const socket = tls.connect({ socket: this.socket as net.Socket, servername: this.srvhostname });
    await new Promise<void>((resolve, reject) => { socket.once("secureConnect", resolve); socket.once("error", reject); });
    this.socket = socket; this.attach(socket);
  }
  private async write(data: Buffer) {
    if (!this.socket) throw new Error("Not connected");
    await new Promise<void>((resolve, reject) => this.socket!.write(data, (error) => error ? reject(error) : resolve()));
  }
  private static encodeArgument(value: string) {
    if (/[\r\n\0]/.test(value)) throw new Error(`Invalid character in argument: ${JSON.stringify(value)}`);
    return quote(value);
  }
  private async readLiteral(length: number) {
    const literal = await this.readBytes(length);
    // A literal without its own trailing CRLF is followed by a blank framing line.
    if (!literal.subarray(Math.max(0, literal.length - 2)).equals(CRLF)) {
      const terminator = await this.readLine(); if (terminator.length) throw new Error("Invalid literal termination");
    }
    return literal;
  }
  private async parseError(data: string) {
    this.errcode = ""; this.errmsg = "";
    const match = /^(?:\((?<code>(?:[^)"]|"(?:[^"\\]|\\.)*")*)\)\s*)?(?:(?:"(?<quoted>(?:[^"\\]|\\.)*)")|(?:\{(?<size>\d+)\+?\}))?$/.exec(data);
    if (!match?.groups) throw new Error("Bad error message");
    this.errcode = match.groups.code ?? "";
    if (match.groups.quoted !== undefined) this.errmsg = match.groups.quoted.replace(/\\(.)/gs, "$1");
    else if (match.groups.size !== undefined) this.errmsg = (await this.readLiteral(Number(match.groups.size))).toString("utf8");
  }
  private async readResponse(): Promise<Reply> {
    const body: Buffer[] = [];
    while (true) {
      const line = await this.readLine(); const text = line.toString("utf8"); const literal = /^\{(\d+)\+?\}$/.exec(text);
      if (literal) {
        const value = await this.readLiteral(Number(literal[1]));
        body.push(value);
        if (!value.subarray(Math.max(0, value.length - 2)).equals(CRLF)) body.push(CRLF);
        continue;
      }
      const status = /^(OK|NO|BYE)(?:\s*(.*))?$/.exec(text);
      if (status) {
        if (status[1] === "BYE") throw new Error("Connection closed by server");
        if (status[1] === "NO") await this.parseError(status[2] ?? "");
        return { code: status[1], data: status[2] ?? "", body: Buffer.concat(body) };
      }
      if (line.length) body.push(line, CRLF);
    }
  }
  private async send(name: string, args: Array<string | number | Buffer> = []) {
    const values = args.map((arg) => typeof arg === "number" ? String(arg) : Buffer.isBuffer(arg) ? arg.toString("utf8") : Client.encodeArgument(arg));
    const command = Buffer.from(`${name}${values.length ? ` ${values.join(" ")}` : ""}\r\n`, "utf8"); this.log(command); await this.write(command); return this.readResponse();
  }
  private async getCapabilities() {
    const response = await this.readResponse(); if (response.code !== "OK") return false;
    this.capabilitiesMap.clear();
    for (const line of response.body.toString("utf8").split("\r\n")) {
      const match = /^"((?:[^"\\]|\\.)*)"(?:\s+"((?:[^"\\]|\\.)*)")?$/.exec(line);
      if (match) this.capabilitiesMap.set(match[1].replace(/\\(.)/g, "$1"), (match[2] ?? "").replace(/\\(.)/g, "$1"));
    }
    return true;
  }

  getImplementation() { return this.capabilitiesMap.get("IMPLEMENTATION"); }
  getSaslMechanisms() { return (this.capabilitiesMap.get("SASL") ?? "").split(/\s+/).filter(Boolean); }
  hasTlsSupport() { return this.capabilitiesMap.has("STARTTLS"); }
  getSieveCapabilities() { return (this.capabilitiesMap.get("SIEVE") ?? "").split(/\s+/).filter(Boolean); }
  get_implementation() { return this.getImplementation(); }
  get_sasl_mechanisms() { return this.getSaslMechanisms(); }
  has_tls_support() { return this.hasTlsSupport(); }
  get_sieve_capabilities() { return this.getSieveCapabilities(); }

  async connect(login: string, password: string, authzId = "", starttls = false, ssl = false, authmech?: string) {
    if (authmech && !SUPPORTED_AUTH_MECHS.includes(authmech as typeof SUPPORTED_AUTH_MECHS[number])) throw new Error(`Unsupported authentication mechanism: ${authmech}`);
    await this.open(ssl); if (!await this.getCapabilities()) throw new Error("Failed to read capabilities from server");
    if (!ssl && starttls) {
      if (!this.hasTlsSupport()) throw new Error("STARTTLS not supported by the server");
      if ((await this.send("STARTTLS")).code !== "OK") return false;
      await this.upgradeTls(); if (!await this.getCapabilities()) throw new Error("Failed to read capabilities from server");
    }
    for (const mechanism of (authmech ? [authmech] : SUPPORTED_AUTH_MECHS)) {
      if (!this.getSaslMechanisms().includes(mechanism)) continue;
      let response: Reply;
      if (mechanism === "LOGIN") {
        await this.write(Buffer.from(`AUTHENTICATE LOGIN\r\n"${Buffer.from(login).toString("base64")}"\r\n"${Buffer.from(password).toString("base64")}"\r\n`)); response = await this.readResponse();
      } else {
        const payload = mechanism === "PLAIN" ? `${authzId}\0${login}\0${password}` : mechanism === "XOAUTH2" ? `user=${login},\x01auth=Bearer ${password}\x01\x01` : `n,a=${login},\x01auth=Bearer ${password}\x01\x01`;
        response = await this.send("AUTHENTICATE", [mechanism, Buffer.from(payload).toString("base64")]);
      }
      this.authenticated = response.code === "OK"; return this.authenticated;
    }
    this.errmsg = "No suitable mechanism found"; return false;
  }
  private requireAuthentication() { if (!this.authenticated) throw new Error("Authentication required"); }
  private literal(content: string) { const bytes = Buffer.from(content.replace(/\r?\n/g, "\r\n")); return Buffer.concat([Buffer.from(`{${bytes.length}+}\r\n`), bytes]); }
  async logout() { const reply = await this.send("LOGOUT"); this.socket?.end(); return reply.code === "OK"; }
  async capability() { const reply = await this.send("CAPABILITY"); return reply.code === "OK" ? reply.body.toString("utf8") : null; }
  async havespace(name: string, size: number) { this.requireAuthentication(); return (await this.send("HAVESPACE", [name, size])).code === "OK"; }
  async listscripts() {
    this.requireAuthentication(); const reply = await this.send("LISTSCRIPTS"); if (reply.code !== "OK") return null;
    let active: string | undefined; const scripts: string[] = [];
    for (const line of reply.body.toString("utf8").split("\r\n")) {
      const match = /^"((?:[^"\\]|\\.)*)"(?:\s+(ACTIVE))?$/i.exec(line); if (!match) continue;
      const name = match[1].replace(/\\(.)/g, "$1"); if (match[2]) active = name; else scripts.push(name);
    }
    return [active, scripts] as [string | undefined, string[]];
  }
  async getscript(name: string) { this.requireAuthentication(); const reply = await this.send("GETSCRIPT", [name]); return reply.code === "OK" ? reply.body.toString("utf8").replace(/\r\n/g, "\n").replace(/\n$/, "") : null; }
  async putscript(name: string, content: string) { this.requireAuthentication(); return (await this.send("PUTSCRIPT", [name, this.literal(content)])).code === "OK"; }
  async deletescript(name: string) { this.requireAuthentication(); return (await this.send("DELETESCRIPT", [name])).code === "OK"; }
  async setactive(name: string) { this.requireAuthentication(); return (await this.send("SETACTIVE", [name])).code === "OK"; }
  async checkscript(content: string) { this.requireAuthentication(); if (!this.capabilitiesMap.has("VERSION")) throw new Error("server does not support CHECKSCRIPT command"); return (await this.send("CHECKSCRIPT", [this.literal(content)])).code === "OK"; }
  async renamescript(oldname: string, newname: string) {
    this.requireAuthentication(); if (this.capabilitiesMap.has("VERSION")) return (await this.send("RENAMESCRIPT", [oldname, newname])).code === "OK";
    const listing = await this.listscripts(); if (!listing) return false; const [active, scripts] = listing;
    if (oldname !== active && !scripts.includes(oldname)) { this.errmsg = "Old script does not exist"; return false; }
    if (scripts.includes(newname)) { this.errmsg = "New script already exists"; return false; }
    const content = await this.getscript(oldname);
    return content !== null && await this.putscript(newname, content) && (!active || active !== oldname || await this.setactive(newname)) && await this.deletescript(oldname);
  }
}
