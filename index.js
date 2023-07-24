import { Configuration, OpenAIApi } from "openai";
import { process } from "./env";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, get } from "firebase/database"; //not install firebase

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const appSettings = {
  databaseURL:
    "https://console.firebase.google.com/project/knowitall-openai-6cd05/database/knowitall-openai-6cd05-default-rtdb/data/~2F",
};
const app = initializeApp(appSettings);

const database = getDatabase(app);

const conversationInDb = ref(database);

const chatbotConversation = document.getElementById("chatbot-conversation");
const instructionObj = {
  //Conversation Array - instructions setup - two key value pairs = role and content
  role: "system", //This should correspond to the value 'user'.
  content: "You are an assistant that gives very short answers.", //this should correspond to a string holding whatever the user has inputted.
  //And control the chatbot's personality
};

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  push(conversationInDb, {
    //User's input
    role: "user",
    content: userInput.value,
  });
  fetchReply();
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function fetchReply() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      const conversationArr = Object.values(snapshot.val());
      conversationArr.unshift(instructionObj);
      const response = await openai.createChatCompletion({
        //create chat completion
        model: "gpt-4",
        messages: conversationArr,
        presence_penalty: 0,
        frequency_penalty: 0.3,
      });
      push(conversationInDb, response.data.choices[0].message);
      renderTypewriterText(response.data.choices[0].message.content);
    } else {
      console.log("No data available");
    }
  });
}

function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);
  let i = 0;
  const interval = setInterval(() => {
    newSpeechBubble.textContent += text.slice(i - 1, i);
    if (text.length === i) {
      clearInterval(interval);
      newSpeechBubble.classList.remove("blinking-cursor");
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
  }, 50);
}

function renderConversationFromDb() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach((dbObj) => {
        const newSpeechBubble = document.createElement("div");
        newSpeechBubble.classList.add(
          "speech",
          `speech-${dbObj.role === "user" ? "human" : "ai"}`
        );
        chatbotConversation.appendChild(newSpeechBubble);
        newSpeechBubble.textContent = dbObj.content;
      });
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    }
  });
}

renderConversationFromDb();
