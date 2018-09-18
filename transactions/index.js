
/**
 * Helper class to store transaction logs
 */
class TransactionLogger { 
  constructor (database) {
    this.database = database;
  }

  /**
   * Creates transaction log entry and stores it in database.
   *  
   * @param {object} item Item that was sold 
   * @param {object} buyer object representing buyer
   * @param {object} seller object representing the seller
   * @param {string} description free text description
   * @param {number} amount amount of the transaction
   */
  async log(item, description, amount, buyer, seller, sellerId, buyerId) {
    try {
      await this.database.createTransactionLog(item, description, amount, buyer, seller, sellerId, buyerId);
    } catch (error) {
      console.error("Error logging transaction", error);
    }
  }

  /**
   * Gets logged transactions from database
   * 
   * @param {string} role for which role to query the transactions 
   * @param {string} userId for which user fetch the events for
   * @param {date} start start date
   * @param {date} end end date
   */
  async getLogs(role, userId, start, end) {
    switch (role) {
      case "ALL":
        return await this.database.findTransactionLogsByCreatedAtBetween(start, end);
      case "SELLER":
        return await this.database.findTransactionLogsBySellerIdAndCreatedAtBetween(userId, start, end);
      case "BUYER":
        return await this.database.findTransactionLogsByBuyerIdAndCreatedAtBetween(userId, start, end);
      default:
        console.error(`Unkown role ${role}`)
        return null;
    }
  }
}

module.exports = TransactionLogger;