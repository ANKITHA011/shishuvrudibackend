const translations = {
    en: {
        appName: "Shishu Vriddhi",
        chatTitle: "CHAT WITH ME",
        signedInAs: "Sign in as",
        loading: "Loading...",
        loadingRegion: "Loading region...",
        loadingCountry: "Loading country...",
        expert: "Expert",
        parent: "Parent",
        welcomeBack: "Welcome back! Here's a quick summary of your previous conversation:",
        welcomeMessage: "Hello! Welcome to Shishu Vriddhi. I'm here to help you with questions about",
        development: "development",
        ageGenderMessage: (age, gender) => `As a ${age}-month-old ${gender}, there are many exciting milestones ahead.`,
        defaultWelcomeMessage: "Hello! Welcome to Shishu Vriddhi. I'm here to help you with questions about your child's development. How can I assist you today?",
        noHistory: "There is no previous chat history available for this child.",
        historyError: "⚠️ Failed to load chat history. Please try again later.",
        downloadPrompt: "In which format would you like to download the chat?",
        downloadPDF: "Download PDF",
        downloadTXT: "Download TXT",
        downloadJSON: "Download JSON",
        pdfDownloadSuccess: "Your chat history has been downloaded as a PDF.",
        pdfDownloadError: "Failed to generate PDF. Please try again later.",
        noChatHistory: "No chat history available.",
        downloadSuccess: (format) => `Your chat history has been downloaded as a ${format} file.`,
        home: "Home",
        childInfo: "Child Info",
        milestone: "Milestone",
        cgm: "CGM",
        chatHistory: "Chat History",
        signOut: "Sign Out",
        childName: "Child Name",
        age: "Age",
        downloadChat: "Download Chat",
        chatWithPediatrician: "Chat with Pediatrician",
        speak: "Speak",
        typing: "Typing",
        inputPlaceholder: "Ask a question about your child...",
        stopRecording: "Stop Recording",
        startRecording: "Start Recording",
        send: "Send",
        chatEnded: "Chat ended. You can restart a new session from the dashboard.",
        availablePediatricians: "Available Pediatricians",
        name: "Name",
        email: "Email",
        status: "Status",
        online: "Online",
        offline: "Offline",
        startChat: "Start Chat",
        noDoctorsAvailable: "No doctors available at the moment.",
        chatwithme:"CHAT WITH ME"
    },
    hi: {
        appName: "शिशु वृद्धि",
        chatTitle: "चैट करें",
        signedInAs: "साइन इन किया गया",
        loading: "लोड हो रहा है...",
        loadingRegion: "क्षेत्र लोड हो रहा है...",
        loadingCountry: "देश लोड हो रहा है...",
        expert: "विशेषज्ञ",
        parent: "अभिभावक",
        welcomeBack: "वापसी पर स्वागत है! यहाँ आपकी पिछली बातचीत का सारांश है:",
        welcomeMessage: "नमस्ते! शिशु वृद्धि में आपका स्वागत है। मैं आपके बच्चे के",
        development: "विकास",
        ageGenderMessage: (age, gender) => `एक ${age}-माह के ${gender === 'male' ? 'लड़के' : 'लड़की'} के रूप में, आगे कई रोमांचक पड़ाव हैं।`,
        defaultWelcomeMessage: "नमस्ते! शिशु वृद्धि में आपका स्वागत है। मैं आपके बच्चे के विकास के बारे में प्रश्नों में आपकी सहायता के लिए यहाँ हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?",
        noHistory: "इस बच्चे के लिए कोई पिछला चैट इतिहास उपलब्ध नहीं है।",
        historyError: "⚠️ चैट इतिहास लोड करने में विफल। कृपया बाद में पुनः प्रयास करें।",
        downloadPrompt: "आप चैट को किस प्रारूप में डाउनलोड करना चाहेंगे?",
        downloadPDF: "PDF डाउनलोड करें",
        downloadTXT: "TXT डाउनलोड करें",
        downloadJSON: "JSON डाउनलोड करें",
        pdfDownloadSuccess: "आपका चैट इतिहास PDF के रूप में डाउनलोड हो गया है।",
        pdfDownloadError: "PDF बनाने में विफल। कृपया बाद में पुनः प्रयास करें।",
        noChatHistory: "कोई चैट इतिहास उपलब्ध नहीं।",
        downloadSuccess: (format) => `आपका चैट इतिहास ${format} फ़ाइल के रूप में डाउनलोड हो गया है।`,
        home: "होम",
        childInfo: "बच्चे की जानकारी",
        milestone: "माइलस्टोन",
        cgm: "सीजीएम",
        chatHistory: "चैट इतिहास",
        signOut: "साइन आउट",
        childName: "बच्चे का नाम",
        age: "आयु",
        downloadChat: "चैट डाउनलोड करें",
        chatWithPediatrician: "बाल रोग विशेषज्ञ से चैट करें",
        speak: "बोलें",
        typing: "टाइप कर रहे हैं",
        inputPlaceholder: "अपने बच्चे के बारे में प्रश्न पूछें...",
        stopRecording: "रिकॉर्डिंग रोकें",
        startRecording: "रिकॉर्डिंग शुरू करें",
        send: "भेजें",
        chatEnded: "चैट समाप्त हुई। आप डैशबोर्ड से एक नया सत्र शुरू कर सकते हैं।",
        availablePediatricians: "उपलब्ध बाल रोग विशेषज्ञ",
        name: "नाम",
        email: "ईमेल",
        status: "स्थिति",
        online: "ऑनलाइन",
        offline: "ऑफ़लाइन",
        startChat: "चैट शुरू करें",
        noDoctorsAvailable: "फिलहाल कोई डॉक्टर उपलब्ध नहीं है।"
    },
    kn: {
        appName: "ಶಿಶು ವೃದ್ಧಿ",
        chatTitle: "ಚಾಟ್ ಮಾಡಿ",
        signedInAs: "ನಿಮ್ಮ ಖಾತೆ:",
        loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
        loadingRegion: "ಪ್ರದೇಶವನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
        loadingCountry: "ದೇಶವನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
        expert: "ತಜ್ಞ",
        parent: "ಪೋಷಕ",
        welcomeBack: "ಮತ್ತೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಹಿಂದಿನ ಸಂಭಾಷಣೆಯ ಚುಟುಕು ಸಾರಾಂಶ ಇಲ್ಲಿದೆ:",
        welcomeMessage: "ನಮಸ್ಕಾರ! ಶಿಶು ವೃದ್ಧಿಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಮಗುವಿನ",
        development: "ಅಭಿವೃದ್ಧಿ",
        ageGenderMessage: (age, gender) => `${age} ತಿಂಗಳ ${gender === 'male' ? 'ಗಂಡು' : 'ಹೆಣ್ಣು'} ಮಗುವಾಗಿ, ಮುಂದೆ ಅನೇಕ ರೋಚಕ ಘಟ್ಟಗಳಿವೆ.`,
        defaultWelcomeMessage: "ನಮಸ್ಕಾರ! ಶಿಶು ವೃದ್ಧಿಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಮಗುವಿನ ಅಭಿವೃದ್ಧಿಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಾನು ಸಹಾಯ ಮಾಡುವೆ. ನಾನು ಇವತ್ತು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        noHistory: "ಈ ಮಗುವಿಗೆ ಹಿಂದಿನ ಚಾಟ್ ಇತಿಹಾಸ ಲಭ್ಯವಿಲ್ಲ.",
        historyError: "⚠️ ಚಾಟ್ ಇತಿಹಾಸ ಲೋಡ್ ಮಾಡುವಲ್ಲಿ ವಿಫಲವಾಯಿತು. ದಯವಿಟ್ಟು ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        downloadPrompt: "ನೀವು ಚಾಟ್ ಅನ್ನು ಯಾವ ಫಾರ್ಮ್ಯಾಟ್‌ನಲ್ಲಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
        downloadPDF: "PDF ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
        downloadTXT: "TXT ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
        downloadJSON: "JSON ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
        pdfDownloadSuccess: "ನಿಮ್ಮ ಚಾಟ್ ಇತಿಹಾಸ PDF ಆಗಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಲಾಗಿದೆ.",
        pdfDownloadError: "PDF ತಯಾರಿಸುವಲ್ಲಿ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        noChatHistory: "ಚಾಟ್ ಇತಿಹಾಸ ಲಭ್ಯವಿಲ್ಲ.",
        downloadSuccess: (format) => `ನಿಮ್ಮ ಚಾಟ್ ಇತಿಹಾಸ ${format} ಫೈಲ್ ಆಗಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಲಾಗಿದೆ.`,
        home: "ಮುಖಪುಟ",
        childInfo: "ಮಕ್ಕಳ ವಿವರಗಳು",
        milestone: "ಮೈಲ್ಸ್ಟೋನ್",
        cgm: "ಶರೀರಾಂಶ",
        chatHistory: "ಚಾಟ್ ಇತಿಹಾಸ",
        signOut: "ಸೈನ್ ಔಟ್",
        childName: "ಮಗುವಿನ ಹೆಸರು",
        age: "ವಯಸ್ಸು",
        downloadChat: "ಚಾಟ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
        chatWithPediatrician: "ಮಕ್ಕಳ ತಜ್ಞರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ",
        speak: "ಮಾತನಾಡಿ",
        typing: "ಟೈಪಿಂಗ್ ಆಗುತ್ತಿದೆ",
        inputPlaceholder: "ನಿಮ್ಮ ಮಗುವಿನ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ...",
        stopRecording: "ರೆಕಾರ್ಡ್ ನಿಲ್ಲಿಸಿ",
        startRecording: "ರೆಕಾರ್ಡ್ ಪ್ರಾರಂಭಿಸಿ",
        send: "ಕಳುಹಿಸಿ",
        chatEnded: "ಚಾಟ್ ಮುಗಿದಿದೆ. ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಿಂದ ಹೊಸ ಅಧಿವೇಶನವನ್ನು ಪ್ರಾರಂಭಿಸಬಹುದು.",
        availablePediatricians: "ಲಭ್ಯವಿರುವ ಮಕ್ಕಳ ತಜ್ಞರು",
        name: "ಹೆಸರು",
        email: "ಇಮೇಲ್",
        status: "ಸ್ಥಿತಿ",
        online: "ಆನ್‌ಲೈನ್",
        offline: "ಆಫ್‌ಲೈನ್",
        startChat: "ಚಾಟ್ ಪ್ರಾರಂಭಿಸಿ",
        noDoctorsAvailable: "ಈಗ ಯಾವುದೇ ವೈದ್ಯರು ಲಭ್ಯವಿಲ್ಲ."
    }
};

export default translations;
