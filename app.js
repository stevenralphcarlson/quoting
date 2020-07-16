const request = require("request");
const express = require("express");
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

app.post("/quote", function (req, res) {
  let origins = req.body.origins;
  let destinations = req.body.destinations;
  let url =
    "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" +
    origins +
    "&destinations=" +
    destinations +
    "&units=imperial&key=AIzaSyCEPwvSlyYoisJMueJMRN5PmfJt9TzgPpU";
  let insurance = 1.8;
  let tenDays = 1.3;
  let sevenDays = 1.8;
  let baseRate = 270;
  let open = 0.28;
  let enclosed = 0.42;

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      let data = JSON.parse(body);
      let distance = Math.round(data.rows[0].elements[0].distance.value / 1609);
      let formMiles = data.rows[0].elements[0].distance.text;
      let formOrigin = data.origin_addresses;
      let formDestination = data.destination_addresses;

      // open carrier price range
      let open7DayPrice = Math.round(
        distance * open + baseRate * insurance * tenDays
      );

      let open10DayPrice = Math.round(
        distance * open + baseRate * insurance * sevenDays
      );

      // enclosed carried price range
      let enclosed7DayPrice = Math.round(
        distance * enclosed + baseRate * insurance * tenDays
      );

      let enclosed10DayPrice = Math.round(
        distance * enclosed + baseRate * insurance * sevenDays
      );

      let fuelPriceUrl =
        "http://api.eia.gov/series/?api_key=c8ec494bec9e997e6f051af94f510640&series_id=PET.EMD_EPD2DXL0_PTE_NUS_DPG.W";

      request(fuelPriceUrl, function (fError, fResponse, fBody) {
        if (!fError && fResponse.statusCode == 200) {
          let fData = JSON.parse(fBody);

          let fuelSurcharge = 0;

          const currentFuelPrice = fData.series[0].data[0][1];
          const baseFuelPrice = 2.5;

          if (currentFuelPrice > baseFuelPrice) {
            const delta = currentFuelPrice - baseFuelPrice;
            const avgMpg = 6;
            const fuelSurchargePerMile = delta / avgMpg;
            fuelSurcharge = fuelSurchargePerMile * distance;
          }

          open7DayPrice = Math.round(open7DayPrice + fuelSurcharge);
          open10DayPrice = Math.round(open10DayPrice + fuelSurcharge);
          enclosed7DayPrice = Math.round(enclosed7DayPrice + fuelSurcharge);
          enclosed10DayPrice = Math.round(enclosed10DayPrice + fuelSurcharge);

          const vehicleJson = "../data/vehicle-data.json";

          res.render("quote", {
            locationData: data,
            quoteMiles: formMiles,
            quoteOrigin: formOrigin,
            quoteDestination: formDestination,
            open7DayPrice: open7DayPrice,
            open10DayPrice: open10DayPrice,
            enclosed7DayPrice: enclosed7DayPrice,
            enclosed10DayPrice: enclosed10DayPrice,
            vehicleData: vehicleJson,
          });
        }
      });
    }
  });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("The server is running!");
});

// When deploying application change server to this code
// const port = process.env.PORT || 1337;
// server.listen(port);

console.log("Server running");
