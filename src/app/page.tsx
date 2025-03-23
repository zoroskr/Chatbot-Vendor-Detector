"use client"

import { JSX, useState } from "react";
import "./globals.css"
import Footer from "./components/Footer";
import InfoIcon from "@/app/assets/icons/InfoIcon";

/**
 * Home
 *
 * Main page with the interface to detect chatbots on a given URL and evaluate welcome messages.
 *
 * @returns {JSX.Element} - Main interface component
 */
export default function Home(): JSX.Element {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{
    vendor: string | null;
    method: string;
    welcomeMessage?: {
      url: string;
      evaluation: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

    /**
   * handleDetectVendor
   *
   * Sends the URL to the API to detect a chatbot and evaluate its welcome message.
   */
  const handleDetectVendor = async () => {
    if (!url) return;
    setLoading(true);
    setAnalyzing(false);
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
        // If a vendor was detected, set analyzing to true while the welcome message is being processed
        if (data.vendor) {
          setAnalyzing(true);
        }
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900">
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-2xl font-bold">Chatbot Vendor Detector</h1>
            <div className="relative group text-sm">
              <InfoIcon className="w-5 h-5 text-gray-600 flex items-center justify-center cursor-pointer" />
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-64 p-2 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute left-1/2 -top-1.5 transform -translate-x-1/2 border-4 border-transparent border-b-black"></div>
                Detection is based on our algorithm and may have a margin of error. We recommend verifying manually for accuracy.
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 max-w-xs mb-2">
            This tool identifies chatbot vendors and evaluates welcome messages on a given webpage!
          </p>
          <input
            type="text"
            placeholder="Enter website URL to analyze"
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
              {result.method === "timeout" ? (
                <p className="text-orange-500 font-semibold text-center">
                  ⏳ The analysis timed out. The page might be too slow or unresponsive.
                </p>
              ) : result.method === "error" ? (
                <p className="text-red-500 font-semibold text-center">
                  ❌ An error occurred while analyzing the page. Please try again later.
                </p>
              ) : result.vendor ? (
                <div>
                  <p className="text-green-600 font-semibold text-center">
                    ✅ Vendor Detected: {result.vendor} (Method: {result.method})
                  </p>
                  
                  {/* Welcome Message Section */}
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Welcome Message Analysis</h3>
                    
                    {analyzing && !result.welcomeMessage && (
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="animate-pulse flex flex-col items-center">
                          <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Analyzing the welcome message...</p>
                        <p className="text-xs text-gray-400 mt-1">This may take up to 60 seconds</p>
                      </div>
                    )}
                    
                    {result.welcomeMessage?.evaluation ? (
                      <div className="text-sm">
                        <p className="whitespace-pre-line text-gray-700">{result.welcomeMessage.evaluation}</p>
                      </div>
                    ) : !analyzing && (
                      <p className="text-yellow-600 text-center">
                        Welcome message analysis not available.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-yellow-600 text-center">
                  🔍 No chatbot vendor detected from our database.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
