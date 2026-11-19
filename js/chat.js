import { db, profileImages } from "./db.js"
import { state } from "./state.js"  
import { els } from "./elements.js"
import { getProfileById } from "./helper.js"
import { handleRecieveUpdate } from "./liveupdates.js"

export async function subscribeToClassChat(classId){
  if(state.currentChatChannel){
    console.log("Leaving previous chat channel")
    await db.removeChannel(state.currentChatChannel)
    state.currentChatChannel = null
  }

  state.currentChatChannel = db.channel(`class-chat-${classId}`)

  state.currentChatChannel
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}`}, (payload) => {handleRecieveMessage(payload.new)})
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}`}, (payload) => {handleEditMessage(payload.new)})
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_updates', filter: `user_id=eq.${state.currentUserId}`}, (payload) => {handleRecieveUpdate(payload.new)})
  .subscribe()
}

export async function loadPastMessages(classId){
  const {data: messages, error} = await db.from("messages").select().eq("class_id", classId)

  if (error){
    console.error("Failed to load messages: " + error.message)
    return
  }
  els.messageContainer.innerHTML = messages.map(msg => {
    let profile = getProfileById(msg.user_id) || {}
    return `
    <div class = "message">
      <img src = "${profileImages[profile.profile_img] ? profileImages[profile.profile_img] : "assets/default-pfps/deleted.svg"}" class = "pfp${msg.user_id == state.currentUserId ? " user-pfp":""}">
      <div class = "message-content" data-userId = ${msg.user_id}>
        <span class = "username${msg.user_id == state.currentUserId ? " user-username":""}">${profile.username ? profile.username : "[deleted]"}</span>
        <p class = "message-text">${msg.text}</p>
      </div>
    </div>
    `
  }).join("")
  els.messageContainer.scrollTop = els.messageContainer.scrollHeight
}

async function handleRecieveMessage(message){
  let senderProfile = getProfileById(message.user_id)

  if (!senderProfile){
    const { data, error } = await db.from("profiles").select().eq("user_id", message.user_id).single()
    if (error) console.error("Failed to load profile: " + error.message)
    if(data){
      state.profileCache.push(data)
      senderProfile = data
    } else {
      senderProfile = {username: "Unknown", profile_img: "grey"}
    }
  }

  let scrollBottom = els.messageContainer.scrollTop + els.messageContainer.clientHeight >= els.messageContainer.scrollHeight - 5;

  const newMessageDiv = document.createElement("div")
  newMessageDiv.classList.add("message-content")

  const messageDiv = document.createElement("div")
  messageDiv.classList.add("message")

  const usernameSpan = document.createElement("span")
  usernameSpan.className = `username${message.user_id == state.currentUserId ? " user-username":""}`
  usernameSpan.textContent = senderProfile.username

  const textP = document.createElement("p")
  textP.textContent = message.text
  textP.classList.add("message-text")

  const pfpImg = document.createElement("img")
  pfpImg.src = profileImages[senderProfile.profile_img]
  pfpImg.className = `pfp${message.user_id == state.currentUserId ? " user-pfp":""}`

  newMessageDiv.appendChild(usernameSpan)
  newMessageDiv.appendChild(textP)

  messageDiv.appendChild(pfpImg)
  messageDiv.appendChild(newMessageDiv)

  els.messageContainer.appendChild(messageDiv)

  if (scrollBottom){
    els.messageContainer.scrollTop = els.messageContainer.scrollHeight
  }
}


function handleEditMessage(message){
  console.log("Recived edit of message: ", message)
}



//Adds a message to the messages table in supabase
//Will not allow users to send messages to classes they are not in
export async function sendMessage(message, classId){
  const { error } = await db.from("messages").insert({user_id: state.currentUserId, class_id: classId, text: message})
  if (error){
    console.error("Failed to send message: " + error.message)
    return[]
  }
}

export async function editMessage(messageId, updatedText){
  const { data, error } = await db.from("messages").update({text: updatedText}).eq("message_id", messageId).select()
  if (error){
    console.error("Failed to edit message: " + error.message)
    return
  }

  if (!data || data.length == 0){
    console.error("Failed to update any rows due to RLS violation or incorrect/nonexistent message id")
    return
  }
  console.log("Edited message suscessfully")
}