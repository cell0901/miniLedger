// Shared login details, kept only in memory.
// Login fills this object. Sign out clears it. Reloading the app resets it.
// Keep the token here instead of putting it in a navigation URL.
// this stores the jwt token. since mobile app dont have localStorage. a better alternative would be ios keychain for ios
export const session = {
  token: '',
  phone: '',
};
