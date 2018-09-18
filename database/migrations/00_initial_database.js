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

        await query.createTable("TransactionLogs", {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
          item: Sequelize.TEXT,
          description: Sequelize.TEXT,
          amount: Sequelize.INTEGER,
          buyer: Sequelize.TEXT,
          seller: Sequelize.TEXT,
          sellerId: Sequelize.STRING(191),
          buyerId: Sequelize.STRING(191),
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
      }
    };
  
  })();