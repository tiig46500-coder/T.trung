import { Topic } from "./types";

export const DEFAULT_TOPICS: Topic[] = [
  {
    id: "giao-tiep-co-ban",
    name: "Giao Tiếp Cơ Bản",
    description: "Các câu chào hỏi, cảm ơn, xin lỗi và giao tiếp thông dụng hàng ngày.",
    icon: "MessageSquare",
    words: [
      {
        character: "你好",
        pinyin: "nǐ hǎo",
        meaning: "Xin chào",
        type: "Thán từ",
        exampleCn: "你好！很高兴认识你。",
        exampleVi: "Xin chào! Rất vui được quen biết bạn."
      },
      {
        character: "谢谢",
        pinyin: "xièxie",
        meaning: "Cảm ơn",
        type: "Động từ",
        exampleCn: "谢谢你帮我学习汉语。",
        exampleVi: "Cảm ơn bạn đã giúp tôi học tiếng Trung."
      },
      {
        character: "再见",
        pinyin: "zài jiàn",
        meaning: "Tạm biệt",
        type: "Động từ",
        exampleCn: "妈妈，我走了，再见！",
        exampleVi: "Mẹ ơi, con đi đây, tạm biệt!"
      },
      {
        character: "对不起",
        pinyin: "duì bu qǐ",
        meaning: "Xin lỗi",
        type: "Động từ",
        exampleCn: "对不起，我来晚了。",
        exampleVi: "Xin lỗi, tôi đến muộn."
      },
      {
        character: "没关系",
        pinyin: "méi guān xi",
        meaning: "Không sao đâu / Không có gì",
        type: "Cụm từ",
        exampleCn: "没关系，下次注意就好了。",
        exampleVi: "Không sao đâu, lần sau chú ý là được rồi."
      },
      {
        character: "请问",
        pinyin: "qǐng wèn",
        meaning: "Xin hỏi",
        type: "Động từ",
        exampleCn: "请问，图书馆在哪儿？",
        exampleVi: "Xin hỏi, thư viện ở đâu vậy?"
      },
      {
        character: "不客气",
        pinyin: "bú kè qi",
        meaning: "Đừng khách sáo / Không có gì",
        type: "Cụm từ",
        exampleCn: "谢谢你的礼物！ - 不客气！",
        exampleVi: "Cảm ơn món quà của bạn! - Không có gì đâu!"
      },
      {
        character: "是",
        pinyin: "shì",
        meaning: "Là / Vâng / Đúng",
        type: "Động từ",
        exampleCn: "我是一名汉语学生。",
        exampleVi: "Tôi là một học sinh học tiếng Trung."
      },
      {
        character: "不",
        pinyin: "bù",
        meaning: "Không",
        type: "Phó từ",
        exampleCn: "我不喝咖啡，我喝茶。",
        exampleVi: "Tôi không uống cà phê, tôi uống trà."
      },
      {
        character: "好",
        pinyin: "hǎo",
        meaning: "Tốt / Được / Khỏe",
        type: "Tính từ",
        exampleCn: "今天天气很好。",
        exampleVi: "Thời tiết hôm nay rất tốt."
      }
    ]
  },
  {
    id: "gia-dinh-ban-than",
    name: "Gia Đình & Bản Thân",
    description: "Từ vựng về người thân trong gia đình, nghề nghiệp và danh xưng xưng hô.",
    icon: "User",
    words: [
      {
        character: "爸爸",
        pinyin: "bà ba",
        meaning: "Bố / Ba",
        type: "Danh từ",
        exampleCn: "我爸爸是一名医生。",
        exampleVi: "Bố tôi là một bác sĩ."
      },
      {
        character: "妈妈",
        pinyin: "mā ma",
        meaning: "Mẹ / Má",
        type: "Danh từ",
        exampleCn: "我妈妈做的菜最好吃。",
        exampleVi: "Mẹ tôi nấu ăn là ngon nhất."
      },
      {
        character: "家",
        pinyin: "jiā",
        meaning: "Nhà / Gia đình",
        type: "Danh từ",
        exampleCn: "我家有四口人。",
        exampleVi: "Nhà tôi có bốn người."
      },
      {
        character: "名字",
        pinyin: "míng zi",
        meaning: "Tên",
        type: "Danh từ",
        exampleCn: "你叫什么名字？",
        exampleVi: "Bạn tên là gì?"
      },
      {
        character: "医生",
        pinyin: "yī shēng",
        meaning: "Bác sĩ",
        type: "Danh từ",
        exampleCn: "医生建议他多休息。",
        exampleVi: "Bác sĩ khuyên anh ấy nên nghỉ ngơi nhiều hơn."
      },
      {
        character: "学生",
        pinyin: "xué sheng",
        meaning: "Học sinh / Sinh viên",
        type: "Danh từ",
        exampleCn: "学校里有很多学生。",
        exampleVi: "Trong trường có rất nhiều học sinh."
      },
      {
        character: "朋友",
        pinyin: "péng you",
        meaning: "Bạn bè / Bạn",
        type: "Danh từ",
        exampleCn: "他是我的好朋友。",
        exampleVi: "Anh ấy là bạn tốt của tôi."
      },
      {
        character: "我",
        pinyin: "wǒ",
        meaning: "Tôi / Tớ / Tao",
        type: "Đại từ",
        exampleCn: "我很喜欢吃中国菜。",
        exampleVi: "Tôi rất thích ăn món ăn Trung Quốc."
      },
      {
        character: "你",
        pinyin: "nǐ",
        meaning: "Bạn / Cậu / Mày",
        type: "Đại từ",
        exampleCn: "你想去哪里旅行？",
        exampleVi: "Bạn muốn đi du lịch ở đâu?"
      },
      {
        character: "老师",
        pinyin: "lǎo shī",
        meaning: "Giáo viên / Thầy cô",
        type: "Danh từ",
        exampleCn: "王老师教我们汉语。",
        exampleVi: "Thầy Vương dạy chúng tôi tiếng Trung."
      }
    ]
  },
  {
    id: "so-dem-thoi-gian",
    name: "Số Đếm & Thời Gian",
    description: "Nhận biết các con số cơ bản, các buổi trong ngày và thứ ngày tháng.",
    icon: "Calendar",
    words: [
      {
        character: "一",
        pinyin: "yī",
        meaning: "Số một",
        type: "Số từ",
        exampleCn: "我买了一本书。",
        exampleVi: "Tôi đã mua một cuốn sách."
      },
      {
        character: "二",
        pinyin: "èr",
        meaning: "Số hai",
        type: "Số từ",
        exampleCn: "这里有两（二）个苹果。",
        exampleVi: "Ở đây có hai quả táo."
      },
      {
        character: "三",
        pinyin: "sān",
        meaning: "Số ba",
        type: "Số từ",
        exampleCn: "星期三下午我有课。",
        exampleVi: "Chiều thứ Tư tôi có tiết học."
      },
      {
        character: "今天",
        pinyin: "jīn tiān",
        meaning: "Hôm nay",
        type: "Danh từ chỉ thời gian",
        exampleCn: "今天是个好日子。",
        exampleVi: "Hôm nay là một ngày tốt lành."
      },
      {
        character: "明天",
        pinyin: "míng tiān",
        meaning: "Ngày mai",
        type: "Danh từ chỉ thời gian",
        exampleCn: "我们明天见！",
        exampleVi: "Chúng ta hẹn ngày mai gặp nhé!"
      },
      {
        character: "昨天",
        pinyin: "zuó tiān",
        meaning: "Hôm qua",
        type: "Danh từ chỉ thời gian",
        exampleCn: "昨天我去了超市。",
        exampleVi: "Hôm qua tôi đã đi siêu thị."
      },
      {
        character: "星期",
        pinyin: "xīng qī",
        meaning: "Thứ / Tuần",
        type: "Danh từ",
        exampleCn: "一个星期有七天。",
        exampleVi: "Một tuần có bảy ngày."
      },
      {
        character: "点",
        pinyin: "diǎn",
        meaning: "Giờ (giờ đồng hồ)",
        type: "Danh từ / Lượng từ",
        exampleCn: "现在是早上八点。",
        exampleVi: "Bây giờ là tám giờ sáng."
      },
      {
        character: "月",
        pinyin: "yuè",
        meaning: "Tháng / Mặt trăng",
        type: "Danh từ",
        exampleCn: "九月我们要开学了。",
        exampleVi: "Tháng Chín chúng tôi sẽ khai giảng."
      },
      {
        character: "年",
        pinyin: "nián",
        meaning: "Năm",
        type: "Danh từ",
        exampleCn: "祝你新年快乐！",
        exampleVi: "Chúc bạn năm mới vui vẻ!"
      }
    ]
  }
];

