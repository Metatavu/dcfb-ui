(() => {
  'use strict';

  const config = require("nconf");
  const Sequelize = require('sequelize');
  const Umzug = require("umzug");
  const fs = require("fs");
  
  /**
   * Database connection
   */
  class Database {

    /**
     * Constructor
     */
    constructor() {
      const database = config.get("mysql:database");
      const username = config.get("mysql:username");
      const password = config.get("mysql:password"); 
      const host = config.get("mysql:host");

      this.sequelize = new Sequelize(database, username, password, {
        logging: false,
        host: host,
        dialect: "mysql",
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        }
      });
    }

    /**
     * Initializes database, runs migrations and defines required models
     */
    async initialize() {
      await this.authenticate();
      await this.migrate();
      this.defineModels();
    }

    /**
     * Authenticates to the database
     */
    authenticate() {
      return this.sequelize.authenticate();
    }

    /**
     * Runs all pending database migrations 
     * 
     * @return {Promise} Promise for migrations 
     */
    async migrate() {   
      const locked = await this.obtainMigrationLock();
      if (locked) {
        const umzug = new Umzug({
          storage: "sequelize",
          storageOptions: {
            sequelize: this.sequelize
          },
          migrations: {
            params: [ this.sequelize.getQueryInterface(), Sequelize ],
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
      };
    }

    /**
     * Obtains migration lock. Lock can be created by this worker or the lock can already be present. 
     * 
     * @return {Promise} Promise that resolves with whether lock was created by this worker
     */
    obtainMigrationLock() {
      const lockFile = this.getMigrationLockFilePath();

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
      const lockFile = this.getMigrationLockFilePath();

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
      const lockFile = this.getMigrationLockFilePath();

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

    /**
     * Gets path for migrations lock file
     */
    getMigrationLockFilePath() {
      return config.get("migrations:lock-file") || "/tmp/dcfb-ui.lock";
    }

    /**
     * Returns initialized sequelize instance
     */
    getSequelizeInstance() {
      return this.sequelize;
    }

    /**
     * Defines new database model.
     * 
     * @param {String} name model name
     * @param {Object} attributes model attributes
     * @param {Object} options model options
     */
    defineModel(name, attributes, options) {
      this[name] = this.sequelize.define(name, attributes, Object.assign(options || {}, {
        charset: "utf8mb4",
        dialectOptions: {
          collate: "utf8mb4_unicode_ci"
        }
      }));
    }

    /**
     * Defines all database models
     */
    defineModels() {
      this.defineModel("ConnectSession", {
        sid: {
          type: Sequelize.STRING(191),
          primaryKey: true
        },
        userId: Sequelize.STRING(191),
        expires: Sequelize.DATE,
        data: Sequelize.TEXT
      });

     /* this.defineModel("SocketData", {
        socketId: {
          type: Sequelize.STRING(191),
          primaryKey: true
        },
        data: Sequelize.STRING(191)
      });*/
    }

    /**
     * Upserts single socket data entity
     * 
     * @param {string} socketId 
     * @param {string} data 
     */
    upsertSocketData(socketId, data) {
      return this.SocketData.upsert({
        socketId: socketId,
        data: data
      });
    }

    /**
     * Finds single socket data entity
     * 
     * @param {string} socketId socket id 
     */
    findSocketData(socketId) {
      return this.SocketData.findOne({ where: { socketId : socketId } });
    }

    /**
     * Lists all available socket data entities
     */
    listSocketDatas() {
      return this.SocketData.findAll();
    }

    /**
     * Deletes socket data entity
     * 
     * @param {string} socketId 
     */
    deleteSocketData(socketId) {
      return this.SocketData.destroy({ where: { socketId : socketId } });
    }

  }

  module.exports = Database;

})();