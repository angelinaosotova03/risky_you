import { describe, expect, it } from "vitest";
import { plural, pluralLabel } from "../plural";

const PUMP_FORMS: [string, string, string] = ["качок", "качка", "качков"];
const COIN_FORMS: [string, string, string] = ["монета", "монеты", "монет"];
const MINUTE_FORMS: [string, string, string] = ["минута", "минуты", "минут"];

describe("Склонение 1 / 2-4 / 5-20", () => {
  it("«1 качок, 2 качка, 5 качков» — пример из ТЗ", () => {
    expect(pluralLabel(1, PUMP_FORMS)).toBe("1 качок");
    expect(pluralLabel(2, PUMP_FORMS)).toBe("2 качка");
    expect(pluralLabel(5, PUMP_FORMS)).toBe("5 качков");
  });

  it("«1 монета, 3 монеты, 11 монет» — пример из ТЗ", () => {
    expect(pluralLabel(1, COIN_FORMS)).toBe("1 монета");
    expect(pluralLabel(3, COIN_FORMS)).toBe("3 монеты");
    expect(pluralLabel(11, COIN_FORMS)).toBe("11 монет");
  });

  it("«21 минута» — пример из ТЗ", () => {
    expect(pluralLabel(21, MINUTE_FORMS)).toBe("21 минута");
  });

  it("11-14 — особый случай, всегда форма «много» (в отличие от 1, 2-4)", () => {
    expect(plural(11, PUMP_FORMS)).toBe("качков");
    expect(plural(12, PUMP_FORMS)).toBe("качков");
    expect(plural(13, PUMP_FORMS)).toBe("качков");
    expect(plural(14, PUMP_FORMS)).toBe("качков");
  });

  it("21, 22, 25 — как 1, 2, 5 соответственно (десятки не влияют на форму)", () => {
    expect(plural(21, PUMP_FORMS)).toBe("качок");
    expect(plural(22, PUMP_FORMS)).toBe("качка");
    expect(plural(25, PUMP_FORMS)).toBe("качков");
  });

  it("0 — форма «много», как 5-20", () => {
    expect(plural(0, PUMP_FORMS)).toBe("качков");
  });

  it("101, 102, 105, 111 — сотни не влияют на форму", () => {
    expect(plural(101, PUMP_FORMS)).toBe("качок");
    expect(plural(102, PUMP_FORMS)).toBe("качка");
    expect(plural(105, PUMP_FORMS)).toBe("качков");
    expect(plural(111, PUMP_FORMS)).toBe("качков");
  });

  it("pluralLabel форматирует число тысячи через пробел (ru-RU)", () => {
    expect(pluralLabel(1000, COIN_FORMS)).toBe("1 000 монет");
  });
});
