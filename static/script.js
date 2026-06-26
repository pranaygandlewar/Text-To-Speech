async function generateSpeech() {

    const text = document.getElementById("text").value;
    const language = document.getElementById("language").value;

    const loader = document.getElementById("loader");

    loader.style.display = "block";

    try{

        const response = await fetch("/generate", {

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({
                text,
                language
            })

        });

        const data = await response.json();

        loader.style.display = "none";

        const audioPlayer =
        document.getElementById("audioPlayer");

        audioPlayer.src =
        data.audio_url + "?t=" + new Date().getTime();

        audioPlayer.play();

        const downloadBtn =
        document.getElementById("downloadBtn");

        downloadBtn.href = data.audio_url;

    }

    catch(error){

        loader.style.display = "none";

        alert("Invalid details !");

        console.log(error);

    }

}
/* CUSTOM DROPDOWN */

function toggleDropdown(){

    document
    .getElementById("customSelect")
    .classList
    .toggle("active");
}

function selectLanguage(value,text){

    document
    .getElementById("language")
    .value = value;

    document
    .getElementById("selectedText")
    .innerText = text;

    document
    .getElementById("customSelect")
    .classList
    .remove("active");
}

/* CLOSE ON OUTSIDE CLICK */

window.addEventListener("click", function(e){

    const select =
    document.getElementById("customSelect");

    if(!select.contains(e.target)){
``
        select.classList.remove("active");
    }

});
/* AUDIO PLAYER */

const audio =
document.getElementById("audioPlayer");

const playBtn =
document.getElementById("playBtn");

const progressBar =
document.getElementById("progressBar");

const currentTimeEl =
document.getElementById("currentTime");

const durationEl =
document.getElementById("duration");

const progressArea =
document.querySelector(".progress-area");

/* PLAY / PAUSE */

playBtn.addEventListener("click", () => {

    if(audio.paused){

        audio.play();

        playBtn.innerHTML = "❚❚";

        animateProgress();
    }

    else{

        audio.pause();

        playBtn.innerHTML = "▶";
    }

});

/* SMOOTH PROGRESS ANIMATION */

function animateProgress(){

    if(!audio.paused){

        const progress =
        (audio.currentTime / audio.duration) * 100;

        progressBar.style.width =
        progress + "%";

        currentTimeEl.innerText =
        formatTime(audio.currentTime);

        durationEl.innerText =
        formatTime(audio.duration);

        requestAnimationFrame(animateProgress);
    }
}

/* CLICK TO SEEK */

progressArea.addEventListener("click", (e) => {

    const width =
    progressArea.clientWidth;

    const clickX =
    e.offsetX;

    const duration =
    audio.duration;

    audio.currentTime =
    (clickX / width) * duration;
});

/* AUDIO ENDED */

audio.addEventListener("ended", () => {

    playBtn.innerHTML = "▶";

    progressBar.style.width = "0%";
});

/* LOAD DURATION */

audio.addEventListener("loadedmetadata", () => {

    durationEl.innerText =
    formatTime(audio.duration);
});

/* FORMAT TIME */

