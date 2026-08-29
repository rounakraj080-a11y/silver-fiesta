import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api";
import { getSocket } from "../socket";
import { useAuth } from "../context/AuthContext.jsx";
import ServerSidebar from "../components/ServerSidebar.jsx";
import ChannelSidebar from "../components/ChannelSidebar.jsx";
import ChatView from "../components/ChatView.jsx";
import MembersPanel from "../components/MembersPanel.jsx";

export default function ChatApp() {
  const { user, logout } = useAuth();

  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  const [voicePresence, setVoicePresence] = useState({}); // { channelId: [{id, username}] }
  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState(null);

  const [membersPanelOpen, setMembersPanelOpen] = useState(true);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const activeChannelRef = useRef(null);
  activeChannelRef.current = activeChannel;

  const activeServer = servers.find((s) => s.id === activeServerId) || null;

  // ---- initial data: load servers, connect socket ----------------------
  useEffect(() => {
    api.get("/servers").then((res) => {
      setServers(res.data.servers);
      if (res.data.servers.length > 0) setActiveServerId(res.data.servers[0].id);
    });

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket) return;

    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onNewMessage(message) {
      if (activeChannelRef.current && message.channelId === activeChannelRef.current.id) {
        setMessages((prev) => [...prev, message]);
      }
    }
    function onVoiceUpdate({ channelId, members: vMembers }) {
      setVoicePresence((prev) => ({ ...prev, [channelId]: vMembers }));
    }
    function onPresenceUpdate({ onlineUserIds: ids }) {
      setOnlineUserIds(ids);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("voice_update", onVoiceUpdate);
    socket.on("presence_update", onPresenceUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
      socket.off("voice_update", onVoiceUpdate);
      socket.off("presence_update", onPresenceUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- load channels + members whenever active server changes ----------
  useEffect(() => {
    if (!activeServerId) {
      setChannels([]);
      setActiveChannel(null);
      return;
    }
    api.get(`/channels/server/${activeServerId}`).then((res) => {
      setChannels(res.data.channels);
      const firstText = res.data.channels.find((c) => c.type === "text");
      setActiveChannel(firstText || res.data.channels[0] || null);
    });
    api.get(`/servers/${activeServerId}/members`).then((res) => setMembers(res.data.members));
  }, [activeServerId]);

  // ---- load message history + join room whenever active channel changes -
  useEffect(() => {
    const socket = socketRef.current;
    if (!activeChannel || activeChannel.type !== "text") {
      setMessages([]);
      return;
    }
    api.get(`/messages/channel/${activeChannel.id}`).then((res) => setMessages(res.data.messages));

    if (socket) {
      socket.emit("join_channel", activeChannel.id);
      return () => socket.emit("leave_channel", activeChannel.id);
    }
  }, [activeChannel?.id]);

  const handleSelectServer = useCallback((id) => setActiveServerId(id), []);

  const handleSelectChannel = useCallback(
    (channel) => {
      if (channel.type === "voice") {
        const socket = socketRef.current;
        if (!socket) return;
        if (currentVoiceChannelId === channel.id) {
          socket.emit("voice_leave", channel.id);
          setCurrentVoiceChannelId(null);
        } else {
          socket.emit("voice_join", channel.id);
          setCurrentVoiceChannelId(channel.id);
        }
        setActiveChannel(channel);
      } else {
        setActiveChannel(channel);
      }
    },
    [currentVoiceChannelId]
  );

  const handleSendMessage = useCallback((content) => {
    const socket = socketRef.current;
    const channel = activeChannelRef.current;
    if (!socket || !channel) return;
    socket.emit("send_message", { channelId: channel.id, content }, (res) => {
      if (res?.error) console.error(res.error);
    });
  }, []);

  const handleCreateServer = useCallback(async (name) => {
    const res = await api.post("/servers", { name });
    setServers((prev) => [...prev, res.data.server]);
    setActiveServerId(res.data.server.id);
  }, []);

  const handleJoinServer = useCallback(async (inviteCode) => {
    const res = await api.post("/servers/join", { inviteCode });
    setServers((prev) => {
      if (prev.some((s) => s.id === res.data.server.id)) return prev;
      return [...prev, res.data.server];
    });
    setActiveServerId(res.data.server.id);
  }, []);

  const handleCreateChannel = useCallback(
    async (name, type) => {
      if (!activeServerId) return;
      const res = await api.post(`/channels/server/${activeServerId}`, { name, type });
      setChannels((prev) => [...prev, res.data.channel]);
    },
    [activeServerId]
  );

  return (
    <div className="h-screen overflow-hidden flex bg-discord-darkest">
      <ServerSidebar
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={handleSelectServer}
        onCreateServer={handleCreateServer}
        onJoinServer={handleJoinServer}
      />

      <ChannelSidebar
        server={activeServer}
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={handleSelectChannel}
        onCreateChannel={handleCreateChannel}
        voicePresence={voicePresence}
        currentVoiceChannelId={currentVoiceChannelId}
        user={user}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onLogout={logout}
      />

      <ChatView
        channel={activeChannel}
        messages={messages}
        onSendMessage={handleSendMessage}
        membersPanelOpen={membersPanelOpen}
        onToggleMembersPanel={() => setMembersPanelOpen((o) => !o)}
        connected={connected}
      />

      {membersPanelOpen && <MembersPanel members={members} onlineUserIds={onlineUserIds} />}
    </div>
  );
}
