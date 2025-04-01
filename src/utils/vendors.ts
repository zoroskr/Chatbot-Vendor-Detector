/**
 * List of chatbot vendors.
 * Each vendor has a name, its website, a network traffic keyword, and a window object.
 * To add a new vendor, just add it to the vendors array at the end with the same format as the existing vendors.
 */
export const vendors = [

  {
    name: "Tidio",
    website: "https://www.tidio.com/",
    networkKeyword: "tidio.com",
    windowObject: "tidioChatApi",
  },
  {
    name: "LiveChat",
    website: "https://www.LiveChat.com/",
    networkKeyword: "livechatinc.com",
    windowObject: "LC_API",
  },
  {
    name: "HubSpot",
    website: "https://www.hubspot.com/",
    networkKeyword: "hubspot.com",
    windowObject: "_hsq",
  },
  {
    name: "ChatBot.com",
    website: "https://www.chatbot.com/",
    networkKeyword: "cloudfront.net/chatbot",
    windowObject: "__chatbot",
  },
  {
    name: "Trengo",
    website: "https://trengo.com/",
    networkKeyword: "trengo.eu",
    windowObject: "Trengo",
  },
  {
    name: "Verloop",
    website: "https://www.verloop.io/",
    networkKeyword: "verloop.io",
    windowObject: "Verloop",
  },
  {
    name: "kommunicate",
    website: "https://www.kommunicate.io/",
    networkKeyword: "kommunicate.io",
    windowObject: "kommunicate",
  },
  /* Add new vendors here. Example:
   {
     name: "Example",
     website: "https://example.com/",
     networkKeyword: "example.com",
     windowObject: "example",
  },*/
];
