import { describe, expect, it } from "vitest";
import { normalizeFollowerAdds, normalizeTotal } from "./normalize";

describe("normalisation Meta", () => {
  it("extrait la métrique views", () => expect(normalizeTotal({ data: [{ name: "views", total_value: { value: 648 } }] }, "views")).toBe(648));
  it("extrait la métrique reach", () => expect(normalizeTotal({ data: [{ name: "reach", total_value: { value: 421 } }] }, "reach")).toBe(421));
  it("ne confond pas les métriques", () => expect(normalizeTotal({ data: [{ name: "views", total_value: { value: 648 } }] }, "reach")).toBeNull());
  it("conserve une réponse vide comme indisponible", () => expect(normalizeTotal({ data: [] }, "reach")).toBeNull());
  it("rejette une valeur non numérique", () => expect(normalizeTotal({ data: [{ name: "views", total_value: { value: "648" } }] }, "views")).toBeNull());
  it("extrait les nouveaux followers du breakdown", () => expect(normalizeFollowerAdds({ data: [{ name: "follows_and_unfollows", total_value: { breakdowns: [{ dimension_keys: ["follow_type"], results: [{ dimension_values: ["FOLLOWER"], value: 12 }, { dimension_values: ["NON_FOLLOWER"], value: 3 }] }] } }] } as never)).toBe(12));
  it("laisse un breakdown absent indisponible", () => expect(normalizeFollowerAdds({ data: [] })).toBeNull());
});
