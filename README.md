# sievelib-ts

Client-side Sieve and ManageSieve library for Node.js, written in TypeScript.

- [Sieve: An Email Filtering Language (RFC 5228)](https://datatracker.ietf.org/doc/html/rfc5228)
- [ManageSieve (RFC 5804)](https://datatracker.ietf.org/doc/html/rfc5804)

`sievelib-ts` has its own npm versioning. Its behavior is based on the sibling
Python [`sievelib`](https://github.com/tonioo/sievelib) source at commit
[`7adda3b6`](https://github.com/tonioo/sievelib/commit/7adda3b66690c1d3f2cb55ce14d186ab0715c77a), rather than on a matching PyPI version number.

## Installation

```bash
npm install sievelib-ts
```

The package supports Node.js 20 or later and provides both ESM and CommonJS
exports.

```js
// ESM
import { Parser, FiltersSet, Client } from "sievelib-ts";

// CommonJS
const { Parser, FiltersSet, Client } = require("sievelib-ts");
```

## Sieve tools

### Supported syntax

The parser supports the Sieve features and extensions implemented by the
reference Python project, including Copy, Body, Vacation and
Vacation Seconds, Relational, Imap4flags, Regex, Notifications, Environment,
Date, and Variables. `encoded-character` syntax from RFC 5228 section 2.4.2.4
is intentionally not supported.

Extensions must be declared with `require` before their commands or match tags
are used. The parser validates this requirement.

### Parse and inspect a script

```js
import { Parser } from "sievelib-ts";

const parser = new Parser();

if (!parser.parse('require ["fileinto"];\nfileinto "Archive";')) {
  console.error(parser.error);
} else {
  console.log(parser.dump());
  console.log(parser.toSieve());

  // Commands form a mutable AST. `walk()` visits every nested node.
  for (const command of parser.result.flatMap((root) => [...root.walk()])) {
    console.log(command.name, command.type);
  }
}
```

`parse()` accepts a JavaScript string or `Uint8Array`, returns `true` or
`false`, and sets `error` and `errorPos` on failure. The parsed top-level
commands are available as `parser.result`.

### Create filters

`FiltersSet` provides the high-level builder API. Header names that are not a
supported test name are treated as `header` tests.

```js
import { FiltersSet } from "sievelib-ts";

const filters = new FiltersSet("mail-rules");
filters.addfilter(
  "invoice forwarding",
  [["Subject", ":contains", "Invoice"]],
  [["redirect", "billing@example.com"]],
);

console.log(filters.toSieve());
// # Filter: invoice forwarding
// if anyof (header :contains "Subject" "Invoice") {
//     redirect "billing@example.com";
// }
```

The builder automatically adds extension requirements where necessary. It
supports `anyof` (the default) and `allof`, negated conditions such as
`:notcontains`, and explicit header conditions when a header name collides with
a test name:

```js
filters.addfilter(
  "header named size",
  [["header", "size", ":is", "large"]],
  [["fileinto", "Large"]],
);
```

### Update existing filters

Load a parsed script into a filter set to retain `# Filter:` and
`# Description:` metadata. Rules with no filter comment are named
`Unnamed rule 1`, `Unnamed rule 2`, and so on.

```js
import { FiltersSet, Parser } from "sievelib-ts";

const parser = new Parser();
parser.parse(`require ["fileinto"];
if header :contains "Subject" "invoice" { fileinto "Invoices"; }
`);

const filters = new FiltersSet("mail-rules");
filters.fromParserResult(parser);

filters.updatefilter(
  "Unnamed rule 1",
  "invoices",
  [["Subject", ":contains", "invoice"]],
  [["fileinto", "Invoices"]],
);

console.log(filters.get_filter_conditions("invoices"));
console.log(filters.get_filter_actions("invoices"));
```

Use `disablefilter`, `enablefilter`, `movefilter`, `removefilter`, and
`replacefilter` to manage a filter set. Disabled filters are represented as an
`if false` wrapper, rather than comments, so the original AST remains usable.

To use another filter-comment convention, configure the prefixes:

```js
const roundcubeFilters = new FiltersSet("roundcube", "# rule:");
```

## ManageSieve tools

`Client` is an asynchronous Node.js ManageSieve client. It supports mandatory
protocol commands, `RENAMESCRIPT` (with a fallback for servers without the
extension), PLAIN, LOGIN, OAUTHBEARER, and XOAUTH2 authentication, STARTTLS,
and implicit TLS.

```js
import { Client } from "sievelib-ts";

const client = new Client("mail.example.com", 4190);

try {
  const authenticated = await client.connect(
    "username",
    "password",
    "",       // authorization identity
    true,     // request STARTTLS
    false,    // implicit TLS instead of STARTTLS
    "PLAIN",
  );

  if (!authenticated) {
    throw new Error(`${client.errcode}: ${client.errmsg}`);
  }

  const scripts = await client.listscripts();
  console.log(scripts); // [activeScript, otherScripts]

  await client.putscript("mail-rules", 'require ["fileinto"];\nkeep;\n');
  await client.setactive("mail-rules");
  console.log(await client.getscript("mail-rules"));
} finally {
  if (client.authenticated) await client.logout();
  else client.socket?.destroy();
}
```

All network methods return promises. Failed protocol commands return `false` or
`null` as appropriate and populate `client.errcode` and `client.errmsg`.
Arguments containing carriage returns, line feeds, or NUL bytes are rejected to
prevent ManageSieve command injection.

## Development and publishing

```bash
npm run verify
npm pack --dry-run
```

`npm run verify` runs type checking, tests, and the dual ESM/CommonJS build.
The `prepublishOnly` hook runs the same verification and validates the npm
tarball before publication.
