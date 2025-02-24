import { NextResponse } from "next/server";
import { detectVendor } from "@/utils/detectVendor";

/**
 * API handler to detect chatbots on a given URL.
 *
 * @param {Request} req - The API request.
 * @returns {Promise<NextResponse>} - The API response.
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    console.log(`Processing URL: ${url}`);
    const result = await detectVendor(url);
    console.log("Detection result:", result);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in detectVendor:", error);
    return NextResponse.json({ error: "Failed to analyze the page" }, { status: 500 });
  }
}
