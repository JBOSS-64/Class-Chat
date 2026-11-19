import { db } from "./db.js"
import { state } from "./state.js"  
import { els } from "./elements.js"
import { subscribeToClassChat } from "./chat.js"
import { loadPastMessages } from "./chat.js"
import { loadClassProfiles } from "./profile.js"
import { loadAssignmentList } from "./assignments.js"
import { trackOnline, pushLiveUpdate } from "./liveupdates.js"

export async function loadClass(classId){
  if (classId == null){
    els.classHeader.textContent = ""
    els.messageContainer.innerHTML = ""
    els.textInput.style = "display:none"
    loadAssignmentList(null)
    localStorage.removeItem("last-class")
    return
  }
  state.currentClass = classId
  els.textInput.style = "display:flex"
  await loadClassInfo(classId)
  await loadClassProfiles(classId)
  await loadPastMessages(classId)
  await subscribeToClassChat(classId)
  await trackOnline(classId)
  await loadAssignmentList(classId)
  localStorage.setItem("last-class", classId)
}

async function getClasses(){
  const { data, error } = await db.from("classes").select("*, class_members(*)").eq("class_members.user_id", state.currentUserId).eq("class_members.enrolled", true)

  if (error){
    console.error("Failed to fetch classes: " + error.message)
    return []
  }
  console.log("Fetched classes sucsessfully")
  return data
}

export async function loadClassList(){
  let classes = await getClasses()

  els.classListContainer.innerHTML = classes.map(c => `
    <li data-id = "${c.class_id}">${c.class_name}</li>
    `).join("")
  els.classDropdown.innerHTML = `<option value = "" disabled selected>Choose a class...</option>` + classes.map(c => `
    <option value = "${c.class_id}">${c.class_name}</option>
    `)
}

export async function loadClassInfo(classId){
  const { data, error } = await db.from("classes").select().eq("class_id", classId).single()

  if (error){
    console.error("Failed to fetch class info: " + error.message)
    return
  }

  els.classHeader.textContent = data.class_name
  els.infoCardName.textContent = data.class_name
  els.infoCardSubject.textContent = data.subject
  els.infoClassCode.textContent = data.class_id
}

export async function joinClass(classId){
  const { error: joinError } = await db.from("class_members").insert({user_id: state.currentUserId, class_id: classId})

  if (joinError){
    console.error("Failed to join class: " + joinError.message)
    return
  }

  await loadClassList()
  loadClass(classId)
  pushLiveUpdate(classId, "new-member")
  els.classListContainer.querySelectorAll("li").forEach(item => {
    if(item.dataset.id == classId){
      item.classList.add("active")
    }
  });
  console.log("Joined class sucsessfully")
  return true
}

export async function createClass(className, classSubject){
  if (!className || !classSubject){
    return
  }
  //Inserts a class to the classes table with the specified parameters
  //Returns the object added to the table to the classData object with the .select()
  //The .single() makes it a single object instead of having it nested so that stuff like classData.class_id will work
  const { data: classData, error: classError } = await db.from("classes").insert({creator_id: state.currentUserId, class_name: className, subject: classSubject}).select().single()
  if(classError){
    console.error("Failed to create class: " + classError.message)
    return
  }
  //Adds the creator of the class to the class
  const { error: addMemberError } = await db.from("class_members").insert({user_id: state.currentUserId, class_id: classData.class_id}) 
  if(addMemberError){
    console.error("Failed to add creator to class: " + addMemberError.message)
  }

  await loadClassList()
  loadClass(classData.class_id)
  console.log("Class was sucsessfully created")
  return true
}

export async function deleteClass(classId){
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