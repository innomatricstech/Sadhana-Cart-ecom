import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./cartSlice";
import footerReducer from "./footerSlice";

const initialHeader = { location: "Bengaluru", cartCount: 0 };

const headerSlice = {
  name: "header",
  initialState: initialHeader,
  reducers: {
    setLocation: (state, action) => ({
      type: "header/setLocation",
      payload: action.payload,
    }),
    setCartCount: (state, action) => ({
      type: "header/setCartCount",
      payload: action.payload,
    }),
  },
};

const headerReducer = (state = initialHeader, action) => {
  switch (action.type) {
    case "header/setLocation":
      return { ...state, location: action.payload };
    case "header/setCartCount":
      return { ...state, cartCount: action.payload };
    default:
      return state;
  }
};

export const { setLocation, setCartCount } = headerSlice.reducers;

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    footer: footerReducer,
    
    header: headerReducer, 
  },
});

export default store;
