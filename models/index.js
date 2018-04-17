/* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  const fs = require("fs");
  const Umzug = require("umzug");
  const Sequelize = require("sequelize");
  const config = require("nconf");
  const ConnectSessionModel = require(`${__dirname}/connect-session-model`);
  
  class Models {

    /**
     * Constructor
     */
    constructor () {
      this.sequelize = new Sequelize(config.get("database:name"), config.get("database:username"), config.get("database:password"), {
        logging: false,
        host: config.get("database:host"),
        dialect: config.get("database:dialect"),
        pool: Object.assign({
          max: 5,
          min: 0,
          idle: 10000
        }, config.get("database:pool") || {})
      });
    }
    
    /**
     * Registers models
     */
    register() {
       this.connectSession = new ConnectSessionModel(this.sequelize);
    }
    
    /**
     * Initializes all database models and runs migrations if needed
     * 
     * @returns {Promise} promise containing initialized sequelize
     */
    async init() {
      await this.sequelize.authenticate();
      await this.migrationsUp();
      this.register();
      return this.sequelize;
    }

    /**
     * Runs all pending database migrations 
     * 
     * @return {Promise} Promise for migrations 
     */
    migrationsUp () {   
      return this.obtainMigrationLock()
        .then((locked) => {
          if (locked) {
            const umzug = new Umzug({
              storage: "sequelize",
              storageOptions: {
                sequelize: this.sequelize
              },
              migrations: {
                params: [
                  this.sequelize.getQueryInterface(),
                  Sequelize
                ],
                path: `${__dirname}/migrations/`
              }
            });
      
            return umzug.up().then((migrations) => {
              return this.releaseMigrationLock().then(() => {
                return migrations;
              });
            });
          } else {
            return this.waitMigrationLock()
              .then(() => {
                return [];
              });
          }
        });
    }

    /**
     * Obtains migration lock. Lock can be created by this worker or the lock can already be present. 
     * 
     * @return {Promise} Promise that resolves with whether lock was created by this worker
     */
    obtainMigrationLock() {
      const lockFile = config.get("migrations:lock-file");

      return new Promise((resolve, reject) => {
        fs.open(lockFile, "wx", (err) => {
          if (err) {
            if (err.code === "EEXIST") {
              resolve(false);
            } else {
              reject(err);
            }
          } else {
            resolve(true);
          }
        });
      });
    }

    /**
     * Releases migration lock
     * 
     * @return {Promise} Promise for removed lock file 
     */
    releaseMigrationLock() {
      const lockFile = config.get("migrations:lock-file");

      return new Promise((resolve, reject) => {
        fs.unlink(lockFile, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    }

    /**
     * Waits migration lock
     * 
     * @return {Promise} Promise for released lock 
     */
    waitMigrationLock() {
      const lockFile = config.get("migrations:lock-file");

      return new Promise((resolve, reject) => {
        fs.exists(lockFile, (exists) => {
          if (exists) {
            setTimeout(() => {
              this.waitMigrationLock()
                .then(() => {
                  resolve();
                })
                .catch(() => {
                  reject();
                });
            }, 300);
          } else {
            resolve();
          }
        });
      }); 
    }
    
  }

  const models = new Models();
  module.exports = models;

})();