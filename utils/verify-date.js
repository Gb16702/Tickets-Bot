module.exports = (dateString) => {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    return { valid: false, message: "Le format de la date est invalide. Utilise le format YYYY-MM-DD." };
  }

  const date = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const yearDifference = currentYear - date.getFullYear();

  if (yearDifference <= 12) {
    return { valid: false, message: "Tu dois avoir plus de 12 ans." };
  }

  if (yearDifference >= 100) {
    return { valid: false, message: "L'année de naissance est invalide. Tu ne peux pas avoir plus de 100 ans." };
  }

  return { valid: true, message: null };
};
