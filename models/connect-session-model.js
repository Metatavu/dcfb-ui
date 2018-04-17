  /* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  const Sequelize = require("sequelize");
  const AbstractModel = require(`${__dirname}/abstract-model`);
  
  /**
   * Base class for database models
   */
  class ConnectSessionModel extends AbstractModel {
    
    constructor (sequelize) {
      super(sequelize, "ConnectSession", {
        sid: {
          type: Sequelize.STRING(191),
          primaryKey: true
        },
        userId: Sequelize.STRING(191),
        expires: Sequelize.DATE,
        data: Sequelize.TEXT
      });
    }
  }
  
  module.exports = ConnectSessionModel;

})();