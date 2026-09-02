import { describe, expect, it } from "vitest";
import {
  kaiserreichStub,
  langgewehrM98Stub,
  linieninfanterieStub,
  schuetzeStub,
} from "./beispiele";

// Reiner Kompilier-/Existenz-Check — die Stubs sind Platzhalter ohne Logik.
describe("schema placeholder examples", () => {
  it("weapon stub keeps id, category and reload matched to WAFFEN.md", () => {
    expect(langgewehrM98Stub.id).toBe("langgewehr-m98");
    expect(langgewehrM98Stub.category).toBe("repetiergewehr");
    expect(langgewehrM98Stub.nachladeArt).toBe("ladestreifen");
  });

  it("class / nation / enemy stubs carry their ids", () => {
    expect(schuetzeStub.id).toBe("schuetze");
    expect(schuetzeStub.bonusKategorie).toBe("repetiergewehr");
    expect(kaiserreichStub.vertrauteWaffen).toContain("langgewehr-m98");
    expect(linieninfanterieStub.mode).toBe("tag");
    expect(linieninfanterieStub.konterHaerte).toBe("weich");
  });
});
