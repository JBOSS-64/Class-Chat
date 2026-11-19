import { state } from "./state.js"
import { db } from "./db.js"
import { loadAssignmentList } from "./assignments.js"
import { loadPastMessages } from "./chat.js"
import { loadClassProfiles } from "./profile.js"

export async function pushLiveUpdate(classId, type){
  let pushList = []
  state.onlineUsers.forEach(user => {
    if (user == state.currentUserId) return
    pushList.push({user_id: user, class_id: classId, type: type})
  })

  const { error } = await db.from("live_updates").insert(pushList)

  if(error){
    console.error("Failed to push live updates: " + error.message)
  }
}

export async function trackOnline(classId){
  if (state.currentOnlineChannel){
    await db.removeChannel(state.currentOnlineChannel)
  }

  state.currentOnlineChannel = db.channel(`class-presence-${classId}`, {
    config: {
      presence: {
        key: state.currentUserId
      },
    },
  });

  state.currentOnlineChannel
  .on('presence', { event: 'sync' }, () => {
    const newState = state.currentOnlineChannel.presenceState()
    state.onlineUsers = Object.keys(newState)
    console.log(state.onlineUsers)
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    //console.log('join', key, newPresences)
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    //console.log('leave', key, leftPresences)
  })
  .subscribe(async (status) => {
    if (status == 'SUBSCRIBED') {
      await state.currentOnlineChannel.track({
        user_id: state.currentUserId
      })
    }
  })
}

export async function handleRecieveUpdate(update){
  const { error } = await db.from("live_updates").delete().eq("update_id", update.update_id)
  switch (update.type){
    case "assignment":
      loadAssignmentList(state.currentClass)
      break;
    case "new-member":
    case "username":
    case "pfp":
      await loadClassProfiles(state.currentClass)
      loadPastMessages(state.currentClass)
      break;
    default:
      return
  }
}