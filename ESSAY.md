# AUTOMATIC DETECTION OF CHATBOT PROVIDERS ON WEBSITES

---

## Automatic Detection of Chatbot Providers on Websites  
**(Hybrid Application with CLI, REST API, and Web Frontend on Vercel)**  
**Authors:** Almazán Juan Cruz, Almazán Facundo.  
**02 / 27 / 2025**

---

## TABLE OF CONTENTS
1. [Introduction](#introduction)  
2. [Objectives](#objectives)  
3. [Theoretical Framework](#theoretical-framework)  
   1. [Concept of Chatbots](#concept-of-chatbots)  
   2. [Interaction Patterns in Chatbots](#interaction-patterns-in-chatbots)  
   3. [Chatbot Vendors](#chatbot-vendors)  
4. [Application Architecture](#application-architecture)  
   1. [General Overview](#general-overview)  
   2. [Main Components](#main-components)  
      1. [CLI (Node.js)](#cli-nodejs)  
      2. [REST API (Next.js)](#rest-api-nextjs)  
      3. [Web Interface (Next.js + Tailwind)](#web-interface-nextjs--tailwind)  
      4. [Vendor Database](#vendor-database)  
5. [Technical Implementation](#technical-implementation)  
   1. [Installation and Execution](#installation-and-execution)  
   2. [Detection Logic Details](#detection-logic-details)  
   3. [Code Comments](#code-comments)  
      1. [Example of Functions with Comments](#example-of-functions-with-comments)  
6. [Use Cases and Examples](#use-cases-and-examples)  
   1. [CLI Execution](#cli-execution)  
   2. [REST API Query](#rest-api-query)  
   3. [Query via Web App on Vercel](#query-via-web-app-on-vercel)  
7. [Possible Limitations and Warnings](#possible-limitations-and-warnings)  
8. [Conclusions](#conclusions)  
9. [Glossary](#glossary)  
10. [References](#references)

---

## Introduction

In recent years, **chatbots** have become key tools for interaction between businesses and end users. Various platforms or vendors offer their own solutions, each with distinctive APIs, network configurations, and JavaScript objects. Often, businesses integrate a chatbot on their websites without clearly disclosing to visitors (or technical analysts) which platform is behind it.  
This report introduces a **hybrid application** for the **automatic detection** of a chatbot provider (vendor) used on any given website. To achieve this, verification steps are performed in order to maximize the success rate in identifying the vendor.  
The application will be deployed on **Vercel** for the web portion and the **REST API**, and a local **Command Line Interface (CLI)** will also be provided for those who prefer terminal usage.

---

## Objectives

1. **Automate the detection of a chatbot vendor** by means of:
   - Analysis of the `window` object in the browser, looking for global property names typical of different providers (e.g., `window.NOW` for ServiceNow, `window.zE` for Zendesk, etc.).
   - Network traffic analysis, identifying common loading domains (e.g., `service-now.com`, `zopim.com`, `tidio.com`, etc.).
2. **Develop a hybrid application** that allows interaction via:
   - CLI in Node.js.
   - REST API in Next.js.
   - Web interface deployed on Vercel.
3. **Create a scalable vendor database** that stores:
   - Vendor name.
   - Official URL.
   - Keyword for detection in network traffic.
   - Key object on `window`.
4. **Provide transparency** regarding the detection method used (window, network, or both).
5. **Notify the user** if no known chatbot is detected and warn about potential errors.

---

## Theoretical Framework

### Concept of Chatbots

A **chatbot** is software that simulates human conversation through a text or voice interface. According to “Traubinger and Gaedke (2021)”, chatbots combine visual elements and natural language to assist the user with specific tasks, such as:

- Customer service.  
- Support processes.  
- Navigation guides within a website.

In academic contexts, there are various classifications of chatbots:

- **Rule-based**: Rely on decision trees or keyword matching.  
- **AI-based (NLP, machine learning)**: Capable of learning from previous interactions and better understanding natural language.

### Interaction Patterns in Chatbots

Incorporating **interaction patterns** in chatbots (such as “Persistent Menu,” “Quick Replies,” “Typing Indicators,” etc.) enhances a smooth user experience. These patterns may manifest in:

- **JavaScript objects** (e.g., `window.zE` for the Zendesk widget).  
- **CSS selectors** (e.g., `.cx-` prefix for Genesys).  
- **Calls to external domains** (requests to `service-now.com` in the case of ServiceNow).

### Chatbot Vendors

There are numerous chatbot providers, including:

- **ServiceNow**: Common object: `window.NOW`; domain: `service-now.com`.  
- **Zendesk**: Objects: `window.zE`, `window.$zopim`; domain: `zopim.com`.  
- **Intercom**: Object: `window.Intercom`; domain: `intercom.io`.  
- **LiveChat**: Object: `window.LC_API`; domain: `livechatinc.com`.  
- **Tidio**: Object: `window.tidioChatApi`; domain: `tidio.com`.  
- **Genesys**: Object: `window.CXBus`; CSS prefix: `cx-`; domain: `genesyscloud.com`.  
- **Many others**: Freshchat, Drift, HubSpot, etc.

One of the aims of this work is to easily scale the vendor database by adding new constants in a JS/TS file as more providers emerge.

---

## Application Architecture

### General Overview

The solution is conceived as a **monorepo** or unified structure with:

1. CLI for local detection.  
2. REST API implemented in Next.js.  
3. Web interface also in Next.js and deployed on Vercel.

## Main Components

### CLI (Node.js)
- Allows the user to run a command: `npm run detect <URL>`.
- Analyzes the URL: makes HTTP/HTTPS requests and can emulate a browser environment to detect scripts and objects.

### REST API (Next.js)
- Exposes endpoints for clients to perform detection without using the CLI directly.
- Typical structure: `GET /api/detect?url=<SITE_URL>`.
- Returns a JSON with the detection results:
  ```json
  {
    "vendor": "...",
    "method": "...",
    ...
  }
  ```

### Web Interface (Next.js + Tailwind)
- A page hosted on Vercel where users can enter the URL in a form.
- Sends the query to the internal REST API.
- Displays the results (detected vendor, detection method, and warnings).

## Vendor Database

- A TypeScript file, for instance `vendors.ts`, with the following structure:
  ```ts
  export const VENDORS = [
    {
      name: "ServiceNow",
      homepage: "https://www.servicenow.com",
      networkKey: "service-now.com",
      windowKey: "NOW"
    },
    // ... and so forth
  ];
  ```

## Technical Implementation

### Installation and Execution


    1. Clone the repository:
        ◦ git clone https://github.com/usuario/hybrid-chatbot-detector.git
        ◦ cd hybrid-chatbot-detector
    2. Install dependencies:
        ◦ npm install
    3. CLI Execution:
        ◦ npm run detect <URL>
        ◦ If <URL> is not provided, the application will display an introduction and wait for the user to type the URL.

    4. Local Deployment of Next.js (API + Web):
            ▪ npm run dev
    5. Deployment on Vercel:
        ◦ Create an account on Vercel, connect the repository, and configure a project.
        ◦ Once you push to the main branch, Vercel automatically handles the deployment.

        ## Detection Logic Details

- **Detection via “windowKey”**  
  Simulate (using Puppeteer or similar) loading the site, and verify if `window[windowKey]` exists in the page context.

- **Detection via “networkKey”**  
  Intercept or log network calls to see if any URL includes the `networkKey` string.

- **Return data**:
  - `vendor`: the provider’s name or `null` if not detected.
  - `method`: `"window"`, `"network"`, `"both"`, or `"none"`.

---

## Possible Limitations and Warnings

- **Heuristic-based detection**: The chatbot could:
  - Hide its objects from `window`.
  - Redirect requests to private domains.
  - Use a CDN that does not expose the real domain (e.g., `cloudfront.net`).
- Our **predefined vendors** might become outdated if the market evolves.
- There is a **margin of error**: we suggest manual inspection of scripts, the DOM, etc.

---

## Conclusions

This report proposes an **automated method** to identify the provider of a chatbot on a website using a **double-check system** by:

- Detecting global objects in `window`.
- Inspecting network domains in traffic.

The goal of this tool is to **streamline the manual inspection** process for vendor detection, and initial results seem promising. Given the rapidly changing nature and large variety of chatbot integrations, it is impossible to cover them all, but at least the most popular ones are included.

---

## Glossary

- **Chatbot**: A program that simulates conversation with users through text or voice.  
- **Vendor**: A company or platform that provides specific software or services.  
- **CLI (Command Line Interface)**: A text-based interface for executing actions.  
- **REST API**: An interface that exposes resources via HTTP/HTTPS, following REST principles.  
- **Next.js**: A React framework for web applications and server-side rendered APIs.  
- **Node.js**: A JavaScript runtime environment on the server side.  
- **Tailwind**: A utility-oriented CSS framework.  
- **Vercel**: A hosting platform specialized in frontend projects that supports Next.js.  
- **CDN**: A content delivery network for hosting static assets (images, JS, etc.).

---

## References

- Traubinger, V., & Gaedke, M. (2021). *Interaction Design Patterns of Web Chatbots*.