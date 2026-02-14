"use client";

import { useState, useEffect, useRef } from "react";

const TYPING_MESSAGE = "Hey, just sent a new email to the tribe!";

interface Message {
  id: string;
  sender: "me" | "member";
  email?: string;
  text: string;
  time?: string;
  status?: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "me",
    text: "P.S. If you want to check out Tribe: https://madewithtribe.com",
    status: "Delivered to 526, seen by 112",
  },
  {
    id: "2",
    sender: "member",
    email: "matgarciadesign@gmail.com",
    text: "That's so cool man! Keep it up \u{270C}\u{FE0F}",
    time: "Sunday 21:56",
  },
  {
    id: "3",
    sender: "member",
    email: "matgarciadesign@gmail.com",
    text: "Love it",
    time: "Wednesday 01:48",
  },
];

export function IPhoneMockup() {
  const [typedText, setTypedText] = useState("");
  const [phase, setPhase] = useState<"idle" | "typing" | "sending" | "sent">("idle");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [sendBtnScale, setSendBtnScale] = useState(1);
  const [newMsgVisible, setNewMsgVisible] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Start typing animation after a delay
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startDelay = setTimeout(() => {
      setPhase("typing");
      let idx = 0;

      const typeChar = () => {
        if (idx <= TYPING_MESSAGE.length) {
          setTypedText(TYPING_MESSAGE.slice(0, idx));
          idx++;
          const char = TYPING_MESSAGE[idx - 1];
          const delay = char === " " ? 60 : 45 + Math.random() * 35;
          setTimeout(typeChar, delay);
        } else {
          // Pause, then send
          setTimeout(() => {
            // Animate send button press
            setSendBtnScale(0.85);
            setTimeout(() => {
              setSendBtnScale(1);
              setPhase("sending");
              setTypedText("");

              // Add message with bubble animation
              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: "new",
                    sender: "me",
                    text: TYPING_MESSAGE,
                    status: "Sending...",
                  },
                ]);
                setNewMsgVisible(true);
                setPhase("sent");

                // Update status after a moment
                setTimeout(() => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === "new" ? { ...m, status: "Delivered to 526" } : m
                    )
                  );

                  // Reset after showing for a while
                  setTimeout(() => {
                    setMessages(INITIAL_MESSAGES);
                    setNewMsgVisible(false);
                    setPhase("idle");
                    hasAnimated.current = false;
                  }, 4000);
                }, 1500);
              }, 200);
            }, 150);
          }, 600);
        }
      };

      typeChar();
    }, 2000);

    return () => clearTimeout(startDelay);
  }, [phase]);

  // Scroll chat container to bottom when new message appears (without affecting page scroll)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const showSendBtn = typedText.length > 0;

  return (
    <div className="relative w-[280px] sm:w-[320px] md:w-[380px]">
      {/* iPhone frame */}
      <div
        className="relative rounded-[44px] sm:rounded-[52px] border-[6px] sm:border-[8px] border-[#1a1a1a] overflow-hidden"
        style={{
          background: "#f8f8f8",
          boxShadow:
            "0 30px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.1)",
          aspectRatio: "393/852",
        }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-[8px] sm:top-[10px] left-1/2 -translate-x-1/2 z-20">
          <div
            className="bg-black rounded-full"
            style={{
              width: "clamp(90px, 30%, 126px)",
              height: "clamp(24px, 3.5%, 34px)",
            }}
          />
        </div>

        {/* Status bar */}
        <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 pt-[14px] sm:pt-[16px]" style={{ height: "clamp(44px, 6%, 54px)" }}>
          <span className="text-[11px] sm:text-[13px] font-semibold text-black/90">
            9:41
          </span>
          <div className="flex items-center gap-1">
            <svg className="w-[14px] sm:w-[16px] h-[10px] sm:h-[12px]" viewBox="0 0 17 12" fill="black">
              <rect x="0" y="6" width="3" height="6" rx="0.5" opacity="0.3" />
              <rect x="4.5" y="4" width="3" height="8" rx="0.5" opacity="0.5" />
              <rect x="9" y="2" width="3" height="10" rx="0.5" opacity="0.7" />
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
            </svg>
            <svg className="w-[13px] sm:w-[15px] h-[10px] sm:h-[12px]" viewBox="0 0 16 12" fill="black">
              <path d="M8 3.6c1.8 0 3.4.7 4.6 1.9l1.1-1.1C12.1 2.8 10.1 2 8 2s-4.1.8-5.7 2.4l1.1 1.1C4.6 4.3 6.2 3.6 8 3.6z" opacity="0.5" />
              <path d="M8 6.4c1.1 0 2.1.4 2.9 1.2l1.1-1.1C10.7 5.2 9.4 4.8 8 4.8s-2.7.4-3.9 1.7l1.1 1.1c.7-.8 1.7-1.2 2.8-1.2z" opacity="0.7" />
              <circle cx="8" cy="10" r="1.5" />
            </svg>
            <svg className="w-[22px] sm:w-[26px] h-[10px] sm:h-[12px]" viewBox="0 0 27 13" fill="black">
              <rect x="0" y="1" width="23" height="11" rx="2.5" stroke="black" strokeWidth="1" fill="none" opacity="0.35" />
              <rect x="1.5" y="2.5" width="18" height="8" rx="1.5" />
              <rect x="24" y="4.5" width="2.5" height="4" rx="1" opacity="0.4" />
            </svg>
          </div>
        </div>

        {/* Nav header - Tribe style */}
        <div className="flex flex-col items-center pt-2 sm:pt-3 pb-2 sm:pb-3 border-b border-black/[0.06]">
          <div
            className="w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] rounded-full bg-black flex items-center justify-center mb-1"
          >
            <span className="text-white text-[8px] sm:text-[10px] font-medium" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>Tribe</span>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] sm:text-[12px] font-semibold text-black">
              Your Tribe
            </span>
            <svg className="w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] text-black/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </div>
          <span className="text-[8px] sm:text-[9px] text-black/40">669 members</span>
        </div>

        {/* Chat area */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ height: "calc(100% - clamp(44px, 6%, 54px) - 90px - clamp(82px, 12%, 100px))" }}
        >
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3 space-y-1.5 sm:space-y-2">
            {messages.map((msg, i) => (
              <div key={msg.id}>
                {/* Timestamp / email label */}
                {msg.time && (
                  <p className="text-center text-[7px] sm:text-[8px] text-black/30 mt-2 sm:mt-3 mb-1">
                    {msg.time}
                  </p>
                )}
                {msg.email && (
                  <p className="text-[7px] sm:text-[8px] text-black/30 mb-0.5 ml-1">
                    {msg.email}
                  </p>
                )}

                {/* Message bubble */}
                <div
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[12px] leading-snug transition-all duration-300 ${
                      msg.sender === "me"
                        ? "bg-[#e8e8e8] text-black rounded-[14px] sm:rounded-[16px] rounded-br-[4px]"
                        : "bg-[#f0f0f0] text-black rounded-[14px] sm:rounded-[16px] rounded-bl-[4px]"
                    } ${
                      msg.id === "new"
                        ? newMsgVisible
                          ? "opacity-100 translate-y-0 scale-100"
                          : "opacity-0 translate-y-4 scale-95"
                        : ""
                    }`}
                    style={
                      msg.id === "new"
                        ? { transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }
                        : undefined
                    }
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Status */}
                {msg.status && msg.sender === "me" && (
                  <p className="text-right text-[7px] sm:text-[8px] text-black/30 mt-0.5 mr-1">
                    {msg.status}
                  </p>
                )}
              </div>
            ))}
            <div />
          </div>
        </div>

        {/* Input area */}
        <div className="absolute bottom-0 left-0 right-0" style={{ background: '#f8f8f8' }}>
          <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 border-t border-black/[0.06]">
            <div className="flex items-end gap-1.5 sm:gap-2">
              {/* Text field */}
              <div className="flex-1 rounded-full border border-black/[0.1] bg-white px-3 sm:px-3.5 py-1.5 sm:py-2 min-h-[30px] sm:min-h-[34px] flex items-center">
                <span className={`text-[11px] sm:text-[13px] leading-snug ${typedText ? "text-black" : "text-black/30"}`}>
                  {typedText || "Your message"}
                  {phase === "typing" && (
                    <span className="inline-block w-[1.5px] h-[12px] sm:h-[14px] bg-blue-500 ml-[1px] align-middle animate-pulse" />
                  )}
                </span>
              </div>

              {/* Send button */}
              <div className="flex-shrink-0 relative" style={{ width: 28, height: 28 }}>
                <button
                  className="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: showSendBtn ? "#007AFF" : "transparent",
                    transform: `scale(${showSendBtn ? sendBtnScale : 0.5})`,
                    opacity: showSendBtn ? 1 : 0,
                  }}
                >
                  <svg
                    className="w-[13px] h-[13px] sm:w-[14px] sm:h-[14px] text-white"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M3.3 13.5l10.2-5a.8.8 0 000-1.4L3.3 2.1a.8.8 0 00-1.2.7l.1 3.6c0 .4.3.7.7.8L8 8l-5.1.8c-.4.1-.7.4-.7.8l-.1 3.2a.8.8 0 001.2.7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Fake keyboard (simplified) */}
          <div
            className="border-t border-black/[0.04]"
            style={{ background: "#D1D3D9" }}
          >
            {/* Suggestion bar */}
            <div className="flex items-center justify-around px-2 py-1 border-b border-black/[0.04]" style={{ background: "#CBCDD3" }}>
              {["I", "The", "I'm"].map((w) => (
                <span key={w} className="text-[9px] sm:text-[10px] text-black/60 px-3">{w}</span>
              ))}
            </div>

            {/* Key rows */}
            {[
              ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
              ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
              ["Z", "X", "C", "V", "B", "N", "M"],
            ].map((row, ri) => (
              <div key={ri} className="flex justify-center gap-[3px] sm:gap-[4px] px-1 py-[2.5px] sm:py-[3px]">
                {ri === 2 && (
                  <div className="w-[26px] sm:w-[32px] h-[26px] sm:h-[32px] rounded-[5px] bg-[#ACB0BA] flex items-center justify-center">
                    <svg className="w-[11px] sm:w-[13px] h-[11px] sm:h-[13px]" viewBox="0 0 16 16" fill="black" opacity="0.6">
                      <path d="M8 2l5 6H9.5v6h-3V8H3l5-6z" />
                    </svg>
                  </div>
                )}
                {row.map((key) => (
                  <div
                    key={key}
                    className="w-[22px] sm:w-[28px] h-[26px] sm:h-[32px] rounded-[5px] bg-white flex items-center justify-center shadow-sm"
                  >
                    <span className="text-[10px] sm:text-[12px] font-light text-black">{key}</span>
                  </div>
                ))}
                {ri === 2 && (
                  <div className="w-[26px] sm:w-[32px] h-[26px] sm:h-[32px] rounded-[5px] bg-[#ACB0BA] flex items-center justify-center">
                    <svg className="w-[11px] sm:w-[13px] h-[11px] sm:h-[13px]" viewBox="0 0 16 16" fill="black" opacity="0.6">
                      <path d="M12 4L4 12M12 12L4 4" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {/* Bottom row */}
            <div className="flex items-center gap-[3px] sm:gap-[4px] px-1 py-[2.5px] sm:py-[3px]">
              <div className="w-[36px] sm:w-[46px] h-[26px] sm:h-[32px] rounded-[5px] bg-[#ACB0BA] flex items-center justify-center">
                <span className="text-[9px] sm:text-[11px] text-black/70">123</span>
              </div>
              <div className="w-[26px] sm:w-[32px] h-[26px] sm:h-[32px] rounded-[5px] bg-[#ACB0BA] flex items-center justify-center">
                <span className="text-[12px] sm:text-[14px]">&#x263A;</span>
              </div>
              <div className="flex-1 h-[26px] sm:h-[32px] rounded-[5px] bg-white flex items-center justify-center shadow-sm">
                <span className="text-[9px] sm:text-[11px] text-black/40">space</span>
              </div>
              <div className="w-[54px] sm:w-[68px] h-[26px] sm:h-[32px] rounded-[5px] bg-[#ACB0BA] flex items-center justify-center">
                <svg className="w-[12px] sm:w-[14px] h-[12px] sm:h-[14px]" viewBox="0 0 16 16" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                  <path d="M3 8h8M7 4l4 4-4 4" />
                </svg>
              </div>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center py-2 sm:py-3">
              <div className="w-[100px] sm:w-[134px] h-[4px] sm:h-[5px] rounded-full bg-black/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
