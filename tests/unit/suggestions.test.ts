import { expect, test } from "vitest";
import { suggestMatches } from "../../src/suggestions/matches";

test("suggests exact normalized names and the two curated equivalents in either direction", () => {
  expect(suggestMatches(["  CUSTOMER   Code ", "Other"], "customer code")).toEqual(["  CUSTOMER   Code "]);
  expect(suggestMatches(["Ship To", "PO #"], "Consignee")).toEqual(["Ship To"]);
  expect(suggestMatches(["Ship To", "PO #"], "Purchase Order Reference")).toEqual(["PO #"]);
  expect(suggestMatches(["Consignee"], "SHIP TO")).toEqual(["Consignee"]);
  expect(suggestMatches(["Purchase Order Reference"], "PO #")).toEqual(["Purchase Order Reference"]);
});

test.each([
  ["Bill To", "Consignee"], ["Billing Party", "Ship To"],
  ["Sales Order", "Purchase Order Reference"], ["Shipment ID", "Stop ID"],
  ["Quantity Cases", "Quantity Units"], ["Weight lb", "Weight kg"],
  ["ShipTo", "Ship To"], ["PO Number", "PO #"], ["", ""],
])("does not conflate %s with %s", (source, destination) => {
  expect(suggestMatches([source], destination)).toEqual([]);
});

test("keeps ambiguous alternatives in source order, without selecting one or mutating inputs", () => {
  const headers = Object.freeze(["Consignee", "SHIP TO", "Ship To", "Bill To"]);
  expect(suggestMatches(headers, "Consignee")).toEqual(["Consignee", "SHIP TO", "Ship To"]);
  expect(suggestMatches(headers, "Consignee")).toEqual(suggestMatches(headers, "Consignee"));
  expect(headers).toEqual(["Consignee", "SHIP TO", "Ship To", "Bill To"]);
});
