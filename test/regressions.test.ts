import { describe, expect, it } from "vitest";

import { FiltersSet } from "../src/factory.js";
import { Client } from "../src/managesieve.js";
import { Parser } from "../src/parser.js";

describe("parity regressions", () => {
  it("does not add an empty requirement for address conditions", () => {
    const filters = new FiltersSet("test");
    filters.addfilter("address", [["address", ":is", "from", "sender@example.test"]], [["keep"]]);
    expect(filters.toSieve()).not.toContain('require [""]');
  });

  it("builds currentdate relational conditions", () => {
    const filters = new FiltersSet("test");
    filters.addfilter("date", [["currentdate", ":zone", "+0000", ":value", "gt", "weekday", "1"]], [["keep"]]);
    expect(filters.toSieve()).toContain('require ["date", "relational"]');
    expect(filters.toSieve()).toContain('currentdate :zone "+0000" :value "gt" "weekday" ["1"]');
  });

  it("returns a parse failure for invalid UTF-8", () => {
    const parser = new Parser();
    expect(parser.parse(new Uint8Array([0xff]))).toBe(false);
    expect(parser.error).toContain("encoded data");
  });
});

describe("ManageSieve safety", () => {
  it("rejects injected command arguments before serialization", () => {
    const unsafe = Client as unknown as { encodeArgument(value: string): string };
    expect(() => unsafe.encodeArgument('x"\r\nDELETESCRIPT "important')).toThrow("Invalid character");
  });

  it("preserves literal boundaries and literal NO messages", async () => {
    const client = new Client("test");
    const internal = client as unknown as {
      chunks: Buffer[];
      available: number;
      readResponse(): Promise<{ code: string; body: Buffer }>;
    };
    const noResponse = Buffer.from("NO (QUOTA/MAXSIZE) {5}\r\nfull!\r\n");
    internal.chunks = [noResponse]; internal.available = noResponse.length;
    expect((await internal.readResponse()).code).toBe("NO");
    expect(client.errcode).toBe("QUOTA/MAXSIZE");
    expect(client.errmsg).toBe("full!");

    const listing = Buffer.from('{13}\r\nclever"script\r\n"main" ACTIVE\r\nOK "done"\r\n');
    internal.chunks = [listing]; internal.available = listing.length;
    expect((await internal.readResponse()).body.toString()).toBe('clever"script\r\n"main" ACTIVE\r\n');
  });
});
