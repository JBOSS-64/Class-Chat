import { db } from "./db.js"
import { state } from "./state.js"  
import { els } from "./elements.js"
import { determineDateRange } from "./helper.js"
import { pushLiveUpdate } from "./liveupdates.js"

export async function loadAssignmentList(classId = null){
  let assignments = await getUserAssignments()

  if(assignments.length == 0){
    els.assignmentContainer.innerHTML = `<h2>No assignments</h2>`
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

  els.assignmentContainer.innerHTML = `${todayList ? todayList : ""}${tomorrowList ? tomorrowList : ""}${thisWeekList ? thisWeekList : ""}${nextWeekList ? nextWeekList : ""}${laterList ? laterList: ""}`
}

export async function getUserAssignments(){
  const { data: userAssignments, error: userError } = await db.from("user_assignments").select().eq("user_id", state.currentUserId)
  if (userError){
    console.error("Failed to fetch user assignments: " + userError.message)
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

//Adds an assignment to a specific class
//Supabase automatically adds the assignment to all users in that class
export async function addAssignment(classId, assignmentTitle, assignmentDescripton, dueDate){
  const { error: addAssignmentError } = await db.from("assignments").insert({class_id: classId, title: assignmentTitle, due_date: new Date(dueDate).toISOString(), description: assignmentDescripton})

  if (addAssignmentError){
    console.error("Failed to add assignment: " + addAssignmentError.message)
    return
  }

  console.log("Added assignment sucsessfully")
  if (classId == state.currentClass){
    loadAssignmentList(state.currentClass)
  }
  pushLiveUpdate(classId, "assignment")
  return true
}

//Use this function to update all of the personal assignment details at once, likely when the user first enters the info
export async function updatePersonalAssignment(assignmentId, updatedNotes, updatedTime, updatedCompletionStatus){
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
    console.error("Failed to update estimated time: " + error.message)
    return
  }
  console.log("Updated estimated time sucsessfully")
}

//Updates whether or not the user has completed an assignment
async function updateIsComplete(assignmentId, updatedCompletionStatus){
  const { error } = await db.from("user_assignments").update({is_complete: updatedCompletionStatus}).eq("assignment_id", assignmentId).eq("user_id", currentUserId)
  if (error){
    console.error("Failed to update completion status: " + error.message)
    return
  }
  console.log("Updated completion status sucsessfully")
}