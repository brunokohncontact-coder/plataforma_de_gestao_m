import { describe, it, expect } from "vitest";
import {
  filterShows,
  hasActiveShowFilter,
  isValidShowStatus,
  type ShowLike,
} from "./shows";

function show(partial: Partial<ShowLike>): ShowLike {
  return {
    title: "Show",
    venue: null,
    city: null,
    status: "CONFIRMED",
    date: "2026-03-10T00:00:00.000Z",
    ...partial,
  };
}

describe("isValidShowStatus", () => {
  it("aceita os status conhecidos", () => {
    expect(isValidShowStatus("PROPOSED")).toBe(true);
    expect(isValidShowStatus("CONFIRMED")).toBe(true);
    expect(isValidShowStatus("PLAYED")).toBe(true);
    expect(isValidShowStatus("CANCELLED")).toBe(true);
  });

  it("rejeita valores desconhecidos, vazios e nulos", () => {
    expect(isValidShowStatus("LIXO")).toBe(false);
    expect(isValidShowStatus("")).toBe(false);
    expect(isValidShowStatus(undefined)).toBe(false);
    expect(isValidShowStatus(null)).toBe(false);
  });
});

describe("hasActiveShowFilter", () => {
  it("é falso para filtro vazio ou só com critérios inválidos", () => {
    expect(hasActiveShowFilter({})).toBe(false);
    expect(hasActiveShowFilter({ q: "   " })).toBe(false);
    expect(hasActiveShowFilter({ status: "LIXO" })).toBe(false);
    expect(hasActiveShowFilter({ from: "2026-13-40" })).toBe(false);
  });

  it("é verdadeiro quando há um critério válido", () => {
    expect(hasActiveShowFilter({ q: "bar" })).toBe(true);
    expect(hasActiveShowFilter({ status: "PLAYED" })).toBe(true);
    expect(hasActiveShowFilter({ from: "2026-03-01" })).toBe(true);
    expect(hasActiveShowFilter({ to: "2026-03-31" })).toBe(true);
  });
});

describe("filterShows", () => {
  const shows: ShowLike[] = [
    show({ title: "Show no Bar do Zé", city: "São Paulo", status: "CONFIRMED", date: "2026-03-05T00:00:00.000Z" }),
    show({ title: "Festival de Inverno", venue: "Praça Central", city: "Curitiba", status: "PROPOSED", date: "2026-04-10T00:00:00.000Z" }),
    show({ title: "Sarau acústico", venue: "Casa Violão", city: "Santos", status: "PLAYED", date: "2026-02-20T00:00:00.000Z" }),
    show({ title: "Show cancelado", status: "CANCELLED", date: "2026-03-15T00:00:00.000Z" }),
  ];

  it("retorna tudo quando o filtro está vazio", () => {
    expect(filterShows(shows, {})).toHaveLength(4);
  });

  it("filtra por status exato", () => {
    const r = filterShows(shows, { status: "PLAYED" });
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe("Sarau acústico");
  });

  it("ignora status inválido (não filtra)", () => {
    expect(filterShows(shows, { status: "LIXO" })).toHaveLength(4);
  });

  it("busca no título, local e cidade", () => {
    expect(filterShows(shows, { q: "bar" }).map((s) => s.title)).toEqual([
      "Show no Bar do Zé",
    ]);
    expect(filterShows(shows, { q: "praça" }).map((s) => s.title)).toEqual([
      "Festival de Inverno",
    ]);
    expect(filterShows(shows, { q: "santos" }).map((s) => s.title)).toEqual([
      "Sarau acústico",
    ]);
  });

  it("busca ignorando acentos e caixa", () => {
    expect(filterShows(shows, { q: "VIOLAO" })).toHaveLength(1);
    expect(filterShows(shows, { q: "sao paulo" })).toHaveLength(1);
  });

  it("ignora termo de busca só com espaços", () => {
    expect(filterShows(shows, { q: "   " })).toHaveLength(4);
  });

  it("filtra por intervalo de datas inclusivo nas duas pontas", () => {
    const r = filterShows(shows, { from: "2026-03-01", to: "2026-03-31" });
    expect(r.map((s) => s.title).sort()).toEqual([
      "Show cancelado",
      "Show no Bar do Zé",
    ]);
  });

  it("usa só o início (from) ou só o fim (to)", () => {
    expect(filterShows(shows, { from: "2026-04-01" }).map((s) => s.title)).toEqual([
      "Festival de Inverno",
    ]);
    expect(filterShows(shows, { to: "2026-02-28" }).map((s) => s.title)).toEqual([
      "Sarau acústico",
    ]);
  });

  it("intervalo invertido não casa nada", () => {
    expect(filterShows(shows, { from: "2026-04-01", to: "2026-03-01" })).toHaveLength(0);
  });

  it("combina status, data e busca em AND", () => {
    const r = filterShows(shows, {
      status: "CONFIRMED",
      from: "2026-03-01",
      to: "2026-03-31",
      q: "bar",
    });
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe("Show no Bar do Zé");
  });

  it("não muta o array de entrada", () => {
    const input = [...shows];
    filterShows(input, { status: "PLAYED" });
    expect(input).toHaveLength(4);
  });
});
