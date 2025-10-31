import { createSlice } from "@reduxjs/toolkit";

const CART_STORAGE_KEY = "shoppingCart";

// --- Helper functions ---
const loadCartState = () => {
  try {
    const serializedState = localStorage.getItem(CART_STORAGE_KEY);
    if (serializedState === null) return null;
    const loadedData = JSON.parse(serializedState);
    return {
      items: loadedData.items || [],
      billingDetails: loadedData.billingDetails || {},
      errorId: null,
    };
  } catch (e) {
    console.error("Error loading cart state from local storage:", e);
    return null;
  }
};

const saveCartState = (state) => {
  try {
    const stateToSave = {
      items: state.items,
      billingDetails: state.billingDetails,
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (e) {
    console.error("Error saving cart state to local storage:", e);
  }
};

// --- Default state ---
const defaultState = {
  items: [],
  errorId: null,
  billingDetails: {},
};

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
        // 🧠 Calculate new quantity based on stock limit
        const newQuantity = existingItem.quantity + (item.quantity || 1);

        if (existingItem.stock && newQuantity > existingItem.stock) {
          // limit to available stock
          existingItem.quantity = existingItem.stock;
          state.errorId = item.id; // trigger “max stock reached” toast
        } else {
          existingItem.quantity = newQuantity;
        }
      } else {
        // When adding new item, ensure we don’t exceed its stock
        const allowedQty = item.stock
          ? Math.min(item.quantity || 1, item.stock)
          : (item.quantity || 1);
        state.items.push({
          ...item,
          quantity: allowedQty,
        });
        if (item.stock && allowedQty >= item.stock) {
          state.errorId = item.id; // optional initial limit toast
        }
      }

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

      saveCartState(state);
    },

    clearCart: (state) => {
      state.items = [];
      state.errorId = null;
      state.billingDetails = {};
      saveCartState(state);
    },

    clearCartError: (state) => {
      state.errorId = null;
    },

    setCart: (state, action) => {
      state.items = action.payload.items || [];
      state.billingDetails = action.payload.billingDetails || {};
      state.errorId = null;
      saveCartState(state);
    },

    setBillingDetails: (state, action) => {
      state.billingDetails = action.payload;
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
