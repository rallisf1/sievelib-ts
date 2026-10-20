const quoted = /^"(?:[^"\\]|\\.)*"$/s;
export const isQuoted = (value: string) => quoted.test(value);
export const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
export const unquote = (value: string) => isQuoted(value) ? value.slice(1, -1).replace(/\\(.)/gs, "$1") : value;
export const unquoteArg = (value: string | string[]) => Array.isArray(value) ? value.map(unquote) : unquote(value);
