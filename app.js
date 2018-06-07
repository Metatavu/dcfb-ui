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
  const SequelizeStore = require("connect-session-sequelize")(session.Store);
  const models = require(`${__dirname}/models`);
  const Routes = require(`${__dirname}/routes`);
  
  const LOCALE_COOKIE = "dcfb-locale";
  const SUPPORTED_LOCALES = ["en", "fi"];
  
  if (config.get("logging")) {
    log4js.configure(config.get("logging"));
  }
  
  const logger = log4js.getLogger(`${__dirname}/${__filename}`);
  
  process.on("unhandledRejection", (error) => {
    console.error("UNHANDLED REJECTION", error ? error.stack : null);
  });
  
  const app = express();
  const httpServer = http.createServer(app);
  const sequelize = await models.init();
  
  const sessionStore = new SequelizeStore({
    db: sequelize,
    table: "ConnectSession"
  });
  
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
    logout: "/logout"
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
  
  new Routes(app, keycloak);
  
  httpServer.listen(config.get('port'), () => {
    logger.info("Http server started");
  });
  
})();
