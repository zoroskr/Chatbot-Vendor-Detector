# 🕵️‍♂️ Chatbot Vendor Detector  

Chatbot Vendor Detector is a hybrid application that allows users to detect the vendor of a chatbot on any webpage they input. The application provides multiple ways to perform the detection:

- **CLI**: Executable via terminal.
- **REST API**: Queryable through Postman or other tools.
- **Web App**: Hosted on Vercel for easy access.

## 🔍 How It Works

The detection process is based on searching for either a **string in network traffic** or an **object in `window`**. The app compares the values against a scalable vendor database, which contains vendor names, their website URLs, keywords to search for in network traffic (e.g., "service-now.com"), and keywords to look for in the `window` object (e.g., `window.NOW`).

Once a match is found, the app returns the vendor name and specifies which method was used for detection (network traffic, window object, or both). If no vendor is detected, the app will display a message indicating that no chatbot from the database was found on the webpage, along with a reminder that the detection method is not foolproof and should always be verified manually.

## 🚀 Technologies Used

- **Next.js** (App Router for modern routing)
- **TypeScript** (For type safety and better development experience)
- **Node.js** (Backend logic and CLI tool)
- **Tailwind CSS** (For fast and responsive styling)
- **Playwright** (For analyzing network traffic during detection)

## 📌 Notes

- If no vendor is detected, a message will be shown explaining that no match was found. It also includes a disclaimer about the possibility of errors, encouraging manual verification.
- The CLI is designed to run locally with Node.js. You can use the terminal to execute the detection script.

## 🛠 Installation

### 1. Clone the repository:
```bash
git clone https://github.com/JCAlmazan/Chatbot-Vendor-Detector.git
```
### 2. Install dependencies:
```bash
cd chatbot-vendor-detector
npm install
```
### 3. Run the app (Web & API):
You can run the web app and API locally with:
```bash
npm run dev
```
### 4. Run the CLI (locally):
For CLI usage, simply run:
```bash
npm run cli
```

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🤝 Contributions
Feel free to contribute by submitting pull requests or issues. Contributions are always welcome!
