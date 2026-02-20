import { useContext, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { toast } from "react-hot-toast";

const MessageText = ({ text, isEdited, isOwnMessage }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 300;

  if (!text) return null;

  if (text.length <= maxLength) {
    return (
      <p className="leading-relaxed whitespace-pre-wrap">
        {text}
        {isEdited && <span className="text-[10px] opacity-70 ml-1 italic">(edited)</span>}
      </p>
    );
  }

  return (
    <div className="leading-relaxed whitespace-pre-wrap">
      <span>{isExpanded ? text : `${text.substring(0, maxLength)}...`}</span>
      {isEdited && <span className="text-[10px] opacity-70 ml-1 italic">(edited)</span>}
      <button 
        onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
        }} 
        className={`text-xs font-bold ml-1 hover:underline ${isOwnMessage ? "text-white/90" : "text-indigo-600 dark:text-indigo-400"}`}
      >
        {isExpanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
};

const Chat = () => {
  const { id } = useParams();
  const socket = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friend, setFriend] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [text, setText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReactionPickerId, setShowReactionPickerId] = useState(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("chatMuted") === "true");

  const toggleMute = () => {
    setIsMuted((prev) => {
      const newState = !prev;
      localStorage.setItem("chatMuted", newState);
      return newState;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setLoading(true);
    setIsTyping(false);
    
    api.get(`/api/users/${id}`).then(res => setFriend(res.data)).catch(console.error);

    api.get(`/api/chat/${id}`)
      .then((res) => {
        setMessages(res.data);
        scrollToBottom();
        // Mark messages as seen when chat opens
        if (socket && socket.connected) {
          socket.emit("markMessagesSeen", { senderId: id, receiverId: user._id });
        }
      })
      .catch(() => setError("Failed to load messages."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.sender === user._id;
    
    if (isOwnMessage || !showScrollBottom) {
      scrollToBottom();
    }
  }, [messages, isTyping, isSearchOpen, searchResults]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  useEffect(() => {
    if (!socket) return;

    // Check initial status
    socket.emit("checkOnlineStatus", id, (status) => {
      setIsOnline(status);
    });

    const handleUserOnline = (userId) => {
      if (userId === id) setIsOnline(true);
    };

    const handleUserOffline = (userId) => {
      if (userId === id) setIsOnline(false);
    };

    const handleMessage = (msg) => {
      if (msg.sender === id || msg.receiver === id) {
        setMessages((prev) => [...prev, msg]);
        
        // Play sound if message is from the other person
        if (msg.sender === id) {
          if (!isMuted) {
            const audio = new Audio("/receive.mp3");
            audio.play().catch(e => console.error("Audio play failed", e));
          }
          // Mark as seen immediately if we are in this chat
          socket.emit("markMessagesSeen", { senderId: id, receiverId: user._id });
        }
      }
    };

    const handleMessagesSeen = ({ senderId }) => {
      if (senderId === id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.sender === user._id ? { ...msg, seen: true } : msg))
        );
      }
    };

    const handleMessageUpdated = (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
      );
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === id) setIsTyping(true);
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === id) setIsTyping(false);
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    socket.on("receiveMessage", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("messageReactionUpdated", handleMessageUpdated); // Reuse update handler
    socket.on("messagePinned", handleMessageUpdated); // Reuse update handler
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("receiveMessage", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("messageReactionUpdated", handleMessageUpdated);
      socket.off("messagePinned", handleMessageUpdated);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, id, isMuted]);

  const handleInputChange = (e) => {
    setText(e.target.value);

    if (socket && socket.connected) {
      socket.emit("typing", { senderId: user._id, receiverId: id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { senderId: user._id, receiverId: id });
      }, 2000);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const sendMessage = async () => {
    if (!text.trim() && !image) return;

    let imagePath = null;

    if (image) {
      const formData = new FormData();
      formData.append("image", image);
      try {
        const res = await api.post("/api/chat/upload", formData);
        imagePath = res.data.filePath;
      } catch (err) {
        console.error("Image upload failed", err);
        return;
      }
    }
    
    if (socket && socket.connected) {
      socket.emit("sendMessage", {
        senderId: user._id,
        receiverId: id,
        text,
        image: imagePath,
        replyTo: replyingTo?._id,
      });
      
      // Stop typing immediately when sending
      socket.emit("stopTyping", { senderId: user._id, receiverId: id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      if (!isMuted) {
        const audio = new Audio("/chat.mp3");
        audio.play().catch(e => console.error("Audio play failed", e));
      }
      setText("");
      setImage(null);
      setPreview(null);
      setReplyingTo(null);
    }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
  };

  const handleDeleteChat = async () => {
    if (!window.confirm("Are you sure you want to clear your chat history?")) return;

    try {
      await api.delete(`/api/chat/${id}/me`);
      setMessages([]);
      toast.success("Chat history cleared");
    } catch (err) {
      console.error("Failed to clear chat", err);
      toast.error("Failed to clear chat");
    }
  };

  const startEditing = (msg) => {
    setEditingMessageId(msg._id);
    setEditText(msg.text || "");
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const saveEdit = () => {
    if (!editText.trim() && !editingMessageId) return;
    
    if (socket && socket.connected) {
      socket.emit("editMessage", { messageId: editingMessageId, newText: editText });
      cancelEditing();
    }
  };

  const deleteMessage = async (msgId) => {
    if (!window.confirm("Are you sure you want to delete this message for everyone?")) return;

    try {
      await api.delete(`/api/chat/messages/${msgId}`);
      setMessages((prev) => prev.filter((msg) => msg._id !== msgId));
      setSearchResults((prev) => prev.filter((msg) => msg._id !== msgId));
      toast.success("Message deleted");

      if (socket && socket.connected) {
        socket.emit("deleteMessage", { messageId: msgId, conversationId: id });
      }
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  const deleteMessageForMe = async (msgId) => {
    if (!window.confirm("Delete this message for you?")) return;

    try {
      await api.delete(`/api/chat/messages/${msgId}/me`);
      setMessages((prev) => prev.filter((msg) => msg._id !== msgId));
      setSearchResults((prev) => prev.filter((msg) => msg._id !== msgId));
      toast.success("Message deleted for you");
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  const toggleReaction = async (msgId, emoji) => {
    setShowReactionPickerId(null);

    if (socket && socket.connected) {
      socket.emit("toggleReaction", { messageId: msgId, userId: user._id, emoji });
    } else {
      try {
        const res = await api.put(`/api/chat/messages/${msgId}/reaction`, { emoji });
        setMessages((prev) => prev.map((msg) => (msg._id === res.data._id ? res.data : msg)));
        setSearchResults((prev) => prev.map((msg) => (msg._id === res.data._id ? res.data : msg)));
      } catch (err) {
        console.error("Failed to toggle reaction", err);
        toast.error("Failed to update reaction");
      }
    }
  };

  const togglePin = async (msgId) => {
    if (socket && socket.connected) {
      socket.emit("togglePin", { messageId: msgId });
    } else {
      try {
        const res = await api.put(`/api/chat/messages/${msgId}/pin`);
        setMessages((prev) => prev.map((msg) => (msg._id === res.data._id ? res.data : msg)));
        setSearchResults((prev) => prev.map((msg) => (msg._id === res.data._id ? res.data : msg)));
      } catch (err) {
        console.error("Failed to toggle pin", err);
        toast.error("Failed to update pin status");
      }
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/api/chat/search/${id}?query=${query}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBottom(!isBottom);
    }
  };

  const displayedMessages = isSearchOpen && searchQuery ? searchResults : messages;

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-transparent px-1 py-2 text-slate-900 transition-all duration-500 ease-in-out dark:text-slate-100 sm:px-3 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-500 dark:border-slate-800 dark:bg-slate-900">
        
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900 sm:gap-3 sm:p-4">
          {friend ? (
            <>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  {friend.avatar ? (
                    <img src={getAvatarUrl(friend.avatar)} alt={friend.name} className="w-full h-full object-cover" />
                  ) : (
                    friend.name.charAt(0).toUpperCase()
                  )}
                </div>
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold leading-none sm:text-lg">{friend.name}</h2>
                <p className={`text-xs font-medium mt-0.5 ${isOnline ? "text-green-500" : "text-gray-500 dark:text-gray-400"}`}>
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`ml-auto text-gray-400 hover:text-indigo-500 transition-colors p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 ${isSearchOpen ? "text-indigo-500 bg-slate-200 dark:bg-slate-800" : ""}`}
                title="Search Messages"
              >
                🔍
              </button>
              <button
                onClick={toggleMute}
                className={`text-gray-400 hover:text-indigo-500 transition-colors p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 ${isMuted ? "text-red-500" : ""}`}
                title={isMuted ? "Unmute Sounds" : "Mute Sounds"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
              <button
                onClick={handleDeleteChat}
                className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Delete Chat"
              >
                🗑️
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>
              <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          )}
        </div>

        {isSearchOpen && (
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 animate-fade-in dark:border-slate-700 dark:bg-slate-800/50 sm:px-4">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search messages..."
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <button onClick={closeSearch} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              ✕
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 relative min-h-0">
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
          >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 my-4 bg-red-500/10 p-2 rounded-lg">{error}</div>
          ) : displayedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
              <span className="text-4xl mb-2">👋</span>
              <p>{isSearchOpen && searchQuery ? "No matches found." : "No messages yet. Say hi!"}</p>
            </div>
          ) : (
            displayedMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === user._id ? "justify-end" : "justify-start"}`}>
                <div className={`group relative max-w-[90%] rounded-2xl py-3 shadow-md transition-all sm:max-w-[85%] md:max-w-md ${
                  m.sender === user._id 
                    ? "rounded-br-none bg-gradient-to-r from-blue-600 to-blue-500 pl-4 pr-12 text-white sm:pl-5 sm:pr-48" 
                    : "rounded-bl-none bg-slate-200 pl-4 pr-12 text-slate-900 dark:bg-slate-700 dark:text-slate-100 sm:pl-5 sm:pr-36"
                }`}>
                  {editingMessageId === m._id ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-white text-slate-900 text-sm focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <div className="flex justify-end gap-2 text-xs font-bold">
                        <button onClick={saveEdit} className="hover:underline">Save</button>
                        <button onClick={cancelEditing} className="opacity-80 hover:underline">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.replyTo && (
                        <div className="mb-2 p-2 rounded bg-black/5 dark:bg-white/10 border-l-4 border-indigo-500 text-xs opacity-80">
                          <p className="font-bold mb-0.5">{m.replyTo.sender === user._id ? "You" : friend?.name}</p>
                          <p className="truncate max-w-[150px]">{m.replyTo.text || "📷 Image"}</p>
                        </div>
                      )}

                      {showReactionPickerId === m._id && (
                        <div className={`absolute -top-10 ${m.sender === user._id ? "right-0" : "left-0"} bg-white dark:bg-slate-800 shadow-xl rounded-full px-3 py-1.5 flex gap-2 z-20 border border-slate-200 dark:border-slate-700 animate-fade-in`}>
                          {["👍", "❤️", "😂", "😮", "😢", "😡"].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={() => toggleReaction(m._id, emoji)} 
                              className={`hover:scale-125 transition-transform ${m.reactions?.some(r => r.user === user._id && r.emoji === emoji) ? "bg-blue-100 dark:bg-blue-900/30 rounded-full" : ""}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {m.pinned && (
                        <div className="absolute -left-2 -top-2 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm z-20" title="Pinned Message">
                          📌
                        </div>
                      )}

                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button 
                          onClick={() => togglePin(m._id)}
                          className={`p-1 ${m.sender === user._id ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-indigo-500"} transition-colors`}
                          title={m.pinned ? "Unpin" : "Pin"}
                        >
                          {m.pinned ? "🚫" : "📌"}
                        </button>
                        <button 
                          onClick={() => setShowReactionPickerId(showReactionPickerId === m._id ? null : m._id)}
                          className={`p-1 ${m.sender === user._id ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-yellow-500"} transition-colors`}
                          title="Add Reaction"
                        >
                          ☺
                        </button>
                        <button 
                          onClick={() => setReplyingTo(m)}
                          className={`p-1 ${m.sender === user._id ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-indigo-500"} transition-colors`}
                          title="Reply"
                        >
                          ↩️
                        </button>
                        {m.sender === user._id && (
                          <button 
                            onClick={() => startEditing(m)}
                            className="p-1 text-white/70 hover:text-white transition-colors"
                            title="Edit"
                          >
                            ✎
                          </button>
                        )}
                        <button 
                          onClick={() => deleteMessageForMe(m._id)}
                          className={`p-1 ${m.sender === user._id ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-red-400"} transition-colors`}
                          title="Delete for me"
                        >
                          {m.sender === user._id ? "✖️" : "🗑️"}
                        </button>
                        {m.sender === user._id && (
                          <button 
                            onClick={() => deleteMessage(m._id)}
                            className="p-1 text-white/70 hover:text-red-400 transition-colors"
                            title="Delete for everyone"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      {m.image && (
                        <img src={getAvatarUrl(m.image)} alt="attachment" className="rounded-lg mb-2 max-w-full max-h-60 object-cover" />
                      )}
                      <MessageText 
                        text={m.text} 
                        isEdited={m.isEdited} 
                        isOwnMessage={m.sender === user._id} 
                      />
                      <p className={`text-[10px] mt-1 text-right ${m.sender === user._id ? "text-blue-200" : "text-gray-400"}`}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        {m.sender === user._id && m.seen && <span className="ml-1 font-bold text-xs">✓✓</span>}
                      </p>

                      {m.reactions && m.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${m.sender === user._id ? "justify-end" : "justify-start"}`}>
                          {Object.entries(
                            m.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <span key={emoji} className="bg-white/40 dark:bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm backdrop-blur-sm border border-white/10">
                              {emoji} {count > 1 && count}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start mb-2 animate-fade-in">
              <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5 w-fit shadow-sm">
                <div className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

          {showScrollBottom && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg transition-all z-20 animate-bounce"
              title="Scroll to bottom"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900 md:p-4">
          {replyingTo && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border-l-4 border-indigo-500 bg-white p-2 shadow-sm dark:bg-slate-800">
              <div className="text-sm">
                <p className="font-bold text-indigo-500">Replying to {replyingTo.sender === user._id ? "yourself" : friend?.name}</p>
                <p className="text-gray-500 dark:text-gray-400 truncate max-w-xs">{replyingTo.text || "📷 Image"}</p>
              </div>
              <button onClick={cancelReply} className="text-gray-400 hover:text-red-500 p-1">✕</button>
            </div>
          )}
          {preview && (
            <div className="mb-2 relative w-fit">
              <img src={preview} alt="Preview" className="h-20 rounded-lg border border-gray-300 dark:border-gray-600" />
              <button 
                onClick={() => { setImage(null); setPreview(null); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 sm:gap-3">
            <label className="cursor-pointer flex items-center justify-center text-gray-500 hover:text-indigo-500 transition-colors p-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Type a message..."
              className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-2xl px-5 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400 dark:placeholder-slate-500 resize-none overflow-hidden min-h-[48px] max-h-32"
            />
            <button 
              onClick={sendMessage} 
              disabled={!text.trim() && !image}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 md:px-6 py-2 rounded-full font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center mb-1 shrink-0"
            >
              <span className="hidden md:inline">Send</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:hidden">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
