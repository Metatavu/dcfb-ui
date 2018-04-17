  /* jshint esversion: 6 */
/* global __dirname, Promise */
(() => {
  "use strict";
  
  /**
   * Base class for database models
   */
  class AbstractModel {
    
    constructor (sequelize, name, attrs) {
      this.sequelize = sequelize;
      this.model = this.sequelize.define(name, attrs);
    }
    
    findById(id) {
      this.model.findOne({ where: { id : id } });
    }
  }
  
  module.exports = AbstractModel;

})();