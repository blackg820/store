'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface CartItem {
  id: string
  productId: string
  name: string
  nameAr: string
  price: number
  deliveryFee: number
  quantity: number
  image?: string
  options?: Record<string, string> // e.g., { "Size": "M", "Color": "Red" }
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: Omit<CartItem, 'id'>) => void
  removeFromCart: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  totalDeliveryFee: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('storify_cart')
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (e) {
        console.error('Failed to parse cart', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('storify_cart', JSON.stringify(items))
    }
  }, [items, isLoaded])

  const addToCart = (newItem: Omit<CartItem, 'id'>) => {
    setItems(prev => {
      // Check if item with same productId and SAME options already exists
      const existingItemIndex = prev.findIndex(item => 
        item.productId === newItem.productId && 
        JSON.stringify(item.options) === JSON.stringify(newItem.options)
      )

      if (existingItemIndex > -1) {
        const updatedItems = [...prev]
        updatedItems[existingItemIndex].quantity += newItem.quantity
        return updatedItems
      }

      const id = `${newItem.productId}-${Date.now()}`
      return [...prev, { ...newItem, id }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ))
  }

  const clearCart = () => {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalDeliveryFee = items.length > 0 ? Math.max(...items.map(i => i.deliveryFee || 0)) : 0

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart,
      totalItems,
      totalPrice,
      totalDeliveryFee
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
