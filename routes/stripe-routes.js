/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const log4js = require("log4js");
  const logger = log4js.getLogger(`${__dirname}/${__filename}`);
  const config = require("nconf");
  const fetch = require("node-fetch");
  const { URLSearchParams } = require("url");
  const keycloakAdmin = require(`${__dirname}/../keycloak-admin`);
  
  /*
   * Stripe routes
   */
  class StripeRoutes extends AbstractRoutes {
    
    /**
     * Constructor for stripe routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/stripe/onboard", [ keycloak.protect() ], this.catchAsync(this.stripeOnBoardGet.bind(this)));
      app.get("/stripe/onboardreturn", [ keycloak.protect() ], this.catchAsync(this.stripeOnBoardReturnGet.bind(this)));
    }

    /**
     * Handles Stripe onboard request
     * 
     * @param {Express.Request} req client request object
     * @param {Express.Response} res server response object
     **/
    stripeOnBoardGet(req, res) {
      const clientId = config.get("stripe:client-id");

      res.render("pages/stripe-onboard", {
        "stripeLink": `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write`
      });
    }

    /**
     * Handles Stripe onboard return request
     * 
     * @param {Express.Request} req client request object
     * @param {Express.Response} res server response object
     **/
    async stripeOnBoardReturnGet(req, res) {
      if (req.query.error) {
        res.status(500).send(req.query.error_description);  
      } else {
        const code = req.query.code;
        if (!code) {
          res.status(500).send("Missing code");  
          return;
        }

        const params = new URLSearchParams();
        params.append("client_secret", config.get("stripe:secret-key"));
        params.append("code", code);
        params.append("grant_type", "authorization_code");

        try {
          const stripeResponse = await fetch("https://connect.stripe.com/oauth/token", { method: "POST", body: params });
          if (stripeResponse.status !== 200) {
            res.status(500).send("Failed to fetch token");  
            return;
          }
          const data = await stripeResponse.json();

          const livemode = data["livemode"];

          if (config.get("stripe:livemode") !== livemode)  {
            res.status(500).send("Stripe livemode mismatch");  
            return;
          }

          const stripeUserId = data["stripe_user_id"];
          const refreshToken = data["refresh_token"];
          const loggedUserId = this.getLoggedUserId(req);
          const user = await keycloakAdmin.findUser(loggedUserId);
          
          if (!user) {
            res.status(500).send("Failed to find user");  
            return;
          }
          
          keycloakAdmin.setSingleAttribute(user, "stripe-account-id", stripeUserId);
          keycloakAdmin.setSingleAttribute(user, "stripe-refresh-token", refreshToken);
          await keycloakAdmin.updateUser(user);

          req.session.stripe = {
            accountId: stripeUserId
          };

          res.redirect("/add/item");
        } catch(err) {
          logger.error("Error requesting RPT token", err);
          return null;
        }

      }
    }
  }

  module.exports = StripeRoutes;

})();

