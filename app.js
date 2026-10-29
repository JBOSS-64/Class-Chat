const { createClient } = supabase

// Create a single supabase client for interacting with your database
const db = createClient('https://vrnxohudtrcxmcngvhne.supabase.co', 'sb_publishable_Ogs__3UblsqCPwt8pRDe1A_5rmJvxvp')

//Auto login handling
let currentUserId = null;
let currentUserProfile = null;
let currentClass = localStorage.getItem("last-class") || null;

const profileImages = {
    "grey": "assets/default-pfps/grey.svg",
    "blue": "assets/default-pfps/blue.svg",
    "coral": "assets/default-pfps/coral.svg",
    "green": "assets/default-pfps/green.svg",
    "orange": "assets/default-pfps/orange.svg",
    "pink": "assets/default-pfps/pink.svg",
    "purple": "assets/default-pfps/purple.svg",
    "turquoise": "assets/default-pfps/turquoise.svg",
    "yellow": "assets/default-pfps/yellow.svg"
};


db.auth.onAuthStateChange(async (events, session) => {
  currentUserId = session?.user?.id || null
  if(session){
    loadUserProfile()
    authScreen.style.display = "none"
    appScreen.style.display = "flex"
    console.log("Logged in as: " + session.user.email)
    loadClassList()
    await loadClass(currentClass)
    classListContainer.querySelectorAll("li").forEach(item => {
      if(item.dataset.id == currentClass){
        item.classList.add("active")
      }
    });
  } else {
    authScreen.style.display = "flex"
    appScreen.style.display = "none"
    if (currentChatChannel){
      db.removeChannel(currentChatChannel)
      currentChatChannel = null
    }
  }
})

//LOGIN/SIGNUP

//Getting Elements
const authScreen = document.getElementById("auth-screen")
const appScreen = document.getElementById("app-screen")
const signUpButton = document.getElementById("sign-up-button")
const logInButton = document.getElementById("log-in-button")
const signUpDiv = document.getElementById("signup")
const logInDiv = document.getElementById("login")
const loginEmail = document.getElementById("email-log-in")
const loginPassword = document.getElementById("password-log-in")
const signUpEmail = document.getElementById("email-sign-up")
const signUpPassword = document.getElementById("password-sign-up")
const confirmPassword = document.getElementById("password-confirm")
const errorText = document.getElementById("error-text")
const loginForm = document.getElementById("login-form")
const signupForm = document.getElementById("signup-form")
let validPassword = false

//Event Listeners
signUpButton.addEventListener("click", () => {
  signUpDiv.style = "display: flex; flex-direction: column; allign-items: center;"
  logInDiv.style.display = "none"
})

logInButton.addEventListener("click", () => {
  logInDiv.style = "display: flex; flex-direction: column; allign-items: center;"
  signUpDiv.style.display = "none"
})

signUpPassword.addEventListener("input", () => {
  if(confirmPassword.value != signUpPassword.value){
    errorText.style = "display: flex; flex-direction: column; allign-items: center;"
  } else {
    errorText.style.display = "none"
  }
})

confirmPassword.addEventListener("input", () => {
  if(confirmPassword.value != signUpPassword.value){
    errorText.style = "display: flex; flex-direction: column; allign-items: center;"
    validPassword = false
  } else {
    errorText.style.display = "none"
    validPassword = true
  }
})

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = loginEmail.value
  const password = loginPassword.value

  if(signInWithEmail(email, password)){
    loginEmail.value = ""
    loginPassword.value = ""
    signUpEmail.value = ""
    signUpPassword.value = ""
  }
})

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  if(!validPassword){
    return
  }

  const email = signUpEmail.value
  const password = signUpPassword.value

  if(signUpNewUser(email, password)){
    loginEmail.value = ""
    loginPassword.value = ""
    signUpEmail.value = ""
    signUpPassword.value = ""
  }
})

async function signUpNewUser(authEmail, authPassword) {
  const { data, error } = await db.auth.signUp({
    email: authEmail,
    password: authPassword,/*
    options: {
      emailRedirectTo: 'https://example.com/welcome',
    },*/
  })
  if(error){
    alert("Sign up error: " + error.message)
  }
  return true
}

