# 🕵️‍♂️ Chatbot Vendor Detector

Chatbot Vendor Detector is a hybrid application that allows users to detect the vendor of a chatbot on any webpage they input and evaluate the quality of welcome messages. The application provides multiple ways to perform the detection:

- **CLI**: Executable via terminal.
- **REST API**: Queryable through Postman or other tools.
- **Web App**: Hosted on Vercel for easy access.

## 🔍 How It Works

### Vendor Detection
The detection process is based on searching for either a **string in network traffic** or an **object in `window`**. The app compares the values against a scalable vendor database, which contains vendor names, their website URLs, keywords to search for in network traffic (e.g., "service-now.com"), and keywords to look for in the `window` object (e.g., `window.NOW`).

Once a match is found, the app returns the vendor name and specifies which method was used for detection (network traffic, window object, or both). If no vendor is detected, the app will display a message indicating that no chatbot from the database was found on the webpage, along with a reminder that the detection method is not foolproof and should always be verified manually.

### Welcome Message Evaluation
When a chatbot is detected, the application can also evaluate the quality of its welcome message. This process involves:

1. Taking a screenshot of the webpage
2. Using an AI model to identify the chatbot's position on the page
3. Clicking on the chatbot to open it
4. Capturing a screenshot of the opened chatbot
5. Using AI to analyze and evaluate the welcome message for clarity, helpfulness, and user experience

The evaluation provides insights into how well the chatbot introduces itself and guides users.

## 📋 Requirements

To run this project locally or deploy it, you need:

- [Node.js](https://nodejs.org/es) (v18 or later recommended)
- [Docker](https://www.docker.com/) (Optional, required only for running the app with Docker Compose)
- An OpenAI API key (for the welcome message evaluation feature)

## 🔑 Configuration

To use the welcome message evaluation feature, you need to set your OpenAI API key in the `.env` file:

```
OPENAI_API_KEY=your_api_key_here
```

## 🚀 Technologies Used

- **Next.js** (App Router for modern routing)
- **TypeScript** (For type safety and better development experience)
- **Node.js** (Backend logic and CLI tool)
- **Tailwind CSS** (For fast and responsive styling)
- **Playwright** (For analyzing network traffic during detection)
- **Docker** (For containerization and easier deployment)

## 📌 Notes

- If no vendor is detected, a message will be shown explaining that no match was found. It also includes a disclaimer about the possibility of errors, encouraging manual verification.
- The CLI is designed to run locally with Node.js. You can use the terminal to execute the detection script.
- The welcome message evaluation requires an OpenAI API key with access to the GPT-4 Vision model.
- When app is running, you can use the web app on http://localhost:3000 or try the API doing a POST request to http://localhost:3000/api/detect sending a body like this:

```json
{
  "url": "https://example.com"
}
```

The API will return both the vendor detection result and the welcome message evaluation if a chatbot is found.

## 🛠 Installation

### 1. Clone the repository:

```bash
git clone https://github.com/JCAlmazan/Chatbot-Vendor-Detector.git
```

### 2. Install dependencies:

```bash
cd Chatbot-Vendor-Detector
```

```bash
npm install
```

### 3. Run the app (Web & API):

You can run the web app and API locally with:

```bash
npm run dev
```

This will expose the application on http://localhost:3000.

### 4. Run the CLI (locally):

For CLI usage, simply run:

```bash
npm run cli
```

🌐 Running with Docker Compose

If you want to run both the web app (API) and the CLI at the same time, you can use Docker Compose.

1. Build the Docker image:

```bash
docker build
```

2. Start the services:

```bash
docker-compose up
```

This will expose the application on http://localhost:3000.

3. To run the CLI, use the following command:

```bash
docker-compose exec chatbot-vendor-detector npm run cli
```

4. Stop the services:

```bash
docker-compose down
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🤝 Contributions

Feel free to contribute by submitting pull requests or issues.
Adding more vendors to vendor database would be a great contribution.
You only need to add the vendor information in vendors.ts file.
Contributions are always welcome!

---

### 📄 Additional Documents  
- [📘 Essay](ESSAY.md)  
- [📜 Activity Log](ACTIVITYLOG.md)  