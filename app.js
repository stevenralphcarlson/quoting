const express = require("express");
var session = require("express-session");
const axios = require("axios");

const app = express();
const bodyParser = require("body-parser");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ resave: true, secret: "123456", saveUninitialized: true }));

app.get("/", function (req, res) {
  res.render("form");
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.get("/contact", function (req, res) {
  res.render("contact");
});

app.get("/thankyou", function (req, res) {
  res.render("thankyou");
});

function getPrice(selection, ssn) {
  let price = ssn.openstandard;
  switch (selection) {
    case "Open Standard":
      price = ssn.openstandard;
      break;
    case "Open Premium":
      price = ssn.openpremium;
      break;
    case "Open Express":
      price = ssn.openexpress;
      break;
    case "Enclosed Standard":
      price = ssn.enclosedstandard;
      break;
    case "Enclosed Premium":
      price = ssn.enclosedpremium;
      break;
    case "Enclosed Express":
      price = ssn.enclosedexpress;
      break;
  }
  return price;
}

app.post("/summary", async (req, res) => {
  const ssn = req.session;
  const selectedPrice = getPrice(req.body.selection, ssn);
  const stripe = require("stripe")(
    "sk_test_51H6GmsA0iFQODPbSK9Bx8rBmUPhX8juvv8Efk22Vyt5Rvi8qVPD79oY6jJbNbHCCuQ9YMMZ6ov0s92wJBbQWxqYR00he9PI0Ap"
  );
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Delivery Cost",
          },
          unit_amount: selectedPrice * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "http://localhost:3000/summary/cancel",
  });

  res.render("summary", {
    session_id: session.id,
    selectedPrice: selectedPrice,
    vehicle: ssn.vehicle,
    from: ssn.from,
    to: ssn.to,
    service: req.body.selection,
  });
});

