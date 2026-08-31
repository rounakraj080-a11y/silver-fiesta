import React, { useEffect, useRef, useState } from "react";
import api from "../api";

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

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Attachment({ attachment }) {
  const isImage = attachment.type?.startsWith("image/");

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="inline-block mt-1.5">
        <img
          src={attachment.url}
          alt={attachment.name}
          loading="lazy"
          className="max-w-[320px] max-h-[320px] rounded-lg border border-discord-darkest"
        />
      </a>
    );
  }

  return (
 <a   
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="mt-1.5 inline-flex items-center gap-2 bg-discord-darkest/60 hover:bg-discord-darkest rounded-lg px-3 py-2 max-w-xs"
    >
      <span className="text-xl">📎</span>
      <div className="min-w-0">
        <div className="text-discord-text text-sm truncate">{attachment.name}</div>
        <div className="text-discord-muted text-xs">{formatBytes(attachment.size)}</div>
      </div>
    </a>
  );
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
        {message.content && (
          <div className="text-discord-text text-sm break-words whitespace-pre-wrap">{message.content}</div>
        )}
        {message.attachment && <Attachment attachment={message.attachment} />}
      </div>
    </div>
  );
}

export default function ChatView({ channel, messages, onSendMessage, membersPanelOpen, onToggleMembersPanel, connected, mobileVisible, onBack }) {
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const logRef = useRef(null);
  const fileInputRef = useRef(null);

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

  async function handleFilePicked(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !channel) return;

    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSendMessage("", {
        url: res.data.url,
        name: res.data.name,
        type: res.data.type,
        size: res.data.size,
      });
    } catch (err) {
      setUploadError(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
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

          <form onSubmit={submit} className="shrink-0 px-4 pb-8 pt-2">
            {uploadError && (
              <div className="text-discord-red text-xs mb-1.5">{uploadError}</div>
            )}
            <div className="flex items-center gap-2 bg-discord-light rounded-lg px-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFilePicked}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Upload a file or image"
                className="shrink-0 w-8 h-8 flex items-center justify-center text-discord-muted hover:text-white text-lg disabled:opacity-50"
              >
                {uploading ? "…" : "📎"}
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message"
                className="flex-1 bg-transparent text-discord-text placeholder-discord-muted py-2.5 outline-none"
              />
            </div>
          </form>
        </>
      )}
    </div>
  );
}
