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

  // Mobile only: which single "screen" is showing (desktop shows all at once).
  const [mobileView, setMobileView] = useState("servers"); // "servers" | "channels" | "chat"

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
    api.get(`/servers/${activeServerId}/members`).then((res) =>
