import { useContext, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const Chat = () => {
  const { id } = useParams();
  const socket = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setLoading(true);
    setIsTyping(false);
    api.get(`/api/chat/${id}`)
      .then((res) => {
        setMessages(res.data);
        scrollToBottom();
      })
      .catch(() => setError("Failed to load messages."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.sender === id || msg.receiver === id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === id) setIsTyping(true);
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === id) setIsTyping(false);
    };

    socket.on("receiveMessage", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("receiveMessage", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, id]);

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

  const sendMessage = () => {
    if (!text.trim()) return;
    
    if (socket && socket.connected) {
      socket.emit("sendMessage", {
        senderId: user._id,
        receiverId: id,
        text,
      });
      
      // Stop typing immediately when sending
      socket.emit("stopTyping", { senderId: user._id, receiverId: id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      setText("");
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 p-4 md:p-8 flex flex-col transition-all duration-500 ease-in-out">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-500">
        
        {/* Header */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-3 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <h2 className="font-bold text-lg tracking-wide">Chat</h2>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 my-4 bg-red-500/10 p-2 rounded-lg">{error}</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
              <span className="text-4xl mb-2">👋</span>
              <p>No messages yet. Say hi!</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === user._id ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] md:max-w-md px-5 py-3 rounded-2xl shadow-md transition-all ${
                  m.sender === user._id 
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none" 
                    : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none"
                }`}>
                  <p className="leading-relaxed">{m.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${m.sender === user._id ? "text-blue-200" : "text-gray-400"}`}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                  </p>
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-4 py-2 rounded-2xl rounded-bl-none text-sm italic animate-pulse">
                Typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-3">
            <input
              value={text}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-full px-5 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button 
              onClick={sendMessage} 
              disabled={!text.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all transform active:scale-95 flex items-center"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