async function signInWithEmail(authEmail, authPassword) {
  const { data, error } = await db.auth.signInWithPassword({
    email: authEmail,
    password: authPassword,
  })
  if(error){
    alert("Sign in error: " + error.message)
  }
  return true
}

async function signOut() {
  await db.auth.signOut({ scope: 'local' })
  localStorage.removeItem("last-class")
  currentClass = null
  console.log("Signed out sucsessfully")
}

//DATA TABLE MANIPULATION FUNCTIONS


//Add a class to the classes table
async function createClass(className, classSubject){
  //Inserts a class to the classes table with the specified parameters
  //Returns the object added to the table to the classData object with the .select()
  //The .single() makes it a single object instead of having it nested so that stuff like classData.class_id will work
  const { data: classData, error: classError } = await db.from("classes").insert({creator_id: currentUserId, class_name: className, subject: classSubject}).select().single()
  if(classError){
    console.error("Failed to create class: " + classError.message)
    return
  }
  //Adds the creator of the class to the class
  const { error: addMemberError } = await db.from("class_members").insert({user_id: currentUserId, class_id: classData.class_id}) 
  if(addMemberError){
    console.error("Failed to add creator to class: " + addMemberError.message)
  }

  await loadClassList()
  loadClass(classData.class_id)
  console.log("Class was sucsessfully created")
  return true
}

async function deleteClass(classId){
  const { data, error } = await db.from("classes").delete().eq("class_id", classId).select()

  if (error){
    console.error("Failed to delete class: " + error.message)
    return
  }

  if (!data || data.length == 0){
    console.error("Failed to delete class due to RLS violation or non existent class")
    return
  }

  console.log(`Sucsessfully deleted class ${classId}`)
  await loadClassList()
  await loadClass(null)
}

//Adds a user to a class based on class id
async function joinClass(classId){
  const { error: joinError } = await db.from("class_members").insert({user_id: currentUserId, class_id: classId})

  if (joinError){
    console.error("Failed to join class: " + joinError.message)
    return
  }

  await loadClassList()
  loadClass(classId)
  console.log("Joined class sucsessfully")
  return true
}

//Adds an assignment to a specific class
//Supabase automatically adds the assignment to all users in that class
async function addAssignment(classId, assignmentTitle, assignmentDescripton, dueDate){
  const { error: addAssignmentError } = await db.from("assignments").insert({class_id: classId, title: assignmentTitle, due_date: new Date(dueDate).toISOString(), description: assignmentDescripton})

  if (addAssignmentError){
    console.error("Failed to add assignment: " + addAssignmentError.message)
    return
  }

  console.log("Added assignment sucsessfully")
  loadAssignmentList(currentClass)
  return true
}

//Updates the users username in the profile table
async function updateUsername(updatedUsername){
  //Updates the username for the user id specified by the .eq()
  //RLS prevents users from updating a different user's profile
  const { error: updateUsernameError } = await db.from("profiles").update({username: updatedUsername}).eq("user_id", currentUserId)
  if (updateUsernameError){
    console.error("Failed to update username: " + updateUsernameError.message)
    return
  }
  console.log("Updated username sucsessfully")
}

//Use this function to update all of the personal assignment details at once, likely when the user first enters the info
async function updatePersonalAssignment(assignmentId, updatedNotes, updatedTime, updatedCompletionStatus){
  await Promise.all([
    updatePersonalNotes(assignmentId, updatedNotes),
    updatePersonalEstimatedTime(assignmentId, updatedTime),
    updateIsComplete(assignmentId, updatedCompletionStatus)
  ])
}

//Updates the notes for an assignment
async function updatePersonalNotes(assignmentId, updatedNotes){
  const { error } = await db.from("user_assignments").update({notes: updatedNotes}).eq("assignment_id", assignmentId).eq("user_id", currentUserId)
  if (error){
    console.error("Failed to update notes: " + error.message)
    return
  }
  console.log("Updated notes sucsessfully")
}

//Updates the estimated time for an assignment
async function updatePersonalEstimatedTime(assignmentId, updatedTime){
  const { error } = await db.from("user_assignments").update({estimated_time: updatedTime}).eq("assignment_id", assignmentId).eq("user_id", currentUserId)
  if(error){
    console.error("Failed ot update estimated time: " + error.message)
    return
  }
  console.log("Updated estimated time sucsessfully")
}

