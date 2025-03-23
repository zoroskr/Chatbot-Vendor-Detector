import { NextResponse } from "next/server";
import { detectVendor } from "@/utils/detectVendor";
import { processWelcomeMessage } from "@/utils/welcomePattern";

/**
 * API handler to detect chatbots on a given URL and evaluate welcome messages.
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
    
    // Detect vendor
    const vendorResult = await detectVendor(url);
    console.log("Detection result:", vendorResult);
    
    // If a chatbot vendor was detected, analyze the welcome message
    let welcomeMessageResult = null;
    if (vendorResult.vendor) {
      console.log(`Chatbot detected (${vendorResult.vendor}). Analyzing welcome message...`);
      try {
        welcomeMessageResult = await processWelcomeMessage(url);
        console.log("Welcome message analysis complete");
      } catch (error) {
        console.error("Error analyzing welcome message:", error);
        welcomeMessageResult = { error: "Failed to analyze welcome message" };
      }
    }

    return NextResponse.json({
      ...vendorResult,
      welcomeMessage: welcomeMessageResult
    }, { status: 200 });
  } catch (error) {
    console.error("Error in detect API:", error);
    return NextResponse.json({ error: "Failed to analyze the page" }, { status: 500 });
  }
}
