
const { createClient } = supabase

// Create a single supabase client for interacting with your database
const db = createClient('https://vrnxohudtrcxmcngvhne.supabase.co', 'sb_publishable_Ogs__3UblsqCPwt8pRDe1A_5rmJvxvp')

//Auto login handling
let currentUserId = null;

async function initAuth(){
  const { data: { session } } = await db.auth.getSession();
  currentUserId = session?.user?.id || null;
}
initAuth()

db.auth.onAuthStateChange((events, session) => {
  if(session){
    authScreen.style.display = "none"
    appScreen.style.display = "block"
    console.log("Logged in as: " + session.user.email)
  } else {
    authScreen.style.display = "block"
    appScreen.style.display = "none"
  }
  currentUserId = session?.user?.id || null
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
  signUpDiv.style.display = "block"
  logInDiv.style.display = "none"
})

logInButton.addEventListener("click", () => {
  logInDiv.style.display = "block"
  signUpDiv.style.display = "none"
})

signUpPassword.addEventListener("input", () => {
  if(confirmPassword.value != signUpPassword.value){
    errorText.style.display = "block"
  } else {
    errorText.style.display = "none"
  }
})

confirmPassword.addEventListener("input", () => {
  if(confirmPassword.value != signUpPassword.value){
    errorText.style.display = "block"
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

  await signInWithEmail(email, password)
})

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  if(!validPassword){
    return
  }

  const email = signUpEmail.value
  const password = signUpPassword.value

  await signUpNewUser(email, password)
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
}

async function signInWithEmail(authEmail, authPassword) {
  const { data, error } = await db.auth.signInWithPassword({
    email: authEmail,
    password: authPassword,
  })
  if(error){
    alert("Sign in error: " + error.message)
  }
}

async function signOut() {
  await db.auth.signOut({ scope: 'local' })
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

  console.log("Class was sucsessfully created")
}

//Adds a user to a class based on class id
async function joinClass(classId){
  const { error: joinError } = await db.from("class_members").insert({user_id: currentUserId, class_id: classId})

  if (joinError){
    console.error("Failed to join class: " + joinError.message)
    return
  }

  console.log("Joined class sucsessfully")
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
    console.error("Failed to update notes: " + error.messages)
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

//Sends a message to a specific class
async function sendMessage(classId, messageContent){
  const { error } = await db.from("messages").insert({class_id: classId, text: messageContent})
  if (error){
    console.error("Failed to send message: " + error.message)
    return
  }
  console.log("Sent message sucsessfully")
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

//Gets the profiles of the users for a specific class
//Returns one object for each user with the properties username and profile_img
//Will return an error if the user is not part of the class they are trying to view
async function getClassMembers(classId){
  const { data, error } = await db.from("classes").select("class_members(profiles(username, profile_img))").eq("class_id", classId).single()

  if (error){
    console.error("Failed to fetch class members: " + error.message)
    return []
  }

  const cleanedData = data.class_members.map(cm => cm.profiles)

  console.log("Fetched class members sucsessfully")
  return cleanedData
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

  currentChatChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}`}, (payload) => {handleRecieveMessage(payload.new)}).subscribe()
}

//Adds a message to the messages table in supabase
//Will not allow users to send messages to classes they are not in
async function sendMessage(message, classId){
  const { error } = await db.from("messages").insert({user_id: currentUserId, class_id: classId, text: message})
  if (error){
    console.error("Failed to send message: " + error.message)
    return[]
  }
  console.log(`Sent message "${message}" to class "${classId}" sucsessfully`)
}

async function editMessage(messageId, updatedText){
  const { error } = await db.from("messages").update({text: updatedText}).eq("message_id", messageId)
  if (error){
    console.error("Failed to edit message: " + error.message)
    return
  }
  console.log("Edited message suscessfully")
}


//Function to handle reciving new messages
function handleRecieveMessage(message){
  console.log(`Recieved message from ${message.class_id}: `, message)
}