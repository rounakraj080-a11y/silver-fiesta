import React, { useEffect, useRef, useState } from "react";

function formatTime(iso) {
  try {
    const d = new Date(iso.replace(" ", "T") + "Z");
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function Message({ message, showHeader }) {
  return (
    <div className={`flex gap-3 px-4 hover:bg-discord-light/30 ${showHeader ? "mt-4" : "mt-0.5"} py-0.5`}>
      <div className="w-10 shrink-0">
        {showHeader && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: message.author.avatarColor }}
          >
            {message.author.username.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-white font-medium text-sm">{message.author.username}</span>
            <span className="text-discord-muted text-xs">{formatTime(message.createdAt)}</span>
          </div>
        )}
        <div className="text-discord-text text-sm break-words whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

export default function ChatView({ channel, messages, onSendMessage, membersPanelOpen, onToggleMembersPanel, connected, mobileVisible, onBack }) {
  const [draft, setDraft] = useState("");
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, channel?.id]);

  function submit(e) {
    e.preventDefault();
    if (!draft.trim() || !channel) return;
    onSendMessage(draft.trim());
    setDraft("");
  }

  const isVoiceChannel = channel?.type === "voice";

  return (
    <div className={`${mobileVisible ? "flex" : "hidden"} md:flex flex-1 h-full flex-col min-w-0 bg-discord-mid`}>
      <div className="h-12 shrink-0 flex items-center px-4 border-b border-discord-darkest shadow-sm gap-2">
        <button onClick={onBack} className="md:hidden text-discord-muted hover:text-white text-lg" title="Back to channels">
          ‹
        </button>
        <span className="text-discord-muted text-lg">{isVoiceChannel ? "🔊" : "#"}</span>
        <span className="text-white font-semibold truncate">{channel?.name || "no-channel"}</span>
        {!connected && (
          <span className="text-xs text-discord-red ml-2">reconnecting…</span>
        )}
        <button
          onClick={onToggleMembersPanel}
          className={`ml-auto w-8 h-8 rounded flex items-center justify-center text-sm hover:bg-discord-light ${membersPanelOpen ? "text-white bg-discord-light" : "text-discord-muted"}`}
          title="Toggle Online Members"
        >
          👥
        </button>
      </div>

      {isVoiceChannel ? (
        <div className="flex-1 flex items-center justify-center text-discord-muted flex-col gap-2">
          <div className="text-4xl">🔊</div>
          <div>This is a voice channel — click it in the sidebar to join.</div>
        </div>
      ) : (
        <>
          <div ref={logRef} className="flex-1 overflow-y-auto pb-4">
            <div className="pt-4" />
            {messages.length === 0 && (
              <div className="px-4 text-discord-muted text-sm">No messages yet — say something!</div>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showHeader =
                !prev || prev.author.id !== m.author.id || new Date(m.createdAt) - new Date(prev.createdAt) > 5 * 60 * 1000;
              return <Message key={m.id} message={m} showHeader={showHeader} />;
            })}
          </div>

          <form onSubmit={submit} className="shrink-0 px-4 pb-6 pt-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message #${channel?.name || ""}`}
              className="w-full bg-discord-light text-discord-text placeholder-discord-muted rounded-lg px-4 py-2.5 outline-none"
            />
          </form>
        </>
      )}
    </div>
  );
}
