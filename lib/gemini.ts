import { GoogleGenerativeAI } from "@google/generative-ai"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy, limit } from "firebase/firestore"

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI("AIzaSyAfWn25V7MGf1OmtlWyGRNbpczsIYe-XxQ")

// Get the generative model
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

// Function to generate a response from Gemini
export async function generateGeminiResponse(prompt: string, history: Array<{ role: string; content: string }> = []) {
  try {
    // Convert history to the format expected by Gemini
    const chatHistory = history.map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.content }],
    }))

    // Start a chat session
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    })

    // Generate a response
    const result = await chat.sendMessage(prompt)
    const response = result.response
    const text = response.text()

    return text
  } catch (error) {
    console.error("Error generating response from Gemini:", error)
    throw error
  }
}

// Function to analyze tasks and provide insights
export async function analyzeTasksAndProvideInsights(userId: string) {
  try {
    // Fetch user's tasks from Firestore
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId), orderBy("createdAt", "desc"))

    const tasksSnapshot = await getDocs(tasksQuery)
    const tasks = tasksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Fetch user's calendar events if available
    const eventsQuery = query(collection(db, "events"), where("userId", "==", userId), orderBy("startTime", "asc"))

    let events = []
    try {
      const eventsSnapshot = await getDocs(eventsQuery)
      events = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.log("No events collection or other error:", error)
      // Continue without events if they don't exist
    }

    // Fetch user's timer sessions if available
    const sessionsQuery = query(
      collection(db, "timerSessions"),
      where("userId", "==", userId),
      orderBy("endTime", "desc"),
      limit(20),
    )

    let sessions = []
    try {
      const sessionsSnapshot = await getDocs(sessionsQuery)
      sessions = sessionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.log("No timer sessions collection or other error:", error)
      // Continue without sessions if they don't exist
    }

    // Prepare the prompt for Gemini
    const prompt = `
      As a productivity AI assistant, analyze this user's data and provide actionable insights.
      
      TASKS (${tasks.length}):
      ${JSON.stringify(tasks, null, 2)}
      
      ${events.length > 0 ? `EVENTS (${events.length}):\n${JSON.stringify(events, null, 2)}` : "NO CALENDAR EVENTS AVAILABLE"}
      
      ${sessions.length > 0 ? `TIMER SESSIONS (${sessions.length}):\n${JSON.stringify(sessions, null, 2)}` : "NO TIMER SESSIONS AVAILABLE"}
      
      Based on this data, please provide:
      1. A productivity score (0-100) with explanation
      2. Task prioritization recommendations (which tasks should be done first and why)
      3. Time management suggestions based on any patterns you observe
      4. Focus time analysis if timer data is available
      5. Any potential scheduling conflicts or issues
      
      Format your response as JSON with the following structure:
      {
        "productivityScore": {
          "score": number,
          "explanation": "string"
        },
        "priorityTasks": [
          {
            "id": "string",
            "title": "string",
            "reason": "string"
          }
        ],
        "timeManagement": {
          "suggestions": ["string"],
          "optimalFocusTime": "string"
        },
        "insights": ["string"],
        "conflicts": ["string"]
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    try {
      // Parse the JSON response
      return JSON.parse(text)
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e)
      // If parsing fails, try to extract JSON from the text
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/)

      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1] || jsonMatch[0])
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", e2)
        }
      }

      // Return a formatted error response
      return {
        error: "Failed to parse response as JSON",
        rawResponse: text,
        productivityScore: {
          score: 50,
          explanation: "Unable to calculate accurate score due to processing error.",
        },
        priorityTasks: [],
        timeManagement: {
          suggestions: ["Consider reviewing your task list manually."],
          optimalFocusTime: "Unknown",
        },
        insights: ["AI analysis encountered an error. Please try again later."],
        conflicts: [],
      }
    }
  } catch (error) {
    console.error("Error analyzing tasks with Gemini:", error)
    throw error
  }
}

// Function to get task recommendations
export async function getTaskRecommendations(userId: string) {
  try {
    // Fetch user's incomplete tasks
    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", userId),
      where("completed", "==", false),
      orderBy("createdAt", "desc"),
    )

    const tasksSnapshot = await getDocs(tasksQuery)
    const tasks = tasksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    if (tasks.length === 0) {
      return {
        recommendations: ["You have no incomplete tasks. Consider adding new tasks to your list."],
        suggestedNextTask: null,
      }
    }

    // Prepare the prompt for Gemini
    const prompt = `
      As a productivity assistant, recommend which task the user should focus on next.
      
      INCOMPLETE TASKS:
      ${JSON.stringify(tasks, null, 2)}
      
      Current time: ${new Date().toISOString()}
      
      Please analyze these tasks and recommend which one the user should focus on next.
      Consider factors like due dates, priority levels, and estimated effort.
      
      Format your response as JSON with the following structure:
      {
        "recommendations": ["string"],
        "suggestedNextTask": {
          "id": "string",
          "title": "string",
          "reason": "string"
        }
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    try {
      // Parse the JSON response
      return JSON.parse(text)
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e)

      // If parsing fails, try to extract JSON from the text
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/)

      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1] || jsonMatch[0])
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", e2)
        }
      }

      // Return a formatted error response
      return {
        recommendations: ["Unable to generate specific recommendations at this time."],
        suggestedNextTask: null,
      }
    }
  } catch (error) {
    console.error("Error getting task recommendations:", error)
    throw error
  }
}

