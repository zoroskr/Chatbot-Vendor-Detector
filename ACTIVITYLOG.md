# Activity Log  

1. The project guidelines were thoroughly analyzed, and the objectives were interpreted. It was concluded that the primary goal is to develop a script capable of determining whether a given URL contains a chatbot and identifying the vendor responsible for its development.  

2. We began by reviewing the provided materials, including reading the relevant article.  

3. Additionally, we analyzed the Excel file containing example cases and accessed [this page](https://customerservice.starbucks.com/sbux) to examine its HTML code, searching for references to chatbot providers. By analyzing the CSS classes assigned to chatbot elements, we identified the vendor (**ServiceNow**). However, we found this method inconsistent, as detecting vendors based solely on class names could lead to false positives. Consequently, we opted to inspect the imports present in the page's HTML header instead.  

4. We discovered the global object `window.NOW`, which is associated with **ServiceNow**. This finding suggests that identifying global objects and mapping them to known vendors could serve as a viable approach. This could be a secondary verification method, complementing what we hypothesize to be the primary approach: analyzing network requests to detect connections with domains of known chatbot vendors.  

5. For the second example in the dataset ([this page](https://www2.hm.com/en_us/customer-service.html)), identifying a chatbot vendor proved to be more challenging. By inspecting the page's source code, we found the term **"nance"** within lines of code referencing the chatbot. Additionally, we identified the global object `nuanceData` in the `window` object. Finally, by analyzing the network traffic, we confirmed that the chatbot provider is **Nuance**.  

6. Continuing with the dataset, we identified several new vendors, including **Trengo, Tidio, LivePerson Chat, Verloop, HubSpot, Zendesk, etc.**. We applied the same methodology—checking for global objects and inspecting network traffic. This dual approach appears to be a reliable method for accurately identifying chatbot vendors.  

7. Based on our research, we proceeded to develop the application.  
