import net from 'node:net';
import tls from 'node:tls';
import { EventEmitter } from 'node:events';

declare const SUPPORTED_AUTH_MECHS: readonly ["PLAIN", "LOGIN", "OAUTHBEARER", "XOAUTH2"];
declare class Error extends globalThis.Error {
}
declare class Response extends globalThis.Error {
    code: string;
    data: string;
    constructor(code: string, data: string);
}
interface BunNativeSocket {
    write(data: Uint8Array): number;
    end(): void;
    close(): void;
    timeout(seconds: number): void;
    upgradeTLS(options: {
        socket: BunSocketHandler;
        tls: {
            serverName: string;
            rejectUnauthorized: true;
        };
    }): [BunNativeSocket, BunNativeSocket];
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
        tls?: boolean | {
            serverName: string;
            rejectUnauthorized: true;
        };
        socket: BunSocketHandler;
    }): Promise<BunNativeSocket>;
}
type Socket = net.Socket | tls.TLSSocket | BunSocket;
/**
 * Adapts Bun's native TCP API to the small Node socket surface used by Client.
 * Bun's native upgradeTLS avoids the incompatible node:tls wrapping path.
 */
declare class BunSocket extends EventEmitter {
    private native?;
    private buffered;
    private timeout?;
    private timeoutHandler?;
    private terminalError?;
    constructor();
    private handler;
    static connect(runtime: BunRuntime, hostname: string, port: number, servername: string, tls: boolean): Promise<BunSocket>;
    activate(): void;
    write(data: Uint8Array, callback?: (error?: globalThis.Error | null) => void): boolean;
    end(): void;
    destroy(error?: globalThis.Error): void;
    setTimeout(milliseconds: number, callback: () => void): this;
    upgradeTls(servername: string): BunSocket;
    private resetTimeout;
    private clearTimeout;
    private emitError;
}
/** Async RFC 5804 client. All network operations return promises. */
declare class Client {
    srvaddr: string;
    srvport: number;
    srvhostname: string;
    debug: boolean;
    static readTimeout: number;
    socket?: Socket;
    authenticated: boolean;
    errcode: string;
    errmsg: string;
    private chunks;
    private available;
    private ended?;
    private wake?;
    private capabilitiesMap;
    constructor(srvaddr: string, srvport?: number, srvhostname?: string, debug?: boolean);
    private log;
    private finish;
    private attach;
    private waitForData;
    private readBytes;
    private readLine;
    private open;
    private upgradeTls;
    private write;
    private static encodeArgument;
    private readLiteral;
    private parseError;
    private readResponse;
    private send;
    private getCapabilities;
    getImplementation(): string | undefined;
    getSaslMechanisms(): string[];
    hasTlsSupport(): boolean;
    getSieveCapabilities(): string[];
    get_implementation(): string | undefined;
    get_sasl_mechanisms(): string[];
    has_tls_support(): boolean;
    get_sieve_capabilities(): string[];
    connect(login: string, password: string, authzId?: string, starttls?: boolean, ssl?: boolean, authmech?: string): Promise<boolean>;
    private requireAuthentication;
    private literal;
    logout(): Promise<boolean>;
    capability(): Promise<string | null>;
    havespace(name: string, size: number): Promise<boolean>;
    listscripts(): Promise<[string | undefined, string[]] | null>;
    getscript(name: string): Promise<string | null>;
    putscript(name: string, content: string): Promise<boolean>;
    deletescript(name: string): Promise<boolean>;
    setactive(name: string): Promise<boolean>;
    checkscript(content: string): Promise<boolean>;
    renamescript(oldname: string, newname: string): Promise<boolean>;
}

export { Client, Error, Response, SUPPORTED_AUTH_MECHS };