// Function to optimize schedule
export async function optimizeSchedule(userId: string) {
  try {
    // Fetch user's tasks
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId), where("completed", "==", false))

    const tasksSnapshot = await getDocs(tasksQuery)
    const tasks = tasksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Fetch user's calendar events if available
    const eventsQuery = query(collection(db, "events"), where("userId", "==", userId), orderBy("startTime", "asc"))

    let events = []
    try {
      const eventsSnapshot = await getDocs(eventsQuery)
      events = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.log("No events collection or other error:", error)
    }

    // Fetch user preferences if available
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)
    const userPreferences = userSnap.exists() ? userSnap.data().preferences || {} : {}

    // Prepare the prompt for Gemini
    const prompt = `
      As a schedule optimization assistant, create an optimized daily schedule for the user.
      
      TASKS TO SCHEDULE:
      ${JSON.stringify(tasks, null, 2)}
      
      EXISTING CALENDAR EVENTS:
      ${JSON.stringify(events, null, 2)}
      
      USER PREFERENCES:
      ${JSON.stringify(userPreferences, null, 2)}
      
      Current date and time: ${new Date().toISOString()}
      
      Please create an optimized schedule for today that:
      1. Respects existing calendar events
      2. Allocates time for high-priority tasks
      3. Includes breaks and focus sessions
      4. Takes into account user preferences if available
      
      Format your response as JSON with the following structure:
      {
        "schedule": [
          {
            "startTime": "string (ISO format)",
            "endTime": "string (ISO format)",
            "activity": "string",
            "taskId": "string or null",
            "type": "focus|break|meeting"
          }
        ],
        "recommendations": ["string"],
        "unscheduledTasks": ["string"]
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    try {
      // Parse the JSON response
      return JSON.parse(text)
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e)

      // If parsing fails, try to extract JSON from the text
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/)

      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1] || jsonMatch[0])
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", e2)
        }
      }

      // Return a formatted error response
      return {
        schedule: [],
        recommendations: ["Unable to generate an optimized schedule at this time."],
        unscheduledTasks: tasks.map((t) => t.title),
      }
    }
  } catch (error) {
    console.error("Error optimizing schedule with Gemini:", error)
    throw error
  }
}

// Function to summarize conversations
export async function summarizeConversation(messages: any[]) {
  try {
    const messagesText = messages.map((m) => `${m.sender?.name || "User"}: ${m.content}`).join("\n")
    const prompt = `
      Summarize the following conversation concisely, highlighting key points and any action items:
      
      ${messagesText}
      
      Provide a summary that includes:
      1. Main topics discussed
      2. Key decisions made
      3. Action items or next steps
      
      Format your response as JSON with the following structure:
      {
        "summary": "string",
        "mainTopics": ["string"],
        "decisions": ["string"],
        "actionItems": ["string"]
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    try {
      // Parse the JSON response
      return JSON.parse(text)
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e)

      // If parsing fails, try to extract JSON from the text
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/)

      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1] || jsonMatch[0])
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", e2)
        }
      }

      // Return the raw text if JSON parsing fails
      return {
        summary: text,
        mainTopics: [],
        decisions: [],
        actionItems: [],
      }
    }
  } catch (error) {
    console.error("Error summarizing conversation with Gemini:", error)
    throw error
  }
}

