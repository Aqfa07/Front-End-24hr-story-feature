"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useSwipeable } from "react-swipeable"
import { cn } from "@/lib/utils"

interface Story {
  id: string
  imageData: string
  timestamp: number
}

export default function StoryFeature() {
  const [stories, setStories] = useState<Story[]>([])
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load stories from localStorage on component mount
  useEffect(() => {
    const loadStories = () => {
      try {
        const storedStories = localStorage.getItem("stories")
        if (storedStories) {
          const parsedStories = JSON.parse(storedStories) as Story[]

          // Filter out stories older than 24 hours
          const currentTime = Date.now()
          const validStories = parsedStories.filter((story) => {
            const storyAge = currentTime - story.timestamp
            const isValid = storyAge < 24 * 60 * 60 * 1000 // 24 hours in milliseconds
            return isValid
          })

          setStories(validStories)

          // If stories were filtered out, update localStorage
          if (validStories.length !== parsedStories.length) {
            localStorage.setItem("stories", JSON.stringify(validStories))
          }
        }
      } catch (error) {
        console.error("Error loading stories:", error)
        setStories([])
      }
    }

    loadStories()

    // Set up interval to check for expired stories every minute
    const checkInterval = setInterval(loadStories, 60 * 1000)

    return () => {
      clearInterval(checkInterval)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Handle file upload - completely rewritten to avoid the error
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create a FileReader
    const reader = new FileReader()

    // Define what happens on file load
    reader.addEventListener("load", () => {
      // Get the result
      const imageDataUrl = reader.result as string

      // Create an image element to get dimensions
      const img = document.createElement("img")

      // When image loads, resize if needed and create story
      img.onload = () => {
        let imageData = imageDataUrl

        // Check if resizing is needed
        if (img.width > 1080 || img.height > 1920) {
          // Create canvas for resizing
          const canvas = document.createElement("canvas")

          // Calculate new dimensions
          let width = img.width
          let height = img.height

          if (width > 1080) {
            height = Math.floor((height * 1080) / width)
            width = 1080
          }

          if (height > 1920) {
            width = Math.floor((width * 1920) / height)
            height = 1920
          }

          // Set canvas dimensions
          canvas.width = width
          canvas.height = height

          // Draw resized image
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            imageData = canvas.toDataURL("image/jpeg", 0.9)
          }
        }

        // Create new story
        const newStory: Story = {
          id: crypto.randomUUID(),
          imageData: imageData,
          timestamp: Date.now(),
        }

        // Update state and localStorage
        setStories((prevStories) => {
          const updatedStories = [...prevStories, newStory]
          localStorage.setItem("stories", JSON.stringify(updatedStories))
          return updatedStories
        })

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }

      // Set image source to trigger onload
      img.src = imageDataUrl
    })

    // Read the file
    reader.readAsDataURL(file)
  }

  // Open story viewer
  const openStory = (index: number) => {
    setActiveStoryIndex(index)
    setProgress(0)

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    // Start progress timer
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / 30 // 100% in 3 seconds (30 steps of 100ms)

        if (newProgress >= 100) {
          // Move to next story
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }

          setTimeout(() => {
            if (index < stories.length - 1) {
              openStory(index + 1)
            } else {
              closeStory()
            }
          }, 100)

          return 100
        }

        return newProgress
      })
    }, 100)
  }

  // Close story viewer
  const closeStory = () => {
    setActiveStoryIndex(null)
    setProgress(0)

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  // Navigate to previous story
  const prevStory = () => {
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      openStory(activeStoryIndex - 1)
    }
  }

  // Navigate to next story
  const nextStory = () => {
    if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
      openStory(activeStoryIndex + 1)
    } else {
      closeStory()
    }
  }

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => nextStory(),
    onSwipedRight: () => prevStory(),
    trackMouse: true,
  })

  return (
    <div className="w-full max-w-3xl">
      {/* Stories list */}
      <div className="border rounded-lg p-4 overflow-x-auto">
        <div className="flex space-x-4 min-w-max">
          {/* Add story button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0"
          >
            <Plus className="w-8 h-8 text-gray-400" />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </button>

          {/* Story circles */}
          {stories.map((story, index) => (
            <button
              key={story.id}
              onClick={() => openStory(index)}
              className="w-16 h-16 rounded-full border-2 border-gray-800 overflow-hidden flex-shrink-0"
            >
              <div className="w-full h-full relative">
                <Image src={story.imageData || "/placeholder.svg"} alt="Story" fill className="object-cover" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Story viewer */}
      {activeStoryIndex !== null && stories[activeStoryIndex] && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col" {...swipeHandlers}>
          {/* Progress bars */}
          <div className="flex w-full px-2 pt-2 gap-1">
            {stories.map((_, index) => (
              <div key={index} className="h-1 bg-gray-600 rounded-full flex-1">
                {index === activeStoryIndex && (
                  <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
                )}
                {index < activeStoryIndex && <div className="h-full bg-white rounded-full w-full" />}
              </div>
            ))}
          </div>

          {/* Close button */}
          <button onClick={closeStory} className="absolute top-4 right-4 z-10">
            <X className="w-8 h-8 text-white" />
          </button>

          {/* Navigation buttons */}
          <button
            onClick={prevStory}
            className={cn(
              "absolute left-2 top-1/2 transform -translate-y-1/2 z-10",
              activeStoryIndex === 0 && "opacity-50 cursor-not-allowed",
            )}
            disabled={activeStoryIndex === 0}
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={nextStory}
            className={cn(
              "absolute right-2 top-1/2 transform -translate-y-1/2 z-10",
              activeStoryIndex === stories.length - 1 && "opacity-50 cursor-not-allowed",
            )}
            disabled={activeStoryIndex === stories.length - 1}
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          {/* Story image */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-full h-full max-w-lg mx-auto">
              <Image
                src={stories[activeStoryIndex].imageData || "/placeholder.svg"}
                alt="Story"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
