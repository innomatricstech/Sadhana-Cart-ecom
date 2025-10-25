import { createSlice } from "@reduxjs/toolkit";

// --- Local Storage Configuration ---

const CART_STORAGE_KEY = "shoppingCart";
const MAX_UNITS_PER_ITEM = 5;

// Helper function to load the cart state from local storage
const loadCartState = () => {
  try {
    const serializedState = localStorage.getItem(CART_STORAGE_KEY);
    if (serializedState === null) {
      // Return null to fall back to default state
      return null;
    }
    // Parse the data and include default non-persistent fields (like errorId)
    const loadedData = JSON.parse(serializedState);
    return {
      items: loadedData.items || [],
      billingDetails: loadedData.billingDetails || {},
      errorId: null, // errorId is transient, always reset on load
    };
  } catch (e) {
    console.error("Error loading cart state from local storage:", e);
    return null; // Fall back to default state on error
  }
};

// Helper function to save the persistent state to local storage
const saveCartState = (state) => {
  try {
    // Only save persistent fields: items and billingDetails
    const stateToSave = {
      items: state.items,
      billingDetails: state.billingDetails,
    };
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(CART_STORAGE_KEY, serializedState);
  } catch (e) {
    console.error("Error saving cart state to local storage:", e);
  }
};

// Define default state for fallback/structure
const defaultState = {
  items: [],
  errorId: null,
  billingDetails: {}, // store billing info
};

// Initialize state: try to load from local storage, fall back to default
const initialState = loadCartState() || defaultState;

// --- Redux Slice ---

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.items.find((i) => i.id === item.id);

      if (existingItem) {
        const newQuantity = existingItem.quantity + (item.quantity || 1);
        existingItem.quantity = Math.min(newQuantity, MAX_UNITS_PER_ITEM);
        if (newQuantity > MAX_UNITS_PER_ITEM) state.errorId = item.id;
      } else {
        state.items.push({
          ...item,
          quantity: Math.min(item.quantity || 1, MAX_UNITS_PER_ITEM),
        });
      }
      // 🔥 Save state after modification
      saveCartState(state);
    },
    removeFromCart: (state, action) => {
      const { id, quantity } = action.payload;
      const existingItem = state.items.find((i) => i.id === id);
      if (!existingItem) return;

      if (quantity) {
        existingItem.quantity -= quantity;
        if (existingItem.quantity < 1) existingItem.quantity = 1;
      } else {
        state.items = state.items.filter((i) => i.id !== id);
      }
      // 🔥 Save state after modification
      saveCartState(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.errorId = null;
      state.billingDetails = {};
      // 🔥 Save state after modification
      saveCartState(state);
    },
    clearCartError: (state) => {
      // This is a transient change, no need to save to persistent storage
      state.errorId = null;
    },
    setCart: (state, action) => {
      state.items = action.payload.items || [];
      state.billingDetails = action.payload.billingDetails || {};
      state.errorId = null;
      // 🔥 Save state after modification
      saveCartState(state);
    },
    setBillingDetails: (state, action) => {
      state.billingDetails = action.payload;
      // 🔥 Save state after modification
      saveCartState(state);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  clearCart,
  clearCartError,
  setCart,
  setBillingDetails,
} = cartSlice.actions;
export default cartSlice.reducer;