//Updates whether or not the user has completed an assignment
async function updateIsComplete(assignmentId, updatedCompletionStatus){
  const { error } = await db.from("user_assignments").update({is_complete: updatedCompletionStatus}).eq("assignment_id", assignmentId).eq("user_id", currentUserId)
  if (error){
    console.error("Failed ot update completion status: " + error.message)
    return
  }
  console.log("Updated completion status sucsessfully")
}

//DATA TABLE VIEWING FUNCTIONS


//Gets the classes the user is enrolled in
//Returns class_id, class_name, created_at, creator_id, subject, as well as the class_members array which has user_id and class_id
async function getClasses(){
  const { data, error } = await db.from("classes").select("*, class_members(*)").eq("class_members.user_id", currentUserId)

  if (error){
    console.error("Failed to fetch classes: " + error.message)
    return []
  }
  console.log("Fetched classes sucsessfully")
  return data
}

async function getUserAssignments(){
  const { data: userAssignments, error: userError } = await db.from("user_assignments").select().eq("user_id", currentUserId)
  if (userError){
    console.error("Failed to fetch user assignments: " + error.message)
    return
  }

  const assignmentIds = userAssignments.map(item => item.assignment_id)

  const { data:assignmentData, error: assignmentError } = await db.from("assignments").select().in("assignment_id", assignmentIds)

  if (assignmentError){
    console.error("Failed to fetch assignment data: " + assignmentError.message)
    return
  }

  const assignmentMap = new Map()

  userAssignments.forEach(item => {
    assignmentMap.set(item.assignment_id, { ...item })
  })

  assignmentData.forEach(item =>{
    if(assignmentMap.has(item.assignment_id)){
      const existingItem = assignmentMap.get(item.assignment_id)
      assignmentMap.set(item.assignment_id, { ...existingItem, ...item })
    } else {
      console.error("No assignment exists for user assignment")
    }
  })

  const combinedClassData = Array.from(assignmentMap.values())

  return combinedClassData
}

let currentChatChannel = null

//Subscribes the user to a class to listen for realtime updates
//Right now it removes you from listening for updates in any other channels,
//this should probably be changed in the future for notifications
async function subscribeToClassChat(classId){
  if(currentChatChannel){
    console.log("Leaving previous chat channel")
    await db.removeChannel(currentChatChannel)
    currentChatChannel = null
  }

  currentChatChannel = db.channel(`class-chat-${classId}`)

  currentChatChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}`}, (payload) => {handleRecieveMessage(payload.new)}).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}`}, (payload) => {handleEditMessage(payload.new)}).subscribe()
}

//Adds a message to the messages table in supabase
//Will not allow users to send messages to classes they are not in
async function sendMessage(message, classId){
  const { error } = await db.from("messages").insert({user_id: currentUserId, class_id: classId, text: message})
  if (error){
    console.error("Failed to send message: " + error.message)
    return[]
  }
}