// Stroke guidelines library for simple demo animations
// We can use simple path data for rendering stroke vectors of common single characters.
export const STROKE_LIBRARY: Record<string, string[]> = {
  "一": [
    "M 40,100 L 160,100"
  ],
  "二": [
    "M 55,75 L 145,75",
    "M 40,125 L 160,125"
  ],
  "三": [
    "M 50,60 L 150,60",
    "M 60,100 L 140,100",
    "M 40,140 L 160,140"
  ],
  "人": [
    "M 100,40 Q 75,100 40,150",
    "M 90,95 Q 125,120 160,150"
  ],
  "十": [
    "M 40,100 L 160,100",
    "M 100,40 L 100,160"
  ],
  "口": [
    "M 60,60 L 60,140",
    "M 60,60 L 140,60 L 140,140",
    "M 60,140 L 140,140"
  ],
  "不": [
    "M 40,60 L 160,60",
    "M 100,60 Q 95,110 50,150",
    "M 100,60 L 100,140 Q 100,155 85,155",
    "M 115,100 Q 140,125 160,150"
  ],
  "是": [
    "M 70,40 L 130,40",
    "M 70,40 L 70,70 L 130,70 L 130,40",
    "M 70,55 L 130,55",
    "M 50,90 L 150,90",
    "M 100,70 L 100,120",
    "M 75,105 L 125,105",
    "M 55,120 L 145,120",
    "M 100,120 Q 80,145 50,160",
    "M 100,120 Q 125,140 160,165"
  ],
  "好": [
    "M 70,50 L 50,80 L 85,80",
    "M 85,55 L 60,120",
    "M 45,95 L 95,95",
    "M 115,50 L 145,50 L 145,85 Q 145,115 120,135",
    "M 115,85 L 145,85",
    "M 100,110 L 160,110"
  ],
  "家": [
    "M 100,35 L 100,45",
    "M 65,55 Q 60,70 55,85",
    "M 65,55 L 135,55 L 135,70 Q 135,75 125,75",
    "M 100,60 L 100,85",
    "M 80,80 Q 60,110 45,140",
    "M 85,95 Q 65,135 50,165",
    "M 115,85 Q 135,115 155,145",
    "M 110,110 Q 135,135 160,160",
    "M 85,130 Q 105,145 130,160"
  ]
};
