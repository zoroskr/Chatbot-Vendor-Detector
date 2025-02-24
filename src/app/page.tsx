"use client"

import { JSX, useState } from "react";
import "./globals.css"

/**
 * Home
 *
 * Main page with the interface to detect chatbots on a given URL.
 *
 * @returns {JSX.Element} - Main interface component
 */
export default function Home(): JSX.Element {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{
    vendor: string | null;
    method: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * handleDetectVendor
   *
   * Sends the URL to the API to detect a chatbot.
   */
  const handleDetectVendor = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      console.log("url", url);
      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      console.error("Error in handleDetectVendor:", err);      
      setError("Failed to connect to the server");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Chatbot Vendor Detector</h1>
        <input
          type="text"
          placeholder="Enter website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          onClick={handleDetectVendor}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:bg-blue-300"
        >
          {loading ? "Detecting..." : "Detect Vendor"}
        </button>

        {error && <p className="text-red-500 mt-4">{error}</p>}
        {result && (
          <div className="mt-4 p-4 bg-gray-50 border rounded">
            {result.vendor ? (
              <p className="text-green-600 font-semibold">
                ✅ Vendor Detected: {result.vendor} (Method: {result.method})
              </p>
            ) : (
              <p className="text-gray-600">
                ❌ No chatbot vendor detected from the database.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