app.post("/quote", function (req, res) {
  // VARIABLES
  // TODO: Pull from database
  // There will be a total of 6 prices that will need to be calculated

  let openMinPrice = 500;
  let enclosedMinPrice = 700;
  let openCapacity = 35000;
  let enclosedCapacity = 25000;
  let revenueGoal = 4.2;
  let standardMinDays = 7;
  let premiumMinDays = 5;
  let expressMinDays = 2;
  let standardSpeed = 200;
  let premiumSpeed = 300;
  let expressSpeed = 550;
  let premiumRateMultiplier = 1.5;
  let expressRateMuiltiplier = 3;

  const vehicle =
    capitalizeFirstLetter(req.body["car-makes"]) +
    " " +
    capitalizeFirstLetter(req.body["car-models"]);
  let origins = req.body.origins;
  let destinations = req.body.destinations;
  let vehicleInformation =
    req.body["car-years"] +
    " " +
    req.body["car-makes"] +
    " " +
    req.body["car-models"] +
    " " +
    req.body["car-model-trims"];
  let dateParts = req.body["date-available"].split("-");
  const dateAvailable = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

  let distanceUrl =
    "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" +
    origins +
    "&destinations=" +
    destinations +
    "&units=imperial&key=AIzaSyCEPwvSlyYoisJMueJMRN5PmfJt9TzgPpU";

  let fuelPriceUrl =
    "http://api.eia.gov/series/?api_key=c8ec494bec9e997e6f051af94f510640&series_id=PET.EMD_EPD2DXL0_PTE_NUS_DPG.W";

  let carQueryUrl =
    "https://www.carqueryapi.com/api/0.3/?callback=?&cmd=getModel&model=" +
    req.body["car-model-trims"];

  (async () => {
    try {
      const [
        distanceResponse,
        fuelPriceResponse,
        carQueryResponse,
      ] = await axios.all([
        axios.get(distanceUrl),
        axios.get(fuelPriceUrl),
        axios.get(carQueryUrl),
        1,
      ]);

      let distance = Math.round(
        distanceResponse.data.rows[0].elements[0].distance.value / 1609
      ); // Converting meters to miles
      let formMiles = distanceResponse.data.rows[0].elements[0].distance.text;
      let formOrigin = distanceResponse.data.origin_addresses;
      let formDestination = distanceResponse.data.destination_addresses;
      let carQueryData = JSON.parse(
        trimWeirdCharactersFromJson(carQueryResponse.data)
      );

      // Calculate Deliver By Dates
      let standardDeliverBy = new Date(dateAvailable);
      standardDeliverBy.setDate(
        standardDeliverBy.getDate() +
          standardMinDays +
          Math.round(distance / standardSpeed)
      );
      standardDeliverBy = getFormattedDate(standardDeliverBy);

      let premiumDeliverBy = new Date(dateAvailable);
      premiumDeliverBy.setDate(
        premiumDeliverBy.getDate() +
          premiumMinDays +
          Math.round(distance / premiumSpeed)
      );
      premiumDeliverBy = getFormattedDate(premiumDeliverBy);

      let expressDeliverBy = new Date(dateAvailable);
      expressDeliverBy.setDate(
        expressDeliverBy.getDate() +
          expressMinDays +
          Math.round(distance / expressSpeed)
      );
      expressDeliverBy = getFormattedDate(expressDeliverBy);

      let carWeight = carQueryData[0].model_weight_lbs;

      let fuelSurcharge = 0;

      const currentFuelPrice = fuelPriceResponse.data.series[0].data[0][1];
      const baseFuelPrice = 2.5;

      if (currentFuelPrice > baseFuelPrice) {
        const delta = currentFuelPrice - baseFuelPrice;
        const avgMpg = 6;
        const fuelSurchargePerMile = delta / avgMpg;
        fuelSurcharge = fuelSurchargePerMile * distance;
      }

      // to do add the available date and insurance calculations
      let openstandard = Math.round(
        fuelSurcharge + (revenueGoal / (openCapacity / carWeight)) * distance
      );

      let openpremium = Math.round(
        fuelSurcharge +
          (revenueGoal / (openCapacity / carWeight)) *
            distance *
            premiumRateMultiplier
      );

      let openexpress = Math.round(
        fuelSurcharge +
          (revenueGoal / (openCapacity / carWeight)) *
            distance *
            expressRateMuiltiplier
      );

      let enclosedstandard = Math.round(
        fuelSurcharge +
          (revenueGoal / (enclosedCapacity / carWeight)) * distance
      );

      let enclosedpremium = Math.round(
        fuelSurcharge +
          (revenueGoal / (enclosedCapacity / carWeight)) *
            distance *
            premiumRateMultiplier
      );

      let enclosedexpress = Math.round(
        fuelSurcharge +
          (revenueGoal / (enclosedCapacity / carWeight)) *
            distance *
            expressRateMuiltiplier
      );

      const ssn = req.session;
      ssn.openstandard = openstandard;
      ssn.openstandard = openstandard;
      ssn.openpremium = openpremium;
      ssn.openexpress = openexpress;
      ssn.enclosedstandard = enclosedstandard;
      ssn.enclosedpremium = enclosedpremium;
      ssn.enclosedexpress = enclosedexpress;
      ssn.from = formOrigin;
      ssn.to = formDestination;
      ssn.vehicle = vehicle;

      // Price difference for upgrade options
      let upgradeToEnclosed = enclosedstandard - openstandard;

      res.render("quote", {
        locationData: distanceResponse.data,
        quoteMiles: formMiles,
        quoteOrigin: formOrigin,
        distance,
        distance,
        dateAvailable,
        dateAvailable,
        vehicleInformation,
        vehicleInformation,
        quoteDestination: formDestination,
        openstandard: openstandard,
        openpremium: openpremium,
        openexpress: openexpress,
        enclosedstandard: enclosedstandard,
        enclosedpremium: enclosedpremium,
        enclosedexpress: enclosedexpress,
        standardDeliverBy: standardDeliverBy,
        premiumDeliverBy: premiumDeliverBy,
        expressDeliverBy: expressDeliverBy,
        vehicle: vehicle,
        upgradeToEnclosed: upgradeToEnclosed,
      });
    } catch (error) {
      console.log(error.response.body);
    }
  })();
});

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getFormattedDate(date) {
  var year = date.getFullYear();

  var month = (1 + date.getMonth()).toString();
  month = month.length > 1 ? month : "0" + month;

  var day = date.getDate().toString();
  day = day.length > 1 ? day : "0" + day;

  return month + "-" + day + "-" + year;
}

function trimWeirdCharactersFromJson(jsonString) {
  if (jsonString.startsWith("?(")) jsonString = remove(jsonString, 0, 2);
  if (jsonString.endsWith(");"))
    jsonString = remove(jsonString, jsonString.length - 2, 2);
  return jsonString;
}

function remove(str, startIndex, count) {
  return str.substr(0, startIndex) + str.substr(startIndex + count);
}

app.listen(process.env.PORT || 8080, function () {
  console.log("The server is running!");
});

// When deploying application change server to this code
// const port = process.env.PORT || 1337;
// server.listen(port);

console.log("Server running");
