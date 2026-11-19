import { db } from "./db.js"
import { state } from "./state.js"  
import { els } from "./elements.js"
import { loadClassList, loadClass } from "./classes.js"
import { loadUserProfile } from "./profile.js"
import "./auth.js"
import "./ui.js"

db.auth.onAuthStateChange(async (events, session) => {
  state.currentUserId = session?.user?.id || null
  if(session){
    loadUserProfile()
    els.authScreen.style.display = "none"
    els.appScreen.style.display = "flex"
    console.log("Logged in as: " + session.user.email)
    loadClassList()
    await loadClass(state.currentClass)
    els.classListContainer.querySelectorAll("li").forEach(item => {
      if(item.dataset.id == state.currentClass){
        item.classList.add("active")
      }
    });
  } else {
    state.currentUserProfile = null
    els.authScreen.style.display = "flex"
    els.appScreen.style.display = "none"
    if (state.currentChatChannel){
      db.removeChannel(state.currentChatChannel)
      state.currentChatChannel = null
    }
  }
})