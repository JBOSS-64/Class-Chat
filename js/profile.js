import { db, profileImages } from "./db.js"
import { state } from "./state.js"  
import { els } from "./elements.js"
import { pushLiveUpdate } from "./liveupdates.js"

export async function loadClassProfiles(classId){
  const { data, error } = await db.from("profiles").select("*, class_members!inner(*)").eq("class_members.class_id", classId)

  if (error){
    console.error("Failed to load profiles: " + error.message)
    return
  }

  state.profileCache = data
}

export async function loadUserProfile(){
  els.usernameInput.value = ''
  const { data, error } = await db.from("profiles").select().eq("user_id", state.currentUserId).single()

  if (error){
    console.error("Failed to load user profile: " + error.message)
    return
  }

  state.currentUserProfile = data
  document.querySelectorAll(".user-pfp").forEach((profilePic) => {
    profilePic.src = profileImages[state.currentUserProfile.profile_img]
  })
  document.querySelectorAll(".user-username").forEach((userUsername) => {
    userUsername.textContent = state.currentUserProfile.username
  })

  if(!state.currentUserProfile.username){
    els.userOnboardingCard.style = "display:flex"
  }
}

export async function updateUsername(updatedUsername){
  //Updates the username for the user id specified by the .eq()
  //RLS prevents users from updating a different user's profile
  const { error: updateUsernameError } = await db.from("profiles").update({username: updatedUsername}).eq("user_id", state.currentUserId)
  if (updateUsernameError){
    console.error("Failed to update username: " + updateUsernameError.message)
    return
  }
  pushLiveUpdate(state.currentClass, "username")
  console.log("Updated username sucsessfully")
}

export async function updatePfp(pfp){
  const { error } = await db.from("profiles").update({profile_img: pfp}).eq("user_id", state.currentUserId)

  if (error){
    console.error("Failed to update pfp: " + error.message)
    return
  }
  pushLiveUpdate(state.currentClass, "pfp")
}
