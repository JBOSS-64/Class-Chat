
const { createClient } = supabase

// Create a single supabase client for interacting with your database
const db = createClient('https://vrnxohudtrcxmcngvhne.supabase.co', 'sb_publishable_Ogs__3UblsqCPwt8pRDe1A_5rmJvxvp')

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
  const password = loginEmail.value

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

db.auth.onAuthStateChange((events, session) => {
  if(session){
    authScreen.style.display = "none"
    appScreen.style.display = "block"
    console.log("Logged in as: " + session.user.email)
  } else {
    authScreen.style.display = "block"
    appScreen.style.display = "none"
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