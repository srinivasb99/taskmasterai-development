import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"

// User-related functions
export async function getUserProfile(userId: string) {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() }
    } else {
      throw new Error("User not found")
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    throw error
  }
}

export async function updateUserProfile(userId: string, data: any) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

// Task-related functions
export async function getUserTasks(userId: string) {
  try {
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(tasksQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting user tasks:", error)
    throw error
  }
}

export async function createTask(userId: string, taskData: any) {
  try {
    const taskRef = await addDoc(collection(db, "tasks"), {
      ...taskData,
      userId,
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return { id: taskRef.id }
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

export async function updateTask(taskId: string, data: any) {
  try {
    const taskRef = doc(db, "tasks", taskId)
    await updateDoc(taskRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

export async function deleteTask(taskId: string) {
  try {
    await deleteDoc(doc(db, "tasks", taskId))
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

// Timer-related functions
export async function getUserTimers(userId: string) {
  try {
    const timersQuery = query(collection(db, "timers"), where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(timersQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting user timers:", error)
    throw error
  }
}

export async function createTimer(userId: string, timerData: any) {
  try {
    const timerRef = await addDoc(collection(db, "timers"), {
      ...timerData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return { id: timerRef.id }
  } catch (error) {
    console.error("Error creating timer:", error)
    throw error
  }
}

export async function updateTimer(timerId: string, data: any) {
  try {
    const timerRef = doc(db, "timers", timerId)
    await updateDoc(timerRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating timer:", error)
    throw error
  }
}

export async function deleteTimer(timerId: string) {
  try {
    await deleteDoc(doc(db, "timers", timerId))
  } catch (error) {
    console.error("Error deleting timer:", error)
    throw error
  }
}

// Chat-related functions
export async function getUserChats(userId: string) {
  try {
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc"),
    )

    const querySnapshot = await getDocs(chatsQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting user chats:", error)
    throw error
  }
}

export async function createChat(chatData: any) {
  try {
    const chatRef = await addDoc(collection(db, "chats"), {
      ...chatData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return { id: chatRef.id }
  } catch (error) {
    console.error("Error creating chat:", error)
    throw error
  }
}

export async function getChatMessages(chatId: string) {
  try {
    const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"))

    const querySnapshot = await getDocs(messagesQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting chat messages:", error)
    throw error
  }
}

export async function sendMessage(chatId: string, messageData: any) {
  try {
    // Add message to the chat's messages subcollection
    const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
      ...messageData,
      timestamp: serverTimestamp(),
    })

    // Update the chat's last message and timestamp
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: messageData.content,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return { id: messageRef.id }
  } catch (error) {
    console.error("Error sending message:", error)
    throw error
  }
}

// File upload function
export async function uploadFile(file: File, path: string) {
  try {
    const storageRef = ref(storage, path)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)

    return { url: downloadURL, path }
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

// AI conversation history functions
export async function getUserAIConversations(userId: string) {
  try {
    const conversationsQuery = query(
      collection(db, "aiConversations"),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc"),
    )

    const querySnapshot = await getDocs(conversationsQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting AI conversations:", error)
    throw error
  }
}

export async function createAIConversation(userId: string, title: string, firstMessage: string) {
  try {
    const conversationRef = await addDoc(collection(db, "aiConversations"), {
      userId,
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Add the first message
    await addDoc(collection(db, "aiConversations", conversationRef.id, "messages"), {
      role: "user",
      content: firstMessage,
      timestamp: serverTimestamp(),
    })

    return { id: conversationRef.id }
  } catch (error) {
    console.error("Error creating AI conversation:", error)
    throw error
  }
}

export async function getAIConversationMessages(conversationId: string) {
  try {
    const messagesQuery = query(
      collection(db, "aiConversations", conversationId, "messages"),
      orderBy("timestamp", "asc"),
    )

    const querySnapshot = await getDocs(messagesQuery)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting AI conversation messages:", error)
    throw error
  }
}

export async function addAIMessage(conversationId: string, role: "user" | "assistant", content: string) {
  try {
    // Add message to the conversation's messages subcollection
    const messageRef = await addDoc(collection(db, "aiConversations", conversationId, "messages"), {
      role,
      content,
      timestamp: serverTimestamp(),
    })

    // Update the conversation's timestamp
    await updateDoc(doc(db, "aiConversations", conversationId), {
      updatedAt: serverTimestamp(),
    })

    return { id: messageRef.id }
  } catch (error) {
    console.error("Error adding AI message:", error)
    throw error
  }
}

// Real-time listeners
export function onUserTasksChange(userId: string, callback: (tasks: any[]) => void) {
  const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId), orderBy("createdAt", "desc"))

  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(tasks)
  })
}

export function onChatMessagesChange(chatId: string, callback: (messages: any[]) => void) {
  const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"))

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to JS Date for easier handling
      timestamp:
        doc.data().timestamp instanceof Timestamp ? doc.data().timestamp.toDate().toISOString() : doc.data().timestamp,
    }))
    callback(messages)
  })
}

