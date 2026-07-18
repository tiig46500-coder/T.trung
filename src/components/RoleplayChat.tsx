import React, { useState, useEffect, useRef } from "react";
import { renderToneColoredPinyin } from "../utils/pinyin";
import { speakChinese } from "../utils/speech";
import { sfx } from "../utils/audio";
import { MessageSquare, Mic, MicOff, Send, Volume2, Sparkles, Languages, HelpCircle, ArrowRight, User, Bot, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  pinyin?: string;
  translation?: string;
  feedback?: string;
  timestamp: string;
}

interface RoleOption {
  id: string;
  title: string;
  icon: string;
  description: string;
  promptRole: string; // The role string sent to server
  starterMessage: {
    cn: string;
    pinyin: string;
    vi: string;
  };
}

const ROLES: RoleOption[] = [
  {
    id: "supermarket",
    title: "Mua sắm ở siêu thị",
    icon: "🛒",
    description: "Tập làm quen với nhân viên thu ngân khi mua sắm thanh toán.",
    promptRole: "Nhân viên thu ngân tại siêu thị Bắc Kinh thân thiện",
    starterMessage: {
      cn: "你好！请 hỏi, 你需要袋子吗？一共是五十八块钱。",
      pinyin: "Nǐ hǎo! Qǐngwèn, nǐ xūyào dàizi ma? Yígòng shì wǔshíbā kuài qián.",
      vi: "Xin chào! Xin hỏi bạn có cần túi không? Tổng cộng là 58 tệ."
    }
  },
  {
    id: "interview",
    title: "Phỏng vấn xin việc",
    icon: "💼",
    description: "Đối mặt với câu hỏi từ nhà tuyển dụng khi đi xin việc làm.",
    promptRole: "Nhà tuyển dụng nghiêm túc tại tập đoàn công nghệ Thượng Hải",
    starterMessage: {
      cn: "你好，请先简单介绍一下你自己。你为什么想来我们公司工作？",
      pinyin: "Nǐ hǎo, qǐng xiān jiǎndān jièshào yíxià nǐ zìjǐ. Nǐ wèishénme xiǎng lái wǒmen gōngsī gōngzuò?",
      vi: "Xin chào, vui lòng giới thiệu bản thân một chút. Tại sao bạn muốn làm việc ở công ty chúng tôi?"
    }
  },
  {
    id: "hotel",
    title: "Đặt phòng khách sạn",
    icon: "🏨",
    description: "Thực hành đặt phòng, hỏi dịch vụ với lễ tân khách sạn.",
    promptRole: "Lễ tân khách sạn 5 sao sang trọng tại Thâm Quyến chuyên nghiệp",
    starterMessage: {
      cn: "您好！欢迎光临。请问您有预订吗？想办理入住还是退房？",
      pinyin: "Nín hǎo! Huānyíng guānglín. Qǐngwèn nín yǒu yùdìng ma? Xiǎng bànlǐ rùzhù háishì tuìfáng?",
      vi: "Xin chào! Chào mừng quý khách. Xin hỏi quý khách đã đặt phòng trước chưa? Muốn nhận phòng hay trả phòng?"
    }
  },
  {
    id: "directions",
    title: "Hỏi đường ở Bắc Kinh",
    icon: "🗺️",
    description: "Hỏi thăm đường đi tới Tử Cấm Thành với người dân địa phương.",
    promptRole: "Người dân bản địa nhiệt tình tại thủ đô Bắc Kinh",
    starterMessage: {
      cn: "哎呀，去故宫啊？那不远，你往前直走，然后往右拐就到了。",
      pinyin: "Āiyā, qù Gùgōng a? Nà bù yuǎn, nǐ wǎng qián zhí zǒu, ránhòu wǎng yòu guǎi jiù dào le.",
      vi: "Ôi dào, đi Tử Cấm Thành à? Không xa đâu, bạn đi thẳng về phía trước, sau đó rẽ phải là tới rồi."
    }
  },
  {
    id: "custom",
    title: "Tự tạo chủ đề của riêng bạn",
    icon: "🎯",
    description: "Nhập tình huống giả định theo mong muốn riêng của bạn để đóng vai cùng AI.",
    promptRole: "Tình huống tự chọn",
    starterMessage: {
      cn: "你好！我准备好了，你想和我练习什么情景？",
      pinyin: "Nǐ hǎo! Wǒ zhǔnbèi hǎo le, nǐ xiǎng hé wǒ liànxí shénme qíngjǐng?",
      vi: "Xin chào! Tôi đã sẵn sàng rồi, bạn muốn cùng tôi luyện tập tình huống nào?"
    }
  }
];

