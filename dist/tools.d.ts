declare const isQuoted: (value: string) => boolean;
declare const quote: (value: string) => string;
declare const unquote: (value: string) => string;
declare const unquoteArg: (value: string | string[]) => string | string[];

export { isQuoted, quote, unquote, unquoteArg };