async function editMessage(messageId, updatedText){
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

//MESSAGE HANDLING

const messageContainer = document.getElementById("message-container")

//Function to handle reciving new messages
//Adds recieved messages to the message container on the UI
function handleRecieveMessage(message){
  let senderProfile = getProfileById(message.user_id)
  let scrollBottom = messageContainer.scrollTop + messageContainer.clientHeight >= messageContainer.scrollHeight - 5;

  const newMessageDiv = document.createElement("div")
  newMessageDiv.classList.add("message-content")

  const messageDiv = document.createElement("div")
  messageDiv.classList.add("message")

  const usernameSpan = document.createElement("span")
  usernameSpan.classList.add("username")
  usernameSpan.textContent = senderProfile.username

  const textP = document.createElement("p")
  textP.textContent = message.text
  textP.classList.add("message-text")

  const pfpImg = document.createElement("img")
  pfpImg.src = profileImages[getProfileById(message.user_id).profile_img]
  pfpImg.classList.add("pfp")

  newMessageDiv.appendChild(usernameSpan)
  newMessageDiv.appendChild(textP)

  messageDiv.appendChild(pfpImg)
  messageDiv.appendChild(newMessageDiv)

  messageContainer.appendChild(messageDiv)

  if (scrollBottom){
    messageContainer.scrollTop = messageContainer.scrollHeight
  }
}

//Function to handle recieving message edits
function handleEditMessage(message){
  console.log("Recived edit of message: ", message)
}

//UI HANDLING

let profileCache = []
//Gets the username of a user from the cached user profiles of a class
function getProfileById(userId){
  return profileCache.find(profile => profile.user_id == userId)
}

async function loadClassProfiles(classId){
  const { data, error } = await db.from("profiles").select("*, class_members!inner(*)").eq("class_members.class_id", classId)

  if (error){
    console.error("Failed to load profiles: " + error.message)
    return
  }

  profileCache = data
}

const cardImg = document.getElementById("profile-card-img")
const cardUsername = document.getElementById("username")
async function loadUserProfile(){
  const { data, error } = await db.from("profiles").select().eq("user_id", currentUserId).single()

  if (error){
    console.error("Failed to load user profile: " + error.message)
    return
  }

  currentUserProfile = data

  cardImg.src = profileImages[data.profile_img]
  cardUsername.textContent = data.username
}

//Loads all of the past messages from a certain class into the message container
async function loadPastMessages(classId){
  const {data: messages, error} = await db.from("messages").select().eq("class_id", classId)

  if (error){
    console.error("Failed to load messages: " + error.message)
    return
  }
  messageContainer.innerHTML = messages.map(msg => {
    let profile = getProfileById(msg.user_id)
    return `
    <div class = "message">
      <img src = "${profileImages[profile.profile_img]}" class = "pfp">
      <div class = "message-content">
        <span class = "username">${profile.username}</span>
        <p class = "message-text">${msg.text}</p>
      </div>
    </div>
    `
  }).join("")
  messageContainer.scrollTop = messageContainer.scrollHeight
}

const classListContainer = document.getElementById("class-list")
async function loadClassList(){
  let classes = await getClasses()

  classListContainer.innerHTML = classes.map(c => `
    <li data-id = "${c.class_id}">${c.class_name}</li>
    `).join("")
  classDropdown.innerHTML = `<option value = "" disabled selected>Choose a class...</option>` + classes.map(c => `
    <option value = "${c.class_id}">${c.class_name}</option>
    `)
}

//Loads all assignments from a user into the sidebar
const assignmentContainer = document.getElementById("assignments-container")
async function loadAssignmentList(classId = null){
  let assignments = await getUserAssignments()

  if(assignments.length == 0){
    assignmentContainer.innerHTML = `<h2>No assignments</h2>`
    return
  }

  //If a class id is specified, then filter the assignments so only those assignments are shown
  if(classId){
    assignments = assignments.filter(assignment => assignment.class_id == classId)
  }

  assignments.forEach(item => {
    item.time_range = determineDateRange(item.due_date)
  })

  assignments.sort((a, b) => {
    return new Date(a.due_date) - new Date(b.due_date)
  })
  const dueToday = assignments.filter(assignment => assignment.time_range == "today")
  const dueTomorrow = assignments.filter(assignment => assignment.time_range == "tomorrow")
  const dueThisWeek = assignments.filter(assignment => assignment.time_range == "this-week")
  const dueNextWeek = assignments.filter(assignment => assignment.time_range == "next-week")
  const dueLater = assignments.filter(assignment => assignment.time_range == "later")

  let todayList
  let tomorrowList
  let thisWeekList
  let nextWeekList
  let laterList

  let daysInWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]

  let monthsInYear = [
    "Jan",
    "Feb",
    "March",
    "April",
    "May",
    "June",
    "July",
    "Aug",
    "Sept",
    "Oct",
    "Nov",
    "Dec"
  ]

  if(dueToday.length > 0){
    todayList = `<h2>Today</h2>` + `<ul class = "assignment-list">` + dueToday.map( a => `
      <li data-id = "${a.assignment_id}"><span>${a.title}</span><span class = "assignment-time">${(new Date(a.due_date).getHours()) > 12 ? (new Date(a.due_date).getHours()) - 12 : (new Date(a.due_date).getHours())}:${new Date(a.due_date).getMinutes()} ${(new Date(a.due_date).getHours()) >= 12 ? "PM" : "AM"}</span></li>
      `).join("") + `</ul>`
  } else {
    todayList = null
  }

  if(dueTomorrow.length > 0){
    tomorrowList = `<h2>Tomorrow</h2>` + `<ul class = "assignment-list">` + dueTomorrow.map( a => `
      <li data-id = "${a.assignment_id}"><span>${a.title}</span><span class = "assignment-time">${(new Date(a.due_date).getHours()) > 12 ? (new Date(a.due_date).getHours()) - 12 : (new Date(a.due_date).getHours())}:${new Date(a.due_date).getMinutes()} ${(new Date(a.due_date).getHours()) >= 12 ? "PM" : "AM"}</span></li>
      `).join("") + `</ul>`
  } else {
    tomorrowList = null
  }

  if(dueThisWeek.length > 0){
    thisWeekList = `<h2>This Week</h2>` + `<ul class = "assignment-list">` + dueThisWeek.map( a => `
      <li data-id = "${a.assignment_id}"><span>${a.title}</span><span class = "assignment-time">${daysInWeek[new Date(a.due_date).getDay()]}</span></li>
      `).join("") + `</ul>`
  } else {
    thisWeekList = null
  }

  if(dueNextWeek.length > 0){
    nextWeekList = `<h2>Next Week</h2>` + `<ul class = "assignment-list">` + dueNextWeek.map( a => `
      <li data-id = "${a.assignment_id}"><span>${a.title}</span><span class = "assignment-time">${daysInWeek[new Date(a.due_date).getDay()]}</span></li>
      `).join("") + `</ul>`
  } else {
    nextWeekList = null
  }

  if(dueLater.length > 0){
    laterList = `<h2>Later</h2>` + `<ul class = "assignment-list">` + dueLater.map( a => `
      <li data-id = "${a.assignment_id}"><span>${a.title}</span><span class = "assignment-time">${monthsInYear[new Date(a.due_date).getMonth()]} ${new Date(a.due_date).getDate()}, ${new Date(a.due_date).getFullYear()}</span></li>
      `).join("") + `</ul>`
  } else {
    laterList = null
  }

  assignmentContainer.innerHTML = `${todayList ? todayList : ""}${tomorrowList ? tomorrowList : ""}${thisWeekList ? thisWeekList : ""}${nextWeekList ? nextWeekList : ""}${laterList ? laterList: ""}`
}

