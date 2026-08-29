import React from "react";

function MemberRow({ member, online }) {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-discord-light/50">
      <div className="relative shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: member.avatar_color, opacity: online ? 1 : 0.4 }}
        >
          {member.username.slice(0, 2).toUpperCase()}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-mid ${online ? "bg-discord-green" : "bg-discord-muted"}`}
        />
      </div>
      <span className={`text-sm truncate ${online ? "text-discord-text" : "text-discord-muted"}`}>
        {member.username}
      </span>
    </div>
  );
}

export default function MembersPanel({ members, onlineUserIds }) {
  const online = members.filter((m) => onlineUserIds.includes(m.id));
  const offline = members.filter((m) => !onlineUserIds.includes(m.id));

  return (
    <div className="w-[240px] shrink-0 h-full bg-discord-dark overflow-y-auto px-2 py-4">
      {online.length > 0 && (
        <>
          <div className="text-xs font-bold text-discord-muted uppercase px-2 mb-1">
            Online — {online.length}
          </div>
          <div className="flex flex-col gap-0.5 mb-4">
            {online.map((m) => (
              <MemberRow key={m.id} member={m} online />
            ))}
          </div>
        </>
      )}

      {offline.length > 0 && (
        <>
          <div className="text-xs font-bold text-discord-muted uppercase px-2 mb-1">
            Offline — {offline.length}
          </div>
          <div className="flex flex-col gap-0.5">
            {offline.map((m) => (
              <MemberRow key={m.id} member={m} online={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
