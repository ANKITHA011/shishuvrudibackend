const translations = {
  en: {
    appName: "Shishu Vriddhi",
    chatWithDoctor: "Chat with Doctor",
    signedInAs: "Signed in as",
    home: "Home",
    childInfo: "Child Info",
    milestone: "Milestone",
    cgm: "CGM",
    signOut: "Sign Out",
    childName: "Child Name",
    age: "Age",
    gender: "Gender",
    system: "System",
    send: "Send",
    startRecording: "Start recording",
    doctorWelcome: (doctorName, childName) =>
      `Hello, I'm ${doctorName}. How can I help you regarding ${childName}?`,
    askDoctorPlaceholder: (doctorName) =>
      `Ask ${doctorName} a question...`,
  },

  kn: {
    appName: "ಶಿಶು ವೃದ್ಧಿ",
    chatWithDoctor: "ಡಾಕ್ಟರ್ ಜೊತೆ ಚಾಟ್",
    signedInAs: "ನಿಮ್ಮ ಖಾತೆ:",
    home: "ಮುಖಪುಟ",
    childInfo: "ಮಕ್ಕಳ ವಿವರಗಳು",
    milestone: "ಮೈಲ್ಸ್ಟೋನ್",
    cgm: "ಶರೀರಾಂಶ",
    signOut: "ಸೈನ್ ಔಟ್",
    childName: "ಮಕ್ಕಳ ಹೆಸರು",
    age: "ವಯಸ್ಸು",
    gender: "ಲಿಂಗ",
    system: "ಸಿಸ್ಟಮ್",
    send: "ಕಳುಹಿಸಿ",
    startRecording: "ಧ್ವನಿ ದಾಖಲಾತಿ ಪ್ರಾರಂಭಿಸಿ",
    doctorWelcome: (doctorName, childName) =>
      `ನಮಸ್ಕಾರ, ನಾನು ${doctorName}. ನಾನು ${childName} ಕುರಿತು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?`,
    askDoctorPlaceholder: (doctorName) =>
      `${doctorName} ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ...`,
  },

  hi: {
    appName: "शिशु वृद्धि",
    chatWithDoctor: "डॉक्टर से बात करें",
    signedInAs: "के रूप में साइन इन",
    home: "होम",
    childInfo: "बच्चे की जानकारी",
    milestone: "मील का पत्थर",
    cgm: "सीजीएम",
    signOut: "साइन आउट",
    childName: "बच्चे का नाम",
    age: "उम्र",
    gender: "लिंग",
    system: "सिस्टम",
    send: "भेजें",
    startRecording: "रिकॉर्डिंग शुरू करें",
    doctorWelcome: (doctorName, childName) =>
      `नमस्ते, मैं ${doctorName} हूं। मैं ${childName} के बारे में आपकी कैसे मदद कर सकता हूँ?`,
    askDoctorPlaceholder: (doctorName) =>
      `${doctorName} से कोई सवाल पूछें...`,
  },
};

export default translations;