classListContainer.addEventListener("click", (event) => {
  const li = event.target.closest("li")
  if (!li) return

  if(li.classList.contains("active")){
    li.classList.remove("active")
    loadClass(null)
    return
  }

  classListContainer.querySelectorAll("li").forEach(item => {
    item.classList.remove("active");
  });

  li.classList.add("active")

  const classId = li.dataset.id

  loadClass(classId)
})

//SETUP FUNCTIONS

//Loads previous chat history and subscribes to chat channel
async function loadClass(classId){
  if (classId == null){
    classHeader.textContent = ""
    messageContainer.innerHTML = ""
    textInput.style = "display:none"
    loadAssignmentList(null)
    localStorage.removeItem("last-class")
    return
  }
  currentClass = classId
  textInput.style = "display:flex"
  await loadClassInfo(classId)
  await loadClassProfiles(classId)
  await loadPastMessages(classId)
  await subscribeToClassChat(classId)
  await loadAssignmentList(classId)
  localStorage.setItem("last-class", classId)
}


//UI -> CODE HOOKUP

//UI elements
const textInput = document.getElementById("chat-input-area")
const messageInput = document.getElementById("message-input")
const classHeader = document.getElementById("class-name")
const joinClassSidebar = document.getElementById("join-class")
const createClassSidebar = document.getElementById("create-class")
const joinClassCard = document.getElementById("join-class-card")
const createClassCard = document.getElementById("create-class-card")
const joinClassButton = document.getElementById("join-class-button")
const createClassButton = document.getElementById("create-class-button")
const joinClassCode = document.getElementById("join-class-code")
const newClassName = document.getElementById("new-class-name")
const newClassSubject = document.getElementById("new-class-subject")
const joinClassForm = document.getElementById("join-class-form")
const createClassForm = document.getElementById("create-class-form")
const createAssignmentSidebar = document.getElementById("create-assignment")
const createAssignmentCard = document.getElementById("create-assignment-card")
const createAssignmentForm = document.getElementById("create-assignment-form")
const assignmentName = document.getElementById("new-assignment-name")
const assignmentDescripton = document.getElementById("new-assignment-description")
const newDueDate = document.getElementById("new-assignment-due-date")
const createAssignmentButton = document.getElementById("create-new-assignment")
const classDropdown = document.getElementById("assignment-class")
const infoButton = document.getElementById("info-button")
const infoCard = document.getElementById("class-info-card")
const infoCardName = document.getElementById("card-class-name")
const infoCardSubject = document.getElementById("card-subject")
const infoClassCode = document.getElementById("card-class-code")

