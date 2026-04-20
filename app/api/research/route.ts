import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { pages } = await req.json();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        } as any,
      ],
      messages: [
        {
          role: "user",
          content: `ابحث في الإنترنت عن أحدث وأرقى 3 منتجات تباع الآن في الجزائر من هذه الصفحات: ${pages.join(", ")}.
أرجعلي JSON فقط بهذا الشكل بدون أي نص آخر:
[
  {
    "name": "اسم المنتج",
    "image": "https://...",
    "price": "$XX.XX",
    "description": "وصف قصير"
  }
]`,
        },
      ],
    });

    const text = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const products = JSON.parse(clean);

    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}