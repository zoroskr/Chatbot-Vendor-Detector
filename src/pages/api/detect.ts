import { NextApiRequest, NextApiResponse } from "next";
import { detectVendor } from "../../utils/detectVendor";

/**
 * API handler to detect chatbots on a given URL.
 *
 * @param {NextApiRequest} req - The API request.
 * @param {NextApiResponse} res - The API response.
 * @returns {void}
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    console.log(`Processing URL: ${url}`);
    const result = await detectVendor(url);
    console.log("Detection result:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in detectVendor:", error);
    res.status(500).json({ error: "Failed to analyze the page" });
  }
}