function formatTime(time){

    if(isNaN(time)) return "0:00";

    const mins =
    Math.floor(time / 60);

    const secs =
    Math.floor(time % 60);

    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
function loadPrompt(type){

    const textarea =
    document.getElementById("text");

    const language =
    document.getElementById("language").value;

    const prompts = {

        eng:{

            demo:
`Hello everyone.

This project demonstrates an AI-powered Text-to-Speech system.

The application converts written text into natural human-like speech using neural voice synthesis.

Users can select a language, enter text, and instantly generate audio output.

Thank you for listening.`,

            presentation:
`Artificial Intelligence is transforming the world.

AI enables machines to learn, reason, and make decisions.

Today, AI is widely used in healthcare, finance, education, and transportation.`,

            support:
`Welcome to NeuroVoice AI.

Your request has been received successfully.

Our system is currently processing your input.

Please wait while we generate your audio response.`,

            education:
`Photosynthesis is the process by which green plants convert sunlight into chemical energy.

This process is essential for life on Earth because it produces oxygen and food.`
        },

        hin:{

            demo:
`नमस्कार।

यह परियोजना कृत्रिम बुद्धिमत्ता आधारित टेक्स्ट-टू-स्पीच प्रणाली का प्रदर्शन करती है।

यह एप्लिकेशन लिखित पाठ को प्राकृतिक मानव जैसी आवाज़ में परिवर्तित करता है।

उपयोगकर्ता भाषा का चयन करके तुरंत ऑडियो उत्पन्न कर सकते हैं।

धन्यवाद।`,

            presentation:
`कृत्रिम बुद्धिमत्ता दुनिया को बदल रही है।

एआई मशीनों को सीखने, सोचने और निर्णय लेने में सक्षम बनाती है।

आज एआई का उपयोग स्वास्थ्य, शिक्षा, वित्त और परिवहन में किया जा रहा है।`,

            support:
`न्यूरोवॉइस एआई में आपका स्वागत है।

आपका अनुरोध सफलतापूर्वक प्राप्त हो गया है।

हमारी प्रणाली आपके इनपुट को संसाधित कर रही है।

कृपया कुछ क्षण प्रतीक्षा करें।`,

            education:
`प्रकाश संश्लेषण वह प्रक्रिया है जिसके द्वारा हरे पौधे सूर्य के प्रकाश को रासायनिक ऊर्जा में परिवर्तित करते हैं।

यह प्रक्रिया पृथ्वी पर जीवन के लिए अत्यंत महत्वपूर्ण है।`
        }
    };

    textarea.value =
    prompts[language][type];

    textarea.focus();

    textarea.scrollIntoView({

        behavior:"smooth",

        block:"center"
    });
    textarea.classList.add(
    "active-prompt"
);

setTimeout(() => {

    textarea.classList.remove(
        "active-prompt"
    );

}, 1500);
}
function updateExamples(){

    const language =
    document.getElementById("language").value;

    const cards =
    document.querySelectorAll(".prompt-card");

    if(language === "hin"){

        cards[0].querySelector("h3").innerText =
        "प्रोजेक्ट डेमो";

        cards[0].querySelector("p").innerText =
        "कॉलेज प्रोजेक्ट और विवा प्रदर्शन के लिए।";



        cards[1].querySelector("h3").innerText =
        "एआई प्रस्तुति";

        cards[1].querySelector("p").innerText =
        "कृत्रिम बुद्धिमत्ता की पेशेवर प्रस्तुति।";



        cards[2].querySelector("h3").innerText =
        "ग्राहक सहायता";

        cards[2].querySelector("p").innerText =
        "स्वचालित ग्राहक सेवा प्रतिक्रियाएँ।";



        cards[3].querySelector("h3").innerText =
        "शैक्षिक सामग्री";

        cards[3].querySelector("p").innerText =
        "सीखने और शिक्षण से संबंधित उदाहरण।";
    }

    else{

        cards[0].querySelector("h3").innerText =
        "Project Demo";

        cards[0].querySelector("p").innerText =
        "Perfect for college projects and viva demonstrations.";



        cards[1].querySelector("h3").innerText =
        "AI Presentation";

        cards[1].querySelector("p").innerText =
        "Explain Artificial Intelligence professionally.";



        cards[2].querySelector("h3").innerText =
        "Customer Support";

        cards[2].querySelector("p").innerText =
        "Generate automated customer responses.";



        cards[3].querySelector("h3").innerText =
        "Education";

        cards[3].querySelector("p").innerText =
        "Convert educational content into speech.";
    }
}
function selectLanguage(value,text){

    document
    .getElementById("language")
    .value = value;

    document
    .getElementById("selectedText")
    .innerText = text;

    document
    .getElementById("customSelect")
    .classList
    .remove("active");

    updateExamples();
}
updateExamples();