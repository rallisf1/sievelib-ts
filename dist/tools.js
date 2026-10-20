// src/tools.ts
var quoted = /^"(?:[^"\\]|\\.)*"$/s;
var isQuoted = (value) => quoted.test(value);
var quote = (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
var unquote = (value) => isQuoted(value) ? value.slice(1, -1).replace(/\\(.)/gs, "$1") : value;
var unquoteArg = (value) => Array.isArray(value) ? value.map(unquote) : unquote(value);
export {
  isQuoted,
  quote,
  unquote,
  unquoteArg
};
//# sourceMappingURL=tools.js.map