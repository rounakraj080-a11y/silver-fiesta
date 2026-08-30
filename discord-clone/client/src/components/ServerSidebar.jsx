import React, { useState } from "react";

export default function ServerSidebar({ servers, activeServerId, onSelectServer, onCreateServer, onJoinServer, mobileVisible }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "create") {
        if (!name.trim()) return;
        await onCreateServer(name.trim());
      } else {
        if (!joinCode.trim()) return;
        await onJoinServer(joinCode.trim());
      }
      setName("");
      setJoinCode("");
      setShowCreate(false);
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`${mobileVisible ? "flex" : "hidden"} md:flex w-full md:w-[72px] shrink-0 h-full bg-discord-darkest flex-col items-center py-3 gap-2 overflow-y-auto`}
    >
      {servers.map((s) => {
        const active = s.id === activeServerId;
        return (
          <button
            key={s.id}
            onClick={() => onSelectServer(s.id)}
            title={s.name}
            className="w-full md:w-12 flex md:block items-center gap-3 md:gap-0 px-4 md:px-0 py-2 md:py-0 rounded md:rounded-none hover:bg-discord-light/40 md:hover:bg-transparent"
          >
            <span
              className={`relative w-12 h-12 shrink-0 flex items-center justify-center text-white font-semibold
                transition-all duration-150
                ${active ? "rounded-2xl bg-discord-blurple" : "rounded-3xl bg-discord-mid md:hover:rounded-2xl md:hover:bg-discord-blurple"}`}
            >
              <span
                className={`hidden md:block absolute left-[-16px] bg-white rounded-r-full transition-all duration-150
                  ${active ? "h-10 w-1.5" : "h-2 w-1.5 opacity-0 group-hover:opacity-100"}`}
              />
              {s.icon_text}
            </span>
            <span className="md:hidden text-white text-sm font-medium truncate">{s.name}</span>
          </button>
        );
      })}

      <div className="w-full md:w-8 border-t border-discord-lighter my-1" />

      <button
        onClick={() => {
          setShowCreate(true);
          setMode("create");
          setError("");
        }}
        title="Add a Server"
        className="w-full md:w-12 flex md:block items-center gap-3 md:gap-0 px-4 md:px-0 py-2 md:py-0"
      >
        <span className="w-12 h-12 shrink-0 rounded-3xl bg-discord-mid md:hover:rounded-2xl md:hover:bg-discord-green text-discord-green md:hover:text-white flex items-center justify-center text-2xl font-bold transition-all duration-150">
          +
        </span>
        <span className="md:hidden text-discord-green text-sm font-medium">Add a Server</span>
      </button>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <form
            onSubmit={submit}
            className="bg-discord-dark rounded-lg p-6 w-full max-w-sm shadow-xl"
          >
            <h2 className="text-white text-lg font-bold mb-4">
              {mode === "create" ? "Create a server" : "Join a server"}
            </h2>

            <div className="flex gap-2 mb-4 text-sm">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={`flex-1 py-1.5 rounded ${mode === "create" ? "bg-discord-blurple text-white" : "bg-discord-darkest text-discord-muted"}`}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setMode("join")}
                className={`flex-1 py-1.5 rounded ${mode === "join" ? "bg-discord-blurple text-white" : "bg-discord-darkest text-discord-muted"}`}
              >
                Join by code
              </button>
            </div>

            {error && (
              <div className="bg-discord-red/20 border border-discord-red text-discord-red text-sm rounded px-3 py-2 mb-3">
                {error}
              </div>
            )}

            {mode === "create" ? (
              <input
                autoFocus
                placeholder="Server name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mb-4 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple"
              />
            ) : (
              <input
                autoFocus
                placeholder="Invite code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full mb-4 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple uppercase"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-discord-muted hover:text-white px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="bg-discord-blurple hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
              >
                {mode === "create" ? "Create" : "Join"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