// Function to modify tasks based on AI recommendations
export async function modifyTasksBasedOnRecommendations(userId: string, instructions: string) {
  try {
    // Fetch user's tasks
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId))

    const tasksSnapshot = await getDocs(tasksQuery)
    const tasks = tasksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Prepare the prompt for Gemini
    const prompt = `
      As a task management assistant, I need you to help modify the user's tasks based on these instructions:
      "${instructions}"
      
      CURRENT TASKS:
      ${JSON.stringify(tasks, null, 2)}
      
      Based on the instructions, please provide specific changes to make to these tasks.
      You can update priorities, add tags, change due dates, or mark tasks as completed.
      
      Format your response as JSON with the following structure:
      {
        "tasksToUpdate": [
          {
            "id": "string",
            "changes": {
              "property": "new value"
            }
          }
        ],
        "explanation": "string"
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    try {
      // Parse the JSON response
      const recommendations = JSON.parse(text)

      // Apply the recommended changes to the tasks
      for (const taskUpdate of recommendations.tasksToUpdate) {
        const taskRef = doc(db, "tasks", taskUpdate.id)
        await updateDoc(taskRef, taskUpdate.changes)
      }

      return {
        success: true,
        message: "Tasks updated successfully",
        details: recommendations,
      }
    } catch (e) {
      console.error("Failed to parse or apply Gemini recommendations:", e)
      return {
        success: false,
        message: "Failed to apply task modifications",
        error: e.message,
      }
    }
  } catch (error) {
    console.error("Error modifying tasks with Gemini:", error)
    throw error
  }
}

// Function to generate AI insights for dashboard
export async function generateDashboardInsights(userId: string) {
  try {
    // Fetch user's tasks
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", userId))

    const tasksSnapshot = await getDocs(tasksQuery)
    const tasks = tasksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Fetch user's timer sessions if available
    const sessionsQuery = query(
      collection(db, "timerSessions"),
      where("userId", "==", userId),
      orderBy("endTime", "desc"),
      limit(20),
    )

    let sessions = []
    try {
      const sessionsSnapshot = await getDocs(sessionsQuery)
      sessions = sessionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.log("No timer sessions collection or other error:", error)
    }

    // Prepare the prompt for Gemini
    const prompt = `
      As a productivity insights assistant, generate dashboard insights for this user.
      
      TASKS:
      ${JSON.stringify(tasks, null, 2)}
      
      ${sessions.length > 0 ? `TIMER SESSIONS:\n${JSON.stringify(sessions, null, 2)}` : "NO TIMER SESSIONS AVAILABLE"}
      
      Current date and time: ${new Date().toISOString()}
      
      Please generate 4-5 concise, actionable insights for the user's dashboard.
      These should be specific, data-driven observations that help the user improve their productivity.
      
      Format your response as JSON with the following structure:
      {
        "productivityScore": {
          "score": number,
          "change": number,
          "explanation": "string"
        },
        "insights": [
          {
            "title": "string",
            "description": "string",
            "type": "positive|negative|neutral"
          }
        ],
        "focusTime": {
          "total": "string",
          "change": "string",
          "optimalTimeOfDay": "string"
        }
      }
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    try {
      // Parse the JSON response
      return JSON.parse(text)
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e)

      // If parsing fails, try to extract JSON from the text
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/)

      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1] || jsonMatch[0])
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", e2)
        }
      }

      // Return a formatted error response
      return {
        productivityScore: {
          score: 50,
          change: 0,
          explanation: "Score could not be calculated accurately.",
        },
        insights: [
          {
            title: "AI Analysis Error",
            description: "We encountered an error analyzing your data. Please try again later.",
            type: "neutral",
          },
        ],
        focusTime: {
          total: "Unknown",
          change: "Unknown",
          optimalTimeOfDay: "Unknown",
        },
      }
    }
  } catch (error) {
    console.error("Error generating dashboard insights with Gemini:", error)
    throw error
  }
}

