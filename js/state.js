export const state = {
    currentUserId: null,
    currentUserProfile: null,
    onlineUsers: [],
    profileCache: [],
    currentClass: localStorage.getItem("last-class") || null,
    currentChatChannel: null,
    currentOnlineChannel: null
}