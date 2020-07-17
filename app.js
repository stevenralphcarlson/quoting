const express = require("express");
const axios = require("axios");

const app = express();
const bodyParser = require("body-parser");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

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

app.post("/checkout", function (req, res) {
  res.render("checkout");
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
  let flexibleMinDays = 7;
  let standardMinDays = 5;
  let expeditedMinDays = 2;
  let flexibleSpeed = 200;
  let standardSpeed = 300;
  let expeditedSpeed = 550;
  let standardRateMultiplier = 1.5;
  let expeditedRateMuiltiplier = 3;

  let origins = req.body.origins;
  let destinations = req.body.destinations;
  let dateAvailable = req.body["date-available"];

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

  let insurance = 1.8;
  let tenDays = 1.3;
  let sevenDays = 1.8;
  let baseRate = 270;
  let open = 0.28;
  let enclosed = 0.42;

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
      ]);

      let distance = Math.round(
        distanceResponse.data.rows[0].elements[0].distance.value / 1609
      );
      let formMiles = distanceResponse.data.rows[0].elements[0].distance.text;
      let formOrigin = distanceResponse.data.origin_addresses;
      let formDestination = distanceResponse.data.destination_addresses;
      let carQueryData = JSON.parse(
        trimWeirdCharactersFromJson(carQueryResponse.data)
      );

      let carWeight = carQueryData[0].model_weight_lbs;
      let openPercentOfCapacity = openCapacity / carWeight;
      let enclosedPercentOfCapacity = enclosedCapacity / carWeight;

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
      let openFlexible =
        fuelSurcharge + (revenueGoal / (openCapacity / carWeight)) * distance;
      let openStandard =
        fuelSurcharge +
        (revenueGoal / (openCapacity / carWeight)) * distance * 1.5;
      let openExpedited =
        fuelSurcharge +
        (revenueGoal / (openCapacity / carWeight)) * distance * 3;

      let enclosedFlexible =
        fuelSurcharge +
        (revenueGoal / (enclosedCapacity / carWeight)) * distance;
      let enclosedStandard =
        fuelSurcharge +
        (revenueGoal / (enclosedCapacity / carWeight)) * distance * 1.5;
      let enclosedExpedited =
        fuelSurcharge +
        (revenueGoal / (enclosedCapacity / carWeight)) * distance * 3;

      const vehicleJson = "../data/vehicle-data.json";

      res.render("quote", {
        locationData: distanceResponse.data,
        quoteMiles: formMiles,
        quoteOrigin: formOrigin,
        quoteDestination: formDestination,
        openFlexible: openFlexible,
        openStandard: openStandard,
        openExpedited: openExpedited,
        enclosedFlexible: enclosedFlexible,
        enclosedStandard: enclosedStandard,
        enclosedExpedited: enclosedExpedited,
        vehicleData: vehicleJson,
      });
    } catch (error) {
      console.log(error.response.body);
    }
  })();
});

function trimWeirdCharactersFromJson(jsonString) {
  if (jsonString.startsWith("?(")) jsonString = remove(jsonString, 0, 2);
  if (jsonString.endsWith(");"))
    jsonString = remove(jsonString, jsonString.length - 2, 2);
  return jsonString;
}

function remove(str, startIndex, count) {
  return str.substr(0, startIndex) + str.substr(startIndex + count);
}

app.listen(process.env.PORT || 3000, function () {
  console.log("The server is running!");
});

// When deploying application change server to this code
// const port = process.env.PORT || 1337;
// server.listen(port);

console.log("Server running");
