const socket = io();

// Elements
const $chatInput = document.querySelector("#chat-message");
const $chatForm = document.querySelector("#chat-form")
const $chatButton = document.querySelector("#chat-button")
const $locationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");
const $sidebar = document.querySelector("#sidebar");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML
const locationTemplate = document.querySelector("#location-template").innerHTML
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
  // new message element
  const $newMessage = $messages.lastElementChild;

  // height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
  
  // visible height
  const visibleHeight = $messages.offsetHeight;
  
  // container height
  const containerHeight = $messages.scrollHeight;

  // how far has the user scrolled?
  const scrollOffset = $messages.scrollTop + visibleHeight;
  
  if(containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (message) => {
  const html = Mustache.render(messageTemplate, { 
    createdAt: moment(message.createdAt).format("h:mm A"), 
    username: message.username,
    message: message.text 
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

socket.on("locationMessage", (locationUrl) => {
  const html = Mustache.render(locationTemplate, {
    createdAt: moment(locationUrl.createdAt).format("h:mm A"), 
    username: locationUrl.username,
    locationUrl: locationUrl.text });
  $messages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, { room, users });
  $sidebar.innerHTML = html;
});


$chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  $chatButton.setAttribute("disabled", "disabled");
  const message = $chatInput.value;

  socket.emit("sendMessage", message, (error) => {
    if(error) {
      return console.log("error", error);
    }
    $chatButton.removeAttribute("disabled");
    $chatInput.value = "";
    $chatInput.focus();
  });
});


$locationButton.addEventListener("click", (e) => {
  if(!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser");
  }
  $locationButton.setAttribute("disabled", "disabled");
  
  navigator.geolocation.getCurrentPosition((position) => {
    const coords = position.coords;
    socket.emit("sendLocation", {latitude: coords.latitude, longitude: coords.longitude}, () => {
      $locationButton.removeAttribute("disabled");
    });
  });
});

socket.emit('join', { username, room }, (error) => {
  if(error) {
    alert(error);
    location.href = '/'
  }
});
