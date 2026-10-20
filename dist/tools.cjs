"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/tools.ts
var tools_exports = {};
__export(tools_exports, {
  isQuoted: () => isQuoted,
  quote: () => quote,
  unquote: () => unquote,
  unquoteArg: () => unquoteArg
});
module.exports = __toCommonJS(tools_exports);
var quoted = /^"(?:[^"\\]|\\.)*"$/s;
var isQuoted = (value) => quoted.test(value);
var quote = (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
var unquote = (value) => isQuoted(value) ? value.slice(1, -1).replace(/\\(.)/gs, "$1") : value;
var unquoteArg = (value) => Array.isArray(value) ? value.map(unquote) : unquote(value);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isQuoted,
  quote,
  unquote,
  unquoteArg
});
//# sourceMappingURL=tools.cjs.map