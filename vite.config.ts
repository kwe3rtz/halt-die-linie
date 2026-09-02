import { defineConfig } from "vite";

// Basis-Pfad: lokal '/'. Für den GitHub-Pages-Preview-Deploy setzt die CI
// VITE_BASE (z. B. '/halt-die-linie/'), weil Pages unter einem Repo-Subpfad liegt.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
