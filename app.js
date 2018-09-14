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
  const localeHelpers = require(`${__dirname}/util/locale-helpers`);

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
    if (lang && localeHelpers.SUPPORTED_LOCALES.indexOf(lang) > -1) {
      res.cookie(LOCALE_COOKIE, lang, { maxAge: 900000, httpOnly: true });
    }

    next();
  });

  i18n.configure({
    locales: localeHelpers.SUPPORTED_LOCALES,
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
    const authenticated = req.kauth.grant ? true : false;
    res.locals.authenticated = authenticated;

    if (authenticated) {
      res.locals.username = req.kauth.grant.access_token.content.name || req.kauth.grant.access_token.content.preferred_username;
      res.locals.accountUrl = keycloak.accountUrl();
      res.locals.userId = req.kauth.grant.access_token.content.sub;
    }

    next();
  });

  app.locals.googleApiKey = config.get("google:apikey");


  app.use((req, res, next) => {
    res.locals._L = (localizedValues, type) => {
      return localeHelpers._L(localizedValues, type, req); 
    }; 
    res.locals._LS = (localizedValues) => {
      return localeHelpers._LS(localizedValues, req);
    };
    res.locals._LP = (localizedValues) => {
      return localeHelpers._LP(localizedValues, req);
    };

    res.locals.getValueByLangAndType = (localizedValues, lang, type) => {
      const localizedValueByLangAndType = localizedValues.find((localizedValue) => {
        return localizedValue.type === type && localizedValue.language === lang
      });

      return localizedValueByLangAndType ? localizedValueByLangAndType.value : "";
    };

    next();
  });

  new Routes(app, keycloak);
  
  httpServer.listen(config.get('port'), () => {
    logger.info("Http server started");
  });
  
})();
