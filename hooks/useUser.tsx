'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserContextType {
  userName: string | null
  setUserName: (name: string) => void
  clearUser: () => void
  isLoading: boolean
}

const UserContext = createContext<UserContextType>({
  userName: null,
  setUserName: () => {},
  clearUser: () => {},
  isLoading: true,
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('ib_username')
    if (stored) setUserNameState(stored)
    setIsLoading(false)
  }, [])

  const setUserName = (name: string) => {
    localStorage.setItem('ib_username', name)
    setUserNameState(name)
  }

  const clearUser = () => {
    localStorage.removeItem('ib_username')
    setUserNameState(null)
  }

  return (
    <UserContext.Provider value={{ userName, setUserName, clearUser, isLoading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
