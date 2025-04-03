import { NextResponse } from "next/server";
import { processWelcomeMessage } from "@/utils/welcomePattern";

/**
 * API handler to analyze welcome messages of detected chatbots.
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

    console.log(`Processing URL for welcome message analysis: ${url}`);
    
    try {
      const welcomeMessageResult = await processWelcomeMessage(url);
      console.log("Welcome message analysis complete");
      return NextResponse.json(welcomeMessageResult, { status: 200 });
    } catch (error) {
      console.error("Error analyzing welcome message:", error);
      return NextResponse.json(
        { error: "Failed to analyze welcome message" }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in welcome-message API:", error);
    return NextResponse.json(
      { error: "Failed to process the request" }, 
      { status: 500 }
    );
  }
} 