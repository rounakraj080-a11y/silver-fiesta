import React, { useState } from "react";

function ChannelRow({ channel, active, onSelect, voiceMembers, inThisVoice }) {
  const isVoice = channel.type === "voice";
  return (
    <div>
      <button
        onClick={() => onSelect(channel)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm group
          ${active ? "bg-discord-lighter text-white" : "text-discord-muted hover:bg-discord-light hover:text-discord-text"}`}
      >
        <span className="text-lg leading-none opacity-70">{isVoice ? "🔊" : "#"}</span>
        <span className="truncate">{channel.name}</span>
        {isVoice && inThisVoice && (
          <span className="ml-auto w-2 h-2 rounded-full bg-discord-green" title="You're connected" />
        )}
      </button>

      {isVoice && voiceMembers?.length > 0 && (
        <div className="ml-7 mb-1 flex flex-col gap-1">
          {voiceMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-discord-muted text-xs py-0.5">
              <span className="w-2 h-2 rounded-full bg-discord-green shrink-0" />
              <span className="truncate">{m.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChannelSidebar({
  server,
  channels,
  activeChannel,
  onSelectChannel,
  onCreateChannel,
  voicePresence,
  currentVoiceChannelId,
  user,
  muted,
  onToggleMute,
  onLogout,
  mobileVisible,
  onBack,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("text");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyInviteCode() {
    if (!server?.invite_code) return;
    navigator.clipboard?.writeText(server.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  async function submitCreate(e) {
    e.preventDefault();
    if (!channelName.trim()) return;
    await onCreateChannel(channelName.trim(), channelType);
    setChannelName("");
    setShowCreate(false);
  }

  return (
    <div className={`${mobileVisible ? "flex" : "hidden"} md:flex w-full md:w-[240px] shrink-0 h-full bg-discord-dark flex-col`}>
      <div className="h-12 shrink-0 flex items-center px-4 border-b border-discord-darkest shadow-sm">
        <button onClick={onBack} className="md:hidden mr-2 text-discord-muted hover:text-white text-lg" title="Back to servers">
          ‹
        </button>
        <h1 className="text-white font-semibold truncate flex-1">{server?.name || "Select a server"}</h1>
        {server && (
          <button
            onClick={() => setShowInvite(true)}
            title="Invite people"
            className="text-discord-muted hover:text-white text-sm shrink-0"
          >
            👤+
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs font-bold text-discord-muted uppercase">Text Channels</span>
          <button
            onClick={() => {
              setChannelType("text");
              setShowCreate(true);
            }}
            className="text-discord-muted hover:text-white text-lg leading-none"
            title="Create text channel"
          >
            +
          </button>
        </div>
        <div className="flex flex-col gap-0.5 mb-4">
          {textChannels.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              active={activeChannel?.id === c.id}
              onSelect={onSelectChannel}
            />
          ))}
        </div>

        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs font-bold text-discord-muted uppercase">Voice Channels</span>
          <button
            onClick={() => {
              setChannelType("voice");
              setShowCreate(true);
            }}
            className="text-discord-muted hover:text-white text-lg leading-none"
            title="Create voice channel"
          >
            +
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {voiceChannels.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              active={activeChannel?.id === c.id}
              onSelect={onSelectChannel}
              voiceMembers={voicePresence[c.id]}
              inThisVoice={currentVoiceChannelId === c.id}
            />
          ))}
        </div>
      </div>

      {/* Fixed bottom user profile card */}
      <div className="h-[52px] shrink-0 bg-discord-darkest/60 flex items-center px-2 gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: user?.avatarColor || "#5865F2" }}
        >
          {user?.username?.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">{user?.username}</div>
          <div className="text-discord-muted text-xs truncate">
            {currentVoiceChannelId ? "In voice" : "Online"}
          </div>
        </div>
        <button
          onClick={onToggleMute}
          title={muted ? "Unmute" : "Mute"}
          className={`w-8 h-8 rounded flex items-center justify-center text-sm hover:bg-discord-light ${muted ? "text-discord-red" : "text-discord-text"}`}
        >
          {muted ? "🔇" : "🎙️"}
        </button>
        <button
          onClick={onLogout}
          title="Log out"
          className="w-8 h-8 rounded flex items-center justify-center text-sm text-discord-text hover:bg-discord-light"
        >
          ⏻
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <form onSubmit={submitCreate} className="bg-discord-dark rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-white text-lg font-bold mb-4">
              Create {channelType === "text" ? "Text" : "Voice"} Channel
            </h2>
            <div className="flex gap-2 mb-4 text-sm">
              <button
                type="button"
                onClick={() => setChannelType("text")}
                className={`flex-1 py-1.5 rounded ${channelType === "text" ? "bg-discord-blurple text-white" : "bg-discord-darkest text-discord-muted"}`}
              >
                # Text
              </button>
              <button
                type="button"
                onClick={() => setChannelType("voice")}
                className={`flex-1 py-1.5 rounded ${channelType === "voice" ? "bg-discord-blurple text-white" : "bg-discord-darkest text-discord-muted"}`}
              >
                🔊 Voice
              </button>
            </div>
            <input
              autoFocus
              placeholder="new-channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full mb-4 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple"
            />
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
                className="bg-discord-blurple hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      {showInvite && server && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-discord-dark rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-white text-lg font-bold mb-1">Invite people to {server.name}</h2>
            <p className="text-discord-muted text-sm mb-4">
              Share this code — anyone can use it to join via the <span className="text-discord-text">+</span> button
              → "Join by code" on the server list.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-discord-darkest text-discord-text font-mono text-lg tracking-widest text-center rounded px-3 py-2.5 select-all">
                {server.invite_code}
              </div>
              <button
                onClick={copyInviteCode}
                className="bg-discord-blurple hover:bg-indigo-600 text-white px-3 py-2.5 rounded text-sm font-medium shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowInvite(false)}
                className="text-discord-muted hover:text-white px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
