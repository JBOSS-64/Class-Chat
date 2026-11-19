import { state } from "./state.js"

export function determineDateRange(date){
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

export function isValidUsername(username){
  if (!username || username.trim() === "") return false;
  if (username.startsWith(" ")) return false;
  if (username.length > 50) return false;
  return true;
}

export function getProfileById(userId){
  return state.profileCache.find(profile => profile.user_id == userId)
}