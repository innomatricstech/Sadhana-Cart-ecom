import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  errorId: null,
  billingDetails: {}, // store billing info
};

const MAX_UNITS_PER_ITEM = 5;

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
    },
    clearCart: (state) => {
      state.items = [];
      state.errorId = null;
      state.billingDetails = {};
    },
    clearCartError: (state) => {
      state.errorId = null;
    },
    setCart: (state, action) => {
      state.items = action.payload.items || [];
      state.billingDetails = action.payload.billingDetails || {};
      state.errorId = null;
    },
    setBillingDetails: (state, action) => {
      state.billingDetails = action.payload;
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