async function loadClassInfo(classId){
  const { data, error } = await db.from("classes").select().eq("class_id", classId).single()

  if (error){
    console.error("Failed to fetch class info: " + error.message)
    return
  }

  classHeader.textContent = data.class_name
  infoCardName.textContent = data.class_name
  infoCardSubject.textContent = data.subject
  infoClassCode.textContent = data.class_id
}

//Adds listener to the message input and sends the message whenever clicking the button or pressing enter
textInput.addEventListener("submit", async (e) => {
  e.preventDefault()

  if(messageInput.value.length==0){
    return
  }
  await sendMessage(messageInput.value, currentClass)
  messageInput.value = ""
})

joinClassSidebar.addEventListener("click", () => {
  joinClassCard.style = "display:flex"
})

createClassSidebar.addEventListener("click", () => {
  createClassCard.style = "display:flex"
})

joinClassCard.addEventListener("click", (event) => {
  if (event.target == joinClassCard){
    joinClassCard.style = "display: none"
  }
})

createClassCard.addEventListener("click", (event) => {
  if (event.target == createClassCard){
    createClassCard.style = "display: none"
  }
})

joinClassForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(await joinClass(joinClassCode.value)){
    joinClassCode.value = "";
    joinClassCard.style.display ="none"
    return
  }

  console.error("Error joining class")
});

createClassForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(await createClass(newClassName.value, newClassSubject.value)){
    newClassSubject.value = "";
    newClassName.value = "";
    createClassCard.style.display = "none"
    return
  }

  console.error("Error creating class")
});

createAssignmentSidebar.addEventListener("click", () => {
  createAssignmentCard.style = "display: flex; flex-direction: column; allign-items: center;"
})

createAssignmentCard.addEventListener("click", (event) => {
  if (event.target == createAssignmentCard){
    createAssignmentCard.style = "display: none"
  }
})

infoButton.addEventListener("click", () => {
  infoCard.style = "display:flex"
})

infoCard.addEventListener("click", (event) => {
  if (event.target == infoCard){
    infoCard.style = "display: none"
  }
})

createAssignmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(classDropdown.value == ""){
    return
  }

  if (await addAssignment(classDropdown.value, assignmentName.value, assignmentDescripton.value, newDueDate.value)){
    classDropdown.value = ""
    assignmentName.value = ""
    assignmentDescripton.value = ""
    newDueDate.value = ""
    createAssignmentCard.style.display = "none"
    return
  }

  console.error("Error creating assignment")
});

//HELPER FUNCTIONS

function determineDateRange(date){
  const now = new Date()
  const dueDate = new Date(date)

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  const dayOfWeek = now.getDay();
  const daysUntilSaturday = 6-dayOfWeek
  const endOfWeek = new Date(now)
  endOfWeek.setDate(now.getDate() + daysUntilSaturday)
  endOfWeek.setHours(23, 59, 59, 999)
  if(dueDate < now){
    return "late"
  }
  if(dueDate.getFullYear() == now.getFullYear() && dueDate.getMonth() == now.getMonth() && dueDate.getDate() == now.getDate()){
    return "today"
  }

  if (dueDate.getFullYear() == tomorrow.getFullYear() && dueDate.getMonth() == tomorrow.getMonth() && dueDate.getDate() == tomorrow.getDate()){
    return "tomorrow"
  }

  if(dueDate >= now && dueDate <= endOfWeek){
    return "this-week"
  }

  const startOfNextWeek = new Date(endOfWeek);
  startOfNextWeek.setDate(endOfWeek.getDate() + 1);
  startOfNextWeek.setHours(0, 0, 0, 0);

  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  endOfNextWeek.setHours(23, 59, 59, 999);

  if(dueDate >= startOfNextWeek && dueDate <= endOfNextWeek){
    return "next-week"
  }

  return "later"
}