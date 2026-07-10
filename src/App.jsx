import React, { useState, useRef, useEffect, useMemo } from "react";
import { Bed, Phone, User, Send, Check, Building2, Sparkles, X } from "lucide-react";

// ---------- MOCK DATA GENERATION ----------

const FLOOR_LAYOUT = [
  { floor: 1, types: ["standard","standard","standard","standard","standard","standard","standard","deluxe","deluxe","family"] },
  { floor: 2, types: ["standard","standard","standard","standard","standard","standard","standard","deluxe","family","family"] },
  { floor: 3, types: ["standard","standard","standard","standard","standard","standard","deluxe","deluxe","family"] },
  { floor: 4, types: ["standard","standard","standard","standard","standard","standard","deluxe","family","family"] },
];

const TYPE_META = {
  standard: { label: "Стандарт", color: "#6B8F71", tint: "#EAF1EA", priceRange: [24000, 32000] },
  deluxe:   { label: "Делюкс",   color: "#B8935A", tint: "#F5EEE1", priceRange: [56000, 72000] },
  family:   { label: "Семейный", color: "#C07E86", tint: "#F6E9EA", priceRange: [62000, 82000] },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randPrice([min, max]) {
  return Math.round((min + Math.random() * (max - min)) / 500) * 500;
}

function generateRooms() {
  const rooms = [];
  FLOOR_LAYOUT.forEach(({ floor, types }) => {
    const order = shuffle(types);
    order.forEach((type, idx) => {
      const number = floor * 100 + (idx + 1);
      rooms.push({
        id: `r-${number}`,
        number,
        floor,
        type,
        price: randPrice(TYPE_META[type].priceRange),
        status: "free",
      });
    });
  });
  // randomly book 5-7 rooms
  const bookCount = 5 + Math.floor(Math.random() * 3);
  const indices = shuffle(rooms.map((_, i) => i)).slice(0, bookCount);
  indices.forEach((i) => (rooms[i].status = "booked"));
  return rooms;
}

// ---------- CHAT LOGIC HELPERS ----------

let msgId = 1;
const nextId = () => msgId++;

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function HotelBookingApp() {
  const [rooms, setRooms] = useState(() => generateRooms());
  const [activeFloor, setActiveFloor] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");

  const [messages, setMessages] = useState(() => [
    {
      id: nextId(),
      from: "bot",
      time: nowTime(),
      text: "Добро пожаловать в Aster Hotel! Выберите свободный номер слева, чтобы начать бронирование.",
    },
  ]);
  const [step, setStep] = useState("idle"); // idle | name | phone | confirm | done
  const [draft, setDraft] = useState({ room: null, name: "", phone: "" });
  const [inputValue, setInputValue] = useState("");

  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (from, text) => {
    setMessages((m) => [...m, { id: nextId(), from, time: nowTime(), text }]);
  };

  const startBooking = (room) => {
    if (room.status === "booked") return;
    setDraft({ room, name: "", phone: "" });
    addMessage(
      "bot",
      `Отличный выбор! Вы выбрали номер ${room.number} (${TYPE_META[room.type].label}). Для завершения бронирования, пожалуйста, введите ваше имя.`
    );
    setStep("name");
  };

  const handleSend = () => {
    const value = inputValue.trim();
    if (!value) return;

    if (step === "name") {
      addMessage("user", value);
      setDraft((d) => ({ ...d, name: value }));
      setInputValue("");
      setTimeout(() => {
        addMessage("bot", `Приятно познакомиться, ${value}! Теперь укажите ваш номер телефона.`);
        setStep("phone");
      }, 300);
      return;
    }

    if (step === "phone") {
      addMessage("user", value);
      setDraft((d) => ({ ...d, phone: value }));
      setInputValue("");
      setTimeout(() => {
        setStep("confirm");
      }, 300);
      return;
    }

    // idle or confirm — free text
    addMessage("user", value);
    setInputValue("");
    setTimeout(() => {
      addMessage("bot", "Пожалуйста, выберите номер слева на сетке, чтобы начать бронирование.");
    }, 300);
  };

  const confirmBooking = () => {
    if (!draft.room) return;
    setRooms((rs) =>
      rs.map((r) => (r.id === draft.room.id ? { ...r, status: "booked" } : r))
    );
    addMessage(
      "bot",
      `Готово, ${draft.name}! Номер ${draft.room.number} забронирован за вами. Ждём вас в Aster Hotel. Хорошего дня!`
    );
    setStep("idle");
    setDraft({ room: null, name: "", phone: "" });
  };

  const cancelBooking = () => {
    addMessage("bot", "Бронирование отменено. Можете выбрать другой номер, когда будете готовы.");
    setStep("idle");
    setDraft({ room: null, name: "", phone: "" });
  };

  const filteredRooms = useMemo(() => {
    return rooms
      .filter((r) => r.floor === activeFloor)
      .filter((r) => activeFilter === "all" || r.type === activeFilter)
      .sort((a, b) => a.number - b.number);
  }, [rooms, activeFloor, activeFilter]);

  const floors = [1, 2, 3, 4];

  return (
    <div
      className="w-full min-h-screen flex flex-col"
      style={{ background: "#F0F2EE", fontFamily: "'Manrope', sans-serif", color: "#23292B" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .font-display { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }

        .keycard {
          position: relative;
          border-radius: 14px;
          background: #FFFFFF;
          border: 1px solid #E1E5DE;
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .keycard:not(.is-booked):hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px -8px rgba(35,41,43,0.18);
          border-color: #C7D0C4;
        }
        .keycard-stripe {
          height: 8px;
          width: 100%;
        }
        .keycard-notch {
          position: absolute;
          top: 8px;
          right: 10px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #F0F2EE;
          border: 1px solid #E1E5DE;
        }
        .plaque {
          font-family: 'IBM Plex Mono', monospace;
          transition: all 0.15s ease;
        }
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #D3D9CF; border-radius: 3px; }
        .glass {
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .bubble-bot {
          background: #FFFFFF;
          border: 1px solid #E7EAE4;
        }
        .bubble-user {
          background: #23292B;
          color: #F5F6F3;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-anim { animation: fadeSlideIn 0.25s ease; }
        .focus-ring:focus-visible {
          outline: 2px solid #6B8F71;
          outline-offset: 2px;
        }
      `}</style>

      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "#E1E5DE" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: "#23292B" }}
          >
            <Building2 size={18} color="#F0F2EE" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none" style={{ letterSpacing: "0.01em" }}>
              Aster Hotel
            </h1>
            <p className="font-mono text-xs mt-1" style={{ color: "#7A837B", letterSpacing: "0.08em" }}>
              38 НОМЕРОВ · 4 ЭТАЖА · РЕЗЕРВИРОВАНИЕ
            </p>
          </div>
        </div>
        <div className="font-mono text-xs hidden sm:block" style={{ color: "#7A837B" }}>
          {rooms.filter((r) => r.status === "free").length} свободно сейчас
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 flex-col lg:flex-row" style={{ minHeight: 0 }}>
        {/* LEFT: ROOMS */}
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
          {/* Floor switcher — elevator panel style */}
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-xs" style={{ color: "#7A837B", letterSpacing: "0.08em" }}>
              ЭТАЖ
            </span>
            <div
              className="flex items-center gap-1 p-1 rounded-full"
              style={{ background: "#E7EAE4", border: "1px solid #DDE1D9" }}
            >
              {floors.map((f) => {
                const active = f === activeFloor;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFloor(f)}
                    className="plaque focus-ring rounded-full w-10 h-10 text-sm font-semibold flex items-center justify-center"
                    style={{
                      background: active ? "#23292B" : "transparent",
                      color: active ? "#F0F2EE" : "#4A524B",
                      boxShadow: active ? "0 0 0 3px rgba(107,143,113,0.25)" : "none",
                    }}
                    aria-pressed={active}
                    aria-label={`Этаж ${f}`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[
              { key: "all", label: "Все" },
              { key: "standard", label: "Стандарт" },
              { key: "deluxe", label: "Делюкс" },
              { key: "family", label: "Семейный" },
            ].map((f) => {
              const active = activeFilter === f.key;
              const meta = TYPE_META[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className="focus-ring rounded-full px-4 py-1.5 text-sm font-medium border transition-colors"
                  style={{
                    background: active ? (meta ? meta.color : "#23292B") : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#4A524B",
                    borderColor: active ? (meta ? meta.color : "#23292B") : "#DDE1D9",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Room grid */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {filteredRooms.map((room) => {
              const meta = TYPE_META[room.type];
              const isBooked = room.status === "booked";
              return (
                <div
                  key={room.id}
                  className={`keycard ${isBooked ? "is-booked" : ""}`}
                  style={{ opacity: isBooked ? 0.55 : 1 }}
                >
                  <div
                    className="keycard-stripe"
                    style={{ background: isBooked ? "#C7CCC4" : meta.color }}
                  />
                  <div className="keycard-notch" />
                  <div className="px-4 pt-3 pb-4">
                    <div className="font-mono text-2xl font-semibold" style={{ color: "#23292B" }}>
                      {room.number}
                    </div>
                    <div
                      className="inline-block mt-2 mb-3 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: meta.tint, color: meta.color }}
                    >
                      {meta.label}
                    </div>
                    <div className="font-mono text-sm mb-3" style={{ color: "#4A524B" }}>
                      {room.price.toLocaleString("ru-RU")} ₸ / ночь
                    </div>

                    {isBooked ? (
                      <div
                        className="w-full text-center py-2 rounded-lg text-xs font-semibold"
                        style={{ background: "#EDEFEA", color: "#8A9088" }}
                      >
                        Забронирован
                      </div>
                    ) : (
                      <button
                        onClick={() => startBooking(room)}
                        className="focus-ring w-full py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                        style={{ background: "#23292B", color: "#F0F2EE" }}
                      >
                        Забронировать
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT: CHAT */}
        <aside
          className="w-full lg:w-[380px] flex flex-col border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: "#E1E5DE", background: "#FBFBF9" }}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b glass" style={{ borderColor: "#E1E5DE" }}>
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 34, height: 34, background: "#6B8F71" }}
            >
              <Sparkles size={16} color="#FFFFFF" />
            </div>
            <div>
              <div className="font-semibold text-sm">Консьерж-ассистент</div>
              <div className="font-mono text-xs" style={{ color: "#7A837B" }}>
                на связи
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-3" style={{ minHeight: 360, maxHeight: "60vh" }}>
            {messages.map((m) => (
              <div key={m.id} className={`msg-anim flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                    m.from === "user" ? "bubble-user rounded-br-sm" : "bubble-bot rounded-bl-sm"
                  }`}
                >
                  {m.text}
                  <div
                    className="font-mono text-[10px] mt-1 opacity-60"
                    style={{ color: m.from === "user" ? "#D8DBD6" : "#9AA098" }}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {step === "confirm" && draft.room && (
              <div className="msg-anim flex justify-start">
                <div className="max-w-[90%] bubble-bot rounded-2xl rounded-bl-sm px-4 py-3.5 text-sm">
                  <div className="font-semibold mb-2 flex items-center gap-1.5">
                    <Check size={14} color="#6B8F71" /> Проверьте детали брони
                  </div>
                  <div className="space-y-1 font-mono text-xs" style={{ color: "#4A524B" }}>
                    <div className="flex justify-between">
                      <span>Номер</span>
                      <span>{draft.room.number} · {TYPE_META[draft.room.type].label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Гость</span>
                      <span>{draft.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Телефон</span>
                      <span>{draft.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Цена</span>
                      <span>{draft.room.price.toLocaleString("ru-RU")} ₸ / ночь</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={confirmBooking}
                      className="focus-ring flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: "#6B8F71", color: "#FFFFFF" }}
                    >
                      Подтвердить бронирование
                    </button>
                    <button
                      onClick={cancelBooking}
                      className="focus-ring px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: "#EDEFEA", color: "#4A524B" }}
                      aria-label="Отменить"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t" style={{ borderColor: "#E1E5DE" }}>
            {step === "confirm" ? (
              <div className="font-mono text-xs text-center py-2" style={{ color: "#7A837B" }}>
                Подтвердите бронь выше ↑
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {step === "name" && <User size={16} color="#9AA098" className="flex-shrink-0" />}
                {step === "phone" && <Phone size={16} color="#9AA098" className="flex-shrink-0" />}
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={
                    step === "name"
                      ? "Введите ваше имя..."
                      : step === "phone"
                      ? "Введите номер телефона..."
                      : "Выберите номер слева..."
                  }
                  className="focus-ring flex-1 text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ borderColor: "#DDE1D9", background: "#FFFFFF" }}
                />
                <button
                  onClick={handleSend}
                  className="focus-ring flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 36, height: 36, background: "#23292B" }}
                  aria-label="Отправить"
                >
                  <Send size={15} color="#F0F2EE" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
