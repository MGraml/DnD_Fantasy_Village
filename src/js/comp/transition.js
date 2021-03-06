import {Database} from "./database.js"


//These lines take care of the switching between the windows by arrows at the bottom or button clicks on the top
function show(elem,list) {
    let snd = document.getElementById("booksound");
    snd.play();
    list.forEach(e => e.classList.add("hidden"));
    document.querySelector("#"+elem).classList.remove("hidden")
}
function getUnhidden(tbls) {
    let counter = 0, res = 0;
    tbls.forEach(tbl => {
        if (Array.from(tbl.classList).includes("hidden")===false) {res = counter};
        counter += 1
    })
    return res;
};

if (localStorage["mutecounter"] === undefined) {
    localStorage["mutecounter"] = 0;
};
//Switch between different stages of volume
function unmute(counter,targ) {
    document.querySelectorAll("audio").forEach(el => {
        if (counter%3 === 1){
            el.muted = true;
            targ.value = "🕩";
            el.pause();
            el.currentTime = 0;
        }
        else if (counter%3 === 2){
            el.muted = false
            el.volume = 0.1;
            targ.value = "🕪"
        }
        else {
            el.muted = false;
            el.volume = 1;
            targ.value = "🕨";
        };
        
    });
    
};

//Engages Volume button
let volbtn = document.getElementById("mutebtn");
volbtn.addEventListener("click",(item)=>{
    localStorage["mutecounter"] = localStorage["mutecounter"]*1+1;
    unmute(localStorage["mutecounter"]*1,item.target);
});
//Keeping mutecounter in local storage
window.addEventListener("load", item => {
    unmute(localStorage["mutecounter"]*1,volbtn);
});



let btns_top = Array.from(document.querySelectorAll(".controls > button")),
    tbls = Array.from(document.querySelectorAll(".menu > .grid5"));
    
document.querySelector(".previous").addEventListener("click", () => switchWindows(2));
document.querySelector(".next").addEventListener("click", () => switchWindows(1));
btns_top.forEach(btn => btn.addEventListener("click", ()=> show(btn.dataset.table,tbls)));


//This section allows us to call the settings and back ONLY IF a json file is loaded

document.querySelector("#reset").addEventListener("click", (btn) => { switchSettings(btn.target); });

//Subfunction for switching settings and back
function switchSettings(targ) {
    let menus = Array.from(document.querySelectorAll(".menu"));
    let ldfst = document.getElementById("loadfirst");
    if (ldfst.className === "hidden"){
        if (targ.innerHTML==="Settings") {
            targ.innerHTML="Back";
            show("settings",menus);
        } else if (targ.innerHTML==="Back") {
            targ.innerHTML="Settings";
            show("default",menus);
        }
    };
};

//subfunction for switching between windows
function switchWindows(offset) {
    let total_number = Array.from(document.querySelector(".controls").querySelectorAll("button")).length;
    if (offset < 0) {
        offset = total_number+offset;
    };
    show(btns_top[(getUnhidden(tbls)+offset)%total_number].dataset.table,tbls);
}

//subfunction for Manual
function manualCall() {
    document.createElement("a").href = window.open('./src/manual.html','manual','height=700,width=500')
};

//Initializes the moon and sun functionality
document.querySelector("#primary").addEventListener("click", () => DataAs.weekPassed());
document.querySelector("#secondary").addEventListener("click", () => { manualCall(); });



//Include keyboard
document.onkeydown = function(e) {e.repeat ? {} : ( keyPressed(e))};
function keyPressed(e) {
    if (e.ctrlKey  && e.keyCode == 83) {    //Speichern via STRG + S
        e.preventDefault();
        DataAs.saveDB();
    };
    if (e.ctrlKey  && e.keyCode == 76) {    //Laden via STRG + L
        e.preventDefault();
        document.getElementById('load').click();
    };
    if (e.ctrlKey && e.keyCode == 77) {     //Toggle Messenger and contacts
        e.preventDefault();
        messenger_and_contact_toggle();
    };
    if (e.ctrlKey && e.keyCode == 80) {     //Toggle Protocol
        e.preventDefault();
        showDrags(document.getElementById("protocol_dragdiv"));
    };
    if (e.ctrlKey && e.keyCode == 67) {     //Toggle Calendar
        e.preventDefault();
        showDrags(document.getElementById("calendar_dragdiv"));
    };
    if (e.ctrlKey && e.keyCode == 13) {     //Pass a week
        e.preventDefault();
        DataAs.weekPassed();
    };
    switch(e.which) {
        case 37: // left
        switchWindows(-1);
        return;

        case 39: // right
        switchWindows(1);
        return;

        case 112: // F1
        manualCall();
        break;

        case 27: // ESC
        switchSettings(document.querySelector("#reset"));
        break;

        case 38: // Up
        counter -= 1;
        unmute(counter,volbtn);
        break;

        case 40: //Down
        counter += 1;
        unmute(counter,volbtn);
        break;

        default: return; // Andere Tasten
    }
    e.preventDefault(); // Sperrt Standardaktion (zB Hilfe bei F1)
};

//For draggable boxes
export function showDrags(elem) {
    if (Array.from(elem.classList).includes("hidden") > 0){
        elem.classList.remove("hidden");
    }
    else {
        elem.classList.add("hidden");
    };
};

//Initializes messenger button, such that it toggles contacts together with messenger window
function messenger_and_contact_toggle() {
    let contactdiv = document.getElementById("contacts"),
            message_dragdiv = document.getElementById("message_dragdiv");
        showDrags(message_dragdiv);
        if (message_dragdiv.className.includes("hidden")) {
            contactdiv.classList.add("hidden");
        }
        else {
            contactdiv.classList.remove("hidden");
        };
};

document.getElementById("message").addEventListener("click", () => {messenger_and_contact_toggle()});
document.getElementById("protocol_button").addEventListener("click", () => {showDrags(document.getElementById("protocol_dragdiv"))});
document.getElementById("calendar_button").addEventListener("click", () => {showDrags(document.getElementById("calendar_dragdiv"))});
document.getElementById("phonebook").addEventListener("click", () => {showDrags(document.getElementById("contacts"))});

// Make the DIV element draggable:
dragElement(document.getElementById("protocol_dragdiv"));
dragElement(document.getElementById("message_dragdiv"));
dragElement(document.getElementById("contacts"));
dragElement(document.getElementById("calendar_dragdiv"));

export function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  };

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  };

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  };

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  };
};



let DataAs = new Database();