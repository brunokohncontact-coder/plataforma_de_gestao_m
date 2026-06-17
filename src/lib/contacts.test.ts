import { describe, it, expect } from "vitest";
import { summarizeContactShows, type ContactShowLike } from "./contacts";

const NOW = new Date("2026-06-17T12:00:00Z");

function show(over: Partial<ContactShowLike> & { id: string }): ContactShowLike {
  return {
    title: "Show",
    date: "2026-06-01T20:00:00Z",
    status: "CONFIRMED",
    fee: 100_00,
    ...over,
  };
}

describe("summarizeContactShows", () => {
  it("trata lista vazia", () => {
    const s = summarizeContactShows([], NOW);
    expect(s.total).toBe(0);
    expect(s.upcoming).toEqual([]);
    expect(s.past).toEqual([]);
    expect(s.totalFee).toBe(0);
    expect(s.nextShow).toBeNull();
    expect(s.byStatus).toEqual({ PROPOSED: 0, CONFIRMED: 0, PLAYED: 0, CANCELLED: 0 });
  });

  it("separa futuros (crescente) de passados (decrescente)", () => {
    const s = summarizeContactShows(
      [
        show({ id: "p1", date: "2026-06-01T20:00:00Z" }),
        show({ id: "f2", date: "2026-08-01T20:00:00Z" }),
        show({ id: "f1", date: "2026-07-01T20:00:00Z" }),
        show({ id: "p2", date: "2026-05-01T20:00:00Z" }),
      ],
      NOW,
    );
    expect(s.upcoming.map((x) => x.id)).toEqual(["f1", "f2"]);
    expect(s.past.map((x) => x.id)).toEqual(["p1", "p2"]);
    expect(s.total).toBe(4);
  });

  it("conta o instante exato 'agora' como futuro (>= now)", () => {
    const s = summarizeContactShows(
      [show({ id: "agora", date: NOW.toISOString() })],
      NOW,
    );
    expect(s.upcoming.map((x) => x.id)).toEqual(["agora"]);
    expect(s.past).toEqual([]);
  });

  it("conta por status incluindo zeros", () => {
    const s = summarizeContactShows(
      [
        show({ id: "a", status: "PROPOSED" }),
        show({ id: "b", status: "CONFIRMED" }),
        show({ id: "c", status: "CONFIRMED" }),
        show({ id: "d", status: "CANCELLED" }),
      ],
      NOW,
    );
    expect(s.byStatus).toEqual({ PROPOSED: 1, CONFIRMED: 2, PLAYED: 0, CANCELLED: 1 });
  });

  it("soma o cachê ignorando cancelados", () => {
    const s = summarizeContactShows(
      [
        show({ id: "a", fee: 100_00, status: "CONFIRMED" }),
        show({ id: "b", fee: 250_00, status: "PLAYED" }),
        show({ id: "c", fee: 999_00, status: "CANCELLED" }),
      ],
      NOW,
    );
    expect(s.totalFee).toBe(350_00);
  });

  it("nextShow é o futuro não cancelado de menor data", () => {
    const s = summarizeContactShows(
      [
        show({ id: "cancelado", date: "2026-06-20T20:00:00Z", status: "CANCELLED" }),
        show({ id: "proximo", date: "2026-06-25T20:00:00Z", status: "CONFIRMED" }),
        show({ id: "depois", date: "2026-07-25T20:00:00Z", status: "PROPOSED" }),
      ],
      NOW,
    );
    expect(s.nextShow?.id).toBe("proximo");
  });

  it("nextShow é null quando só há shows passados ou futuros cancelados", () => {
    const s = summarizeContactShows(
      [
        show({ id: "passado", date: "2026-01-01T20:00:00Z", status: "PLAYED" }),
        show({ id: "fut-cancel", date: "2026-09-01T20:00:00Z", status: "CANCELLED" }),
      ],
      NOW,
    );
    expect(s.nextShow).toBeNull();
  });
});
