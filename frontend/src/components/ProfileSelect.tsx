import { useEffect, useState } from "react";
import { createProfile, listProfiles } from "../api";
import type { Profile } from "../types";

interface Props {
  onSelect: (profile: Profile) => void;
}

export function ProfileSelect({ onSelect }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setError("Nem sikerült betölteni a profilokat."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const profile = await createProfile(name);
      onSelect(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nem sikerült létrehozni a profilt.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="setup-screen">
      <div>
        <div className="section-title">Ki gyakorol?</div>
        {loading && <div>Betöltés...</div>}
        {!loading && profiles.length === 0 && (
          <div className="banner info">Még nincs profil. Hozz létre egyet lent!</div>
        )}
        <div className="mode-grid">
          {profiles.map((p) => (
            <button key={p.id} type="button" className="mode-card" onClick={() => onSelect(p)}>
              👤 {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="section-title">Új profil létrehozása</div>
        <div className="field">
          <input
            type="text"
            placeholder="Név (pl. Efraim)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            maxLength={40}
          />
        </div>
        {error && <div className="banner error">{error}</div>}
        <button className="primary-button" onClick={handleCreate} disabled={creating || !newName.trim()}>
          {creating ? "Létrehozás..." : "Profil létrehozása és folytatás"}
        </button>
      </div>
    </div>
  );
}
