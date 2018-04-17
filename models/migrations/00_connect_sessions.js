(() => {
  "use strict";

  module.exports = {

    up: async (query, Sequelize) => {
      await query.createTable("ConnectSessions", {
        sid: { type: Sequelize.STRING(191), primaryKey: true },
        userId: Sequelize.STRING(191),
        expires: Sequelize.DATE,
        data: Sequelize.TEXT,
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });

    }

  };

})();