export const RoleplayChat: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupportError, setVoiceSupportError] = useState<string | null>(null);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  
  // Custom Roleplay Scenario States
  const [isCustomConfiguring, setIsCustomConfiguring] = useState(false);
  const [customPromptText, setCustomPromptText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  const selectRole = (role: RoleOption) => {
    sfx.playClick();
    if (role.id === "custom") {
      setIsCustomConfiguring(true);
      return;
    }
    
    setSelectedRole(role);
    
    // Initialize with starter message
    const starter: ChatMessage = {
      id: "starter",
      role: "model",
      text: role.starterMessage.cn,
      pinyin: role.starterMessage.pinyin,
      translation: role.starterMessage.vi,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([starter]);
    setShowTranslations({ "starter": true });

    // Speak automatically
    setTimeout(() => {
      speakChinese(role.starterMessage.cn);
    }, 400);
  };

  const startCustomConversation = () => {
    if (!customPromptText.trim()) return;
    sfx.playClick();
    
    const textContext = customPromptText.trim();
    const dynamicRole: RoleOption = {
      id: "custom",
      title: "Chủ đề tự tạo",
      icon: "🎯",
      description: textContext,
      promptRole: `Đóng vai nhân vật trong tình huống sau: ${textContext}. Chỉ giao tiếp bằng tiếng Trung Phổ thông (Simplified Chinese). Thỉnh thoảng sửa lỗi ngữ pháp hoặc từ vựng nếu người dùng nói sai.`,
      starterMessage: {
        cn: "你好！我准备好了，我们开始聊天吧。你想和我说什么？",
        pinyin: "Nǐ hǎo! Wǒ zhǔnbèi hǎo le, wǒmen kāishǐ liáotiān ba. Nǐ xiǎng hé wǒ shuō shénme?",
        vi: "Xin chào! Tôi đã sẵn sàng rồi, chúng ta bắt đầu nói chuyện thôi. Bạn muốn nói gì với tôi nào?"
      }
    };
    
    setSelectedRole(dynamicRole);
    setIsCustomConfiguring(false);
    
    const starter: ChatMessage = {
      id: "starter",
      role: "model",
      text: dynamicRole.starterMessage.cn,
      pinyin: dynamicRole.starterMessage.pinyin,
      translation: dynamicRole.starterMessage.vi,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([starter]);
    setShowTranslations({ "starter": true });

    setTimeout(() => {
      speakChinese(dynamicRole.starterMessage.cn);
    }, 400);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || !selectedRole) return;

    sfx.playClick();
    setInputText("");

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text,
      timestamp
    };

    setMessages(prev => [...prev, userMsg]);
    setIsAiTyping(true);

    try {
      // Collect history
      const apiHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const customKey = localStorage.getItem("custom_gemini_api_key") || "";
      const response = await fetch("/api/roleplay-chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Custom-Key": customKey
        },
        body: JSON.stringify({
          role: selectedRole.promptRole,
          history: apiHistory,
          message: text
        })
      });

      if (!response.ok) {
        throw new Error("Mất kết nối với AI");
      }

      const data = await response.json();
      
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "model",
        text: data.replyCn,
        pinyin: data.replyPinyin,
        translation: data.replyVi,
        feedback: data.feedback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      
      // Default show translation
      setShowTranslations(prev => ({ ...prev, [aiMsg.id]: true }));

      // Automatically speak the response
      speakChinese(data.replyCn);
      sfx.playSuccess();

    } catch (e: any) {
      console.error(e);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        text: "对不起，我现在有点忙，无法回答你的问题。我们可以晚点再聊吗？",
        pinyin: "Duìbuqǐ, wǒ xiànzài yǒudiǎn máng, wúfǎ huídá nǐ de wèntí. Wǒmen kěyǐ wǎndiǎn zài liáo ma?",
        translation: "Xin lỗi, hiện tại tôi bận một chút, không thể trả lời câu hỏi của bạn. Chúng ta lát nữa nói chuyện sau nhé?",
        feedback: "Lỗi kết nối AI. Vui lòng kiểm tra lại mạng internet của bạn.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      sfx.playError();
    } finally {
      setIsAiTyping(false);
    }
  };

  // Web Speech API Voice Input Dictation
  const handleVoiceInput = () => {
    sfx.playClick();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setVoiceSupportError("Trình duyệt không hỗ trợ nhận dạng giọng nói. Khuyến nghị Google Chrome.");
      setTimeout(() => setVoiceSupportError(null), 4000);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "zh-CN"; // Speech-to-text for Chinese
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error inside roleplay:", e);
        if (e.error === "not-allowed" || e.name === "NotAllowedError") {
          setVoiceSupportError("Trình duyệt đang chặn Micro. Vui lòng cấp quyền hoạt động hoặc gõ chữ trực tiếp để tiếp tục đối đáp.");
        } else {
          setVoiceSupportError(`Không nhận dạng được: ${e.error || "Lỗi thiết bị"}. Hãy thử gõ văn bản.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          // Auto send directly for fluid communication!
          handleSend(transcript);
        }
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setVoiceSupportError("Không thể kích hoạt Micro.");
      setIsListening(false);
    }
  };

  const toggleTranslation = (id: string) => {
    setShowTranslations(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    sfx.playClick();
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[620px]">
      
      {isCustomConfiguring ? (
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-white">
          <div className="text-center max-w-md mx-auto mb-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto border border-teal-100 shadow-sm mb-3">
              <Sparkles className="w-7 h-7 text-teal-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Tự tạo chủ đề của riêng bạn</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Nhập bối cảnh, tình huống hoặc vai trò bạn muốn đóng cùng với Giáo viên AI tiếng Trung của bạn.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-3 justify-center max-w-xl mx-auto w-full">
            <label className="text-xs font-bold text-slate-600">Mô tả tình huống bạn muốn đóng vai:</label>
            <textarea
              value={customPromptText}
              onChange={(e) => setCustomPromptText(e.target.value)}
              placeholder="Bạn muốn đóng vai trong tình huống nào? (VD: Mặc cả mua quần áo ở chợ, Phỏng vấn xin việc, Xin lỗi sếp vì đi muộn...)"
              className="w-full h-32 p-3.5 text-xs text-slate-800 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-2xl outline-none resize-none transition"
              maxLength={200}
            />
            <div className="text-[10px] text-slate-400 font-medium text-right -mt-1">
              Tối đa 200 ký tự (Sử dụng Tiếng Việt hoặc Tiếng Trung)
            </div>
          </div>

          <div className="flex gap-3 max-w-xl mx-auto w-full mt-6">
            <button
              onClick={() => {
                sfx.playClick();
                setIsCustomConfiguring(false);
              }}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Quay lại
            </button>
            <button
              onClick={startCustomConversation}
              disabled={!customPromptText.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Bắt đầu hội thoại
            </button>
          </div>
        </div>
      ) : !selectedRole ? (
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-white">
          <div className="text-center max-w-md mx-auto mb-6">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto border border-teal-100 shadow-sm mb-4">
              <Sparkles className="w-8 h-8 text-teal-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">AI Role-play Chat 24/7</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
              Trò chuyện tiếng Trung thực tế cùng AI Gia sư thông minh. Chọn một tình huống thực tiễn bên dưới và bắt đầu giao tiếp!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 items-center content-center max-w-xl mx-auto w-full">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => selectRole(role)}
                className="group border border-slate-100 hover:border-teal-100 bg-slate-50/50 hover:bg-teal-50/20 p-5 rounded-2xl text-left transition-all duration-300 shadow-sm hover:shadow-md flex flex-col gap-2 relative overflow-hidden"
              >
                <div className="text-3xl">{role.icon}</div>
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-teal-600 transition">
                  {role.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {role.description}
                </p>
                <div className="absolute bottom-4 right-4 text-slate-300 group-hover:text-teal-500 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          <div className="text-center mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Bot className="w-4 h-4 text-teal-500" />
            <span>Tự động phát âm chuẩn bản xứ &amp; Nhận diện khẩu hình</span>
          </div>
        </div>
      ) : (
        
        /* CHAT INTERFACE */
        <div className="flex-1 flex flex-col h-full bg-slate-900 text-white">
          
          {/* HEADER */}
          <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedRole.icon}</span>
              <div>
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                  <span>{selectedRole.title}</span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Vai AI: {selectedRole.promptRole}</p>
              </div>
            </div>

            <button
              onClick={() => {
                sfx.playClick();
                setSelectedRole(null);
                setMessages([]);
              }}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-750 rounded-xl transition"
            >
              Đổi chủ đề
            </button>
          </div>

          {/* MESSAGES CONSOLE */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isModel = msg.role === "model";
                const isShowTrans = showTranslations[msg.id];

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isModel ? "justify-start" : "justify-end"}`}
                  >
                    {/* Avatar */}
                    {isModel && (
                      <div className="w-8 h-8 bg-teal-650 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-bold border border-teal-500">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                    )}

                    {/* Chat Bubble */}
                    <div className="flex flex-col gap-1 max-w-[85%]">
                      <div
                        className={`p-3.5 rounded-[20px] shadow-sm relative ${
                          isModel
                            ? "bg-slate-800 text-slate-100 border border-slate-750 rounded-tl-none"
                            : "bg-teal-600 text-white rounded-tr-none"
                        }`}
                      >
                        {/* Chinese text */}
                        <p className={`font-sans font-semibold text-base leading-relaxed ${!isModel && "font-bold"}`}>
                          {msg.text}
                        </p>

                        {/* Model Extras (Pinyin & Translation) */}
                        {isModel && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-750 space-y-1.5">
                            {/* Tone Colored Pinyin */}
                            {msg.pinyin && (
                              <div className="text-xs tracking-wider bg-slate-900/50 p-1.5 rounded-lg border border-slate-750">
                                {renderToneColoredPinyin(msg.pinyin)}
                              </div>
                            )}

                            {/* Translation */}
                            {msg.translation && isShowTrans && (
                              <p className="text-xs text-slate-400 leading-relaxed font-sans italic flex items-center gap-1">
                                <Languages className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                <span>{msg.translation}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Control buttons for model messages */}
                        {isModel && (
                          <div className="flex items-center gap-2 mt-2 pt-1">
                            <button
                              onClick={() => speakChinese(msg.text)}
                              className="p-1 rounded-md bg-slate-750 hover:bg-slate-700 text-slate-350 hover:text-white transition"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => toggleTranslation(msg.id)}
                              className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-750 hover:bg-slate-700 transition"
                            >
                              {isShowTrans ? "Ẩn dịch" : "Dịch"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* AI Feedback (Expandable study tips) */}
                      {isModel && msg.feedback && (
                        <div className="bg-amber-900/10 border border-amber-900/20 text-amber-300 rounded-xl p-2.5 text-xs font-sans font-medium flex items-start gap-1.5 mt-1 max-w-[340px]">
                          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold uppercase tracking-wider text-[9px] block mb-0.5 text-amber-400">Gợi ý từ vựng &amp; Ngữ pháp</span>
                            <span className="leading-relaxed block">{msg.feedback}</span>
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <span className="text-[9px] text-slate-500 font-mono px-1">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* User Avatar */}
                    {!isModel && (
                      <div className="w-8 h-8 bg-slate-700 text-slate-300 rounded-full flex items-center justify-center text-xs shrink-0 font-bold border border-slate-600">
                        <User className="w-4.5 h-4.5" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {isAiTyping && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-8 h-8 bg-teal-650 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-bold border border-teal-500">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div className="bg-slate-800 border border-slate-750 rounded-[20px] rounded-tl-none p-3.5 text-slate-400 text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Gia sư AI đang soạn câu trả lời...</span>
                  </div>
                </div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* SYSTEM VOICE OR DICTATION ERRORS */}
          {voiceSupportError && (
            <div className="px-4 py-2 bg-rose-950 border-t border-rose-900 text-rose-300 text-xs flex items-center gap-2 shrink-0 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{voiceSupportError}</span>
            </div>
          )}

          {/* INPUT BAR */}
          <div className="p-3.5 bg-slate-850 border-t border-slate-800 flex items-center gap-2 shrink-0">
            {/* Mic Dictation Trigger - auto hide if not supported */}
            {isSpeechSupported && (
              <button
                onClick={handleVoiceInput}
                className={`p-3 rounded-full transition flex-shrink-0 ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white"
                }`}
                title="Thu âm bằng giọng nói"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            {/* Input field - remains interactive during voice input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                if (isListening) {
                  setIsListening(false);
                }
                setInputText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder={isListening ? "Đang ghi âm... hoặc gõ chữ vào đây..." : "Nhập câu trả lời bằng chữ Hán hoặc Pinyin..."}
              className="flex-1 bg-slate-800 border border-slate-750 focus:border-teal-500 text-white placeholder-slate-500 text-sm px-4 py-3 rounded-2xl focus:outline-none transition font-sans"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="p-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white transition disabled:opacity-40 disabled:hover:bg-teal-600 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
export default RoleplayChat;
