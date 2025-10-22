import { AuthContext } from "../context/AuthContext";

let ctx = null;
export const setAuthContext = (context) => {
  ctx = context;
};

export const logoutHandler = () => {
  if (ctx && ctx.logout) {
    ctx.logout();
  }
};
