import { db } from "./db.js"
import { els } from "./elements.js"
import { state } from "./state.js"  

let validPassword = false

//Event Listeners
els.signUpButton.addEventListener("click", () => {
  els.signUpDiv.style = "display: flex; flex-direction: column; allign-items: center;"
  els.logInDiv.style.display = "none"
})

els.logInButton.addEventListener("click", () => {
  els.logInDiv.style = "display: flex; flex-direction: column; allign-items: center;"
  els.signUpDiv.style.display = "none"
})

els.signUpPassword.addEventListener("input", () => {
  if(els.confirmPassword.value != els.signUpPassword.value){
    els.errorText.style = "display: flex; flex-direction: column; allign-items: center;"
  } else {
    els.errorText.style.display = "none"
  }
})

els.confirmPassword.addEventListener("input", () => {
  if(els.confirmPassword.value != els.signUpPassword.value){
    els.errorText.style = "display: flex; flex-direction: column; allign-items: center;"
    validPassword = false
  } else {
    els.errorText.style.display = "none"
    validPassword = true
  }
})

els.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = els.loginEmail.value
  const password = els.loginPassword.value

  if(signInWithEmail(email, password)){
    els.loginEmail.value = ""
    els.loginPassword.value = ""
    els.signUpEmail.value = ""
    els.signUpPassword.value = ""
  }
})

els.signupForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  if(!validPassword){
    return
  }

  const email = els.signUpEmail.value
  const password = els.signUpPassword.value

  if(signUpNewUser(email, password)){
    els.loginEmail.value = ""
    els.loginPassword.value = ""
    els.signUpEmail.value = ""
    els.signUpPassword.value = ""
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

export async function signOut() {
  await db.auth.signOut({ scope: 'local' })
  localStorage.removeItem("last-class")
  state.currentClass = null
  console.log("Signed out sucsessfully")
}
