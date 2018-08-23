/* jshint esversion: 6 */
/* global __dirname, __filename */
(async() => {
  "use strict";
  
  const config = require("nconf");
  config
    .argv()
    .file({file: `${__dirname}/config.json`})
    .defaults(require(`${__dirname}/default-config.json`));
  
  const http = require("http");
  const path = require("path");
  const express = require("express");
  const bodyParser = require("body-parser");
  const cookieParser = require('cookie-parser')
  const log4js = require("log4js");
  const Keycloak = require("keycloak-connect");  
  const session = require("express-session");
  const i18n = require("i18n");
  const cors = require("cors");
  const RedisStore = require("connect-redis")(session);
  const Routes = require(`${__dirname}/routes`);
  
  const LOCALE_COOKIE = "dcfb-locale";
  const SUPPORTED_LOCALES = ["en", "fi"];
  
  if (config.get("logging")) {
    log4js.configure(config.get("logging"));
  }
  
  const logger = log4js.getLogger(__filename);
  
  process.on("unhandledRejection", (error) => {
    console.error("UNHANDLED REJECTION", error ? error.stack : null);
  });
  
  const app = express();
  const httpServer = http.createServer(app);
  const sessionStore = new RedisStore(config.get("redis"));
  const keycloak = new Keycloak({ store: sessionStore }, config.get("keycloak"));

  app.use((req, res, next) => {
    const lang = req.query["lang"];
    if (lang && SUPPORTED_LOCALES.indexOf(lang) > -1) {
      res.cookie(LOCALE_COOKIE, lang, { maxAge: 900000, httpOnly: true });
    }

    next();
  });

  i18n.configure({
    locales: SUPPORTED_LOCALES,
    directory: `${__dirname}/locales`,
    defaultLocale: "en",
    autoReload: false,
    updateFiles: false,
    queryParameter: "lang",
    cookie: LOCALE_COOKIE
  });

  app.use(session({
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    secret: config.get("session-secret")
  }));

  app.use(keycloak.middleware({
    logout: "/kclogout"
  }));

  app.set('trust proxy', true);
  app.use(cors());
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(express.static(path.join(__dirname, "public")));
  app.use(i18n.init);
  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "pug");
  
  app.use((req, res, next) => {
    res.locals.authenticated = req.kauth.grant ? true : false;
    next();
  });

  app.locals.googleApiKey = config.get("google:apikey");

  app.use((req, res, next) => {
    res.locals._L = (localizedValues, type) => {
      if (!localizedValues) {
        return "Locale entry not found"
      }

      const desiredLocale = req.getLocale();
      const typeMatches = localizedValues.filter((localizedValue) => {
        return localizedValue.type === type; 
      });

      const desiredMatches = typeMatches.filter((typeMatch) => {
        return typeMatch.language === desiredLocale;
      });

      if (desiredMatches.length === 1) {
        return desiredMatches[0].value;
      }

      typeMatches.sort((typeMatch) => {
        const localeIndex = SUPPORTED_LOCALES.indexOf(typeMatch.language);
        return localeIndex === -1 ? Number.MAX_SAFE_INTEGER : localeIndex;
      });

      return typeMatches.length ? typeMatches[0].value : "";
    };

    res.locals._LS = (localizedValues) => {
      return res.locals._L(localizedValues, "SINGLE");
    };
    
    res.locals._LP = (localizedValues) => {
      return res.locals._L(localizedValues, "PLURAL");
    };

    next();
  });

  new Routes(app, keycloak);
  
  httpServer.listen(config.get('port'), () => {
    logger.info("Http server started");
  });
  
})();
