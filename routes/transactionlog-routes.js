
const AbstractRoutes = require(`${__dirname}/abstract-routes`);
const ApiClient = require(`${__dirname}/../api-client`);

class TransactionLogRoutes extends AbstractRoutes {

  constructor(app, keycloak, transactionLogger) {
    super(app, keycloak);

    this.transactionLogger = transactionLogger;
    app.get("/ajax/transactions", [ keycloak.protect() ], this.catchAsync(this.ajaxTransactionLogsGet.bind(this)));
    app.get("/transactions", [ keycloak.protect() ], this.catchAsync(this.transactionLogViewGet.bind(this)));

  }

  async transactionLogViewGet(req, res) {
    const apiClient = new ApiClient(await this.getToken(req));
    const categoriesApi = apiClient.getCategoriesApi();

    const isAdmin = this.hasRealmRole(req, "admin");

    const rangeLocales = {
      "Today": res.locals.__("transaction-history.range-today"),
      "Yesterday":  res.locals.__("transaction-history.range-yesterday"),
      "Last 7 Days":  res.locals.__("transaction-history.range-last7"), 
      "Last 30 Days":  res.locals.__("transaction-history.range-last30"),
      "This Month":  res.locals.__("transaction-history.range-month"),
      "Last Month":  res.locals.__("transaction-history.range-lastmonth"),
    };

    res.render("pages/transaction-history", {isAdmin: isAdmin, rangeLocales: rangeLocales, topMenuCategories: await this.getTopMenuCategories(categoriesApi, null)});
  }

  async ajaxTransactionLogsGet(req, res) {
    const role = req.query.role;
    const userId = this.getLoggedUserId(req);
    const isAdmin = this.hasRealmRole(req, "admin");
    const start = parseInt(req.query.start);
    const end = parseInt(req.query.end);
    if (["BUYER", "SELLER"].indexOf(role) < 0  && !isAdmin) {
      return res.status(403).send("Only admins can list others transactions");
    }

    res.send(await this.transactionLogger.getLogs(role, userId, new Date(start), new Date(end)));
  }
}

module.exports = TransactionLogRoutes;