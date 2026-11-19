import { state } from "./state.js"
import { profileImages } from "./db.js"
import { els } from "./elements.js"
import { isValidUsername } from "./helper.js"
import { sendMessage } from "./chat.js"
import { updateUsername, updatePfp } from "./profile.js"
import { loadClass, createClass, joinClass, deleteClass } from "./classes.js"
import { addAssignment } from "./assignments.js"

els.textInput.addEventListener("submit", async (e) => {
  e.preventDefault()

  if(els.messageInput.value.length==0){
    return
  }
  await sendMessage(els.messageInput.value, state.currentClass)
  els.messageInput.value = ""
})

els.joinClassSidebar.addEventListener("click", () => {
  els.joinClassCard.style = "display:flex"
})

els.createClassSidebar.addEventListener("click", () => {
  els.createClassCard.style = "display:flex"
})

els.joinClassCard.addEventListener("click", (event) => {
  if (event.target == els.joinClassCard){
    els.joinClassCard.style = "display: none"
  }
})

els.createClassCard.addEventListener("click", (event) => {
  if (event.target == els.createClassCard){
    els.createClassCard.style = "display: none"
  }
})

els.joinClassForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(await joinClass(els.joinClassCode.value)){
    els.joinClassCode.value = "";
    els.joinClassCard.style.display ="none"
    return
  }

  console.error("Error joining class")
});

els.createClassForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(await createClass(els.newClassName.value, els.newClassSubject.value)){
    els.newClassSubject.value = "";
    els.newClassName.value = "";
    els.createClassCard.style.display = "none"
    return
  }

  console.error("Error creating class")
});

els.createAssignmentSidebar.addEventListener("click", () => {
  els.createAssignmentCard.style = "display: flex; flex-direction: column; allign-items: center;"
})

els.createAssignmentCard.addEventListener("click", (event) => {
  if (event.target == els.createAssignmentCard){
    els.createAssignmentCard.style = "display: none"
  }
})

els.infoButton.addEventListener("click", () => {
  els.infoCard.style = "display:flex"
})

els.infoCard.addEventListener("click", (event) => {
  if (event.target == els.infoCard){
    els.infoCard.style = "display: none"
  }
})

els.accountSetupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if(!isValidUsername(els.usernameInput.value)){
    return
  }
  const newUsername = els.usernameInput.value
  const newProfileImg = document.querySelector('input[name="profile_img"]:checked').value
  updateUsername(newUsername)
  updatePfp(newProfileImg)

  els.userOnboardingCard.style = "display:none"

  if (state.currentUserProfile) {
    state.currentUserProfile.username = newUsername
    state.currentUserProfile.profile_img = newProfileImg
  }

  const cachedProfile = state.profileCache.find(p => p.user_id == state.currentUserId);
  if (cachedProfile) {
    cachedProfile.username = newUsername;
    cachedProfile.profile_img = newProfileImg;
  }

  document.querySelectorAll(".user-pfp").forEach((profilePic) => {
    profilePic.src = profileImages[state.currentUserProfile.profile_img]
  })
  document.querySelectorAll(".user-username").forEach((userUsername) => {
    userUsername.textContent = state.currentUserProfile.username
  })

  els.cardImg.src = profileImages[newProfileImg]
});

els.userOnboardingCard.addEventListener("click", (event) => {
  if (event.target == els.userOnboardingCard && state.currentUserProfile.username){
    els.userOnboardingCard.style = "display: none"
  }
})

els.profileButton.addEventListener("click", () => {
  els.usernameInput.value = state.currentUserProfile.username
  const currentColor = document.querySelector(`input[name="profile_img"][value="${state.currentUserProfile.profile_img}"]`);
  if (currentColor) {
      currentColor.checked = true;
  }
  els.userOnboardingCard.style = "display:flex"
})

els.createAssignmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(els.classDropdown.value == ""){
    return
  }

  if (await addAssignment(els.classDropdown.value, els.assignmentName.value, els.assignmentDescripton.value, els.newDueDate.value)){
    els.classDropdown.value = ""
    els.assignmentName.value = ""
    els.assignmentDescripton.value = ""
    els.newDueDate.value = ""
    els.createAssignmentCard.style.display = "none"
    return
  }

  console.error("Error creating assignment")
});

els.classListContainer.addEventListener("click", (event) => {
  const li = event.target.closest("li")
  if (!li) return

  if(li.classList.contains("active")){
    li.classList.remove("active")
    loadClass(null)
    return
  }

  els.classListContainer.querySelectorAll("li").forEach(item => {
    item.classList.remove("active");
  });

  li.classList.add("active")

  const classId = li.dataset.id

  loadClass(classId)
})