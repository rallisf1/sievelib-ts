import { Command } from './commands.js';

declare class ParseError extends Error {
    constructor(message: string);
}
type Token = {
    type: string;
    value: string;
    start: number;
};
declare class Lexer {
    scan(text: string): Token[];
}
declare class Parser {
    debug: boolean;
    result: Command[];
    error?: string;
    errorPos?: [number, number, number];
    readonly lexer: Lexer;
    private tokens;
    private pos;
    private comments;
    constructor(debug?: boolean);
    private current;
    private take;
    private extensionError;
    private parseValue;
    private parseTest;
    private parseCommand;
    parse(input: string | Uint8Array): boolean;
    toSieve(): string;
    dump(): string;
}

export { Lexer, ParseError, Parser };
