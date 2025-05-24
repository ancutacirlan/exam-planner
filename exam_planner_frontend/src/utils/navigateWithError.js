

// Funcția care se ocupă cu navigarea pe pagina de eroare
const navigateWithError = (navigate, message, type) => {
  navigate("/error", {
    state: {
      message: message || "A apărut o eroare necunoscută.",
      type: type || "Eroare necunoscută",
    },
  });
};

export default navigateWithError;
