"use client"

import { type JSX, useState } from "react"
import Footer from "./components/Footer"
import InfoIcon from "@/app/assets/icons/InfoIcon"
import { Loader2, AlertCircle, CheckCircle, Search, MessageSquare } from "lucide-react"

interface DetectionResult {
  vendor: string | null
  method: string
}

interface WelcomeMessageResult {
  url: string
  evaluation: string
  attempts?: string
  error?: string
}

/**
 * Home
 *
 * Main page with the interface to detect chatbots on a given URL and evaluate welcome messages.
 *
 * @returns {JSX.Element} - Main interface component
 */
export default function Home(): JSX.Element {
  const [url, setUrl] = useState("")
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null)
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessageResult | null>(null)
  const [detectLoading, setDetectLoading] = useState(false)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [error, setError] = useState("")

  /**
   * handleDetectVendor
   *
   * Sends the URL to the API to detect a chatbot.
   */
  const handleDetectVendor = async () => {
    if (!url) return
    setDetectLoading(true)
    setError("")
    setDetectionResult(null)

    try {
      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()
      if (response.ok) {
        setDetectionResult(data)
      } else {
        setError(data.error || "An error occurred during detection")
      }
    } catch (err) {
      console.error("Error in handleDetectVendor:", err)
      setError("Failed to connect to the detection server")
    }
    setDetectLoading(false)
  }

  /**
   * handleAnalyzeWelcomeMessage
   *
   * Sends the URL to analyze the welcome message of the detected chatbot.
   */
  const handleAnalyzeWelcomeMessage = async () => {
    if (!url) return
    setAnalyzeLoading(true)
    setWelcomeMessage(null)
    setError("")

    try {
      const response = await fetch("/api/welcome-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()
      if (response.ok) {
        setWelcomeMessage(data)
      } else {
        console.error("Welcome message analysis error:", data.error)
        setWelcomeMessage({ url, evaluation: "", error: data.error })
      }
    } catch (err) {
      console.error("Error in handleAnalyzeWelcomeMessage:", err)
      setWelcomeMessage({ url, evaluation: "", error: "Failed to analyze welcome message" })
    }
    setAnalyzeLoading(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Chatbot Detector
            </h1>
            <div className="relative group">
              <button className="flex items-center justify-center rounded-full w-6 h-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <InfoIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <div className="absolute z-10 left-1/2 transform -translate-x-1/2 mt-2 w-72 p-3 text-sm bg-slate-900 text-white rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg">
                <div className="absolute left-1/2 -top-2 transform -translate-x-1/2 border-8 border-transparent border-b-slate-900"></div>
                Detection is based on our algorithm and may have a margin of error. We recommend verifying manually for
                accuracy.
              </div>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-300 mb-6 text-base">
            Identify chatbot vendors and evaluate welcome messages on any website with our advanced detection tool.
          </p>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleDetectVendor}
              disabled={detectLoading || !url}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
            >
              {detectLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Detecting...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Detect Vendor</span>
                </>
              )}
            </button>
            <button
              onClick={handleAnalyzeWelcomeMessage}
              disabled={analyzeLoading || !url}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
            >
              {analyzeLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  <span>Analyze Welcome</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Detection results */}
          {detectionResult && (
            <div className="mb-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 transition-all duration-300 animate-fadeIn">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-medium text-slate-900 dark:text-white">Detection Results</h3>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800">
                {detectionResult.method === "timeout" ? (
                  <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <p className="font-medium">The analysis timed out. The page might be too slow or unresponsive.</p>
                  </div>
                ) : detectionResult.method === "error" ? (
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-500">
                    <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <p className="font-medium">An error occurred while analyzing the page. Please try again later.</p>
                  </div>
                ) : detectionResult.vendor ? (
                  <div className="flex items-center gap-3 text-green-600 dark:text-green-500">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">Vendor Detected: {detectionResult.vendor}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Detection Method: {detectionResult.method}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                      <Search className="w-5 h-5" />
                    </div>
                    <p className="font-medium">No chatbot vendor detected from our database.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Welcome message analysis results */}
          {welcomeMessage && (
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 transition-all duration-300 animate-fadeIn">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-medium text-slate-900 dark:text-white">Welcome Message Analysis</h3>
              </div>
              <div className="p-4 bg-white dark:bg-slate-800">
                {welcomeMessage.error ? (
                  <div className="flex items-start gap-3 text-red-600 dark:text-red-500">
                    <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <p className="font-medium">{welcomeMessage.error}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                      <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">
                        {welcomeMessage.evaluation}
                      </p>
                    </div>
                    {welcomeMessage.attempts === "failed" && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p>Analysis was performed on the full page as the chatbot could not be opened.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

