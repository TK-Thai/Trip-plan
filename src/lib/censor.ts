export const THAI_PROFANITY_WORDS = [
  "ควย",
  "เหี้ย",
  "สัส",
  "เย็ด",
  "หี",
  "แตด",
  "พ่อง",
  "แม่ง",
  "กะหรี่",
  "ดอกทอง",
  "ส้นตีน",
  "ระยำ",
  "จัญไร",
  "ฉิบหาย",
  "อีเหี้ย",
  "ไอ้สัส",
  "ไอ้เหี้ย",
  "อีสัส",
  "หน้าหี",
  "มึง",
  "กู",
];

export function censorText(text: string | null | undefined): string {
  if (!text) return "";
  
  let result = text;
  for (const word of THAI_PROFANITY_WORDS) {
    // Escape word to be safe in regex
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Using RegExp with 'g' and 'i' (ignore case is generally not applicable to Thai but good for English words if added)
    const regex = new RegExp(escapedWord, "gi");
    result = result.replace(regex, "***");
  }
  return result;
}
