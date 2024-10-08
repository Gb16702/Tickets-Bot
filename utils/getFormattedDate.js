const { DateTime } = require("luxon");

const getFormattedDate = (date = new Date(), onEvent = false) => {
  const now = DateTime.now().setZone("Europe/Brussels");

  const inputDate = date instanceof Date && !isNaN(date) ? DateTime.fromJSDate(date).setZone("Europe/Brussels") : now;

  let formattedTime;

  if (inputDate.hasSame(now, "day")) {
    formattedTime = `Aujourd'hui à ${inputDate.toFormat("HH:mm")}`;
  } else if (inputDate.hasSame(now.minus({ days: 1 }), "day")) {
    formattedTime = `Hier à ${inputDate.toFormat("HH:mm")}`;
  } else {
    formattedTime = `Le ${inputDate.toFormat("dd/MM/yyyy à HH:mm")}`;
  }

  return formattedTime;
};

module.exports = getFormattedDate;
